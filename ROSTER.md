# Chek Jawa — roster status

What is built, what is left, and what each remaining species is *for*. Written 2026-08-13 after
§30; updated 2026-08-15 after §31 and §32; updated 2026-08-16 after §35 and again after §36;
updated 2026-08-18 after §37 (Ulva, Sargassum), §38 (mangrove horseshoe crab) and §39 (carpet
anemone + anemonefish); updated 2026-08-19 after §40 (sand goby) and §41 (octopus); updated
2026-08-20 after §42 (smooth-coated otter) and 2026-09-01 after §43 (the otter rebuilt against the
reference mesh, and finally looked at), §44 (the otter IS the reference mesh, skinned) and §45 (its
skin stops tearing, and its re-plant becomes a step).
BUILD_GUIDE.md is the design history; this file was the queue.

The instruction driving it was **"add all"** — every species §1 listed in the v2 roster.
**The queue is empty.**

---

## Built — 32 catalogue entries

Twenty-five animals with bodies you can follow, seven producers.

| | species | § | notes |
|---|---|---|---|
| 🦀 | Fiddler crab | 20, 28 | wired to the biofilm; pellets are the receipt; panics at egrets |
| 🪸 | Barnacle | 23 | |
| 🐌 | Nerite snail | 23 | biofilm grazer, cap-space on one boulder |
| 🐚 | Dog conch | 23, 29 | biofilm + spoon grass; up-shore ratchet fixed in §29 |
| ⭐ | Knobbly sea star | 23 | sets off the sea hare's ink; the spring-low postcard |
| 🐟 | Mudskipper | 24 | replaced the goby — see the debt below |
| 🐇 | Sea hare | 27 | first true forager; eats the tape meadow |
| 🕊️ | Little egret | 30 | first bird, first visitor; the shore's LOW-water visitor |
| 🦞 | Hermit crab | 31 | fills SCAVENGERS; a conserved shell market, colonies, shell fights |
| 🌀 | Horn snail | 31 | third biofilm grazer; a grazing FRONT, and the nerite inverted |
| 🪙 | Sand dollar | 31, 32 | ploughs buried — a travelling mound; petals on a spring low |
| 🥒 | Sea cucumber | 32 | leaves a cast TRAIL; feeds continuously, contracts when stranded |
| ✳️ | Sand star | 32 | fast, flat, buried; the knobbly's opposite. Sets off pen shells |
| 🔺 | Pen shell | 32 | first bivalve; stands in open sand; claps shut when something passes |
| 🌙 | Moon snail | 35 | drills bivalves; ploughs buried like the sand dollar; leaves sand collars |
| 🦪 | Oyster | 35 | cemented lower valve, hinged upper — the barnacle's pattern, one hinge over |
| 🔵 | Green mussel | 35 | densest bed on this shore's rock; both valves gape, byssus drawn |
| 🧽 | Sponge | 35 | radial growth rings by hand, no moving parts — colour is the whole behaviour |
| 🏊 | Swimming crab | 36 | the fiddler's mirror — active submerged, buries on the ebb; paddle stroke |
| 🪖 | Mangrove horseshoe crab | 38 | the only tidal commuter; ploughs a furrow trail; hand-rolled horseshoe outline |
| 🏵️ | Carpet anemone | 39 | first cnidarian; the ambush predator that cannot move. Hosts the fish |
| 🐠 | Anemonefish | 39 | the shore's only bright animal; cannot spawn without a host |
| 🐡 | Sand goby | 40 | the §24 debt repaid; a stranding clock, and the first death in the sim |
| 🐙 | Day octopus | 41 | den fidelity and a growing midden; the only animal that repaints itself |
| 🦦 | Asian small-clawed otter | 42, 43, 44, 45, 47 | the APEX; the only GROUP; the only real predation; the only walk cycle. The only body that is a MESH rather than a procedural kit — and since §47 the mesh is GENERATED, by `tools/make-otter-obj.js`, out of a table of stations. Was a smooth-coated otter (`Otter.obj`) through §46; that reference still bakes via `OTTER_OBJ=`. See CONTINUE.md |
| 🦠 | Plankton | — | catalogue only |
| 🟩 | Diatom biofilm | 25 | resource grid on the terrain nodes |
| 🌿 | Tape seagrass | 26 | collapses flat on a spring low |
| 🍃 | Spoon seagrass | 29 | the pioneer; first plant inside a v1 grazer's reach |
| 🥬 | *Ulva* | 37 | green sheet alga on rock and the mid flat |
| 🟤 | *Sargassum* | 37 | brown seaweed of the low shore; a taller silhouette that sways |
| 🌳 | Mangrove | — | scenery in world.js |

