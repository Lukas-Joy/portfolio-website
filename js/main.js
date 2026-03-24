/**
 * main.js — Bootstrap
 * Boots the Three.js scene, runs the boot sequence on the monitor,
 * then reveals the desktop.
 */

(function () {

  function buildExternalLinksBar() {
    var bar = document.getElementById('neocities-bar');
    if (!bar) return;

    var cfg = (SITE_DATA && SITE_DATA.externalLinkBar) ? SITE_DATA.externalLinkBar : null;
    var buttons = (cfg && cfg.buttons && cfg.buttons.length) ? cfg.buttons : [];

    bar.innerHTML = '';

    if (!cfg || cfg.enabled === false || !buttons.length) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';

    buttons.forEach(function (btn) {
      if (!btn || !btn.url) return;

      var link = document.createElement('a');
      link.className = 'neo-btn';
      link.href = btn.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', btn.label || btn.url);

      if (btn.image) {
        var img = document.createElement('img');
        img.className = 'neo-btn-img';
        img.src = btn.image;
        img.alt = btn.label || 'External link button';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', function () {
          link.style.display = 'none';
        });
        link.appendChild(img);
      } else {
        return;
      }

      bar.appendChild(link);
    });
  }

  function applyAccessibilityLabels() {
    var a11y = (SITE_DATA && SITE_DATA.accessibility) ? SITE_DATA.accessibility : {};
    var sceneLabel = a11y.sceneCanvasLabel || 'Interactive 3D scene of a retro desktop monitor';
    var sceneFallback = a11y.sceneCanvasFallback || 'Your browser does not support the 3D canvas scene.';
    var sceneCanvas = document.getElementById('three-canvas');

    if (!sceneCanvas) return;

    sceneCanvas.setAttribute('role', 'img');
    sceneCanvas.setAttribute('aria-label', sceneLabel);
    sceneCanvas.textContent = sceneFallback;
  }

  function start() {
    buildExternalLinksBar();
    applyAccessibilityLabels();
    Scene.init();
    if (Scene.playStartupPowerOnAnimation) {
      Scene.playStartupPowerOnAnimation(function () {
        runBoot(revealDesktop);
      });
    } else {
      runBoot(revealDesktop);
    }
  }

  // ── BOOT SEQUENCE ─────────────────────────────────────────
  // Each line types in with a small delay; certain lines trigger
  // a fake progress-bar animation before appearing as "OK".
  function runBoot(onDone) {
    var container = document.getElementById('boot-screen');
    container.innerHTML = '';
    container.style.display = 'flex';

    var startupCfg = (SITE_DATA && SITE_DATA.startupSequence) ? SITE_DATA.startupSequence : {};
    var splashCfg = startupCfg.splash || {};
    var bootLines = startupCfg.bootLines || SITE_DATA.bootLines || [];

    container.style.opacity = '1';
    container.style.transition = '';

    runStartupSplash(container, splashCfg, function () {
      runBootLines(container, bootLines, function () {
        setTimeout(function () {
          container.style.transition = 'opacity 0.4s steps(4)';
          container.style.opacity = '0';
          setTimeout(function () {
            container.classList.remove('boot-screen-splashing');
            container.style.display = 'none';
            container.style.opacity = '';
            container.style.transition = '';
            onDone();
          }, 420);
        }, 130);
      });
    });
  }

  function runStartupSplash(container, splashCfg, onDone) {
    container.innerHTML = '';
    container.classList.add('boot-screen-splashing');

    var shell = document.createElement('div');
    shell.className = 'startup-splash';

    var artWrap = document.createElement('div');
    artWrap.className = 'startup-art';

    var hasArt = false;
    if (splashCfg && splashCfg.asciiArt && splashCfg.asciiArt.length) {
      var ascii = document.createElement('pre');
      ascii.className = 'startup-art-ascii';
      ascii.textContent = splashCfg.asciiArt.join('\n');
      ascii.classList.add('astraos-reveal');
      artWrap.appendChild(ascii);
      hasArt = true;
    }

    if (!hasArt) {
      var fallback = document.createElement('pre');
      fallback.className = 'startup-art-ascii';
      fallback.textContent = '[ ASTRAOS ]';
      fallback.classList.add('astraos-reveal');
      artWrap.appendChild(fallback);
    }

    var title = document.createElement('div');
    title.className = 'startup-title';
    title.textContent = (splashCfg && splashCfg.title) ? splashCfg.title : 'ASTRAOS STARTUP';

    var subtitle = document.createElement('div');
    subtitle.className = 'startup-subtitle';
    subtitle.textContent = (splashCfg && splashCfg.subtitle) ? splashCfg.subtitle : 'Lukas Joy Workstation';

    var loading = document.createElement('div');
    loading.className = 'startup-loading';
    loading.innerHTML = ((splashCfg && splashCfg.loadingText) ? splashCfg.loadingText : 'Starting desktop services') + '<span class="startup-loading-dots"><span></span><span></span><span></span></span>';

    shell.appendChild(artWrap);
    shell.appendChild(title);
    shell.appendChild(subtitle);
    shell.appendChild(loading);
    container.appendChild(shell);

    var holdMs = Math.max(1800, (splashCfg && Number(splashCfg.holdMs)) ? Number(splashCfg.holdMs) : 0);
    var introMs = Math.max(0, (splashCfg && Number(splashCfg.introMs)) ? Number(splashCfg.introMs) : 900);
    var outMs = 300;
    setTimeout(function () {
      shell.classList.add('is-exiting');
      setTimeout(function () {
        container.classList.remove('boot-screen-splashing');
        onDone();
      }, outMs);
    }, introMs + (holdMs || 1800));
  }

  function runBootLines(container, lines, onDone) {
    container.innerHTML = '';
    var i = 0;

    function next() {
      if (i >= lines.length) {
        onDone();
        return;
      }

      var line = lines[i++] || { text: '', style: 'normal' };
      var delay = 25 + Math.random() * 15;

      if (line.style === 'gap') {
        var gap = document.createElement('div');
        gap.className = 'boot-line';
        gap.innerHTML = '&nbsp;';
        container.appendChild(gap);
        setTimeout(next, 5);
        return;
      }

      if (line.style === 'sep') {
        var sep = document.createElement('div');
        sep.className = 'boot-line dim';
        sep.textContent = line.text;
        container.appendChild(sep);
        setTimeout(next, 5);
        return;
      }

      if (line.style === 'header') {
        var hdr = document.createElement('div');
        hdr.className = 'boot-line header';
        hdr.textContent = line.text;
        container.appendChild(hdr);
        setTimeout(next, 15);
        return;
      }

      if (line.style === 'cursor') {
        var cur = document.createElement('div');
        cur.className = 'boot-line cursor ok';
        cur.textContent = line.text;
        container.appendChild(cur);
        container.scrollTop = container.scrollHeight;
        setTimeout(next, 50);
        return;
      }

      if (line.style === 'ok' && line.text.indexOf('..') !== -1) {
        var okEl = document.createElement('div');
        okEl.className = 'boot-line';
        container.appendChild(okEl);
        container.scrollTop = container.scrollHeight;
        typeOkLine(okEl, line.text, function () {
          okEl.classList.add('ok');
          setTimeout(next, delay * 0.3);
        });
        return;
      }

      var el = document.createElement('div');
      el.className = 'boot-line' +
        (line.style === 'ok' ? ' ok' : '') +
        (line.style === 'dim' ? ' dim' : '') +
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
    }, 4);
  }

  // ── REVEAL DESKTOP ────────────────────────────────────────
  function revealDesktop() {
    document.getElementById('desktop').style.display = 'block';
    Windows.init();
    Desktop.init();
    if (Scene.setPowerButtonEnabled) Scene.setPowerButtonEnabled(true);
    setTimeout(function () {
      if (Windows.openStartupHelp) Windows.openStartupHelp();
    }, 180);
  }

  // ── KICK OFF ──────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

}());