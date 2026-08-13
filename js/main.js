/* ============================================================
   main.js — boots the sim: renderer, scene, world, camera rig,
   tide gauge, and the animation loop.

   First organism on the shore is the fiddler crab (BUILD_GUIDE §1,
   §6). It goes first because it is the INVERTED one — active while
   dry, down the burrow on the flood — so it exercises the tide seam
   from the opposite side to everything else in the roster.
   ============================================================ */
(function () {
  'use strict';

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('scene-holder').appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 900);

  var world = World.build(scene);
  var rig = new CameraRig(camera, renderer.domElement);
  // the camera roams the study plot, not the whole scenic terrain
  rig.boundX = world.simArea.halfX + 26;
  rig.boundZ = 88;
  var tideUI = TideUI.init({ world: world, camera: camera, rig: rig });
  window.__tideUI = tideUI;                    // ui.js borrows its toast so the two never fight
  var crabs = Crabs.spawn(scene, world);
  var mudskippers = Mudskippers.spawn(scene, world);
  var barnacles = Barnacles.spawn(scene, world);
  var nerites = Nerites.spawn(scene, world);
  var conches = Conchs.spawn(scene, world);
  var seastars = SeaStars.spawn(scene, world);
  /* The sea hare takes the sea star array: a star creeping too close is what
     sets off its ink (§27). First time one population on this shore has been
     handed another — kept as an optional argument so neither depends on it. */
  var seahares = SeaHares.spawn(scene, world, { seastars: seastars.stars });
  /* The egret takes the crab array for the same reason (§30): a standing
     heron is what sends a fiddler down its hole, and until now only the
     flood could do that. Optional again — neither population needs the
     other to exist. It is also the one species here that is NOT always
     on the plot; at high tide it is genuinely gone. */
  var egrets = Egrets.spawn(scene, world, { crabs: crabs.crabs });

  /* The species panel, follow mode and the food web all read species.js.
     `pops` is the only wiring they need: it maps a species' `sim` key to
     the live array of individuals behind it. A species with no entry here
     is still catalogued and still appears in the food web — it just has no
     body to follow yet (BUILD_GUIDE §11). */
  UI.init({
    rig: rig, camera: camera, scene: scene, world: world,
    pops: { fiddler: crabs.crabs, mudskipper: mudskippers.fish, barnacle: barnacles.barnacles, nerite: nerites.snails, conch: conches.conches, seastar: seastars.stars, seahare: seahares.hares, egret: egrets.birds }
  });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var clock = new THREE.Clock();
  var simTime = 0;
  function loop() {
    requestAnimationFrame(loop);
    var dt = Math.min(clock.getDelta(), 0.05);
    simTime += dt;

    world.update(dt, simTime, camera);
    crabs.update(dt, simTime);
    mudskippers.update(dt, simTime);
    barnacles.update(dt, simTime);
    nerites.update(dt, simTime);
    conches.update(dt, simTime);
    seastars.update(dt, simTime);
    seahares.update(dt, simTime);
    egrets.update(dt, simTime);
    tideUI.update(dt, simTime);
    UI.update(dt);
    rig.update(dt);

    renderer.render(scene, camera);
  }
  loop();

  // handy for the console while tuning the transect
  window.__world = world;
  window.__scene = scene;
  window.__renderer = renderer;
  window.__rig = rig;
  window.__crabs = crabs;
  window.__mudskippers = mudskippers;
  window.__barnacles = barnacles;
  window.__nerites = nerites;
  window.__conches = conches;
  window.__seastars = seastars;
  window.__seahares = seahares;
  window.__egrets = egrets;
  window.__cam = camera;
})();