---

## Left to build — none

The roster is complete. What is left is not species but **debt**, listed below.

## Outstanding debt

- ~~**§42's otter has never been seen.**~~ — closed by §43. It has now been rendered in `haul`,
  `walk`, `swim` and `catch`, from broadside, top and three-quarter, and looking at it earned its
  keep immediately: **the eyes, the ears and the whisker fan were all inside the head**, buried by
  the one-surface rebuild that widened the skull under offsets typed as fixed distances. Every
  geometric check in §42 passed straight through it. The gait constants it flagged
  (`STRIDE`, `LAND_SPEED`, `WALK_LIFT`) turned out to want nothing — stance scrub is 0.000 cm at
  the median and 0.01% of feet break the sand.
- ~~**The otter's re-plant is a teleport.**~~ — closed by §45. A leg that loses its footing now
  borrows from its own phase CONSTANT until it sits at the top of its swing, so it lifts, arcs and
  lands; distance still drives the gait, and the borrowed phase is paid back only while the leg is
  in the air. Re-plants per stance frame 0.005 → 0.000, over 38 corrective steps in 6003 walk
  frames, none of which moved a planted foot. **The 38 is stale** — re-run on the old mesh with
  today's code the same gate reports 2859, and on §47's otter 3533. Re-plants are still 0.000 on
  both, which is what this item was about. See CONTINUE.md, "a stale baseline is worse than none".
- ~~**The otter's swim and catch poses still stretch a socket.**~~ — closed by §45, and the named
  cause was not the main one. Linear blend skinning was real and fixing it (dual quaternions) moved
  walk from 1.85% to 1.79%. What was actually tearing the skin was three HARD TESTS in the bake's
  weighting, which put 8.7% of edges across a boundary where two neighbours followed completely
  different bones; and the bind pose sitting at one end of the animal's range instead of the middle.
  Now: walk 0.13%, haul 2.45%, swim 2.65%, catch 2.55%, worst edge halved in every state.
- **The otter's foot leaves the ground at full swing speed.** Its POSITION is continuous — nothing
  teleports any more — but its VELOCITY is not: world-stationary right up to lift-off, then swing
  speed in the next frame. Worst frame-to-frame paw discontinuity while walking is 26 cm, always the
  stance→swing crossing on a hind leg at speed in a hard turn. Older than §45 and unchanged by it;
  invisible until `check-gait.js` moved to 60 Hz. A matched-slope cubic in x has been tried and does
  NOT fix it, so find the axis first. See CONTINUE.md.
- **BUILD_GUIDE has no §35, §36, §37 or §40.** Those four species shipped without a write-up. The
  code comments carry the reasoning; the guide does not.
- **The octopus's ink is rare** — 3, 5, 2 and 0 events across four 900-1800 s runs. It fires, so it
  is not §31's untested behaviour, but the rate has not been settled over a long run.
- **Nothing since §30 is committed.** `git log` ends at ROSTER.md; §31 through §45 are a working
  tree — which now includes a generated file (`js/ottermesh.js`) and the tool that makes it.

## Structural gaps these close

