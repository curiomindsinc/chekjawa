# Continue here — the otter

Rewritten 2026-09-02, at the end of §47. Read this first; then `tools/README.md` for how
to run anything, and BUILD_GUIDE §42–§45 for why the rig is the way it is. §46 and §47
have no write-up yet.

---

## Where things stand

**The otter is an Asian small-clawed otter (*Aonyx cinereus*) and it is GENERATED.**
§47 replaced the visual asset and left the movement system alone.

    tools/make-otter-obj.js  ->  reference/otter/AonyxOtter.obj   (generated)
    tools/bake-otter.js      ->  js/ottermesh.js                  (generated)

**Hand-edit neither.** The animal's shape lives in the `PARAMS` block at the top of
`make-otter-obj.js` — a table of stations (half-width, half-height, centreline height,
superellipse exponent, belly lift), four limb chains, two ears, two eyes. Change a
number, run both scripts.

`reference/otter/Otter.obj`, the smooth-coated reference the rig was built against, is
still there and still bakes: `OTTER_OBJ=Otter.obj node tools/bake-otter.js`. Every gate
honours the variable. It is kept runnable for A/B, not maintained — `tailSet`'s knobs
were retuned for the generated animal.

### §50 — the eating otter is on its back again, with its head out

It had been turned belly-down. It is a raft again: `CATCH_ROLL = Math.PI * 0.90`, which
is the constant §42 chose and which was never deleted, exactly so this was one number.

Belly-up alone puts the face in the water, and that is the part worth knowing. The roll
is applied AFTER the pitch (`setBody`, Euler order YXZ), so once the animal is on its
back the pitch column of `ATT` means the opposite of what it means everywhere else: the
`-0.55` that reared a belly-down otter up to eat rolls into a muzzle 0.14 m UNDER the
surface. `ATT.catch` is now `[0.28, -0.02, -0.05, CATCH_ROLL]` — positive pitch, the
sink left where it was — and the posture measures:

    belly-up   0.91        (1.0 = belly straight up)
    nose      +0.29 m      head, worst frame of the bob  +0.00 m
    fish      +0.27 m      back under the water          -0.28 m

Nothing else moved. `POSE.catch`'s paw solution, `AIM_CURL` and the neck reach were all
written for the belly-up animal in the first place — the head curls toward body-local
-y, which is the chest, which is UP again — so they come back into their own geometry.
`check-stretch catch` is unchanged at 1.47% past 2x, and the 300 s state budget is
unchanged.

**New gate: `node tools/probe-catch.js`.** Nothing in tools/ could see this. The renders
draw the animal in body-local space, where "on its back" and "head above water" are not
questions that can be asked, and every other gate measures the mesh against itself. This
one composes `mBody`, and asks in world metres against `world.waterAt()`. `WORLD=1` on
`render-otter.js` is the picture that goes with it: yaw taken out, waterline drawn.

### §49 — both left limbs were on the right

What §48 was actually looking at. The widening was real but it could not fix this,
because the stance was not narrow — it was **folded onto one side**. `otters.js` read
`HIP_Z` off the fitted bones, which carry their own left/right sign, and then every one
of its three readers multiplied by `HIP_SIDE`. The two signs cancelled and both left
limbs were solved to positive z. Over 3000 walk frames:

    before   fore-R z +0.171   fore-L z +0.057   hind-R +0.131   hind-L +0.066
    after    fore-R z +0.171   fore-L z -0.171   hind-R +0.131   hind-L -0.131
    rest pose (both)  +0.181  -0.181  +0.181  -0.181

One line, `js/otters.js:320` — `HIP_Z` is now a magnitude, which is what `side *
(HIP_Z[l] + WALK_SPLAY)` two hundred lines down had been assuming all along. It dates
from §42, when `HIP_Z` was one hand-typed number and the sign genuinely lived in
`HIP_SIDE`; §43 started reading the fitted hips and nothing noticed.

