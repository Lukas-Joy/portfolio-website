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

  // Screen face corners in local monitor space
  var SCREEN_W   = 3.0;
  var SCREEN_H   = 2.05;
  var SCREEN_Z   = 0.208;

  var localCorners = [
    new THREE.Vector3(-SCREEN_W / 2,  SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3( SCREEN_W / 2,  SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3(-SCREEN_W / 2, -SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3( SCREEN_W / 2, -SCREEN_H / 2, SCREEN_Z),
  ];

  var screenRect = { left: 0, top: 0, width: 0, height: 0 };

  // Warm sepia palette for outside-monitor world
  var COL_BG          = 0x14100a;
  var COL_AMBIENT     = 0x2a1e10;
  var COL_STAR        = 0x9a8060;
  var COL_BEZEL       = 0x222222;

  // ── INIT ──────────────────────────────────────────────────
  function init() {
    var canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(COL_BG, 1);

    threeScene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.05, 5.8);
    camera.lookAt(0, 0, 0);

    // Warm ambient (sepia room light)
    threeScene.add(new THREE.AmbientLight(COL_AMBIENT, 1.5));

    // Strong screen glow light — makes monitor bright against warm bg
    var screenGlow = new THREE.PointLight(0x39ff5a, 3.5, 10);
    screenGlow.position.set(0, 0.1, 1.6);
    threeScene.add(screenGlow);

    // Warm fill from above-right (room light)
    var roomLight = new THREE.PointLight(0x6b4c28, 0.9, 14);
    roomLight.position.set(3, 4, 4);
    threeScene.add(roomLight);

    // Subtle warm rim behind monitor (makes bezel edges pop)
    var rimLight = new THREE.PointLight(0x4a3018, 0.6, 8);
    rimLight.position.set(0, 2, -2);
    threeScene.add(rimLight);

    buildMonitor();
    buildStarfield();
    buildVoidParticles();
    buildProjectIcons();   // 3D floating icons in grid

    window.addEventListener('resize', onResize);

    // One synchronous render + overlay update before boot sequence begins
    renderer.render(threeScene, camera);
    updateOverlay();

    requestAnimationFrame(renderLoop);
  }

  // ── MONITOR ───────────────────────────────────────────────
  function buildMonitor() {
    monitorGroup = new THREE.Group();

    // Slightly lighter bezel so it reads against dark warm bg
    var bezelMat  = new THREE.MeshLambertMaterial({ color: COL_BEZEL });
    var innerMat  = new THREE.MeshLambertMaterial({ color: 0x141414 });
    var screenMat = new THREE.MeshBasicMaterial  ({ color: 0x010a03 });

    // Outer bezel
    var bezelGeo = new THREE.BoxGeometry(3.8, 2.75, 0.36, 3, 3, 2);
    storeOrig(bezelGeo);
    var bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.userData.jitter = 0.006;

    // Inner recess
    var recess = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.25, 0.10), innerMat);
    recess.position.z = 0.13;

    // Screen face (dark green-black; HTML overlay sits on top)
    var screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat);
    screenMesh.position.z = SCREEN_Z;

    // Neck
    var neckGeo = new THREE.BoxGeometry(0.36, 0.65, 0.20, 1, 2, 1);
    storeOrig(neckGeo);
    var neck = new THREE.Mesh(neckGeo, bezelMat);
    neck.position.set(0, -1.65, -0.04);
    neck.userData.jitter = 0.004;

    // Base
    var baseGeo = new THREE.BoxGeometry(1.9, 0.11, 0.70, 2, 1, 2);
    storeOrig(baseGeo);
    var base = new THREE.Mesh(baseGeo, bezelMat);
    base.position.set(0, -2.01, -0.07);
    base.userData.jitter = 0.003;

    // Power LED
    var led    = new THREE.Mesh(new THREE.SphereGeometry(0.034, 4, 4), new THREE.MeshBasicMaterial({ color: 0x39ff5a }));
    led.position.set(1.65, -1.29, 0.20);
    led.userData.isLed = true;

    monitorGroup.add(bezel, recess, screenMesh, neck, base, led);
    monitorGroup.rotation.x = 0.04;
    monitorGroup.rotation.y = -0.06;
    // NO position.y bobbing — monitor is static

    threeScene.add(monitorGroup);
  }

  function storeOrig(geo) {
    geo.userData.origPos = new Float32Array(geo.attributes.position.array);
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

      var pos = new THREE.Vector3(colX, yPos, 0.0);
      proj._scenePos = pos;   // cached for HTML overlay projection

      // Default geometry: low-poly card/tile
      var geo = new THREE.BoxGeometry(0.88, 0.88, 0.10, 2, 2, 1);
      var mat = new THREE.MeshLambertMaterial({ color: 0x1a2e1d });

      var mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      // Isometric tilt — rotX tips the top back so we see it from above-front
      mesh.rotation.x = -0.38;

      var rotSpeed = 0.007 + Math.random() * 0.004;
      mesh.userData.rotSpeed = rotSpeed;
      mesh.userData.projKey  = proj.key;

      projectMeshGroup.add(mesh);
      projectMeshes.push(mesh);

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
      loadMesh(proj, mesh, mat, pos);
    });
  }

  function loadMesh(proj, defaultMesh, defaultMat, pos) {
    if (typeof THREE.GLTFLoader === 'undefined') return;
    var loader = new THREE.GLTFLoader();
    loader.load(
      'mesh/' + proj.key + '.glb',
      function (gltf) {
        // Replace default box with loaded mesh
        projectMeshGroup.remove(defaultMesh);
        var loaded = gltf.scene;
        loaded.position.copy(pos);
        loaded.rotation.x = -0.38;
        loaded.userData.rotSpeed = defaultMesh.userData.rotSpeed;
        loaded.userData.projKey  = proj.key;
        projectMeshGroup.add(loaded);
        // Swap reference in array
        var idx = projectMeshes.indexOf(defaultMesh);
        if (idx !== -1) projectMeshes[idx] = loaded;
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
      overlay.style.height = (maxY - minY) + 'px';
    }
    screenRect.left   = minX;
    screenRect.top    = minY;
    screenRect.width  = maxX - minX;
    screenRect.height = maxY - minY;
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

  // ── RENDER LOOP ───────────────────────────────────────────
  var jitterCnt = 0;
  function renderLoop() {
    requestAnimationFrame(renderLoop);
    var t = Date.now() * 0.001;

    // LED pulse (monitor is otherwise static — no Y float)
    monitorGroup.children.forEach(function (m) {
      if (!m.userData.isLed) return;
      var v = 0.6 + 0.4 * Math.sin(t * 2.0);
      m.material.color.setRGB(0, v, v * 0.12);
    });

    // Rotate project icon meshes around their Y axis (isometric spin)
    projectMeshes.forEach(function (mesh) {
      mesh.rotation.y += mesh.userData.rotSpeed || 0.008;
    });

    jitterCnt++;
    if (jitterCnt % 8 === 0) applyJitter();

    renderer.render(threeScene, camera);
    updateOverlay();
    updateVoidIcons();
  }

  function showProjectMeshes(on) {
    projectMeshGroup.visible = on;
  }

  return { init: init, screenRect: screenRect, showProjectMeshes: showProjectMeshes };

}());