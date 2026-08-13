/* ============================================================
   world.js — Chek Jawa intertidal: terrain transect, tide pools,
   the moving waterline, and the (tide-independent) day/night sky.

   VERTICAL UNIT IS METRES ABOVE CHART DATUM, EVERYWHERE — terrain
   heights, the tide, pool rims, mesh y positions. `columnHeight <
   world.tide` means submerged, no conversion. See tide.js.

   Horizontal is metres too: a 96x96 grid of 1.5 m columns = a 144 m
   square of shore, landward (-Z) to seaward (+Z).

   The one seam every other file must use is `world.waterAt(x, z)`:
   it returns the water SURFACE height at that column or null if dry,
   and it accounts for tide pools. Nothing outside this file should
   read `world.tide` to decide whether something is underwater — that
   answer is wrong inside a pool.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- deterministic randomness (same generator as savanna) ---------- */
  var seed = 41778;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  /* Lattice value-noise, hashed rather than drawn from rand() so terrain
     detail doesn't depend on how many props got scattered first. */
  function hash2(i, j) {
    var s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function vnoise(x, z) {
    var xi = Math.floor(x), zi = Math.floor(z);
    var xf = smooth(x - xi), zf = smooth(z - zi);
    var a = hash2(xi, zi), b = hash2(xi + 1, zi);
    var c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
    return (a + (b - a) * xf) * (1 - zf) + (c + (d - c) * xf) * zf;
  }
  function fbm(x, z, freq, oct) {
    var sum = 0, amp = 1, norm = 0;
    for (var o = 0; o < oct; o++) {
      sum += amp * (vnoise(x * freq, z * freq) - 0.5);
      norm += amp; amp *= 0.5; freq *= 2.1;
    }
    return sum / norm;   // -0.5 .. 0.5
  }

  /* ---------- grid ----------
     ANISOTROPIC on purpose. This world is a transect: essentially everything —
     the profile, the bands, the colour ramp, the waterline gradient — varies
     across-shore (z) and almost nothing varies along-shore (x). So z keeps
     1.5 m cells and x gets 3 m ones, which buys a 420 m-wide shore for barely
     more nodes than the old 144 m square.

     Heights live on grid NODES (not cell centres) so the terrain surface can
     be one smooth mesh. Node index is always `a * NXB + b`. */
  var GRIDX = 100, GRIDZ = 96;
  var CELLX = 3.0, CELLZ = 1.5;
  var NXA = GRIDX + 1, NXB = GRIDZ + 1;      // node counts along x and z
  var SPANX = GRIDX * CELLX;                 // 300 m along-shore
  var SPANZ = GRIDZ * CELLZ;                 // 144 m across-shore
  var HALFX = SPANX / 2;                     // 150 m
  var HALFZ = SPANZ / 2;                     // 72 m
  var CELL_AREA = CELLX * CELLZ;
  /* Bottom of the cross-section. Deep enough that the plot reads as a solid
     block of shore lifted out of the ground — at -2.4 the skirt was a thin
     brown line under the seaward edge and the whole thing looked like a sheet
     of paper floating in the haze. */
  var BASE_Y = -9;

  /* ---------- THE SIM AREA ----------
     The world IS the plot: 300 x 144 m, and NOTHING exists beyond it. No wider
     scenic shore, no coastal-forest backdrop, no open-ocean plane. An earlier
     build had all three, on the theory that a shore running off-frame reads
     better than one that visibly ends — the call is that showing ground
     nothing will ever live on is worse than showing an edge.

     So the terrain is cut off at the boundary and the cut is DRESSED: a
     sediment skirt drops from the rim to the base (see build), making it a
     deliberate cross-section through the shore — a transect diorama, or a tank
     — rather than a slab that just stops. The edge is meant to be seen; it
     only has to look intentional.

     Sim bounds and world bounds are the same rectangle. The helpers stay as
     the API every spawn and wander target goes through, so that remains true
     even if the two ever diverge again. */
  var SIM_HALF_X = HALFX;
  var SIM_Z_MIN = -HALFZ, SIM_Z_MAX = HALFZ;
  /* Height quantisation. Deliberately tiny: at 0.02 m the shore is nearly
     flat enough that a single quantisation step spans several columns, and
     the exposed sliver of each column's side wall drew as a dark contour line
     across the whole flat — read as a rendering artifact, not as terracing. */
  var HQ = 0.005;

  /* ---------- the transect (§4 of BUILD_GUIDE) ----------
     z is cross-shore: -72 = landward (mangrove), +72 = seaward (channel).
     Heights are metres CD and are cross-checked against tide.js's envelope:
       neap  low 1.00  /  high 2.20
       spring low 0.13  /  high 3.10
     so each band exposes at a genuinely different point in the cycle. */
  var PROFILE = [
    [-72,  3.05],   // back mud / mangrove fringe — floods only at spring high
    [-56,  2.88],
    [-48,  2.72],   // barnacle + oyster boulders 2.2–2.8
    [-34,  2.22],
    [-22,  2.02],   // fiddler crab mudflat 1.8–2.2
    [-10,  1.80],
    [ -4,  1.62],   // sand flat + tide pools 1.0–1.6
    [ 22,  1.04],
    [ 34,  0.70],   // seagrass lagoon 0.3–0.7 — spring lows only
    [ 44,  0.32],
    [ 50,  0.10],   // runnel behind the bar — becomes the biggest pool
    [ 56,  0.25],   // sandbar crest
    [ 62, -0.18],
    [ 72, -0.55]    // subtidal channel — never exposed
  ];
  function profileAt(z) {
    if (z <= PROFILE[0][0]) return PROFILE[0][1];
    for (var i = 1; i < PROFILE.length; i++) {
      if (z <= PROFILE[i][0]) {
        var a = PROFILE[i - 1], b = PROFILE[i];
        var t = smooth((z - a[0]) / (b[0] - a[0]));
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return PROFILE[PROFILE.length - 1][1];
  }

  /* A real shore's bands are not ruler-straight. Everything that reads the
     transect — profile, band, colour — goes through this warped z instead of
     the raw one, which curves the whole zonation in a single place. Two
     incommensurate wavelengths so the curve never looks periodic. */
  function zEff(x, z) {
    return z + 6.5 * Math.sin(x * 0.031) + 4.0 * Math.cos(x * 0.017 + 1.3) + fbm(x, 0, 0.02, 2) * 9;
  }

  /* The map's side edges are an artificial cut, not a real shore feature, so
     they taper down into deep water. The width of the exposed shore WOBBLES
     along the transect rather than being a constant — a straight-sided taper
     gave the flat a squared-off plan-form that read as a diorama slab no
     matter how nicely the surface itself was shaded. Two incommensurate sines
     plus noise, same trick as zEff, so the coastline never looks periodic. */
  /* No lateral taper any more. The shore used to shelve into deep water at the
     map's sides to hide the cut; now the cut IS the presentation (a
     cross-section through the shore), so the bands run unbroken to both edges
     and the skirt dresses the rim. Tapering here would only throw away
     habitat at the two ends of the plot. */

  /* Drainage creeks. Every real tidal flat is cut by sinuous channels that
     carry the ebb off it, and they do more to kill the "flat slab" read than
     any amount of surface noise. Each is a shallow sinuous trough that fades
     out landward, so it always runs downhill to the sea and never ponds.
     Kept clear of the BASINS below — a creek that clipped a basin would drain
     it and cost a tide pool. */
  var CREEKS = (function () {
    var out = [], n = 11, step = (SPANX - 40) / n;
    for (var i = 0; i < n; i++) {
      out.push({
        x0: -HALFX + 20 + step * (i + 0.5) + range(-9, 9),
        amp: range(7, 15),
        k: range(0.028, 0.058),
        ph: rand() * Math.PI * 2,
        w: range(4.0, 7.0),
        d: range(0.24, 0.36),
        zFrom: range(-12, 24)              // creek heads start anywhere on the sand flat
      });
    }
    return out;
  })();
  function creekCentre(c, z) { return c.x0 + c.amp * Math.sin(z * c.k + c.ph); }
  function creekCut(x, z) {
    var cut = 0;
    for (var i = 0; i < CREEKS.length; i++) {
      var c = CREEKS[i];
      if (z < c.zFrom) continue;
      var centre = creekCentre(c, z);
      var r = Math.abs(x - centre) / c.w;
      if (r >= 1) continue;
      // deepens over the first 12 m so the creek head fades in, not steps in
      var grow = Math.min(1, (z - c.zFrom) / 12);
      var prof = 1 - r * r;
      cut = Math.max(cut, c.d * prof * prof * grow);
    }
    return cut;
  }

  /* Band lookup — drives roughness, colour keys and (later) where species
     spawn. Keyed off z, not off height, so a boulder stays a boulder even
     where noise has pushed it out of its nominal height range. */
  function bandAt(z) {
    if (z < -56) return 'mangrove';
    if (z < -34) return 'boulder';
    if (z < -8)  return 'mudflat';
    if (z <  26) return 'sandflat';
    if (z <  46) return 'lagoon';
    if (z <  60) return 'sandbar';
    return 'channel';
  }

  /* Dry colours per band, as a GRADIENT down the shore rather than a lookup
     table. A hard per-band colour made the transect read as painted stripes;
     sediment actually grades into the next band over metres. Keys are at band
     centres and are blended with the same smoothstep the profile uses, so
     colour boundaries and height boundaries move together. */
  var COLOR_KEYS = [
    [-72, 0x63563c],   // back mud / mangrove
    [-45, 0x928c7e],   // barnacle boulders — pale grey rock
    [-21, 0x74603f],   // fiddler mudflat — dark wet mud
    [  8, 0xd0c095],   // sand flat — pale sand, the brightest band on the shore
    [ 36, 0x7b8c47],   // seagrass lagoon — green
    [ 53, 0xdfd3ac],   // sandbar
    [ 68, 0x556660]    // subtidal channel
  ].map(function (k) { return [k[0], new THREE.Color(k[1])]; });

  function colorAtZ(out, z) {
    if (z <= COLOR_KEYS[0][0]) return out.copy(COLOR_KEYS[0][1]);
    for (var i = 1; i < COLOR_KEYS.length; i++) {
      if (z <= COLOR_KEYS[i][0]) {
        var a = COLOR_KEYS[i - 1], b = COLOR_KEYS[i];
        return out.copy(a[1]).lerp(b[1], smooth((z - a[0]) / (b[0] - a[0])));
      }
    }
    return out.copy(COLOR_KEYS[COLOR_KEYS.length - 1][1]);
  }

  // Kept for the gauge legend and for anything that wants one flat swatch
  // per band; the terrain itself uses the gradient above.
  var BAND_DRY = {
    mangrove: 0x6d6047,
    boulder:  0x8b8578,
    mudflat:  0x7d6c50,
    sandflat: 0xc3b48c,
    lagoon:   0x8b9663,
    sandbar:  0xd9cca6,
    channel:  0x5e6d64
  };
  var FOAM = new THREE.Color(0xeef6f2);

  /* ---------- tide-pool basins carved into the sand flat ----------
     Hand-placed ellipses rather than pure noise: Priority-Flood will find
     whatever depressions exist, but v1 needs a guaranteed few in a band that
     drains every low tide, and they need to be big enough to see a fish in. */
  /* Scattered rather than hand-listed: over a 420 m shore a hand-placed
     handful would leave the sides bare. Two populations —

       sand flat (z -16..26)  drains every low tide; these are the workhorse
                              pools, the ones a fish gets left in
       lagoon   (z  32..46)   only surfaces on a spring low. The runnel behind
                              the sandbar drains around the bar's tapered ends
                              (correctly — an open-ended runnel is not a pool),
                              so without these the low shore holds no water at
                              all at the one moment everybody is looking at it.

     Rejects anything that lands on a creek: a creek through a basin drains it,
     and costs a tide pool. */
  var BASINS = (function () {
    var out = [];
    function clearOfCreeks(x, z, rx) {
      for (var i = 0; i < CREEKS.length; i++) {
        var c = CREEKS[i];
        if (z < c.zFrom - 6) continue;
        if (Math.abs(x - creekCentre(c, z)) < rx + c.w + 3) return false;
      }
      return true;
    }
    function tryPlace(zLo, zHi, want) {
      var placed = 0, tries = 0;
      while (placed < want && tries < want * 30) {
        tries++;
        var rx = range(5.5, 10.5), rz = range(4.0, 7.5);
        var x = range(-HALFX + 26, HALFX - 26), z = range(zLo, zHi);
        if (!clearOfCreeks(x, z, rx)) continue;
        var ok = true;
        for (var j = 0; j < out.length; j++) {
          if (Math.abs(out[j].x - x) < rx + out[j].rx + 8 &&
              Math.abs(out[j].z - z) < rz + out[j].rz + 6) { ok = false; break; }
        }
        if (!ok) continue;
        out.push({ x: x, z: z, rx: rx, rz: rz, d: range(0.32, 0.52) });
        placed++;
      }
    }
    tryPlace(-16, 26, 22);
    tryPlace(32, 46, 8);
    return out;
  })();
  function basinCut(x, z) {
    var cut = 0;
    for (var i = 0; i < BASINS.length; i++) {
      var b = BASINS[i];
      var u = (x - b.x) / b.rx, v = (z - b.z) / b.rz;
      var r = Math.sqrt(u * u + v * v);
      if (r < 1) cut = Math.max(cut, b.d * (1 - r * r));   // smooth dish, deepest at centre
    }
    return cut;
  }

  /* ============================================================
     Priority-Flood (§5) — finds every depression in one pass.

     Textbook version: the ENTIRE border seeds the heap. An earlier build
     seeded only the seaward row, on the theory that the side edges were an
     artificial cut rather than a drain. That stopped being true once the edges
     tapered into deep water, and it actively broke once the coastline started
     wobbling: a seaward bulge dammed everything behind it, and the flat came
     back with two bogus 1300 m² "pools".

     Seeding the landward row is safe even though it is the highest ground —
     the heap pops lowest-first, so those columns are always reached by the
     sea path (with their true, lower water level) long before their own seed
     is popped.
     ============================================================ */
  function Heap() { this.a = []; }
  Heap.prototype.push = function (item) {
    var a = this.a; a.push(item);
    var i = a.length - 1;
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (a[p].k <= a[i].k) break;
      var tmp = a[p]; a[p] = a[i]; a[i] = tmp; i = p;
    }
  };
  Heap.prototype.pop = function () {
    var a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      var i = 0;
      for (;;) {
        var l = i * 2 + 1, r = l + 1, m = i;
        if (l < a.length && a[l].k < a[m].k) m = l;
        if (r < a.length && a[r].k < a[m].k) m = r;
        if (m === i) break;
        var tmp = a[m]; a[m] = a[i]; a[i] = tmp; i = m;
      }
    }
    return top;
  };

  function findPools(h, waterLevel) {
    var seen = new Uint8Array(NXA * NXB);
    var heap = new Heap();
    var gx, gz, i;
    function seed(idx) {
      if (seen[idx]) return;
      waterLevel[idx] = h[idx]; seen[idx] = 1;
      heap.push({ k: h[idx], i: idx });
    }
    for (gx = 0; gx < NXA; gx++) { seed(gx * NXB); seed(gx * NXB + (NXB - 1)); }
    for (gz = 0; gz < NXB; gz++) { seed(gz); seed((NXA - 1) * NXB + gz); }
    var DX = [1, -1, 0, 0], DZ = [0, 0, 1, -1];
    while (heap.a.length) {
      var top = heap.pop();
      var cx = Math.floor(top.i / NXB), cz = top.i % NXB;
      for (var d = 0; d < 4; d++) {
        var nx = cx + DX[d], nz = cz + DZ[d];
        if (nx < 0 || nx >= NXA || nz < 0 || nz >= NXB) continue;
        var ni = nx * NXB + nz;
        if (seen[ni]) continue;
        seen[ni] = 1;
        waterLevel[ni] = Math.max(h[ni], waterLevel[top.i]);
        heap.push({ k: waterLevel[ni], i: ni });
      }
    }

    /* Connected components of flooded columns sharing a rim height = one pool.
       Rim is rounded before comparing: two neighbours in the same basin can
       differ in the last float bit and would otherwise split into two pools. */
    var POOL_EPS = 0.03;          // ignore puddles shallower than this
    var pools = [], poolOf = new Int16Array(NXA * NXB).fill(-1);
    var stack = [];
    for (i = 0; i < NXA * NXB; i++) {
      if (poolOf[i] >= 0 || waterLevel[i] - h[i] < POOL_EPS) continue;
      var rim = Math.round(waterLevel[i] * 100) / 100;
      var pool = { id: pools.length, columns: [], rimY: rim, floorY: h[i], area: 0, cx: 0, cz: 0 };
      stack.length = 0; stack.push(i); poolOf[i] = pool.id;
      while (stack.length) {
        var ci = stack.pop();
        pool.columns.push(ci);
        if (h[ci] < pool.floorY) pool.floorY = h[ci];
        var ax = Math.floor(ci / NXB), az = ci % NXB;
        pool.cx += ax * CELLX - HALFX;
        pool.cz += az * CELLZ - HALFZ;
        for (var dd = 0; dd < 4; dd++) {
          var bx = ax + DX[dd], bz = az + DZ[dd];
          if (bx < 0 || bx >= NXA || bz < 0 || bz >= NXB) continue;
          var bi = bx * NXB + bz;
          if (poolOf[bi] >= 0 || waterLevel[bi] - h[bi] < POOL_EPS) continue;
          if (Math.abs(Math.round(waterLevel[bi] * 100) / 100 - rim) > 0.005) continue;
          poolOf[bi] = pool.id; stack.push(bi);
        }
      }
      pool.area = pool.columns.length * CELL_AREA;
      pool.cx /= pool.columns.length; pool.cz /= pool.columns.length;
      if (pool.area < 10) {                       // 3-cell puddle — un-pool it
        for (var q = 0; q < pool.columns.length; q++) poolOf[pool.columns[q]] = -1;
        continue;
      }
      pool.id = pools.length;
      for (var q2 = 0; q2 < pool.columns.length; q2++) poolOf[pool.columns[q2]] = pool.id;
      pools.push(pool);
    }
    return { pools: pools, poolOf: poolOf };
  }


  /* Mangroves live in mangrove.js — three variants built from the reference
     photo, each rasterised to a voxel grid and meshed once. Every tree on the
     shore shares one of those three geometries and one material, so the whole
     mangrove fringe is 3 geometries and ~46 draw calls. Variant choice, facing
     and a little scale jitter are all this has to pick. */
  var mangroveNext = 0;
  function mangrove() {
    var geos = Mangrove.variants();
    // deal the variants round-robin rather than at random: with only ~15 of
    // each, random choice reliably clumps three identical trees together
    var gi = mangroveNext++ % geos.length;
    var m = new THREE.Mesh(geos[gi], Mangrove.material());
    var s = range(0.85, 1.2);
    m.scale.set(s, range(0.9, 1.15) * s, s);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.mangroveVariant = gi + 1;
    return m;
  }

  /* ============================================================
     build
     ============================================================ */
  function build(scene) {
    /* ---------- sky, fog, lights ---------- */
    scene.background = new THREE.Color(0x9fc4d8);
    /* Barely any fog now. With the surrounding scenery gone there is no
       distance for haze to sell — all fog did was bleach the far half of the
       block to grey. Pushed out past the plot so the cross-section stays
       crisp and the sky gradient acts as a plain backdrop behind it. */
    var BASE_FOG_NEAR = 210, BASE_FOG_FAR = 720;
    scene.fog = new THREE.Fog(0xbcd6e2, BASE_FOG_NEAR, BASE_FOG_FAR);

    var skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x2f5f96) },
        mid: { value: new THREE.Color(0x8ec0dc) },
        bot: { value: new THREE.Color(0xd8ecf2) }
      },
      vertexShader:
        'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;' +
        'void main(){ float h = normalize(vP).y;' +
        ' vec3 c = mix(bot, mid, smoothstep(0.0, 0.26, h));' +
        ' c = mix(c, top, smoothstep(0.26, 0.72, h));' +
        ' gl_FragColor = vec4(c, 1.0); }'
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat));

    var hemi = new THREE.HemisphereLight(0xdff0ff, 0x6a6250, 0.8);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    sun.position.set(-70, 90, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
    sun.shadow.camera.far = 320;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    var moon = new THREE.DirectionalLight(0x9fb4e0, 0);
    scene.add(moon);

    /* DAY / NIGHT — deliberately DECOUPLED from the tide (§8). Two tides per
       sim day would mean a 3-minute day and a strobing sun; what matters is
       that midday spring lows still happen, so desiccation reads. Nobody
       counts tides per sunrise. 4 keyframes: MIDNIGHT→DAWN→NOON→DUSK. */
    var DAY_CYCLE_SECS = 360;
    var dayOffset = 0, lastSimT = 0;
    function setDayPhase(f) {
      var want = ((f % 1) + 1) % 1 * DAY_CYCLE_SECS;
      dayOffset = want - (lastSimT % DAY_CYCLE_SECS);
    }
    var ORBIT_R = 130, ORBIT_H = 120, ORBIT_BASE_Y = 10, ORBIT_Z = 40;

    var SKY_TOP   = [0x060b16, 0x2b4a72, 0x2f5f96, 0x364a72].map(function (h) { return new THREE.Color(h); });
    var SKY_MID   = [0x0b1524, 0xd88a5a, 0x8ec0dc, 0xe8956a].map(function (h) { return new THREE.Color(h); });
    var SKY_BOT   = [0x101d2e, 0xf2c088, 0xd8ecf2, 0xf6cf9a].map(function (h) { return new THREE.Color(h); });
    var FOG_C     = [0x0a1220, 0xdc9a72, 0xbcd6e2, 0xeaa87c].map(function (h) { return new THREE.Color(h); });
    var BG_C      = [0x070d18, 0xe8a878, 0x9fc4d8, 0xf0b489].map(function (h) { return new THREE.Color(h); });
    var SUN_COLOR = [0x8899cc, 0xffb87a, 0xfff2d8, 0xffbc84].map(function (h) { return new THREE.Color(h); });
    var HEMI_SKY  = [0x1e2c44, 0xffd4a8, 0xdff0ff, 0xffdcb4].map(function (h) { return new THREE.Color(h); });
    var HEMI_GRND = [0x080c14, 0x6a5a3c, 0x8a8264, 0x6a5a3c].map(function (h) { return new THREE.Color(h); });
    var SUN_INTEN  = [0.0, 1.05, 1.75, 1.15];
    var HEMI_INTEN = [0.18, 0.55, 0.9, 0.6];
    var DAYLIGHT   = [0.0, 0.55, 1.0, 0.55];

    function dayBlend(phase) {
      var idx = Math.floor(phase * 4) % 4, nxt = (idx + 1) % 4;
      var lt = phase * 4 - Math.floor(phase * 4);
      lt = lt * lt * (3 - 2 * lt);
      return { idx: idx, nxt: nxt, lt: lt };
    }
    function lerpNum(arr, bl) { return arr[bl.idx] + (arr[bl.nxt] - arr[bl.idx]) * bl.lt; }

    var STAR_COUNT = 600, STAR_R = 580;
    var starPos = new Float32Array(STAR_COUNT * 3);
    for (var si = 0; si < STAR_COUNT; si++) {
      var sTheta = rand() * Math.PI * 2, sPhi = rand() * Math.PI * 0.6;
      starPos[si * 3]     = STAR_R * Math.sin(sPhi) * Math.cos(sTheta);
      starPos[si * 3 + 1] = STAR_R * Math.cos(sPhi);
      starPos[si * 3 + 2] = STAR_R * Math.sin(sPhi) * Math.sin(sTheta);
    }
    var starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    var starMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 1.6, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false
    });
    scene.add(new THREE.Points(starGeo, starMat));

    /* ============================================================
       TERRAIN
       ============================================================ */
    var N = NXA * NXB;
    var hArr = new Float32Array(N);          // metres CD, per grid node
    var zeArr = new Float32Array(N);         // warped (along-shore-curved) z, reused by the colour bake
    var bandOf = new Array(N);
    var i, gx, gz, x, z;

    for (gx = 0; gx < NXA; gx++) {
      for (gz = 0; gz < NXB; gz++) {
        i = gx * NXB + gz;
        x = gx * CELLX - HALFX;
        z = gz * CELLZ - HALFZ;
        var ze = zEff(x, z);
        zeArr[i] = ze;
        var band = bandAt(ze);
        bandOf[i] = band;

        var h = profileAt(ze);

        // roughness is per-band: boulders are lumpy, the sand flat is nearly
        // a plane with low ripples, the lagoon is soft
        if (band === 'boulder')       h += fbm(x, z, 0.09, 3) * 0.55;
        else if (band === 'mangrove') h += fbm(x, z, 0.07, 3) * 0.30;
        else if (band === 'mudflat')  h += fbm(x, z, 0.10, 2) * 0.16;
        else if (band === 'sandflat') h += fbm(x, z, 0.05, 2) * 0.10 + Math.sin(ze * 0.55 + x * 0.05) * 0.012;
        else if (band === 'lagoon')   h += fbm(x, z, 0.08, 2) * 0.10;
        else if (band === 'sandbar')  h += fbm(x, z, 0.06, 2) * 0.09;
        else                          h += fbm(x, z, 0.05, 2) * 0.14;

        h -= basinCut(x, z);
        h -= creekCut(x, z);

        hArr[i] = Math.round(h / HQ) * HQ;
      }
    }

    /* Light smoothing pass. Two things need it: the profile is interpolated
       with smoothstep, which has zero slope AT each key and so leaves a faint
       terrace across the shore at every key height; and the carved basins meet
       the flat at a crease. Two 3x3 half-weight passes remove both without
       measurably shallowing the basins (they span many cells). Must run BEFORE
       Priority-Flood so the pools match the surface that actually gets drawn. */
    (function smoothHeights() {
      var tmp = new Float32Array(N);
      for (var pass = 0; pass < 2; pass++) {
        for (var a = 0; a < NXA; a++) {
          for (var b = 0; b < NXB; b++) {
            var sum = 0, cnt = 0;
            for (var da = -1; da <= 1; da++) {
              for (var db = -1; db <= 1; db++) {
                var aa = a + da, bb = b + db;
                if (aa < 0 || aa >= NXA || bb < 0 || bb >= NXB) continue;
                sum += hArr[aa * NXB + bb]; cnt++;
              }
            }
            tmp[a * NXB + b] = hArr[a * NXB + b] * 0.5 + (sum / cnt) * 0.5;
          }
        }
        hArr.set(tmp);
      }
    })();

    var waterLevel = new Float32Array(N);
    var pf = findPools(hArr, waterLevel);
    var pools = pf.pools, poolOf = pf.poolOf;

    /* ---------- terrain mesh: ONE displaced, vertex-coloured surface ----------
       Not a box per column. The shore is so nearly flat that a column grid
       leaves each box's side wall exposed by only a few millimetres, and those
       sub-pixel dark slivers drew as hard contour lines across the entire flat
       — the single worst artifact in the first build. A smooth surface has no
       side walls at all, is one draw call instead of 9k instances, and gets
       interpolated vertex colours, which turns the foam line and the wet-sand
       band into soft gradients instead of blocky cells. */
    var terrGeo = new THREE.PlaneGeometry(SPANX, SPANZ, GRIDX, GRIDZ);
    terrGeo.rotateX(-Math.PI / 2);
    var tpos = terrGeo.attributes.position.array;
    var vertNode = new Int32Array(tpos.length / 3);   // vertex -> hArr index
    for (i = 0; i < vertNode.length; i++) {
      var vx = tpos[i * 3], vz = tpos[i * 3 + 2];
      var na = Math.round((vx + HALFX) / CELLX), nb = Math.round((vz + HALFZ) / CELLZ);
      if (na < 0) na = 0; else if (na >= NXA) na = NXA - 1;
      if (nb < 0) nb = 0; else if (nb >= NXB) nb = NXB - 1;
      var ni2 = na * NXB + nb;
      vertNode[i] = ni2;
      tpos[i * 3 + 1] = hArr[ni2];
    }
    terrGeo.computeVertexNormals();
    terrGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tpos.length), 3));
    var colArr = terrGeo.attributes.color.array;
    var terrain = new THREE.Mesh(terrGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    terrain.receiveShadow = true;
    scene.add(terrain);

    /* Pre-baked dry + wet colour per NODE. Wet is derived from dry so the two
       can never drift apart: darker, pulled toward a green-blue silt tint.
       Slight noise jitter breaks up the flat bands. */
    var dryRGB = new Float32Array(N * 3), wetRGB = new Float32Array(N * 3);
    var tmpC = new THREE.Color(), WET_TINT = new THREE.Color(0x33544f);
    for (i = 0; i < N; i++) {
      gx = Math.floor(i / NXB); gz = i % NXB;
      x = gx * CELLX - HALFX; z = gz * CELLZ - HALFZ;
      colorAtZ(tmpC, zeArr[i]);
      var jit = 1 + fbm(x, z, 0.35, 2) * 0.22;
      tmpC.multiplyScalar(jit);
      dryRGB[i * 3] = tmpC.r; dryRGB[i * 3 + 1] = tmpC.g; dryRGB[i * 3 + 2] = tmpC.b;
      tmpC.multiplyScalar(0.52).lerp(WET_TINT, 0.33);
      wetRGB[i * 3] = tmpC.r; wetRGB[i * 3 + 1] = tmpC.g; wetRGB[i * 3 + 2] = tmpC.b;
    }

    /* The plot's rim, walked once as a closed loop and reused by both the
       sediment skirt and the water's cut face (both below). Defined up here
       because the sea is built before the skirt is. */
    var rimNodes = (function () {
      var out = [], a, b;
      function add(ni) {
        var na = Math.floor(ni / NXB), nb = ni % NXB;
        out.push({ x: na * CELLX - HALFX, z: nb * CELLZ - HALFZ, h: hArr[ni] });
      }
      for (a = 0; a < NXA; a++) add(a * NXB + 0);                   // landward edge, +x
      for (b = 1; b < NXB; b++) add((NXA - 1) * NXB + b);           // far side, +z
      for (a = NXA - 2; a >= 0; a--) add(a * NXB + (NXB - 1));      // seaward edge, -x
      for (b = NXB - 2; b >= 1; b--) add(0 * NXB + b);              // near side, -z
      out.push(out[0]);                                             // close the loop
      return out;
    })();

    /* Wetness memory. `wet` is 0..1 and decays over DRY_SECS once a node is
       out of the water — this is the wet-sand band, and it is what makes an
       ebb LOOK like an ebb instead of water sliding down a static beach. */
    var wet = new Float32Array(N);
    var nodeRGB = new Float32Array(N * 3);   // per-node resolved colour, scattered to vertices each frame

    /* The biofilm resource (§7) rides this same node grid — it reads `wet`
       and `hArr` rather than keeping a patch grid of its own, and its
       standing crop is drawn by the colour pass below instead of by any
       geometry. See biofilm.js. */
    var biofilm = Biofilm.attach({ N: N, heights: hArr, wet: wet, indexAt: indexAt });
    var filmArr = biofilm.film;
    var FILM_TINT = new THREE.Color(0x9a8a42);   // the brown-gold sheen on drained wet mud
    var FILM_MAX = 0.42;      // never a full wash — the sediment colour still has to read through
    var dayFilm = 1;          // diatoms are at the surface in daylight (§7 fact card), scaled per frame
    var rockTint = new THREE.Color(), rockTintT = 0;   // the boulders' share of the same film
    /* 13 s, not the ~minutes real sand takes to dry: at 90 s per tide cycle the
       waterline crosses the whole flat in under a minute, and the band's WIDTH
       on screen is (dry time x waterline speed). 7 s gave a ~12 m smear that
       barely read from a wide shot; 13 s gives ~25 m. */
    var DRY_SECS = 13;
    var FOAM_EPS = 0.07;      // metres either side of the waterline

    // seabed depth tint (see the colour pass) — how water absorption is faked
    var DEEP_TINT = new THREE.Color(0x14566b);
    var DEEP_FULL = 3.0;      // metres at which the tint saturates
    var DEEP_MAX  = 0.60;     // never a full wash — you must still see the flat under the water
    var dayDeep   = 1;        // scaled by daylight each frame

    /* ---------- sea plane ----------
       Exactly the plot's footprint — the water stops where the world does, so
       there is no sheet of sea extending out past the cross-section. ~3 m per
       segment; the chop aliases into moiré if segments get much coarser than
       the wavelength. */
    var seaGeo = new THREE.PlaneGeometry(SPANX, SPANZ, 100, 48);
    seaGeo.rotateX(-Math.PI / 2);
    var seaBase = seaGeo.attributes.position.array.slice();
    /* The surface is deliberately CLEAR. Depth is conveyed by tinting the
       submerged seabed instead (see DEEP_TINT in the colour pass) — that is
       what real water absorption does, and unlike a milky surface plane it
       leaves anything standing on the flat plainly visible through it. All the
       plane itself contributes is a faint blue wash and the specular-ish
       shading of the chop. */
    var seaMat = new THREE.MeshLambertMaterial({
      color: 0x54b0d8, transparent: true, opacity: 0.30, depthWrite: false
    });
    var sea = new THREE.Mesh(seaGeo, seaMat);
    sea.renderOrder = 1;
    scene.add(sea);
    // No clipping needed within the plot: the plane sits at y = tide and the
    // depth buffer does the rest — terrain higher than the tide occludes it.
    //
    // There is deliberately NO second, larger ocean plane. An earlier build had
    // one to fill the horizon past the shore; with the world cut to the plot
    // there is no "past the shore" to fill, and it would just be sea sticking
    // out beyond the cross-section.

    /* The water's CUT FACE. The sea is a surface, so at the plot rim the water
       column would be infinitely thin and you would see the sediment skirt
       where the water should be. This is the same rim walk as the skirt, but
       its bottom follows the terrain and its top is the tide — so it shows
       exactly the wedge of water standing on the shore at this instant, and
       nothing where the ground is already dry. Rebuilt each frame (a few
       hundred verts; the top row is the only part that actually moves). */
    var seaFace = (function () {
      var pos = new Float32Array(rimNodes.length * 6);
      var idx = [];
      for (var k = 1; k < rimNodes.length; k++) {
        var p = (k - 1) * 2, q = k * 2;
        idx.push(p, p + 1, q + 1, p, q + 1, q);
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(idx);
      var m = new THREE.MeshBasicMaterial({
        color: 0x3f93b4, transparent: true, opacity: 0.42,
        side: THREE.DoubleSide, depthWrite: false
      });
      var mesh = new THREE.Mesh(g, m);
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      scene.add(mesh);
      return mesh;
    })();
    function layoutSeaFace() {
      var arr = seaFace.geometry.attributes.position.array;
      var any = false;
      for (var k = 0; k < rimNodes.length; k++) {
        var r = rimNodes[k], o = k * 6;
        var bottom = r.h, top = tideNow;
        if (top < bottom) top = bottom;          // dry here — collapse to a zero-height sliver
        else any = true;
        arr[o] = r.x; arr[o + 1] = top;    arr[o + 2] = r.z;
        arr[o + 3] = r.x; arr[o + 4] = bottom; arr[o + 5] = r.z;
      }
      seaFace.geometry.attributes.position.needsUpdate = true;
      seaFace.visible = any;
    }

    /* ---------- pool water ----------
       One InstancedMesh of flat quads, one per pooled node — the exact
       footprint Priority-Flood found, no quad fitting. Quads (not boxes): the
       pool's sides are the terrain, which is already drawn. Each instance is
       collapsed to nothing once the sea has risen past its rim, because the
       sea plane then covers it and two coincident surfaces z-fight. */
    var poolCols = [];
    for (i = 0; i < N; i++) if (poolOf[i] >= 0) poolCols.push(i);
    var poolQuad = new THREE.PlaneGeometry(CELLX * 1.02, CELLZ * 1.02);
    poolQuad.rotateX(-Math.PI / 2);
    var poolMat = new THREE.MeshLambertMaterial({
      color: 0x62c0d4, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false
    });
    var poolMesh = new THREE.InstancedMesh(poolQuad, poolMat, Math.max(1, poolCols.length));
    poolMesh.receiveShadow = true;
    poolMesh.renderOrder = 2;
    scene.add(poolMesh);
    var dummy = new THREE.Object3D();

    /* ---------- the cut edge ----------
       The terrain is a surface with no thickness, so at the plot boundary you
       would look straight through it. This skirt drops from the rim down to
       BASE_Y all the way round: the sediment profile under the shore, banded
       so it reads as a core sample rather than a solid wall. It is what turns
       "the ground just stops" into "this is a cross-section".

       Built as one BufferGeometry: walk the rim node by node, emit a top vertex
       at the terrain height and a bottom one at BASE_Y, stitch quads between
       consecutive pairs. */
    var skirt = (function () {
      /* Four rows, not two, so the cut face shows sediment LAYERS — damp
         surface sediment, a pale sand band, then dark anoxic mud at depth.
         Banding is what makes a cross-section read as a core sample instead
         of a slab of clay. */
      var LAYERS = [
        { f: 0.00, c: new THREE.Color(0x6b5b42) },   // at the surface
        { f: 0.18, c: new THREE.Color(0x8a7a5e) },   // pale sand
        { f: 0.45, c: new THREE.Color(0x5f5442) },
        { f: 1.00, c: new THREE.Color(0x3f3a30) }    // anoxic mud
      ];
      var ROWS = LAYERS.length;
      var pos = [], col = [], idx = [];
      for (var k = 0; k < rimNodes.length; k++) {
        var r = rimNodes[k];
        for (var L = 0; L < ROWS; L++) {
          pos.push(r.x, r.h + (BASE_Y - r.h) * LAYERS[L].f, r.z);
          col.push(LAYERS[L].c.r, LAYERS[L].c.g, LAYERS[L].c.b);
        }
        if (k > 0) {
          var p = (k - 1) * ROWS, q = k * ROWS;
          for (var L2 = 0; L2 < ROWS - 1; L2++) {
            idx.push(p + L2, p + L2 + 1, q + L2 + 1, p + L2, q + L2 + 1, q + L2);
          }
        }
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      var m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      var mesh = new THREE.Mesh(g, m);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    })();

    /* A lid under the skirt so the plot is a closed solid rather than an open
       box you can see up into from a low angle. */
    var underside = new THREE.Mesh(
      new THREE.PlaneGeometry(SPANX, SPANZ),
      new THREE.MeshLambertMaterial({ color: 0x3a3529, side: THREE.DoubleSide })
    );
    underside.rotation.x = Math.PI / 2;
    underside.position.y = BASE_Y;
    scene.add(underside);

    /* ---------- props ---------- */
    var props = [];
    var pneuCount = 0;
    function place(g, px, pz, yOff) {
      g.position.set(px, columnHeightAt(px, pz) + (yOff || 0), pz);
      g.rotation.y = rand() * Math.PI * 2;
      scene.add(g);
      props.push(g);
    }
    /* Scatter by BAND, not by raw z — the bands are curved (zEff) and the map
       edges taper into deep water, so a straight z window would drop mangroves
       into the sea at the corners. */
    function scatterIn(bands, n, builderFn, yOff, xLimit) {
      var placed = 0, tries = 0, lim = xLimit || HALFX - 18;
      while (placed < n && tries < n * 40) {
        tries++;
        var px = range(-lim, lim), pz = range(-HALFZ + 2, HALFZ - 2);
        if (bands.indexOf(bandAt(zEff(px, pz))) < 0) continue;
        if (columnHeightAt(px, pz) < 1.7) continue;      // never below the mid-shore
        place(builderFn(), px, pz, yOff);
        placed++;
      }
    }
    scatterIn(['mangrove'], 46, mangrove, -0.2);
    // `props` holds exactly the mangroves at this point (rocks are instanced
    // below and never go through place()) — the pneumatophore field needs
    // their positions to cluster around
    var mangroveAt = props.slice();

    /* ---------- pneumatophore field ----------
       Dense around each trunk, thinning outward, plus a looser scatter across
       the whole fringe so the mud between trees isn't bare. One InstancedMesh
       for the lot: ~1 800 spikes in a single draw call. */
    (function scatterPneumatophores() {
      var xf = [];
      function drop(px, pz) {
        if (Math.abs(px) > HALFX - 3 || Math.abs(pz) > HALFZ - 3) return;
        var b = bandAt(zEff(px, pz));
        if (b !== 'mangrove' && b !== 'boulder') return;
        var gh = columnHeightAt(px, pz);
        if (gh < 2.35) return;                     // upper shore only
        xf.push({ x: px, y: gh - 0.06, z: pz, s: range(0.6, 1.45), rot: rand() * Math.PI * 2 });
      }

      for (var m = 0; m < mangroveAt.length; m++) {
        var tx = mangroveAt[m].position.x, tz = mangroveAt[m].position.z;
        var n = 34 + Math.floor(rand() * 24);
        for (var i = 0; i < n; i++) {
          // r^1.8 clusters them in toward the trunk; the 1.6 m floor keeps
          // them out from under the prop-root cage
          var a = rand() * Math.PI * 2;
          var rr = 1.6 + Math.pow(rand(), 1.8) * 7.5;
          drop(tx + Math.cos(a) * rr, tz + Math.sin(a) * rr);
        }
      }
      for (var s = 0; s < 700; s++) {              // loose fill between the trees
        drop(range(-HALFX + 6, HALFX - 6), range(-HALFZ + 3, -20));
      }

      if (!xf.length) return;
      var inst = new THREE.InstancedMesh(Mangrove.pneumatophore(), Mangrove.material(), xf.length);
      inst.castShadow = true;
      inst.receiveShadow = true;
      var d = new THREE.Object3D(), tint = new THREE.Color();
      for (var k = 0; k < xf.length; k++) {
        var p = xf[k];
        d.position.set(p.x, p.y, p.z);
        d.rotation.set(0, p.rot, 0);
        d.scale.set(range(0.8, 1.2), p.s, range(0.8, 1.2));
        d.updateMatrix();
        inst.setMatrixAt(k, d.matrix);
        // slight per-spike brightness so a dense patch doesn't read as one mat
        var v = 0.82 + rand() * 0.36;
        tint.setRGB(v, v, v);
        inst.setColorAt(k, tint);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      scene.add(inst);
      pneuCount = xf.length;
    })();

    /* ---------- boulders ----------
       Placed in two passes: collect transforms first, then build one
       InstancedMesh per rock variant. Rocks are terrain furniture — nothing
       will ever click one — so unlike the mangroves they trade raycastability
       for six draw calls covering the whole field.

       `rocks` is published on the world regardless of how they're drawn,
       because barnacles and nerites will need to sit ON them and that lookup
       must not care about the rendering choice. */
    var rocks = [];
    var rockInsts = [];         // [{mesh, node}] — the biofilm tint pass below writes these
    (function scatterRocks() {
      var geos = Rocks.variants();
      var slots = [];
      for (var v = 0; v < geos.length; v++) slots.push([]);

      function drop(bands, n, sMin, sMax, yOff) {
        var placed = 0, tries = 0, lim = HALFX - 18;
        while (placed < n && tries < n * 40) {
          tries++;
          var px = range(-lim, lim), pz = range(-HALFZ + 2, HALFZ - 2);
          if (bands.indexOf(bandAt(zEff(px, pz))) < 0) continue;
          var gh = columnHeightAt(px, pz);
          if (gh < 1.7) continue;                       // never below the mid-shore
          var vi = Math.floor(rand() * geos.length);
          var s = range(sMin, sMax);
          slots[vi].push({ x: px, y: gh + yOff, z: pz, s: s, rot: rand() * Math.PI * 2 });
          var bb = geos[vi].boundingBox;
          rocks.push({
            x: px, z: pz,
            r: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5 * s,
            top: gh + yOff + (bb.max.y - bb.min.y) * s
          });
          placed++;
        }
      }
      drop(['boulder'], 120, 0.7, 1.45, -0.3);      // fewer, chunkier
      drop(['mudflat'], 34, 0.32, 0.65, -0.2);      // scattered cobbles

      var dummyR = new THREE.Object3D();
      for (var k = 0; k < geos.length; k++) {
        if (!slots[k].length) continue;
        var inst = new THREE.InstancedMesh(geos[k], Rocks.material(), slots[k].length);
        inst.castShadow = true;
        inst.receiveShadow = true;
        /* Per-instance colour so the biofilm can be drawn on the rock as well
           as on the flat (§7). Without this the nerites' grazing is invisible:
           they work the node UNDER a boulder, and the boulder is what you can
           see. A scraped boulder going grey while an unvisited one beside it
           stays gold is the whole point of giving them a finite resource. */
        inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(slots[k].length * 3), 3);
        var nodeOf = new Int32Array(slots[k].length);
        for (var j = 0; j < slots[k].length; j++) {
          var p = slots[k][j];
          dummyR.position.set(p.x, p.y, p.z);
          dummyR.rotation.set(0, p.rot, 0);
          dummyR.scale.set(p.s, p.s * range(0.8, 1.15), p.s);
          dummyR.updateMatrix();
          inst.setMatrixAt(j, dummyR.matrix);
          nodeOf[j] = indexAt(p.x, p.z);
        }
        inst.instanceMatrix.needsUpdate = true;
        rockInsts.push({ mesh: inst, node: nodeOf });
        scene.add(inst);
      }
    })();

    // (The study-plot outline that used to be drawn here is gone: the plot is
    // now the whole world, so its boundary is the cross-section you can see.)

    /* ============================================================
       lookups
       ============================================================ */
    function indexAt(px, pz) {
      var ax = Math.round((px + HALFX) / CELLX), az = Math.round((pz + HALFZ) / CELLZ);
      if (ax < 0 || ax >= NXA || az < 0 || az >= NXB) return -1;
      return ax * NXB + az;
    }
    function columnHeightAt(px, pz) {
      var ci = indexAt(px, pz);
      return ci < 0 ? profileAt(pz) : hArr[ci];
    }

    var tideNow = Tide.at(0);

    /* THE seam (§3). Water surface height at (x,z), or null if that column is
       dry. Pools are why this exists: inside one, the surface is the pool's
       rim, not the sea level. Never bypass this by reading world.tide. */
    function waterAt(px, pz) {
      var ci = indexAt(px, pz);
      if (ci < 0) return tideNow;                        // off-grid = open sea
      var surf = tideNow;
      var pid = poolOf[ci];
      if (pid >= 0) surf = Math.max(surf, pools[pid].rimY);
      return surf > hArr[ci] ? surf : null;
    }
    /* How recently this column was under water: 1 = wet now, 0 = dry for
       DRY_SECS or more. Drives the wet-sand rendering, and is what a
       desiccation-sensitive species should read (§6 `stranding`) rather than
       re-deriving its own exposure timer. */
    function wetAt(px, pz) {
      var ci = indexAt(px, pz);
      return ci < 0 ? 1 : wet[ci];
    }
    function poolAtXZ(px, pz) {
      var ci = indexAt(px, pz);
      if (ci < 0) return null;
      var pid = poolOf[ci];
      return pid >= 0 ? pools[pid] : null;
    }

    /* ---------- the seagrass meadow (§7, §26) ----------
       Built here rather than spawned from main.js because it is scenery that
       happens to carry a resource, like the mangroves and the boulders. It
       needs the boulder list to keep out of the rocks, and `waterAt` (not the
       raw tide) to decide per blade whether it is standing or lying over —
       which is what keeps a blade in a water-holding runnel upright while the
       bed around it has gone flat. Built after the lookups for that reason.
       Shares the biofilm's node grid; see seagrass.js. */
    var seagrass = Seagrass.build({
      scene: scene, N: N, heights: hArr, wet: wet,
      indexAt: indexAt, heightAt: columnHeightAt, waterAt: waterAt,
      rocks: rocks, halfX: SIM_HALF_X, zMin: SIM_Z_MIN, zMax: SIM_Z_MAX
    });

    /* ============================================================
       world object
       ============================================================ */
    var worldOut = {
      GRIDX: GRIDX, GRIDZ: GRIDZ, CELLX: CELLX, CELLZ: CELLZ,
      SPANX: SPANX, SPANZ: SPANZ, HALFX: HALFX, HALFZ: HALFZ,

      /* The study plot. Terrain outside it is scenery — NOTHING alive goes
         there. Every spawn, every wander target and every camera clamp reads
         these, so the plot can be resized in one place. */
      simArea: { halfX: SIM_HALF_X, zMin: SIM_Z_MIN, zMax: SIM_Z_MAX },
      inSimArea: function (x, z) {
        return x >= -SIM_HALF_X && x <= SIM_HALF_X && z >= SIM_Z_MIN && z <= SIM_Z_MAX;
      },
      // pushes a point back inside the plot; `pad` keeps animals off the line
      clampToSimArea: function (v, pad) {
        var p = pad || 0, lx = SIM_HALF_X - p;
        if (v.x >  lx) v.x =  lx;
        if (v.x < -lx) v.x = -lx;
        if (v.z < SIM_Z_MIN + p) v.z = SIM_Z_MIN + p;
        if (v.z > SIM_Z_MAX - p) v.z = SIM_Z_MAX - p;
        return v;
      },
      heights: hArr,
      bandOf: bandOf,
      pools: pools,
      poolOf: poolOf,
      obstacles: [],          // filled in when species arrive (§11 step 4)
      floraMeshes: [],
      rocks: rocks,           // [{x,z,r,top}] — where barnacles and nerites will sit

      tide: tideNow,          // live, metres CD
      tideDir: -1,            // live, +1 flooding / -1 ebbing
      tidePhase: 0,           // live, 0..1 within the cycle
      springness: 1,          // live, 0 neap .. 1 spring
      tideFrozen: false,      // dev/UI scrub — holds the clock without pausing the sim

      daylight: 1,
      isNight: false,

      waterAt: waterAt,                 // (x,z) -> surface height, or null if dry
      wetAt: wetAt,                     // (x,z) -> 0..1 how recently submerged
      /* The biofilm seam (§7). Grazers go through these two, never through
         world.biofilm.film — same rule as waterAt: one lookup, one place to
         change when seagrass joins it. */
      filmAt: biofilm.at,               // (x,z) -> 0..1 standing crop
      grazeFilm: biofilm.graze,         // (x,z,want) -> how much was actually there to eat
      biofilm: biofilm,                 // .cover() for stats, .capacity for debugging
      /* The same two verbs for the meadow (§26). Nothing in the v1 roster
         reaches down to 0.9 m CD to use them yet — the sea hare, sand dollar
         and green turtle are the animals these are waiting for. */
      grassAt: seagrass.at,
      grazeGrass: seagrass.graze,
      seagrass: seagrass,
      poolAt: poolAtXZ,                 // (x,z) -> pool record, or null
      heightAt: columnHeightAt,         // (x,z) -> terrain height, metres CD
      bandAtZ: bandAt,
      setTide: function (f) { Tide.setPhase(f); },
      jumpToSpringLow: function () { worldOut.tideFrozen = false; return Tide.jumpToSpringLow(); },
      // Hand-scrub the waterline to an absolute height. Freezes the clock —
      // this is the §11-step-1 check: park the sea at every height in turn and
      // confirm the shore reads correctly before letting it move on its own.
      setTideHeight: function (m) {
        worldOut.tideFrozen = true;
        tideNow = m;
        worldOut.tide = m;
      },
      setDayPhase: setDayPhase,

      update: function (dt, t, cam) {
        /* ---- tide ---- */
        if (!worldOut.tideFrozen) {
          tideNow = Tide.at(t);
          worldOut.tideDir = Tide.dir(t);
          worldOut.tidePhase = Tide.phase(t);
          worldOut.springness = Tide.springness(t);
        }
        worldOut.tide = tideNow;
        sea.position.y = tideNow;
        layoutSeaFace();

        /* ---- sea surface waves ---- */
        var sp = seaGeo.attributes.position.array;
        for (var k = 0; k < sp.length; k += 3) {
          var wx = seaBase[k], wz = seaBase[k + 2];
          // Low chop, ~24–48 m wavelengths. Amplitude is deliberately tiny:
          // this plane is 300 m across at 4 m per segment, and anything
          // taller/longer shades as big geometric wedges rather than water.
          sp[k + 1] = Math.sin(wx * 0.26 + t * 1.5) * 0.022 +
                      Math.sin(wz * 0.19 - t * 1.2) * 0.018 +
                      Math.sin((wx * 0.6 - wz) * 0.13 + t * 0.9) * 0.014;
        }
        seaGeo.attributes.position.needsUpdate = true;
        /* Normals are deliberately left flat (+Y). At this amplitude the chop's
           real slope is under half a degree, so recomputed normals bought no
           visible shading — but computeVertexNormals over ~12k verts every
           frame cost more than the entire rest of the world update, and on a
           plane this size it was what produced the big diagonal shading wedges
           in the first build. The displacement still reads on the water's edge
           and against the shore. */

        /* ---- wet-sand band + foam line ----
           Two passes. First over every NODE: mark submerged ones wet, decay
           the rest, resolve the node's colour. Then scatter those node colours
           onto the mesh's vertices (the plane has a vertex per node, but in
           its own order — vertNode is the mapping baked at build). Foam is
           folded into the same write (a bright band at |height - tide| <
           FOAM_EPS) rather than being its own mesh. */
        var decay = dt / DRY_SECS;
        var foamWob = Math.sin(t * 2.1) * 0.012;
        for (var ci = 0; ci < N; ci++) {
          var ch = hArr[ci];
          var pid2 = poolOf[ci];
          var surf = pid2 >= 0 ? Math.max(tideNow, pools[pid2].rimY) : tideNow;
          if (ch < surf) {
            wet[ci] = 1;
          } else if (wet[ci] > 0) {
            wet[ci] -= decay;
            if (wet[ci] < 0) wet[ci] = 0;
          }

          var w = wet[ci], iw = 1 - w, o = ci * 3;
          var r = dryRGB[o] * iw + wetRGB[o] * w;
          var g = dryRGB[o + 1] * iw + wetRGB[o + 1] * w;
          var b = dryRGB[o + 2] * iw + wetRGB[o + 2] * w;

          /* Biofilm sheen (§7). The brown-gold film is the one thing on this
             shore that is MOST visible when the water has just left: diatoms
             climb to the surface on a drained flat in daylight and sink back
             before the water returns, so the tint switches on with exposure
             and dims under water rather than the other way round. It is also
             how grazing becomes visible — a hard-worked patch of rock or sand
             goes pale, and grows back over the next tide or two. */
          var fm = filmArr[ci];
          if (fm > 0.02) {
            var sh = fm * FILM_MAX * dayFilm * (ch < surf ? 0.45 : 1);
            r += (FILM_TINT.r - r) * sh;
            g += (FILM_TINT.g - g) * sh;
            b += (FILM_TINT.b - b) * sh;
          }

          /* Depth tint — this, not the surface plane's opacity, is what makes
             the water read as water. The deeper a patch of seabed is, the more
             of the red end the column above it has absorbed, so it grades to
             blue-green and darkens. Shallows stay almost their true colour,
             which is exactly the cue that tells you the flat is about to
             surface. Keeps the surface clear enough to see through. */
          var depth = surf - ch;
          if (depth > 0) {
            var df = depth / DEEP_FULL;
            if (df > 1) df = 1;
            df = df * (2 - df) * DEEP_MAX * dayDeep;      // ease out: the first half-metre matters most
            r += (DEEP_TINT.r - r) * df;
            g += (DEEP_TINT.g - g) * df;
            b += (DEEP_TINT.b - b) * df;
          }

          var d = Math.abs(ch - tideNow + foamWob);
          if (d < FOAM_EPS) {
            var f = (1 - d / FOAM_EPS) * 0.5;
            r += (FOAM.r - r) * f; g += (FOAM.g - g) * f; b += (FOAM.b - b) * f;
          }
          nodeRGB[o] = r; nodeRGB[o + 1] = g; nodeRGB[o + 2] = b;
        }
        for (var vi = 0; vi < vertNode.length; vi++) {
          var src = vertNode[vi] * 3, dst = vi * 3;
          colArr[dst] = nodeRGB[src];
          colArr[dst + 1] = nodeRGB[src + 1];
          colArr[dst + 2] = nodeRGB[src + 2];
        }
        terrGeo.attributes.color.needsUpdate = true;

        /* ---- biofilm regrowth (§7) ----
           After the node pass, so it grows on this frame's wetness rather
           than last frame's. The tint above is a frame behind it, which at
           125 s from bare to full is not a difference anything can see. */
        biofilm.update(dt, worldOut.daylight);
        seagrass.update(dt, t, worldOut.daylight);

        /* ---- biofilm on the boulders ----
           Same sheen as the flat, painted per rock instance from the film at
           the node it stands on. Throttled: at 125 s from bare to full this
           colour cannot visibly change inside a fifth of a second, and 154
           instances every frame for nothing is exactly the kind of cost the
           rest of this file avoids. */
        rockTintT -= dt;
        if (rockTintT <= 0) {
          rockTintT = 0.2;
          for (var ri = 0; ri < rockInsts.length; ri++) {
            var rk2 = rockInsts[ri], nodes = rk2.node;
            for (var rj = 0; rj < nodes.length; rj++) {
              var rci = nodes[rj];
              var rf = rci < 0 ? 0 : filmArr[rci];
              var rsh = rf * FILM_MAX * dayFilm * (rci >= 0 && hArr[rci] < tideNow ? 0.45 : 1);
              // instanceColor multiplies the rock material, so 1,1,1 is bare stone
              rockTint.setRGB(1 + 0.35 * rsh, 1 + 0.18 * rsh, 1 - 0.38 * rsh);
              rk2.mesh.setColorAt(rj, rockTint);
            }
            rk2.mesh.instanceColor.needsUpdate = true;
          }
        }

        /* ---- pool quads: surface = min(tide, rim); hidden once merged ---- */
        var exposed = 0;
        for (var pj = 0; pj < poolCols.length; pj++) {
          var pci = poolCols[pj];
          var pool = pools[poolOf[pci]];
          var pgx = Math.floor(pci / NXB), pgz = pci % NXB;
          if (tideNow >= pool.rimY) {
            dummy.scale.set(0, 0, 0);                       // sea plane covers it
            dummy.position.set(0, -999, 0);
          } else {
            dummy.position.set(pgx * CELLX - HALFX, pool.rimY, pgz * CELLZ - HALFZ);
            dummy.scale.set(1, 1, 1);
            exposed = 1;
          }
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          poolMesh.setMatrixAt(pj, dummy.matrix);
        }
        poolMesh.instanceMatrix.needsUpdate = true;
        poolMesh.visible = !!exposed;

        /* ---- day / night (independent clock, §8) ---- */
        lastSimT = t;
        var cyclePos = (t + dayOffset) % DAY_CYCLE_SECS;
        if (cyclePos < 0) cyclePos += DAY_CYCLE_SECS;
        var phase = cyclePos / DAY_CYCLE_SECS;
        var bl = dayBlend(phase);

        skyMat.uniforms.top.value.copy(SKY_TOP[bl.idx]).lerp(SKY_TOP[bl.nxt], bl.lt);
        skyMat.uniforms.mid.value.copy(SKY_MID[bl.idx]).lerp(SKY_MID[bl.nxt], bl.lt);
        skyMat.uniforms.bot.value.copy(SKY_BOT[bl.idx]).lerp(SKY_BOT[bl.nxt], bl.lt);
        scene.fog.color.copy(FOG_C[bl.idx]).lerp(FOG_C[bl.nxt], bl.lt);
        scene.background.copy(BG_C[bl.idx]).lerp(BG_C[bl.nxt], bl.lt);
        sun.color.copy(SUN_COLOR[bl.idx]).lerp(SUN_COLOR[bl.nxt], bl.lt);
        hemi.color.copy(HEMI_SKY[bl.idx]).lerp(HEMI_SKY[bl.nxt], bl.lt);
        hemi.groundColor.copy(HEMI_GRND[bl.idx]).lerp(HEMI_GRND[bl.nxt], bl.lt);

        var daylight = lerpNum(DAYLIGHT, bl);
        sun.intensity = lerpNum(SUN_INTEN, bl);
        hemi.intensity = lerpNum(HEMI_INTEN, bl);

        var sunAng = (phase - 0.25) * Math.PI * 2;
        sun.position.set(Math.cos(sunAng) * ORBIT_R, ORBIT_BASE_Y + Math.sin(sunAng) * ORBIT_H, ORBIT_Z);
        moon.position.set(-sun.position.x, -sun.position.y + ORBIT_BASE_Y * 2, -ORBIT_Z);
        moon.intensity = Math.max(0, 0.45 - daylight) * 0.9;
        starMat.opacity = Math.max(0, Math.min(1, 1 - daylight * 1.8));

        // water colour tracks the sky — a flat teal at midnight looks painted on
        seaMat.color.setHex(0x54b0d8).multiplyScalar(0.22 + 0.78 * daylight);
        seaFace.material.color.setHex(0x3f93b4).multiplyScalar(0.22 + 0.78 * daylight);
        poolMat.color.setHex(0x62c0d4).multiplyScalar(0.25 + 0.75 * daylight);
        dayDeep = 0.25 + 0.75 * daylight;   // the seabed tint dims with the light too
        dayFilm = 0.30 + 0.70 * daylight;   // and the film sinks out of sight after dark

        worldOut.daylight = daylight;
        worldOut.isNight = daylight < 0.3;
      }
    };

    // Open in late morning rather than at the cycle's zero (midnight) — the
    // shore's colour bands and the wet-sand line are the whole point of the
    // first ten seconds, and neither reads in the dark.
    setDayPhase(0.42);

    // Prime the derived tide fields so anything reading them before the first
    // update (the UI builds its gauge at boot) sees real values, not defaults.
    worldOut.update(0, 0, null);
    return worldOut;
  }

  window.World = { build: build };
})();
