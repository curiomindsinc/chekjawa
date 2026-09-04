/* ============================================================
   ulva.js — sea lettuce (BUILD_GUIDE §37, roster items 5-6, "Stage A").

   *Ulva*, sea lettuce: a bright green sheet, two cells thick, that
   grips whatever it lands on — sand, mud or bare rock — with no
   proper root at all. Fourth producer with a body, and the first one
   that is not a plant.

   THREE things make it its own species rather than a green recolour
   of spoon grass:

     1. IT GROWS ON ROCK. Every producer built so far roots in
        something soft (seagrass.js's rhizome, spoongrass.js's runner).
        *Ulva* does not care — it holds a boulder exactly as readily as
        it holds sand, which makes it the first green thing living in
        the barnacle's own band (1.55-2.45 m CD straddles the mussel
        and barnacle zones) rather than down on the flat with the other
        two producers. A rock grazer up there finally has a PLANT to
        eat, not just film. That is also why this file needs
        RockField, which nothing green has needed before it.

     2. IT IS A SHEET, NOT A BLADE. Both seagrasses are built as a
        length scaled off a fixed cross-section — a strap or an oval,
        one dimension that matters. A sheet has no dominant axis: it
        is wide in two directions and thin in the third, which is
        worth zero triangles here because two cells of tissue is
        nothing to model as a solid. The geometry is a single ruffled
        plane, DoubleSide, with the ruffle baked into the vertices
        (§37 constraint 3 — a flat rectangle reads as a chip of paper,
        not a sheet of weed) so a static render already looks organic
        before a single instance is placed or animated.

     3. ITS TIDE BEAT IS BLEACH, NOT WILT. spoongrass.js dulls olive
        when it dries; the tape meadow falls flat. Real sea lettuce
        does neither — sun on an exposed sheet drives the chlorophyll
        pale, toward a washed-out whitish yellow-green, and the sheet
        itself shrivels down toward whatever it is lying on. Going
        PALER rather than darker under exposure is the one deliberate
        inversion in this file, and it is the whole reason a screenshot
        of a low-tide *Ulva* patch cannot be mistaken for a low-tide
        spoon grass mat.

   ONE InstancedMesh for the whole population, sediment sheets and rock
   sheets alike — the only difference between the two is the matrix
   (and, for rock sheets, which normal it was built from). See "the
   placement" below for why one unified record layout covers both.

   THE RESOURCE rides world.js's terrain node grid, same as biofilm,
   the tape meadow and the spoon mat (see biofilm.js for why that grid).
   Capacity is read straight off that node's terrain height, the same
   ZONE/taper test spoongrass.js uses — including under a rock sheet.
   That is a deliberate simplification, not an oversight: world.js's
   `drop()` never seeds a boulder below 1.7 m CD (§37 constraint 1), so
   every rock this file can reach already has its BASE column solidly
   inside Ulva's own 1.55-2.45 band, and a boulder's cap sits at most a
   few tens of centimetres above that base. Building a second,
   rock-aware capacity pass to chase that difference would be real
   complexity for a correction smaller than the taper band already
   absorbs, so a rock sheet's crop is read off the same node a sediment
   sheet beside the boulder would use. Published as world.ulvaAt /
   world.grazeUlva / world.ulva.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var COUNT = 9000;
  var ZONE = [1.55, 2.45];      // metres CD — mid flat into the barnacle boulders
  var Z_RANGE = [-10, 40];      // cross-shore extent, generous like spoongrass.js's
  var SEDIMENT_FRAC = 0.60;     // rest goes on rock — the split the spec calls for
  var SHEET = [0.06, 0.20];     // metres, the sheet's own footprint
  var TICK_SECS = 0.30;         // throttle on the bleach/crop rebuild

  /* Two tiers, patch then sheet — one fewer than spoongrass.js needs.
     A 6-20 cm sheet is a much bigger unit of "cover" than a 12 cm
     Halophila leaf, so one level of clumping (a patch of sheets
     jostling the same stretch of ground or the same rock) is already
     enough to read as a growth rather than scattered confetti; a third,
     regional tier would just be spending sheets nobody can tell apart
     at that distance. */
  var PATCH_R = 0.85;           // metres a patch spreads over
  var PATCH_SHEETS = [10, 22];  // sheets per patch

  /* Resource. Same shape of curve as spoongrass.js — a pioneer's, not
     a climax plant's — but slower: this is the toughest thing on the
     flat to graze flat, not the fastest to bounce back from it. */
  var GROW_SECS = 130;
  var CAP_LUSH = [1.70, 2.15];  // full cover
  var CAP_EDGE = 0.20;          // what is left at the band's edges

  /* Bright, saturated sea-lettuce green — NOT spoongrass.js's olive
     palette. The bleach target is a washed-out, whitish yellow-green:
     paler, not muddier, than anything a dulling plant would go. */
  var GREEN = [0x35b258, 0x3fc667, 0x2fa04c, 0x4bd473];
  var BLEACH = new THREE.Color(0xe6e4ad);
  var SHRIVEL_MAX = 0.42;       // fraction a fully bleached sheet shrinks by

  var seed = 51121;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  var UPY = new THREE.Vector3(0, 1, 0);

  /* One sheet: a unit plane in the local X-Z (Y is the face normal —
     the axis every placement below aligns to whatever surface the
     sheet is holding onto), ruffled by a two-frequency sinusoid keyed
     to angle and radius so the free edge visibly waves while the
     centre stays closer to true — a lettuce leaf's actual silhouette,
     not a chip cut from a box. computeVertexNormals afterward so the
     ruffle actually catches light instead of shading like a flat card. */
  function sheetGeo() {
    var SEG = 7;
    var g = new THREE.PlaneGeometry(1, 1, SEG, SEG);
    g.rotateX(-Math.PI / 2);      // was XY with +Z normal; now XZ with +Y normal
    var p = g.attributes.position.array;
    for (var i = 0; i < p.length; i += 3) {
      var x = p[i], z = p[i + 2];
      var r = Math.min(1, Math.sqrt(x * x + z * z) * 2);   // 0 centre .. 1 at the rim
      var a = Math.atan2(z, x);
      var ruffle = (Math.sin(a * 5 + r * 6.0) * 0.6 + Math.sin(a * 2.3 - r * 3.0) * 0.4);
      p[i + 1] = ruffle * 0.09 * Math.pow(r, 1.7);
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  /* Lambert plus a BILLOW, not a nod. spoongrass.js's leaf sways at the
     tip because there is only a tip to move; a sheet has no single
     point that matters, so the whole surface ripples as a travelling
     wave across its width, keyed to `uBillow` (this population's mean
     submersion, the same idea as spoongrass.js's `uLimp`). Submerged,
     the sheet visibly moves; drained, `uBillow` falls toward zero and
     it goes still — a shrivelled sheet on dry sand does not billow.

     UNIT-LOCAL SPACE, NOT METRES. spoongrass.js can add a metre offset
     before `#include <instancing_vertex>` runs because its instance
     matrix leaves x/z at scale 1 and only scales length — an addition
     made pre-instancing survives untouched. A sheet's instance matrix
     scales ALL THREE axes down to its own 6-20 cm size, so anything
     added here gets carried through that same scale a moment later.
     The amplitude below is chosen in the geometry's own unit space
     (sheetGeo()'s ruffle lives in the same 0-0.09 range) for exactly
     that reason: it lands as a fraction of each sheet's OWN size once
     scaled, which is the correct behaviour anyway — a big sheet should
     billow with a bigger physical amplitude than a small one. */
  function material() {
    var m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    m.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uBillow = { value: 1 };
      shader.vertexShader = 'uniform float uTime;\nuniform float uBillow;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        'float ulPhase = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17;\n' +
        'float ulWave = sin(uTime * 1.7 + position.x * 5.0 + ulPhase) * 0.5\n' +
        '             + sin(uTime * 2.6 - position.z * 4.0 + ulPhase * 1.6) * 0.5;\n' +
        'transformed.y += ulWave * uBillow * 0.09;\n'
      );
      m.userData.shader = shader;
    };
    return m;
  }

  /* ------------------------------------------------------------
     build

     Same `ctx` handle world.js gives spoongrass.js:
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

    /* ---------- the placement ----------
       ONE unified record layout for both tiers: {x,y,z, nx,ny,nz, spin}.
       A sediment sheet's normal is always straight up — (0,1,0) — and a
       rock sheet's normal is whatever RockField.capPoint reports at its
       spot. Aligning local +Y to that normal and spinning about it is
       the exact same operation for both (mussels.js's `setBody`, with
       no `lean` term — a sheet lies flush, it does not tip off-normal
       the way a shelled animal balancing on a byssus does), so the
       placement math below never has to branch on which tier a sheet
       came from once its normal is known. */
    function onRock(x, z) {
      for (var r = 0; r < ctx.rocks.length; r++) {
        var rk = ctx.rocks[r], dx = rk.x - x, dz = rk.z - z;
        if (dx * dx + dz * dz < (rk.r + 0.4) * (rk.r + 0.4)) return true;
      }
      return false;
    }

    var rockWorld = { rocks: ctx.rocks, heightAt: ctx.heightAt };
    var usable = RockField.usable(rockWorld, { zone: ZONE, minR: 0.35, minH: 0.20, inset: 0.015 });
    var capPoint = RockField.capPoint;
    var tmpPt = {};

    var sites = [];   // [{x,y,z,nx,ny,nz}] — patch anchors, sediment and rock mixed
    var sedTarget = COUNT * SEDIMENT_FRAC, rockTarget = COUNT - sedTarget;
    var guard = 0;

    /* sediment anchors */
    var sedPlaced = 0;
    while (sedPlaced < sedTarget && guard++ < COUNT * 20) {
      var sx = range(-ctx.halfX + 6, ctx.halfX - 6);
      var sz = range(Math.max(Z_RANGE[0], ctx.zMin + 2), Math.min(Z_RANGE[1], ctx.zMax - 2));
      var sh = ctx.heightAt(sx, sz);
      if (sh < ZONE[0] || sh > ZONE[1]) continue;
      if (onRock(sx, sz)) continue;
      sites.push({ x: sx, y: sh, z: sz, nx: 0, ny: 1, nz: 0, rock: false });
      sedPlaced += Math.floor(range(PATCH_SHEETS[0], PATCH_SHEETS[1] + 1));
    }

    /* rock anchors — one per RockField cap, jittered like mussels.js's
       cluster seed rather than one sheet per boulder */
    var rockPlaced = 0;
    if (usable.length) {
      guard = 0;
      while (rockPlaced < rockTarget && guard++ < COUNT * 20) {
        var rk = usable[Math.floor(rand() * usable.length) % usable.length];
        var ra = range(0, Math.PI * 2), rd = range(0.1, 0.9) * rk.r;
        capPoint(rk, rd, ra, tmpPt);
        if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1]) continue;
        if (tmpPt.ny < 0.15) continue;      // near-vertical face — not worth a flush sheet
        sites.push({ x: tmpPt.x, y: tmpPt.y, z: tmpPt.z, nx: tmpPt.nx, ny: tmpPt.ny, nz: tmpPt.nz, rock: true, rk: rk, a: ra, d: rd });
        rockPlaced += Math.floor(range(PATCH_SHEETS[0], PATCH_SHEETS[1] + 1));
      }
    }

    var uX = new Float32Array(COUNT), uY = new Float32Array(COUNT), uZ = new Float32Array(COUNT);
    var uNX = new Float32Array(COUNT), uNY = new Float32Array(COUNT), uNZ = new Float32Array(COUNT);
    var uSpin = new Float32Array(COUNT), uSize = new Float32Array(COUNT), uStretch = new Float32Array(COUNT);
    var uNode = new Int32Array(COUNT);
    var uBleach = new Float32Array(COUNT);       // 0 saturated & billowing .. 1 bleached & shrivelled
    var uRGB = new Float32Array(COUNT * 3);
    var uLastBleach = new Float32Array(COUNT), uLastCrop = new Float32Array(COUNT);

    var mesh = new THREE.InstancedMesh(sheetGeo(), material(), COUNT);
    var mat = mesh.material;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.name = 'ulva';

    var col = new THREE.Color();
    var placed = 0;
    for (var si = 0; si < sites.length && placed < COUNT; si++) {
      var site = sites[si];
      var n = Math.floor(range(PATCH_SHEETS[0], PATCH_SHEETS[1] + 1));
      for (var sc = 0; sc < n && placed < COUNT; sc++) {
        var px, py, pz, nx, ny, nz;
        if (!site.rock) {
          var jx = site.x + range(-PATCH_R, PATCH_R), jz = site.z + range(-PATCH_R, PATCH_R);
          var jh = ctx.heightAt(jx, jz);
          if (jh < ZONE[0] || jh > ZONE[1] || onRock(jx, jz)) continue;
          px = jx; py = jh; pz = jz; nx = 0; ny = 1; nz = 0;
        } else {
          var jd = Math.max(0.03, site.d + range(-PATCH_R, PATCH_R));
          if (jd > site.rk.r * 0.98) continue;
          var ja = site.a + range(-1, 1) * (PATCH_R / Math.max(0.3, site.d));
          capPoint(site.rk, jd, ja, tmpPt);
          if (tmpPt.y < ZONE[0] || tmpPt.y > ZONE[1] || tmpPt.ny < 0.12) continue;
          px = tmpPt.x; py = tmpPt.y; pz = tmpPt.z; nx = tmpPt.nx; ny = tmpPt.ny; nz = tmpPt.nz;
        }
        var node = indexAt(px, pz);
        if (node < 0 || capacity[node] <= 0) continue;

        uX[placed] = px; uY[placed] = py; uZ[placed] = pz;
        uNX[placed] = nx; uNY[placed] = ny; uNZ[placed] = nz;
        uSpin[placed] = rand() * Math.PI * 2;
        uSize[placed] = range(SHEET[0], SHEET[1]);
        uStretch[placed] = range(0.82, 1.22);      // X vs Z aspect, an organic sheet is never round
        uNode[placed] = node;
        col.setHex(GREEN[Math.floor(rand() * GREEN.length)]).multiplyScalar(range(0.85, 1.15));
        uRGB[placed * 3] = col.r; uRGB[placed * 3 + 1] = col.g; uRGB[placed * 3 + 2] = col.b;
        mesh.setColorAt(placed, col);
        placed++;
      }
    }
    var COUNT_REAL = placed;
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
    for (i = placed; i < COUNT; i++) mesh.setMatrixAt(i, HIDE);

    ctx.scene.add(mesh);

    /* ---------- click targets ----------
       Same reasoning as spoongrass.js: thousands of sheets is nothing
       to draw and everything to click, so a stride through the real
       placed positions stands in for the population. */
    var patches = [];
    var PATCH_TARGET = 50;
    var patchStride = Math.max(1, Math.floor(COUNT_REAL / PATCH_TARGET));
    for (var pI = 0; pI < COUNT_REAL; pI += patchStride) {
      patches.push({ x: uX[pI], y: uY[pI], z: uZ[pI] });
    }

    /* ---------- placement / tint ----------
       `placeSheet` aligns local +Y to the sheet's own normal (world up
       for sediment, the rock's outward normal for a rock sheet — see
       "the placement" above) and spins about it, then scales the
       whole thing by crop (long-term regrowth: bigger sheet when the
       patch is full) times a bleach shrink (immediate tide state: a
       sun-struck sheet visibly shrivels). Colour takes the opposite
       split the spec calls for — crop never touches colour, bleach is
       the only thing that does — so the two readings stay legible as
       separate causes rather than blurring into one dial. */
    var qb = new THREE.Quaternion(), qSpin = new THREE.Quaternion();
    var nrm = new THREE.Vector3(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    var mSheet = new THREE.Matrix4();
    var SIZE_FLOOR = 0.30;      // a grazed patch still shows stubs, not nothing

    function placeSheet(k, f) {
      var shrink = 1 - SHRIVEL_MAX * uBleach[k];
      var s = uSize[k] * (SIZE_FLOOR + (1 - SIZE_FLOOR) * f) * shrink;
      nrm.set(uNX[k], uNY[k], uNZ[k]);
      qb.setFromUnitVectors(UPY, nrm);
      qSpin.setFromAxisAngle(UPY, uSpin[k]);
      qb.multiply(qSpin);       // spin about local +Y BEFORE the normal alignment carries it
      pos.set(uX[k], uY[k] + 0.003, uZ[k]);
      scl.set(s * uStretch[k], Math.max(0.02, s), s / uStretch[k]);
      mSheet.compose(pos, qb, scl);
      mesh.setMatrixAt(k, mSheet);
    }
    function cropOf(k) {
      var ci = uNode[k];
      if (ci < 0) return 1;
      var cap = capacity[ci];
      return cap > 0 ? crop[ci] / cap : 0;
    }
    function tintSheet(k) {
      var o = k * 3;
      col.setRGB(uRGB[o], uRGB[o + 1], uRGB[o + 2]).lerp(BLEACH, uBleach[k]);
      mesh.setColorAt(k, col);
    }

    for (var k0 = 0; k0 < COUNT_REAL; k0++) {
      var f0 = cropOf(k0);
      uLastBleach[k0] = uBleach[k0]; uLastCrop[k0] = f0;
      placeSheet(k0, f0); tintSheet(k0);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    /* ---------- update ---------- */
    var tickT = 0, billow = 1;
    function update(dt, t, daylight) {
      updateCrop(dt, daylight);

      if (mat.userData.shader) {
        mat.userData.shader.uniforms.uTime.value = t;
        mat.userData.shader.uniforms.uBillow.value = billow;
      }

      tickT -= dt;
      if (tickT > 0) return;
      tickT = TICK_SECS;

      /* Per sheet, from the water surface at its own spot — a sheet
         inside a tide pool stays saturated and green while the flat
         around it has gone pale, exactly the reason spoongrass.js
         samples per leaf rather than off world.tide. */
      var lifted = 0, dirty = false;
      for (var k = 0; k < COUNT_REAL; k++) {
        var surf = ctx.waterAt(uX[k], uZ[k]);
        var depth = surf === null ? -0.05 : surf - uY[k];
        var want = depth > 0.05 ? 0 : (depth < 0 ? 1 : 1 - depth / 0.05);
        if (want < 0.5) lifted++;
        var d = want - uBleach[k];
        if (Math.abs(d) > 0.002) {
          // bleaches (dries) faster than it recovers when reflooded —
          // the same directional asymmetry spoongrass.js's wilt uses,
          // for the same reason: water leaves fast, tissue rehydrates
          // more slowly than it lost it
          uBleach[k] += d * Math.min(1, (d > 0 ? 1.7 : 1.0) * TICK_SECS);
        }
        var f = cropOf(k);
        if (Math.abs(uBleach[k] - uLastBleach[k]) < 0.004 && Math.abs(f - uLastCrop[k]) < 0.01) continue;
        uLastBleach[k] = uBleach[k]; uLastCrop[k] = f;
        placeSheet(k, f);
        tintSheet(k);
        dirty = true;
      }
      billow = COUNT_REAL ? lifted / COUNT_REAL : 1;
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
      // fraction of the population still saturated/billowing — 0 on a
      // fully drained, bleached flat
      lifted: function () { return billow; },
      patches: patches               // [{x,y,z}] — click targets, see above
    };
  }

  window.Ulva = { build: build };
})();