- ~~**`SCAVENGERS` is empty**~~ — filled by the hermit crab in §31.
- ~~**`FILTER FEEDERS` is the barnacle alone**~~ — the pen shell joined it in §32, and the oyster,
  mussel and sponge filled the row out in §35. Five members now, four different mechanisms for the
  same guild.
- ~~**`DEPOSIT FEEDERS` is thin**~~ — the horseshoe crab joined the fiddler, the sand dollar and
  the sea cucumber in §38, and is the only one of the four that commutes rather than holding a patch.
- ~~**Nothing on the shore is a mutualism**~~ — the carpet anemone and the anemonefish closed it in
  §39. Six wirings before it were one species reacting to another; this is the first where both
  sides gain, and the branch that carries it is one line (`guests` -> `embrace` instead of `fold`).
- ~~**`APEX PREDATORS` does not exist yet**~~ — created by the otter in §42, as `foodweb.js:28` had
  asked since §9.
- ~~**No mortality anywhere in the sim**~~ — opened by the sand goby's stranding clock in §40 and
  made a real predation path by the otter in §42, which is the first animal here that hunts and
  actually takes something. Every other predator still catches nothing on purpose: the egret (§30),
  the sand star (§32), the moon snail (§35), the anemone's fold (§39) and the octopus's pounce
  (§41) all stop short, because what is modelled is the part that shows.
- ~~**Nothing has a home it chose**~~ — closed by the octopus in §41. The fiddler defends a
  territory round a burrow it re-digs anywhere; the swimming crab digs in wherever the ebb
  catches it; the sessile species are stuck where they settled. The octopus keeps ONE den, goes
  out from it and comes back to it, and the midden growing at the door is the record.
- ~~**Every population is a scatter of individuals**~~ — closed by the otter in §42. A romp is one
  animal made of six: it arrives, swims, hauls out and leaves as a unit, and an individual only
  ever breaks formation for a fish.

## House rules worth re-reading before starting one

From BUILD_GUIDE and hard experience:

- **Relative, not absolute — and that means BOTH coordinates** (§44). §43 fixed the radius of every
  face fitting and left their `x` typed. The mesh changed, the nose moved from 0.46 to 0.70, and the
  whiskers came out of the animal's cheek. If a thing rides a part, every one of its coordinates has
  to be a fraction OF that part.
- **A skinned mesh needs a round-trip gate before anything else is believed** (§44). Rebuild the rest
  pose from the baked rig data alone and diff it against the mesh you started from. A skinning bug
  and a rig bug look identical on screen and neither is visible in code review; this is the only
  thing that separates them. Ours comes back at 0.00015 body units, which is the rounding.
- **Skin tears at joints, and the number that finds it is edge stretch** (§44). Deformed edge length
  over rest length, over the whole mesh: the median says whether the body is right, the tail of the
  distribution says which joint is wrong. Binding a vertex to ONE bone put the worst edge at 14x.
- **A number that describes a SURFACE must be asked of the surface** (§43). Anything hung on a body —
  an eye, an ear, a whisker pad, a hip — has to read the body's own profile for how far out the skin
  is at that station. Type the distance instead and it is correct exactly until somebody re-shapes
  the part it sits on, and then it is silently wrong: the otter's whole face ended up 0.08 body units
  inside its head, and every matrix check still passed, because the parts *were* where they had been
  told to go. **Copying a radius into a second file is a promise the two files will never disagree,
  and that promise is always eventually broken.**
- **A rendering harness has its own bugs, and they look exactly like model bugs** (§43). The offline
  rasterizer read instance `oi` from every InstancedMesh — right for one-per-animal body links, wrong
  for the 8-per-animal legs and the 6-per-animal whiskers — so it drew another otter's parts floating
  beside this one, and a session went hunting a limb bug that did not exist. Before believing a
  render, check it against a number: a measured joint gap of 0.0000 outranks anything the picture
  seems to show.
