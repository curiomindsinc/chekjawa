/* ============================================================
   anemonebody.js — Haddon's carpet anemone's parts.

   facet.js for the palette, the material and the column; the ORAL
   DISC is hand-rolled, for the reason sanddollarbody.js (§31) and
   spongebody.js (§35) hand-rolled theirs — `Facet.colorize` reads a
   triangle's position along a sweep and up it, two axes, and this
   animal needs a third. But NOT the same third as the sponge. The
   sponge needed the ANGLE about its own centre, for growth rings.
   This one needs HEIGHT ABOVE THE DISC SURFACE, because the whole
   read of a carpet anemone is the difference between the tentacle
   TIPS and the skin they stand on: a real S. haddoni is a dull
   green-brown disc carrying thousands of short blunt tentacles with
   paler tips, and if the tips are not a different colour from the
   floor between them the animal is a lily pad.

   TWO PARTS, AND WHICH ONE YOU SEE IS THE BEHAVIOUR.

     disc    the carpet: a low dome of concentric rings with a nubbed
             surface (every other vertex lifted — spongebody.js's
             osculum trick, applied to the WHOLE surface instead of a
             scatter of it) and a lobed, ruffled margin, which is the
             single most recognisable thing about this species seen
             from above.
     column  the trunk. Buried in sand and invisible while the animal
             is spread, and the ONLY thing above ground once it has
             contracted — a low-tide carpet anemone is a wrinkled
             orange blob, and that blob is the column wall. It carries
             the verrucae, the sticky warts a real column is covered
             in, as sweep jitter plus dark speckle.

   Body units with the SPREAD DISC'S DIAMETER = 1.0, and +X is "up out
   of the sand" — barnaclebody.js's convention, which spongebody.js
   already borrowed, because this is the third thing on this shore
   that is fixed to one spot and grows away from it.

   ONE SURFACE ONLY, again. The disc lies on sand and nothing will
   ever see its underside, so it is wound outward and stops there.

   Colour: dull green-brown disc, paler tentacle tips, a buff oral
   cone at the centre, a darker rim on the ruffled margin — and an
   orange-red column, which is not decoration. On a real Haddon's
   carpet anemone the column IS orange-red under a drab disc, and
   since the column is exactly what a contracted one shows, the animal
   changing colour when it shuts down is a free consequence of getting
   both of them right.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, pk = Facet.pick, ramp = Facet.ramp;
  var sweep = Facet.sweep, colorize = Facet.colorize, geom = Facet.geom;

  /* ---------- palette ---------- */
  var DISC = [0x5e6b46, 0x687450, 0x55613f, 0x6f7a55];   // dull green-brown skin
  var TIP  = [0x9fae7d, 0xaab884, 0x93a171];             // the paler tentacle tips
  var ORAL = [0xbcac7c, 0xc6b687, 0xb2a172];             // the buff cone round the mouth
  var MOUTH = [0x3b3324, 0x332c1f];                      // the slit itself
  var MARG = [0x4a5438, 0x424b32];                       // the ruffled rim, a shade down
  var COL  = [0xb85c3a, 0xc2673f, 0xa9522f, 0xb15633];   // orange-red column
  var WART = [0x843c24, 0x76351e];                       // verrucae

  var RAD = 0.5;
  /* SEG has to resolve the LOBES of the margin, not the disc — nine
     lobes round a circle is 0.70 rad each, and a lobe needs more than
     a handful of steps to come back as a curve rather than a spike, so
     72 (0.087 rad/step) puts eight steps across each one. §38's
     lesson, applied before it cost anything this time. */
  var SEG = 72;
  /* Ring radii, crowded toward the margin because that is where the
     shape happens — the middle of a carpet anemone is nearly flat. */
  var RINGS = [0, 0.07, 0.15, 0.25, 0.36, 0.47, 0.57, 0.66, 0.74, 0.81, 0.87, 0.92, 0.96, 1.0];

  var DOME   = 0.060;           // how far the centre stands above the margin
  var CONE   = 0.045;           // the oral cone on top of that
  var CONE_R = 0.16;            // how much of the disc's radius the cone occupies
  var BUMP   = 0.030;           // tentacle nub height
  var NUB    = 2;               // ring/segment cells per nub — see the note in carpet()
  var LOBES  = 9;               // folds round the ruffled margin
  var RUFF_R = 0.085;           // how far each lobe pushes the margin in and out
  /* The vertical part of the ruffle stays SMALL. The first pass had it
     at 0.045 against a 0.085 dome and the margin came back as a
     nine-pointed crown standing up off the disc — a carpet anemone's
     edge waves in and out far more than it waves up and down, and the
     render made the difference obvious immediately. */
  var RUFF_H = 0.018;

  function smooth(a, b, x) {
    var k = (x - a) / (b - a);
    if (k < 0) k = 0; else if (k > 1) k = 1;
    return k * k * (3 - 2 * k);
  }

  /* The disc surface WITHOUT the nubs — the floor the tentacles stand
     on. Kept as its own function because the shape is used twice: once
     to build the ring grid, once as the datum a nub is measured from. */
  function floorAt(u, th) {
    var h = DOME * (1 - u * u);
    h += CONE * Math.pow(Math.max(0, 1 - u / CONE_R), 1.4);
    h += RUFF_H * smooth(0.62, 1.0, u) * Math.sin(LOBES * th + 0.6);
    return h;
  }

  /* The carpet. Per-triangle `lift` (0 floor .. 1 tentacle tip) and `u`
     (0 mouth .. 1 margin) come out alongside the positions, which is
     the whole reason this is not a sweep. */
  function carpet() {
    var pos = [], lift = [], uu = [];
    function tri(a, b, c, la, lb, lc, u) {
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      lift.push((la + lb + lc) / 3); uu.push(u);
    }

    var ring = [], nub = [], r, q;
    for (r = 0; r < RINGS.length; r++) {
      var u = RINGS[r];
      var row = [], nrow = [];
      for (q = 0; q < SEG; q++) {
        var th = q / SEG * Math.PI * 2;
        // the margin waves in and out as well as up and down
        var rr = u * RAD * (1 + RUFF_R * smooth(0.55, 1.0, u) * Math.sin(LOBES * th + 0.6));
        rr *= 1 + (hash(r, q, 8101) - 0.5) * 0.05;
        /* A CHECKER of NUB×NUB CELLS, not of single vertices — and the
           cell size is the whole point. A one-vertex checker looks
           right in the numbers and paints nothing: every triangle then
           has exactly two lifted corners out of three, so every
           triangle scores the same lift and paint() cannot tell a
           tentacle tip from the skin between them. The first pass did
           exactly that and returned a disc in one flat green.

           At NUB=2 a triangle can sit wholly inside a raised cell or
           wholly inside a sunk one, which is what gives paint() two
           populations to colour. It also puts the nubs at ~4 cm on a
           45 cm animal — coarser than a real tentacle and the right
           size for the distance anyone will ever see one from, which
           is the same call the moon snail's sand collar made (§35).

           Regular, not hashed: a carpet of tentacles IS regular, and
           scattering which ones are raised turns a quilt into gravel.
           The oral cone stays smooth — a real one is bare skin right
           around the mouth. */
        var cell = (Math.floor(r / NUB) + Math.floor(q / NUB)) % 2 === 0;
        var isTip = cell && u > CONE_R * 0.9;
        var h = floorAt(u, th) + (isTip ? BUMP * (0.78 + hash(r, q, 8123) * 0.44) : 0);
        row.push([h, Math.cos(th) * rr, Math.sin(th) * rr]);
        nrow.push(isTip ? 1 : 0);
      }
      ring.push(row);
      nub.push(nrow);
    }

    for (r = 0; r < RINGS.length - 1; r++) {
      var uMid = (RINGS[r] + RINGS[r + 1]) * 0.5;
      for (q = 0; q < SEG; q++) {
        var q2 = (q + 1) % SEG;
        var i0 = ring[r][q], o0 = ring[r + 1][q];
        var i1 = ring[r][q2], o1 = ring[r + 1][q2];
        // radial-outward then counter-clockwise: +X normal, the same
        // winding rule spongebody.js and sanddollarbody.js both use
        tri(i0, o0, o1, nub[r][q], nub[r + 1][q], nub[r + 1][q2], uMid);
        tri(i0, o1, i1, nub[r][q], nub[r + 1][q2], nub[r][q2], uMid);
      }
    }
    return { pos: pos, lift: lift, u: uu };
  }

  /* Per-triangle colour in (radius, lift) — the two axes a sweep
     cannot give. */
  function paint(d) {
    var pos = d.pos, lift = d.lift, u = d.u;
    var col = new Float32Array(pos.length);
    var c = new THREE.Color();
    for (var i = 0; i < pos.length; i += 9) {
      var ti = i / 9;
      var uv = u[ti], lv = lift[ti];
      if (uv < 0.055) {
        // the mouth — a dark slit, not a dark dot. A real one is a
        // narrow line across the oral cone
        var cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
        c.setHex(Math.abs(cz) < RAD * 0.030 ? pk(MOUTH, ti) : pk(ORAL, ti));
      } else if (uv < CONE_R) {
        c.setHex(pk(ORAL, ti));
      } else if (uv > 0.90) {
        c.setHex(lv > 0.6 ? pk(TIP, ti) : pk(MARG, ti));
      } else {
        c.setHex(lv > 0.6 ? pk(TIP, ti) : pk(DISC, ti));
      }
      for (var k = 0; k < 3; k++) {
        col[i + k * 3] = c.r;
        col[i + k * 3 + 1] = c.g;
        col[i + k * 3 + 2] = c.b;
      }
    }
    return col;
  }

  function disc() {
    var d = carpet();
    return geom(d.pos, paint(d));
  }

  /* The column — an ordinary sweep, root-at-origin along +X so
     anemones.js points it up and scales its HEIGHT and its GIRTH
     independently. That independence is the contraction: spread, the
     column is a wide low collar the sand covers; shut, it is a tall
     narrow blob and it is the only thing left above ground. */
  function column() {
    var pos = sweep({
      len: 1.0, rad: 0.30, seg: 16, rings: 6, round: 2.0,
      jitter: 0.22, seed: 47,
      profile: ramp([[0, 0.90], [0.25, 1.0], [0.62, 0.96], [0.86, 0.80], [1, 0.58]])
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return hash(i, 31, 11) > 0.80 ? pk(WART, i) : pk(COL, i);
    }));
  }

  var cache = null;
  function parts() {
    if (cache) return cache;
    cache = { disc: disc(), column: column() };
    return cache;
  }

  window.AnemoneBody = { parts: parts, material: Facet.material };
})();
