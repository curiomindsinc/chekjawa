/* ============================================================
   horseshoebody.js — the mangrove horseshoe crab's parts.

   facet.js kit. Body units with the PROSOMA'S WIDTH = 1.0, and +X is
   FORWARD, +Y up, ±Z lateral — the ordinary convention on this shore,
   so horseshoecrabs.js applies the usual `yaw - PI/2` correction
   (§20/§21/§27/§30) and nothing here is special about it.

   THE OUTLINE IS THE SPECIES. Nobody identifies this animal by
   colour, texture or gait — they identify it by a silhouette, and
   the silhouette is three shapes locked together: a domed horseshoe
   arch in front, a small spined plate behind it, and a tail spike
   longer than both. Get the outline right and it reads instantly at
   any distance; get it wrong and it is a beetle. So the carapace is
   the one thing in this file worth hand-rolling.

   WHY THE PROSOMA IS HAND-ROLLED — the same two reasons §31's sand
   dollar had, arriving from a different direction.

   1. `sweep()` builds a tube: one radius per ring, modulated by a
      profile that varies ALONG the axis. A horseshoe carapace's
      radius varies AROUND the axis instead — wide and round in
      front, cut off square behind, with a genal spine trailing off
      each rear corner. That is an outline(theta), and sweep has
      nowhere to put one.

   2. Its cap is a single fan (see facet.js), so a dome built as a
      swept end-cap has no interior rings — nowhere to raise a
      cardiac ridge, which is the second thing the eye uses to read
      this animal right way up.

   `shell()` below therefore builds BOTH plates out of concentric
   rings by hand, exactly as `sanddollarbody.js:disc()` does, and
   takes an outline function so the prosoma and the opisthosoma are
   one piece of code with two shapes passed in. Every triangle is
   tagged with the face it belongs to (+1 top, -1 underside, 0 rim)
   because the material is FrontSide and each of the three has to be
   wound to face its own way out.

   WHAT IS NOT HAND-ROLLED. The telson, the legs and the eyes are
   ordinary `sweep()` solids, because all three are tubes and a tube
   is what sweep is for. The furrow is a sweep too — see the note on
   it below, and §35's sand collar for the precedent.
   ============================================================ */