- **A three-quarter view cannot answer a question about height** (§43). It mixes y and z on the
  screen, so a limb splayed wide reads as a limb raised over the back. Two apparent defects on this
  animal were nothing but that. **Ask a silhouette question of a silhouette:** broadside for height,
  top-down for width.
- **`sweep`'s `t=0` is the −X end — the TAIL, not the nose** (§39). Bodies are built along +X and
  every species puts its head at +X, but `sweep` runs x from 0 to `len` and `centred` only shifts
  that window. The anemonefish's three bars were written as nose-distances, fed straight to
  `colorize`, and came back with the head bar on the tail wrist. Eighteen species missed it because
  a blunt cylinder hides it completely — the mudskipper's own profile carries the same reversal and
  nothing shows. **If a part is symmetric enough that either orientation looks plausible, the
  orientation is not verified, it is merely unrefuted.**
- **§38's resolution rule applies to COLOUR too** (§39). `colorize` is per-triangle, so the finest
  band a swept body can draw is one ring step wide. At the mudskipper's 9 rings that is 0.11 of the
  body; the anemonefish's 0.022 black bar-edging fell between neighbouring triangles and the head
  bar rendered as a checkerboard. 72 rings fixed it and cost nothing per frame, because geometry is
  built once and instanced.
- **A one-vertex checker is not a pattern, it is a constant** (§39). The anemone's tentacle nubs
  were raised on alternate vertices and each triangle scored by how many of its corners were raised
  — at that cell size *every* triangle has exactly two of three, so every triangle scored the same
  and the disc painted in one flat colour. Raise nubs in 2×2 CELLS so a triangle can sit wholly
  inside one. If a per-triangle score comes back uniform, look at the cell size before the scoring.
- **A fin root is not a straight line** (§39). A back that drops from the shoulder to the tail wrist
  by more than the fin's own height leaves a level-rooted fin floating clear of the animal at one
  end. `blade`'s `sweepY` bends the whole blade to follow the body — one line, instead of splitting
  the fin into two parts.
- **Check that a predator and its prey are ever on the shore at the same time** (§39). The
  anemonefish was wired to dive from the egret, which already frightens fiddler crabs — and it fired
  zero times in 600 seconds, because an egret wades in a hand's depth of water and this fish leaves
  below 0.30 m of it. The windows do not overlap on any tide. **A predator that is only present when
  the prey is gone is not a wiring, it is a decoration.** The swimming crab has the opposite
  schedule and works. Check the two species' own constants against each other before writing the
  scan.
- **Radius against diameter, in one table, only shows up side-on** (§39). The anemone's spread
  column was given a 0.60 RADIUS against the disc's 1.00 DIAMETER, so the collar meant to hide under
  the carpet was half again as wide as it — the shut animal's silhouette wearing the spread animal's
  numbers. For a radial animal, request the three-quarter-from-above as well as the broadside.
- **The −90° body-axis bug has caught four species** (§20 crab claw, §21 goby, §27 sea hare, §30
  egret). Bodies are built along +X; headings are `atan2(dx, dz)`, a +Z bearing. The body Euler
  needs `yaw - Math.PI/2`. Written in from the start since §31 and it has cost nothing since.
- **Always request a broadside screenshot.** Every orientation bug on this build was invisible in
  code review and obvious the moment a side-on view came back wrong. §31 found limbs at a third of
  their size, a shell shaped like a banana, and a sand mound bigger than the animal it was meant
  to reveal. §32 found a bivalve built as two parallel plates.
- **`put()` cannot roll a part, and for a flat one that is the only thing that matters** (§32).
  It derives the side axes from the length axis, which is right for a limb and wrong for a sheet.
  Use `putBasis`-style explicit axes for valves, fins, fans and anything else flat.
- **Decompose the instance matrices** to check a skeleton rather than squinting at a render — it
  found a completely missing torso in §30 in one call.
