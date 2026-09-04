/* ============================================================
   seagrass.js — the tape seagrass meadow (BUILD_GUIDE §1, §7).

   Tape seagrass, *Enhalus acoroides*: metre-long ribbon blades off a
   buried rhizome, in the lagoon at 0.3–0.7 m CD. It is the second
   producer with a body on this shore, and the second half of §7's
   "biofilm & seagrass resource".

   IT IS THE TIDE'S BEST WITNESS. Under water the blades stand and
   stream with the current. On a spring low the lagoon drains and the
   whole meadow COLLAPSES — every blade lying flat on the mud, combed
   down-shore the way the water left. That is what a drained seagrass
   bed actually looks like, it is the thing photographs of Chek Jawa's
   spring lows are full of, and it is worth more than any amount of
   blade detail: from a hundred metres up you cannot see a blade, but
   you can see a meadow stand up and lie down twice a day.

   THE STANDING / LYING SPLIT IS WHERE THE WORK GOES.
     - the sway (upright, submerged) is in the SHADER, per vertex, so
       6 000 blades ripple for free
     - the collapse is on the CPU, in a throttled matrix rebuild, and
       has to be: it is a rotation about the blade's base, and the
       blade's local x is scaled to 0.1 by its own instance matrix, so
       laying it over in the vertex shader would flatten it into a
       tenth of the ground it should cover

   ONE DRAW CALL, same deal as §19's pneumatophores: an InstancedMesh
   of blades scattered across the band, each sampling terrain height at
   its OWN x,z, with per-instance colour so a dense bed does not read
   as one flat green mat.

   THE RESOURCE. Like the biofilm it carries a standing crop 0..1 on
   world.js's terrain node grid (see biofilm.js for why that grid and
   not a patch grid of its own), with its own capacity curve — deeper
   and more constant submersion than the film wants. Blade LENGTH is
   read off it, so a grazed or poor patch is visibly shorter turf.

   NO ANIMAL EATS IT YET, and that is stated rather than faked: the
   grazing seam (`at` / `graze`, published as world.grassAt /
   world.grazeGrass) is here and works, but every v1 grazer bottoms out
   at 1.0 m CD and the meadow is below 0.9. The dugong, green turtle,
   sea hare and sand dollar are the animals that would come down here.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the knobs ---------- */
  var COUNT = 9000;
  var ZONE = [0.05, 0.95];      // metres CD it will grow in — the lagoon and its edges
  var Z_RANGE = [14, 58];       // cross-shore extent of the bed
  var BLADE = [0.55, 1.45];     // metres, tip to rhizome — Enhalus is the long one
  var CLUMP = [5, 12];          // blades per rhizome
  var CLUMP_R = 0.55;           // metres the blades of one clump spread over
  var BED = [8, 20];            // rhizomes per bed
  var BED_R = 4.2;              // metres a bed spreads over
  var LAY_SECS = 0.25;          // throttle on the stand/collapse rebuild
  var FALL_YAW = 0;             // +z, seaward — the way the ebb leaves

  /* Resource. Wetter and more constant than the biofilm's band, so it
     regrows faster and its ceiling peaks lower down the shore. */
  var GROW_SECS = 190;          // slower than biofilm: this is a plant, not a film
  var CAP_LUSH = [0.10, 0.75];  // full meadow
  var CAP_EDGE = 0.15;          // what is left at the band's edges

  var GREEN = [0x2f6b3a, 0x38763f, 0x275c34, 0x417f45];
  var TIRED = new THREE.Color(0x6d7238);   // thin, epiphyte-brown turf on a poor patch

  var seed = 90210;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function range(a, b) { return a + rand() * (b - a); }

  /* One blade: a strap, tapered and thinned toward the tip so it reads
     as a leaf rather than a lath. Unit height, centred — the instance
     matrix scales it to length. */
  function bladeGeo() {
    var g = new THREE.BoxGeometry(0.085, 1, 0.018, 1, 2, 1);
    var p = g.attributes.position.array;
    for (var i = 0; i < p.length; i += 3) {
      var up = p[i + 1] + 0.5;                       // 0 base .. 1 tip
      var t = 1 - up * 0.62;                         // taper
      p[i] *= t;
      p[i + 2] *= t;
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }

  /* Lambert + a vertex-shader sway, patched the same way savanna's
     grass field does it so instancing, per-instance colour and lighting
     all survive. `uLimp` is the meadow's overall submersion: the sway
     dies as the water leaves, because a blade lying on mud does not
     stream. */
  function material() {
    var m = new THREE.MeshLambertMaterial();
    m.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uLimp = { value: 1 };
      shader.vertexShader = 'uniform float uTime;\nuniform float uLimp;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        'float sgPhase = instanceMatrix[3].x * 0.09 + instanceMatrix[3].z * 0.16;\n' +
        'float sgTip = max(0.0, position.y + 0.5);\n' +
        /* Two frequencies: a slow swell the whole bed shares and a faster
           per-blade flutter. One alone reads as a flag, both together read
           as water moving over a meadow. */
        'float sgSway = (sin(uTime * 0.9 + sgPhase) * 0.55 + sin(uTime * 2.3 + sgPhase * 1.7) * 0.2);\n' +
        /* METRES, not blade-widths. The instance matrix scales y by the
           blade's length and leaves x alone, so `transformed.x` here is
           world metres — at 3.2 a blade swung 2.4 m sideways and the
           meadow read as kelp in a storm. */
        'sgSway *= sgTip * sgTip * uLimp * 0.22;\n' +
        'transformed.x += sgSway;\n' +
        'transformed.z += sgSway * 0.4;\n'
      );
      m.userData.shader = shader;
    };
    return m;
  }

  /* ------------------------------------------------------------
     build

     `ctx` is world.js's build-time handle on itself:
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
      crop[i] = c * 0.9;              // an established meadow, not a replanting
    }

    var BASE = 1 / GROW_SECS;
    function updateCrop(dt, daylight) {
      var k = BASE * (0.35 + 0.65 * daylight) * dt;
      for (var ci = 0; ci < N; ci++) {
        var cap = capacity[ci];
        if (cap <= 0) continue;
        var f = crop[ci];
        if (f >= cap) continue;
        /* Submersion, not wetness, is the input: a seagrass blade out of
           the water is not growing, it is drying out. Same `wet` field the
           biofilm keys off (§7) — a bed this low is under water almost all
           the time, which is exactly why it can afford metre-long leaves. */
        f += k * (0.05 + 0.95 * wet[ci]) * (1 - f / cap + 0.2);
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
    var mesh = new THREE.InstancedMesh(bladeGeo(), mat, COUNT);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.name = 'seagrass';

    // per-blade base data, kept so the stand/collapse rebuild never re-scatters
    var bX = new Float32Array(COUNT), bZ = new Float32Array(COUNT), bY = new Float32Array(COUNT);
    var bLen = new Float32Array(COUNT), bYaw = new Float32Array(COUNT);
    var bLean = new Float32Array(COUNT), bNode = new Int32Array(COUNT);
    var bLay = new Float32Array(COUNT);          // 0 standing .. 1 flat on the mud
    var bFall = new Float32Array(COUNT);         // the heading it goes over on
    var bRGB = new Float32Array(COUNT * 3);      // its own green, before the crop tint
    var bLastLay = new Float32Array(COUNT), bLastCrop = new Float32Array(COUNT);   // dirty check

    function onRock(x, z) {
      for (var r = 0; r < ctx.rocks.length; r++) {
        var rk = ctx.rocks[r], dx = rk.x - x, dz = rk.z - z;
        if (dx * dx + dz * dz < (rk.r + 0.4) * (rk.r + 0.4)) return true;
      }
      return false;
    }

    var dummy = new THREE.Object3D(), col = new THREE.Color();
    var placed = 0, guard = 0;
    /* THREE levels, not one. Scattering blades evenly over 8 000 m² gives
       0.7 blades/m² and reads as weeds, not as a meadow. Real Enhalus grows
       in dense beds with bare sand between them, so: a BED centre, several
       rhizomes around it, several blades on each. Same blade budget, and the
       contrast between thick bed and open sand is what makes it read. */
    while (placed < COUNT && guard++ < COUNT * 60) {
      var bedX = range(-ctx.halfX + 8, ctx.halfX - 8);
      var bedZ = range(Math.max(Z_RANGE[0], ctx.zMin + 2), Math.min(Z_RANGE[1], ctx.zMax - 2));
      if (ctx.heightAt(bedX, bedZ) < ZONE[0] || ctx.heightAt(bedX, bedZ) > ZONE[1]) continue;
      var rhizomes = Math.floor(range(BED[0], BED[1] + 1));
      for (var rz = 0; rz < rhizomes && placed < COUNT; rz++) {
      var ra = rand() * Math.PI * 2, rd = Math.sqrt(rand()) * BED_R;
      var cx = bedX + Math.cos(ra) * rd, cz = bedZ + Math.sin(ra) * rd;
      var ch = ctx.heightAt(cx, cz);
      if (ch < ZONE[0] || ch > ZONE[1]) continue;
      if (onRock(cx, cz)) continue;
      var cnode = indexAt(cx, cz);
      if (cnode < 0 || capacity[cnode] <= 0) continue;
      var clumpYaw = rand() * Math.PI * 2;
      var blades = Math.floor(range(CLUMP[0], CLUMP[1] + 1));
      for (var b = 0; b < blades && placed < COUNT; b++) {
        var oa = rand() * Math.PI * 2, od = range(0, CLUMP_R);
        var gx = cx + Math.cos(oa) * od, gz = cz + Math.sin(oa) * od;
        var gh = ctx.heightAt(gx, gz);
        // the rhizome is in the band; a blade half a metre off it need not be
        if (gh < ZONE[0] || gh > ZONE[1]) continue;
        bX[placed] = gx; bZ[placed] = gz; bY[placed] = gh;
        bLen[placed] = range(BLADE[0], BLADE[1]);
        // blades of one rhizome fan off a shared heading rather than pointing anywhere
        bYaw[placed] = clumpYaw + range(-0.7, 0.7);
        bLean[placed] = range(0.05, 0.30);       // even standing, a blade is not a post
        /* Everything goes over the SAME way — down-shore, after the water.
           A meadow that collapses outward from each rhizome reads as a field
           of starbursts; a meadow combed one way reads as a drained lagoon.
           The jitter is small on purpose. */
        bFall[placed] = FALL_YAW + range(-0.3, 0.3);
        bNode[placed] = indexAt(gx, gz);
        col.setHex(GREEN[Math.floor(rand() * GREEN.length)]).multiplyScalar(range(0.82, 1.14));
        bRGB[placed * 3] = col.r; bRGB[placed * 3 + 1] = col.g; bRGB[placed * 3 + 2] = col.b;
        mesh.setColorAt(placed, col);
        placed++;
      }
      }
    }
    var COUNT_REAL = placed;
    // any unused slots are collapsed to nothing rather than left at the origin
    var HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
    for (i = placed; i < COUNT; i++) mesh.setMatrixAt(i, HIDE);

    ctx.scene.add(mesh);

    /* ---------- click targets ----------
       9 000 blades is nothing to draw and everything to click: the
       screen-space picker (ui.js) is a flat scan over every population
       every hover, and animal populations top out in the hundreds. So
       this is not "one blade is clickable" — it is a few dozen points
       strided evenly out of the real, already-placed blade positions,
       spread across whichever beds the scatter above actually landed
       in. Clicking anywhere in the meadow lands near one; following it
       just means the camera holds still over that patch, the same as
       following a barnacle. */
    var patches = [];
    var PATCH_TARGET = 50;
    var patchStride = Math.max(1, Math.floor(COUNT_REAL / PATCH_TARGET));
    for (var pI = 0; pI < COUNT_REAL; pI += patchStride) {
      patches.push({ x: bX[pI], y: bY[pI], z: bZ[pI] });
    }

    /* ---------- stand / collapse ----------
       One blade's matrix, pivoted at the RHIZOME. The blade's own +Y is
       tilted away from vertical toward its fall heading; the box is
       centred, so the centre then has to be pushed half a blade along
       that new axis or the plant sinks through the mud as it goes over.

       `lay` 0 = standing at its natural lean, 1 = flat on the ground. */
    var qTilt = new THREE.Quaternion(), qSpin = new THREE.Quaternion();
    var axis = new THREE.Vector3(), scl = new THREE.Vector3(), pos = new THREE.Vector3();
    var UPY = new THREE.Vector3(0, 1, 0);
    var mBlade = new THREE.Matrix4();

    // shortest-way angle interpolation — a blade must not unwind the long way
    function angLerp(a, b, t) {
      var d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return a + d * t;
    }

    function placeBlade(k, f) {
      var lay = bLay[k];
      var len = bLen[k] * (0.45 + 0.55 * f);
      var tilt = bLean[k] + (Math.PI / 2 - bLean[k]) * lay;      // 0 = up, PI/2 = flat
      // standing, it leans whichever way it grew; going over, it swings down-shore
      var dirA = angLerp(bYaw[k], bFall[k], lay);
      var sd = Math.sin(dirA), cd = Math.cos(dirA);
      // rotating +Y about (cos, 0, -sin) by `tilt` swings it toward (sin, 0, cos)
      axis.set(cd, 0, -sd);
      qTilt.setFromAxisAngle(axis, tilt);
      qSpin.setFromAxisAngle(UPY, bYaw[k]);                      // the strap's own facing
      qTilt.multiply(qSpin);
      var st = Math.sin(tilt), ct = Math.cos(tilt), half = len * 0.5;
      pos.set(bX[k] + sd * st * half, bY[k] + ct * half, bZ[k] + cd * st * half);
      scl.set(1, len, 1);
      mBlade.compose(pos, qTilt, scl);
      mesh.setMatrixAt(k, mBlade);
    }
    function cropOf(k) {
      var ci = bNode[k];
      if (ci < 0) return 1;
      var cap = capacity[ci];
      return cap > 0 ? crop[ci] / cap : 0;
    }

    /* Colour follows the crop: a thinned patch goes olive-brown before it
       goes short, which is what makes a poor patch legible at all. Started
       from the blade's own stored green so a refresh cannot recolour the
       meadow. */
    function tintBlade(k, f) {
      var o = k * 3;
      col.setRGB(bRGB[o], bRGB[o + 1], bRGB[o + 2]).lerp(TIRED, (1 - f) * 0.75);
      mesh.setColorAt(k, col);
    }

    for (var k0 = 0; k0 < COUNT_REAL; k0++) { var f0 = cropOf(k0); bLastLay[k0] = bLay[k0]; bLastCrop[k0] = f0; placeBlade(k0, f0); }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    /* ---------- update ---------- */
    var layT = 0, limp = 1;
    function update(dt, t, daylight) {
      updateCrop(dt, daylight);

      if (mat.userData.shader) {
        mat.userData.shader.uniforms.uTime.value = t;
        mat.userData.shader.uniforms.uLimp.value = limp;
      }

      layT -= dt;
      if (layT > 0) return;
      layT = LAY_SECS;

      /* Exposure per blade, from the water surface at its own spot — so a
         blade in a runnel that still holds water stays standing while the
         bed around it has gone over. Pools are the whole reason this is
         sampled per blade and not from `world.tide`. */
      /* A blade is only rebuilt if something about it actually changed.
         Worth the two extra arrays: a meadow that is fully up or fully over
         with its crop at capacity — which is most of the time — costs a
         waterAt lookup per blade and nothing else, instead of 6 000 matrix
         composes four times a second. */
      var standing = 0, dirty = false;
      for (var k = 0; k < COUNT_REAL; k++) {
        var surf = ctx.waterAt(bX[k], bZ[k]);
        var depth = surf === null ? -0.05 : surf - bY[k];
        // fully up in 8 cm of water, fully over once the mud is dry
        var want = depth > 0.08 ? 0 : (depth < 0 ? 1 : 1 - depth / 0.08);
        if (want < 0.5) standing++;
        var d = want - bLay[k];
        if (Math.abs(d) > 0.002) {
          // it goes over faster than it comes back up — water lifts a blade slowly
          bLay[k] += d * Math.min(1, (d > 0 ? 2.2 : 1.1) * LAY_SECS);
        }
        var f = cropOf(k);
        if (Math.abs(bLay[k] - bLastLay[k]) < 0.004 && Math.abs(f - bLastCrop[k]) < 0.01) continue;
        bLastLay[k] = bLay[k]; bLastCrop[k] = f;
        placeBlade(k, f);
        tintBlade(k, f);
        dirty = true;
      }
      limp = COUNT_REAL ? standing / COUNT_REAL : 1;
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
      // fraction of the meadow still standing in water — 0 at a spring low
      standing: function () { return limp; },
      patches: patches               // [{x,y,z}] — click targets, see above
    };
  }

  window.Seagrass = { build: build };
})();
