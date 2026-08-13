# Chek Jawa — roster status

What is built, what is left, and what each remaining species is *for*. Written 2026-08-13, after
§30. BUILD_GUIDE.md is the design history; this file is the queue.

The instruction driving it is **"add all"** — every species §1 listed in the v2 roster. Eighteen
items remain.

---

## Built — 13 catalogue entries

Eight animals with bodies you can follow, five producers.

| | species | § | notes |
|---|---|---|---|
| 🦀 | Fiddler crab | 20, 28 | wired to the biofilm; pellets are the receipt; panics at egrets |
| 🪸 | Barnacle | 23 | |
| 🐌 | Nerite snail | 23 | biofilm grazer, cap-space on one boulder |
| 🐚 | Dog conch | 23, 29 | biofilm + spoon grass; up-shore ratchet fixed in §29 |
| ⭐ | Knobbly sea star | 23 | sets off the sea hare's ink |
| 🐟 | Mudskipper | 24 | replaced the goby — see the debt below |
| 🐇 | Sea hare | 27 | first true forager; eats the tape meadow |
| 🕊️ | Little egret | 30 | first bird, first visitor, only species that leaves the plot |
| 🦠 | Plankton | — | catalogue only |
| 🟩 | Diatom biofilm | 25 | resource grid on the terrain nodes |
| 🌿 | Tape seagrass | 26 | collapses flat on a spring low |
| 🍃 | Spoon seagrass | 29 | the pioneer; first plant inside a v1 grazer's reach |
| 🌳 | Mangrove | — | scenery in world.js |

---

## Left to build — 18

Ordered cheapest-first. The first three are the ones to take next.

### 1. Hermit crab — **fills the one empty food-web row**

`SCAVENGERS` is the only trophic row in foodweb.js with nothing in it. Reuses the crab body kit
(`crabbody.js`) plus a borrowed gastropod shell — and the shell is the species: the swap, the
sizing-up, the fight over a better one. Cheap body, memorable behaviour.

### 2. Horn snail

Third biofilm grazer. Reuses nerite/conch machinery almost wholesale. High-shore / mangrove
fringe, in dense aggregations. Tune under regrowth — see the grazer rules in BUILD_GUIDE §25/§28.

### 3. Sand dollar

Deposit feeder on the low sand flat. Ploughs just under the surface, so it is a moving mound for
most of its time on screen rather than a visible animal — a different rendering problem from
anything here so far. Can reach the tape meadow's band.

### 4. Sea cucumber

Deposit feeder, lagoon floor. Slow. The beat is sediment processing: takes film and detritus in
one end, leaves casts behind.

### 5. Moon snail

Predatory snail — ploughs the sand hunting bivalves, drills a countersunk hole, leaves sand
collars. **Wants prey to hunt, so it pairs with the bivalves below.** Build it after at least one
of them or it has nothing to do.

### 6. Sand star

Second sea star, low flat. Distinct from the knobbly: flatter, faster, buries. Reuses
`seastarbody.js`'s approach.

### 7–10. The filter feeders — oyster, green mussel, pen shell, sponge

`FILTER FEEDERS` currently holds the barnacle alone. All four are sessile, so all four reuse the
barnacle's open/shut-on-tide pattern and `rockfield.js` placement.

- **Oyster** — encrusts hard substrate.
- **Green mussel** — byssal clumps, denser and more colonial.
- **Pen shell** — large bivalve standing point-down in the sand of the low flat, gape to the
  water. Octopus prey.
- **Sponge** — encrusting the boulders and channel edge. Static body; the beat is colour and
  zonation rather than motion.

### 11. Swimming crab

Predator, and **the mirror of the fiddler** — active while submerged, buries when the water
leaves. Paddle back legs. Reuses `crabbody.js`.

### 12. Octopus

Predator of the channel and boulder dens. **Hardest body in the roster**: eight arms, colour
change, den fidelity. Hunts crabs and bivalves, so it wants the swimming crab and pen shell
already in.

### 13. Haddon's carpet anemone + anemonefish

Build as a pair. Second inter-population interaction after the sea hare's ink: a sessile stinging
carpet and the fish that shelters in it.

### 14. Mangrove horseshoe crab

Ploughs the mud of the mangrove fringe on the flood and leaves a trail. Distinctive silhouette,
and it pairs with the mangrove scenery that already exists.

### 15. Smooth-coated otter — **needs a new food-web row**

Apex predator. `foodweb.js:28` says to add an `APEX PREDATORS` row above `PREDATORS` when the
otter arrives. Family group, and like the egret it arrives and leaves.

### 16–17. *Ulva*, *Sargassum*

The last two producers from §1's list.

- ***Ulva*** — green sheet alga on rock and the mid flat.
- ***Sargassum*** — brown seaweed of the low shore and boulders; a taller silhouette that sways
  with the water, unlike the flat-lying crops.

### 18. Restore a true goby — **a debt, not a new species**

§24 replaced the goby with the amphibious mudskipper at the user's request, which **broke §5's
payoff**: the mudskipper has a moisture value instead of a stranding clock, so there is no
mortality path anywhere in the sim and nothing is trapped in a tide pool. The pool finder still
runs and the pools are still used, but the "fish stuck at low water" demonstration needs a real
goby with a stranding clock **alongside** the mudskipper. Never as a replacement.

---

## Structural gaps these close

- **`SCAVENGERS` is empty** — the hermit crab is the only thing queued that fills it.
- **`APEX PREDATORS` does not exist yet** — the otter creates it.
- **No mortality anywhere in the sim.** The egret hunts but kills nothing (§30), deliberately: a
  part-time predator would mean respawns and population bookkeeping for very little on screen.
  The goby is the species that would reintroduce a real death, and it should be a decision taken
  on purpose rather than a side effect of building something else.

## House rules worth re-reading before starting one

From BUILD_GUIDE and hard experience:

- **The −90° body-axis bug has caught four species** (§20 crab claw, §21 goby, §27 sea hare, §30
  egret). Bodies are built along +X; headings are `atan2(dx, dz)`, a +Z bearing. The body Euler
  needs `yaw - Math.PI/2`. Write it in from the start.
- **Always request a broadside screenshot.** Every orientation bug on this build was invisible in
  code review and obvious the moment a side-on view came back wrong.
- **Decompose the instance matrices** to check a skeleton rather than squinting at a render — it
  found a completely missing torso in §30 in one call.
- **A confined grazer must be tuned under regrowth**, and one threshold is never enough: `BARE`
  ("anything left?") and `GOOD` ("worth staying for?") are different questions.
- **Band means hide everything.** Measure the resource *under each animal*, and against a control
  sample of the same band with no animals near it.
- **Adding a body needs no UI work** — write the species file, add one `sim` key in `species.js`,
  one `pops` entry in `main.js`, and a follow distance + state labels in `ui.js`.