**Nothing in this repo could have caught it.** The mesh gates check the OBJ, and the OBJ
is mirror-perfect. `check-stretch` measures edge length, which a reflection preserves.
`check-gait` measures each paw against the ground, not against its opposite number. The
renders default to `side`, where one limb hides the other. New gate: `tools/probe-side.js`.

Cost, and it is a real one: the left legs now reach a third of a metre further out onto
sand that is not flat, so feet more than 2 cm under the surface go **0.16% -> 0.42%**
(0.01% past 5 cm, was none). The foot TARGET is never below the sand — `fy` is
`floorY + gOff + lift` and `lift >= 0` — so this is the flat pad meeting a slope, and
the old number was low only because two of the four paws were parked under the belly.
Everything else improves or holds: corrective steps 3533 -> 3055, stance scrub 0.174 ->
0.140 cm, re-plants 0.000, edges past 2x walk 0.20% -> 0.03% / haul 2.55% -> 0.47% /
swim 2.74% -> 0.07% / catch 2.65% -> 1.47%. State budget over 300 s unchanged.

### §48 — the stance was widened

The legs came out of the flank and then hung nearly straight down inside the body
silhouette, so from the front the four paws read as two, close to the midline. Fixed in
`make-otter-obj.js` alone — six numbers in `LIMB`, nothing else in the pipeline touched.
The splay is from the elbow and the hock DOWN; the hips barely move, because a wider hip
makes the thigh the widest station and `landmarks()` then takes its rump off the thigh.
The full budget and what it cost is the long comment above `var LIMB`.

    fore  hip 1.36 -> 1.42   elbow 1.56 -> 1.66   wrist 1.66 -> 2.02   toe 1.72 -> 2.16
    hind  hip 1.46 (kept)    stifle 1.72 (kept)   hock  1.84 -> 2.16   toe 1.90 -> 2.30

Landmarks are unchanged to the digit (rump 11.30, shoulder 23.17, TORSO 11.87, widest
13.94 at halfW 2.60). Round-trip 0.000142. The hind chain comes out of the fit balanced
for the first time: upper 0.189 / lower 0.185, where it was 0.252 / 0.089. The state
budget over 300 s is identical. Gait improves except for foot clearance, which drops
because a splayed pad hangs its outer corner lower — numbers in the comment.

### What did NOT change

This is the point of §47. `otters.js` keeps its states, its poses, its gait, its IK, its
centreline and its behaviour. The state budget over 300 s is identical on both meshes:

    swim 6650  dive 298  catch 164  walk 2657  haul 11        (new)
    swim 6651  dive 297  catch 164  walk 2657  haul 11        (old)

Three edits to `otters.js`, and only three:

- `WALK_LIFT`/`HAUL_LIFT` are read off the mesh (`OtterMesh.TOE_DROP`, `BELLY_DROP`)
  instead of typed. They were typed 0.52/0.24 under a comment saying they had been
  measured off the model — true when written, silently false once the model changed.
- The head reaches for the fish it is holding, the otter eats belly-UP again (§50), and its
  forepaws hold the food. New: `AIM_CURL`, `FOOD_GAP`, `AIM_SWING`, `AIM_HZ`, `AIM_RATE`,
  `L_NECK`/`L_SKULL`, `headTip`, `o.aim`, `o.aimPh`; changed: `CATCH_ROLL`, `ATT.catch`,
  `POSE.catch`. See below.
- `jz`'s assignment moved to the top of `spineAt`. Behaviour identical; it had to move
  so something else could add to it.

### Verify in one go

    node tools/make-otter-obj.js      # self-checks; any *** means the mesh will misbake
    node tools/bake-otter.js
    node tools/check-roundtrip.js     # ~0.00014 body units, and identity 0.000000000
    node tools/check-stretch.js swim  # also walk / haul / catch
    node tools/check-gait.js          # 60 Hz, takes minutes
    node tools/sim.js                 # 300 s, prints the state budget