- **To judge a PART, isolate it** (§33). Assemble the cached geometry into a throwaway
  `THREE.Group`, park it in clear air above the flat at whatever size suits, and photograph that —
  the parts are the real ones out of `Body.parts()`, so it is exactly what ships. Chasing a 25 cm
  animal around a 300 m shore to see one claw is the slow way. Set `world.setDayPhase(0.5)` first
  or every colour judgement is made at sunset.
  **And `setDayPhase` does not take effect until `world.update()` runs** (§38) — the sky, the sun
  and the hemisphere light are all recomputed inside it. Set the phase, tick update a few times,
  *then* render, or the first isolation shot comes back at midnight and you spend a pass
  wondering why a mud-brown animal looks black.
- **Where a mobile species SETTLES is set by its steering thresholds, not by the band you spawn it
  in** (§38). The horseshoe crab drifted out of every band it was given — up out of the mangrove
  fringe, then 20 m seaward, then 10 m more — and none of it was a bad ZONE. Its two steering
  windows were unequal: the seaward one was a fixed span of tide and the landward one shrank the
  higher it went, so it walked until they matched. Tune the thresholds and the band follows; tune
  the band and it walks away again. **If a population drifts, do not move it back — work out which
  of its two decisions is running longer.**
- **A radial outline needs angular resolution several times finer than its smallest feature**
  (§38). The horseshoe crab's genal spine is ~0.10 rad wide: at SEG 44 (0.143 rad/step) it
  vanished, at 64 (0.098) it rounded into a lobe, at 96 (0.065) it came to a point. Geometry is
  built once and instanced, so the extra segments cost nothing per frame — count the steps against
  the feature before assuming the shape function is wrong.
- **A confined grazer must be tuned under regrowth**, and one threshold is never enough: `BARE`
  ("anything left?") and `GOOD` ("worth staying for?") are different questions. Since §32, prefer
  three with a gap in the middle — `BARE`, `SPENT` (stop working this patch), `GOOD` (worth
  stopping for) — which is what stops an animal starting and stopping every other frame.
- **If halving the rate only delays the collapse, the rate is not the problem** (§31). A crowd
  that cannot leave the patch it has eaten will strip its band at any rate. Grazers need an escape
  clause, and they need to move fast enough to outwalk their own damage inside one tide cycle.
- **A stable number is not automatically a correct one** (§32). §31's horn snail was caught by a
  *falling* film reading; §31's sand dollar was flat from the first measurement and still wrong —
  parked in the hole it had eaten at 0.155 against a control of 0.94. Compare species in the same
  band against the same control, not each against itself.
- **Do not gate a continuous behaviour on a state.** The sea cucumber's feeding was tied to its
  `feed` state and the budget came back 37% feeding / 56% commuting (§32). Ask whether the animal
  actually stops doing the thing, or only stops moving.
- **Band means hide everything.** Measure the resource *under each animal*, and against a control
  sample of the same band with no animals near it.
- **`Facet.colorize` cannot do radial patterns**, and `sweep()`'s end caps are a single fan with no
  radial subdivision (§31). Anything with a pattern around an axis — sponge, anemone, urchin —
  needs concentric rings built by hand, as `sanddollarbody.js` does.
- **A behaviour that never fires is not modelled.** The hermit crab's shell fight was written,
  correct, and never once triggered until the population was placed densely enough to compete
  (§31). Count the events over a long run before calling a species done.
- **Adding a body needs no UI work** — write the species file, add one `sim` key in `species.js`,
  one `pops` entry and one `update` call in `main.js`, and a follow distance + state labels in
  `ui.js`. The `pops` entry is `{ list, group }` since §34; the group is what the hover glow
  needs. Clicking, following and the glow then all work with nothing else declared.
- **`vis` is optional, and only means "not drawn right now"** (§34). Add it only if the species
  actually hides individuals, and if you do, set it every frame. Do NOT test it as `!o.vis`
  anywhere — five species had no such field and were silently unclickable for two sections.
