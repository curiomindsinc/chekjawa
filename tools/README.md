# tools/

Build-time and check-time scripts. None of this ships to the browser — `index.html`
loads nothing from here. Node only.

## The otter is generated now — two steps, not one

    node tools/make-otter-obj.js     # PARAMS  ->  reference/otter/AonyxOtter.obj
    node tools/bake-otter.js         # OBJ     ->  js/ottermesh.js

**Both files are generated. Hand-edit neither.** To change the animal's shape, change
the `PARAMS` block at the top of `make-otter-obj.js` and run both.

`make-otter-obj.js` builds an Asian small-clawed otter (*Aonyx cinereus*) out of a
table of stations — half-width, half-height, centreline height and a superellipse
exponent per station — plus four limb chains, two ears and two eyes. It checks its own
output before writing: exactly three components (shell + two eyes), no non-manifold
edge, every component wound outward by signed volume, and perfect left/right symmetry.
Any of those failing prints `***` and means the mesh will misbake.

The old smooth-coated reference is still there and still bakes:

    OTTER_OBJ=Otter.obj node tools/bake-otter.js

Every gate honours the same variable, so an A/B is one env var. Note `tailSet`'s knobs
were retuned for the generated animal, so the old mesh bakes *correctly* but no longer
*well* — it is kept runnable for comparison, not maintained.

## The bake

    node tools/bake-otter.js

Reads `reference/otter/AonyxOtter.obj`, writes `js/ottermesh.js`. Re-run it whenever the
OBJ changes, or the palette in it changes, or any weighting knob changes.
`js/ottermesh.js` is **generated — do not hand-edit it.** See BUILD_GUIDE §44 for what
the bake does and §45 for how it decides who owns which vertex.

It also prints the **limb lobes** — the two windows the four limb chains are fitted
inside. Read them first when a leg comes out wrong: everything downstream fits inside
those windows, so a window that has swallowed the tail produces a limb chain that is
wrong in a way that looks exactly like a skinning bug.

It prints two numbers every run that are worth reading before anything else:

- **seam** — how much two neighbouring vertices' influences differ, worst case. This is
  the number that predicts a torn socket, and it is cheap: if it is high, no amount of
  cleverness in the skinning downstream will help. Expect max ≈0.54, none past half.
- **core sharpness** — how strongly a vertex deep inside a leg still follows ONE bone.
  Low is mush: a thigh vertex half-listening to the paw, a leg that bends like a rope,
  a planted foot that scrubs. Expect ≈0.83.

## The headless harness

`harness.js` builds a fake `window`/`document` and loads the sim's scripts into a VM
sandbox; `sim.js` then builds the world, the gobies and the otters and drives
`update()` by hand. Everything below is built on those two.

    node tools/sim.js            # spawn, run 300 s, print the state budget

This is the only way to test this project without a browser, and it is worth having
even when there is one: it found `ReferenceError: sc is not defined` in §42, which
`node --check` passes and which would have taken the whole sim down on reload.

## The gates

Run these after ANY change to the otter's rig, bake or skinning. In order of what
they rule out:

    node tools/check-roundtrip.js

Rebuilds the rest pose from `js/ottermesh.js` alone and diffs it against the mesh the
bake started from. **Expect max ~0.00015 body units**, which is the four decimal
places the file is written to. This is the first gate for a reason: a skinning bug
and a rig bug look identical on screen, and nothing else separates them.

It then asks a second question the first cannot: **do bones that have not moved move
anything?** Each bone's rest frame is rebuilt from the emitted joints, composed with its
own inverse, blended and applied. Expect exactly 0.000000000. It is not a tautology —
it fails the moment the bake and `otters.js` disagree about how a bone frame is built,
and that disagreement is invisible in the rest pose while being fatal in every posed
frame.

Keep it in step with the bake. It once reported 0.11 body units of error on every
limb vertex because the bake had moved to a two-bone blend and this had not — the
data was right and the gate was stale, which is the worse of the two failures
because it points at the wrong file.

    node tools/check-stretch.js [walk|haul|swim|catch]

Deformed edge length over rest length, over every edge. The **median** says whether
the body is right (expect ~1.004); the **tail** says which joint is wrong. Binding
each vertex to a single bone put the worst edge at 14x. Current: walk 0.13% of edges
past 2x, haul 2.45%, swim 2.65%, catch 2.55%; worst edge 2.4–4.5x, all of it at limbs.

    node tools/probe-side.js

**Is the animal symmetric while it MOVES?** The rest pose being mirror-perfect says
nothing: `check-obj`'s mirror-twin test passes on a mesh whose rig then puts both left
limbs on the right. This walks the sim and prints each paw's body-local z. Expect the
two members of a pair to be equal and opposite (fore ±0.171, hind ±0.131) and to match
the rest-pose line it prints underneath. §49 found fore-L sitting at **+0.057** against
fore-R's +0.171 — both forelegs on the same side of the centreline, for six sections,
past every other gate in this file.

    node tools/probe-catch.js

**Is the eating otter on its back, and is its head out of the water?** Everything else
here works in body-local space, in which neither question exists. This composes `mBody`
and measures the nose, the head, the body and the fish in world metres against
`world.waterAt()`, over settled `catch` frames only. Expect belly-up ~0.91, nose ~+0.29 m,
head clear of the surface at the bottom of the bob, fish ~+0.27 m, back ~-0.28 m.
Run it after touching `CATCH_ROLL`, `ATT.catch` or `AIM_CURL`.

    node tools/check-gait.js

§43's walk checks, re-pointed at the skin — a paw is no longer a part with a matrix,
it is the patch of vertices bound to each limb's third bone. Takes a few minutes.

**It runs at 60 Hz, not 20, and that matters.** At 20 Hz and 2.75 m/s a whole gait cycle
is under four samples and the swing is one of them, so every measure of how smoothly a
foot moves reads as noise: the median second difference came out at 14 cm on a gait with
nothing wrong with it. Measure what the screen shows.

What to watch:

- **true-stance scrub** ≈0.031 cm a frame. This is the planted foot's promise to the
  ground; if it climbs, something has softened the paw's weights.
- **re-plants per stance frame** — 0.000 since §45. Anything above zero means a planted
  foot moved, which it must never do.
- **paw discontinuity, ANY phase** — the second difference of the paw in world metres,
  which is what is left after any smooth motion, however fast, is taken out. Median
  ≈0.07 cm; **max is 26 cm and that is a known open bug** (see CONTINUE.md), not a
  regression.
- **paws under the sand** ≈0.1% past 2 cm.

## Looking at it

    node tools/render-otter.js <state> <out.png> [side|top|front|q] [settleSecs]
    ZOOM=3 CX=0.45 CY=0.15 node tools/render-otter.js walk head.png q 2
    WORLD=1 node tools/render-otter.js catch raft.png side 2

A software rasterizer — no browser, no GPU. Flat-shaded, z-buffered, writes a PNG.
`PAINT=1` colours the non-body parts so you can tell what is what.

`WORLD=1` draws the animal's ATTITUDE instead of its shape: the body matrix is put back
on with the yaw taken out, the water surface is moved to y = 0 and drawn as a line. It is
the only view in which a floating posture can be judged — without it the mesh is always
level and the water is nowhere.

**Ask a silhouette question of a silhouette.** The three-quarter view mixes y and z on
screen, so a limb splayed wide reads as a limb raised over the back; two "defects" on
this animal were nothing but that. Broadside for height, top-down for width.
