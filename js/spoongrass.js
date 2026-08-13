/* ============================================================
   spoongrass.js — the spoon seagrass mat (BUILD_GUIDE §1, §7, §29).

   Spoon seagrass, *Halophila ovalis*: paired oval leaves the size of a
   thumbnail on a creeping rhizome, spread in thin mats over open sand.
   Third producer with a body, and the second half of what §1 listed as
   "tape seagrass, spoon seagrass" back in the v2 roster.

   IT IS NOT A SMALLER TAPE SEAGRASS. Building it as a recolour of
   seagrass.js would have been a waste of a species. Three things make
   it its own animal:

     1. IT GROWS HIGHER UP THE SHORE. Enhalus needs the lagoon and
        bottoms out at 0.95 m CD; Halophila is the pioneer, taking bare
        sand from 0.85 up to 1.70 — the sand flat. That matters more
        than it sounds: EVERY v1 grazer bottoms out at 1.0 m CD, so the
        tape meadow was food nothing on this shore could reach (§26 said
        so in as many words, and it is why the sea hare had to be
        invented to eat it). This mat is the first plant that grows
        where the animals already are. The dog conch works 1.0–1.8 and
        now has a second thing to eat inside its own band.

     2. THE TIDE BEAT IS COLOUR, NOT COLLAPSE. §26's whole payoff is a
        metre-long blade lying flat on the mud at a spring low. A 12 cm
        leaf has nowhere to fall — it is already flat. So the drained
        state is read the other way: exposed mat dulls olive and curls
        in on itself, submerged mat lifts and greens. Same throttled
        dirty-checked rebuild, a third of the work per leaf, because
        there is no rotation to recompute.

     3. IT REGROWS FAST. Halophila is the weed of the seagrass world —
        it colonises, gets cropped flat, and comes back, which is
        exactly why it survives being the plant dugongs plough. Half
        the tape meadow's GROW_SECS. That is also what makes it safe to
        put in a grazer's band: it can carry pressure Enhalus could not.

   ONE DRAW CALL. An InstancedMesh of single leaves, scattered in the
   opposed PAIRS the plant actually grows in, each sampling terrain
   height at its own x,z, per-instance colour.

   THE RESOURCE rides world.js's terrain node grid like the other two
   (see biofilm.js for why that grid), with its own crop array — a
   conch cropping the mat must not drain the lagoon meadow forty metres
   away. Published as world.spoonAt / world.grazeSpoon.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var COUNT = 20000;
  var ZONE = [0.85, 1.70];      // metres CD — the sand flat, above the tape meadow
  var Z_RANGE = [-10, 28];      // cross-shore extent, from world.js's PROFILE
  var LEAF = [0.085, 0.165];    // metres, tip to petiole
  var PAIR_GAP = 0.055;         // metres between the two leaves of a pair
  /* DENSE AND PATCHY, not thin and everywhere. The first pass spread
     11 000 leaves over the whole 10 600 m² band at about one leaf per
     square metre, which reads as scattered weeds — the word "mat" has
     to be earned. Same trick seagrass.js uses on the tape beds: pack
     the leaves into small patches and leave bare sand between them. The
     contrast is what makes it read as a plant that colonises ground
     rather than a texture someone painted on. */
  var MAT = [26, 58];           // leaf pairs per mat
  var MAT_R = 1.15;             // metres a mat spreads over — ~30 leaves/m² inside one
  /* THREE TIERS, for the same reason seagrass.js needs them, and it took
     two wrong passes to get here. Dense mats alone are not enough: 16 000
     leaves in 1.15 m patches cover about 8% of a band 280 m long and 38 m
     across, so the patches land a random ten metres apart and a close-up
     of ground the RESOURCE says is at full crop shows bare sand. Grouping
     the mats into beds puts the bare ground BETWEEN the beds instead of
     inside them, so anywhere the mat exists it is continuous enough to
     stand on, and the flat still has open sand across most of its width.
     A 12 cm leaf can never carpet 10 600 m² at any instance count worth
     paying for — the answer is to spend the leaves where they read. */
  var BED = [9, 19];            // mats per bed
  var BED_R = 6.0;              // metres a bed spreads over
  var TICK_SECS = 0.30;         // throttle on the wilt/crop rebuild

  /* Resource. Shallower and more exposed than the tape meadow's band,
     and much faster — this is the pioneer, not the climax plant. */
  var GROW_SECS = 95;
  var CAP_LUSH = [1.00, 1.50];  // full mat
  var CAP_EDGE = 0.20;          // what is left at the band's edges

  var GREEN = [0x4c8f4a, 0x579a4f, 0x428343, 0x63a557];
  var DULL = new THREE.Color(0x7d7a44);    // exposed and drying, or cropped to stubs

  var seed = 24601;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  /* One leaf: an OVAL, widest across the middle and rounded at both
     ends, which is the whole reason the plant is called what it is.
     Unit height, base at y=0 — the instance matrix scales it to length,
     and keeping the base at the origin means the pivot is the rhizome
     without any half-length correction (seagrass.js needs one because
     its blade box is centred). */
  function leafGeo() {
    /* WIDTH IS IN METRES, LENGTH IS NOT. The instance matrix scales y by
       the leaf's length and leaves x and z alone — exactly as in
       seagrass.js, whose 0.085 is a tape blade's real 8.5 cm width. Read
       as a proportion of length instead, the first pass shipped 42 cm
       lily pads on 12 cm stalks. A Halophila leaf is about half as wide
       as it is long, so at LEAF 0.085–0.165 that is a hair over 5 cm at
       the widest point of the oval. */
    var g = new THREE.BoxGeometry(0.055, 1, 0.007, 1, 3, 1);
    var p = g.attributes.position.array;
    for (var i = 0; i < p.length; i += 3) {
      var up = p[i + 1] + 0.5;                       // 0 base .. 1 tip
      /* sin gives the oval: pinched at the petiole, widest at the
         middle, closed again at the tip. The 0.14 floor stops the base
         collapsing to a needle. */
      var w = 0.14 + 0.86 * Math.sin(Math.PI * Math.min(1, Math.max(0, up)));
      p[i] *= w;
      p[i + 2] *= w;
      p[i + 1] = up;                                 // rebase: 0 at the rhizome
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  /* Lambert plus the same vertex sway seagrass.js patches in, but much
     smaller and keyed to the leaf tip only. A Halophila leaf in moving
     water nods; it does not stream, because there is not enough of it
     to stream. `uLimp` is the mat's submersion. */
  function material() {
    var m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    m.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uLimp = { value: 1 };
      shader.vertexShader = 'uniform float uTime;\nuniform float uLimp;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        'float spPhase = instanceMatrix[3].x * 0.21 + instanceMatrix[3].z * 0.13;\n' +
        'float spTip = max(0.0, position.y);\n' +
        'float spNod = sin(uTime * 1.4 + spPhase) * 0.5 + sin(uTime * 3.1 + spPhase * 1.9) * 0.18;\n' +
        /* Metres, like seagrass.js — the instance matrix scales y only,
           so this is world scale. A 12 cm leaf moving 2 cm is plenty. */
        'spNod *= spTip * spTip * uLimp * 0.022;\n' +
        'transformed.x += spNod;\n' +
        'transformed.z += spNod * 0.6;\n'
      );
      m.userData.shader = shader;
    };
    return m;
  }

  /* ------------------------------------------------------------
     build

     Same `ctx` handle world.js gives seagrass.js:
       { scene, N, heights, wet, indexAt, heightAt, waterAt, rocks,
         halfX, zMin, zMax }
     ------------------------------------------------------------ */
  function build(ctx) {
    var N = ctx.N, hArr = ctx.heights, wet = ctx.wet, indexAt = ctx.indexAt;

    /* ---------- the resource layer ---------- */
    var crop = new Float32Array(N), capacity = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      var h = hArr[i], c = 0;
      if (h >= ZONE[0] && h <= ZONE[1]) {
        if (h >= CAP_LUSH[0] && h <= CAP_LUSH[1]) c = 1;
        else if (h < CAP_LUSH[0]) c = CAP_EDGE + (1 - CAP_EDGE) * (h - ZONE[0]) / (CAP_LUSH[0] - ZONE[0]);
        else c = CAP_EDGE + (1 - CAP_EDGE) * (ZONE[1] - h) / (ZONE[1] - CAP_LUSH[1]);
      }
      capacity[i] = c;
      crop[i] = c * 0.88;
    }

    var BASE = 1 / GROW_SECS;
    function updateCrop(dt, daylight) {
      var k = BASE * (0.30 + 0.70 * daylight) * dt;
      for (var ci = 0; ci < N; ci++) {
        var cap = capacity[ci];
        if (cap <= 0) continue;
        var f = crop[ci];
        if (f >= cap) continue;
        /* Submersion drives it, same as the tape meadow — but this band
           is out of the water for a real part of every cycle, so the dry
           floor is higher than seagrass.js's 0.05. A Halophila mat on a
           drained flat is waiting, not dying. */
        f += k * (0.18 + 0.82 * wet[ci]) * (1 - f / cap + 0.2);
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

    /* ---------- scatter ---------- */
    var mat = material();
    var mesh = new THREE.InstancedMesh(leafGeo(), mat, COUNT);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.name = 'spoongrass';

    var lX = new Float32Array(COUNT), lZ = new Float32Array(COUNT), lY = new Float32Array(COUNT);
    var lLen = new Float32Array(COUNT), lYaw = new Float32Array(COUNT);
    var lTilt = new Float32Array(COUNT);         // its own resting angle off the ground
    var lNode = new Int32Array(COUNT);
    var lWilt = new Float32Array(COUNT);         // 0 lifted in water .. 1 flat and drying
    var lRGB = new Float32Array(COUNT * 3);
    var lLastWilt = new Float32Array(COUNT), lLastCrop = new Float32Array(COUNT);

    function onRock(x, z) {
      for (var r = 0; r < ctx.rocks.length; r++) {
        var rk = ctx.rocks[r], dx = rk.x - x, dz = rk.z - z;
        if (dx * dx + dz * dz < (rk.r + 0.4) * (rk.r + 0.4)) return true;
      }
      return false;
    }

    var col = new THREE.Color();
    var placed = 0, guard = 0;
    var beds = [];                               // kept for the debug probe only
    /* Beds, then mats, then pairs. Halophila spreads by a runner rather
       than clumping on a crown, so a mat is a continuous carpet with
       ragged edges rather than a tussock — and a BED is a cluster of
       those mats grown together, which is the scale you actually see one
       at on a flat this size. */
    while (placed < COUNT && guard++ < COUNT * 40) {
      var bedX = range(-ctx.halfX + 8, ctx.halfX - 8);
      var bedZ = range(Math.max(Z_RANGE[0], ctx.zMin + 2), Math.min(Z_RANGE[1], ctx.zMax - 2));
      if (ctx.heightAt(bedX, bedZ) < ZONE[0] || ctx.heightAt(bedX, bedZ) > ZONE[1]) continue;
      beds.push({ x: bedX, z: bedZ });
      var mats = Math.floor(range(BED[0], BED[1] + 1));
      for (var mt = 0; mt < mats && placed < COUNT - 1; mt++) {
      var ba = rand() * Math.PI * 2, bd = Math.sqrt(rand()) * BED_R;
      var matX = bedX + Math.cos(ba) * bd, matZ = bedZ + Math.sin(ba) * bd;
      var mh = ctx.heightAt(matX, matZ);
      if (mh < ZONE[0] || mh > ZONE[1]) continue;
      var pairs = Math.floor(range(MAT[0], MAT[1] + 1));
      for (var pr = 0; pr < pairs && placed < COUNT - 1; pr++) {
        var pa = rand() * Math.PI * 2, pd = Math.sqrt(rand()) * MAT_R;
        var cx = matX + Math.cos(pa) * pd, cz = matZ + Math.sin(pa) * pd;
        var ch = ctx.heightAt(cx, cz);
        if (ch < ZONE[0] || ch > ZONE[1]) continue;
        if (onRock(cx, cz)) continue;
        var cnode = indexAt(cx, cz);
        if (cnode < 0 || capacity[cnode] <= 0) continue;

        /* The PAIR. Halophila's leaves come two at a time off one node,
           opposed across the runner — so both leaves share a length, a
           node and a colour, and differ only by pointing 180° apart.
           Placing them independently loses the one thing that makes the
           plant recognisable close up. */
        var yaw = rand() * Math.PI * 2;
        var len = range(LEAF[0], LEAF[1]);
        var tilt = range(0.10, 0.42);            // even submerged it lies well over
        col.setHex(GREEN[Math.floor(rand() * GREEN.length)]).multiplyScalar(range(0.84, 1.16));
        for (var s = 0; s < 2; s++) {
          var dir = yaw + s * Math.PI;
          var gx = cx + Math.sin(dir) * PAIR_GAP, gz = cz + Math.cos(dir) * PAIR_GAP;
          var gh = ctx.heightAt(gx, gz);
          lX[placed] = gx; lZ[placed] = gz; lY[placed] = gh;
          lLen[placed] = len * range(0.92, 1.08);
          lYaw[placed] = dir;
          lTilt[placed] = tilt * range(0.9, 1.1);
          lNode[placed] = indexAt(gx, gz);
          lRGB[placed * 3] = col.r; lRGB[placed * 3 + 1] = col.g; lRGB[placed * 3 + 2] = col.b;
          mesh.setColorAt(placed, col);
          placed++;
        }
      }
      }
    }
    var COUNT_REAL = placed;
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
    for (i = placed; i < COUNT; i++) mesh.setMatrixAt(i, HIDE);

    ctx.scene.add(mesh);

    /* ---------- lift / wilt ----------
       Cheaper than seagrass.js's stand/collapse and deliberately so.
       The leaf's base is already at the geometry origin, so there is no
       half-length push to keep it out of the mud, and the swing is from
       its own resting tilt to nearly flat rather than through 90°.

       `wilt` 0 = lifted in water, 1 = laid over on drying sand. */
    var qTilt = new THREE.Quaternion(), qSpin = new THREE.Quaternion();
    var axis = new THREE.Vector3(), scl = new THREE.Vector3(), pos = new THREE.Vector3();
    var UPY = new THREE.Vector3(0, 1, 0);
    var mLeaf = new THREE.Matrix4();
    var FLAT = 1.40;                             // radians off vertical when fully wilted

    function placeLeaf(k, f) {
      var w = lWilt[k];
      /* Crop drives LENGTH, and it drives it hard — a cropped mat is
         stubs, not short leaves. 0.35 floor so a grazed node still shows
         something rather than blinking out. */
      var len = lLen[k] * (0.35 + 0.65 * f);
      var tilt = lTilt[k] + (FLAT - lTilt[k]) * w;
      var sd = Math.sin(lYaw[k]), cd = Math.cos(lYaw[k]);
      axis.set(cd, 0, -sd);
      qTilt.setFromAxisAngle(axis, tilt);
      qSpin.setFromAxisAngle(UPY, lYaw[k]);
      qTilt.multiply(qSpin);
      // base pinned at the rhizome — the geometry already starts at y=0
      pos.set(lX[k], lY[k] + 0.004, lZ[k]);
      scl.set(1, len, 1);
      mLeaf.compose(pos, qTilt, scl);
      mesh.setMatrixAt(k, mLeaf);
    }
    function cropOf(k) {
      var ci = lNode[k];
      if (ci < 0) return 1;
      var cap = capacity[ci];
      return cap > 0 ? crop[ci] / cap : 0;
    }
    /* Two things dull a leaf and they are different states of the plant:
       being cropped (less leaf) and being out of the water (the leaf it
       still has, drying). Both land on the same olive, which is what the
       mat actually goes. */
    function tintLeaf(k, f) {
      var o = k * 3;
      var d = Math.min(1, (1 - f) * 0.7 + lWilt[k] * 0.45);
      col.setRGB(lRGB[o], lRGB[o + 1], lRGB[o + 2]).lerp(DULL, d);
      mesh.setColorAt(k, col);
    }

    for (var k0 = 0; k0 < COUNT_REAL; k0++) {
      var f0 = cropOf(k0);
      lLastWilt[k0] = lWilt[k0]; lLastCrop[k0] = f0;
      placeLeaf(k0, f0); tintLeaf(k0, f0);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    /* ---------- update ---------- */
    var tickT = 0, limp = 1;
    function update(dt, t, daylight) {
      updateCrop(dt, daylight);

      if (mat.userData.shader) {
        mat.userData.shader.uniforms.uTime.value = t;
        mat.userData.shader.uniforms.uLimp.value = limp;
      }

      tickT -= dt;
      if (tickT > 0) return;
      tickT = TICK_SECS;

      /* Per leaf, from the water surface at its own spot — so a mat in a
         tide pool stays green and lifted while the flat around it has
         gone olive. This band is full of pools (world.js PROFILE puts
         them at 1.0–1.6), which is the whole reason it is worth
         sampling per leaf here rather than off world.tide. */
      var lifted = 0, dirty = false;
      for (var k = 0; k < COUNT_REAL; k++) {
        var surf = ctx.waterAt(lX[k], lZ[k]);
        var depth = surf === null ? -0.05 : surf - lY[k];
        var want = depth > 0.05 ? 0 : (depth < 0 ? 1 : 1 - depth / 0.05);
        if (want < 0.5) lifted++;
        var d = want - lWilt[k];
        if (Math.abs(d) > 0.002) {
          // wilts faster than it recovers, same asymmetry as the tape blade
          lWilt[k] += d * Math.min(1, (d > 0 ? 1.9 : 0.9) * TICK_SECS);
        }
        var f = cropOf(k);
        if (Math.abs(lWilt[k] - lLastWilt[k]) < 0.004 && Math.abs(f - lLastCrop[k]) < 0.01) continue;
        lLastWilt[k] = lWilt[k]; lLastCrop[k] = f;
        placeLeaf(k, f);
        tintLeaf(k, f);
        dirty = true;
      }
      limp = COUNT_REAL ? lifted / COUNT_REAL : 1;
      if (dirty) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;
      }
    }

    return {
      mesh: mesh,
      count: COUNT_REAL,
      crop: crop,
      capacity: capacity,
      update: update,
      at: at,
      graze: graze,
      cover: cover,
      // fraction of the mat still lifted in water — 0 on a drained flat
      beds: beds,
      lifted: function () { return limp; }
    };
  }

  window.SpoonGrass = { build: build };
})();
