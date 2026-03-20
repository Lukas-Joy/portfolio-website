/**
 * windows.js — All popup windows (about, contact, cv, project)
 * Draggable, maximisable, focusable. CRT scanline overlay via CSS.
 * Project window has preview→info state machine built in.
 */

var Windows = (function () {

  var zTop = 600;

  // ── PROJECT STATE ─────────────────────────────────────────
  var projOpen       = false;
  var projSelectedKey = null;
  var projState      = 'empty';   // 'empty' | 'preview' | 'info'
  var projAnimId     = null;
  var startupHelpShown = false;

  var DEFS = {
    help:    { title:'HELP',                 build:buildHelp    },
    about:   { title:'\uD83D\uDCC4 about.html',  build:buildAbout   },
    contact: { title:'\uD83D\uDCEC contact.txt', build:buildContact },
    cv:      { title:'\uD83D\uDCCB CV.pdf',      build:buildCV      },
  };

  function isActionKey(e) {
    return e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar';
  }

  function bindKeyboardActivate(el, onActivate) {
    if (!el) return;
    el.addEventListener('keydown', function (e) {
      if (!isActionKey(e)) return;
      e.preventDefault();
      onActivate(e);
    });
  }

  function isVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function init() {
    // Build static windows
    Object.keys(DEFS).forEach(function (key) {
      var def = DEFS[key];
      var build = def.build();
      var win = makeWin(key, build.title, build.html);
      document.getElementById('windows-layer').appendChild(win);
    });

    // Build project window
    var projWin = makeWin('project', 'NULL', '');
    document.getElementById('windows-layer').appendChild(projWin);
    buildProjectBody();

    initDrag();
    initKeyboardNavigation();
  }

  // ── WINDOW FACTORY ────────────────────────────────────────
  function makeWin(key, contentTitle, bodyHTML) {
    var win = document.createElement('div');
    win.className = 'popup-win';
    win.id        = 'win-' + key;
    win.setAttribute('tabindex', '-1');
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'false');
    win.setAttribute('aria-label', contentTitle);
    win.innerHTML =
      '<div class="win-bar">' +
        '<span class="win-title">' + contentTitle + '</span>' +
        '<div class="win-btn win-btn-max" title="Maximise">&#x25A1;</div>' +
        '<div class="win-btn win-btn-close" title="Close">&#x2715;</div>' +
      '</div>' +
      '<div class="win-body-wrap">' +
        '<div class="win-body" id="winbody-' + key + '">' + bodyHTML + '</div>' +
        '<div class="win-scrollbar" id="winscroll-' + key + '"></div>' +
      '</div>';
    var closeBtn = win.querySelector('.win-btn-close');
    var maxBtn = win.querySelector('.win-btn-max');

    closeBtn.setAttribute('tabindex', '0');
    closeBtn.setAttribute('role', 'button');
    closeBtn.setAttribute('aria-label', 'Close window');

    maxBtn.setAttribute('tabindex', '0');
    maxBtn.setAttribute('role', 'button');
    maxBtn.setAttribute('aria-label', 'Maximize or restore window');

    win.addEventListener('mousedown', function(){ focus(key); });
    closeBtn.addEventListener('click', function(){ close(key); });
    maxBtn.addEventListener('click', function(){ toggleMax(key); });
    bindKeyboardActivate(closeBtn, function () { close(key); });
    bindKeyboardActivate(maxBtn, function () { toggleMax(key); });
    return win;
  }

  // ── BUILD PROJECT BODY ────────────────────────────────────
  function buildProjectBody() {
    var body = document.getElementById('winbody-project');
    body.innerHTML = '';

    var empty = document.createElement('div');
    empty.id  = 'proj-empty';
    empty.innerHTML =
      '<div class="pe-title">PROJECT.EXE</div>' +
      '<div class="pe-sub">Select a project from the void.<span class="blink">&#x2588;</span></div>';

    var preview = document.createElement('div');
    preview.id  = 'proj-preview';
    preview.setAttribute('tabindex', '0');
    preview.setAttribute('role', 'button');
    preview.setAttribute('aria-label', 'Open project details');
    preview.innerHTML =
      '<div id="prev-wrap"></div>' +
      '<div id="prev-bar">' +
        '<span id="prev-title">\u2014</span>' +
        '<span class="prev-hint blink">&nbsp;[ CLICK FOR INFO ]</span>' +
      '</div>';

    var info = document.createElement('div');
    info.id  = 'proj-info';
    info.innerHTML = '<div id="proj-info-content"></div><div id="proj-info-scrollbar"></div>';

    body.appendChild(empty);
    body.appendChild(preview);
    body.appendChild(info);

    // Click on preview area to advance to info
    preview.addEventListener('click', function() {
      if (projSelectedKey) {
        setProjState('info', projSelectedKey);
      }
    });
    bindKeyboardActivate(preview, function () {
      if (projSelectedKey) {
        setProjState('info', projSelectedKey);
      }
    });
  }

  // ── OPEN / CLOSE / TOGGLE / FOCUS ─────────────────────────
  function getDesktopRect() {
    var r = (typeof Scene !== 'undefined' && Scene && Scene.screenRect) ? Scene.screenRect : null;
    if (r && r.width > 0 && r.height > 0) return r;
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }

  function open(key) {
    var win = document.getElementById('win-' + key);
    if (!win) return;
    if (!win.classList.contains('open')) {
      var r = getDesktopRect();
      if (key === 'project') {
        // Fill the desktop area (screen overlay minus taskbar)
        win.style.left   = r.left + 'px';
        win.style.top    = r.top + 'px';
        win.style.width  = r.width + 'px';
        win.style.height = r.height + 'px';
      } else {
        var offsets = {about:[28,28], contact:[44,44], cv:[60,60], help:[22,22]};
        var off = offsets[key] || [28,28];

        // Keep popups shorter than desktop to encourage scrolling for long content.
        var desiredWidth = (key === 'help') ? 420 : 400;
        var width = Math.min(desiredWidth, Math.max(280, Math.floor(r.width - 12)));

        var desiredHeight = (key === 'help') ? Math.round(r.height * 0.58) : Math.round(r.height * 0.62);
        var height = Math.min(Math.max(220, desiredHeight), Math.max(220, Math.floor(r.height - 12)));

        var minLeft = r.left + 2;
        var minTop = r.top + 2;
        var maxLeft = (r.left + r.width) - width - 2;
        var maxTop = (r.top + r.height) - height - 2;

        var left = r.left + off[0];
        var top = r.top + off[1];
        left = Math.max(minLeft, Math.min(left, maxLeft));
        top = Math.max(minTop, Math.min(top, maxTop));

        win.style.left  = left + 'px';
        win.style.top   = top + 'px';
        win.style.width = width + 'px';
        win.style.height = height + 'px';
      }
    }
    win.classList.add('open');
    focus(key);
    focusFirstInWindow(key);
    Desktop.setRunning('ic-' + (key === 'project' ? 'projects' : key), true);
    setTimeout(function () { initScrollbar(key); }, 50);

    if (key === 'project') {
      projOpen = true;
      Desktop.showVoidIcons(true);
      Scene.showProjectMeshes(true);
      setProjState('empty');
    }
  }

  function close(key) {
    var win = document.getElementById('win-' + key);
    if (!win) return;
    win.classList.remove('open', 'focused', 'maximised');
    Desktop.setRunning('ic-' + (key === 'project' ? 'projects' : key), false);

    if (key === 'project') {
      projOpen = false;
      projSelectedKey = null;
      Desktop.showVoidIcons(false);
      Scene.showProjectMeshes(false);
      stopProjAnim();
      clearVoidSel();
      var titleEl = document.querySelector('#win-project .win-title');
      if (titleEl) titleEl.textContent = 'NULL';
    }
  }

  function toggle(key) {
    var win = document.getElementById('win-' + key);
    if (!win) return;
    if (win.classList.contains('open')) close(key); else open(key);
  }

  function focus(key) {
    document.querySelectorAll('.popup-win').forEach(function(w){ w.classList.remove('focused'); });
    var win = document.getElementById('win-' + key);
    if (!win) return;
    win.classList.add('focused');
    win.style.zIndex = ++zTop;
  }

  function getFocusedOpenWindow() {
    return document.querySelector('.popup-win.open.focused');
  }

  function getWindowTabStops(win) {
    if (!win || !win.classList.contains('open')) return [];

    var selectors = [
      '.win-btn',
      '.win-body a',
      '.win-body button',
      '.win-body input',
      '.win-body select',
      '.win-body textarea',
      '.win-body [tabindex]:not([tabindex="-1"])',
      '#proj-preview'
    ].join(',');

    var nodes = Array.prototype.slice.call(win.querySelectorAll(selectors)).filter(isVisible);

    if (win.id === 'win-project') {
      var projectSelectors = document.querySelectorAll('.void-icon');
      Array.prototype.forEach.call(projectSelectors, function (el) {
        if (isVisible(el)) nodes.push(el);
      });
    }

    return nodes.filter(function (el) { return el.tabIndex >= 0; });
  }

  function focusFirstInWindow(key) {
    var win = document.getElementById('win-' + key);
    if (!win || !win.classList.contains('open')) return;
    var stops = getWindowTabStops(win);
    if (stops.length) stops[0].focus();
    else win.focus();
  }

  function initKeyboardNavigation() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;

      var focusedWin = getFocusedOpenWindow();
      if (!focusedWin) return;

      var stops = getWindowTabStops(focusedWin);
      if (!stops.length) {
        e.preventDefault();
        focusedWin.focus();
        return;
      }

      var first = stops[0];
      var last = stops[stops.length - 1];
      var active = document.activeElement;
      var idx = stops.indexOf(active);

      if (idx === -1) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    });
  }

  // ── MAXIMISE ──────────────────────────────────────────────
  function toggleMax(key) {
    var win = document.getElementById('win-' + key);
    if (!win) return;
    var r = getDesktopRect();
    if (win.classList.contains('maximised')) {
      win.classList.remove('maximised');
      // Restore saved position
      if (win._savedRect) {
        win.style.left   = win._savedRect.left;
        win.style.top    = win._savedRect.top;
        win.style.width  = win._savedRect.width;
        win.style.height = win._savedRect.height;
      }
    } else {
      // Save current position
      win._savedRect = {
        left:   win.style.left,
        top:    win.style.top,
        width:  win.style.width,
        height: win.style.height,
      };
      win.classList.add('maximised');
      // Fill only desktop area (never overlap taskbar)
      win.style.left   = r.left + 'px';
      win.style.top    = r.top + 'px';
      win.style.width  = r.width + 'px';
      win.style.height = r.height + 'px';
    }
    setTimeout(function(){ initScrollbar(key); }, 60);
  }

  // ── PROJECT: SELECT ───────────────────────────────────────
  function selectProject(key) {
    openProjectInfo(key);
  }

  function previewProject(key) {
    if (!projOpen) open('project');

    projSelectedKey = key;
    clearVoidSel();
    var el = document.getElementById('void-icon-' + key);
    if (el) el.classList.add('selected');
    setProjState('preview', key);
  }

  function openProjectInfo(key) {
    if (!projOpen) open('project');

    projSelectedKey = key;
    clearVoidSel();
    var el = document.getElementById('void-icon-' + key);
    if (el) el.classList.add('selected');
    setProjState('info', key);
  }

  function refreshProjectHoverPreview(key) {
    if (!projOpen || !key || key !== projSelectedKey) return;
    if (projState === 'preview') {
      setProjState('preview', key);
    }
  }

  // ── PROJECT: STATE MACHINE ────────────────────────────────
  function setProjState(newState, key) {
    projState = newState;
    if (key) projSelectedKey = key;
    stopProjAnim();

    // Update window title
    var titleEl = document.querySelector('#win-project .win-title');
    if (titleEl) {
      if (projSelectedKey) {
        var proj = getProj(projSelectedKey);
        titleEl.textContent = proj ? proj.title : projSelectedKey;
      } else {
        titleEl.textContent = 'NULL';
      }
    }

    var eEmpty   = document.getElementById('proj-empty');
    var ePreview = document.getElementById('proj-preview');
    var eInfo    = document.getElementById('proj-info');
    if (!eEmpty) return;

    eEmpty.style.display   = 'none';
    ePreview.style.display = 'none';
    eInfo.style.display    = 'none';

    if (projState === 'empty') {
      eEmpty.style.display = 'flex';
    } else if (projState === 'preview') {
      ePreview.style.display = 'flex';
      startPreview(projSelectedKey);
    } else if (projState === 'info') {
      eInfo.style.display = 'flex';
      buildInfo(projSelectedKey);
    }
  }

  // ── PROJECT: PREVIEW ──────────────────────────────────────
  function startPreview(key) {
    var proj = getProj(key);
    if (!proj) return;
    document.getElementById('prev-title').textContent = proj.title + ' \u00b7 ' + proj.type;
    var a11y = (SITE_DATA && SITE_DATA.accessibility) ? SITE_DATA.accessibility : {};
    var previewAltMap = a11y.projectPreviewAlt || {};
    var previewAltText = previewAltMap[key] || (proj.title + ' animated project preview');

    var wrap = document.getElementById('prev-wrap');
    wrap.innerHTML = '';

    var testImg = new Image();
    testImg.onload = function () {
      wrap.innerHTML = '';
      var img = document.createElement('img');
      img.src = 'gif/' + key + '.webp';
      img.alt = previewAltText;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;image-rendering:pixelated;display:block;';
      wrap.appendChild(img);
    };
    testImg.onerror = function () {
      startCanvasPreview(key, proj, wrap);
    };
    testImg.src = 'gif/' + key + '.webp';
  }

  function startCanvasPreview(key, proj, wrap) {
    var a11y = (SITE_DATA && SITE_DATA.accessibility) ? SITE_DATA.accessibility : {};
    var previewAltMap = a11y.projectPreviewAlt || {};
    var previewAltText = previewAltMap[key] || (proj.title + ' animated project preview');
    var canvas = document.createElement('canvas');
    canvas.id  = 'prev-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', previewAltText);
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
      projAnimId = requestAnimationFrame(loop);
      fn(ctx, canvas.width, canvas.height, frame++);
    }
    loop();
  }

  function stopProjAnim() {
    if (projAnimId) { cancelAnimationFrame(projAnimId); projAnimId = null; }
    var canvas = document.getElementById('prev-canvas');
    if (canvas && canvas._rz) {
      window.removeEventListener('resize', canvas._rz);
      canvas._rz = null;
    }
  }

  // ── PROJECT: INFO PANEL ───────────────────────────────────
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
      '<div class="info-hint blink">[ HOVER ICON TO PREVIEW AGAIN ]</div>';
    setTimeout(function () { initProjInfoScrollbar(); }, 50);
  }

  // ── PROJECT: INFO SCROLLBAR ───────────────────────────────
  var DOT_SIZE = 6;
  var DOT_GAP = 2;

  function getScrollbarWidth() {
    return DOT_SIZE + (DOT_GAP * 2);
  }

  function getScrollbarLayout(trackHeight) {
    var pxHeight = Math.max(0, Math.round(trackHeight));
    var dotCount = Math.max(1, Math.floor((pxHeight - DOT_GAP) / (DOT_SIZE + DOT_GAP)));
    var gaps = dotCount + 1;
    var gapPixels = Math.max(0, pxHeight - (dotCount * DOT_SIZE));
    var baseGap = Math.floor(gapPixels / gaps);
    var extra = gapPixels - (baseGap * gaps);
    return { dotCount: dotCount, baseGap: baseGap, extra: extra };
  }

  function gapAt(layout, idx) {
    return layout.baseGap + (idx < layout.extra ? 1 : 0);
  }

  function buildDotsForScrollbar(sb, dotCount, layout) {
    sb.style.width = getScrollbarWidth() + 'px';
    sb.style.paddingTop = gapAt(layout, 0) + 'px';
    sb.style.paddingBottom = gapAt(layout, dotCount) + 'px';
    sb.style.rowGap = '0px';

    var dots = [];
    for (var i = 0; i < dotCount; i++) {
      var d = document.createElement('div');
      d.className = 'scrollbar-dot';
      d.style.width = DOT_SIZE + 'px';
      d.style.height = DOT_SIZE + 'px';
      if (i > 0) d.style.marginTop = gapAt(layout, i) + 'px';
      sb.appendChild(d);
      dots.push(d);
    }
    return dots;
  }

  function initProjInfoScrollbar() {
    var content = document.getElementById('proj-info-content');
    var sb      = document.getElementById('proj-info-scrollbar');
    if (!content || !sb) return;

    sb.innerHTML = '';

    var sbHeight = sb.getBoundingClientRect().height;
    var layout = getScrollbarLayout(sbHeight);
    var dotCount = layout.dotCount;

    var dots = buildDotsForScrollbar(sb, dotCount, layout);

    function updateDots() {
      var scrollRatio = content.scrollTop / (content.scrollHeight - content.clientHeight || 1);
      var thumbSize   = Math.max(1, Math.round(dotCount * (content.clientHeight / (content.scrollHeight || 1))));
      var thumbStart  = Math.round(scrollRatio * (dotCount - thumbSize));
      dots.forEach(function (dot, idx) {
        if (idx >= thumbStart && idx < thumbStart + thumbSize) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
    var draggingSB = false;
    sb.addEventListener('mousedown', function (e) { draggingSB = true; scrollFromMouse(e); e.preventDefault(); });
    document.addEventListener('mousemove', function (e) { if (draggingSB) scrollFromMouse(e); });
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

  // ── DRAG ──────────────────────────────────────────────────
  var _drag = null, _dox = 0, _doy = 0;
  function initDrag() {
    document.getElementById('windows-layer').addEventListener('mousedown', function(e) {
      var bar = e.target.closest('.win-bar');
      if (!bar) return;
      var win = bar.closest('.popup-win');
      if (!win) return;
      if (win.classList.contains('maximised')) return; // don't drag when maximised
      focus(win.id.replace('win-',''));
      _drag = win;
      _dox  = e.clientX - win.getBoundingClientRect().left;
      _doy  = e.clientY - win.getBoundingClientRect().top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!_drag) return;
      var r = getDesktopRect();
      var rect = _drag.getBoundingClientRect();
      var xMin = r.left;
      var yMin = r.top;
      var xMax = (r.left + r.width) - rect.width;
      var yMax = (r.top + r.height) - rect.height;
      if (xMax < xMin) xMax = xMin;
      if (yMax < yMin) yMax = yMin;

      var x = Math.max(xMin, Math.min(e.clientX - _dox, xMax));
      var y = Math.max(yMin, Math.min(e.clientY - _doy, yMax));
      _drag.style.left = x + 'px';
      _drag.style.top  = y + 'px';
    });
    document.addEventListener('mouseup', function(){ _drag = null; });
  }

  // ── DOT SCROLLBAR (for static windows) ────────────────────
  function initScrollbar(key) {
    var body = document.getElementById('winbody-' + key);
    var sb   = document.getElementById('winscroll-' + key);
    if (!body || !sb) return;

    sb.innerHTML = '';

    var sbHeight = sb.getBoundingClientRect().height;
    var layout = getScrollbarLayout(sbHeight);
    var dotCount = layout.dotCount;
    var dots = buildDotsForScrollbar(sb, dotCount, layout);

    function updateDots() {
      var scrollRatio = body.scrollTop / (body.scrollHeight - body.clientHeight || 1);
      var thumbSize   = Math.max(1, Math.round(dotCount * (body.clientHeight / (body.scrollHeight || 1))));
      var thumbStart  = Math.round(scrollRatio * (dotCount - thumbSize));
      dots.forEach(function (dot, idx) {
        if (idx >= thumbStart && idx < thumbStart + thumbSize) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    var draggingSB = false;
    sb.addEventListener('mousedown', function (e) { draggingSB = true; scrollFromMouse(e); e.preventDefault(); });
    document.addEventListener('mousemove', function (e) { if (draggingSB) scrollFromMouse(e); });
    document.addEventListener('mouseup', function () { draggingSB = false; });

    function scrollFromMouse(e) {
      var rect  = sb.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      body.scrollTop = ratio * (body.scrollHeight - body.clientHeight);
    }

    body.addEventListener('scroll', updateDots);
    updateDots();
    setTimeout(updateDots, 100);
  }

  // ── BODY BUILDERS ─────────────────────────────────────────
  function buildAbout() {
    var d    = SITE_DATA.about;
    var pars = d.paragraphs.map(function(p){ return '<p>' + p + '</p>'; }).join('');
    var tags = d.skills.map(function(s){ return '<span class="wtag">' + s + '</span>'; }).join('');
    return {
      title: 'WHO AM I',
      html:
        '<div class="win-section-box"><h2>ABOUT</h2>' + pars + '</div>' +
        '<div class="win-section-box"><h2>SKILLS</h2>' + tags + '</div>'
    };
  }

  function buildContact() {
    var d    = SITE_DATA.contact;
    var rows = d.links.map(function(l){
      return '<div class="link-row">' +
        '<span class="lr-icon">' + l.icon + '</span>' +
        '<span class="lr-lbl">' + l.label + '</span>' +
        '<a href="' + l.url + '" target="_blank">' + l.display + '</a>' +
      '</div>';
    }).join('');
    return {
      title: 'FIND ME',
      html: '<p>&#x2709; <a href="mailto:' + d.email + '">' + d.email + '</a></p>' +
        rows + '<p class="wnote">' + d.note + '</p>'
    };
  }

  function buildCV() {
    var d   = SITE_DATA.cv;
    var exp = d.experience.map(function(e){
      return '<div class="cv-e"><div class="cv-role">' + e.role + '</div>' +
        '<div class="cv-period">' + e.company + ' &middot; ' + e.period + '</div>' +
        '<div class="cv-desc">' + e.description + '</div></div>';
    }).join('');
    var edu = d.education.map(function(e){
      return '<div class="cv-e"><div class="cv-role">' + e.degree + '</div>' +
        '<div class="cv-period">' + e.institution + ' &middot; ' + e.year + '</div></div>';
    }).join('');
    var awards = d.awards.map(function(a){ return '<p class="cv-award">&#x2756; ' + a + '</p>'; }).join('');
    return {
      title: 'CV',
      html: '<div class="cv-section"><h2>EXPERIENCE</h2>' + exp + '</div>' +
        '<div class="cv-section"><h2>EDUCATION</h2>' + edu + '</div>' +
        '<div class="cv-section"><h2>AWARDS</h2>' + awards + '</div>' +
        '<a href="' + d.downloadUrl + '" class="dl-btn" target="_blank">&#x2193; DOWNLOAD CV.pdf</a>'
    };
  }

  function buildHelp() {
    var d = SITE_DATA.helpHints || {};
    var title = d.title || 'HELP / HOW TO USE';
    var intro = d.intro || 'Use this desktop like a retro operating system.';
    var controlsTitle = d.controlsTitle || 'BASIC CONTROLS';
    var featuresTitle = d.featuresTitle || 'FEATURES TO TRY';
    var controls = Array.isArray(d.controls) && d.controls.length
      ? d.controls
      : [
          'Double-click desktop icons to open content.',
          'Drag windows by their title bars.',
          'Use START and taskbar shortcuts for quick navigation.',
        ];
    var features = Array.isArray(d.features) && d.features.length
      ? d.features
      : [
          'Open project.exe to browse project previews and info.',
          'Click floating icons around the monitor to select projects.',
        ];
    var footer = (typeof d.footer === 'string') ? d.footer.trim() : '';

    var controlsHtml = controls.map(function (item) {
      return '<p>- ' + item + '</p>';
    }).join('');
    var featuresHtml = features.map(function (item) {
      return '<p>- ' + item + '</p>';
    }).join('');

    return {
      title: title,
      html:
        '<div class="win-section-box"><h3>OVERVIEW</h3><p>' + intro + '</p></div>' +
        '<div class="win-section-box"><h3>' + controlsTitle + '</h3>' + controlsHtml + '</div>' +
        '<div class="win-section-box"><h3>' + featuresTitle + '</h3>' + featuresHtml + (footer ? ('<p class="wnote">' + footer + '</p>') : '') + '</div>'
    };
  }

  function openStartupHelp() {
    var cfg = SITE_DATA.helpHints || {};
    if (cfg.enabled === false) return;
    if (startupHelpShown) return;
    startupHelpShown = true;
    open('help');
  }

  // ── HELPERS ───────────────────────────────────────────────
  function getProj(k) { return SITE_DATA.projects.find(function(p){ return p.key === k; }); }
  function clearVoidSel() { document.querySelectorAll('.void-icon').forEach(function(e){ e.classList.remove('selected'); }); }

  return {
    init: init,
    open: open,
    close: close,
    toggle: toggle,
    selectProject: selectProject,
    previewProject: previewProject,
    openProjectInfo: openProjectInfo,
    refreshProjectHoverPreview: refreshProjectHoverPreview,
    openStartupHelp: openStartupHelp,
    hasOpenWindow: function () { return !!document.querySelector('.popup-win.open'); },
  };

}());