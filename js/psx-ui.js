/**
 * psx-ui.js  —  PSX post-processing for the HTML UI layer
 *
 * Pipeline:
 *   html2canvas(document.body) → WebGL texture → PSX fragment shader → canvas overlay
 *
 * Hiding strategy:
 *   A <style id="psx-hide-style"> is injected into <head> that sets
 *   opacity:0 on every UI element directly — including .popup-win which
 *   uses position:fixed and escapes parent opacity stacking contexts.
 *   Inside the html2canvas onclone callback that style element is removed
 *   from the clone, so all UI renders at full opacity for capture while
 *   remaining invisible in the live DOM.
 *
 * The PSX canvas sits at z-index:19999 (above everything including
 * #crt-flicker at 9999) and draws the shader-processed result.
 *
 * PSX shader applies:
 *   1. CRT barrel-distortion warp
 *   2. Bayer 4x4 ordered dither
 *   3. 5-bit colour-depth quantisation (PS1 15-bit colour)
 *   4. Horizontal scanlines
 *   5. Radial vignette
 */

var PSXUI = (function () {

  /* ── Tunable config ─────────────────────────────────────── */
  var CFG = {
    captureInterval: 90,    // ms between captures (~11 fps — intentionally low, PSX feel)
    colorDepth:      31.0,  // 5-bit per channel (31 steps, PS1 15-bit colour space)
    ditherStr:       0.09,  // Bayer dither amplitude
    scanlineStr:     0.14,  // darkness of alternating scanline rows
    vignetteStr:     0.42,  // corner-darkening exponent
    crtWarp:         0.016, // barrel-distortion amount
  };

  /* ID of the injected hide-style element */
  var HIDE_STYLE_ID = 'psx-hide-style';

  /*
   * CSS rule injected into <head>.
   * Hides ALL UI layers explicitly, including position:fixed .popup-win
   * elements which escape ancestor opacity stacking contexts.
   * Removed from the html2canvas clone so everything renders for capture.
   */
  var HIDE_CSS = [
    '#screen-overlay,',
    '#windows-layer,',
    '.popup-win,',
    '#toast,',
    '#crt-flicker',
    '{ opacity: 0 !important; }',
  ].join('\n');

  /* Elements to skip in html2canvas (3D/ambient layers + our own canvas) */
  var IGNORE_IDS = {
    'three-canvas':  true,
    'void-vignette': true,
    'particles':     true,
    'void-layer':    true,
    'psx-ui-canvas': true,
  };

  /* ── Internal state ─────────────────────────────────────── */
  var psxCanvas, gl, program, tex, quadBuf;
  var uniforms   = {};
  var pendingFrame = null;
  var capturing    = false;
  var W = 0, H = 0;

  /* ──────────────────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────────────────── */
  function init() {
    injectHideStyle();
    buildCanvas();
    if (!gl) {
      console.warn('PSXUI: WebGL unavailable — removing hide style, raw UI visible.');
      removeHideStyle();
      return;
    }
    buildShader();
    buildQuad();
    buildTexture();
    window.addEventListener('resize', onResize);
    scheduleCapture();
    requestAnimationFrame(renderLoop);
  }

  /* ──────────────────────────────────────────────────────────
     HIDE STYLE INJECTION
     Inject once; persists in the live DOM forever.
     html2canvas removes it from the clone in onclone.
  ────────────────────────────────────────────────────────── */
  function injectHideStyle() {
    if (document.getElementById(HIDE_STYLE_ID)) return;
    var s = document.createElement('style');
    s.id          = HIDE_STYLE_ID;
    s.textContent = HIDE_CSS;
    document.head.appendChild(s);
  }

  function removeHideStyle() {
    var s = document.getElementById(HIDE_STYLE_ID);
    if (s) s.parentNode.removeChild(s);
  }

  /* ──────────────────────────────────────────────────────────
     CANVAS + WEBGL CONTEXT
  ────────────────────────────────────────────────────────── */
  function buildCanvas() {
    psxCanvas = document.createElement('canvas');
    psxCanvas.id = 'psx-ui-canvas';
    psxCanvas.style.cssText = [
      'position:fixed',
      'inset:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      /* Must be above every UI element including #crt-flicker (9999) */
      'z-index:19999',
    ].join(';');
    document.body.appendChild(psxCanvas);

    gl = psxCanvas.getContext('webgl', {
      alpha:                 true,
      premultipliedAlpha:    false,
      preserveDrawingBuffer: false,
    });

    onResize();
  }

  function onResize() {
    W = psxCanvas.width  = window.innerWidth;
    H = psxCanvas.height = window.innerHeight;
    if (gl) gl.viewport(0, 0, W, H);
  }

  /* ──────────────────────────────────────────────────────────
     SHADERS
     GLSL ES 1.0 (WebGL 1) — Bayer uses nested ternaries.
  ────────────────────────────────────────────────────────── */
  var VERT_SRC = [
    'attribute vec2 aPos;',
    'varying   vec2 vUv;',
    'void main() {',
    '  vUv         = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}',
  ].join('\n');

  /*
   * 4x4 Bayer matrix (row-major):
   *   0  8  2 10
   *  12  4 14  6
   *   3 11  1  9
   *  15  7 13  5
   */
  var FRAG_SRC = [
    'precision mediump float;',
    'uniform sampler2D tDiffuse;',
    'uniform vec2      uResolution;',
    'uniform float     uColorDepth;',
    'uniform float     uDitherStr;',
    'uniform float     uScanlineStr;',
    'uniform float     uVignetteStr;',
    'uniform float     uCrtWarp;',
    'varying vec2 vUv;',

    /* CRT barrel warp */
    'vec2 warpUV(vec2 uv) {',
    '  vec2 d  = uv - 0.5;',
    '  d      *= 1.0 + uCrtWarp * dot(d, d) * 4.0;',
    '  return d + 0.5;',
    '}',

    /* Bayer 4x4 threshold → [-0.5, +0.5] */
    'float bayerThreshold(vec2 fc) {',
    '  float x = mod(floor(fc.x), 4.0);',
    '  float y = mod(floor(fc.y), 4.0);',
    '  float m;',
    '  if      (y < 1.0) { m = (x<1.0)?  0.0:(x<2.0)?  8.0:(x<3.0)?  2.0:10.0; }',
    '  else if (y < 2.0) { m = (x<1.0)? 12.0:(x<2.0)?  4.0:(x<3.0)? 14.0: 6.0; }',
    '  else if (y < 3.0) { m = (x<1.0)?  3.0:(x<2.0)? 11.0:(x<3.0)?  1.0: 9.0; }',
    '  else               { m = (x<1.0)? 15.0:(x<2.0)?  7.0:(x<3.0)? 13.0: 5.0; }',
    '  return m / 16.0 - 0.5;',
    '}',

    'void main() {',

    /* 1. CRT warp */
    '  vec2 uv = warpUV(vUv);',
    '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {',
    '    gl_FragColor = vec4(0.0);',
    '    return;',
    '  }',

    '  vec4 col = texture2D(tDiffuse, uv);',

    /* Fully transparent → pass through (3D scene shows through gap) */
    '  if (col.a < 0.01) {',
    '    gl_FragColor = vec4(0.0);',
    '    return;',
    '  }',

    /* 2. Bayer ordered dither — pre-quantise noise breaks colour banding */
    '  col.rgb += bayerThreshold(gl_FragCoord.xy) * uDitherStr;',

    /* 3. 5-bit colour depth (PS1 15-bit colour, 31 steps per channel) */
    '  col.rgb = clamp(floor(col.rgb * uColorDepth + 0.5) / uColorDepth, 0.0, 1.0);',

    /* 4. Scanlines — every alternate output row darkened */
    '  float scan = mod(gl_FragCoord.y, 2.0);',
    '  col.rgb   *= 1.0 - uScanlineStr * step(1.0, scan);',

    /* 5. Radial vignette — corners darken toward black */
    '  vec2  v   = vUv * (1.0 - vUv);',
    '  float vig = pow(v.x * v.y * 15.0, uVignetteStr);',
    '  col.rgb  *= clamp(vig, 0.0, 1.0);',

    '  gl_FragColor = col;',
    '}',
  ].join('\n');

  function compileShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('PSXUI shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function buildShader() {
    var vert = compileShader(gl.VERTEX_SHADER,   VERT_SRC);
    var frag = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) return;

    program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('PSXUI link error:', gl.getProgramInfoLog(program));
      program = null;
      return;
    }

    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, 'tDiffuse'), 0);

    ['uResolution','uColorDepth','uDitherStr',
     'uScanlineStr','uVignetteStr','uCrtWarp'].forEach(function (name) {
      uniforms[name] = gl.getUniformLocation(program, name);
    });
  }

  /* ──────────────────────────────────────────────────────────
     FULLSCREEN QUAD
  ────────────────────────────────────────────────────────── */
  function buildQuad() {
    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
      gl.STATIC_DRAW);
  }

  /* ──────────────────────────────────────────────────────────
     TEXTURE
  ────────────────────────────────────────────────────────── */
  function buildTexture() {
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    /* NearestFilter = chunky pixelated upscale — core PSX look */
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));
  }

  function uploadCapture(capturedCanvas) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    /* Canvas Y is top-down; WebGL is bottom-up */
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, capturedCanvas);
    } catch (e) {
      /* Tainted canvas (CORS) — skip frame */
    }
  }

  /* ──────────────────────────────────────────────────────────
     HTML2CANVAS CAPTURE
  ────────────────────────────────────────────────────────── */
  function scheduleCapture() {
    setTimeout(doCapture, CFG.captureInterval);
  }

  function doCapture() {
    if (capturing) { scheduleCapture(); return; }
    capturing = true;

    html2canvas(document.body, {
      backgroundColor: null,
      allowTaint:      true,
      useCORS:         true,
      scale:           1,
      logging:         false,

      ignoreElements: function (el) {
        return !!(IGNORE_IDS[el.id]);
      },

      onclone: function (clonedDoc) {
        /*
         * Remove the hide-style from the clone entirely.
         * This restores ALL UI elements to their natural opacity — the
         * original CSS has no opacity rules on these elements, so removing
         * the injected rule makes everything visible for the capture.
         */
        var s = clonedDoc.getElementById(HIDE_STYLE_ID);
        if (s) s.parentNode.removeChild(s);

        /* Also clear any inline opacity/visibility that might linger */
        var allEls = clonedDoc.querySelectorAll(
          '#screen-overlay, #windows-layer, .popup-win, #toast, #crt-flicker'
        );
        for (var i = 0; i < allEls.length; i++) {
          allEls[i].style.opacity    = '';
          allEls[i].style.visibility = '';
          allEls[i].style.display    = allEls[i].style.display || '';
        }

        /* Strip body/html background so gaps between UI are transparent */
        clonedDoc.documentElement.style.background = 'transparent';
        clonedDoc.body.style.background            = 'transparent';
      },

    }).then(function (capturedCanvas) {
      pendingFrame = capturedCanvas;
      capturing    = false;
      scheduleCapture();
    }).catch(function (err) {
      console.warn('PSXUI: capture failed —', err);
      capturing = false;
      scheduleCapture();
    });
  }

  /* ──────────────────────────────────────────────────────────
     RENDER LOOP
  ────────────────────────────────────────────────────────── */
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (!program) return;

    if (pendingFrame) {
      uploadCapture(pendingFrame);
      pendingFrame = null;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.uniform2f(uniforms.uResolution,  W, H);
    gl.uniform1f(uniforms.uColorDepth,  CFG.colorDepth);
    gl.uniform1f(uniforms.uDitherStr,   CFG.ditherStr);
    gl.uniform1f(uniforms.uScanlineStr, CFG.scanlineStr);
    gl.uniform1f(uniforms.uVignetteStr, CFG.vignetteStr);
    gl.uniform1f(uniforms.uCrtWarp,     CFG.crtWarp);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    var aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ──────────────────────────────────────────────────────────
     PUBLIC API
     PSXUI.set('ditherStr', 0.20)
  ────────────────────────────────────────────────────────── */
  function set(key, value) {
    if (key in CFG) CFG[key] = value;
  }

  return { init: init, set: set };

}());