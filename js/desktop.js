/**
 * desktop.js — Desktop icons (draggable, confined to desktop area) + taskbar
 *
 * Desktop icons try to load from img/icon-{id}.png
 * Falls back to img/No_Texture.webp, then plain emoji if that also fails
 * Clock is always GMT+13
 */

var Desktop = (function () {

  var ICONS = [
    { id:'ic-projects', file:'project.exe', emoji:'📁', imgKey:'icon-projects', x:10, y:10,  action:'app:project' },
    { id:'ic-about',    file:'about.html',  emoji:'📄', imgKey:'icon-about',    x:10, y:90,  action:'win:about'   },
    { id:'ic-contact',  file:'contact.txt', emoji:'📬', imgKey:'icon-contact',  x:10, y:170, action:'win:contact' },
    { id:'ic-cv',       file:'CV.pdf',      emoji:'📋', imgKey:'icon-cv',       x:10, y:250, action:'win:cv'      },
  ];

  var dragging = null, dragOffX = 0, dragOffY = 0;
  var iconStartX = 0, iconStartY = 0, didMove = false;

  // ── SEEDED RANDOM ────────────────────────────────────────
  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function init() {
    buildIcons();
    buildTaskbar();
    buildVoidIcons();
    tick();
    setInterval(tick, 15000);
  }

  // ── DESKTOP ICONS ─────────────────────────────────────────
  function buildIcons() {
    var desktop = document.getElementById('desktop');
    var deskRect = desktop.getBoundingClientRect();
    var iconW = 58;
    var iconH = 72;

    ICONS.forEach(function (cfg, idx) {
      var el = document.createElement('div');
      el.className = 'desk-icon';
      el.id        = cfg.id;
      // Use seeded random for deterministic but scattered positions
      var randomX = seededRandom(idx * 123.456) * (deskRect.width - iconW);
      var randomY = seededRandom(idx * 789.012) * (deskRect.height - iconH);
      el.style.left = randomX + 'px';
      el.style.top  = randomY + 'px';

      // Try custom image, fall back to No_Texture, then emoji
      var imgEl = new Image();
      imgEl.draggable = false;
      imgEl.className = 'desk-icon-em';

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
          el.replaceChild(span, imgEl);
        };
        imgEl.src = 'img/No_Texture.webp';
      };
      imgEl.src = 'img/' + cfg.imgKey + '.png';

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
    var nx = Math.max(0, Math.min(e.clientX - dRect.left - dragOffX, desktop.clientWidth  - iW));
    var ny = Math.max(0, Math.min(e.clientY - dRect.top  - dragOffY, desktop.clientHeight - iH));
    dragging.style.left = nx + 'px';
    dragging.style.top  = ny + 'px';
  }

  function onUp() { document.removeEventListener('mousemove', onMove); dragging = null; }

  function activate(cfg) {
    var parts = cfg.action.split(':');
    if (parts[0] === 'app') ProjectApp.open(); else Windows.open(parts[1]);
    setRunning(cfg.id, true);
  }

  // ── TASKBAR ───────────────────────────────────────────────
  function buildTaskbar() {
    var tb = document.getElementById('taskbar');
    tb.innerHTML =
      '<button id="start-btn">&#9654; START</button>' +
      '<div class="tb-sep"></div>' +
      '<span class="tb-icon" id="tbi-projects" onclick="ProjectApp.toggle()">&#128193; project.exe</span>' +
      '<span class="tb-icon" id="tbi-about"    onclick="Windows.toggle(\'about\')">&#128196; about</span>' +
      '<span class="tb-icon" id="tbi-contact"  onclick="Windows.toggle(\'contact\')">&#128236; contact</span>' +
      '<span class="tb-icon" id="tbi-cv"       onclick="Windows.toggle(\'cv\')">&#128203; cv</span>' +
      '<div style="margin-left:auto;display:flex;align-items:center">' +
        '<div id="taskbar-clock">00:00</div>' +
      '</div>';

    document.getElementById('start-btn').addEventListener('click', function () {
      toast('START MENU: [under construction since 1994] \u25a0');
    });
  }

  // ── VOID ICONS ────────────────────────────────────────────
  function buildVoidIcons() {
    var layer = document.getElementById('void-layer');
    SITE_DATA.projects.forEach(function (proj) {
      var el  = document.createElement('div');
      el.className = 'void-icon';
      el.id        = 'void-icon-' + proj.key;
      var hitCircle = document.createElement('div');
      hitCircle.className = 'void-icon-hit';
      el.appendChild(hitCircle);
      el.addEventListener('click', function () { ProjectApp.selectProject(proj.key); });
      layer.appendChild(el);
    });
  }

  function showVoidIcons(on) {
    document.querySelectorAll('.void-icon').forEach(function(e){ e.style.display = on ? 'flex' : 'none'; });
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