**Last known good, and against the old mesh on the SAME code** — which is the only fair
comparison, and is not what the numbers in the previous version of this file were:

| | walk | haul | swim | catch |
|---|---|---|---|---|
| edges past 2x, **new** | **0.07%** | **0.27%** | **0.13%** | 1.74% |
| edges past 2x, old | 0.20% | 2.55% | 2.74% | 2.65% |
| worst edge, new | 2.23x | 5.38x | 6.86x | 10.39x |
| worst edge, old | 2.45x | 3.60x | 4.07x | 4.46x |

The percentages are up to ten times better; the worst single edge is worse, and that is
a metric artefact rather than a defect — see "the elbow's short edge" below.

Weights beat the old mesh: seam max 0.561, **2 edges of 2994 past half** against the old
mesh's 7 of 3090. Core sharpness 0.796 against 0.826.

Gait, new against old on the same code: corrective steps 3533 against 2859, stance scrub
median 0.174 cm against 0.080, re-plants per stance **0.000 on both**, paws more than 2 cm
under the sand **0.14% against 0.22%**, paw clearance median 2.44 cm against 1.37.

### To look at it

    node tools/render-otter.js walk out.png side 2
    ZOOM=3.4 CX=0.40 CY=0.06 node tools/render-otter.js walk head.png top 2

Broadside for height questions, **top-down for the head** — the ear and the eye read there
and are ambiguous in the three-quarter view, which has already faked three "defects".
Note the renderer draws BODY-LOCAL geometry, so neither the roll nor the pitch appears in
it — judge the eating pose's height against the water with a probe, not a render.

---

## The eating reach — what §47 added

The animal now **bends its neck down over the food and works at it**, instead of staring
straight ahead for the whole three to five seconds of the hold.

**THE NECK CURLS INTO AN ARC. It does not sag.** That distinction cost a round trip.

`xAt` is fixed — every station's x is a constant of the parameterisation — so the
centreline could only ever move in y and z. The first version used that: a 0.22 body-unit
downward offset, ramped `h²`. Measured, it pitched the muzzle 27 degrees and moved the
nose's x by **nothing at all** — 0.640 before, 0.640 after, with the fish 0.69 body units
behind it the whole time. The head sank toward the water in front of the animal and never
went near the food. Reaching needs `jx`.

So `spineAt` now bends the neck into a circular arc of constant curvature, parameterised
by arc length — offset `(sin(kl)/k, -(1-cos(kl))/k)`, `k = AIM_CURL/L_NECK`. Its
derivative is unit length at every `l`, so **the neck bends without stretching**, which a
rotation about a point would not do and the skin would pay for. The curl on its own cost
`check-stretch catch` nothing at all — 0.20% past 2x before and after. What the number
later paid for was the forepaws, further down.

**The skull rides rigidly on the end of it.** Past `S_NECK_END` the arc stops and the head
is carried straight along the neck's final tangent. Curving everything forward of the
shoulder bends the cranium too and the animal comes out banana-headed.

Measured: the nose travels back and down instead of only down, head pitch folds about 80
degrees, and nose-to-fish distance goes **0.499 -> 0.050** body units. The body does not
move at all — the bend is forward of `S_SHOULDER` only. `AIM_CURL` is 0.90, chosen with
`ATT.catch` so the muzzle meets food sitting at the waterline; see below.

**And the fish is DERIVED, not typed.** `headTip(1)` returns where the muzzle ends up at
full reach and which way it points; `CHEST_X`/`CHEST_Y` are one `FOOD_GAP` beyond it along
that heading. Type both and they drift apart — the same mistake as a typed skull radius
(§43) and a typed eye socket (§47), which is three times on this animal. Move `AIM_CURL`
and the food follows on its own.

### The otter eats belly-down now, holding the fish

