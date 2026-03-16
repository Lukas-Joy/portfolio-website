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
  var PSX_RESOLUTION = { w: 480, h: 320 };  // native PSX resolution to snap to
  var overheadLight;       // overhead directional light for debug control
  var powerLED;            // green power LED mesh
  var redLED;              // red blinking LED mesh
  var ledConfig = {        // green LED debug parameters
    posX: 0.94,
    posY: -1.24,
    posZ: 1.20,
    radius: 0.025,
    colorR: 0.22,
    colorG: 1.0,
    colorB: 0.35,
    blinkSpeed: 3.5,
    blinkIntensity: 1
  };
  var redLedConfig = {     // red LED debug parameters
    posX: 0.09,
    posY: 1.36,
    posZ: 1.20,
    radius: 0.025,
    blinkSpeed: 6.0,
    blinkIntensity: 1
  };

  // ── DEBUG POSITIONING ────────────────────────────────────
  var debugMode = false;
  var debugConfig = {
    posX: 0,
    posY: 0.20,
    posZ: 0,
    scaleX: 0.60,
    scaleY: 0.60,
    scaleZ: 0.60,
  };

  // Screen face corners in local monitor space
  var SCREEN_W   = 3.20;
  var SCREEN_H   = 0.35;
  var SCREEN_Z   = 1.00;

  var localCorners = [
    new THREE.Vector3(-SCREEN_W / 2,  SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3( SCREEN_W / 2,  SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3(-SCREEN_W / 2, -SCREEN_H / 2, SCREEN_Z),
    new THREE.Vector3( SCREEN_W / 2, -SCREEN_H / 2, SCREEN_Z),
  ];

  // ── OVERLAY (2D UI) DEBUG CONFIG ─────────────────────────
  var overlayConfig = {
    screenW: SCREEN_W,
    screenH: SCREEN_H,
    screenZ: SCREEN_Z,
    padBottom: 345,      // extra px added to bottom (taskbar)
    offsetX: 0,
    offsetY: -152,       // manual px offset up/down
    uiScale: 1.0,       // CSS transform scale on the overlay
  };

  var screenRect = { left: 0, top: 0, width: 0, height: 0 };

  // Monitor mesh configuration
  var MONITOR_SCALE = 1.4;    // Adjust if mesh needs scaling
  var MONITOR_ROT_X = 0;
  var MONITOR_ROT_Y = -Math.PI * 0.5;

  // Two-tone palette for 3D world
  var COL_BG          = 0x000000;
  var COL_AMBIENT     = 0x000000;
  var COL_STAR        = 0xf0c677;
  var COL_BEZEL       = 0x000000;

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
    updateMonitorDebug();  // Apply initial debugConfig position/scale
    buildStarfield();
    buildVoidParticles();
    buildProjectIcons();   // 3D floating icons in grid

    buildDebugPanel();     // Build debug positioning panel (hidden by default)

    window.addEventListener('resize', onResize);

    // Keyboard shortcut to toggle debug panel (press 'D')
    document.addEventListener('keydown', function(e) {
      if (e.key === 'd' || e.key === 'D') {
        toggleDebugPanel();
      }
    });

    // One synchronous render + overlay update before boot sequence begins
    renderer.render(threeScene, camera);
    updateOverlay();

    requestAnimationFrame(renderLoop);

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

    var monitorMeshFile = (SITE_DATA.assets && SITE_DATA.assets.monitorMeshFile)
      ? SITE_DATA.assets.monitorMeshFile
      : 'monitor.glb';
    var monitorMeshPath = 'mesh/' + monitorMeshFile;

    // Load custom monitor mesh instead of building it
    var loader = new THREE.GLTFLoader();
    loader.load(
      monitorMeshPath,
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

        // Log mesh names for debugging if no screen mesh was found
        if (screenMeshes.length === 0) {
          console.warn(monitorMeshFile + ': no meshes matched screen name patterns. Mesh names:');
          mesh.traverse(function (child) {
            if (child.isMesh) console.warn('  -', child.name);
          });
        }
      },
      undefined,
      function (error) {
        console.error('Failed to load ' + monitorMeshFile + ':', error);
      }
    );

    // Power LED — green (always add)
    powerLED = new THREE.Mesh(
      new THREE.SphereGeometry(ledConfig.radius, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x39ff5a })
    );
    powerLED.position.set(ledConfig.posX, ledConfig.posY, ledConfig.posZ);
    powerLED.userData.isLed = true;
    threeScene.add(powerLED);

    // Power LED — red blinking
    redLED = new THREE.Mesh(
      new THREE.SphereGeometry(redLedConfig.radius, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xff2200 })
    );
    redLED.position.set(redLedConfig.posX, redLedConfig.posY, redLedConfig.posZ);
    threeScene.add(redLED);

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
    var oX = overlayConfig.offsetX;
    var oY = overlayConfig.offsetY;
    var pad = overlayConfig.padBottom;
    var w  = maxX - minX;
    var h  = maxY - minY + pad;
    if (overlay) {
      overlay.style.left   = (minX + oX) + 'px';
      overlay.style.top    = (minY + oY) + 'px';
      overlay.style.width  = w + 'px';
      overlay.style.height = h + 'px';
      overlay.style.transform = 'scale(' + overlayConfig.uiScale + ')';
      overlay.style.transformOrigin = 'center center';
    }
    screenRect.left   = minX + oX;
    screenRect.top    = minY + oY;
    screenRect.width  = w;
    screenRect.height = h;
  }

  // ── DEBUG POSITIONING PANEL ──────────────────────────────
  function buildDebugPanel() {
    var panel = document.createElement('div');
    panel.id = 'debug-positioning-panel';
    panel.innerHTML = 
      '<div class="debug-header">' +
        '<h3>DEBUG POSITIONING</h3>' +
        '<button id="debug-close-btn" title="Close debug panel">✕</button>' +
      '</div>' +
      '<div class="debug-section-title">MONITOR (3D)</div>' +
      '<div class="debug-controls">' +
        '<div class="debug-group">' +
          '<label>Position X:</label>' +
          '<input type="range" id="debug-posX" min="-5" max="5" step="0.1" value="0">' +
          '<span id="debug-posX-val">0.0</span>' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Position Y (vertical):</label>' +
          '<input type="range" id="debug-posY" min="-2" max="2" step="0.1" value="0">' +
          '<span id="debug-posY-val">0.0</span>' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Position Z (forward/back):</label>' +
          '<input type="range" id="debug-posZ" min="-3" max="3" step="0.1" value="0">' +
          '<span id="debug-posZ-val">0.0</span>' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Scale X (width):</label>' +
          '<input type="range" id="debug-scaleX" min="0.5" max="3" step="0.1" value="1.4">' +
          '<span id="debug-scaleX-val">1.4</span>' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Scale Y (height):</label>' +
          '<input type="range" id="debug-scaleY" min="0.5" max="3" step="0.1" value="1.4">' +
          '<span id="debug-scaleY-val">1.4</span>' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Scale Z:</label>' +
          '<input type="range" id="debug-scaleZ" min="0.5" max="3" step="0.1" value="1.4">' +
          '<span id="debug-scaleZ-val">1.4</span>' +
        '</div>' +
      '</div>' +
      '<div class="debug-divider"></div>' +
      '<div class="debug-section-title">GREEN LED</div>' +
      '<div class="debug-controls">' +
        '<div class="debug-group"><label>X:</label><input type="number" id="debug-ledX" step="0.05" value="' + ledConfig.posX + '" class="debug-num"></div>' +
        '<div class="debug-group"><label>Y:</label><input type="number" id="debug-ledY" step="0.05" value="' + ledConfig.posY + '" class="debug-num"></div>' +
        '<div class="debug-group"><label>Z:</label><input type="number" id="debug-ledZ" step="0.05" value="' + ledConfig.posZ + '" class="debug-num"></div>' +
      '</div>' +
      '<div class="debug-divider"></div>' +
      '<div class="debug-section-title">RED LED</div>' +
      '<div class="debug-controls">' +
        '<div class="debug-group"><label>X:</label><input type="number" id="debug-rledX" step="0.05" value="' + redLedConfig.posX + '" class="debug-num"></div>' +
        '<div class="debug-group"><label>Y:</label><input type="number" id="debug-rledY" step="0.05" value="' + redLedConfig.posY + '" class="debug-num"></div>' +
        '<div class="debug-group"><label>Z:</label><input type="number" id="debug-rledZ" step="0.05" value="' + redLedConfig.posZ + '" class="debug-num"></div>' +
        '<div class="debug-group"><label>Blink Speed:</label><input type="number" id="debug-rledSpeed" step="0.5" value="' + redLedConfig.blinkSpeed + '" class="debug-num"></div>' +
      '</div>' +
      '<div class="debug-divider"></div>' +
      '<div class="debug-section-title">OVERLAY (2D UI)</div>' +
      '<div class="debug-controls">' +
        '<div class="debug-group">' +
          '<label>Screen W:</label>' +
          '<input type="number" id="debug-screenW" step="0.05" value="' + overlayConfig.screenW + '" class="debug-num">' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Screen H:</label>' +
          '<input type="number" id="debug-screenH" step="0.05" value="' + overlayConfig.screenH + '" class="debug-num">' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Screen Z (depth):</label>' +
          '<input type="number" id="debug-screenZ" step="0.05" value="' + overlayConfig.screenZ + '" class="debug-num">' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Bottom Padding (px):</label>' +
          '<input type="number" id="debug-padBottom" step="1" value="' + overlayConfig.padBottom + '" class="debug-num">' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>Offset Y (px):</label>' +
          '<input type="number" id="debug-offsetY" step="1" value="' + overlayConfig.offsetY + '" class="debug-num">' +
        '</div>' +
        '<div class="debug-group">' +
          '<label>UI Scale:</label>' +
          '<input type="number" id="debug-uiScale" step="0.05" value="' + overlayConfig.uiScale + '" class="debug-num">' +
        '</div>' +
      '</div>' +
      '<div class="debug-output">' +
        '<div class="debug-output-label">Settings:</div>' +
        '<div id="debug-settings-display" class="debug-settings-text"></div>' +
        '<button id="debug-copy-btn">Copy Settings</button>' +
      '</div>';
    document.body.appendChild(panel);

    // Attach event listeners
    document.getElementById('debug-close-btn').addEventListener('click', toggleDebugPanel);
    
    ['posX', 'posY', 'posZ', 'scaleX', 'scaleY', 'scaleZ'].forEach(function(key) {
      var input = document.getElementById('debug-' + key);
      input.addEventListener('input', function(e) {
        debugConfig[key] = parseFloat(e.target.value);
        document.getElementById('debug-' + key + '-val').textContent = parseFloat(e.target.value).toFixed(1);
        updateMonitorDebug();
        updateDebugDisplay();
      });
    });

    // Overlay controls
    ['screenW', 'screenH', 'screenZ'].forEach(function(key) {
      var input = document.getElementById('debug-' + key);
      input.addEventListener('input', function(e) {
        overlayConfig[key] = parseFloat(e.target.value) || 0;
        rebuildLocalCorners();
        updateDebugDisplay();
      });
    });
    ['padBottom', 'offsetY'].forEach(function(key) {
      var input = document.getElementById('debug-' + key);
      input.addEventListener('input', function(e) {
        overlayConfig[key] = parseInt(e.target.value) || 0;
        updateDebugDisplay();
      });
    });
    (function() {
      var input = document.getElementById('debug-uiScale');
      input.addEventListener('input', function(e) {
        overlayConfig.uiScale = parseFloat(e.target.value) || 1;
        updateDebugDisplay();
      });
    })();

    // Green LED controls
    ['ledX', 'ledY', 'ledZ'].forEach(function(key) {
      var map = { ledX:'posX', ledY:'posY', ledZ:'posZ' };
      var input = document.getElementById('debug-' + key);
      input.addEventListener('input', function(e) {
        ledConfig[map[key]] = parseFloat(e.target.value) || 0;
        if (powerLED) powerLED.position.set(ledConfig.posX, ledConfig.posY, ledConfig.posZ);
        updateDebugDisplay();
      });
    });

    // Red LED controls
    ['rledX', 'rledY', 'rledZ'].forEach(function(key) {
      var map = { rledX:'posX', rledY:'posY', rledZ:'posZ' };
      var input = document.getElementById('debug-' + key);
      input.addEventListener('input', function(e) {
        redLedConfig[map[key]] = parseFloat(e.target.value) || 0;
        if (redLED) redLED.position.set(redLedConfig.posX, redLedConfig.posY, redLedConfig.posZ);
        updateDebugDisplay();
      });
    });
    document.getElementById('debug-rledSpeed').addEventListener('input', function(e) {
      redLedConfig.blinkSpeed = parseFloat(e.target.value) || 1;
      updateDebugDisplay();
    });

    document.getElementById('debug-copy-btn').addEventListener('click', copyDebugSettings);
    updateDebugDisplay();
  }

  function updateMonitorDebug() {
    if (monitorGroup) {
      monitorGroup.position.x = debugConfig.posX;
      monitorGroup.position.y = debugConfig.posY;
      monitorGroup.position.z = debugConfig.posZ;
      monitorGroup.scale.x = debugConfig.scaleX;
      monitorGroup.scale.y = debugConfig.scaleY;
      monitorGroup.scale.z = debugConfig.scaleZ;
    }
  }

  function rebuildLocalCorners() {
    var w = overlayConfig.screenW;
    var h = overlayConfig.screenH;
    var z = overlayConfig.screenZ;
    localCorners[0].set(-w / 2,  h / 2, z);
    localCorners[1].set( w / 2,  h / 2, z);
    localCorners[2].set(-w / 2, -h / 2, z);
    localCorners[3].set( w / 2, -h / 2, z);
  }

  function updateDebugDisplay() {
    var display = document.getElementById('debug-settings-display');
    if (display) {
      display.textContent = 
        'monitorGroup.position: (' + debugConfig.posX.toFixed(2) + ', ' + debugConfig.posY.toFixed(2) + ', ' + debugConfig.posZ.toFixed(2) + ')\n' +
        'monitorGroup.scale: (' + debugConfig.scaleX.toFixed(2) + ', ' + debugConfig.scaleY.toFixed(2) + ', ' + debugConfig.scaleZ.toFixed(2) + ')\n' +
        'SCREEN: W=' + overlayConfig.screenW.toFixed(2) + ' H=' + overlayConfig.screenH.toFixed(2) + ' Z=' + overlayConfig.screenZ.toFixed(2) + '\n' +
        'Overlay: pad=' + overlayConfig.padBottom + ' offY=' + overlayConfig.offsetY + ' scale=' + overlayConfig.uiScale.toFixed(2) + '\n' +
        'Green LED: (' + ledConfig.posX.toFixed(2) + ', ' + ledConfig.posY.toFixed(2) + ', ' + ledConfig.posZ.toFixed(2) + ')\n' +
        'Red LED: (' + redLedConfig.posX.toFixed(2) + ', ' + redLedConfig.posY.toFixed(2) + ', ' + redLedConfig.posZ.toFixed(2) + ')  speed=' + redLedConfig.blinkSpeed.toFixed(1);
    }
  }

  function copyDebugSettings() {
    var settings = 
      '// Monitor Position\n' +
      'monitorGroup.position.set(' + debugConfig.posX.toFixed(2) + ', ' + debugConfig.posY.toFixed(2) + ', ' + debugConfig.posZ.toFixed(2) + ');\n' +
      '// Monitor Scale\n' +
      'monitorGroup.scale.set(' + debugConfig.scaleX.toFixed(2) + ', ' + debugConfig.scaleY.toFixed(2) + ', ' + debugConfig.scaleZ.toFixed(2) + ');\n' +
      '// Screen corners\n' +
      'var SCREEN_W = ' + overlayConfig.screenW.toFixed(2) + ';\n' +
      'var SCREEN_H = ' + overlayConfig.screenH.toFixed(2) + ';\n' +
      'var SCREEN_Z = ' + overlayConfig.screenZ.toFixed(2) + ';\n' +
      '// Overlay offsets\n' +
      'padBottom: ' + overlayConfig.padBottom + ', offsetY: ' + overlayConfig.offsetY + ', uiScale: ' + overlayConfig.uiScale.toFixed(2) + ';\n' +
      '// Green LED\n' +
      'ledConfig: { posX:' + ledConfig.posX.toFixed(2) + ', posY:' + ledConfig.posY.toFixed(2) + ', posZ:' + ledConfig.posZ.toFixed(2) + ' }\n' +
      '// Red LED\n' +
      'redLedConfig: { posX:' + redLedConfig.posX.toFixed(2) + ', posY:' + redLedConfig.posY.toFixed(2) + ', posZ:' + redLedConfig.posZ.toFixed(2) + ', blinkSpeed:' + redLedConfig.blinkSpeed.toFixed(1) + ' }';
    
    navigator.clipboard.writeText(settings).then(function() {
      if (typeof Desktop !== 'undefined' && Desktop.toast) {
        Desktop.toast('Settings copied to clipboard!');
      } else {
        console.log('✓ Settings copied:\n' + settings);
      }
    }).catch(function() {
      console.log('Settings to apply:\n' + settings);
    });
  }

  function toggleDebugPanel() {
    debugMode = !debugMode;
    var panel = document.getElementById('debug-positioning-panel');
    if (panel) {
      panel.style.display = debugMode ? 'block' : 'none';
    }
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
  function storeOrig(geometry) {
    // Store original vertex positions for jitter effect
    if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
    var pos = geometry.attributes.position;
    var origPos = new Float32Array(pos.array);
    geometry.userData = geometry.userData || {};
    geometry.userData.origPos = origPos;
  }

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

    // Green LED pulse
    if (powerLED) {
      var intensity = 0.5 + ledConfig.blinkIntensity * Math.sin(t * ledConfig.blinkSpeed);
      var r = ledConfig.colorR * intensity;
      var g = ledConfig.colorG * intensity;
      var b = ledConfig.colorB * intensity;
      powerLED.material.color.setRGB(r, g, b);
    }

    // Red LED blink (sharp on/off)
    if (redLED) {
      var redOn = Math.sin(t * redLedConfig.blinkSpeed) > 0;
      var redI  = redOn ? redLedConfig.blinkIntensity : 0.04;
      redLED.material.color.setRGB(redI, 0, 0);
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
        ambientLight:  { value: new THREE.Color(0x000000) },
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
    toggleDebugPanel: toggleDebugPanel,
    // PSX shader uniform access (for potential debug controls)
    psxUniforms: function() { return psxPostMaterial ? psxPostMaterial.uniforms : null; },
    setPSXParam: function(key, val) {
      if (psxPostMaterial && psxPostMaterial.uniforms[key]) {
        psxPostMaterial.uniforms[key].value = val;
      }
    },
  };

}());