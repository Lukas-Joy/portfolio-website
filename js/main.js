/**
 * main.js — Bootstrap
 * Boots the Three.js scene, runs the boot sequence on the monitor,
 * then reveals the desktop.
 */

(function () {

  function start() {
    Scene.init();
    runBoot(revealDesktop);
  }

  // ── BOOT SEQUENCE ─────────────────────────────────────────
  // Each line types in with a small delay; certain lines trigger
  // a fake progress-bar animation before appearing as "OK".
  function runBoot(onDone) {
    var container = document.getElementById('boot-screen');
    container.innerHTML = '';
    container.style.display = 'flex';

    var lines = SITE_DATA.bootLines;
    var i = 0;

    function next() {
      if (i >= lines.length) {
        setTimeout(function () {
          container.style.transition = 'opacity 0.4s steps(4)';
          container.style.opacity    = '0';
          setTimeout(function () {
            container.style.display = 'none';
            container.style.opacity = '';
            onDone();
          }, 420);
        }, 700);
        return;
      }

      var line  = lines[i++];
      var delay = 110 + Math.random() * 60;

      // Gap lines
      if (line.style === 'gap') {
        var gap = document.createElement('div');
        gap.className = 'boot-line';
        gap.innerHTML = '&nbsp;';
        container.appendChild(gap);
        setTimeout(next, 30);
        return;
      }

      // Sep lines (no delay)
      if (line.style === 'sep') {
        var sep = document.createElement('div');
        sep.className = 'boot-line dim';
        sep.textContent = line.text;
        container.appendChild(sep);
        setTimeout(next, 20);
        return;
      }

      // Header lines
      if (line.style === 'header') {
        var hdr = document.createElement('div');
        hdr.className = 'boot-line header';
        hdr.textContent = line.text;
        container.appendChild(hdr);
        setTimeout(next, 60);
        return;
      }

      // Cursor / last line
      if (line.style === 'cursor') {
        var cur = document.createElement('div');
        cur.className = 'boot-line cursor ok';
        cur.textContent = line.text;
        container.appendChild(cur);
        container.scrollTop = container.scrollHeight;
        setTimeout(next, 200);
        return;
      }

      // Normal / ok / dim / warn lines
      // Lines ending with OK or similar get a small animated "..." then the status
      if (line.style === 'ok' && line.text.indexOf('..') !== -1) {
        var el = document.createElement('div');
        el.className = 'boot-line';
        container.appendChild(el);
        container.scrollTop = container.scrollHeight;
        typeOkLine(el, line.text, function () {
          el.classList.add('ok');
          setTimeout(next, delay * 0.6);
        });
        return;
      }

      var el = document.createElement('div');
      el.className = 'boot-line' +
        (line.style === 'ok'   ? ' ok'   : '') +
        (line.style === 'dim'  ? ' dim'  : '') +
        (line.style === 'warn' ? ' warn' : '');
      el.textContent = line.text;
      container.appendChild(el);
      container.scrollTop = container.scrollHeight;
      setTimeout(next, delay);
    }

    next();
  }

  // Animate the "...... OK" part of a line (dots fill in, then OK appears)
  function typeOkLine(el, text, onDone) {
    // Find the dots section
    var dotStart = text.indexOf('..');
    if (dotStart === -1) { el.textContent = text; onDone(); return; }

    var prefix   = text.substring(0, dotStart);
    var rest     = text.substring(dotStart);
    var dotCount = 0;
    var maxDots  = (rest.match(/\./g) || []).length;
    var suffix   = rest.replace(/\.+\s*/, '').trim(); // e.g. "OK" or "ACTIVE"

    el.textContent = prefix;

    var interval = setInterval(function () {
      dotCount++;
      el.textContent = prefix + '.'.repeat(Math.min(dotCount, maxDots));
      if (dotCount >= maxDots) {
        clearInterval(interval);
        el.textContent = prefix + '.'.repeat(maxDots) + '  ' + suffix;
        onDone();
      }
    }, 18);
  }

  // ── REVEAL DESKTOP ────────────────────────────────────────
  function revealDesktop() {
    document.getElementById('desktop').style.display = 'block';
    Windows.init();
    ProjectApp.init();
    Desktop.init();
  }

  // ── KICK OFF ──────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

}());