**SUPERSEDED BY §50 — it eats belly-UP. `CATCH_ROLL` is `Math.PI * 0.90` and `ATT.catch`
is `[0.28, -0.02, ...]`. Read §50 at the top of this file; the rest of this section is
kept for the paw solution and the stretch budget, which both still stand.**

`CATCH_ROLL` was set to **0**. It had been `Math.PI * 0.90` — onto its back, sea-otter
style, from §42's reference shot of a smooth-coated otter rafting. The constant was kept,
not deleted: one number puts the raft back, and §50 is that number going back.

Belly-down forced two more numbers, because the geometry changes completely. On its back
the food sits on the chest, clear of the water. Belly-down, the body floats AT the surface
and a head that curls to the chest puts the animal's face under it — measured, nose 0.145 m
and fish 0.174 m below the waterline. So `ATT.catch` is now `[-0.55, -0.02, ...]`: it rears
its front up to eat, which is what the animal has to do. Swept against `world.waterAt`, the
fish now sits **+0.005 m** off the surface and the nose **+0.024 m**.

**And the forepaws hold it.** They used to measure at x -0.360, splayed to z 0.406 — back
and out at the hips, nowhere near the food they were commented as holding. `POSE.catch`'s
fore angles are now the two-link solution that puts the paw ON the fish: 0.544 of the
limb's 0.600 of reach. Paw-to-fish went 0.90 -> 0.068 body units.

**What that costs, stated plainly: `catch` stretch goes 0.20% -> 1.74% past 2x**, all of it
`fore bone0`, the shoulder socket, because the pose swings a foreleg 2.5 rad forward of
the position it was modelled in and nothing on this animal ever did that before. It is
still below the OLD mesh's 2.65% at the same state, and it shows only as a few thin facets
at the shoulder under a 3x zoom. Three things were tried and all made it worse:

- the other IK branch (elbow down, `[-0.724, -0.909]`) — 3.94%, it twists the elbow
  against its bind
- pulling the paws part way back — 2.37% to 3.21%, and worse the further back, because
  the mid positions dip the paw toward the sand where `floorClamp` starts bending it
- widening the socket's blend band, `ROUT` 3.4 -> 4.2 -> 5.0 — 2.40% then 2.64%, and it
  drags walk, haul and swim up with it. §45's 3.4 is right; leave it alone.

If the shoulder ever needs to be better than this, the lever is the BIND pose, not the
weights: the fore limb is modelled hanging down and back, and every degree the eating pose
asks for is measured from there.

**Two traps were paid for here, both of them the same trap.**

`HEAD_LOOK`/`HEAD_NOD` look like they move the head and do not — `draw` builds a frame out
of them and hangs the WHISKER FAN on it, while the skull is skinned off `spineAt`, which
has never heard of them. Anything that has to move the head has to bend the centreline.

And `jz` was ASSIGNED at the bottom of `spineAt`, after the aim's sweep had added to it,
so the sweep was silently overwritten for its whole first pass. The measured z of a bent
head came back exactly 0.000, which looks precisely like a sine at a zero crossing.

The sweep is driven off `o.chew`, a per-animal countdown in real seconds, and not off
`o.wob`, which advances at `SLOT_HZ` = 0.11/s and gave the head one turn every fifteen
seconds against a hold lasting three to five.

---

## Still open

### 1. ~~Submerged otters keep more of their brown~~ — CLOSED, and it was never the water

**The otters were wound inside out.** The user could see THROUGH the model and was
looking at the pale belly and throat of the far surface, from above. That is the whole of
"the otters look like they are swimming on their back", and §46 spent a section on the
wrong cause.

`readObj` rewrites the OBJ's `(x, y, z)` as `(z, y, x)` to get the shore's +X-nose frame.
**Swapping two axes is a reflection, not a rotation** — determinant -1 — so every triangle
that came through it was wound backwards. `MeshLambertMaterial` defaults to
`THREE.FrontSide`, so the browser culled the near surface of every otter and drew the
inside of the far one. Measured signed volume of the baked rest mesh: **-0.196** on the
generated animal, **-0.282** on `Otter.obj`, which has had it since §44.