(function () {
  'use strict';

  var hash = Facet.hash, ramp = Facet.ramp, pk = Facet.pick;
  var sweep = Facet.sweep, geom = Facet.geom, colorize = Facet.colorize;

  /* ---------- palette ----------
     Carcinoscorpius rotundicauda out of the mangrove mud: olive to
     black-brown on top, and genuinely glossy in life — which a
     Lambert material cannot do, so the shine is faked the only way
     flat facets allow, by widening the spread between the top
     colours so the facet boundaries carry more contrast. */
  var SHELL  = [0x4e4230, 0x574a35, 0x453a2a, 0x5f5139];  // the carapace, wet mangrove mud over olive
  var RIDGE  = [0x6b5c42, 0x74644a];                      // the cardiac ridge and the compound-eye ridges
  var RIM    = [0x332b1f, 0x3a3125];                       // the rolled edge, always in its own shadow
  var UNDER  = [0x8a7d63, 0x7e7159];                       // the underside — much paler than the top
  var SPINE  = [0x2e271c];                                 // genal spines and the movable spines
  var TELSON = [0x453a29, 0x4e4231, 0x3c3225];             // the tail, banded along its length
  var LEG    = [0x7a6d55, 0x6e6249];
  var EYE    = [0x241e16];
  var MUD    = [0x453c2a, 0x4d4433, 0x3b3324];             // the furrow: turned mangrove mud, wetter and darker than the flat it cuts

  /* Per-triangle colour in (face, radius, angle) about +Y — the
     three-argument form the sand dollar needed, with the axis
     changed from +X to +Y because this animal points somewhere and
     that one does not. `face` is carried on the triangle rather than
     guessed from its position. */
  function paint(d, rad, fn) {
    var pos = d.pos, face = d.face;
    var col = new Float32Array(pos.length);
    var c = new THREE.Color();
    for (var i = 0; i < pos.length; i += 9) {
      var ti = i / 9;
      var cx = (pos[i]     + pos[i + 3] + pos[i + 6]) / 3;
      var cz = (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3;
      c.setHex(fn(face[ti], Math.hypot(cx, cz) / rad, Math.atan2(cz, cx), ti));
      for (var k = 0; k < 3; k++) {
        col[i + k * 3]     = c.r;
        col[i + k * 3 + 1] = c.g;
        col[i + k * 3 + 2] = c.b;
      }
    }
    return col;
  }

  /* ------------------------------------------------------------
     shell(o) — one domed plate of concentric rings.

       outline(th)  half-width that way round, in body units. This is
                    the silhouette and the whole reason the file exists.
       dome(u, x, z) height above the plane at ring fraction `u`
       thick(u)     half-thickness there

     Rings crowd toward the rim (RINGS below is not linear) because
     the rim is where the outline lives and the interior is nearly
     flat. Winding: top rings wind one way, underside rings the
     other, the rim skirt joins them.
     ------------------------------------------------------------ */
  /* SEG is 96 rather than the sand dollar's 28 because of the genal
     spines. They are ~0.10 rad wide, and the angular step has to be
     several times finer than the feature or the spine lands on one
     vertex and reads as a dent: 44 segments gives 0.143 rad and lost
     them entirely, 64 gives 0.098 and rounded them off, 96 gives
     0.065 and they come to a point. The geometry is built once and
     instanced across the population, so the extra rings are paid for
     at load and never again. */
  var SEG = 96;
  var RINGS = [0, 0.18, 0.34, 0.49, 0.62, 0.74, 0.85, 0.93, 1.0];

  function shell(o) {
    var outline = o.outline, dome = o.dome, thick = o.thick;
    var seed = o.seed || 0;
    var pos = [], face = [];
    var r, q;
    function tri(a, b, c, f) {
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      face.push(f);
    }

    // ring[r][q] = [topPoint, bottomPoint]
    var ring = [];
    for (r = 0; r < RINGS.length; r++) {
      var u = RINGS[r];
      var row = [];
      for (q = 0; q < SEG; q++) {
        var th = q / SEG * Math.PI * 2;
        var rr = outline(th) * u;
        // the same deterministic wobble the rest of the kit uses, kept
        // small: this outline is the identity of the animal and a big
        // jitter reads as damage rather than as life
        var j = 1 + (hash(r, q, seed) - 0.5) * 0.035;
        var x = Math.cos(th) * rr * j;
        var z = Math.sin(th) * rr * j;
        var h = thick(u);
        var y = dome(u, x, z);
        row.push([[x, y + h, z], [x, y - h * 0.55, z]]);
      }
      ring.push(row);
    }

    // the centre point of each face, so ring 0 is a proper fan not a pinhole
    var cTop = [0, dome(0, 0, 0) + thick(0), 0];
    var cBot = [0, dome(0, 0, 0) - thick(0) * 0.55, 0];
    for (q = 0; q < SEG; q++) {
      var q2 = (q + 1) % SEG;
      tri(cTop, ring[0][q][0], ring[0][q2][0], 1);
      tri(cBot, ring[0][q2][1], ring[0][q][1], -1);
    }

    for (r = 0; r < RINGS.length - 1; r++) {
      for (q = 0; q < SEG; q++) {
        var qq = (q + 1) % SEG;
        var a = ring[r][q], b = ring[r][qq], c = ring[r + 1][q], d = ring[r + 1][qq];
        // top skin
        tri(a[0], c[0], d[0], 1);
        tri(a[0], d[0], b[0], 1);
        // underside, wound the other way
        tri(a[1], d[1], c[1], -1);
        tri(a[1], b[1], d[1], -1);
      }
    }

    // the rim skirt closes top to bottom around the outermost ring
    var last = ring[RINGS.length - 1];
    for (q = 0; q < SEG; q++) {
      var q3 = (q + 1) % SEG;
      tri(last[q][0], last[q][1], last[q3][1], 0);
      tri(last[q][0], last[q3][1], last[q3][0], 0);
    }

    return { pos: pos, face: face };
  }

  /* ---------- the prosoma ----------
     The front arch. Width 1.0 across the widest point, which is about
     40% of the way back; the front rim is a smooth arc and the back
     is cut off square with a genal spine trailing from each corner.

     REAR_CUT is where the arc stops and the straight back edge
     begins. SPINE_AT is where the trailing corner sits. Both are
     measured from +X (dead ahead) so they read directly off the
     silhouette anyone would draw. */
  /* THE OUTLINE, and the one that shipped is the second one.

     The first attempt treated a horseshoe as a circle with the back
     shortened — radius scaled down past ~110 degrees. Photographed
     from directly above, which is the only view that carries this
     animal, it came out as an ACORN: a smooth closed convex curve,
     widest across the middle, tapering to a rounded rear. Every
     identifying feature was missing.

     A horseshoe crab's prosoma from above is not that shape at all:

       - the front is a broad, fairly FLAT arch, not a semicircle
       - it is widest at the REAR CORNERS, not amidships
       - between those corners the back edge cuts in HARD, which is
         the opening the name refers to
       - and each corner draws out into a genal spine pointing aft

     So the radius has to GROW toward the corner and then collapse,
     which no single scale factor on a circle can do. It is built here
     as three terms: the arch, a lobe that swells at the corner, and a
     cut that only bites past it. */
  var CORNER_AT = 2.30;         // rad, ~132 deg — the widest point of the animal
  var SPINE_AT  = 2.42;         // rad, ~139 deg — the genal spine tip, just outboard of it
  var CUT_FROM  = 2.45;         // rad, ~140 deg — the back edge starts cutting in here
  var P_RAD = 0.72;             // outline's largest value, for paint()'s radius normalisation

  function prosomaOutline(th) {
    // wrap to -PI..PI, then work on |th| — the animal is symmetric
    var t = th > Math.PI ? th - Math.PI * 2 : th;
    var a = Math.abs(t);

    // 1. the arch: slightly narrower ahead than abeam
    var r = 0.47 + 0.05 * Math.sin(a);

    // 2. the rear corners swing wide — this is the widest part of the animal
    r += 0.150 * Math.exp(-Math.pow((a - CORNER_AT) / 0.42, 2));
    // ...with a sharper point on top of the swell, the genal spine itself
    r += 0.105 * Math.exp(-Math.pow((a - SPINE_AT) / 0.105, 2));

    // 3. and past the corner the back edge cuts in toward the axis
    if (a > CUT_FROM) {
      var k = (a - CUT_FROM) / (Math.PI - CUT_FROM);
      r *= 1 - 0.62 * Math.pow(k, 1.3);
    }
    return r;
  }

  /* The dome. Highest just forward of centre (the cardiac region),
     falling to nothing at the rim, with a ridge running down the
     midline — the second cue that says which way up this is. */
  function prosomaDome(u, x, z) {
    /* A VAULT, NOT A CONE. The first version used 0.235 high with a
       (1-u^2)^0.75 falloff and photographed as a limpet — the height
       peaked at the centre and fell away from there, which is the
       wrong shape entirely. A horseshoe carapace is flat across most
       of its width and turns down sharply near the rim, so the
       exponent goes INSIDE: u^2.6 keeps the top nearly level out to
       about 70% of the radius and drops it off a cliff after that. */
    var h = 0.145 * Math.pow(1 - Math.pow(u, 2.6), 0.62);
    h += 0.030 * Math.exp(-(z * z) / (2 * 0.085 * 0.085)) * (1 - u * 0.55);   // cardiac ridge
    h += 0.022 * Math.exp(-((x - 0.16) * (x - 0.16) + (Math.abs(z) - 0.20) * (Math.abs(z) - 0.20)) / 0.006); // ophthalmic ridges
    return h;
  }
  function prosomaThick(u) { return 0.030 * Math.pow(1 - u * u * 0.9, 0.5) + 0.006; }

  function prosoma() {
    var d = shell({
      outline: prosomaOutline, dome: prosomaDome, thick: prosomaThick, seed: 77
    });
    var col = paint(d, P_RAD, function (face, rad, ang, ti) {
      if (face === 0) return pk(RIM, ti);
      if (face < 0) return pk(UNDER, ti);
      var a = Math.abs(ang > Math.PI ? ang - Math.PI * 2 : ang);
      // the spine tips are darker than the plate they grow off
      if (rad > 0.80 && Math.abs(a - SPINE_AT) < 0.30) return SPINE[0];
      // midline ridge, and the two eye ridges either side of it
      if (rad < 0.72 && Math.abs(Math.sin(ang)) * rad < 0.10) return pk(RIDGE, ti);
      return pk(SHELL, ti);
    });
    return geom(d.pos, col);
  }

  /* ---------- the opisthosoma ----------
     The plate behind. Roughly a rounded triangle, widest at its front
     edge where it hinges, with six movable spines down each side —
     built into the outline the same way the genal spines are, because
     at this animal's size on this shore they are silhouette, not
     geometry anyone will stand next to (§35's sand-collar call). */
  var O_RAD = 0.46;
  function opisthoOutline(th) {
    var t = th > Math.PI ? th - Math.PI * 2 : th;
    var a = Math.abs(t);

    // wide at the front (the hinge), tapering back toward the telson
    var r = 0.30 + 0.14 * Math.cos(t) * 0.5 + 0.10 * Math.cos(t);
    if (a > 2.0) {
      var k = (a - 2.0) / (Math.PI - 2.0);
      r *= 1 - 0.30 * k * k;          // the rear notch the telson sits in
    }
    // six movable spines down each edge, as a ripple on the rim
    var lobe = Math.exp(-Math.pow((a - 1.55) / 0.85, 2));
    r += 0.030 * lobe * Math.max(0, Math.sin(a * 7.5));
    return r;
  }
  function opisthoDome(u, x, z) {
    var h = 0.092 * Math.pow(1 - Math.pow(u, 2.4), 0.65);
    h += 0.022 * Math.exp(-(z * z) / (2 * 0.07 * 0.07)) * (1 - u * 0.5);
    return h;
  }
  function opisthoThick(u) { return 0.024 * Math.pow(1 - u * u * 0.9, 0.5) + 0.005; }

  function opisthosoma() {
    var d = shell({
      outline: opisthoOutline, dome: opisthoDome, thick: opisthoThick, seed: 131
    });
    var col = paint(d, O_RAD, function (face, rad, ang, ti) {
      if (face === 0) return pk(RIM, ti);
      if (face < 0) return pk(UNDER, ti);
      if (rad > 0.88) return SPINE[0];
      if (rad < 0.70 && Math.abs(Math.sin(ang)) * rad < 0.08) return pk(RIDGE, ti);
      return pk(SHELL, ti);
    });
    return geom(d.pos, col);
  }

  /* ---------- the telson ----------
     A long tapered spike, triangular in section like the real thing
     (round=3 pushes the cross-section toward a rounded triangle), and
     banded along its length so its length is legible when it swings.

     It is not a rudder and not a weapon: it is what the animal levers
     against the mud to right itself, so horseshoecrabs.js swings it
     in the vertical plane and never uses it to steer. */
  function telson() {
    var pos = sweep({
      len: 1.05, rad: 0.042, seg: 7, rings: 9, round: 3,
      profile: function (t) { return Math.pow(1 - t, 0.62) * (1 - t * 0.06) + 0.02; },
      aspectY: 1.15, aspectZ: 0.8,
      curveY: function (t) { return -0.02 * t * t; },
      jitter: 0.05, seed: 19
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      return pk(TELSON, i + Math.floor(t * 9) * 3);
    }));
  }

  /* ---------- a walking leg ----------
     Five pairs, and all five spend almost their whole life hidden
     under the prosoma — you see them when the animal tilts up over a
     ridge of mud and when it is stranded and pushing.

     NO IK, deliberately, and for §36's reason rather than §20's:
     these feet are planted, but they are planted UNDER an opaque
     shell that is 15 cm above them. Nobody can see whether a foot
     stays put, so solving for one buys nothing. Angle-driven posing
     from a phase number is enough and is a tenth of the work. */
  function legSeg() {
    var pos = sweep({
      len: 1, rad: 0.042, seg: 6, rings: 4, round: 2,
      profile: function (t) { return 1 - t * 0.52; },
      curveY: function (t) { return -0.06 * t * t; },
      jitter: 0.08, seed: 23
    });
    return geom(pos, colorize(pos, function (t, u, i) { return pk(LEG, i); }));
  }

  /* ---------- a compound eye ----------
     Small, lateral, sitting on the ophthalmic ridge. Two of them, and
     they are the only part of this animal that is not mud-coloured. */
  function eye() {
    var pos = sweep({
      len: 0.075, rad: 0.038, seg: 7, rings: 3, round: 2.4,
      profile: function (t) { return Math.sin((0.25 + t * 0.6) * Math.PI); },
      seed: 41
    });
    return geom(pos, colorize(pos, function () { return EYE[0]; }));
  }

  /* ---------- the furrow ----------
     The receipt. A horseshoe crab does not walk over the mud, it
     ploughs THROUGH the top of it, and what it leaves is a shallow
     turned trench with a low levee either side — the single most
     photographed thing about this animal on a Chek Jawa low tide.

     One straight segment of it, laid end to end in world space by
     horseshoecrabs.js. This takes §35's sand-collar licence: no
     bespoke trench geometry, just a wide flat sweep dropped into the
     mud with its top edge showing, repeated. It reads as a furrow at
     the only distance anyone will ever see one from. */
  function furrow() {
    var pos = sweep({
      len: 1, rad: 0.5, seg: 7, rings: 3, round: 2.6,
      profile: function (t) { return 0.86 + 0.14 * Math.sin(t * Math.PI); },
      aspectY: 0.30, aspectZ: 1,
      jitter: 0.16, seed: 61
    });
    return geom(pos, colorize(pos, function (t, u, i) {
      // the levee crests catch light, the trench floor does not
      return u > 0.62 ? pk(MUD, i) : MUD[2];
    }));
  }

  /* ---------- cache ---------- */
  var cache = null;
  function parts() {
    if (!cache) {
      cache = {
        prosoma: prosoma(),
        opistho: opisthosoma(),
        telson: telson(),
        legSeg: legSeg(),
        eye: eye(),
        furrow: furrow()
      };
    }
    return cache;
  }

  window.HorseshoeBody = {
    parts: parts,
    material: Facet.material,
    // horseshoecrabs.js needs these to hang the plates together
    P_RAD: P_RAD,
    O_RAD: O_RAD
  };
})();
