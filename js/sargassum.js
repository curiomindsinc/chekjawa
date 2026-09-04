/* ============================================================
   sargassum.js — the brown seaweed canopy (BUILD_GUIDE §37, roster
   items 5-6, "Stage B").

   *Sargassum*, brown seaweed: a branching thallus up to 1.1 m long,
   gripping a boulder with a holdfast and standing off it on strings of
   air bladders while the tide is in. Fifth producer with a body, and
   the last one v1's roster ever asked for.

   FIRST, THE CORRECTION THIS FILE HAS TO MAKE OUT LOUD. ROSTER.md
   calls this "the brown seaweed of the low shore and boulders" — but
   world.js's boulder scatter has `if (gh < 1.7) continue;` (§37
   constraint 1): nothing solid is ever seeded below 1.7 m CD. A rock
   alga cannot live lower than the rock does. So *Sargassum*, exactly
   like *Ulva* one file over, ends up living in the barnacle's own
   band — 1.45-2.35 m CD, mid-shore into the boulders — not down on the
   low flat the roster description imagined. That is a property of
   this shore's terrain generator, not a licence taken here.

   THREE things make it its own species rather than a taller recolour
   of *Ulva* or a browned-out copy of the tape meadow:

     1. IT IS THE TALLEST THING HERE THAT IS NOT A TREE. Every other
        producer on this shore is ankle-high or flatter — a mat, a
        sheet, a lawn. A metre of standing thallus off a boulder has a
        silhouette you can pick out from across the flat, which is a
        job nothing else built so far does.

     2. IT IS ROCK-ONLY, WITH NO SEDIMENT FALLBACK. *Ulva* splits its
        population 60/40 sediment-to-rock because a sheet holds either
        just as readily. *Sargassum*'s holdfast is a real anchor, not
        contact-clinging, and it only ever grips stone — so unlike
        ulva.js there is no `onRock`/sediment branch here at all, only
        `RockField`. That is the whole reason it shares Ulva's band
        instead of a lower one of its own: it goes wherever the
        boulders are, and the boulders never go below 1.7 m.

     3. ITS TIDE BEAT IS THE TAPE MEADOW'S, ROTATED ONTO A ROCK, NOT
        A BLEACH. seagrass.js's whole payoff is a meadow standing in
        moving water and collapsing flat when the lagoon drains. This
        plant does the same two things, but "flat" is not flat ground
        here — it is DOWN THE ROCK FACE the holdfast is stuck to. The
        collapse heading is the DOWNSLOPE TANGENT at the attachment
        point: world "down" projected onto the tangent plane of the
        rock's own surface normal there, worked out ONCE at spawn (see
        "the placement" below) and reused for the life of the plant.
        Standing, by contrast, targets true vertical — buoyancy pulls a
        gas-bladdered thallus toward the surface regardless of which
        way the rock under it happens to lean. A flat "lies on the mud"
        collapse would have been seagrass.js with a new palette; a
        collapse that respects the rock's own slope is the reason this
        file exists instead of a `rotate: true` flag on that one.

     4. AIR BLADDERS ARE THE SIGNATURE, NOT A DETAIL. A big brown blade
        alone reads as kelp or as a drowned leaf. What makes a
        silhouette unmistakably *Sargassum* is the string of small gas
        floats along every frond, so they get their own InstancedMesh
        rather than being baked into the frond geometry as a texture
        nobody would see from six metres away.

   TWO INSTANCED MESHES ONLY: fronds and bladders. No separate holdfast
   or stipe geometry — a third or fourth mesh for parts nobody will
   look at up close is exactly what §35's moon-snail-collar rule warns
   against ("a receipt does not need real geometry if nobody will stand
   next to it"). Instead the "stipe" is implicit: every plant has a
   shared SPINE AXIS (the standing/collapsed blend below), and each
   frond's own base sits offset up that axis by its own fraction —
   Ulva's "holdfast is contact, not geometry" move, carried one step
   further so the bundle of frond bases converging at the attachment
   point reads as a stalk without one ever being drawn.

   POSED ANGLE-DRIVEN, NOT BY IK (§36's rule — nothing here is planted
   on the ground, so there is no foot to solve backward from). Each
   frond's direction is built by deriving a stable tangent pair at the
   plant's spine axis via cross product, then rotating that pair
   TOGETHER by the frond's own fixed bearing — §36's `putBasisRoll`
   fix applied here from the start rather than rediscovered: a flat
   blade whose direction changes every tick (the spine sweeps from
   vertical to down-the-rock-face and back) cannot be given a roll by
   hand-picking three fixed axes, because "fixed" is exactly what this
   axis is not.

   THE RESOURCE reuses the terrain node grid every other producer
   shares (see biofilm.js for why that grid), with the same
   deliberate simplification ulva.js documents: capacity is read off
   the node's raw terrain height, not the boulder's elevated cap
   height, because §37 constraint 1 already guarantees any usable rock
   sits with its base column inside this file's own 1.45-2.35 band.
   Published as world.sargAt / world.grazeSarg / world.sargassum.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var COUNT = 160;              // plants — sparse and individually distinct, not a mat
  var ZONE = [1.45, 2.35];      // metres CD — the barnacle boulders, see the header
  var TICK_SECS = 0.35;         // throttle on the stand/collapse + crop rebuild

  var FROND_RANGE = [5, 11];    // fronds per plant
  var LEN_RANGE = [0.55, 1.10]; // metres, the plant's own spine length
  var FROND_LEN_FRAC = [0.30, 0.60];  // a single frond's length, as a fraction of the spine
  var FROND_WIDTH = [0.045, 0.095];   // metres at the frond's widest point
  var BLADDER_RANGE = [1, 3];   // bladders strung along one frond
  var BLADDER_SIZE = [0.018, 0.038];  // metres, radius
  var LEN_FLOOR = 0.45;         // a grazed plant shrinks toward this, never to nothing
  var FLARE_STAND = [0.40, 0.95];     // radians a frond splays from the spine, submerged
  var FLARE_COLLAPSE = 0.10;    // radians it folds back to, drained — nearly flush with the spine
  var ALT_ANGLE = Math.PI;      // fronds emerge roughly opposed, like leaves on a stem

  var DEPTH_FULL = 0.20;        // metres of water over the holdfast to read as fully buoyed —
                                 // a bladdered frond does not need much clearance to lift off the rock

  /* Resource. Slowest producer on the shore, on purpose — see the
     header: this is the climax alga, not the pioneer. */
  var GROW_SECS = 380;
  var CAP_LUSH = [1.65, 2.10];
  var CAP_EDGE = 0.20;

  /* Olive-brown through amber — deliberately NOT any of the greens the
     other four producers use, so a mixed shot of the boulder band
     never reads as "more seagrass". Bladders get their own, lighter
     set: the gas-filled float catches more light than the blade does. */
  var FROND = [0x6b4a24, 0x7c5a2c, 0x8a6a34, 0x5c4420];
  var BLADDER = [0xcaa85a, 0xd9bb6e, 0xb99a4a];
  var TIRED = new THREE.Color(0x8f7c52);          // a grazed frond, sun-dulled and thin
  var TIRED_BLADDER = new THREE.Color(0xa08e64);

  var seed = 63219;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UPY = new THREE.Vector3(0, 1, 0);
  var FWD = new THREE.Vector3(0, 0, 1);

  /* One frond: a lanceolate blade, narrow at the base, widest a bit
     over a third of the way up, tapering to a near-point at the tip.
     X is NORMALIZED (-0.5..0.5, scaled to real width by the instance
     matrix — see "unit-local" below), Y rebased 0 (base) .. 1 (tip)
     the way spoongrass.js's leaf and ulva.js's sheet both are, so the
     instance matrix can position the base at the attachment point
     with no half-length correction. Z is a fixed, un-instanced
     thickness (see the sway shader for why that fixed axis matters).
     A cheap sawtooth riding the taper, growing toward the tip, is the
     one thing that keeps a static render from reading as a lettuce
     leaf (ulva.js) rather than a Sargassum blade. */
  function frondGeo() {
    var SEG = 16;
    var g = new THREE.BoxGeometry(1, 1, 0.010, 1, SEG, 1);
    var p = g.attributes.position.array;
    for (var i = 0; i < p.length; i += 3) {
      var up = p[i + 1] + 0.5;                      // 0 base .. 1 tip
      var prof = Math.sin(Math.PI * Math.pow(Math.min(1, up), 0.72));
      var tooth = Math.sin(up * 46.0) * 0.05 * up;
      var w = Math.max(0.03, prof + tooth);
      p[i] *= w;
      p[i + 1] = up;                                // rebase: base at the origin
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  // A bladder is a small sphere — position and uniform scale are the
  // whole story, so a low-poly unit sphere is plenty at 2000+ instances.
  function bladderGeo() { return new THREE.SphereGeometry(1, 6, 5); }

  /* Lambert plus a sway keyed to the population's mean standing state
     (`uSway`), same idea as seagrass.js's `uLimp`. THE ONE THING THAT
     IS NOT SHARED WITH ULVA/SPOONGRASS/SEAGRASS: the frond's instance
     matrix scales X (width) and Y (length) DIFFERENTLY per instance,
     but Z (thickness) is always 1 — fixed in the geometry itself, see
     frondGeo(). `#include <begin_vertex>` runs BEFORE the instance
     matrix is applied (ulva.js's comment explains why), so anything
     added to `transformed.z` here rides through that fixed scale-1
     axis untouched and lands as true world metres — spoongrass.js's
     own trick, just moved from the fixed-scale X axis it uses onto
     the fixed-scale Z axis this geometry has instead, because X here
     is a shaping axis (blade width) that varies per plant. A frond
     swaying front-to-back across its flat face reads correctly as
     water moving through a canopy of blades. */
  function frondMaterial() {
    var m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    m.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uSway = { value: 1 };
      shader.vertexShader = 'uniform float uTime;\nuniform float uSway;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        'float sgPhase = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.09;\n' +
        'float sgTip = max(0.0, position.y);\n' +
        'float sgSway = sin(uTime * 1.1 + sgPhase) * 0.5 + sin(uTime * 2.0 - sgPhase * 1.4) * 0.3;\n' +
        'sgSway *= sgTip * sgTip * uSway * 0.16;\n' +
        'transformed.z += sgSway;\n'
      );
      m.userData.shader = shader;
    };
    return m;
  }
  function bladderMaterial() { return new THREE.MeshLambertMaterial(); }

  /* ------------------------------------------------------------
     build

     Same `ctx` handle world.js gives every other producer:
       { scene, N, heights, wet, indexAt, heightAt, waterAt, rocks,
         halfX, zMin, zMax }
     ------------------------------------------------------------ */
  function build(ctx) {
    var N = ctx.N, hArr = ctx.heights, wet = ctx.wet, indexAt = ctx.indexAt;

    /* ---------- the resource layer ----------
       Same shape of curve as the other four producers, on the raw
       node height — see the header for why that is deliberately not
       rock-aware. */
    var crop = new Float32Array(N), capacity = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var h = hArr[i], c = 0;
      if (h >= ZONE[0] && h <= ZONE[1]) {
        if (h >= CAP_LUSH[0] && h <= CAP_LUSH[1]) c = 1;
        else if (h < CAP_LUSH[0]) c = CAP_EDGE + (1 - CAP_EDGE) * (h - ZONE[0]) / (CAP_LUSH[0] - ZONE[0]);
        else c = CAP_EDGE + (1 - CAP_EDGE) * (ZONE[1] - h) / (ZONE[1] - CAP_LUSH[1]);
      }
      capacity[i] = c;
      crop[i] = c * 0.85;
    }

    var BASE = 1 / GROW_SECS;
    function updateCrop(dt, daylight) {
      var k = BASE * (0.30 + 0.70 * daylight) * dt;
      for (var ci = 0; ci < N; ci++) {
        var cap = capacity[ci];
        if (cap <= 0) continue;
        var f = crop[ci];
        if (f >= cap) continue;
        f += k * (0.20 + 0.80 * wet[ci]) * (1 - f / cap + 0.2);
        crop[ci] = f > cap ? cap : f;
      }
    }

    function at(x, z) { var ci = indexAt(x, z); return ci < 0 ? 0 : crop[ci]; }
    function graze(x, z, want) {
      var ci = indexAt(x, z);
      if (ci < 0) return 0;
      var got = crop[ci];
      if (got > want) got = want;
      crop[ci] -= got;
      if (crop[ci] < 0) crop[ci] = 0;
      return got;
    }
    function cover() {
      var sum = 0, n = 0;
      for (var ci = 0; ci < N; ci++) {
        if (capacity[ci] < 0.5) continue;
        sum += crop[ci] / capacity[ci]; n++;
      }
      return n ? sum / n : 0;
    }

    /* ---------- the placement ----------
       Rock only — no sediment branch, unlike ulva.js (see the header).
       One anchor per plant, spread across whichever boulder caps
       RockField reports as usable in this band. */
    var rockWorld = { rocks: ctx.rocks, heightAt: ctx.heightAt };
    var usable = RockField.usable(rockWorld, { zone: ZONE, minR: 0.35, minH: 0.22, inset: 0.02 });
    var capPoint = RockField.capPoint;
    var tmpPt = {};

    var PLANT_CAP = COUNT;
    var FROND_CAP = COUNT * FROND_RANGE[1];              // 1760 at the current knobs
    var BLADDER_CAP = FROND_CAP * BLADDER_RANGE[1];      // 5280 at the current knobs

    var pX = new Float32Array(PLANT_CAP), pY = new Float32Array(PLANT_CAP), pZ = new Float32Array(PLANT_CAP);
    var pDX = new Float32Array(PLANT_CAP), pDY = new Float32Array(PLANT_CAP), pDZ = new Float32Array(PLANT_CAP);
    var pNode = new Int32Array(PLANT_CAP);
    var pLen = new Float32Array(PLANT_CAP);
    var pStand = new Float32Array(PLANT_CAP);            // 1 standing (buoyed) .. 0 collapsed on the rock
    var pLastStand = new Float32Array(PLANT_CAP), pLastCrop = new Float32Array(PLANT_CAP);
    var pFrondStart = new Int32Array(PLANT_CAP), pFrondCount = new Int32Array(PLANT_CAP);

    var fPlant = new Int32Array(FROND_CAP);
    var fBaseFrac = new Float32Array(FROND_CAP), fBearing = new Float32Array(FROND_CAP);
    var fFlareStand = new Float32Array(FROND_CAP), fLenFrac = new Float32Array(FROND_CAP);
    var fWidth = new Float32Array(FROND_CAP), fSpin = new Float32Array(FROND_CAP);
    var fBladderStart = new Int32Array(FROND_CAP), fBladderCount = new Int32Array(FROND_CAP);
    var fRGB = new Float32Array(FROND_CAP * 3);

    var bFrac = new Float32Array(BLADDER_CAP), bSide = new Float32Array(BLADDER_CAP);
    var bSize = new Float32Array(BLADDER_CAP);
    var bRGB = new Float32Array(BLADDER_CAP * 3);

    var patches = [];   // one entry PER PLANT — a metre-tall alga is its own click target,
                         // not a grain in a mat that needs sampling down (contrast seagrass.js)

    var col = new THREE.Color();
    var placedPlants = 0, frondCursor = 0, bladderCursor = 0, guard = 0;
    if (usable.length) {
      while (placedPlants < COUNT && guard++ < COUNT * 60) {
        var rk = usable[Math.floor(rand() * usable.length) % usable.length];
        var a = range(0, Math.PI * 2), d = range(0.10, 0.95) * rk.r;
        capPoint(rk, d, a, tmpPt);
        if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;
        if (tmpPt.ny < -0.20) continue;      // clearly overhanging underside — no plant grips upside down here
        var node = indexAt(tmpPt.x, tmpPt.z);
        if (node < 0 || capacity[node] <= 0) continue;

        // keep holdfasts from stacking on top of each other on the same boulder
        var tooClose = false;
        for (var pc = 0; pc < placedPlants; pc++) {
          var ddx = pX[pc] - tmpPt.x, ddy = pY[pc] - tmpPt.y, ddz = pZ[pc] - tmpPt.z;
          if (ddx * ddx + ddy * ddy + ddz * ddz < 0.30 * 0.30) { tooClose = true; break; }
        }
        if (tooClose) continue;

        var pi = placedPlants;
        pX[pi] = tmpPt.x; pY[pi] = tmpPt.y; pZ[pi] = tmpPt.z; pNode[pi] = node;

        /* The downslope tangent, worked out ONCE here — see the header.
           World "down" projected onto the rock's own tangent plane at
           this point. A cap dead centre (normal ~straight up) has no
           preferred downhill side, so that degenerate case falls back
           to a bearing seeded off this very draw rather than leaving
           the vector undefined. */
        var nx = tmpPt.nx, ny = tmpPt.ny, nz = tmpPt.nz;
        var dot = -ny;                       // (0,-1,0) . (nx,ny,nz)
        var tx = -dot * nx, ty = -1 - dot * ny, tz = -dot * nz;
        var tl = Math.hypot(tx, ty, tz);
        if (tl < 1e-4) {
          var fa = rand() * Math.PI * 2;
          tx = Math.cos(fa); ty = 0; tz = Math.sin(fa); tl = 1;
        }
        pDX[pi] = tx / tl; pDY[pi] = ty / tl; pDZ[pi] = tz / tl;

        pLen[pi] = range(LEN_RANGE[0], LEN_RANGE[1]);
        pStand[pi] = 1; pLastStand[pi] = -1; pLastCrop[pi] = -1;

        var nFronds = Math.floor(range(FROND_RANGE[0], FROND_RANGE[1] + 1));
        pFrondStart[pi] = frondCursor;
        var baseBearing = rand() * Math.PI * 2;
        var fi;
        for (fi = 0; fi < nFronds && frondCursor < FROND_CAP; fi++) {
          var k = frondCursor++;
          fPlant[k] = pi;
          fBaseFrac[k] = Math.min(0.92, (fi / Math.max(1, nFronds - 1)) * 0.85 + range(-0.05, 0.05));
          // ALT_ANGLE alternates each frond roughly opposite the last, like leaves on a
          // stem, jittered so a five-frond plant does not read as two flat fans
          fBearing[k] = baseBearing + fi * ALT_ANGLE + range(-0.45, 0.45);
          fFlareStand[k] = range(FLARE_STAND[0], FLARE_STAND[1]);
          fLenFrac[k] = range(FROND_LEN_FRAC[0], FROND_LEN_FRAC[1]);
          fWidth[k] = range(FROND_WIDTH[0], FROND_WIDTH[1]);
          fSpin[k] = rand() * Math.PI * 2;
          col.setHex(FROND[Math.floor(rand() * FROND.length)]).multiplyScalar(range(0.85, 1.15));
          fRGB[k * 3] = col.r; fRGB[k * 3 + 1] = col.g; fRGB[k * 3 + 2] = col.b;

          var nb = Math.floor(range(BLADDER_RANGE[0], BLADDER_RANGE[1] + 1));
          fBladderStart[k] = bladderCursor;
          var nbReal = 0, bi;
          for (bi = 0; bi < nb && bladderCursor < BLADDER_CAP; bi++) {
            var b = bladderCursor++;
            bFrac[b] = range(0.25, 0.92);
            bSide[b] = (bi % 2 === 0 ? 1 : -1) * range(0.6, 1.0);
            bSize[b] = range(BLADDER_SIZE[0], BLADDER_SIZE[1]);
            col.setHex(BLADDER[Math.floor(rand() * BLADDER.length)]).multiplyScalar(range(0.9, 1.1));
            bRGB[b * 3] = col.r; bRGB[b * 3 + 1] = col.g; bRGB[b * 3 + 2] = col.b;
            nbReal++;
          }
          fBladderCount[k] = nbReal;
        }
        pFrondCount[pi] = frondCursor - pFrondStart[pi];

        patches.push({ x: tmpPt.x, y: tmpPt.y, z: tmpPt.z });
        placedPlants++;
      }
    }
    var PLANT_COUNT_REAL = placedPlants;
    var FROND_COUNT_REAL = frondCursor;
    var BLADDER_COUNT_REAL = bladderCursor;

    var frondMesh = new THREE.InstancedMesh(frondGeo(), frondMaterial(), Math.max(FROND_CAP, 1));
    frondMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(FROND_CAP * 3), 3);
    frondMesh.frustumCulled = false;
    frondMesh.receiveShadow = true;
    frondMesh.castShadow = true;      // the one part of this plant tall enough to be worth it
    frondMesh.name = 'sargassum-fronds';

    var bladderMesh = new THREE.InstancedMesh(bladderGeo(), bladderMaterial(), Math.max(BLADDER_CAP, 1));
    bladderMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(BLADDER_CAP * 3), 3);
    bladderMesh.frustumCulled = false;
    bladderMesh.receiveShadow = true;
    bladderMesh.name = 'sargassum-bladders';

    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
    for (i = FROND_COUNT_REAL; i < FROND_CAP; i++) frondMesh.setMatrixAt(i, HIDE);
    for (i = BLADDER_COUNT_REAL; i < BLADDER_CAP; i++) bladderMesh.setMatrixAt(i, HIDE);

    ctx.scene.add(frondMesh);
    ctx.scene.add(bladderMesh);

    /* ---------- pose ----------
       One shared spine axis per plant (the stand/collapse blend), then
       every frond's own direction is built off it: a stable tangent
       pair at the spine via cross product (never degenerate — the
       fallback reference flips the same way put()/putBasis do
       elsewhere on this shore), rotated TOGETHER by the frond's fixed
       bearing to get its compass side of the "stem", then tipped away
       from the spine by `flare` to get its actual direction. See the
       header for why this is the `putBasisRoll` fix rather than three
       hand-picked axes — the spine itself sweeps every tick, so there
       is no fixed axis available to hand-pick from in the first place. */
    var spineAxis = new THREE.Vector3(), ref = new THREE.Vector3();
    var tang1 = new THREE.Vector3(), tang2 = new THREE.Vector3(), perp = new THREE.Vector3();
    var frondAxis = new THREE.Vector3(), basePos = new THREE.Vector3(), bPos = new THREE.Vector3();
    var qAlign = new THREE.Quaternion(), qSpin = new THREE.Quaternion();
    var scl = new THREE.Vector3();
    var mFrond = new THREE.Matrix4(), mBladder = new THREE.Matrix4();

    function cropFracOf(pi) {
      var ci = pNode[pi];
      if (ci < 0) return 1;
      var cap = capacity[ci];
      return cap > 0 ? crop[ci] / cap : 0;
    }

    function rebuildPlant(pi, f) {
      var s = pStand[pi];
      // world-up when buoyed, the stored downslope tangent when
      // drained — BLENDED, not switched, so the sweep between the two
      // is the animation itself
      spineAxis.set(pDX[pi], pDY[pi], pDZ[pi]).multiplyScalar(1 - s).addScaledVector(UPY, s);
      if (spineAxis.lengthSq() < 1e-8) spineAxis.copy(UPY); else spineAxis.normalize();

      ref.copy(Math.abs(spineAxis.y) > 0.9 ? FWD : UPY);
      tang1.crossVectors(spineAxis, ref).normalize();
      tang2.crossVectors(spineAxis, tang1).normalize();

      var totalLen = pLen[pi] * (LEN_FLOOR + (1 - LEN_FLOOR) * f);
      var start = pFrondStart[pi], count = pFrondCount[pi];
      var sizeF = LEN_FLOOR + (1 - LEN_FLOOR) * f;

      for (var fk = start; fk < start + count; fk++) {
        var bearing = fBearing[fk];
        perp.copy(tang1).multiplyScalar(Math.cos(bearing)).addScaledVector(tang2, Math.sin(bearing));
        var flare = FLARE_COLLAPSE + (fFlareStand[fk] - FLARE_COLLAPSE) * s;
        frondAxis.copy(spineAxis).multiplyScalar(Math.cos(flare)).addScaledVector(perp, Math.sin(flare));
        frondAxis.normalize();

        var baseLen = fBaseFrac[fk] * totalLen;
        basePos.set(pX[pi] + spineAxis.x * baseLen, pY[pi] + spineAxis.y * baseLen, pZ[pi] + spineAxis.z * baseLen);

        var flen = Math.max(0.03, fLenFrac[fk] * totalLen);
        qAlign.setFromUnitVectors(UPY, frondAxis);
        qSpin.setFromAxisAngle(frondAxis, fSpin[fk]);
        qAlign.premultiply(qSpin);
        scl.set(fWidth[fk], flen, 1);
        mFrond.compose(basePos, qAlign, scl);
        frondMesh.setMatrixAt(fk, mFrond);

        // tint by crop only — position is the tide's job, colour is the
        // resource's, exactly seagrass.js's split (not ulva.js's bleach)
        var of = fk * 3;
        col.setRGB(fRGB[of], fRGB[of + 1], fRGB[of + 2]).lerp(TIRED, (1 - f) * 0.8);
        frondMesh.setColorAt(fk, col);

        var bStart = fBladderStart[fk], bCount = fBladderCount[fk];
        for (var bk = bStart; bk < bStart + bCount; bk++) {
          var t = bFrac[bk];
          bPos.set(
            basePos.x + frondAxis.x * flen * t,
            basePos.y + frondAxis.y * flen * t,
            basePos.z + frondAxis.z * flen * t
          );
          bPos.addScaledVector(perp, bSide[bk] * fWidth[fk] * 0.4);
          var bs = bSize[bk] * sizeF;
          mBladder.makeScale(bs, bs, bs);
          mBladder.setPosition(bPos);
          bladderMesh.setMatrixAt(bk, mBladder);

          var ob = bk * 3;
          col.setRGB(bRGB[ob], bRGB[ob + 1], bRGB[ob + 2]).lerp(TIRED_BLADDER, (1 - f) * 0.8);
          bladderMesh.setColorAt(bk, col);
        }
      }
    }

    for (var pi0 = 0; pi0 < PLANT_COUNT_REAL; pi0++) {
      var f0 = cropFracOf(pi0);
      pLastStand[pi0] = pStand[pi0]; pLastCrop[pi0] = f0;
      rebuildPlant(pi0, f0);
    }
    frondMesh.instanceMatrix.needsUpdate = true;
    if (frondMesh.instanceColor) frondMesh.instanceColor.needsUpdate = true;
    bladderMesh.instanceMatrix.needsUpdate = true;
    if (bladderMesh.instanceColor) bladderMesh.instanceColor.needsUpdate = true;

    /* ---------- update ---------- */
    var tickT = 0, standFrac = 1;
    function update(dt, t, daylight) {
      updateCrop(dt, daylight);

      if (frondMesh.material.userData.shader) {
        frondMesh.material.userData.shader.uniforms.uTime.value = t;
        frondMesh.material.userData.shader.uniforms.uSway.value = standFrac;
      }

      tickT -= dt;
      if (tickT > 0) return;
      tickT = TICK_SECS;

      /* Per plant, from the water surface over its own holdfast — only
         160 of them, so there is no need for the per-instance sampling
         trick the thousand-instance mats need for tide pools; a whole
         plant is small enough to treat as one point. */
      var standingN = 0, dirty = false;
      for (var pi = 0; pi < PLANT_COUNT_REAL; pi++) {
        var surf = ctx.waterAt(pX[pi], pZ[pi]);
        var depth = surf === null ? -0.1 : surf - pY[pi];
        var want = depth <= 0 ? 0 : (depth >= DEPTH_FULL ? 1 : depth / DEPTH_FULL);
        if (want > 0.5) standingN++;
        var d = want - pStand[pi];
        if (Math.abs(d) > 0.003) {
          // collapses faster than it re-stands: the ebb drops off a
          // boulder quickly, but lifting a metre of wet thallus back
          // upright needs the flood to rise past it first — the same
          // directional asymmetry every producer on this shore uses,
          // for its own version of the same reason
          pStand[pi] += d * Math.min(1, (d < 0 ? 1.8 : 1.0) * TICK_SECS);
        }
        var f = cropFracOf(pi);
        if (Math.abs(pStand[pi] - pLastStand[pi]) < 0.004 && Math.abs(f - pLastCrop[pi]) < 0.01) continue;
        pLastStand[pi] = pStand[pi]; pLastCrop[pi] = f;
        rebuildPlant(pi, f);
        dirty = true;
      }
      standFrac = PLANT_COUNT_REAL ? standingN / PLANT_COUNT_REAL : 0;
      if (dirty) {
        frondMesh.instanceMatrix.needsUpdate = true;
        frondMesh.instanceColor.needsUpdate = true;
        bladderMesh.instanceMatrix.needsUpdate = true;
        bladderMesh.instanceColor.needsUpdate = true;
      }
    }

    return {
      frondMesh: frondMesh,
      bladderMesh: bladderMesh,
      count: PLANT_COUNT_REAL,
      frondCount: FROND_COUNT_REAL,
      bladderCount: BLADDER_COUNT_REAL,
      crop: crop,
      capacity: capacity,
      update: update,
      at: at,
      graze: graze,
      cover: cover,
      // fraction of the population currently buoyed upright — 0 with
      // every plant collapsed down its rock at a drained low
      standing: function () { return standFrac; },
      patches: patches               // [{x,y,z}] — one per plant, see above
    };
  }

  window.Sargassum = { build: build };
})();