Fixed in `bake-otter.js` by reversing the quad fan, which compensates the reflection
exactly and moves no vertex. The bake now prints `winding: signed volume ... OK` every
run and says `***` if it ever goes negative again.

**Why three sections of measurement missed it.** §46 measured the roll and correctly found
the animal was NOT rolled (dorsal +Y 0.998 at swim), checked the palette and correctly
found it was not banding — and then concluded "it must be the water", which was the only
hypothesis left rather than one anything supported. Meanwhile `check-roundtrip` and
`check-stretch` measure vertices and edges, both orientation-blind, and `render-otter.js`
did no backface culling at all, so every render ever made of this animal drew a surface
the browser was throwing away.

`render-otter.js` culls now (`NOCULL=1` to defeat it). **Render the TOP view after any
mesh change** — broadside barely shows an inversion, and top-down shows nothing else.

### 2. The hind limb fits short, and the fix is in `fitLimbs`

Hind `L_UP + L_LO` comes out 0.341 against the old mesh's 0.392. `walkLimb` tests a
planted foot's HORIZONTAL offset from the hip against that sum, so a short one loses its
footing more often in turns — 3533 corrective steps against 2859. Nothing visible;
re-plants stay at 0.000 and the paw-through-sand numbers are better.

**The lever is not the mesh.** `fitLimbs` puts the ankle at a fixed 80% of the limb
cloud's height range, which suits a leg standing on its toes. An otter is plantigrade:
its hind foot is long and nearly flat, almost none of its length is height, and whichever
of the hock and the ankle the trace lands on, the other comes out a stub. Seven layouts
were tried and none got past 0.385. Find the ankle where the trace's height stops
changing and its x starts — where the leg becomes a foot — then re-check BOTH animals,
because the old mesh is fitted by the same rule and currently benefits from it.

### 3. The elbow's short edge

The worst `catch` edge stretches 9.5x, and it is a rest edge of 0.0033 body units — about
2 mm on a 1.75 m animal, on the inner side of the elbow fold. p99 is 1.61 and 6 edges of
2994 pass 2x. `check-stretch` divides by rest length, so one very short edge dominates
the maximum while nothing on screen moves.

Two of these were already fixed and the generator now gates the ratio (shortest against
median, currently 9.5x, flagged past 12x): the collapsed tip rings came out, and the limb
rings' ANGLES are now spread toward evenly-spaced as the tube leaves its socket. That one
is worth knowing — a socket loop is a rectangle, two adjacent perimeter vertices can sit
nearly on one ray from its centroid, and reusing those angles on a round ring further
down collapses them onto each other. It reported 16.9x stretch and was invisible.

### 4. A foot leaves the ground at full swing speed

Carried from §45, unchanged and present on both meshes. **Not a teleport** — the foot's
POSITION is continuous; its VELOCITY is not. `check-gait` reports max paw discontinuity
57 cm on the new mesh, 49 cm on the old, against the 26 cm §45 measured at the time.

Already tried and does not work: shaping the swing as a cubic matching the stance's slope
at both ends. Max stayed put and the median went up twentyfold. **The mismatch is not in
x.** Log the paw centroid in BODY-LOCAL coordinates across the worst transition and find
which axis carries it. Two candidates, in order: z, from the body yawing about a
world-fixed plant; and the `reach` clamp releasing all at once at lift-off.

---

## Other debt, not otter

- BUILD_GUIDE has no §35, §36, §37, §40, §46 or §47.
- The octopus's ink is rare and the rate has never been settled: 3, 5, 2 and 0 events
  across four runs.
- **Nothing since §30 is committed.** §31 through §47 are all working tree.

---

## Traps already paid for — do not re-learn these

