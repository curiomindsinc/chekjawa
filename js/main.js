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
  // so no camera, free or scripted, can end up inside the shore
  rig.groundAt = world.heightAt;
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

  /* §31's three. None of them takes another population as an argument:
     the hermit crab's whole social life is with its own species (it
     fights other hermits over shells, nothing else), the horn snail's
     is the clump it travels in, and the sand dollar has none at all.
     What they share is the biofilm grid, which they reach through
     world.filmAt / world.grazeFilm like every grazer before them. */
  var hermits = HermitCrabs.spawn(scene, world);
  var hornsnails = HornSnails.spawn(scene, world);
  var sanddollars = SandDollars.spawn(scene, world);

  /* §32's three, all on the low flat. The sand star goes before the pen
     shell because the pen shell takes it: a star quartering the sediment
     passes over anything standing in it, and that is what makes a pen
     shell clap shut. Fourth inter-population wiring on this shore, and
     optional like the other three — neither species needs the other. */
  var seacucumbers = SeaCucumbers.spawn(scene, world);
  var sandstars = SandStars.spawn(scene, world);
  var penshells = PenShells.spawn(scene, world, { sandstars: sandstars.stars });

  /* §35, roster items 1-4: the moon snail and the last three rock-encrusters,
     all in one batch. The moon snail goes last of the four because it
     is the one that takes another population as an argument — the
     pen shell is finally something for it to hunt (see moonsnails.js)
     — so pen shells have to exist first. Oyster, mussel and sponge
     take nothing: three more independent rock-cemented filter feeders
     stacked down the same boulders barnacles.js already claimed. */
  var oysters = Oysters.spawn(scene, world);
  var mussels = Mussels.spawn(scene, world);
  var sponges = Sponges.spawn(scene, world);
  var moonsnails = MoonSnails.spawn(scene, world, { penshells: penshells.shells });

  /* §36, roster item 1: the swimming crab, the fiddler's mirror image —
     active while submerged, buries in the sand on the ebb instead of
     the flood. Takes nothing and is taken by nothing; it has no fixed
     home to defend or return to, so unlike the fiddler it needs no
     burrow field and no other population to wire against. */
  var swimmingcrabs = SwimmingCrabs.spawn(scene, world);

  /* §38, roster item 3: the mangrove horseshoe crab — the only animal
     on this shore with no band of its own. It commutes with the tide
     up into the mangrove fringe and back, and leaves a furrow behind
     it. Takes nothing and is taken by nothing: what it eats (worms,
     small clams) is infauna nobody here models, and nothing on this
     shore is big enough to eat it. */
  var horseshoes = HorseshoeCrabs.spawn(scene, world);

  /* §39, roster item 2: the carpet anemone and the anemonefish, built
     as a PAIR because neither one is the point on its own. The anemone
     goes first because the fish takes it and cannot spawn without it —
     the first population on this shore whose host argument is required
     rather than optional (anemonefish.js).

     The anemone takes two optional populations for the same reason the
     pen shell took the sand star (§32): a sand star quartering the low
     flat and a swimming crab paddling over it are the two things most
     likely to blunder onto a half-metre disc of sticky tentacles, and
     what a carpet anemone does about that is the only move a sessile
     predator has. Fifth and sixth wirings.

     The fish takes the SWIMMING CRAB too, and that is the same crab —
     so one animal paddling past sets off both halves of the pair at
     once: the host clenching on an intruder and the guest diving into
     the closing host. The egret was the first pick for the fish and
     could not work at all; anemonefish.js records why. It PULLS
     rather than being pushed, the way the pen shell pulls sand stars
     (§32). */
  var anemones = Anemones.spawn(scene, world, {
    sandstars: sandstars.stars,
    swimmingcrabs: swimmingcrabs.crabs
  });
  var anemonefish = AnemoneFish.spawn(scene, world, {
    anemones: anemones.anemones,
    swimmingcrabs: swimmingcrabs.crabs
  });

  /* §40, roster item 3: the sand goby — a DEBT, not a new species.
     §24 swapped the goby for the mudskipper and took §5's trapping
     demonstration off the shore with it, along with the last mortality
     path in the sim. This restores the fish ALONGSIDE the mudskipper
     and never as a replacement; both are on the flat at once and they
     are built to be unmistakable for each other (gobies.js).

     It takes the EGRET, and it is the seventh inter-population wiring
     here — the one §39 tried and could not have. An egret wades a
     hand's depth of water and works the drained flat at 0.9–2.3 m CD;
     an anemonefish had left for the channel long before the bird
     arrived, so that scan fired zero times in 600 seconds. A goby cut
     off in a tide pool is standing in the bird's hunting ground at the
     bottom of the same tide. Same predator, same scan, a prey species
     whose window actually overlaps — and it is what finally lets the
     egret's strike (§30) connect with something.

     Optional, like every wiring but the anemonefish's host: without
     birds the fish simply never gets taken. */
  var gobies = Gobies.spawn(scene, world, { egrets: egrets.birds });

  /* §41, roster item 1: the octopus — the last predator of the low
     shore, and the first animal here with a home it CHOSE rather than
     one it is stuck to or one it re-digs anywhere. It goes last of all
     because it takes two other populations and both have to exist
     first: the swimming crab (§36) and the pen shell (§32), which are
     the only two of its four catalogued prey whose depth bands
     actually overlap its own. The oyster and the mussel sit at
     1.30–2.10 m CD on boulders that dry at every low tide, so they
     are on the wrong end of the shore for an animal that cannot leave
     the water — §39's "check the constants before writing the scan",
     asked vertically this time. octopuses.js records the table.

     Optional, like every wiring but the anemonefish's host: with
     neither population it still dens, commutes and crawls, and simply
     never finds anything to throw the web over.

     MOVED BELOW THE OTTER IN §42. It now takes a third population and
     that one has to exist first — see the otter's own note. */

  /* §42, the LAST item on the roster: the smooth-coated otter.

     It goes here, between the goby and the octopus, and the ordering
     is forced from both sides. It takes the GOBY, because that is what
     it hunts and the goby is the only species on this shore that can
     die; and the OCTOPUS takes it, because a romp is the only thing
     here that eats an octopus and therefore the only thing that could
     ever make one ink. Fish, then otter, then octopus.

     It is also the animal `foodweb.js:28` has been waiting for since
     §9 — `APEX PREDATORS` is a real row as of this section.

     THE OTTER IS HANDED THE WHOLE GOBY POPULATION, not just its array,
     and it is the first wiring on the shore that does. Every one since
     §27 has been a PULL: the prey scans for the predator and the
     predator has never heard of it. That is right when the interaction
     belongs to the prey — a crab bolting, a pen shell clapping — and
     wrong here, because running a fish down is the OTTER's behaviour
     from start to finish. So otters.js reads `gobies.fish` and calls
     `gobies.take()`, which keeps the one-in-one-out bookkeeping inside
     gobies.js where it belongs. Same shape as anemonefish.js writing
     `host.guests` (§39).

     Optional, as ever: with no gobies the romp still arrives on the
     flood, works the flat, hauls out and leaves — it simply never
     catches anything. */
  var otters = Otters.spawn(scene, world, { gobies: gobies });

  var octopuses = Octopuses.spawn(scene, world, {
    swimmingcrabs: swimmingcrabs.crabs,
    penshells: penshells.shells,
    otters: otters.otters
  });

  /* The species panel, follow mode and the food web all read species.js.
     `pops` is the only wiring they need: it maps a species' `sim` key to
     the live population behind it. A species with no entry here is still
     catalogued and still appears in the food web — it just has no body
     to follow yet (BUILD_GUIDE §11).

     Each entry is { list, group }: the array of individuals, and the
     THREE.Group holding that species' InstancedMeshes. ui.js needs the
     group for the hover glow, which brightens the hovered animal's own
     `instanceColor` — see §34. A bare array still works and simply
     never glows. */
  function pop(p, list, glowSlots) {
    return { list: list, group: p.group, glowSlots: glowSlots || null };
  }
  UI.init({
    rig: rig, camera: camera, scene: scene, world: world,
    pops: {
      fiddler:     pop(crabs, crabs.crabs),
      mudskipper:  pop(mudskippers, mudskippers.fish),
      barnacle:    pop(barnacles, barnacles.barnacles),
      nerite:      pop(nerites, nerites.snails),
      conch:       pop(conches, conches.conches),
      seastar:     pop(seastars, seastars.stars),
      seahare:     pop(seahares, seahares.hares),
      egret:       pop(egrets, egrets.birds),
      /* The hermit crab is the one population whose meshes are not all
         indexed by individual: its shell mesh is indexed by SHELL, which
         is what makes a swap free to draw (§31). It publishes its own
         slot lookup so the glow can find the shell a crab is wearing. */
      hermit:      pop(hermits, hermits.crabs, hermits.glowSlots),
      hornsnail:   pop(hornsnails, hornsnails.snails),
      sanddollar:  pop(sanddollars, sanddollars.dollars),
      seacucumber: pop(seacucumbers, seacucumbers.cukes),
      sandstar:    pop(sandstars, sandstars.stars),
      penshell:    pop(penshells, penshells.shells),
      oyster:      pop(oysters, oysters.oysters),
      mussel:      pop(mussels, mussels.mussels),
      sponge:      pop(sponges, sponges.sponges),
      moonsnail:   pop(moonsnails, moonsnails.snails),
      swimmingcrab: pop(swimmingcrabs, swimmingcrabs.crabs),
      horseshoe:    pop(horseshoes, horseshoes.crabs),
      anemone:      pop(anemones, anemones.anemones),
      anemonefish:  pop(anemonefish, anemonefish.fish),
      goby:         pop(gobies, gobies.fish),
      octopus:      pop(octopuses, octopuses.octopuses),
      otter:        pop(otters, otters.otters),
      /* The three producers that actually have a model to click — biofilm
         is a colour wash on the terrain itself and plankton is invisible,
         so neither gets an entry here. These are bare arrays, not
         `{list, group}`: nothing here ever moves or changes state, so
         there is nothing to animate a hover glow onto and no per-frame
         update to run — see the `patches`/`mangroves` comments in
         seagrass.js, spoongrass.js and world.js for where the lists
         themselves come from. */
      mangrove:    world.mangroves,
      seagrass:    world.seagrass.patches,
      spoongrass:  world.spoongrass.patches,
      ulva:        world.ulva.patches,
      sargassum:   world.sargassum.patches
    }
  });

  /* The film (§48). It is handed the WHOLE population objects, not the
     `{list, group}` shapes UI.init takes: the shot list calls behaviour
     hooks — otters.summon/centre/hunter, octopuses.inkAt, egrets.striker
     — and none of those live on an array. Only the five species the tour
     actually points a camera at are passed; the other twenty-odd are on
     screen throughout and simply never need to be asked anything. */
  Cinematic.init({
    rig: rig, camera: camera, world: world,
    pops: {
      otters: otters,
      octopuses: octopuses,
      egrets: egrets,
      gobies: gobies,
      crabs: crabs
    }
  });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* Put the camera where the rig says BEFORE the first world update.
     A fresh PerspectiveCamera sits at the origin, which on this shore is
     ankle-deep on the sand flat — and the §48 underwater grade asks where
     the camera is, so the first frame came up green until the rig moved
     it. One free call; the rig is idempotent with dt 0. */
  rig.update(0);

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
    hermits.update(dt, simTime);
    hornsnails.update(dt, simTime);
    sanddollars.update(dt, simTime);
    seacucumbers.update(dt, simTime);
    sandstars.update(dt, simTime);
    penshells.update(dt, simTime);
    oysters.update(dt, simTime);
    mussels.update(dt, simTime);
    sponges.update(dt, simTime);
    moonsnails.update(dt, simTime);
    swimmingcrabs.update(dt);
    horseshoes.update(dt);
    /* Order matters between these two, and only these two: the fish
       sets `host.guests` and the anemone reads it, so the anemone runs
       first and clears the count for the frame it is about to be told
       about. Reverse them and every embrace is a frame late. */
    anemones.update(dt);
    anemonefish.update(dt);
    /* After the egret, which is what it looks for — a fish reading a
       bird's `stab` wants the bird's own frame, not last frame's. */
    gobies.update(dt);
    /* Last, and it reads the swimming crab and the pen shell — both
       already updated this frame, which is what a hunter scanning for
       prey wants (the goby's comment above, one species on). */
    /* Before the octopus, which reads it: an octopus deciding whether
       to ink wants the romp's position this frame, not last frame's —
       the same argument the goby's own comment makes about the egret. */
    otters.update(dt, simTime);
    octopuses.update(dt);
    tideUI.update(dt, simTime);
    UI.update(dt);
    /* Before rig.update, and that order is the whole contract: the shot
       list WRITES target/yaw/pitch/dist and the rig then turns them into
       a camera position. Reverse them and every shot is a frame late. */
    Cinematic.update(dt);
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
  window.__hermits = hermits;
  window.__hornsnails = hornsnails;
  window.__sanddollars = sanddollars;
  window.__seacucumbers = seacucumbers;
  window.__sandstars = sandstars;
  window.__penshells = penshells;
  window.__oysters = oysters;
  window.__mussels = mussels;
  window.__sponges = sponges;
  window.__moonsnails = moonsnails;
  window.__swimmingcrabs = swimmingcrabs;
  window.__horseshoes = horseshoes;
  window.__anemones = anemones;
  window.__anemonefish = anemonefish;
  window.__gobies = gobies;
  window.__octopuses = octopuses;
  window.__otters = otters;
  window.__cam = camera;
})();
