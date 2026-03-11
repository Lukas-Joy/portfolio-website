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
    info.innerHTML = '<div id="proj-info-content"></div><div id="proj-info-scrollbar"></div>';

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
      img.src   = 'gif/' + key + '.webp';
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated;display:block;';
      wrap.appendChild(img);
    };
    testImg.onerror = function () {
      startCanvasPreview(key, proj, wrap);
    };
    testImg.src = 'gif/' + key + '.webp';
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


  // ── INFO PANEL ────────────────────────────────────────────
  function buildInfo(key) {
    var proj = getProj(key);
    if (!proj) return;
    var tags  = proj.tags.map(function(t){ return '<span class="itag">' + t + '</span>'; }).join('');
    var paras = proj.fullDesc.map(function(p){ return '<p>' + p + '</p>'; }).join('');
    document.getElementById('proj-info-content').innerHTML =
      '<h1>' + proj.title + '</h1>' +
      '<div class="info-sub">' + proj.type + ' \u00b7 ' + proj.year + '</div>' +
      paras +
      '<div class="info-tags">' + tags + '</div>' +
      '<div class="info-meta">Platform: ' + proj.platform + '<br>Duration: ' + proj.duration + '</div>' +
      '<a href="' + proj.playUrl + '" target="_blank" class="info-link">\u25ba VIEW PROJECT</a>' +
      '<div class="info-hint blink">[ CLICK ICON AGAIN FOR PREVIEW ]</div>';
    // Init scrollbar after content is ready
    setTimeout(function () { initProjInfoScrollbar(); }, 50);
  }

  // ── HELPERS ───────────────────────────────────────────────
  var DOT_SIZE = 6;
  var DOT_GAP = 3;
  var SCROLLBAR_PADDING = 8;

  function initProjInfoScrollbar() {
    var content = document.getElementById('proj-info-content');
    var sb      = document.getElementById('proj-info-scrollbar');
    if (!content || !sb) return;

    sb.innerHTML = '';

    var sbHeight = sb.getBoundingClientRect().height;
    var availableHeight = sbHeight - SCROLLBAR_PADDING;
    var dotCount = Math.max(1, Math.ceil((availableHeight + DOT_GAP) / (DOT_SIZE + DOT_GAP)));

    var dots = [];
    for (var i = 0; i < dotCount; i++) {
      var d = document.createElement('div');
      d.className = 'scrollbar-dot';
      sb.appendChild(d);
      dots.push(d);
    }

    function updateDots() {
      var scrollRatio   = content.scrollTop / (content.scrollHeight - content.clientHeight || 1);
      var thumbSize     = Math.max(1, Math.round(dotCount * (content.clientHeight / (content.scrollHeight || 1))));
      var thumbStart    = Math.round(scrollRatio * (dotCount - thumbSize));

      dots.forEach(function (dot, idx) {
        if (idx >= thumbStart && idx < thumbStart + thumbSize) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    var draggingSB = false;
    sb.addEventListener('mousedown', function (e) {
      draggingSB = true;
      scrollFromMouse(e);
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!draggingSB) return;
      scrollFromMouse(e);
    });
    document.addEventListener('mouseup', function () { draggingSB = false; });

    function scrollFromMouse(e) {
      var rect  = sb.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      content.scrollTop = ratio * (content.scrollHeight - content.clientHeight);
    }

    content.addEventListener('scroll', updateDots);
    updateDots();
    setTimeout(updateDots, 100);
  }

  // ── HELPERS ───────────────────────────────────────────────
  function getProj(k) { return SITE_DATA.projects.find(function(p){return p.key===k;}); }
  function clearVoidSel() { document.querySelectorAll('.void-icon').forEach(function(e){e.classList.remove('selected');}); }
  function mkOff(w, h) { var c=document.createElement('canvas'); c.width=w; c.height=h; return {canvas:c,ctx:c.getContext('2d')}; }
  function blit(ctx, src, W, H) { ctx.imageSmoothingEnabled=false; ctx.drawImage(src,0,0,W,H); }
  function pad6(n) { return String(~~n).padStart(6,'0'); }

  return { init:init, open:open, close:close, toggle:toggle, selectProject:selectProject };

}());