- **A translation is not a reach.** Every other thing this rig does to the spine is a y
  offset, so the eating aim was written as one, and it produced a head that sagged
  straight down while the food stayed 0.69 body units in front of the muzzle. If a part
  has to arrive somewhere, check the axis it has to travel along is one the rig can
  actually move it on — here `xAt` is a constant and nothing had ever needed it not to be.
- **An axis SWAP is a reflection.** `(x,y,z) -> (z,y,x)` has determinant -1 and reverses
  every triangle's winding. It cost this project three sections and a wrong diagnosis. If
  a frame change swaps two axes rather than negating one, the winding has to be reversed
  with it, and the only way to know is to measure the signed volume of what is actually
  emitted. Use `(z, y, -x)` next time, which is a rotation.
- **A harness more permissive than the thing it stands in for does not miss bugs, it
  certifies them.** `render-otter.js` had no backface culling while the browser had it on
  by default, so an inside-out otter rendered perfectly in every image for three sections.
  A gate that cannot fail is not evidence. It culls now.
- **"It must be X" is not a measurement.** §46 ruled out the roll and ruled out the
  palette, both properly, and then named the water because nothing else was left. Two
  correct eliminations do not make the third guess a finding.
- **A stale baseline is worse than no baseline.** The previous version of this file
  recorded "38 corrective steps" and a state budget of "swim 70%, walk 18%, haul 6%".
  Both were measured against code that had since moved. Re-baked and re-run on the OLD
  mesh with the CURRENT code, the same gates give 2859 corrective steps and walk 27% /
  haul 0.1% — so §47's numbers looked like a catastrophic regression for as long as it
  took to bake the old animal and run them side by side. **Bake the other mesh and run
  the gate. It is one env var.**
- **When the body unit is itself a measurement, a proportion is not a lever you can pull
  on one end of.** The head was shortened by an eighth to bring `X_NOSE` down. `TORSO` is
  measured between the fitted shoulder and the rump, the shoulder is fitted out of the
  fore limb's own vertex cloud, and shortening the NECK moved that cloud's cut: torso
  10.52 -> 11.73 and every ratio downstream 13% smaller. The head was never the problem.
- **A hard test is a tear.** Three of them decided this animal's weights and between them
  put 8.7% of edges across a boundary. If two adjacent vertices can be told different
  things, no blend downstream can save them.
- **Fix the cause you measured, not the cause you assumed.** §44 named linear blend
  skinning and fixing it moved the number from 1.85% to 1.79%.
- **A gate is only as good as its sample rate.** `check-gait` ran at 20 Hz, where a gait
  cycle is under four samples, and a 26 cm snap hid for two sections.
- **Keep a gate in step with its subject.** `check-roundtrip` once reported 0.11 body
  units of error purely because the bake had moved to a two-bone blend and it had not.
- **Do not fix what is not broken.** Easing every swing off its last stance position put
  the median discontinuity up twentyfold to smooth a jump that was not there.
- **A number describing a SURFACE must be asked of the surface — every coordinate of it.**
  §43 fixed the radius and left the x typed. §47 repeated the whole mistake from scratch
  on a new mesh: the eyes were placed at a typed (side, up) that sat at 0.58 of the way to
  a skin measuring 1.75 by 1.76, and the animal rendered blind. They are placed off the
  ring's own section now.
- **A normal from a winding is a normal from a guess.** The ear was built along the
  socket's Newell normal, which follows the loop's winding, which depends on which slots
  the socket was cut from — so it grew INTO the skull for three renders. Its furthest
  vertex measured 1.38 units off the midline where the skull is 1.86.
- **Build one side and reflect it.** Building the left limb by re-running the builder
  with the side flipped gives a limb that is ROTATED, not reflected: 330 vertices with no
  mirror partner and a body 0.24 units wider on one side.
- **"The shoulder is where the chest is deepest" is false on this animal.**
- **A rendering harness has its own bugs and they look exactly like model bugs.** Before
  believing a render, check it against a number.
