/**
 * scene.js — Three.js 3D scene
 *
 * Void outside monitor: warm sepia / dusty beige palette
 * Monitor: static (no float), brighter contrast against bg
 * Project icons: auto-grid either side, isometric spin, custom mesh/texture support
 */

var Scene = (function () {

  var camera, renderer, threeScene, monitorGroup;
  var screenMeshes = [];      // meshes on monitor screen plane to apply texture to
  var screenCanvas;           // canvas for rendering 2D content
  var screenTexture;          // CanvasTexture from canvas
  var projectMeshGroup;    // group holding all 3D project icons
  var projectMeshes = [];  // [{mesh, projKey, rotSpeed}]

  // PSX post-processing
  var psxRenderTarget;      // WebGLRenderTarget — scene renders here first
  var psxPostScene;         // fullscreen quad scene
  var psxPostCamera;        // orthographic camera for fullscreen quad
  var psxPostMaterial;      // ShaderMaterial with PSX post-fx
  var PSX_RESOLUTION = { w: 320, h: 240 };  // native PSX resolution to snap to
  var overheadLight;       // overhead directional light for debug control
  var powerLED;            // power LED mesh for debug control
  var ledConfig = {        // LED debug parameters
    posX: 1.2,
    posY: -1.3,
    posZ: 1.2,
    radius: 0.025,
    colorR: 0.22,
    colorG: 1.0,
    colorB: 0.35,
    blinkSpeed: 3.5,
    blinkIntensity: 1
  };

  // Screen face corners in local monitor space
  var SCREEN_W   = 1.65;
  var SCREEN_H   = 1.45;
  var SCREEN_Z   = 1;

  var localCorners = [
    new THREE.Vector3(-SCREEN_W / 2,  SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3( SCREEN_W / 2,  SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3(-SCREEN_W / 2, -SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3( SCREEN_W / 2, -SCREEN_H / 2, SCREEN_Z),
  ];

  var screenRect = { left: 0, top: 0, width: 0, height: 0 };

  // Monitor mesh configuration
  var MONITOR_SCALE = 1.4;    // Adjust if mesh needs scaling
  var MONITOR_ROT_X = 0;
  var MONITOR_ROT_Y = -Math.PI * 0.5;

  // Warm sepia palette for outside-monitor world
  var COL_BG          = 0x14100a;
  var COL_AMBIENT     = 0x2a1e10;
  var COL_STAR        = 0x9a8060;
  var COL_BEZEL       = 0x222222;

  // ── Camera view management ─────────────────────────────────
  var cameraViews = {
    default: { pos: new THREE.Vector3(0, 0.05, 5.8), target: new THREE.Vector3(0, 0, 0) },
    top:     { pos: new THREE.Vector3(0, 10, 0.01),  target: new THREE.Vector3(0, 0, 0) },
    side:    { pos: new THREE.Vector3(10, 2, 0),     target: new THREE.Vector3(0, 0, 0) },
    front:   { pos: new THREE.Vector3(0, 1, 8),      target: new THREE.Vector3(0, 0, 0) },
  };
  var activeCameraView = 'default';
  // Camera animation
  var camAnim = { active: false, fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(),
                  toPos: new THREE.Vector3(), toTarget: new THREE.Vector3(), progress: 0 };

  // ── Project icon fly-in/out animation ─────────────────────
  var ICON_ORIGIN = new THREE.Vector3(0, 0, -1.2); // behind / at monitor center
  var ICON_ANIM_SPEED = 0.045;                      // per-frame lerp step
  // Each entry: { mesh, targetPos, progress [0..1], direction [1=open,-1=close] }
  var iconAnims = [];

  // ── INIT ──────────────────────────────────────────────────
  function init() {
    var canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(COL_BG, 1);

    threeScene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.copy(cameraViews.default.pos);
    camera.lookAt(cameraViews.default.target);

    // Strong screen glow light — makes monitor bright against warm bg
    var screenGlow = new THREE.PointLight(0xf7d982, 3.5, 10);
    screenGlow.position.set(0, 0.1, 1.6);
    threeScene.add(screenGlow);

    // Overhead directional light
    overheadLight = new THREE.DirectionalLight(0xffffff, 2.0);
    overheadLight.position.set(3.30, 4.20, 5.27);
    threeScene.add(overheadLight);

    buildPostFX();         // PSX post-processing pipeline
    buildScreenCanvas();  // Create canvas for rendering UI to texture
    buildMonitor();
    buildStarfield();
    buildVoidParticles();
    buildProjectIcons();   // 3D floating icons in grid

    window.addEventListener('resize', onResize);

    // One synchronous render + overlay update before boot sequence begins
    renderer.render(threeScene, camera);
    updateOverlay();

    requestAnimationFrame(renderLoop);
    // initScreenCornerDebug();  // Uncomment to enable screen corner debug
    // initOverheadLightDebug();   // Uncomment to enable overhead light debug
    // initLEDDebug();             // Uncomment to enable LED positioning debug
  }

    // ── DEBUG: VISUAL SCREEN CORNER HELPER ─────────────────────
  function initScreenCornerDebug() {
    var debugContainer = document.createElement('div');
    debugContainer.id = 'screen-debug';
    debugContainer.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.9);color:#0f0;font-family:monospace;font-size:11px;padding:10px;z-index:9999;width:350px;max-height:500px;overflow-y:auto;';
    document.body.appendChild(debugContainer);

    var inputs = {
      SCREEN_W: SCREEN_W,
      SCREEN_H: SCREEN_H,
      SCREEN_Z: SCREEN_Z,
      ROT_X: MONITOR_ROT_X,
      ROT_Y: MONITOR_ROT_Y,
      SCALE: MONITOR_SCALE,
    };

    function updateDebug() {
      var html = '<strong>Screen Debug (2D px)</strong><br>';
      html += 'Screen Rect: ' + screenRect.width.toFixed(0) + 'x' + screenRect.height.toFixed(0) + '<br>';
      html += '<br><strong>3D Corners (world)</strong><br>';
      
      // Show world-space corners for reference
      localCorners.forEach(function (c, i) {
        var world = c.clone().applyMatrix4(monitorGroup.matrixWorld);
        html += 'C' + i + ': (' + world.x.toFixed(2) + ', ' + world.y.toFixed(2) + ', ' + world.z.toFixed(2) + ')<br>';
      });

      html += '<br>';
      Object.keys(inputs).forEach(function (key) {
        html += '<label>' + key + ':<br><input type="number" step="0.1" value="' + inputs[key].toFixed(2) + 
          '" onchange="window.updateScreenCorners(\'' + key + '\', this.value)" style="width:100%;background:#222;color:#0f0;border:1px solid #0f0;padding:4px;font-family:monospace;"/><br></label>';
      });

      debugContainer.innerHTML = html;
    }

    window.inputs = inputs;
    window.updateDebug = updateDebug;
    updateDebug();

    window.updateScreenCorners = function (key, value) {
      inputs[key] = parseFloat(value);
      SCREEN_W = inputs.SCREEN_W;
      SCREEN_H = inputs.SCREEN_H;
      SCREEN_Z = inputs.SCREEN_Z;
      MONITOR_ROT_X = inputs.ROT_X;
      MONITOR_ROT_Y = inputs.ROT_Y;
      MONITOR_SCALE = inputs.SCALE;

      // Apply rotation to mesh children, not the group
      monitorGroup.children.forEach(function (child) {
        if (child.userData.isLed) return;  // skip LED
        child.rotation.x = MONITOR_ROT_X;
        child.rotation.y = MONITOR_ROT_Y;
      });

      localCorners = [
        new THREE.Vector3(-SCREEN_W / 2,  SCREEN_H / 2, SCREEN_Z),
        new THREE.Vector3( SCREEN_W / 2,  SCREEN_H / 2, SCREEN_Z),
        new THREE.Vector3(-SCREEN_W / 2, -SCREEN_H / 2, SCREEN_Z),
        new THREE.Vector3( SCREEN_W / 2, -SCREEN_H / 2, SCREEN_Z),
      ];

      // Update matrix before recalculating screen rect
      monitorGroup.updateMatrixWorld(true);
      updateScreenRect();
      updateDebug();
    };

    window.updateScreenCorners('SCREEN_W', inputs.SCREEN_W);
  }

  // ── DEBUG: OVERHEAD LIGHT CONTROL (with rotation + camera views) ──
  function initOverheadLightDebug() {
    var debugContainer = document.createElement('div');
    debugContainer.id = 'overhead-light-debug';
    debugContainer.style.cssText = [
      'position:fixed;top:10px;right:10px',
      'background:rgba(0,0,0,0.92)',
      'color:#0f0',
      'font-family:monospace',
      'font-size:11px',
      'padding:10px',
      'z-index:9999',
      'width:280px',
      'border:1px solid #0f0',
      'border-radius:4px',
      'user-select:none',
    ].join(';');
    document.body.appendChild(debugContainer);

    // Light helper sphere so we can see the light position in scene
    var helperGeo = new THREE.SphereGeometry(0.12, 8, 8);
    var helperMat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
    var lightHelper = new THREE.Mesh(helperGeo, helperMat);
    lightHelper.position.copy(overheadLight.position);
    threeScene.add(lightHelper);

    // Spherical coords for the directional light (so rotation makes sense)
    // elevation = angle from horizontal (0 = side, 90 = straight down)
    // azimuth   = angle around Y axis
    var spherical = {
      radius:    Math.sqrt(3.30*3.30 + 4.20*4.20 + 5.27*5.27), // ~7.35
      azimuth:   32.0,
      elevation: 34.0,
    };

    function sphericalToXYZ(r, azDeg, elDeg) {
      var az = azDeg * Math.PI / 180;
      var el = elDeg * Math.PI / 180;
      return {
        x: r * Math.cos(el) * Math.sin(az),
        y: r * Math.sin(el),
        z: r * Math.cos(el) * Math.cos(az),
      };
    }

    function applySpherical() {
      var p = sphericalToXYZ(spherical.radius, spherical.azimuth, spherical.elevation);
      overheadLight.position.set(p.x, p.y, p.z);
      lightHelper.position.copy(overheadLight.position);
    }

    var params = {
      INTENSITY: overheadLight.intensity,
      COLOR: '#ffffff',
      AZIMUTH:   32.0,
      ELEVATION: 34.0,
      RADIUS:    Math.sqrt(3.30*3.30 + 4.20*4.20 + 5.27*5.27),
      POS_X: 3.30,
      POS_Y: 4.20,
      POS_Z: 5.27,
    };

    // Build a small row of camera view buttons
    var viewNames = ['default', 'top', 'side', 'front'];

    function updateUI() {
      var pos = overheadLight.position;
      var html = '';

      // ── Title + helper toggle ──
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
      html += '<strong style="font-size:12px;">🔦 Overhead Light Debug</strong>';
      html += '<label style="cursor:pointer;font-size:10px;">';
      html += '<input type="checkbox" id="dbg-helper-toggle" checked onchange="window._dbgHelperToggle(this.checked)" style="margin-right:3px;">';
      html += 'Show helper</label>';
      html += '</div>';

      // ── Live position readout ──
      html += '<div style="color:#888;margin-bottom:6px;font-size:10px;">';
      html += 'pos: (' + pos.x.toFixed(2) + ', ' + pos.y.toFixed(2) + ', ' + pos.z.toFixed(2) + ')&nbsp;';
      html += 'az: ' + spherical.azimuth.toFixed(1) + '° el: ' + spherical.elevation.toFixed(1) + '°</div>';

      // ── Camera view buttons ──
      html += '<div style="margin-bottom:8px;">';
      html += '<span style="color:#888;font-size:10px;">Camera view: </span><br style="margin:2px 0;">';
      viewNames.forEach(function (name) {
        var active = activeCameraView === name;
        var btnStyle = [
          'display:inline-block;margin:2px 2px 2px 0;padding:3px 8px',
          'border:1px solid ' + (active ? '#0f0' : '#555'),
          'border-radius:3px',
          'cursor:pointer',
          'font-family:monospace;font-size:10px',
          'background:' + (active ? 'rgba(0,255,0,0.15)' : 'rgba(255,255,255,0.04)'),
          'color:' + (active ? '#0f0' : '#aaa'),
        ].join(';');
        html += '<span style="' + btnStyle + '" onclick="window._dbgCamView(\'' + name + '\')">' + name.toUpperCase() + '</span>';
      });
      html += '</div>';

      // ── Rotation sliders (azimuth / elevation / radius) ──
      html += '<div style="color:#0aa;font-size:10px;margin-bottom:4px;">▸ Rotation</div>';
      [
        { key: 'AZIMUTH',   label: 'Azimuth',   min: -180, max: 180, step: 1 },
        { key: 'ELEVATION', label: 'Elevation', min: 0,    max: 90,  step: 1 },
        { key: 'RADIUS',    label: 'Radius',    min: 1,    max: 20,  step: 0.5 },
      ].forEach(function (s) {
        html += '<label style="display:block;margin-bottom:4px;">' + s.label + ': ';
        html += '<span id="dbg-val-' + s.key + '" style="color:#fff;">' + params[s.key].toFixed(1) + '</span><br>';
        html += '<input type="range" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + params[s.key] + '"';
        html += ' oninput="window._dbgLightChange(\'' + s.key + '\',this.value)"';
        html += ' style="width:100%;accent-color:#0f0;cursor:pointer;"/>';
        html += '</label>';
      });

      // ── Intensity + Colour ──
      html += '<div style="color:#0aa;font-size:10px;margin:6px 0 4px;">▸ Appearance</div>';
      html += '<label style="display:block;margin-bottom:4px;">Intensity: ';
      html += '<span id="dbg-val-INTENSITY" style="color:#fff;">' + params.INTENSITY.toFixed(2) + '</span><br>';
      html += '<input type="range" min="0" max="5" step="0.05" value="' + params.INTENSITY + '"';
      html += ' oninput="window._dbgLightChange(\'INTENSITY\',this.value)"';
      html += ' style="width:100%;accent-color:#0f0;cursor:pointer;"/>';
      html += '</label>';
      html += '<label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">Colour:';
      html += '<input type="color" value="' + params.COLOR + '"';
      html += ' onchange="window._dbgLightChange(\'COLOR\',this.value)"';
      html += ' style="flex:1;height:24px;cursor:pointer;border:1px solid #0f0;background:none;"/>';
      html += '</label>';

      // ── Fine XYZ position ──
      html += '<div style="color:#0aa;font-size:10px;margin:6px 0 4px;">▸ Fine Position</div>';
      ['POS_X','POS_Y','POS_Z'].forEach(function (key) {
        html += '<label style="display:block;margin-bottom:4px;">' + key + ': ';
        html += '<input type="number" step="0.1" value="' + params[key].toFixed(2) + '"';
        html += ' onchange="window._dbgLightChange(\'' + key + '\',this.value)"';
        html += ' style="width:100%;background:#111;color:#0f0;border:1px solid #333;padding:3px;font-family:monospace;"/>';
        html += '</label>';
      });

      debugContainer.innerHTML = html;
    }

    // ── Global handlers ──────────────────────────────────────
    window._dbgHelperToggle = function (on) {
      lightHelper.visible = on;
    };

    window._dbgCamView = function (name) {
      if (!cameraViews[name]) return;
      activeCameraView = name;
      // Kick off smooth camera animation
      camAnim.fromPos.copy(camera.position);
      camAnim.fromTarget.set(0, 0, 0);   // approximate — always looking at origin
      camAnim.toPos.copy(cameraViews[name].pos);
      camAnim.toTarget.copy(cameraViews[name].target);
      camAnim.progress = 0;
      camAnim.active = true;
      updateUI();   // refresh button highlights
    };

    window._dbgLightChange = function (key, value) {
      var v = parseFloat(value);
      params[key] = isNaN(v) ? value : v;

      if (key === 'AZIMUTH')   { spherical.azimuth   = v; applySpherical(); }
      else if (key === 'ELEVATION') { spherical.elevation = v; applySpherical(); }
      else if (key === 'RADIUS')    { spherical.radius    = v; applySpherical(); }
      else if (key === 'INTENSITY') { overheadLight.intensity = v; }
      else if (key === 'COLOR')     { overheadLight.color.set(value); }
      else if (key === 'POS_X') { overheadLight.position.x = v; lightHelper.position.x = v;
                                   // Sync back to spherical
                                   spherical.azimuth   = Math.atan2(overheadLight.position.x, overheadLight.position.z) * 180 / Math.PI;
                                   spherical.elevation = Math.atan2(overheadLight.position.y, Math.sqrt(overheadLight.position.x*overheadLight.position.x + overheadLight.position.z*overheadLight.position.z)) * 180 / Math.PI;
                                   spherical.radius    = overheadLight.position.length(); }
      else if (key === 'POS_Y') { overheadLight.position.y = v; lightHelper.position.y = v; }
      else if (key === 'POS_Z') { overheadLight.position.z = v; lightHelper.position.z = v; }

      // Update POS_X/Y/Z params from spherical changes
      if (['AZIMUTH','ELEVATION','RADIUS'].indexOf(key) !== -1) {
        params.POS_X = overheadLight.position.x;
        params.POS_Y = overheadLight.position.y;
        params.POS_Z = overheadLight.position.z;
      }

      // Update live value display spans without full re-render
      var valEl = document.getElementById('dbg-val-' + key);
      if (valEl) valEl.textContent = (typeof v === 'number' ? v.toFixed(typeof value === 'string' && value.indexOf('.') !== -1 ? 2 : 1) : value);

      // Refresh full UI every so often (cheap enough)
      updateUI();
    };

    updateUI();
  }

  // ── DEBUG: LED POSITION & BLINK CONTROL ──────────────────
  function initLEDDebug() {
    var debugContainer = document.createElement('div');
    debugContainer.id = 'led-debug';
    debugContainer.style.cssText = [
      'position:fixed;bottom:10px;left:10px',
      'background:rgba(0,0,0,0.92)',
      'color:#0f0',
      'font-family:monospace',
      'font-size:11px',
      'padding:10px',
      'z-index:9999',
      'width:280px',
      'border:1px solid #0f0',
      'border-radius:4px',
      'user-select:none',
      'max-height:400px',
      'overflow-y:auto',
    ].join(';');
    document.body.appendChild(debugContainer);

    // Enlarge LED for debug visibility
    var originalRadius = ledConfig.radius;
    ledConfig.radius = 0.2;  // Make it much larger so you can see it
    if (powerLED) {
      powerLED.geometry = new THREE.SphereGeometry(ledConfig.radius, 16, 16);
      powerLED.material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        emissive: 0x00ff00,
        toneMapped: false
      });
    }

    // Add a large wireframe helper sphere around the LED
    var helperGeo = new THREE.SphereGeometry(0.5, 32, 32);
    var helperMat = new THREE.MeshBasicMaterial({ 
      color: 0xff00ff, 
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      toneMapped: false
    });
    var ledHelper = new THREE.Mesh(helperGeo, helperMat);
    ledHelper.position.copy(powerLED.position);
    threeScene.add(ledHelper);
    
    // Store helper for global access
    window._ledHelper = ledHelper;
    
    console.log('LED Debug activated. LED position:', powerLED.position);
    console.log('LED visibility:', powerLED.visible);
    
    // Store camera/scene for debug zoom function
    window._dbgCamera = camera;
    window._dbgScene = threeScene;

    function updateUI() {
      var html = '';
      
      // ── Title ──
      html += '<div style="margin-bottom:6px;">';
      html += '<strong style="font-size:12px;">💡 Power LED Debug</strong>';
      html += '</div>';

      // ── LED World Position ──
      html += '<div style="background:#1a1a1a;padding:6px;margin-bottom:8px;border:1px solid #0a0;border-radius:2px;font-size:9px;">';
      html += '<div style="color:#aaa;">World Position:</div>';
      if (powerLED) {
        html += '<div style="color:#0f0;">X: ' + powerLED.position.x.toFixed(3) + ' Y: ' + powerLED.position.y.toFixed(3) + ' Z: ' + powerLED.position.z.toFixed(3) + '</div>';
      }
      html += '</div>';

      // ── Zoom to LED button ──
      html += '<button onclick="window._ledDebugZoom()" style="width:100%;padding:6px;margin-bottom:8px;background:#0a0;color:#000;border:none;border-radius:3px;cursor:pointer;font-family:monospace;font-weight:bold;font-size:10px;">ZOOM TO LED</button>';

      // ── Position ──
      html += '<div style="color:#0aa;font-size:10px;margin-bottom:4px;">▸ Position</div>';
      ['posX','posY','posZ'].forEach(function (key) {
        var label = key.replace('pos','');
        html += '<label style="display:block;margin-bottom:4px;">' + label + ': ';
        html += '<span id="led-val-' + key + '" style="color:#fff;">' + ledConfig[key].toFixed(3) + '</span><br>';
        html += '<input type="range" min="-5" max="5" step="0.05" value="' + ledConfig[key] + '"';
        html += ' oninput="window._ledDebugChange(\'' + key + '\',this.value)"';
        html += ' style="width:100%;accent-color:#0f0;cursor:pointer;"/>';
        html += '</label>';
      });

      // ── Size ──
      html += '<div style="color:#0aa;font-size:10px;margin:6px 0 4px;">▸ Size</div>';
      html += '<label style="display:block;margin-bottom:4px;">Radius: ';
      html += '<span id="led-val-radius" style="color:#fff;">' + ledConfig.radius.toFixed(3) + '</span><br>';
      html += '<input type="range" min="0.01" max="0.2" step="0.005" value="' + ledConfig.radius + '"';
      html += ' oninput="window._ledDebugChange(\'radius\',this.value)"';
      html += ' style="width:100%;accent-color:#0f0;cursor:pointer;"/>';
      html += '</label>';

      // ── Blink ──
      html += '<div style="color:#0aa;font-size:10px;margin:6px 0 4px;">▸ Blink</div>';
      html += '<label style="display:block;margin-bottom:4px;">Speed: ';
      html += '<span id="led-val-blinkSpeed" style="color:#fff;">' + ledConfig.blinkSpeed.toFixed(2) + '</span><br>';
      html += '<input type="range" min="0.5" max="10" step="0.5" value="' + ledConfig.blinkSpeed + '"';
      html += ' oninput="window._ledDebugChange(\'blinkSpeed\',this.value)"';
      html += ' style="width:100%;accent-color:#0f0;cursor:pointer;"/>';
      html += '</label>';
      html += '<label style="display:block;margin-bottom:4px;">Intensity: ';
      html += '<span id="led-val-blinkIntensity" style="color:#fff;">' + ledConfig.blinkIntensity.toFixed(2) + '</span><br>';
      html += '<input type="range" min="0" max="1" step="0.05" value="' + ledConfig.blinkIntensity + '"';
      html += ' oninput="window._ledDebugChange(\'blinkIntensity\',this.value)"';
      html += ' style="width:100%;accent-color:#0f0;cursor:pointer;"/>';
      html += '</label>';

      // ── Color ──
      html += '<div style="color:#0aa;font-size:10px;margin:6px 0 4px;">▸ Color (RGB)</div>';
      ['colorR','colorG','colorB'].forEach(function (key) {
        var label = key.replace('color','');
        html += '<label style="display:block;margin-bottom:4px;">' + label + ': ';
        html += '<span id="led-val-' + key + '" style="color:#fff;">' + ledConfig[key].toFixed(2) + '</span><br>';
        html += '<input type="range" min="0" max="1" step="0.05" value="' + ledConfig[key] + '"';
        html += ' oninput="window._ledDebugChange(\'' + key + '\',this.value)"';
        html += ' style="width:100%;accent-color:#0f0;cursor:pointer;"/>';
        html += '</label>';
      });

      // ── Copy button ──
      html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #333;">';
      html += '<button onclick="window._ledDebugCopy()" style="width:100%;padding:6px;background:#0f0;color:#000;border:none;border-radius:3px;cursor:pointer;font-family:monospace;font-weight:bold;">COPY CONFIG</button>';
      html += '</div>';

      debugContainer.innerHTML = html;
    }

    // ── Global handlers ──
    window._ledDebugZoom = function () {
      if (!powerLED || !window._dbgCamera) return;
      // Zoom camera to look at LED from a distance
      var distance = 2;
      var ledWorldPos = powerLED.position.clone();
      window._dbgCamera.position.set(
        ledWorldPos.x + distance * 0.5,
        ledWorldPos.y + distance * 0.5,
        ledWorldPos.z + distance
      );
      window._dbgCamera.lookAt(ledWorldPos);
      activeCameraView = 'custom';
      console.log('Zoomed to LED at:', ledWorldPos);
    };

    window._ledDebugChange = function (key, value) {
      var v = parseFloat(value);
      ledConfig[key] = isNaN(v) ? value : v;

      // Update LED if it exists
      if (powerLED) {
        if (key === 'posX') {
          powerLED.position.x = v;
          if (window._ledHelper) window._ledHelper.position.x = v;
        } else if (key === 'posY') {
          powerLED.position.y = v;
          if (window._ledHelper) window._ledHelper.position.y = v;
        } else if (key === 'posZ') {
          powerLED.position.z = v;
          if (window._ledHelper) window._ledHelper.position.z = v;
        } else if (key === 'radius') {
          powerLED.geometry = new THREE.SphereGeometry(v, 16, 16);
        }
      }

      // Update value display
      var valEl = document.getElementById('led-val-' + key);
      if (valEl) valEl.textContent = v.toFixed(key.indexOf('Int') !== -1 ? 2 : 3);

      updateUI();
    };

    window._ledDebugCopy = function () {
      var configStr = 'ledConfig: {\n';
      Object.keys(ledConfig).forEach(function (key) {
        configStr += '  ' + key + ': ' + ledConfig[key] + ',\n';
      });
      configStr += '}';
      console.log(configStr);
      alert('LED config copied to console:\n' + configStr);
    };

    updateUI();
  }

  // ── SCREEN CANVAS & TEXTURE ───────────────────────────────
  function buildScreenCanvas() {
    // Create a high-resolution canvas that matches screen-overlay size
    // Use 2x the viewport size for better quality on the 3D mesh
    var scale = 2;
    screenCanvas = document.createElement('canvas');
    screenCanvas.width = window.innerWidth * scale;
    screenCanvas.height = window.innerHeight * scale;
    screenCanvas.style.display = 'none';
    document.body.appendChild(screenCanvas);

    // Create CanvasTexture (will be updated each frame)
    screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.magFilter = THREE.LinearFilter;
    screenTexture.minFilter = THREE.LinearFilter;
  }

  // ── UPDATE SCREEN TEXTURE FROM DOM ─────────────────────────
  function updateScreenTexture() {
    if (!screenCanvas || !html2canvas) return;

    var screenOverlay = document.getElementById('screen-overlay');
    if (!screenOverlay) return;

    // Use html2canvas to render the overlay to our canvas
    // This captures the current state of all DOM elements
    html2canvas(screenOverlay, {
      canvas: screenCanvas,
      scale: 2,
      backgroundColor: null,
      allowTaint: true,
      useCORS: true,
      width: window.innerWidth,
      height: window.innerHeight,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
    }).then(function(canvas) {
      // Update the texture
      screenTexture.needsUpdate = true;
    }).catch(function(err) {
      // Silently handle errors (some elements may not render to canvas)
    });
  }

  // ── MONITOR ───────────────────────────────────────────────
  function buildMonitor() {
    monitorGroup = new THREE.Group();

    // Load custom monitor mesh instead of building it
    var loader = new THREE.GLTFLoader();
    loader.load(
      'mesh/Display.glb',
      function (gltf) {
        var mesh = gltf.scene;
        mesh.scale.set(MONITOR_SCALE, MONITOR_SCALE, MONITOR_SCALE);
        // Apply rotation only to the mesh, not the group
        mesh.rotation.x = MONITOR_ROT_X;
        mesh.rotation.y = MONITOR_ROT_Y;
        monitorGroup.add(mesh);
          
        // Store original positions for jitter effect if geometry exists
        mesh.traverse(function (child) {
          if (child.geometry) storeOrig(child.geometry);
        });

        // Find and apply screen texture to monitor screen meshes
        // Look for meshes that would be the display screen
        mesh.traverse(function (child) {
          if (child.isMesh) {
            // Apply screen texture to meshes that look like screen surfaces
            // (typically named "Screen", "Display", or similar - adjust as needed)
            var name = child.name.toLowerCase();
            if (name.includes('screen') || name.includes('display') || 
                name.includes('face') || name.includes('panel')) {
              // Create a new material with the canvas texture
              var screenMaterial = new THREE.MeshBasicMaterial({
                map: screenTexture,
                transparent: true
              });
              child.material = screenMaterial;
              screenMeshes.push(child);
            }
          }
        });

        // If no named screen meshes found, apply to first large-ish mesh (fallback)
        if (screenMeshes.length === 0) {
          mesh.traverse(function (child) {
            if (child.isMesh && !child.userData.isLed) {
              var screenMaterial = new THREE.MeshBasicMaterial({
                map: screenTexture,
                transparent: true
              });
              child.material = screenMaterial;
              screenMeshes.push(child);
            }
          });
        }
      },
      undefined,
      function (error) {
        console.error('Failed to load Display.glb:', error);
      }
    );

    // Power LED (always add)
    powerLED = new THREE.Mesh(
      new THREE.SphereGeometry(ledConfig.radius, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x39ff5a })
    );
    powerLED.position.set(ledConfig.posX, ledConfig.posY, ledConfig.posZ);
    powerLED.userData.isLed = true;
    // Add directly to scene in world space (not to monitorGroup)
    threeScene.add(powerLED);

    // Don't apply rotation to group — screen corners stay in unrotated space
    threeScene.add(monitorGroup);
  }

  // ── STARFIELD (warm sepia dots) ────────────────────────────
  function buildStarfield() {
    var positions = [];
    for (var i = 0; i < 550; i++) {
      positions.push(
        (Math.random() - 0.5) * 55,
        (Math.random() - 0.5) * 36,
        (Math.random() - 0.5) * 26 - 6
      );
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({ color: COL_STAR, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.38 });
    threeScene.add(new THREE.Points(geo, mat));
  }

  // ── VOID PARTICLES (CSS) ──────────────────────────────────
  function buildVoidParticles() {
    var c = document.getElementById('particles');
    if (!c) return;
    for (var i = 0; i < 18; i++) {
      var p = document.createElement('div');
      p.className = 'void-particle';
      p.style.left             = (Math.random() * 100) + 'vw';
      p.style.bottom           = (-Math.random() * 8) + 'vh';
      p.style.animationDuration = (9 + Math.random() * 11) + 's';
      p.style.animationDelay   = (-Math.random() * 14) + 's';
      c.appendChild(p);
    }
  }

  // ── PROJECT ICON MESHES (auto-grid, isometric spin) ────────
  function buildProjectIcons() {
    projectMeshGroup = new THREE.Group();
    projectMeshGroup.visible = false;  // Hidden until ProjectApp opens
    threeScene.add(projectMeshGroup);

    var projects = SITE_DATA.projects;
    var n        = projects.length;
    var nLeft    = Math.ceil(n / 2);
    var nRight   = n - nLeft;

    var texLoader = new THREE.TextureLoader();

    projects.forEach(function (proj, idx) {
      var isLeft    = idx < nLeft;
      var localIdx  = isLeft ? idx : idx - nLeft;
      var colSize   = isLeft ? nLeft : nRight;
      var colX      = isLeft ? -3 : 3;

      var ySpacing  = colSize > 1 ? Math.min(1.7, 3.0 / (colSize - 1)) : 0;
      var yPos      = colSize > 1 ? (localIdx - (colSize - 1) / 2) * ySpacing : 0;

      var targetPos = new THREE.Vector3(colX, yPos, 0.0);
      proj._scenePos = targetPos;   // cached for HTML overlay projection

      // Default geometry: low-poly card/tile
      var geo = new THREE.BoxGeometry(0.88, 0.88, 0.10, 2, 2, 1);
      var mat = buildPSXMaterial(null);  // PSX shader — texture loaded async below

      var mesh = new THREE.Mesh(geo, mat);
      // Start at the hidden/origin position behind the monitor
      mesh.position.copy(ICON_ORIGIN);
      // Isometric tilt — angle down 10 degrees
      mesh.rotation.x = 10 * (Math.PI / 180);

      var rotSpeed = (0.007 + Math.random() * 0.004) * (Math.random() > 0.5 ? 1 : -1);
      var rotSpeedX = (0.003 + Math.random() * 0.003) * (Math.random() > 0.5 ? 1 : -1);
      var rotSpeedZ = (0.003 + Math.random() * 0.003) * (Math.random() > 0.5 ? 1 : -1);
      mesh.userData.rotSpeed = rotSpeed;
      mesh.userData.rotSpeedX = rotSpeedX;
      mesh.userData.rotSpeedZ = rotSpeedZ;
      mesh.userData.projKey  = proj.key;

      projectMeshGroup.add(mesh);
      projectMeshes.push(mesh);

      // Register animation entry for this mesh (starts fully hidden)
      iconAnims.push({ mesh: mesh, targetPos: targetPos.clone(), progress: 0, direction: 0 });

      // ── Load texture: img/{key}.png → img/No_Texture.webp ──
      texLoader.load(
        'img/' + proj.key + '.png',
        function (tex) {
          tex.minFilter = THREE.NearestFilter;
          tex.magFilter = THREE.NearestFilter;
          mat.uniforms.map.value       = tex;
          mat.uniforms.hasTexture.value = 1.0;
        },
        undefined,
        function () {
          texLoader.load('img/No_Texture.webp', function (tex) {
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
            mat.uniforms.map.value       = tex;
            mat.uniforms.hasTexture.value = 1.0;
          });
        }
      );

      // ── Try to load custom GLB mesh ───────────────────────
      loadMesh(proj, mesh, mat, targetPos, idx);
    });
  }

  function loadMesh(proj, defaultMesh, defaultMat, targetPos, projIdx) {
    if (typeof THREE.GLTFLoader === 'undefined') return;
    var loader = new THREE.GLTFLoader();
    loader.load(
      'mesh/' + proj.key + '.glb',
      function (gltf) {
        // Replace default box with loaded mesh
        projectMeshGroup.remove(defaultMesh);
        var loaded = gltf.scene;
        
        // Auto-scale to fit bounding box (0.88 x 0.88 x 0.10)
        var bbox = new THREE.Box3().setFromObject(loaded);
        var size = bbox.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);
        var scale = 0.88 / maxDim;
        loaded.scale.multiplyScalar(scale);
        
        // Recalculate bounding box after scaling
        bbox.setFromObject(loaded);
        var center = bbox.getCenter(new THREE.Vector3());
        
        // Create wrapper group for rotation around geometric center
        var wrapper = new THREE.Group();
        // Start at origin (hidden position behind monitor)
        wrapper.position.copy(ICON_ORIGIN);
        wrapper.rotation.x = 10 * (Math.PI / 180);
        
        // Offset loaded mesh so its geometric center is at wrapper's local origin
        loaded.position.copy(center).negate();
        
        wrapper.add(loaded);
        wrapper.userData.rotSpeed = defaultMesh.userData.rotSpeed;
        wrapper.userData.rotSpeedX = defaultMesh.userData.rotSpeedX;
        wrapper.userData.rotSpeedZ = defaultMesh.userData.rotSpeedZ;
        wrapper.userData.projKey  = proj.key;
        
        projectMeshGroup.add(wrapper);

        // Swap reference in projectMeshes array
        var meshIdx = projectMeshes.indexOf(defaultMesh);
        if (meshIdx !== -1) projectMeshes[meshIdx] = wrapper;

        // Swap reference in iconAnims array (match by projIdx)
        if (iconAnims[projIdx]) {
          iconAnims[projIdx].mesh = wrapper;
        }
      },
      undefined,
      function () { /* silently keep default box */ }
    );
  }

  // ── RESIZE ────────────────────────────────────────────────
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Keep post-fx resolution fixed at PSX spec (upscaling is the point)
    // but update the post material's resolution uniform to match the render target
    if (psxPostMaterial) {
      psxPostMaterial.uniforms.resolution.value.set(PSX_RESOLUTION.w, PSX_RESOLUTION.h);
    }
  }

  // ── SCREEN OVERLAY TRACKING ───────────────────────────────
  // Position the overlay div to match monitor screen bounds for event handling
  function updateOverlay() {
    monitorGroup.updateMatrixWorld(true);

    var minX = Infinity, maxX = -Infinity;
    var minY = Infinity, maxY = -Infinity;

    for (var i = 0; i < localCorners.length; i++) {
      var world = localCorners[i].clone().applyMatrix4(monitorGroup.matrixWorld);
      var ndc   = world.project(camera);
      var sx    = (ndc.x + 1) / 2 * window.innerWidth;
      var sy    = (-ndc.y + 1) / 2 * window.innerHeight;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }

    var overlay = document.getElementById('screen-overlay');
    if (overlay) {
      overlay.style.left   = minX + 'px';
      overlay.style.top    = minY + 'px';
      overlay.style.width  = (maxX - minX) + 'px';
      overlay.style.height = (maxY - minY + 26) + 'px';  // Add 26px for taskbar height
    }
    screenRect.left   = minX;
    screenRect.top    = minY;
    screenRect.width  = maxX - minX;
    screenRect.height = maxY - minY + 26;  // Include taskbar height
  }

  // ── VOID ICON HTML OVERLAY (project icon labels + click targets) ──
  function updateVoidIcons() {
    var projects = SITE_DATA.projects;
    for (var i = 0; i < projects.length; i++) {
      var proj = projects[i];
      var el   = document.getElementById('void-icon-' + proj.key);
      if (!el || !proj._scenePos) continue;

      var ndc = proj._scenePos.clone().project(camera);
      var sx  = (ndc.x + 1) / 2 * window.innerWidth;
      var sy  = (-ndc.y + 1) / 2 * window.innerHeight;
      el.style.left = sx + 'px';
      el.style.top  = sy + 'px';
    }
  }

  // ── VERTEX JITTER (PSX wobble) ────────────────────────────
  function applyJitter() {
    if (!monitorGroup) return;
    monitorGroup.children.forEach(function (mesh) {
      var amt = mesh.userData.jitter;
      if (!amt) return;
      var geo  = mesh.geometry;
      var orig = geo.userData.origPos;
      if (!orig) return;
      var pos = geo.attributes.position;
      for (var i = 0; i < pos.count; i++) {
        pos.setX(i, orig[i * 3]     + (Math.random() - 0.5) * amt);
        pos.setY(i, orig[i * 3 + 1] + (Math.random() - 0.5) * amt);
        pos.setZ(i, orig[i * 3 + 2] + (Math.random() - 0.5) * amt);
      }
      pos.needsUpdate = true;
    });
  }

  // ── EASING ────────────────────────────────────────────────
  function easeOutBack(t) {
    // Slight overshoot spring feel on arrival
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function easeInBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }

  // ── ICON ANIMATION STEP ───────────────────────────────────
  function stepIconAnims() {
    iconAnims.forEach(function (anim) {
      if (anim.direction === 0) return;

      // Skip until stagger delay clears (negative progress = waiting)
      anim.progress += ICON_ANIM_SPEED;
      if (anim.progress < 0) return;

      var clamped = Math.min(anim.progress, 1);

      if (anim.direction === 1) {
        // Fly OUT: origin → target with overshoot bounce
        var t = easeOutBack(clamped);
        anim.mesh.position.lerpVectors(ICON_ORIGIN, anim.targetPos, t);
        if (clamped >= 1) {
          // Snap exactly to target so the mesh stays put
          anim.mesh.position.copy(anim.targetPos);
          anim.direction = 0;
        }
      } else {
        // Fly IN: target → origin
        var t = easeInBack(clamped);
        anim.mesh.position.lerpVectors(anim.targetPos, ICON_ORIGIN, t);
        if (clamped >= 1) {
          anim.mesh.position.copy(ICON_ORIGIN);
          anim.direction = 0;
        }
      }
    });
  }

  // ── CAMERA ANIMATION STEP ─────────────────────────────────
  function stepCameraAnim() {
    if (!camAnim.active) return;
    camAnim.progress += 0.04;
    if (camAnim.progress >= 1) {
      camAnim.progress = 1;
      camAnim.active = false;
    }
    var t = 1 - Math.pow(1 - camAnim.progress, 3); // ease-out cubic
    camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, t);
    var targetNow = new THREE.Vector3().lerpVectors(camAnim.fromTarget, camAnim.toTarget, t);
    camera.lookAt(targetNow);
    camera.updateProjectionMatrix();
  }

  // ── RENDER LOOP ───────────────────────────────────────────
  var jitterCnt = 0;
  var texUpdateCnt = 0;
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    var t = Date.now() * 0.001;

    // LED pulse
    if (powerLED) {
      var intensity = 0.5 + ledConfig.blinkIntensity * Math.sin(t * ledConfig.blinkSpeed);
      var r = ledConfig.colorR * intensity;
      var g = ledConfig.colorG * intensity;
      var b = ledConfig.colorB * intensity;
      powerLED.material.color.setRGB(r, g, b);
    }

    // Rotate project icon meshes
    projectMeshes.forEach(function (mesh) {
      mesh.rotation.x += mesh.userData.rotSpeedX || ((Math.random() > 0.5 ? 1 : -1) * 0.004);
      mesh.rotation.y += mesh.userData.rotSpeed || (Math.random() > 0.5 ? 0.008 : -0.008);
      mesh.rotation.z += mesh.userData.rotSpeedZ || ((Math.random() > 0.5 ? 1 : -1) * 0.004);
    });

    // Animate icon positions (fly in / fly out)
    stepIconAnims();

    // Animate camera transitions
    stepCameraAnim();

    jitterCnt++;
    if (jitterCnt % 8 === 0) applyJitter();

    // Update screen texture periodically (every few frames for performance)
    texUpdateCnt++;
    if (texUpdateCnt % 3 === 0) updateScreenTexture();

    // ── Two-pass PSX render ───────────────────────────────
    // Pass 1: render 3D scene into the low-res PSX render target
    renderer.setRenderTarget(psxRenderTarget);
    renderer.render(threeScene, camera);
    // Pass 2: upscale through PSX post-fx shader (dither, colour depth, CRT)
    renderer.setRenderTarget(null);
    renderer.render(psxPostScene, psxPostCamera);

    updateOverlay();
    updateVoidIcons();
  }

  // ── PSX POST-PROCESSING ───────────────────────────────────
  function buildPostFX() {
    // Render scene to a low-res target for the PSX pixelation look
    psxRenderTarget = new THREE.WebGLRenderTarget(
      PSX_RESOLUTION.w, PSX_RESOLUTION.h,
      {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      }
    );

    // Fullscreen quad for the post-process pass
    psxPostCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    psxPostScene  = new THREE.Scene();

    psxPostMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tScene:      { value: psxRenderTarget.texture },
        resolution:  { value: new THREE.Vector2(PSX_RESOLUTION.w, PSX_RESOLUTION.h) },
        colorDepth:  { value: 31.0 },    // 5-bit per channel (PS1 15-bit colour)
        ditherStr:   { value: 0.01 },    // strength of Bayer dither
        crtWarp:     { value: 0.05 },   // barrel-distortion amount
        scanlineStr: { value: 0.10 },    // darkness of scanline dip
        vignette:    { value: 0.38 },    // edge darkening
      },

      vertexShader: [
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  gl_Position = vec4(position, 1.0);',
        '}',
      ].join('\n'),

      fragmentShader: [
        'uniform sampler2D tScene;',
        'uniform vec2  resolution;',
        'uniform float colorDepth;',
        'uniform float ditherStr;',
        'uniform float crtWarp;',
        'uniform float scanlineStr;',
        'uniform float vignette;',
        'varying vec2 vUv;',

        // 4×4 Bayer ordered-dither matrix (values 0-15, normalised to 0-1)
        'float bayer(vec2 p) {',
        '  int x = int(mod(p.x, 4.0));',
        '  int y = int(mod(p.y, 4.0));',
        '  int idx = y * 4 + x;',
        '  float m[16];',
        '  m[0]= 0.0;  m[1]= 8.0;  m[2]= 2.0;  m[3]=10.0;',
        '  m[4]=12.0;  m[5]= 4.0;  m[6]=14.0;  m[7]= 6.0;',
        '  m[8]= 3.0;  m[9]=11.0; m[10]= 1.0; m[11]= 9.0;',
        '  m[12]=15.0; m[13]= 7.0; m[14]=13.0; m[15]= 5.0;',
        '  return m[idx] / 16.0 - 0.5;',
        '}',

        // Barrel / CRT warp — bends the UV inward at edges
        'vec2 crtUV(vec2 uv, float warp) {',
        '  vec2 dc = uv - 0.5;',
        '  dc *= 1.0 + warp * dot(dc, dc) * 4.0;',
        '  return dc + 0.5;',
        '}',

        'void main() {',
        // CRT warp
        '  vec2 uv = crtUV(vUv, crtWarp);',

        // Kill pixels outside warped screen (letterbox / black edges)
        '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {',
        '    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);',
        '    return;',
        '  }',

        '  vec4 col = texture2D(tScene, uv);',

        // Ordered dithering — adds noise before quantising, breaks up gradient banding
        '  vec2 screenPx = uv * resolution;',
        '  float d = bayer(screenPx) * ditherStr;',
        '  col.rgb += d;',

        // 5-bit colour depth quantisation (PS1 15-bit colour)
        '  col.rgb = floor(col.rgb * colorDepth + 0.5) / colorDepth;',

        // Scanlines — darken every other output pixel row
        '  float scanY = mod(gl_FragCoord.y, 2.0);',
        '  col.rgb *= 1.0 - scanlineStr * step(1.0, scanY);',

        // Vignette — darken edges
        '  vec2 vig = vUv * (1.0 - vUv);',
        '  float vigVal = pow(vig.x * vig.y * 15.0, vignette);',
        '  col.rgb *= vigVal;',

        '  gl_FragColor = vec4(col.rgb, 1.0);',
        '}',
      ].join('\n'),
    });

    var quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), psxPostMaterial);
    psxPostScene.add(quad);
  }

  // ── PSX VERTEX + FRAGMENT MATERIAL (for 3-D objects) ─────
  // Vertex snapping + affine (perspective-incorrect) UV mapping
  function buildPSXMaterial(texture) {
    return new THREE.ShaderMaterial({
      uniforms: {
        map:           { value: texture || null },
        snapRes:       { value: 160.0 },   // lower = more jitter
        hasTexture:    { value: texture ? 1.0 : 0.0 },
        baseColor:     { value: new THREE.Color(0x1a2e1d) },
        ambientLight:  { value: new THREE.Color(0x2a1e10) },
        lightDir:      { value: new THREE.Vector3(0.6, 0.8, 0.5).normalize() },
        lightColor:    { value: new THREE.Color(0xffffff) },
        lightIntensity:{ value: 1.4 },
      },

      vertexShader: [
        'uniform float snapRes;',
        'varying vec2  vUv;',
        'varying float vW;',
        'varying vec3  vNormal;',

        'void main() {',
        '  vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',

        // PSX vertex snapping — snap to low-res grid in clip space
        '  vec2 snapped = floor(pos.xy / pos.w * snapRes + 0.5) / snapRes * pos.w;',
        '  pos.xy = snapped;',

        // Pass w for affine UV trick (pre-multiply by w)
        '  vW  = pos.w;',
        '  vUv = uv * pos.w;',

        // Pass normal in view space for flat Gouraud-style lighting
        '  vNormal = normalize(normalMatrix * normal);',

        '  gl_Position = pos;',
        '}',
      ].join('\n'),

      fragmentShader: [
        'uniform sampler2D map;',
        'uniform float     hasTexture;',
        'uniform vec3      baseColor;',
        'uniform vec3      ambientLight;',
        'uniform vec3      lightDir;',
        'uniform vec3      lightColor;',
        'uniform float     lightIntensity;',

        'varying vec2  vUv;',
        'varying float vW;',
        'varying vec3  vNormal;',

        'void main() {',
        // Affine UV — divide out the pre-multiplied w to get swimming PS1 UVs
        '  vec2 affineUv = vUv / vW;',

        '  vec4 texCol = hasTexture > 0.5',
        '    ? texture2D(map, affineUv)',
        '    : vec4(baseColor, 1.0);',

        // Flat Lambert shading (no smoothing — mimics PS1 per-poly lighting)
        '  vec3 N = normalize(vNormal);',
        '  float diff = max(dot(N, lightDir), 0.0);',
        '  vec3 lit = ambientLight + lightColor * diff * lightIntensity;',

        // 5-bit colour per channel (clamp + quantise before write)
        '  vec3 col = texCol.rgb * lit;',
        '  col = floor(col * 31.0 + 0.5) / 31.0;',

        '  gl_FragColor = vec4(col, texCol.a);',
        '}',
      ].join('\n'),

      transparent: true,
    });
  }

  // ── PUBLIC: show/hide project icon meshes with fly-in animation ──
  function showProjectMeshes(on) {
    if (on) {
      // Make group visible first, then kick off fly-out animations with stagger
      projectMeshGroup.visible = true;
      iconAnims.forEach(function (anim, idx) {
        anim.direction = 1;   // open / fly out
        anim.progress  = 0;
        // Stagger each icon by a small delay based on index
        // We simulate delay by starting progress slightly negative
        anim.progress = -idx * 0.08;
      });
    } else {
      // Reverse: fly everything back behind the monitor
      iconAnims.forEach(function (anim, idx) {
        anim.direction = -1;  // close / suck back in
        anim.progress  = 0;
        // Stagger in reverse order so inner icons go first
        var reverseIdx = iconAnims.length - 1 - idx;
        anim.progress = -reverseIdx * 0.06;
      });

      // Hide group after longest possible animation completes
      var maxDelay = iconAnims.length * 0.08 + 1.0 / ICON_ANIM_SPEED;
      var hideAfterMs = (maxDelay / 60) * 1000 + 400;
      setTimeout(function () {
        // Only hide if we're still in "closed" state (direction finished at -1)
        var stillClosing = iconAnims.some(function (a) { return a.direction !== 0 || a.progress > 0; });
        if (!stillClosing) projectMeshGroup.visible = false;
        // Brute-force: reset all to origin position
        iconAnims.forEach(function (anim) {
          if (anim.direction === 0) anim.mesh.position.copy(ICON_ORIGIN);
        });
        projectMeshGroup.visible = false;
      }, hideAfterMs);
    }
  }

  return {
    init: init,
    screenRect: screenRect,
    showProjectMeshes: showProjectMeshes,
    initLEDDebug: initLEDDebug,
    // PSX shader uniform access (for potential debug controls)
    psxUniforms: function() { return psxPostMaterial ? psxPostMaterial.uniforms : null; },
    setPSXParam: function(key, val) {
      if (psxPostMaterial && psxPostMaterial.uniforms[key]) {
        psxPostMaterial.uniforms[key].value = val;
      }
    },
  };

}());