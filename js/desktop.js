/**
 * desktop.js — Desktop icons (draggable, confined to desktop area) + taskbar
 *
 * Desktop icons try to load from img/icon-{id}.svg
 * Falls back to img/No_Texture.webp, then plain emoji if that also fails
 * Clock is always GMT+13
 */

var Desktop = (function () {

  var ICONS = [
    { id:'ic-projects', file:'project.exe', emoji:'🗂️', imgKey:'icon-projects', x:250, y:96,  action:'app:project' },
    { id:'ic-about',    file:'about.html', emoji:'ℹ️', imgKey:'icon-about',    x:97,  y:4,   action:'win:about'   },
    { id:'ic-contact',  file:'contact.txt', emoji:'✉️', imgKey:'icon-contact',  x:366, y:226, action:'win:contact' },
    { id:'ic-cv',       file:'CV.pdf', emoji:'📄', imgKey:'icon-cv',       x:34,  y:211, action:'win:cv'      },
  ];

  var dragging = null, dragOffX = 0, dragOffY = 0;
  var iconStartX = 0, iconStartY = 0, didMove = false;

  // ── ICON DEBUG ───────────────────────────────────────────
  var iconDebugVisible = false;

  // ── SEEDED RANDOM ────────────────────────────────────────
  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function isDebugMenusEnabled() {
    return !SITE_DATA || !SITE_DATA.debug || SITE_DATA.debug.menusEnabled !== false;
  }

  function init() {
    buildIcons();
    buildTaskbar();
    buildVoidIcons();
    initKeyboardNavigation();
    tick();
    setInterval(tick, 15000);
    if (isDebugMenusEnabled()) buildIconDebugPanel();
  }

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

  // ── DESKTOP ICONS ─────────────────────────────────────────
  function buildIcons() {
    var desktop = document.getElementById('desktop');
    var deskRect = desktop.getBoundingClientRect();
    var iconW = 58;
    var iconH = 72;
    var a11y = (SITE_DATA && SITE_DATA.accessibility) ? SITE_DATA.accessibility : {};
    var iconAltMap = a11y.desktopIconAlt || {};

    ICONS.forEach(function (cfg, idx) {
      var el = document.createElement('div');
      el.className = 'desk-icon';
      el.id        = cfg.id;
      el.style.left = cfg.x + 'px';
      el.style.top  = cfg.y + 'px';
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', cfg.file + ' desktop shortcut');

      // Try custom image, fall back to No_Texture, then emoji
      var imgEl = new Image();
      imgEl.draggable = false;
      imgEl.className = 'desk-icon-em';
      var iconAltText = iconAltMap[cfg.id] || (cfg.file + ' desktop icon');
      imgEl.alt = iconAltText;

      imgEl.onload = function () {
        imgEl.style.cssText = 'width:36px;height:36px;object-fit:contain;image-rendering:pixelated;display:block;margin:0 auto;filter:drop-shadow(0 0 4px var(--ph))';
      };
      imgEl.onerror = function () {
        // Try fallback texture
        imgEl.onerror = function () {
          // Give up — use emoji span
          var span = document.createElement('span');
          span.className = 'desk-icon-em';
          span.textContent = cfg.emoji;
          span.setAttribute('role', 'img');
          span.setAttribute('aria-label', iconAltText);
          el.replaceChild(span, imgEl);
        };
        imgEl.src = 'img/No_Texture.webp';
      };
      imgEl.src = 'img/' + cfg.imgKey + '.svg';

      var lbl = document.createElement('span');
      lbl.className   = 'desk-icon-lbl';
      lbl.textContent = cfg.file;

      el.appendChild(imgEl);
      el.appendChild(lbl);

      el.addEventListener('mousedown', function (e) {
        e.stopPropagation();
        selectIcon(cfg.id);
        startDrag(e, el);
      });
      el.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        if (!didMove) activate(cfg);
      });
      bindKeyboardActivate(el, function () { activate(cfg); });

      desktop.appendChild(el);
    });

    document.getElementById('desktop').addEventListener('mousedown', function (e) {
      if (e.target.id === 'desktop' || e.target.id === 'desktop-grid') clearSel();
    });
  }

  function selectIcon(id) {
    clearSel();
    var el = document.getElementById(id);
    if (el) el.classList.add('selected');
  }

  function clearSel() {
    document.querySelectorAll('.desk-icon').forEach(function(e){e.classList.remove('selected');});
  }

  function startDrag(e, el) {
    dragging   = el;
    didMove    = false;
    dragOffX   = e.clientX - el.getBoundingClientRect().left;
    dragOffY   = e.clientY - el.getBoundingClientRect().top;
    iconStartX = parseInt(el.style.left) || 0;
    iconStartY = parseInt(el.style.top)  || 0;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, {once:true});
  }

  function onMove(e) {
    if (!dragging) return;
    didMove = true;
    var desktop = document.getElementById('desktop');
    var dRect   = desktop.getBoundingClientRect();
    var iW      = dragging.offsetWidth  || 58;
    var iH      = dragging.offsetHeight || 72;
    var tb = document.getElementById('taskbar');
    var tbH = tb ? tb.offsetHeight : 0;
    var nx = Math.max(0, Math.min(e.clientX - dRect.left - dragOffX, desktop.clientWidth  - iW));
    var ny = Math.max(0, Math.min(e.clientY - dRect.top  - dragOffY, desktop.clientHeight - iH - tbH - 6));
    dragging.style.left = nx + 'px';
    dragging.style.top  = ny + 'px';
    updateIconDebugPanel();
  }

  function onUp() { document.removeEventListener('mousemove', onMove); dragging = null; updateIconDebugPanel(); }

  function activate(cfg) {
    var parts = cfg.action.split(':');
    if (parts[0] === 'app') Windows.open('project'); else Windows.open(parts[1]);
    setRunning(cfg.id, true);
  }

  // ── TASKBAR ───────────────────────────────────────────────
  var startMenuOpen = false;

  function buildTaskbar() {
    var tb = document.getElementById('taskbar');
    tb.innerHTML =
      '<div class="tb-section tb-left">' +
        '<button id="start-btn">&#9654; START</button>' +
      '</div>' +
      '<div class="tb-section tb-mid">' +
        '<div class="tb-icons-box">' +
          '<span class="tb-icon" id="tbi-projects" onclick="Windows.toggle(\'project\')">project.exe</span>' +
          '<span class="tb-icon" id="tbi-about"    onclick="Windows.toggle(\'about\')">about</span>' +
          '<span class="tb-icon" id="tbi-contact"  onclick="Windows.toggle(\'contact\')">contact</span>' +
          '<span class="tb-icon" id="tbi-cv"       onclick="Windows.toggle(\'cv\')">cv</span>' +
        '</div>' +
      '</div>' +
      '<div class="tb-section tb-right">' +
        '<div id="taskbar-clock">00:00</div>' +
      '</div>';

    // Build start menu
    buildStartMenu();

    document.getElementById('start-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleStartMenu();
    });
    bindKeyboardActivate(document.getElementById('start-btn'), function () { toggleStartMenu(); });

    document.querySelectorAll('.tb-icon').forEach(function (el) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      var label = (el.textContent || '').trim();
      el.setAttribute('aria-label', label + ' taskbar shortcut');
      bindKeyboardActivate(el, function () { el.click(); });
    });

    // Close start menu when clicking elsewhere
    document.addEventListener('mousedown', function (e) {
      if (!startMenuOpen) return;
      var menu = document.getElementById('start-menu');
      var btn  = document.getElementById('start-btn');
      if (menu && !menu.contains(e.target) && e.target !== btn) {
        closeStartMenu();
      }
    });
  }

  function buildStartMenu() {
    var menu = document.createElement('div');
    menu.id = 'start-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Start menu');

    // Header
    var header = '<div class="sm-header">' +
      '<span class="sm-header-name">' + (SITE_DATA.identity ? SITE_DATA.identity.systemName : 'SYSTEM') + '</span>' +
    '</div>';

    // Main entries — desktop shortcuts
    var entries =
      '<div class="sm-section">' +
        '<div class="sm-item" data-action="app:project">' +
          '<span class="sm-icon">&#9632;</span>' +
          '<span class="sm-label">project.exe</span>' +
        '</div>' +
        '<div class="sm-item" data-action="win:about">' +
          '<span class="sm-icon">&#9632;</span>' +
          '<span class="sm-label">about.html</span>' +
        '</div>' +
        '<div class="sm-item" data-action="win:contact">' +
          '<span class="sm-icon">&#9632;</span>' +
          '<span class="sm-label">contact.txt</span>' +
        '</div>' +
        '<div class="sm-item" data-action="win:cv">' +
          '<span class="sm-icon">&#9632;</span>' +
          '<span class="sm-label">CV.pdf</span>' +
        '</div>' +
      '</div>';

    // Projects sub-section
    var projItems = '';
    if (SITE_DATA.projects && SITE_DATA.projects.length) {
      SITE_DATA.projects.forEach(function (proj) {
        projItems +=
          '<div class="sm-item sm-proj" data-projkey="' + proj.key + '">' +
            '<span class="sm-icon">' + proj.icon + '</span>' +
            '<span class="sm-label">' + proj.title + '</span>' +
            '<span class="sm-type">' + proj.type + '</span>' +
          '</div>';
      });
    }
    var projSection =
      '<div class="sm-section">' +
        '<div class="sm-section-title">PROJECTS</div>' +
        projItems +
      '</div>';

    // Links sub-section
    var linkItems = '';
    if (SITE_DATA.contact && SITE_DATA.contact.links) {
      SITE_DATA.contact.links.forEach(function (lnk) {
        linkItems +=
          '<a class="sm-item sm-link" href="' + lnk.url + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="sm-icon">' + lnk.icon + '</span>' +
            '<span class="sm-label">' + lnk.label + '</span>' +
            '<span class="sm-type">&#8599;</span>' +
          '</a>';
      });
    }
    var linksSection =
      '<div class="sm-section">' +
        '<div class="sm-section-title">LINKS</div>' +
        linkItems +
      '</div>';

    menu.innerHTML = header + entries + projSection + linksSection;

    // Attach to screen-overlay so it's inside the desktop context
    var desktop = document.getElementById('desktop');
    desktop.appendChild(menu);

    // Wire up click handlers for menu items
    menu.querySelectorAll('.sm-item[data-action]').forEach(function (item) {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'menuitem');
      item.addEventListener('click', function () {
        var action = item.getAttribute('data-action');
        var parts = action.split(':');
        if (parts[0] === 'app') Windows.open('project');
        else Windows.open(parts[1]);
        closeStartMenu(false);
      });
      bindKeyboardActivate(item, function () { item.click(); });
    });

    menu.querySelectorAll('.sm-proj[data-projkey]').forEach(function (item) {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'menuitem');
      item.addEventListener('click', function () {
        Windows.selectProject(item.getAttribute('data-projkey'));
        closeStartMenu(false);
      });
      bindKeyboardActivate(item, function () { item.click(); });
    });

    menu.querySelectorAll('a.sm-item').forEach(function (item) {
      item.setAttribute('role', 'menuitem');
    });
  }

  function toggleStartMenu() {
    startMenuOpen ? closeStartMenu() : openStartMenu();
  }

  function openStartMenu() {
    var menu = document.getElementById('start-menu');
    if (!menu) return;
    menu.classList.add('open');
    startMenuOpen = true;
    var first = menu.querySelector('.sm-item');
    if (first) first.focus();
  }

  function closeStartMenu(restoreFocus) {
    var menu = document.getElementById('start-menu');
    if (!menu) return;
    menu.classList.remove('open');
    startMenuOpen = false;
    if (restoreFocus === false) return;
    var startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.focus();
  }

  // ── VOID ICONS ────────────────────────────────────────────
  function buildVoidIcons() {
    var layer = document.getElementById('void-layer');
    SITE_DATA.projects.forEach(function (proj) {
      var el  = document.createElement('div');
      el.className = 'void-icon';
      el.id        = 'void-icon-' + proj.key;
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Hover to preview ' + proj.title + ', click to open project details');
      var hitCircle = document.createElement('div');
      hitCircle.className = 'void-icon-hit';
      el.appendChild(hitCircle);
      el.addEventListener('mouseenter', function () { Windows.previewProject(proj.key); });
      el.addEventListener('focus', function () { Windows.previewProject(proj.key); });
      el.addEventListener('click', function () { Windows.openProjectInfo(proj.key); });
      bindKeyboardActivate(el, function () { Windows.openProjectInfo(proj.key); });
      layer.appendChild(el);
    });
  }

  function showVoidIcons(on) {
    document.querySelectorAll('.void-icon').forEach(function(e){ e.style.display = on ? 'flex' : 'none'; });
  }

  function getDesktopTabStops() {
    var nodes = [];

    document.querySelectorAll('.desk-icon').forEach(function (el) { nodes.push(el); });

    var startBtn = document.getElementById('start-btn');
    if (startBtn) nodes.push(startBtn);

    document.querySelectorAll('.tb-icon').forEach(function (el) { nodes.push(el); });

    if (startMenuOpen) {
      document.querySelectorAll('#start-menu.open .sm-item').forEach(function (el) { nodes.push(el); });
    }

    return nodes.filter(function (el) {
      return !!el && el.tabIndex >= 0 && el.offsetParent !== null;
    });
  }

  function initKeyboardNavigation() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && startMenuOpen) {
        closeStartMenu();
        return;
      }

      if (e.key !== 'Tab') return;
      if (Windows.hasOpenWindow && Windows.hasOpenWindow()) return;

      var stops = getDesktopTabStops();
      if (!stops.length) return;

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

  // ── CLOCK — always GMT+13 ─────────────────────────────────
  function tick() {
    var now  = new Date();
    var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    var gmt13 = new Date(utcMs + 13 * 3600000);
    var h = String(gmt13.getHours()).padStart(2, '0');
    var m = String(gmt13.getMinutes()).padStart(2, '0');
    var el = document.getElementById('taskbar-clock');
    if (el) el.textContent = h + ':' + m;
  }

  // ── RUNNING STATE ─────────────────────────────────────────
  var TBI_MAP = {
    'ic-projects':'tbi-projects',
    'ic-about':   'tbi-about',
    'ic-contact': 'tbi-contact',
    'ic-cv':      'tbi-cv',
  };

  function setRunning(iconId, on) {
    var id = TBI_MAP[iconId];
    if (!id) return;
    var el = document.getElementById(id);
    if (el) el.classList.toggle('running', on);
  }

  // ── ICON LAYOUT DEBUG PANEL ──────────────────────────────
  function buildIconDebugPanel() {
    var panel = document.createElement('div');
    panel.id = 'icon-debug-panel';
    panel.style.cssText = [
      'position:fixed',
      'bottom:48px',
      'right:12px',
      'z-index:9999',
      'background:rgba(0,0,0,0.92)',
      'border:1px solid #f0c677',
      'font-family:monospace',
      'font-size:11px',
      'color:#f0c677',
      'padding:10px 12px',
      'min-width:260px',
      'display:none',
      'user-select:none',
    ].join(';');

    var title = document.createElement('div');
    title.style.cssText = 'font-size:9px;letter-spacing:2px;margin-bottom:8px;color:#f0c677;opacity:0.6;';
    title.textContent = 'ICON LAYOUT DEBUG  [ I ]';
    panel.appendChild(title);

    var table = document.createElement('div');
    table.id = 'icon-debug-table';
    panel.appendChild(table);

    var sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid rgba(240,198,119,0.2);margin:8px 0 6px;';
    panel.appendChild(sep);

    var copyBtn = document.createElement('button');
    copyBtn.textContent = 'COPY POSITIONS';
    copyBtn.style.cssText = [
      'background:transparent',
      'border:1px solid #f0c677',
      'color:#f0c677',
      'font-family:monospace',
      'font-size:10px',
      'padding:3px 8px',
      'cursor:pointer',
      'width:100%',
      'margin-top:2px',
    ].join(';');
    copyBtn.addEventListener('click', copyIconPositions);
    panel.appendChild(copyBtn);

    var hint = document.createElement('div');
    hint.id = 'icon-debug-hint';
    hint.style.cssText = 'font-size:9px;color:#f0c677;opacity:0.5;margin-top:5px;text-align:center;';
    panel.appendChild(hint);

    document.body.appendChild(panel);

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var focused = document.activeElement;
        if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) return;
        iconDebugVisible = !iconDebugVisible;
        panel.style.display = iconDebugVisible ? 'block' : 'none';
        if (iconDebugVisible) updateIconDebugPanel();
      }
    });
  }

  function updateIconDebugPanel() {
    var table = document.getElementById('icon-debug-table');
    if (!table) return;
    table.innerHTML = '';
    ICONS.forEach(function (cfg) {
      var el = document.getElementById(cfg.id);
      if (!el) return;
      var x = Math.round(parseFloat(el.style.left) || 0);
      var y = Math.round(parseFloat(el.style.top)  || 0);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:12px;padding:2px 0;';
      row.innerHTML =
        '<span style="color:rgba(240,198,119,0.6);">' + cfg.file + '</span>' +
        '<span>x: <b>' + x + '</b>&nbsp;&nbsp;y: <b>' + y + '</b></span>';
      table.appendChild(row);
    });
  }

  function copyIconPositions() {
    var lines = ICONS.map(function (cfg) {
      var el = document.getElementById(cfg.id);
      var x = el ? Math.round(parseFloat(el.style.left) || 0) : 0;
      var y = el ? Math.round(parseFloat(el.style.top)  || 0) : 0;
      var pad = cfg.id.length < 12 ? ' '.repeat(12 - cfg.id.length) : '';
      return '  { id:\'' + cfg.id + '\'' + pad +
             ', file:\'' + cfg.file + '\'' +
             ', emoji:\'' + cfg.emoji + '\'' +
             ', imgKey:\'' + cfg.imgKey + '\'' +
             ', x:' + x + ', y:' + y + ',' +
             '  action:\'' + cfg.action + '\' },';
    });
    var text = 'var ICONS = [\n' + lines.join('\n') + '\n];';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        var hint = document.getElementById('icon-debug-hint');
        if (hint) { hint.textContent = 'copied!'; setTimeout(function(){ hint.textContent = ''; }, 1800); }
      });
    } else {
      window.prompt('Copy positions:', text);
    }
  }

  // ── TOAST ─────────────────────────────────────────────────
  var _tt;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent   = msg;
    el.style.display = 'block';
    clearTimeout(_tt);
    _tt = setTimeout(function(){ el.style.display = 'none'; }, 3500);
  }

  return { init:init, showVoidIcons:showVoidIcons, setRunning:setRunning, toast:toast };

}());