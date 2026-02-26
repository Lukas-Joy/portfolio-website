/**
 * scene.js — Three.js 3D scene
 *
 * Void outside monitor: warm sepia / dusty beige palette
 * Monitor: static (no float), brighter contrast against bg
 * Project icons: auto-grid either side, isometric spin, custom mesh/texture support
 */

var Scene = (function () {

  var camera, renderer, threeScene, monitorGroup;
  var projectMeshGroup;    // group holding all 3D project icons
  var projectMeshes = [];  // [{mesh, projKey, rotSpeed}]
  var overheadLight;       // overhead directional light for debug control

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

    buildMonitor();
    buildStarfield();
    buildVoidParticles();
    buildProjectIcons();   // 3D floating icons in grid

    window.addEventListener('resize', onResize);

    // One synchronous render + overlay update before boot sequence begins
    renderer.render(threeScene, camera);
    updateOverlay();

    requestAnimationFrame(renderLoop);
    // initScreenCornerDebug();  // Add this at end of init()
    // initOverheadLightDebug();   // Uncomment to enable overhead light debug
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
      },
      undefined,
      function (error) {
        console.error('Failed to load Display.glb:', error);
      }
    );

    // Power LED (always add)
    var led = new THREE.Mesh(
      new THREE.SphereGeometry(0.034, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x39ff5a })
    );
    led.position.set(1.7, -1.29, -1.05);
    led.userData.isLed = true;
    monitorGroup.add(led);

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
      var mat = new THREE.MeshLambertMaterial({ color: 0x1a2e1d });

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
        function (tex) { mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; },
        undefined,
        function () {
          texLoader.load('img/No_Texture.webp',
            function (tex) { mat.map = tex; mat.needsUpdate = true; });
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
  }

  // ── SCREEN OVERLAY TRACKING ───────────────────────────────
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
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    var t = Date.now() * 0.001;

    // LED pulse
    monitorGroup.children.forEach(function (m) {
      if (!m.userData.isLed) return;
      var v = 0.6 + 0.4 * Math.sin(t * 2.0);
      m.material.color.setRGB(0, v, v * 0.12);
    });

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

    renderer.render(threeScene, camera);
    updateOverlay();
    updateVoidIcons();
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

  return { init: init, screenRect: screenRect, showProjectMeshes: showProjectMeshes };

}());