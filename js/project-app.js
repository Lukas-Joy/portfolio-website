/**
 * project-app.js — project.exe
 *
 * States: empty → preview (click icon) → info (click same) → preview (click again)
 * Preview: tries gif/{key}.gif first, falls back to canvas animation
 */

var ProjectApp = (function () {

  var isOpen      = false;
  var selectedKey = null;
  var state       = 'empty';
  var animId      = null;

  // ── INIT ──────────────────────────────────────────────────
  function init() {
    var body = document.getElementById('proj-body');

    var empty = document.createElement('div');
    empty.id  = 'proj-empty';
    empty.innerHTML =
      '<div class="pe-title">PROJECT.EXE</div>' +
      '<div class="pe-sub">Select a project from the void.<span class="blink">&#x2588;</span></div>';

    var preview = document.createElement('div');
    preview.id  = 'proj-preview';
    preview.innerHTML =
      '<div id="prev-wrap"></div>' +
      '<div id="prev-bar">' +
        '<span id="prev-title">—</span>' +
        '<span class="prev-hint blink">&nbsp;[ CLICK AGAIN FOR INFO ]</span>' +
      '</div>';

    var info = document.createElement('div');
    info.id  = 'proj-info';

    body.appendChild(empty);
    body.appendChild(preview);
    body.appendChild(info);

    var closeBtn = document.getElementById('proj-close');
    var minBtn   = document.getElementById('proj-min');
    if (closeBtn) closeBtn.onclick = close;
    if (minBtn)   minBtn.onclick   = close;
  }

  // ── OPEN / CLOSE / TOGGLE ─────────────────────────────────
  function open() {
    document.getElementById('project-app').style.display = 'flex';
    isOpen = true;
    Desktop.showVoidIcons(true);
    Scene.showProjectMeshes(true);
    Desktop.setRunning('ic-projects', true);
    setState('empty');
  }

  function close() {
    document.getElementById('project-app').style.display = 'none';
    isOpen = false; selectedKey = null;
    Desktop.showVoidIcons(false);
    Scene.showProjectMeshes(false);
    Desktop.setRunning('ic-projects', false);
    stopAnim();
    clearVoidSel();
  }

  function toggle() { if (isOpen) close(); else open(); }

  // ── SELECT PROJECT ─────────────────────────────────────────
  function selectProject(key) {
    if (!isOpen) open();

    if (selectedKey === key) {
      setState(state === 'preview' ? 'info' : 'preview', key);
    } else {
      selectedKey = key;
      clearVoidSel();
      var el = document.getElementById('void-icon-' + key);
      if (el) el.classList.add('selected');
      setState('preview', key);
    }
  }

  // ── STATE MACHINE ─────────────────────────────────────────
  function setState(newState, key) {
    state = newState;
    if (key) selectedKey = key;
    stopAnim();

    var eEmpty   = document.getElementById('proj-empty');
    var ePreview = document.getElementById('proj-preview');
    var eInfo    = document.getElementById('proj-info');
    if (!eEmpty) return;

    eEmpty.style.display   = 'none';
    ePreview.style.display = 'none';
    eInfo.style.display    = 'none';

    if (state === 'empty') {
      eEmpty.style.display = 'flex';
    } else if (state === 'preview') {
      ePreview.style.display = 'flex';
      startPreview(selectedKey);
    } else if (state === 'info') {
      eInfo.style.display = 'flex';
      buildInfo(selectedKey);
    }
  }

  // ── PREVIEW ───────────────────────────────────────────────
  function startPreview(key) {
    var proj = getProj(key);
    if (!proj) return;
    document.getElementById('prev-title').textContent = proj.title + ' \u00b7 ' + proj.type;

    var wrap = document.getElementById('prev-wrap');
    wrap.innerHTML = '';

    // Try GIF first
    var testImg    = new Image();
    testImg.onload = function () {
      // GIF loaded — display it
      wrap.innerHTML = '';
      var img = document.createElement('img');
      img.src   = 'gif/' + key + '.gif';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;image-rendering:pixelated;display:block;';
      wrap.appendChild(img);
    };
    testImg.onerror = function () {
      // No GIF — use canvas animation
      startCanvasPreview(key, proj, wrap);
    };
    testImg.src = 'gif/' + key + '.gif';
  }

  function startCanvasPreview(key, proj, wrap) {
    var canvas = document.createElement('canvas');
    canvas.id  = 'prev-canvas';
    canvas.style.cssText = 'width:100%;height:100%;display:block;image-rendering:pixelated;';
    wrap.appendChild(canvas);

    function resize() {
      canvas.width  = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
    }
    resize();
    canvas._rz = resize;
    window.addEventListener('resize', resize);

    var ctx   = canvas.getContext('2d');
    var frame = 0;
    var fns   = { platformer:drawPlatformer, horror:drawHorror, corridor:drawCorridor, brand:drawBrand };
    var fn    = fns[proj.previewType] || drawPlatformer;

    function loop() {
      animId = requestAnimationFrame(loop);
      fn(ctx, canvas.width, canvas.height, frame++);
    }
    loop();
  }

  function stopAnim() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    var canvas = document.getElementById('prev-canvas');
    if (canvas && canvas._rz) {
      window.removeEventListener('resize', canvas._rz);
      canvas._rz = null;
    }
  }

  // ── CANVAS ANIMATIONS ─────────────────────────────────────
  function drawPlatformer(ctx, W, H, f) {
    var sw = Math.floor(W / 3), sh = Math.floor(H / 3);
    var o  = mkOff(sw, sh); var g = o.ctx;

    g.fillStyle = '#000'; g.fillRect(0, 0, sw, sh);
    g.fillStyle = '#0a1f0d'; g.fillRect(0, sh - 10, sw, 10);
    g.fillStyle = '#39ff5a20';
    for (var x = 0; x < sw; x += 3) g.fillRect(x, sh - 10, 1, 10);

    var sc = (f * 0.4) % sw;
    [{x:6,y:sh-22,w:16},{x:26,y:sh-30,w:12},{x:48,y:sh-20,w:18},{x:70,y:sh-36,w:10}].forEach(function(p) {
      var px = ((p.x - sc) % sw + sw) % sw;
      g.fillStyle = '#39ff5a'; g.fillRect(px, p.y, p.w, 3);
    });

    var cx = ~~(sw * 0.33);
    var cy = sh - 22 + Math.round(Math.sin(f * 0.16) * 4);
    [[0,1,1,0],[1,1,1,1],[0,1,1,0],[1,0,0,1],[1,0,0,1]].forEach(function(row, r) {
      row.forEach(function(px, c) {
        if (px) { g.fillStyle = '#fff'; g.fillRect(cx+c, cy+r, 1, 1); }
      });
    });

    for (var i = 0; i < 5; i++) {
      var bx = ((f * 0.6 + i * 18) % sw);
      var by = ((Math.sin(f * 0.09 + i) + 1) / 2) * (sh - 14);
      g.fillStyle = '#39ff5a'; g.fillRect(~~bx, ~~by, 1, 1);
    }
    if (f % 9 < 2) for (var n = 0; n < 6; n++) {
      g.fillStyle = '#39ff5a'; g.fillRect(~~(Math.random() * sw), ~~(Math.random() * sh), 2, 1);
    }

    blit(ctx, o.canvas, W, H);
    ctx.fillStyle = '#39ff5a'; ctx.font = '9px "Share Tech Mono",monospace';
    ctx.fillText('VOID_RUNNER', 8, 16);
    ctx.fillText('SCORE: ' + pad6(f * 31), 8, 28);
  }

  function drawHorror(ctx, W, H, f) {
    var sw = Math.floor(W / 3), sh = Math.floor(H / 3);
    var o  = mkOff(sw, sh); var g = o.ctx;

    g.fillStyle = '#010805'; g.fillRect(0, 0, sw, sh);
    for (var i = 0; i < 7; i++) {
      var tx = (i * 15 + 3) % sw, th = 18 + (i * 8) % 12;
      g.fillStyle = '#081208'; g.fillRect(tx, sh - th, 4, th);
      g.fillStyle = '#0c1c0e'; g.fillRect(tx - 3, sh - th - 5, 10, 7);
    }
    var cx = sw / 2 + Math.sin(f * 0.04) * 5, cy = sh - 24;
    var gl = f % 14 < 3 ? ~~(Math.random() * 4) - 2 : 0;
    g.fillStyle = '#141414';
    g.fillRect(cx - 4 + gl, cy, 8, 11);
    g.fillRect(cx - 5 + gl, cy - 9, 10, 9);
    g.fillRect(cx - 11 + gl, cy + 4, 7, 2);
    g.fillRect(cx + 4  + gl, cy + 4, 7, 2);
    if (f % 38 < 28) {
      g.fillStyle = '#cc0000';
      g.fillRect(cx - 2 + gl, cy - 5, 2, 2);
      g.fillRect(cx + 1 + gl, cy - 5, 2, 2);
    }
    if (f % 5 < 2) for (var n = 0; n < 16; n++) {
      g.fillStyle = 'rgba(57,255,90,' + (Math.random() * 0.35) + ')';
      g.fillRect(~~(Math.random() * sw), ~~(Math.random() * sh), ~~(Math.random()*3)+1, 1);
    }
    g.strokeStyle = '#39ff5a'; g.lineWidth = 1;
    var m = 4;
    g.beginPath();
    g.moveTo(m,m+5);g.lineTo(m,m);g.lineTo(m+5,m);
    g.moveTo(sw-m-5,m);g.lineTo(sw-m,m);g.lineTo(sw-m,m+5);
    g.moveTo(m,sh-m-5);g.lineTo(m,sh-m);g.lineTo(m+5,sh-m);
    g.moveTo(sw-m-5,sh-m);g.lineTo(sw-m,sh-m);g.lineTo(sw-m,sh-m-5);
    g.stroke();
    blit(ctx, o.canvas, W, H);
    ctx.fillStyle = '#39ff5a'; ctx.font = '9px "Share Tech Mono",monospace';
    ctx.fillText('STATIC_FAUNA \u2014 REC', 8, 16);
    ctx.fillStyle = '#cc000099'; ctx.fillRect(W - 22, 6, 10, 10);
  }

  function drawCorridor(ctx, W, H, f) {
    var sw = Math.floor(W / 3), sh = Math.floor(H / 3);
    var o  = mkOff(sw, sh); var g = o.ctx;

    g.fillStyle = '#020a03'; g.fillRect(0, 0, sw, sh);
    var vx = sw/2, vy = sh/2;
    var spd = ((f * 0.25) % 20) / 20;
    for (var d = 7; d > 0; d--) {
      var t = d / 7;
      var br = ~~(t * 28);
      var sx0 = vx - sw * t * 0.46 - spd * sw * t * 0.1;
      var sy0 = vy - sh * t * 0.46;
      g.strokeStyle = 'rgb(0,' + br + ',0)'; g.lineWidth = 1;
      g.strokeRect(sx0, sy0, (vx - sx0) * 2, (vy - sy0) * 2);
    }
    g.fillStyle = '#39ff5a15'; g.fillRect(vx - 1, 0, 2, sh);
    blit(ctx, o.canvas, W, H);
    ctx.fillStyle = '#39ff5a'; ctx.font = '9px "Share Tech Mono",monospace';
    ctx.fillText('CORRIDOR_NULL', 8, 16);
    ctx.fillText('LOOP ' + (~~(f / 120) + 1), 8, 28);
  }

  function drawBrand(ctx, W, H, f) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W/2, H/2); ctx.rotate(f * 0.004);
    var sz = Math.min(W, H) * 0.26;
    ctx.strokeStyle = '#39ff5a'; ctx.lineWidth = 1;
    ctx.strokeRect(-sz/2, -sz/2, sz, sz);
    ctx.save(); ctx.rotate(Math.PI/4 + f * 0.002);
    var is = sz * 0.54; ctx.strokeRect(-is/2, -is/2, is, is);
    ctx.restore();
    ctx.fillStyle = '#39ff5a'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    var fs = Math.max(8, ~~(W * 0.038));
    ctx.fillStyle = '#39ff5a'; ctx.textAlign = 'center';
    ctx.font = fs + 'px "Press Start 2P",monospace';
    ctx.fillText('BRAND', W/2, H*0.72);
    ctx.fillStyle = '#39ff5a44'; ctx.fillText('NULL', W/2, H*0.82);
    var a = 0.25 + 0.25 * Math.sin(f * 0.035);
    ctx.fillStyle = 'rgba(57,255,90,' + a + ')';
    ctx.font = '10px "Share Tech Mono",monospace';
    ctx.fillText('Experience the Absence.', W/2, H*0.91);
    ctx.textAlign = 'left';
  }

  // ── INFO PANEL ────────────────────────────────────────────
  function buildInfo(key) {
    var proj = getProj(key);
    if (!proj) return;
    var tags  = proj.tags.map(function(t){ return '<span class="itag">' + t + '</span>'; }).join('');
    var paras = proj.fullDesc.map(function(p){ return '<p>' + p + '</p>'; }).join('');
    document.getElementById('proj-info').innerHTML =
      '<h1>' + proj.title + '</h1>' +
      '<div class="info-sub">' + proj.type + ' \u00b7 ' + proj.year + '</div>' +
      paras +
      '<div class="info-tags">' + tags + '</div>' +
      '<div class="info-meta">Platform: ' + proj.platform + '<br>Duration: ' + proj.duration + '</div>' +
      '<a href="' + proj.playUrl + '" target="_blank" class="info-link">\u25ba VIEW PROJECT</a>' +
      '<div class="info-hint blink">[ CLICK ICON AGAIN FOR PREVIEW ]</div>';
  }

  // ── HELPERS ───────────────────────────────────────────────
  function getProj(k) { return SITE_DATA.projects.find(function(p){return p.key===k;}); }
  function clearVoidSel() { document.querySelectorAll('.void-icon').forEach(function(e){e.classList.remove('selected');}); }
  function mkOff(w, h) { var c=document.createElement('canvas'); c.width=w; c.height=h; return {canvas:c,ctx:c.getContext('2d')}; }
  function blit(ctx, src, W, H) { ctx.imageSmoothingEnabled=false; ctx.drawImage(src,0,0,W,H); }
  function pad6(n) { return String(~~n).padStart(6,'0'); }

  return { init:init, open:open, close:close, toggle:toggle, selectProject:selectProject };

}());