- **Making something visible is a way of testing it** (§34). The pick radius had been wrong since
  §22 — a flat 46 px catching animals 200 m away — and nobody noticed until a hover cursor turned
  into a hand over empty sky.
- **A hinge is just a rotated basis, wherever it sits** (§35). The pen shell's `putBasis` roll
  (§32) was built for a fixed "up out of the sand" axis; the oyster and the mussel needed the same
  roll on a per-animal ROCK NORMAL instead, and it required no new machinery — only picking a
  fixed body-local hinge triad once, since the barnacle's existing `spin` field already
  randomises which way it points per animal (barnacles.js, §23). Look for the randomisation
  already on an instance before adding a new field to get the same effect.
- **A receipt does not need real geometry if nobody will stand next to it** (§35). The moon
  snail's sand collar is a broken ring of the SAME straight tube part, placed several times end to
  end with plain `put()` — no torus, no second geometry function. It reads as a ring at the
  distance anyone will ever see one, which is the same call the barnacle's ribs (§23) and the
  fiddler's pellets (§28) made before it.
- **A limb that is not standing on anything does not need IK.** Every other leg on this shore is
  solved backward from a foot target (`leg()`'s two-link IK, §20) because it has to stay planted
  while the body moves over it. The swimming crab's paddle, mid-stroke, is not planted on
  anything — so `paddleStroke()` (§36) poses it forward instead, straight from a phase number to a
  direction vector, exactly the way `cheliped()` poses a claw from `pose.merus`/`pose.carpus`
  rather than solving for them. IK is for a foot with a job to do on the ground; angle-driven
  posing is for a limb whose job is the motion itself.
- **`putBasisRoll` fixes §35's handedness bug at the SOURCE, not by picking better axes.** Rolling
  a flat part needs an explicit basis, and §35's oyster/mussel hinge got that basis by hand-picking
  three fixed axes — which silently mirrored the geometry because that particular ordering had a
  negative determinant. §36's paddle needs the same kind of roll (feathering through a stroke) and
  gets it safely by deriving the starting pair via the ordinary cross-product construction every
  `put()` call already uses (guaranteed right-handed for ANY direction), then rotating both axes
  TOGETHER around the length axis — a proper rotation can't flip handedness, so there is nothing
  left to get backward. Prefer this over hand-picking axes whenever the direction varies at
  runtime; save fixed axes for cases like the oyster's, where the whole point is a fixed hinge.
- **A clamp against the ground is a PLANE, not a number, the moment the body is pitched** (§41).
  The octopus's arm tips were clamped at `-lift` in body-local Y on the grounds that the tilt was
  small. It is not small: the body basis is `Ry(yaw)·Rz(-pitch)`, so a point two body units
  forward on a crown pitched 0.16 rad down is already 0.32 units below the origin — more than the
  whole of `lift`. The tips sat 15 cm under the sand while the clamp reported every one clear.
  And clamp the segment's **endpoint**, not the running position: clamping after placing leaves
  the LAST segment of each chain drawn along its unclamped direction, which is where the
  remaining 7 cm came from.
- **A radial crown stacks its own limbs in plan view, and no parameter fixes it** (§41). Arm `a`
  at roll φ and its mirror at π−φ have identical sines and opposite cosines, so the two come out
  one directly above the other seen from above — eight arms occupying four bearings. Sweeping the
  droop from 0.16 to 0.06 moved the smallest gap from 2° to 1°, because the droop was never the
  cause. **If a tuning sweep barely moves a number, the number is not controlled by that knob** —
  stop tuning and look at the construction. The fix was a second construction (a bearing fanned
  across the seabed) blended against the first, not a better constant.
- **Check the prey's band VERTICALLY as well as horizontally** (§41). §39's rule was "check that a
  predator and its prey are ever there at the same time". The octopus's catalogued larder listed
  the oyster and the mussel, both at 1.30–2.10 m CD on boulders that dry at every low tide — four
  hundred vertical millimetres above an animal that cannot leave the water. The honest answer
  removed two rows from `eats` rather than adding a scan that would have fired zero times.
- **A behaviour whose rate is wrong by 5x is usually the wrong SHAPE, not the wrong threshold**
  (§41). The octopus's first pass pounced, then carried on hunting, and returned 192 pounces in
  600 seconds across six animals. No value of `POUNCE_R` or `SCAN_R` would have fixed that. What
  fixed it was making a meal END the trip — which is also why a real den has a midden at the door
  and not a trail of shells across the flat. The receipt and the rate came from the same change.
- **If a species writes `instanceColor` per frame, ui.js's hover glow can leave a stale colour on
  it** (§41). The glow saves an animal's colour, multiplies by 1.55, and writes the saved value
  back on unhover — over the top of anything written since. Forcing a tint refresh twice a second
  heals it for a few hundred `setColorAt` calls and needs no coupling to ui.js. `sponges.js` (§35)
  has the same shape and the same hole.

### Added by §42 (the otter)

- **A walk cycle's phase must be driven by DISTANCE, not by time** (§42). A foot in stance holds
  its world position while the body travels over it, so advancing the cycle by metres travelled
  makes a planted foot's backward slide in body-local space exactly equal to the distance the body
  advanced — zero slip at any speed, and no gait clock to tune against the steering. Time-driven
  phase is what makes a walk skate and no gait constant repairs it. Over one cycle the body advances
  `STRIDE`; over the stance it advances `STRIDE * DUTY`, and that is the foot's excursion — the one
  number in a gait with a right answer rather than a taste.
- **Straight-line planting is not planting** (§42). Distance-driven phase holds a foot still only
  while the animal walks STRAIGHT; the moment it turns, a body-local point swings through the world
  with the body. Measured separately: 0.07 cm of scrub per frame going straight against **1.43 cm**
  turning, and the pooled mean hid it. Remember the plant in WORLD metres at touchdown and convert
  it back each frame; re-plant a foot that a hard turn has left out of reach, which is the
  corrective step a real quadruped takes. **When one number covers two regimes, split it before
  believing it.**
- **When a behaviour will not come out, find which CLOCK is binding** (§42) — §38's steering-window
  rule, asked of time instead of distance. The otter's haul-out was guarded against `romp.visitT`,
  which is 95-160 s against a 90 s tide cycle, so it never expired and the guard passed every time
  it was asked and changed nothing. Two deadlines, and the code was watching the slack one. A guard
  that changes no measurement is evidence about the guard, not about the behaviour.
- **A predictor must not move the thing it predicts** (§42). `Tide.at` records `lastT` as a side
  effect for `setPhase` and `jumpToSpringLow`, so sampling the future through it would leave the
  clock believing "now" is half a minute ahead and land the tide UI's spring-low jump in the wrong
  place. `Tide.secsUntilBelow` reads the height function directly instead.
- **Check the prey's depth as well as its band** (§42). §41 asked the vertical question of the
  larder; this asks it of the hunt. The otter's dive sank a fixed 0.42 body units — a POSTURE, not a
  depth — and the chase was written in x and z, so it took gobies through 2.2 m of water. A reach is
  a sphere, not a circle drawn on the map.
- **`node --check` does not catch a ReferenceError** (§42). A scale variable used outside its scope
  in `walkLimb` passed the syntax check and would have taken the whole sim down on reload. Only
  running the thing catches that class — which is the argument for keeping a headless harness that
  drives `update()` by hand, quite apart from what it measures.
- **A decision recorded in a header can go stale, and the header will not notice** (§42).
  `otterbody.js` argued at length that this animal never walks and therefore needs no gait. It was
  true when written and false by the time the haul-out worked, and what falsified it was a state
  histogram, not a reading of the file. **Re-check a documented "we deliberately did not" against
  the measurements whenever the behaviour around it changes.**
