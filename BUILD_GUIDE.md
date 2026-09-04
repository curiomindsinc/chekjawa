# Chek Jawa Intertidal — Build Guide (adapted from Savanna / Vent)

> ## BUILD STATUS — 2026-08-02
> **§11 steps 1 and 2 are BUILT and headless-verified. Step 2's real-GPU eyeball is still owed
> before steps 3+.** The shore renders, the tide runs, `waterAt` / pools / `jumpToSpringLow` all
> work. Nothing lives on the shore yet.
>
> Files: `index.html`, `theme.css`, `vendor/three.min.js`,
> `js/{voxmesh,camera,tide,mangrove,rocks,world,tideui,main}.js`.
> Open `index.html` directly (no build step). Controls: drag / scroll / WASD / Q·E, plus the tide
> gauge on the right — **⏭ Spring low**, **⏸ hold**, and a scrub slider that parks the waterline at
> any height (that slider is the §11-step-1 check; drag it top to bottom).
>
> **The world is a 300 × 144 m block of shore and nothing else exists** (§16) — no surrounding
> scenery, no backdrop, no open ocean. It is cut off at the boundary and the cut is dressed as a
> sediment cross-section. Sim bounds == world bounds; every spawn and wander target from step 4 on
> still goes through `world.inSimArea` / `world.clampToSimArea`.
>
> Verified headless: 0 console errors; tide curve 1.60 → 3.07 → 0.33 → 1.60 over 90 s; springness
> sweeps 1 → 0 → 1 over 405 s; `jumpToSpringLow()` promises 0.127 m in 26 s and delivers 0.127 m at
> 26.1 s; Priority-Flood finds 28 pools across four bands; the wet-sand band trails the waterline
> over ~25 m; submerged objects stay legible under 2 m of water; `world.update` costs 0.92 ms/frame
> over 9 797 nodes.
>
> **Deltas from what this guide specifies** (all deliberate, all discovered on screen — see §13).
>
> Next: step 3 is already partly done (Priority-Flood + pool rendering exist; **trapping does
> not**), then step 4 needs the reference photos in §12.

**Delta doc, not a from-scratch guide.** The engine (`js/ui.js`, `js/population.js`,
`js/main.js` wiring, `js/foodweb.js` logic, species-panel / fact-card / food-web system) is copied
verbatim from `simulations/savanna/BUILD_GUIDE.md` and is NOT re-explained here — read that guide
first. This doc covers only what is **new** or **different** for an intertidal biome, and what to
**drop**.

Folder: `simulations/chekjawa/` (copy `simulations/savanna/` as the starting point).
Setting: **Chek Jawa, Pulau Ubin, Singapore.** Six habitats on one shore.

---

## 0. What makes this biome different

The savanna's master clock was the sun. The vent had no clock at all. Here the master clock is the
**tide**, and it is far more invasive than day/night ever was: it doesn't just change the lighting,
it changes *which parts of the map are habitat at all*, twice every 90 seconds.

Three systems have no precedent in the other biomes and are the real engineering work:

1. **Tide engine** — a moving water surface that is the world's primary state variable (§3)
2. **Tide pools** — depressions that hold water after the sea leaves, trapping animals (§5)
3. **Emersion behaviour** — every species switches behaviour on being exposed vs submerged (§6)

Everything else is straight reuse (predation, population dynamics, scavengers, food web, UI, fact
cards) or a light reskin (biofilm/seagrass instead of grass, sessile filter feeders instead of
tube worms, mangrove fringe instead of a baobab).

**The teaching headline:** vertical zonation. Each species survives inside a narrow band of shore
height, and the sweeping waterline makes that band visible without anyone explaining it.

---

## 1. v1 roster (locked — 6 species)

Deliberately tiny. v1 exists to prove the tide *looks and reads* right on real hardware before
investing in a full roster. Same instinct as the vent's lighting test.

| Species | Zone (m CD) | Trophic | Tide behaviour |
|---|---|---|---|
| 🪸 Barnacle | 2.2–2.8 | FILTER FEEDERS | sessile. Cirri sweep when submerged, valves shut when exposed |
| 🐌 Nerite Snail | 1.9–2.7 | GRAZERS | grazes biofilm while wet, clamps to rock when dry |
| 🦀 Fiddler Crab | 1.8–2.2 | DEPOSIT FEEDERS | **inverted** — emerges and waves when exposed, burrows on the flood |
| 🐚 Dog Conch | 1.0–1.8 | GRAZERS | hops down-shore following the waterline, buries if caught out |
| ⭐ Knobbly Sea Star | 0.3–0.9 | PREDATORS | Chek Jawa's mascot. Follows water down, burrows if stranded |
| 🐟 Goby | −0.5–1.4 | PREDATORS | rides the flood in to forage, **gets trapped in pools** on the ebb |

Goby is not optional — without it the pools are empty scenery and §5 proves nothing.

**Stretch (only if the slice lands early):** one 🕊️ Little Egret. Lands on the ebb, hunts the
exposed flat, leaves on the flood. A single animal that demonstrates the whole tidal-predator
switch (§6) in one shot.

**v2 roster (do NOT build yet, listed so §9's LEVELS array is designed for it):** tape seagrass,
spoon seagrass, *Ulva*, *Sargassum*, diatom biofilm, mangrove; oyster, green mussel, pen shell,
sponge; sea hare, sand dollar, sea cucumber, horn snail; sand star, moon snail, swimming crab,
hermit crab, octopus, mudskipper; Haddon's carpet anemone + anemonefish, mangrove horseshoe crab,
smooth-coated otter, egret. ~24 total.

---

## 2. Dropped savanna features (don't port these)

- **Season / grass-wetness cycle** — `SEASON_CYCLE_SECS`, `wetness`, the calving boost. The tide
  replaces it as the environmental driver. Biofilm/seagrass regrowth keys off submersion time, not
  a season clock (§7).
- **Lion pride / hyena clan social system** — no v1 species needs matriarch-led group movement or
  sex-differentiated rank. Skip `social` / `femaleRank` / `maleRatio`.
- **Weather events + panic-flee + bushfire cellular automaton** — no v1 equivalent. The monsoon
  freshwater-kill event (§10) is v3 and is a global scalar, not a spreading automaton. Do not port
  the fire spread/char/flush code.
- **Biped gait, tree-caching predator, "See Hunt in Action" demo staging** — `huntdemo.js` and
  `camera.js`'s tree-fork framing can be deleted along with their `<script>` tags and buttons.
- **Grazing head-dip (`restMode:'graze'` + neck bend)** — snails and conches have no neck. Their
  idle is a shell-rasp wobble, a new small animation, not a reuse.
- **Flying animals** — unless the stretch egret ships, in which case reuse savanna's bird code.

Day/night is **kept but rebuilt** — see §8.

---

## 3. Tide engine (new) — `js/tide.js`

The single most important file in this biome. Everything else reads it.

### Units

Everything in **metres above Chart Datum**, matching real Singapore tide tables (~0.0–3.2 m).
The voxel heightmap uses the same units, so `columnHeight < world.tide` means submerged, with no
conversion anywhere in the codebase. Do not introduce a second vertical unit.

### The curve

User chose a simple sine over harmonic constituents, plus a slow spring/neap envelope so the low
shore is real habitat rather than permanent scenery:

```js
var TIDE_CYCLE_SECS   = 90;    // one high→low→high in 90s
var SPRING_CYCLE_SECS = 405;   // envelope repeats every 4.5 tide cycles (~6.75 min)
var MEAN = 1.6, AMP = 1.5;     // metres above Chart Datum

function tideAt(t) {
  var env = 0.7 + 0.3 * Math.cos(2 * Math.PI * t / SPRING_CYCLE_SECS);  // 0.4 .. 1.0
  return MEAN + AMP * env * Math.sin(2 * Math.PI * t / TIDE_CYCLE_SECS);
}
```

Resulting envelope:

| | low tide | high tide |
|---|---|---|
| neap (env 0.4) | 1.00 m | 2.20 m |
| spring (env 1.0) | **0.10 m** | 3.10 m |

The spring low is the payoff moment: only then does the seagrass lagoon surface and the knobbly
sea stars get revealed. It fires roughly every 4.5 cycles (~6.75 min) — compressed hard from the
real 14-day cycle, because a classroom will not wait 10 minutes.

### Public API (mirror savanna's `setDayPhase` offset trick)

```js
world.tide            // metres, current
world.tideDir         // +1 flooding, -1 ebbing
world.tidePhase       // 0..1 within the current cycle
world.setTide(phase)  // jump. Shifts an OFFSET like setDayPhase — simTime and every
                      // animation keyed off it stay untouched.
world.jumpToSpringLow()   // wired to a UI button; sets both the tide phase AND the
                          // envelope phase so the next low is the big one
world.waterAt(x, z)   // <-- THE helper. Returns water surface height at that column,
                      // or null if dry. Accounts for pools (§5). Every mobile marine
                      // animal's movement and every submersion check goes through this.
```

`world.waterAt` is the seam between the tide system and everything else. Anything that asks "am I
underwater" or "can I move there" calls it. Do not let organisms read `world.tide` directly — they
will be wrong inside pools.

### Rendering the waterline

- Sea plane mesh, `y = world.tide`, with small vertex-displaced waves.
- **Wet-sand band** — per-column `lastWetTime`. Columns submerged recently render a darker,
  slightly shinier voxel, fading back to dry over a few seconds. This is what makes an ebb *look*
  like an ebb; without it the water just slides down a static beach. Highest visual payoff per
  line of code in the whole build.
- Foam line at the intersection: a thin bright band where `|columnHeight − tide| < ε`.

---

## 4. Terrain transect (new)

One sloping shore, ~96×96 voxel grid, back to front. Heights are metres CD, chosen so each band
exposes at a genuinely different point in the cycle:

| Band | Height | Exposed when |
|---|---|---|
| Mangrove root fringe (*Avicennia*) | 2.9 | almost always; floods only at spring high |
| Barnacle / oyster boulders | 2.2–2.8 | most of every cycle |
| Fiddler crab mudflat | 1.8–2.2 | most of every cycle |
| Sand flat + **tide pool depressions** | 1.0–1.6 | every low tide |
| Seagrass lagoon (*Enhalus* / *Halophila*) | 0.3–0.7 | **spring lows only** |
| Sandbar | 0.1 | spring lows only |
| Subtidal channel | −0.5 | never |

Cross-check every number against §3's table before changing either. If the lagoon stops being a
spring-low-only reveal, the envelope was pointless.

---

## 5. Tide pools (new) — the v1 risk item

### Finding them (once, at terrain gen)

Use **Priority-Flood**, the standard depression-filling algorithm. Not a hand-rolled local-minimum
search — those get fiddly and miss nested basins.

1. Push every border column into a min-heap keyed by height; set their `waterLevel = height`.
2. Pop the lowest. For each unvisited neighbour: `neighbour.waterLevel = max(neighbour.height,
   popped.waterLevel)`; push it.
3. When done, any column with `waterLevel > height` sits in a depression, and its `waterLevel` is
   that depression's **rim height**.
4. Connected components of such columns sharing a rim height = one pool. Store `{columns, rimY,
   floorY, area}`.

~30 lines, runs once, exact.

### Behaviour at runtime

- Pool surface = `min(world.tide, rimY)`. When `tide >= rimY` the pool is merged with the sea —
  hide its quad, the sea plane already covers it.
- `world.waterAt(x,z)` returns `max(tide, poolSurface)` for columns inside a pool, else `tide` if
  above terrain, else null.
- Per-pool state: `volume`, `temp` (climbs while exposed and the sun is up, resets on the flood).
  Skip evaporation and salinity in v1 — they're the v3 monsoon event's job.

### Trapping

When the tide falls past `rimY`, any goby whose (x,z) lies in that pool's footprint gets
`trapped = poolId`, and its movement is clamped to the footprint until `tide >= rimY` again.
This is the moment the whole feature exists for — make it visible: the fish should visibly circle
a shrinking pool, not just stop.

---

## 6. Emersion behaviour (new)

Two new `species.js` fields drive everything:

```js
zone:      [0.3, 0.9],   // metres CD — the band this species lives in
emersion:  'burrow',     // what it does when its column goes dry
stranding: 25,           // seconds exposed before it starts dying (null = immune)
```

`emersion` modes, all needed by the v1 roster:

| Mode | Species | Effect |
|---|---|---|
| `shut` | barnacle | stop filtering, close valves. Sessile, no movement |
| `clamp` | nerite | stop grazing, seal to rock. Sessile while dry |
| `burrow` | conch, sea star | dig into sand, partial mesh sink, resume on the flood |
| `emerge` | fiddler crab | **inverted** — active *only* while dry; burrows on the flood |
| `follow` | (v2 sea cucumber etc.) | walk down-shore to stay in the water |
| `flee` | goby | swim toward `waterAt` > 0, or get trapped (§5) |

**At 90 s per cycle these transitions must be near-instant.** Sub-second valve close, sub-second
clamp. Anything with a multi-second animation will still be mid-transition when the tide reverses.
Same for `stranding` timers — measure in seconds, not minutes.

Follow the vent guide's zone-biasing precedent: `zone` is a **movement bias**, not a hard kill
box. Reuse `pickTarget`'s candidate-sampling branch and score candidates by how well the column
height sits inside `zone`. A hard out-of-range kill risks exactly the mass-die-off bug the savanna
predator-lock fix had to catch, and isn't needed for the effect to read. `stranding` is the only
mortality path, and it only fires when a species is out of *water*, not out of *zone*.

### The tidal predator switch (v2, but design for it now)

The reason this biome is worth building. Predation pressure flips twice per cycle:

- **High tide** — fish, swimming crabs, cuttlefish flood in and hunt. Filter feeders open, anemones
  expand.
- **Low tide** — marine hunters retreat. Egret, plover, whimbrel, kingfisher land. Otters transit.
  Monitor lizard scavenges. The same prey animals now face a completely different predator guild.

Implementation is nothing new — bird species simply get `zone` above the current tide and marine
predators get `zone` below it, and the existing predation code does the rest. But `foodweb.js`
needs a way to show a species is only active for part of the cycle; a small tide-phase icon on the
food-web node is enough.

---

## 7. Biofilm & seagrass resource (reskin of savanna's grass grid)

Reuse the patch grid wholesale (`PATCH_SPACING`, `biomass` 0..1, grazing drains, `patchAt`
lookup). One change: swap the regrowth-rate input from `wetness` (savanna's season value) to
**fraction of recent time submerged** for that patch — reuse the same `lastWetTime` field the
wet-sand renderer already tracks (§3), don't compute it twice.

Patches high on the shore regrow slowly (little submersion), patches in the lagoon regrow fast.
Gives the same "graze here, deplete it, move on" loop savanna already validated, with zonation
falling out of it for free.

Grazers reading it in v1: nerite snail, dog conch.

---

## 8. Day/night — decoupled (changed)

Keep savanna's `DAY_CYCLE_SECS` keyframe system, but **do not lock it to the tide.**

At 90 s per tide cycle, two tides per day means a 3-minute sim day and a strobing sun. So:

```js
var DAY_CYCLE_SECS  = 360;   // 6 min, independent
var TIDE_CYCLE_SECS = 90;    // §3
```

Physically these should be linked; they aren't, and nobody counts tides per sunrise. What this
buys is the important thing: **midday spring lows** still happen, so desiccation and pool heating
are readable events, while sunrise doesn't flicker.

Sun keyframes, sky gradient, and star field port over unchanged.

---

## 9. Food web LEVELS

```js
var LEVELS = [
  { label: 'PREDATORS',       cls: 'lv-pred' },
  { label: 'GRAZERS',         cls: 'lv-herb' },
  { label: 'FILTER FEEDERS',  cls: 'lv-filt' },   // new class — pick a distinct colour
  { label: 'DEPOSIT FEEDERS', cls: 'lv-depo' },   // new class
  { label: 'SCAVENGERS',      cls: 'lv-scav' },
  { label: 'PRODUCERS',       cls: 'lv-prod' }
];
```

Filter and deposit feeders both sit between grazers and producers but eat different things
(suspended plankton vs. surface detritus) — worth separate rows, it's a real intertidal
distinction and the v2 roster fills both. Add `APEX PREDATORS` above `PREDATORS` when the otter
arrives in v2.

Everything below this (auto-placement, reverse-derived "eaten by", scavenger green auto-links,
orphan warnings) is the unmodified savanna `foodweb.js` engine — no logic changes, just this array
plus each species' `trophic` / `eats`.

---

## 10. Deferred (v3, do not build in this pass)

- **Monsoon freshwater kill** — real 2007 Chek Jawa event: prolonged heavy rain dropped salinity
  and killed much of the shore's life. Model as a global `salinity` scalar falling during rain;
  sensitive species (sea stars, anemones, sponges) die back and recover over sim-weeks. A scalar
  and a recovery curve, nothing like the bushfire automaton.
- **Sound** — waves (tide-height-modulated volume), gulls, mangrove insects at night.
- **Cinematic trailer** (`js/cinematic.js`) — the obvious climax is a `jumpToSpringLow()` push-in
  on the lagoon surfacing. Follow the vent/savanna `rig.locked` pattern.

---

## 11. Build order

1. **Terrain transect** (§4) + wet-sand/foam waterline rendering (§3). Static tide value first,
   scrubbed by hand, to confirm the shore reads correctly at every height.
2. **Tide engine** (§3) — curve, `world.waterAt`, `setTide`, `jumpToSpringLow`. Watch several full
   cycles including a spring low before going further. **Real-GPU eyeball here**, same as the vent
   lighting test — everything downstream depends on the tide looking right.
3. **Pools** (§5) — Priority-Flood at terrain gen, pool quads, then trapping.
4. **`species.js`** for the 6-species roster (§1), with `zone` / `emersion` / `stranding`.
5. **Emersion behaviour** (§6) + biofilm grid reskin (§7).
6. **UI** — tide gauge showing current height + where the next low will stop, spring/neap
   indicator, "jump to spring low" button.
7. Stretch egret, if 1–6 land clean.

## 12. Reference photos needed

Drop into this folder before step 4 (same as the vent build used `crab.jpg`, `octopus.png`):
knobbly sea star, dog conch, fiddler crab, nerite snail on rock, barnacle cluster, and a wide shot
of the Chek Jawa sandbar/lagoon at low tide for the terrain palette.

---

## 13. Build deltas (things this guide got wrong, found on screen)

Recorded here rather than edited into the sections above, so the reasoning survives.

### Terrain is ONE smooth mesh, not a voxel column grid (§3, §4)

The guide assumed savanna's box aesthetic. It does not work on an intertidal flat. A box per
column leaves each box's side wall exposed by the height difference to its neighbour — a few
millimetres on a shore this flat — and those sub-pixel dark slivers rendered as hard contour lines
across the whole flat. Widening the boxes so they overlap did not fix it (the sliver is real
geometry, not z-fighting). Terrain is now a single `PlaneGeometry(SPAN, SPAN, 96, 96)` with
displaced vertices and **vertex colours**, which also made the foam line and wet-sand band smooth
gradients instead of blocky cells, and cut 9216 instances to one mesh.

Heights therefore live on grid **NODES** (97×97), not cell centres. `world.heights` is indexed
`nodeX * 97 + nodeZ`. Pools, `waterAt` and the colour bake all use the same node indexing.

The voxel look still carries: boulders, mangroves, the treeline, and the pool quads are all boxes.

### Heights get a smoothing pass before Priority-Flood

`profileAt` interpolates its key table with smoothstep, which has **zero slope at every key** — that
left a faint terrace across the shore at each key height, and the carved basins met the flat at a
crease. Two 3×3 half-weight passes over the height array fix both. It must run *before*
Priority-Flood or the pools stop matching the surface that gets drawn. Cost: pool count dropped
10 → 7 as the shallowest puddles smoothed away. Acceptable.

### The bands are curved and the map edges taper into deep water

Ruler-straight bands on a rectangular slab read as a diorama. Everything that consults the transect
now goes through `zEff(x, z)`, which warps z by two incommensurate sines plus noise, so the whole
zonation curves in one place. Separately, `edgeTaper(x)` drops the shore into deep water past
|x| = 48 so the map has no visible rectangular cut.

**Consequence for §5:** the taper opens both ends of the runnel behind the sandbar, so it drains and
is no longer a pool — correctly, an open-ended runnel is not a basin. That cost the single biggest
pool (824 m²). Two basins were carved into the seagrass lagoon to replace it, so the low shore still
has trapped water at spring low for a goby to be caught in.

### Colour is a gradient, not a per-band lookup

A flat colour per band read as painted stripes. `COLOR_KEYS` interpolates colour along `zEff` with
the same smoothstep the profile uses, so colour and height boundaries move together.

### A landward backdrop was needed

Without it the sea plane wraps behind the mangroves and the transect reads as an offshore islet.
There is now a flat land slab plus a treeline behind z = -72. Related: the wave plane cannot simply
be made huge (its chop aliases at a fixed segment count), so a second, larger, flat ocean plane sits
0.05 m under it to fill the horizon.

### Numbers that changed

| | guide | built | why |
|---|---|---|---|
| `DRY_SECS` (wet-sand memory) | — | 13 s | band width = dry time × waterline speed; 7 s gave a ~12 m smear that didn't read from a wide shot |
| `FOAM_EPS` | — | 0.07 m | 0.05 was ~1 column wide on the steeper bands |
| `DAY_CYCLE_SECS` | 360 | 360 | unchanged; boots at phase 0.42 (late morning) instead of midnight |
| pool minimum area | — | 10 m² | below that they're 3-cell puddles |

### New API beyond §3

- `world.wetAt(x, z)` → 0..1, how recently that column was submerged. Species should read this for
  `stranding` (§6) instead of each keeping its own exposure timer.
- `world.setTideHeight(m)` → park the waterline at an absolute height and freeze the clock. This is
  the §11-step-1 scrub; it is wired to the gauge's slider.
- `world.heightAt(x, z)`, `world.poolAt(x, z)`, `world.bandAtZ(z)`, `world.springness` (0 neap,
  1 spring), `world.tideFrozen`.

### Still owed

- **Real-GPU eyeball of the tide** — the hard gate before step 3+. Headless runs at 1 fps (software
  rasteriser), so nothing here proves how the ebb *feels* at 60 fps.
- Pool **trapping** (§5) — the pools exist and render; nothing gets caught in them yet.
- Reference photos (§12) before step 4.

---

## 14. Water and coastline pass (2026-08-02, after first review)

Two notes off the first look at the shore: *make the water transparent/blue so submerged creatures
are visible*, and *the mudflat is too squarish*. Both were right, and fixing them turned up a real
bug.

### Depth tint, not a see-through surface

The obvious move — crank the sea plane's opacity down — does not work: a uniformly translucent
plane makes shallow and deep water look identical, so the shore stops reading as a shore. What
carries depth is **absorption**, so the tint went on the **seabed** instead:

- The surface plane is now nearly clear (opacity 0.30, blue, `depthWrite:false`).
- In the per-node colour pass, every submerged node is graded toward `DEEP_TINT` by its depth,
  eased so the first half-metre does most of the work, capped at `DEEP_MAX` so the seabed never
  washes out entirely.

Result: shallows keep their sand colour (which is the cue that the flat is about to surface),
deep water goes blue, and anything standing on the bottom stays legible. Verified with 11 fully
submerged probes under 0.5–2 m of water — all readable, including at dusk.

**The bug this exposed:** the big "ocean" plane that fills the horizon was sitting *just under the
water surface* and was 94% opaque, so it was hiding every submerged part of the shore — the clear
surface was showing nothing but a painted plane. It is now a **sea floor** at y = -0.72, below the
terrain's deepest edge, opaque, coloured to match what deep-tinted seabed resolves to so the map's
outer boundary draws no seam. It no longer tracks the tide (a sea floor does not rise).

Related: **the sea's vertex normals are no longer recomputed.** At this chop amplitude the real
slope is under half a degree and recomputed normals bought no visible shading, while
`computeVertexNormals` over ~12k verts per frame cost more than the whole rest of the world update
(5.1 ms → 1.5 ms when dropped). It was also what produced the big diagonal shading wedges in the
first build.

### The squarish flat

Three changes, in order of how much each bought:

1. **`shoreHalfWidth(z)`** — the exposed shore's width now wobbles along the transect (two
   incommensurate sines, a finer third term, plus noise) instead of the taper starting at a
   constant |x|. The finer term matters: without it the outline facets into long straight
   diagonals.
2. **Drainage creeks (`CREEKS`)** — three sinuous troughs cutting seaward across the flat, fading
   in at their heads so they always run downhill and never pond. Real tidal flats are cut by these,
   and at low tide they break the flat into bars and channels. This did more for the "not a slab"
   read than anything else. Kept clear of `BASINS` — a creek that clipped a basin would drain it.
3. **Taper widened 24 m → 40 m.** A short taper puts a bank at the water's edge steep enough that
   the exposed flat reads as a plateau floating in the sea.

**Priority-Flood reverted to seeding the whole border.** The wobble broke the old
seaward-row-only seeding: a seaward bulge dams everything behind it, and the flat came back with
two bogus 1300 m² "pools". Seeding all four edges is the textbook version and is safe here now
that the side edges taper into genuine deep water — see the comment on `findPools` for why the
high landward row is harmless.

Cost: pools are smaller than before the creeks (18–52 m², was 25–86) since the creeks and the
smoothing pass eat the shallowest ones. Ten pools across four bands is still comfortably enough for
§5, but if a goby needs a bigger pool to circle, widen the `BASINS` entries rather than removing a
creek.

---

## 15. Widening the shore (2026-08-02, review #2)

*"When low tide the ground shown in square and looks not realistic. Either trim the side or expand
it all the way in left and right."* — expanding was the right call. A real shore runs off both
edges of the frame; trimming would just have produced a smaller, prettier island.

### The grid is now ANISOTROPIC

This world is a transect: the profile, the bands, the colour ramp and the waterline gradient all
vary **across**-shore (z) and almost nothing varies **along**-shore (x). So the cells stopped being
square:

| | before | after |
|---|---|---|
| along-shore | 96 cells × 1.5 m = 144 m | **140 cells × 3.0 m = 420 m** |
| across-shore | 96 cells × 1.5 m = 144 m | 96 cells × 1.5 m = 144 m (unchanged) |
| nodes | 9 409 | 13 677 |
| `world.update` | 1.5 ms | 1.9 ms |

Nearly 3× the shore for 1.45× the nodes, with **zero** loss of cross-shore fidelity — which is the
only axis where fidelity buys anything here.

**Node indexing is `a * NXB + b`** (a along x, b along z). Constants split accordingly:
`GRIDX/GRIDZ`, `CELLX/CELLZ`, `NXA/NXB`, `SPANX/SPANZ`, `HALFX/HALFZ`, and `CELL_AREA` for pool
areas. `world` exposes all of them. Anything indexing the height array must use `NXB` as the
stride — using the wrong one silently transposes the world.

### The taper stopped being a coastline

`shoreHalfWidth` went 42 → 168 m and the taper now only bites in the last ~35 m before the map
edge. Its job is no longer to *shape* a visible coast (the shore runs off-frame instead) — only to
stop the terrain ending in a cliff for anyone who zooms all the way out.

### Creeks and basins are generated, not hand-listed

A hand-placed handful left the widened sides bare. Both are now scattered with the seeded RNG
across the full width: 11 creeks, and basins in two populations (22 on the sand flat, 8 in the
lagoon), with rejection tests so no basin lands on a creek (a creek through a basin drains it) or
overlaps another. **Pools went 10 → 33, and got bigger** (top ten 68–135 m², was 18–52) — the
widened flat has room for basins that aren't fighting a creek for space.

### Everything sized for 144 m had to be rescaled

Easy to miss, all of it visible: prop counts (mangroves 16 → 46, boulders 55 → 160), the treeline
(130 → 300 blobs, ±205 → ±500 m), the backdrop slab (430 → 1100 m wide), the sea plane, the camera's
target clamp (`limX` 190), fog (far 430 → 560), and the camera default itself — `dist` 122 filled
the frame with just the near flat, so it is now 172 with `pitch` 0.52, and max zoom-out went
190 → 310 so the whole shore can be seen at once.

---

## 16. The world IS the plot (2026-08-02, review #3)

Marked up on `reference/area.png`: a red rectangle over the shore. First reading was wrong — I built
a sim area *inside* a wider scenic shore, with an outline drawn on it. The correction was explicit:

> *"i dont want to be able to see anything outside the red box. the sim should only show what is in
> the red box. outside red box all remove."*

So there is no "outside" any more. The world is **300 × 144 m** and stops there.

### Removed

- the wider scenic terrain (420 m → 300 m)
- the lateral edge taper and `shoreHalfWidth` — the shore no longer shelves away at the sides
- the landward backdrop slab and its treeline
- the big open-ocean plane; the sea plane is now exactly the plot's footprint
- the study-plot outline and its ▭ button — the plot boundary is the world boundary, and you can
  see it

### The edge is now the presentation

Cutting the world off reintroduces exactly what the earlier "too squarish" note was about, so the
cut is **dressed rather than hidden**:

- **Sediment skirt** — a rim walk emitting four rows of vertices from the terrain height down to
  `BASE_Y`, vertex-coloured into layers (damp surface sediment → pale sand → dark anoxic mud). Four
  rows, not two: banding is what makes a cross-section read as a core sample rather than a slab of
  clay.
- **`BASE_Y` = -9**, not -2.4. At -2.4 the skirt was a thin brown line under the seaward edge and
  the whole thing looked like a sheet of paper floating in haze. Deep enough and it reads as a block
  of shore lifted out of the ground.
- **The water's cut face** — the same rim walk, bottom following the terrain, top at the tide. It
  shows the wedge of water standing on the shore at this instant and nothing where the ground is
  already dry, so it grows and shrinks with the tide. Rebuilt each frame (a few hundred verts).
  A fixed four-quad version was tried first and rejected: spanning `BASE_Y`→tide, it tinted the
  entire sediment cross-section blue.
- **An underside lid** at `BASE_Y`, so the block is closed rather than an open box you can see up
  into from a low angle.
- **Fog pushed out** (near 210, far 720). With no surrounding scenery there is no distance for haze
  to sell — all it did was bleach the far half of the block to grey. The sky gradient is now a plain
  backdrop behind a crisp cross-section.

`rimNodes` is walked once and shared by the skirt and the water face. It is defined **before** the
sea plane is built, because the sea face needs it and the sea is constructed first.

### Sim bounds

`SIM_HALF_X` is now just `HALFX` — sim bounds and world bounds are the same rectangle. The helpers
stay as the API every spawn and wander target must go through, so that stays true even if the two
ever diverge again:

```js
world.simArea                    // { halfX, zMin, zMax }
world.inSimArea(x, z)
world.clampToSimArea(vec3, pad)
```

### Numbers after the change

9 797 nodes (was 13 677), 28 pools, `world.update` **0.92 ms** (was 1.9). Camera: `dist` 168 with
max zoom-out capped at 235 — past that you are mostly looking at empty sky around the block.

---

## 17. Mangroves — `js/mangrove.js` (2026-08-02)

Three variants, built from `reference/mangrove tree.jpg`.

**Species note:** the reference shows arching **stilt/prop roots**, which are *Rhizophora* — not the
pencil-like pneumatophores of *Avicennia* that §4 names. Chek Jawa has both. These are built to the
reference; an Avicennia would be a different root builder against the same trunk and canopy code.

### Why not `Voxel.build`

That helper makes one Mesh per box, and these are a few thousand boxes each — tens of thousands of
draw calls once scattered. Instead each tree is **rasterised into a voxel occupancy grid and then
meshed by emitting only the faces with empty space next to them**. A solid canopy of ~2 600 cells
becomes ~1 100 quads instead of 2 600 boxes, interior cells cost nothing, and the whole tree is one
indexed geometry with baked vertex colours.

Three geometries and one material, shared by every tree: 3 000 / 3 800 / 5 300 triangles. The 46
trees on the shore are 46 draw calls, and stay individually pickable (unlike an InstancedMesh) for
when the mangrove becomes a clickable v2 species.

Variants are dealt **round-robin**, not at random — with only ~15 of each, random choice reliably
put three identical trees next to each other. Per-tree variation is facing plus a little scale
jitter.

### The variants

| | silhouette |
|---|---|
| **1** | compact and upright. Straight trunk with a clear bare length between the root cage and a single broad flat crown. 6 legs |
| **2** | tall, S-curved, forked. The smaller branch carries its own crown low and off to one side. 7 legs |
| **3** | the big one. Widest and deepest crown, hanging heavier on one side, over a tall wide cage. 7 legs |

### What actually made them read

- **Prop roots spring from the trunk's flank, not its axis** (`start = 0.9`). Springing them all
  from the centre made every leg overlap near the top and the cage fused into a solid cone. Seeing
  daylight *between separate legs* is most of what makes the silhouette a mangrove.
- **Thin legs that flare only at the foot.** Constant-thickness struts read as a tent frame.
- **The arch, not a diagonal.** `rad = sin(t·π/2)`, `y = cos(t·π/2)` — leaves the trunk moving
  outward, lands moving downward. A straight diagonal strut looks like scaffolding.
- **Jittered angle, reach and height per leg** (`rootCage`). Evenly spaced identical legs read as
  machined.
- **Slender trunks.** First pass was radius 2.1–2.4 voxels and looked like a pillar; 1.5–1.7 tapering
  to ~1.0 matches the reference.
- **Canopy colour driven by height within the mass** — sunlit crown, mid green, deep shadow
  underneath — with a noise-wobbled ellipse edge, because a clean ellipse reads as plastic.
- **Dangling leaf clumps capped at 3 cells.** An earlier pass let them run to six and the crowns
  grew green curtains.

Voxel size is 0.30 m, so the trees stand ~6–8 m — trunk heights 17–18 voxels, crowns 17–23 wide.

### Known, not addressed

Scene is ~820 draw calls, and the **boulders** are nearly all of it (~190 `Voxel.build` groups × ~4
boxes). Fine on a real GPU at 220 k triangles, but if draw calls ever matter, the boulders are the
thing to convert to the same grid-and-mesh treatment, not the trees.

---

## 18. Boulders, and the shared voxel mesher (2026-08-02)

The boulders were the last thing still on `Voxel.build` — ~190 rocks of 3–5 boxes each was ~760
Meshes and **nearly the entire scene's draw-call budget**. They now use the same technique as the
mangroves, and the technique itself moved into a shared module.

### `js/voxmesh.js`

`VoxMesh.Grid(voxelSize)` — `set` / `has` / `get` / `forEach` / `disc`, and `build()` which emits
one quad per exposed face and returns an indexed geometry with baked vertex colours. Also
`VoxMesh.noise3` and `VoxMesh.pick`, the deterministic hash noise the models colour themselves
with (deliberately NOT the world's `rand()` stream — models must come out identical no matter how
much else got built first).

`Grid.forEach` exists for **surface passes**: "is this cell on the top surface" can only be answered
after the shape is fully filled, which is how the rocks get their shell crust.

`js/voxel.js` is **deleted** — nothing used it any more.

### `js/rocks.js`

Six boulders, each a few overlapping ellipsoid lobes with the surface *threshold* perturbed by noise
(cheaper than perturbing the radius, and it pits the surface instead of just wobbling the outline).
Lobes are what stop a rock reading as an egg. Colour bands by height: dark damp base, mid grey-brown
body, sun-bleached crown, plus a pale **shell/barnacle crust** scattered on upward-facing cells —
which also foreshadows the barnacle zone this band is named for.

**Two things needed fixing after looking at them:**

- **Height had to go up to ~0.6–1.0× the width.** The first pass used ~0.4 and the whole band read
  as scattered pancakes lying on the mud. On a near-flat shore seen from above, a boulder's *height*
  is most of what tells you it is a boulder.
- **Fewer and chunkier** (150 → 120 in the boulder band, scale 0.7–1.45). A dense field of small
  rocks reads as gravel.

### Opposite instancing choice to the mangroves

| | mangroves | rocks |
|---|---|---|
| count | ~46 | ~154 |
| drawn as | one Mesh each | **InstancedMesh per variant** |
| why | must stay raycastable — mangrove is a clickable v2 species | terrain furniture, nothing will ever click one |
| cost | 46 draw calls | **6 draw calls** |

Rock positions are published as **`world.rocks`** — `[{x, z, r, top}]` — regardless of how they are
drawn, because barnacles and nerites will need to sit *on* them and that lookup must not depend on
the rendering choice.

### Result

**Scene draw calls: 821 → ~60.** Rock geometries are 170–730 triangles each.

---

## 19. Pneumatophores (2026-08-02)

The pencil-like breathing roots that carpet the mud around a mangrove. `Mangrove.pneumatophore()`
builds the spike; `world.js` scatters and instances the field.

**Species note, again:** pneumatophores are *Avicennia* / *Sonneratia*, while the trees are modelled
on the *Rhizophora* in the reference photo. A Chek Jawa mangrove fringe is mixed, and the spike
field is one of the most recognisable things about it — so both are present, as they are on the
real shore.

### A separate instanced field, not baked into the tree

Deliberate. Baked into the tree geometry they would:

- float or sink wherever the ground slopes (the tree is one rigid mesh; the spikes need the terrain
  height at *their own* x,z)
- be stuck inside the tree's own footprint and rotate with it
- be unable to carpet the mud **between** trees, which is most of what the real fringe looks like

As their own `InstancedMesh` they get all three for free, at **one draw call for ~2 100 spikes**.

### Details that mattered

- **Finer voxels than the trees** — 0.15 m against 0.30. At the tree's voxel size a spike is a
  single fat cube.
- **Sized at the tall end of real ones** (~0.5–1 m, Sonneratia territory rather than Avicennia's
  15–30 cm). Realistically proportioned spikes are sub-pixel at any overview distance; at this size
  they read as a dark stipple under the trees from far off and as individual spikes up close.
- **Clustered by `r^1.8`** out from each trunk, with a 1.6 m floor so they don't grow up through the
  prop-root cage, plus a loose fill across the whole fringe.
- **Upper shore only** — mangrove/boulder bands, terrain ≥ 2.35 m. They flood at high tide, which is
  correct.
- **Per-instance brightness jitter** via `setColorAt`, or a dense patch reads as one flat mat.
  (Geometry vertex colour and instance colour multiply, so both apply.)

### Cost

~2 119 spikes, 1 draw call. Scene now **63 draw calls / 390 k triangles**, `world.update` 0.44 ms.
The mangrove canopies are the biggest triangle cost, not the spikes.

---

## 20. Fiddler crab — `js/crabbody.js` + `js/crabs.js` (2026-08-12)

First organism on the shore. It went first, ahead of the rest of §1's roster, because it is the
**inverted** one: everything else is active while wet, and this one is active only while *dry*
(§6 `emerge`). Building it first means the tide seam gets exercised from both sides before five
more species depend on it.

`stranding` is null. Being out of water is not a hazard to this animal, it is the condition it
waits for.

### Faceted, not blocky

The reference renders dropped in `reference/` are voxel models. The anatomy and the palette came
off them; the style did not. The shore is already faceted low-poly, so the crab is built from
swept solids — a ring pushed along +X, superellipse cross-section, profile for the taper, curveY
for the hook in a claw finger — flat shaded from non-indexed triangles. Same language as the
boulders it walks past.

### Layout convention

Limb parts are built **root-at-origin along +X in body units** (carapace width = 1.0). Placement is
"point +X down the joint direction, scale X to the segment length", so `crabs.js` never needs to
know what shape a part turned out to be. One scale constant, `S = 0.48` m per body unit — about
15× life size, the same exaggeration the boulders already carry, and the only knob that changes
how big the animal looks.

### Three things that were wrong on screen first

- **Stance.** Long legs and a high body read as a spider. Real proportions are a wide carapace
  slung low with short legs. Halving the leg lengths and dropping the body fixed it in one pass.
- **The claw was invisible.** Its blade is flattened on local Z, and the generic roll basis pinned
  that flat axis horizontally, so the claw was permanently edge-on — a stick. Flattened parts now
  take an explicit basis that squares the flat face against the body's front-back axis, which is
  how a fiddler actually holds it. The wave was also near-vertical at first ("hailing a taxi"); the
  real display is mostly lateral, about forty degrees up.
- **The burrow rendered as a scratch in the mud.** Two separate causes. It was sunk below y=0, and
  the terrain is one closed surface with no hole cut in it, so the ground was drawn straight across
  the mouth — it is now a raised spoil turret, which is what a real one looks like anyway. And its
  rings were wound backwards, so FrontSide culling deleted most of the mesh rather than shading it
  dark. **A wrongly wound ring does not look wrong, it looks absent.**

Burrow colour is keyed off ring RADIUS, not height: on a turret the throat and the outer skirt sit
at nearly the same height, so a height ramp paints the skirt with the throat's shadow and the hole
vanishes into the mud.

### Behaviour

Priority order: water at the burrow → flee; tide rising to it → flee early; night → go down (they
are diurnal); otherwise feed near the hole and wave. Waving is males only and only within reach of
the burrow, in bouts of 2–6, and the rest between bouts shortens the further the tide has dropped
below the burrow — so display activity peaks at low water. Burrows are placed by rejection sampling
against `world.heightAt`, not against a band of z, because the transect is warped (`zEff`) and the
1.8–2.2 m band wanders several metres along the shore.

Legs use two-link IK to a planted foot, and the crab **strafes**: the yaw solve picks whichever
perpendicular heading is the smaller turn, so it walks sideways and does not spin on the spot.

### Cost

84 crabs × 39 parts = ~3 300 instances in **9 InstancedMeshes**, plus 2 static ones for the turrets
and the feeding pellets. Frustum culling is off on the animal meshes: three derives a bounding
sphere from the geometry, which for instances spread over 300 m of shore would cull the entire
population the moment the camera left the middle of the plot.

Verified against the tide: 83/84 up at low water (the 84th has its hole inside a tide pool, which
`waterAt` correctly reports as wet), all 84 down on the flood with none caught standing in water,
and 83 back out on the ebb.

---

## 21. The shared body kit, and the goby (SUPERSEDED — the goby was replaced by the mudskipper in §24) — `js/facet.js`, `js/gobybody.js`, `js/gobies.js` (2026-08-12)

### `facet.js` — the style stopped being a convention

The faceted builders were written inside `crabbody.js` and were lifted out the moment a second
species needed them. "All the organisms match" is a promise that survives about two species if it
lives in a style guide, and forever if it lives in a function they all call.

`Facet` owns `sweep` (solids), `blade` (fins and any other sheet), `colorize`, `geom`, `ramp`,
`hash`, `pick`, and **the** material — one `MeshLambertMaterial` shared by every organism in the
scene, so a shading change lands on all of them at once.

The two conventions every species now inherits:

- **Body units.** A part is built at final size where 1.0 is the species' defining span — carapace
  width for the crab, body length for a fish. The per-animal matrix carries metres-per-unit, so
  each species has exactly one size knob.
- **Limbs are root-at-origin along +X.** Placement is "point +X down the joint direction, scale X
  to the segment length", so the behaviour file never knows what shape the part turned out to be.

`crabbody.js` was refactored onto it in the same pass and lost 120 lines.

### The goby (§1, §5, §6)

Built second because the guide says so: *without it the pools are empty scenery and §5 proves
nothing.* Priority-Flood had been sitting in `world.js` since the terrain pass with nothing alive
to care whether it worked.

Three states, decided by the tide every frame: `sea` (open water continuous with the sea),
`pooled` (standing water whose rim is above sea level — confined to that pool, darts more, rests
less), `beached` (dry — flops, and the 26 s stranding clock runs). Stranding is the only mortality
path in the sim; a dead fish is removed and returns on the next flood rather than lying on the sand
for three tide cycles.

### Getting the trapping to actually happen

This took three passes and is the interesting part.

1. **Random seaward wandering.** Fish wandered down-shore on a heading and beached in the open —
   31 of 46 stranded, 1 pooled. They were walking out of the water sideways while aiming roughly
   the right way.
2. **Depth-seeking.** Score candidate targets by how much water stands over them. Now they tracked
   the waterline perfectly — and a fish that depth-seeks the whole ebb is *never* trapped. One run
   trapped **zero**. Same empty §5, reached from the opposite direction.
3. **Forage, then scramble.** Depth only takes over once the water is thin, and *how* thin is a
   per-fish `caution` value spread across the population. A cautious goby leaves the lagoon early;
   a bold one keeps feeding until the bar behind it has dried, and that is the one you find in a
   pool. **The trapping is an emergent cost of greed, not a dice roll.**

Two supporting fixes: the escape search is **omnidirectional** (a seaward-only scramble walks a fish
straight past the pool behind it), and it is distance-weighted (a better pool it cannot reach is
worthless). And thin water cancels the rest timer outright — a fish idling between targets when the
waterline arrives gets left on the sand.

Measured over four full tide cycles: **2–4 fish in pools at every low water**, spread across one to
six pools, never zero, and none left beached once the tide settles.

### Two orientation bugs worth remembering

Both are the same class of mistake as the crab's edge-on claw, and neither looks like a bug in code
review:

- **A fin's LENGTH runs along the body and its HEIGHT stands off it.** Pointing a dorsal fin's
  direction vector at `UP` — the obvious-looking thing to write — stands the whole blade on its end
  and gives the fish a pair of sails.
- **The body is built along +X, but `yaw` is a compass heading from +Z.** Without a −90° correction
  the fish points across its own travel direction and swims sideways. Correct for the fiddler crab
  next door, very wrong for a fish. It was caught by asking for a broadside screenshot and getting
  a head-on one.

### Cost

46 fish × 8 parts in 5 InstancedMeshes. Scene total with both species: 16 organism draw calls.

---

## 22. The species panel, follow cam and food web — `js/species.js`, `js/ui.js`, `js/foodweb.js` (2026-08-12)

The savanna interaction layer, ported. Three files land together because they all read one thing:

- **`js/species.js`** — the catalog. `SPECIES` (animals) + `FLORA` (producers), each entry carrying
  its panel row, fact-card copy, adaptation lists, `trophic` row and `eats` links. Nothing else in
  the build holds species text.
- **`js/ui.js`** — species panel, follow mode, fact cards, click-to-inspect, toast.
- **`js/foodweb.js`** — the 🕸 panel, unmodified savanna engine plus §9's `LEVELS`.

Wiring is one call in `main.js`:

```js
UI.init({ rig, camera, scene, world, pops: { fiddler: crabs.crabs, goby: gobies.fish } });
```

`pops` maps a species' `sim` key to its live array of individuals. **A species with no `pops` entry
is still in the panel and still in the food web** — it just has no body to follow. That is what lets
the catalog run ahead of the roster (§11): all six v1 species and four producers are written up now,
and each one lights up as its file lands, with no UI edits.

### What instancing cost the port

Savanna's organisms are Object3Ds. Ours are instance slots (§20, §21), and two of savanna's
conveniences do not survive that:

- **Following.** `rig.follow()` read `organism.group.position`. There is no group. The rig now takes
  anything with `x` / `y` / `z` — `Vector3.lerp` only reads those three — so a raw crab or fish
  object *is* the follow target. It also takes a per-species framing distance (fiddler 7 m, goby
  11 m); one default cannot frame a 2 cm crab and a hand-length fish. While following, the camera's
  1.5 m floor drops to the animal's own height + 0.6 m, or the view ends up inside the mud.
- **Picking.** Raycasting an InstancedMesh whose matrices are rewritten every frame is not reliable —
  three caches a bounding sphere off the matrices as they were. Picking is **screen-space** instead:
  project every visible individual, take the nearest inside a 46 px radius, ties broken toward the
  camera. ~130 projections per click, and it cannot go stale.
- **Hover glow is not ported at all.** An instanced body shares one material across the whole
  population, so there is no per-animal material to tint. Selection reads through the follow bar and
  the fact card.

### Follow bar reads state, not just a name

`Fiddler Crab #4` with `out on the mud` under it, refreshed 4× a second from a per-species state
map in `ui.js` (`down the burrow` / `coming up` / `running for the burrow`; `in open water` /
`trapped in a pool` / `stranded — drying out`). On this shore the tide changes what an animal is
doing while you watch it — that is the whole reason to follow one. When a followed goby's stranding
clock runs out the camera is released with a toast rather than left staring at empty sand.

A burrowed crab stays followable: the camera sits on its hole, which is where it comes back up.
`followable()` prefers individuals that are currently drawn and falls back to the rest, so clicking
a species at high tide still gives you something.

### Food web

§9's `LEVELS` verbatim, plus one engine change: **a row with no members is skipped at layout time.**
`SCAVENGERS` stays in the array for the v2 hermit crab without leaving a label floating over blank
space. Node placement, reverse-derived "eaten by", green scavenger auto-links, dashed symbiosis and
the orphan warnings are all untouched savanna code.

Links wired in v1: barnacle ← plankton; nerite ← biofilm; conch ← biofilm + seagrass; fiddler ←
biofilm + seagrass; sea star ← barnacle, nerite, conch; goby ← fiddler. One symbiosis pair,
**fiddler ↔ mangrove** — burrows aerate the root zone, litter fall feeds the crabs. Console runs
clean of orphan warnings.

### Layout note

The species panel sits at `right: 222px`, **left of the tide gauge, not under it**. The gauge is live
instrumentation and has to stay readable while the panel is open.

### Testing

Headless throttles rAF to a crawl, so anything on a sim clock (the 26 s stranding timer) has to be
driven by hand — `__gobies.update(0.05, t)` in a loop, with `UI.update(0.05)` alongside it, is how
the follow-release path was verified. `world.setTideHeight()` parks the water where a given species
is active: 1.0 m to get the fiddlers up, 2.2 m for gobies in open water, −0.6 m to strand them.

---

## 23. v1 roster completed — barnacle, nerite, dog conch, knobbly sea star (2026-08-12)

`js/barnaclebody.js` + `js/barnacles.js`, `js/neritebody.js` + `js/nerites.js`,
`js/conchbody.js` + `js/conchs.js`, `js/seastarbody.js` + `js/seastars.js`,
and one extraction: `js/rockfield.js`.

§1's roster is now complete. Counts: 340 barnacles, 90 nerites, 44 conches, 15 sea stars, on top of
84 fiddlers and 46 gobies. Whole scene, six species: **53 draw calls.**

### The batch was chosen to add one new PROBLEM each, not one new animal each

| Species | The new problem |
|---|---|
| Barnacle | sessile, and living on ROCK at an angle rather than on flat ground |
| Nerite | MOVING on that curved rock surface, and a memory of where it lives |
| Dog conch | behaviour aimed at the WATERLINE itself, not at being above or below it |
| Sea star | RADIAL — no facing at all — and the shore's headline animal |

### `rockfield.js` — the boulder surface, extracted

Barnacles and nerites both need to sit on a boulder at whatever angle it offers. A rock is modelled
as an **ellipsoid cap**: radius `r` at the ground, rising to `top` at the centre, which yields both a
surface point and a normal at any (bearing, radius). Because every body part is built root-at-origin
along +X, placing an animal is *"point +X down the normal"* — a barnacle on a vertical face costs no
extra code, and a nerite crawling is two numbers changing rather than a 3D pathfind.

Three corrections are baked into the shared model, all of them learned on screen:

- **Work inside the radius (82%).** `rk.r` is a *bounding* radius; the real voxel boulder has usually
  stopped well before it. Animals placed out there hang in mid-air off the side of nothing.
- **Sink the cap by ~5 cm.** Otherwise shells and feet float a visible sliver above the stone.
- **Drop engulfed boulders.** Rocks are scattered without overlap checks, so a small cobble can sit
  *entirely inside* a big one. This cost a debugging pass: eight nerites, projecting to the middle of
  the screen, drawn every frame, completely invisible — they were inside solid rock.

### Barnacle: the band IS the reading

`open` while submerged (trapdoor parted, cirral fan raking), `shut` while exposed. No stranding,
ever — being out of water is half of this animal's life, not a hazard. Placement is clustered, not
scattered, because larvae settle beside existing barnacles; and it is clamped hard to 2.2–2.8 m CD,
because the top of the band is the top of the living shore.

Shells are written to their InstancedMesh **once at spawn** and never touched again — they are as
static as the rocks. Only the trapdoor and the fan move, and only while wet.

*Bug worth remembering:* the cirral fan first pointed straight up the shell axis, and every animal
grew a dark vertical feather. Barnacles do not wave flags — the fan rakes **across** the aperture.

### Nerite: it goes home

`graze` (wet: crawls and rasps) → `homing` (drying: walks back to its scar) → `clamp`. The walk back
is the visible part; a snail already at its scar just clamps where it stands. Verified: 90/90 return
to within 6 cm of their scar after the shore dries.

The idle is a **shell-rasp wobble**, not the savanna head-dip §2 struck off this build — a snail has
no neck.

### Dog conch: the animal that tracks the waterline

Every other species is above the water or below it. This one stays *in* it, at a per-individual
preferred depth (10–55 cm) — so "follows the ebb down-shore" **falls out of a depth preference**
rather than being coded as a direction. It vaults there: `hop` is a discrete 0.55 s leap with a foot
plant and a nose-up-then-down pitch, because a snail that slides is a rock that moves and a snail
that vaults is unmistakably an animal.

Caught dry it buries, and `sink` does that by dropping the whole body below the sand — no separate
buried model. A nice emergent result: at low water 40/44 bury, and the 4 that don't are sitting in
**tide pools**, still following their depth.

*Bug worth remembering:* the shell's first profile peaked at 1.0 across a third of its length and the
animal read as a faceted pebble. A conch is a **spindle** — widest well forward of centre, pointed at
both ends. The flared lip also has to hug the shell; set too long or too far out it reads as a
separate plate floating alongside.

### Knobbly sea star: exposed is not a failure state

The first pass had a stranded star begin burying immediately. Defensible, and completely wrong for
*this* shore — the entire reason people walk Chek Jawa on a spring low is that knobbly sea stars are
lying out **on** the drained flat. So each animal carries its own `patience` (40–110 s) before it
bothers to dig in, and the flat keeps its scatter of orange stars right through the low. Burying is
what happens when the exposure drags on.

It is also the first **radial** animal: five arms at 72°, no front, no yaw to steer with. It creeps in
a direction without turning to face it, which is what a sea star looks like and falls out of the
model for free. The knobs are separate instances rather than baked into the arm, so they can ride a
bending arm and shrink toward the tip.

`stranding` is null here with a stated caveat: a stranded star in full sun *does* die, and 2007's
freshwater event killed much of this population. That mortality path belongs with §10's salinity
scalar, not with the ordinary tide.

### Grazing is stubbed, deliberately (§7 seam)

Nerites and conches are the grazers the biofilm grid is meant to feed, and the grid does not exist
yet. Rather than block the batch on it, grazing is **self-contained**: any wet rock is grazeable, and
a conch seeks the right *depth*, not the richest food. There is exactly one function per species to
change when the grid lands — `grazeAt()` in nerites.js, `pickTarget()` in conchs.js. States,
movement and tide logic do not change.

### UI

All four dropped straight into the species panel, follow cam, fact cards and food web with **no UI
code changes** — one `sim` key each in species.js, one `pops` entry each in main.js, plus a follow
distance and state-label table in ui.js (§22). Follow-bar state text now covers all six: *"out on the
mud"*, *"clamped down, waiting for water"*, *"vaulting down-shore"*, *"lying out on the drained
flat"*.

---

## 24. The goby is now a mudskipper — `js/mudskipperbody.js` + `js/mudskippers.js` (2026-08-12)

Replaces §21's goby outright. `js/gobies.js` and `js/gobybody.js` are deleted; the species key,
the `pops` entry and the fact card all moved with it. **Same slot in the roster, opposite animal:**
a goby is a fish that gets caught out by the tide, a mudskipper is a fish that *means* to be out
of the water.

### Three things the goby model got wrong for this animal

- **It lay on its side.** A fish on its side is a dying fish. A mudskipper on mud is **upright**,
  propped on its pectoral fins with its head raised — the posture *is* the species, and it is what
  makes it readable at fifty metres.
- **It just lay there.** This one **skips**: a tail-flick launch, a 0.34 s arc, a landing back on
  the props, and a slow pectoral crutch-walk in between.
- **It died of air.** Air is where it works. There is no stranding clock and no mortality.

### Moisture, not mortality

`wet` runs 1 → 0 over 55 s out of the water and never kills anything. Below `LOW_WET` the animal
breaks off whatever it was doing, goes to the nearest water, dips, and comes back out. That single
rule produces the real pattern: constant traffic back and forth across the waterline all day.

### The water edge is the habitat

The goby had a **depth** preference. This one has an **edge** preference: `edgeScore()` rates a spot
by how close it sits to just-above the current waterline (per-animal, 2–45 cm above), and every
target it picks is scored on it. Everything else falls out of maximising that — following the tide
up and down the shore, hanging around pool rims, never wandering into the mangroves. Measured over a
1.8 m → 0.9 m drop: the population's median ground height tracks from 1.79 m to 1.32 m, and sits a
median **19 cm above the waterline** (min −1 cm, max 88 cm).

`ZONE` moved up to 0.8–2.6 m CD — a mudskipper's ground is the flat the tide *uncovers*, and the top
of the band reaches the mangrove fringe so there is still dry edge to sit on at high water.

### Two bugs worth remembering

- **Wetting and swimming are different thresholds.** The first version only counted water deeper
  than `SWIM_DEPTH` as water at all, so animals standing in the two-centimetre film right at the
  waterline — exactly where this species lives — dried to zero while visibly sitting in water. *Any*
  water wets a mudskipper; it takes a lot more before it can swim in it.
- **"No water nearby" needs a fallback.** An animal left high by a fast ebb can have nothing wet
  inside the sample radius, and the first version simply gave up and sat at `wet = 0` forever. Water
  is always downhill on a shore, so the fallback needs no map: take the lowest ground on offer.
- *(Posture, third time lucky:)* the props only read once the pectorals were given their own
  ashore length and thickness. Reusing the swimming values hid them under the body and the animal
  still looked beached.

### What this costs: §5's trapping demonstration

**The pool finder no longer has anything to prove it.** §5's payoff was gobies stuck in pools at low
water, and a mudskipper cannot be stuck — it walks out. Pools are still modelled and still used (the
`pooled` state reads them, and a mudskipper works a pool's rim like any other water edge), but
**nothing on this shore is currently trapped by one.**

If that demonstration matters, it needs a true fish back in the roster — a small goby or a juvenile
in the low band, kept as a second species alongside the mudskipper rather than instead of it. Noted
here rather than quietly dropped.

---

## 25. Diatom biofilm — `js/biofilm.js` (2026-08-13)

The first thing built here that is not an animal, and §7's resource grid. Nerite grazing and conch
target-picking were stubbed against it in §23; both seams are now wired and nothing else in either
species changed, exactly as promised.

### It rides the terrain node grid instead of building a patch grid

Savanna's grass grid was a second, coarser lattice (`PATCH_SPACING` 22 m) laid over the world.
This one has no lattice of its own. world.js already keeps, per node, the two arrays a biofilm
needs — `hArr` (height, metres CD) and `wet` (0..1, how recently submerged, §3) — and §7 says to
key regrowth off recent submersion **and to reuse the field the wet-sand renderer already tracks**.
Sharing the grid is how that was honoured. Three things fall out of it:

- **Zero draw calls.** The colour pass is already resolving every node's colour every frame; the
  film is four more lines inside it.
- **`indexAt()` is the lookup**, so `filmAt` / `grazeFilm` are O(1) with no new spatial structure.
- **The resolution is right by accident.** 3.0 x 1.5 m cells are far too fine for a wildebeest and
  about right for a snail that crawls 5 cm/s.

`biofilm.js` owns the arrays and the rules and is handed `{ N, heights, wet, indexAt }` at build.
Grazers go through `world.filmAt` / `world.grazeFilm`, never through `world.biofilm.film` — the
same rule as `waterAt`, and the place seagrass will be folded in later.

### Zonation is baked, depletion is emergent

`capacity[ci]` is a fixed hump against height: 1.0 across 0.3–1.7 m CD, easing to 0.20 at 3.0 m
(the fringe dries too long) and down to 0.45 in the channel below −0.55 (never drains, so never
gets full-strength light). Standing crop inside that ceiling is the live part. Measured caps by
band: 0.30 at 2.7–3.2 m, 0.86 at 1.8–2.7, 1.00 at 0.3–1.8, 0.75 below 0.3.

Regrowth is `1/125 s` scaled by wetness (a fully dried node keeps `DRY_RATE` = 12% of the rate),
by daylight, and by headroom under the ceiling. The 12% is the number the shore's food zonation
actually comes from — the high band regrows about eight times slower than the flat, so grazing
pressure up there always bites.

### The tint switches on with EXPOSURE, not with wetness

The obvious way round is wrong. Diatoms climb to the surface when the tide uncovers the mud in
daylight and sink before the water returns, so the brown-gold sheen is at its strongest on a
*drained* flat and dims to 45% under water (where the depth tint takes over anyway). That single
inversion is what makes the flat change colour on a tidal clock instead of just looking damp.

### The boulders had to be tinted too, or the nerites' work was invisible

Nerites graze the node **under** a boulder, and the boulder is what you can see. So the rock
InstancedMeshes got an `instanceColor` and the same sheen, refreshed on a 0.2 s throttle (at 125 s
bare-to-full this colour cannot change faster than that, and 154 instances a frame for nothing is
the cost this file spends its time avoiding). The payoff is the clearest reading in the build:

| | rocks | median film |
|---|---|---|
| with nerites on them | 24 | **0.21** |
| untouched | 130 | **0.64** |

A worked boulder goes pale bare stone while the one beside it stays gold. Verified on screen, and
by A/B — zeroing `film` drops the whole flat back to cool brown.

### A confined grazer has to be balanced, not just hungry

First instinct was to make `GRAZE_RATE` big enough that a patch is stripped and the animal walks
off. That is right for the conch and **wrong for the nerite**, which cannot leave its boulder: a
rate above regrowth strips its rock permanently and the animal starves in place forever. So the
nerite's rate (0.010/s) is tuned to sit just under what the upper shore grows back, and the result
is an equilibrium lawn at ~0.15 film — permanently scrubbed rock, permanently occupied, no
starvation lock. Over 10 tide cycles: 60% of grazing snails feeding, 40% travelling, shore-wide
cover flat at 98%.

The gait switch is the behavioural half. Feeding, a nerite turns often and stays inside the patch;
on bare stone it stops rasping (tentacles in), straightens up and crawls faster until it finds film
again. That is area-restricted search, and it is the visible consequence of the resource being
finite rather than an animation.

### Food is deliberately the cheaper term for the conch

`pickTarget()` now scores candidate landings on film as well as depth, at `FOOD_WEIGHT` = 0.12 —
a full patch is worth about 12 cm of depth error. A conch will cross slightly wrong water for a
good patch and will not follow food up out of its band, so this stays the animal that tracks the
waterline. Re-checked against §23's result: at 0.35 m, 43/44 buried and the one still up is
sitting in a pool. A resting conch also grazes what it is standing on and now has a second reason
to hop — the sand under it is cleaned up — which turns the low-tide flat into a faint trail of
worked patches rather than bare ground.

### Cost, and the UI

0.029 ms/frame for the whole resource layer — 6.6% of `world.update`, which is itself 0.44 ms. No
new meshes, no new draw calls. The tide panel gained one row, `Biofilm — NN% cover`, recomputed on
the same 1 s clock as the next-low prediction: the film is the one thing on this shore the fact
card tells you about and you cannot count, so it gets a number.

### Still owed

- **Seagrass is not built.** §7 pairs it with the biofilm and the lagoon meadow is still empty
  scenery; tape seagrass is the next flora item and will want its own capacity curve.
- **The fiddler crab does not read the grid.** species.js has it eating biofilm and seagrass, and
  84 of them sift the flat every low tide. It was left out because §7 named only the nerite and
  the conch as v1 readers, but it is the largest grazing pressure on the shore and the most
  obvious next connection.

---

## 26. Tape seagrass — `js/seagrass.js` (2026-08-13)

The other half of §7, and the second producer with a body. *Enhalus acoroides*: metre-long ribbon
blades off a buried rhizome, in the lagoon at 0.05–0.95 m CD. 9 000 blades, **1 draw call**,
168–180 k triangles.

Before this the "seagrass lagoon" was a word: a green stop in the terrain colour ramp
(`world.js:211`), a stripe label on the tide gauge, and a fact card. Two species already declared
`eats: ['biofilm','seagrass']` against a plant that did not exist.

### The whole point is that it lies down

Under water the blades stand and stream. On a spring low the lagoon drains and the meadow
**collapses** — every blade flat on the mud, combed the same way the water left. That is what the
photographs of a Chek Jawa spring low actually look like, and it is worth more than any amount of
blade detail: at a hundred metres you cannot see a blade, but you can see a meadow stand up and
lie down. The tide panel says so in words too — *standing* / *NN% still up* / *flat on the mud*.

Measured against the gauge: 0.02 standing at 0.10 m CD, 0.47 at 0.40, 0.71 at 0.70, 1.00 from
1.00 m up. A clean ramp, and it is per blade — `waterAt` (not `world.tide`), so a blade in a
runnel that still holds water stays up while the bed around it has gone over.

### Sway in the shader, collapse on the CPU

Split deliberately.

- **Sway** is a vertex-shader patch on Lambert (savanna's `onBeforeCompile` trick), two
  frequencies — a slow swell the bed shares plus a faster per-blade flutter. One alone reads as a
  flag; both together read as water moving over a meadow. Free for 9 000 blades.
- **The collapse cannot go there.** It is a rotation about the blade's *base*, and the instance
  matrix scales y by blade length while leaving x alone — laying a blade over in the vertex shader
  would flatten it into a tenth of the ground it should cover. So it is a throttled matrix
  rebuild (0.25 s), pivoting at the rhizome, with the centre pushed half a blade along the new
  axis or the plant sinks through the mud as it goes over.

**Sway amplitude is in metres.** First pass used savanna's 3.2 and blades swung 2.4 m sideways —
the lagoon looked like kelp in a storm. 0.22 is the number.

### Three levels of scatter, not one

Sprinkling blades evenly over the ~8 000 m² band gives 0.7 blades/m², which reads as weeds. Real
*Enhalus* grows in dense beds with bare sand between. So: a **bed** centre, 8–20 rhizomes around
it inside 4.2 m, 5–12 blades on each inside 0.55 m. Same blade budget; the contrast between thick
bed and open sand is what makes it read as a meadow.

Everything goes over the **same** way (+z, down-shore, ±0.3 rad). Falling outward from each
rhizome gives a field of starbursts; combed one way gives a drained lagoon.

### The dirty check is what makes it affordable

Rebuilding 9 000 matrices four times a second costs ~1.7 ms in the frame it lands on. A blade is
now only rebuilt if its lay or its crop actually changed, so a meadow that is fully up or fully
over — which is most of the time — costs one `waterAt` per blade and nothing else. `world.update`
went 0.44 → 0.46–0.53 ms all in.

### The resource, and the grazer that isn't there

Standing crop 0..1 on the same terrain node grid as the biofilm (see §25 for why that grid), with
its own capacity curve — full across 0.10–0.75 m CD, tapering to the band edges — and a slower
`GROW_SECS` (190 vs 125), because this is a plant, not a film. Regrowth keys off `wet`, same field
again. **Blade length is read off the crop**, so a poor or grazed patch is visibly shorter, browner
turf rather than an invisible number.

`world.grassAt` / `world.grazeGrass` exist and work. **Nothing eats them yet, and that is stated
rather than faked:** every v1 grazer bottoms out at 1.0 m CD and the meadow tops out at 0.95, so
the bands do not touch. The conch's and fiddler's `eats: seagrass` links in species.js are
aspirational — they were before this too. The animals that would actually come down here are the
sea hare, the sand dollar and the green turtle.

### Still owed

- **A grazer in the lagoon.** Sea hare or sand dollar; either closes the `eats` link and gives the
  crop a consumer, which is the only part of §7 still unexercised.
- **The fiddler crab still does not read the biofilm** (§25's note stands).
- **Spoon seagrass (*Halophila*)** is the other lagoon plant — low rosettes rather than straps,
  and a cheap second silhouette against the same resource layer.

---

## 27. Sea hare — `js/seaharebody.js` + `js/seahares.js` (2026-08-13)

Seventh organism, first one from the v2 list, and the animal §26 left an opening for: every grazer
in the v1 roster bottoms out at 1.0 m CD, the meadow tops out at 0.95, so the seagrass crop had no
consumer at all. *Dolabella auricularia*, 16 of them, in the lagoon.

### The new problem: the first true forager

Each species in this build was chosen to add one problem (§23). This one's is that **food is the
only driver**.

- the nerite grazes but cannot leave its boulder, so its rate has to be tuned to an equilibrium it
  can never escape (§25)
- the conch scores food when it picks a landing, but depth wins the argument by design (§25)
- the sea hare has no depth preference, no edge preference and no home. It crops the turf under
  it, and when the turf is gone it crosses open ground to a patch it has smelled out

Settled behaviour over 10 tide cycles: **62% grazing, 31% roaming, 7% hunkered down, 0.4%
fleeing**, median net displacement 13 m per animal, meadow cover steady at 0.97.

### Getting that split took four passes, and the third one was a real bug

- **77% roaming.** First tuning: turf ran out in 9 s, the walk to the next patch took a minute.
- **92% grazing, 1% roaming.** Overcorrected — but this also exposed that 16 animals on 1 909
  meadow nodes essentially never run out of food, so the relocation was firing on nothing.
- **Fourteen of sixteen sat in their own craters reading crop = 0.150 for ten cycles.** With a
  single threshold, the animal pins its node at exactly `BARE`, regrowth trickles it a hair above,
  the hare eats it straight back down — and because it got *something* every second, "have I
  found food lately" never went false and it never left. **Two thresholds fixes it:** `BARE`
  (0.15) is "is there anything left to take", `GOOD` (0.30) is "is this worth staying for".
- Final balance is deliberately **graze rate ≈ crossing rate**: it strips a node in about as long
  as it takes to crawl across one, so it cuts a lane rather than digging a pit. The lane is what
  makes one animal's feeding legible on a meadow this size — 79 of 1 909 nodes carry visible
  cut, shorter and browner via seagrass.js's crop-driven blade length.

It also steers up the food gradient while feeding — three short samples, take the richest. It has
rhinophores; it can smell which way the weed thickens. Without that it re-crosses its own swathe.

### The ink, and the first interaction between two populations

A knobbly sea star creeping within 2 m sets it off: five puffs released **where the animal is
standing**, not where it is running to, then a 3–5.5 s crawl directly away, then a 14 s cooldown.
15 events over 10 tide cycles — rare enough to be worth seeing.

The star is **not** modelled as eating it, and the food web does not claim it does. The hare
simply does not wait to find out, which is exactly what ink is for. `opts.seastars` is optional,
so neither population depends on the other.

Puffs are one extra InstancedMesh on a transparent unlit material. Instancing gives no per-instance
alpha without a second shader, so a puff fades by **swelling, washing out toward the water's tone
via instanceColor, and shrinking away** — dispersal by scale and brightness rather than opacity.

### The -90°, again

The first broadside screenshot showed the animal crawling **sideways**: bodies are built along +X
(facet.js) but every heading here is `atan2(dx, dz)`, a +Z bearing. The conch carries the same
`yaw - PI/2` correction and it was simply missed. Invisible in code review, obvious the moment a
requested broadside view came back — third time this exact class of bug has been caught that way
on this build (§20 crab claw, §21 goby on its side).

### Cost

Five instanced meshes for the body (body, parapodia ×2, rhinophores ×2, oral tentacles ×2, warts
×6) plus one for ink: **92 draw calls**, 0.023 ms/frame for the population. Whole frame 0.80 ms.

### Still owed

- **The fiddler crab still does not read the biofilm** (§25, §26 — third time of asking; it is
  now the last v1 species not wired to a resource).
- **Spoon seagrass**, the lagoon's other plant (§26).
- The sea hare is the first v2-roster animal to land; the rest of §1's v2 list is untouched.

---

## 28. The fiddler crab reads the biofilm — `js/crabs.js`, `js/crabbody.js` (2026-08-13)

Fourth time of asking, and the last v1 species that was still grazing a resource which did not
exist. §25 built the film, §26 the meadow, §27 the animal that eats the meadow — and the 84
animals with the biggest grazing pressure on the shore went on miming it.

### It is a deposit feeder, so the seam is not the nerite's

Nerites and conches scrape continuously while they are on the ground, so their hook is one line in
the movement loop. A fiddler works in **discrete claw-loads**: stand still, dip the small claw,
sift, spit out the cleaned grit, move a little, do it again. The animation was already exactly
that. So the grazing goes **inside the pause**, not in the walk:

```js
if (c.pause > 0) {                       // a sift is in progress
  var here = world.filmAt(c.x, c.z);
  if (here > BARE) world.grazeFilm(c.x, c.z, GRAZE_RATE * dt);
  c.fed += ((here > GOOD ? 1 : 0) - c.fed) * Math.min(1, 0.9 * dt);
  if (c.pause <= 0 && c.sifting) { dropPellet(c, ci); c.sifting = false; }
  return;
}
```

A walking crab eats nothing. That duty cycle — roughly a fifth of the population is mid-sift at
any moment — is most of what keeps 84 confined animals from flattening their band.

### The confinement problem, worse than the nerite's

[[chekjawa-biofilm-tuning]]'s rule is that a grazer which cannot leave its patch must be tuned
**under** regrowth. Two things make it bite harder here than it did on the snail:

- a 1.30 m territory is about **one terrain node** (3.0 × 1.5 m), and burrows are only 1.5 m
  apart — so roughly **three crabs share the ground one of them is standing on**;
- the crab feeds **only while the flat is dry and lit**, which is exactly when the film up in the
  fiddler band regrows slowest (`DRY_RATE` 0.12 in biofilm.js).

`GRAZE_RATE` 0.055 film/s *while sifting* is the setting that survives that. Twelve tide cycles
with nerites and conches also running:

| | after 1 cycle | cycles 8–12 |
|---|---|---|
| film under the animals | 0.58 | 0.35 – 0.43 |
| `fed` (found good sediment) | 0.92 | 0.54 – 0.62 |
| out / sifting | 83 / 23 | 83 / 15–27 |

It settles instead of collapsing, which is the whole test. The band mean is useless as usual —
shore-wide cover never left 96–97% while this was happening.

**The halo is large.** Film on burrow nodes **0.27**, film on same-band nodes with no burrow within
4 m **0.92** (n = 3 261). More than 3:1, and it is visible on screen: the film sheen is a big part
of the mud's tone, so a worked cluster reads brown-dark against pale gold ground.

### Hunger buys range, and one threshold was again not enough

`BARE` = is there anything left, `GOOD` = is this worth staying for — the sea hare's lesson (§27)
applied before it could bite. `fed` then does two jobs: a crab that is finding food sifts longer
(`pause` scales 0.62–1.38×), and a crab that is not pushes its foraging circle out to
`HUNGRY_REACH` × 1.30 m.

Stretching `reach` alone moved the animals **17 cm** and did not read. The radial bias had to move
with the hunger too — a fed crab potters by the door, a hungry one goes straight to the rim. After
that, mean **target** radius against `fed`:

| `fed` | 0–0.2 | 0.2–0.4 | 0.4–0.6 | 0.6–0.8 | 0.8–1.0 |
|---|---|---|---|---|---|
| target radius (m) | **1.09** | 0.78 | 0.55 | 0.29 | **0.12** |

Nine to one, monotonic. Note that **instantaneous position is the wrong thing to measure** — it
showed 0.86 m vs 0.69 m and looked like a failure. A crab reads as `fed` *because* it already
walked out to good ground, so the position metric measures the outcome and hides the cause.
The target radius is what hunger actually chose.

This also gives the burrow-fidelity story in species.js a visible edge: the crabs furthest out on
the mud are the hungry ones, and they are the ones a rising tide catches short.

### The pellets stopped being set dressing

Six crumbs used to be scattered round each hole at build time and never touched again. They are
now the **receipt**: one pellet dropped wherever a crab finished a sift, ring-buffered eight per
crab — and **the flood wipes the field**, keyed off water reaching the hole rather than off the
crab going down, so a crab that dives because night fell keeps its litter until the tide comes for
it. Nothing else in this sim shows the tide undoing a day's work.

They were also **half the size they should be**: 1:16 against the carapace where a real pellet is
about 1:8, which read as grit specks even with eight out. `rad` 0.048 → 0.085 in crabbody.js and
the field reads at the follow-cam's own 7 m.

### Cost

The hook itself is two grid lookups per sifting crab: **0.001 ms/frame**. No new mesh, no new draw
call — the pellet InstancedMesh already existed and only gained a dirty flag. The whole 83-crab
population, all surfaced, updates in 0.395 ms, essentially all of it the pre-existing per-part
matrix work.

### Also

`ui.js` now prefers an organism's `act` over its `state` for the follow bar, because 'out on the
mud' covers most of a low tide and says nothing. The fiddler publishes `sift` / `forage` / `wave` /
`flee`; every other species falls through to its state machine's own name unchanged.

### Still owed

- **Spoon seagrass**, the lagoon's other plant (§26) — now the oldest open item.
- Horn snail, hermit crab (the SCAVENGERS row is still empty), sand dollar, Haddon's carpet anemone.
- §1's v2 list is otherwise untouched.

---

## 29. Spoon seagrass — `js/spoongrass.js` (2026-08-13)

The oldest open item on the list, and the first of the v2 roster's plants after tape seagrass.
It is also the one that fixes §26's own complaint.

### Why it is not a small tape seagrass

§26 shipped a meadow **nothing on this shore could eat**: every v1 grazer bottoms out at 1.0 m CD
and the Enhalus bed tops out at 0.95, which is why the sea hare had to be invented in §27 to give
it a mouth. *Halophila ovalis* is the pioneer of the family — it takes bare sand from **0.85 to
1.70 m CD**, the open flat. That is inside the dog conch's band (1.0–1.8). It is the first plant
here that grows where the animals already are.

Three things follow from that and each of them is a real difference, not a reskin:

- **The tide beat is colour, not collapse.** §26's payoff is a metre-long blade lying flat at a
  spring low. A 12 cm leaf has nowhere to fall — it is already flat. So exposure is read the other
  way: the mat dulls olive and lies over, the flood lifts and greens it. Cheaper too — no 90°
  rotation to recompute, and the leaf's geometry starts at y=0 so there is no half-length push to
  keep it out of the mud the way seagrass.js needs.
- **It regrows twice as fast** (`GROW_SECS` 95 against 190). That is the plant's whole strategy —
  it survives being eaten rather than avoiding it — and it is what makes it safe to put in a
  grazer's band.
- **Its own crop array.** A conch cropping the flat must not drain the lagoon forty metres away.
  Published as `world.spoonAt` / `world.grazeSpoon`, deliberately a second pair of verbs rather
  than one `plantAt` that picks by height: an animal should have to say what it is eating.

### The dog conch finally has a second food

`SPOON_BITE` 0.45 of its film rate — it rasps epiphytes off the leaves rather than stripping the
mat. Over twelve cycles: mat under the conches **0.50**, untouched mat in the same band **1.00**
(n = 4 173). 2:1, and it reads, because leaf length runs off the crop (0.35 + 0.65 f) and a
grazed patch also tints olive.

### Three passes to make a mat look like a mat

Worth recording because the first two were both wrong for instructive reasons.

1. **42 cm lily pads.** `BoxGeometry`'s x is in METRES and only y is scaled by the instance
   matrix — seagrass.js's `0.085` is a tape blade's real 8.5 cm width. Read as a proportion of
   length, the leaves came out 42 cm wide on 12 cm stalks.
2. **One leaf per square metre.** 11 000 leaves spread evenly over a band 280 m long and 38 m
   across reads as scattered weeds. Dense small patches instead — the same thick-patch/bare-sand
   contrast tape seagrass uses.
3. **Dense patches were still not enough.** 16 000 leaves in 1.15 m patches cover about 8% of
   10 600 m², so patches land ten metres apart and a close-up of ground the *resource* says is at
   full crop shows bare sand. The fix is a third tier — mats grouped into **beds** — which puts
   the bare ground between the beds instead of inside them. A 12 cm leaf cannot carpet 10 600 m²
   at any instance count worth paying for; spend the leaves where they read.

Final: 20 000 leaves, 17 beds, one draw call.

### A conch bug the mat exposed

Twelve cycles put the median conch at **1.91 m CD** against a stated band of 1.0–1.8, upper
quartile 2.00, not one animal below 1.0 — all piled against `pickTarget`'s own ceiling of
`ZONE[1] + 0.3`. They had been climbing out of their zone since §23 and nothing had looked.

**The ratchet is in the asymmetry between the halves of the cycle.** On the ebb a conch that lags
the retreating waterline is left dry and BURIES — it gives up ground passively. On the flood it
digs out and actively follows the water, and on a flood the shallow depth it wants is always
up-shore. Every cycle it loses ground by accident and takes it back on purpose.

Two fixes, and the first alone was not enough:

- **A band term in the score,** `BAND_PULL`. At 0.9 it only slowed the drift (1.91 → 1.54, then
  back to 1.78 over ten more cycles): both terms are in metres and both read the same 0.03 m/m
  shore slope, so a hop that buys 0.03 of band costs about 0.03 of depth error and they cancel.
  At **4.0** the ceiling holds — nothing now leaves the band. The term is zero inside the zone, so
  it can afford to be brutal outside it.
- **Depth only counts on the ebb.** A submerged conch on a rising tide has no reason to walk
  up-shore after shallower water; it sits, which is what being caught by a flood looks like.
  Keeping the ebb half intact is what keeps this the animal that tracks the waterline down.

Result over 20 cycles: median settles at **1.60** and flattens from cycle 10, conches on the mat
hold at 26–32 of 44 instead of bleeding to 14.

### Also

The tide panel gets its own **Spoon grass** row. The two plants are in different bands and do
different things on the same tide — the lagoon meadow is still standing in water while the mat on
the flat has already gone over — and one "Seagrass" line would hide exactly that.

### Still owed

- Hermit crab (the SCAVENGERS row is still empty), horn snail, little egret.
- *Ulva*, *Sargassum* — the last two producers.
- The rest of §1's v2 list, and the **true goby** §24 still owes §5.

---

## 30. Little egret — `js/egretbody.js` + `js/egrets.js` (2026-08-13)

§1's stretch goal, listed there for one reason: "a single animal that demonstrates the whole
tidal-predator switch in one shot." It is also the first **bird**, and the first animal on this
shore that is **not always here**.

### A visitor, not a resident

Everything else in the roster is on the plot at all times — down a burrow, buried, clamped shut,
lying in a pool — and the tide only decides what it is *doing*. The egret flies in when the flat
drains and leaves when the water returns, so at high tide this species' population on the plot is
genuinely **zero** and the sky is empty. That is the point: the fiddler crab shows the tidal
switch from below (it comes up as the water leaves), the egret shows it from above, and the same
falling tide hands one guild to the other.

The first pass let the commute swallow the hunt — 22.5k frames flying against 9.1k hunting,
because the staging point was 50–80 m beyond the plot edge at 7.5 m/s. Cut to 12–34 m at a real
egret's 11 m/s.

### The tide gate, corrected

The first gate was "tide below the top of the hunting band", 2.15 m. That is true for most of a
cycle — and on a NEAP tide, whose high water is only 2.20 (tide.js), it is very nearly always
true, so the bird effectively never left. **Being present most of the time is exactly what this
species must not be.**

Two marks, not one, with **hysteresis**: in below **1.30 m and still falling**, out once the flood
reaches **1.70 m**. The gap between them is the bird committing to a tide rather than flapping in
and out at a threshold, and requiring the ebb means arrivals happen behind the retreating water
instead of at the same height on the way back up.

Presence against tide height, over twenty cycles:

| tide | birds present |
|---|---|
| 0.0–0.5 m | **90%** |
| 0.5–1.0 m | 67% |
| 1.0–1.5 m | 33% |
| 1.5–2.0 m | 20% |
| 2.0–2.5 m | 12% |
| 2.5–3.0 m | 1% |
| above 3.0 m | **0%** |

Median arrival 1.02 m, median departure 1.70 m; 32% present overall, 18% hunting. Everything
above 1.70 m is a bird on its way out, not one still working.

`ARRIVE_STAGGER` had to come down to 0–9 s with it: the window in which the tide is both below
1.30 and still falling is only about twenty seconds of a ninety-second cycle, and at 26 s some
birds never got in before the flood turned them back.

**One consequence worth knowing: on a neap tide low water is 1.00 and barely clears the arrival
mark, so the birds hardly visit — the big feeding days are the spring lows.** That is true of the
real place, and it gives the spring-low button one more thing to be for.

### The hunt is three speeds

A heron hunting is a slow wade, a dead freeze with the neck folded, and a strike too fast to
follow — and the *contrast* is the animal. Anything that moves at one speed reads as poultry. So
`STAB_SECS` is 0.12 against a freeze that runs up to 6 s, and the recovery is deliberately four
times the strike. Of on-plot time: freeze 12%, wade 11%, stab 1%, foot-stir 1%.

The neck is **three limb segments posed per frame**, not a baked curve — folded runs
back-up-forward (the S), extended is three copies of one vector (the spear), and `neckOut`
interpolates. Same technique as the crab's cheliped, and it is what lets one number drive the
cock-and-fire.

Foot-stirring is in because little egrets really do it: vibrate one foot in the sediment to flush
whatever is hiding, then watch the spot.

### It does not kill anything, and that is a decision

There is no mortality path anywhere in this sim — §24 removed the last one — and adding one for a
predator that is off the plot half the time would mean respawns, counts and empty burrows for
very little on screen. What is modelled is the half that *shows*: the strike, and the **panic**.

A fiddler crab within 4.6 m of a standing egret bolts for its hole, using the crab's own existing
flee path — the flood's path — so nothing new had to be taught to that species beyond another
reason to run. **This makes species.js's "bolts at the first sign of water or a shadow overhead"
true**; until now only water could do it. A crab that went down scared also stays down 6–16 s
rather than 0.4–6, because it has no way of knowing the heron has moved on. **42 panics over eight
tide cycles** — often enough to catch, rare enough to be worth catching.

The food web still lists fiddler and mudskipper as prey, because that is what the animal eats;
the catalog describes the shore, not the simulation's bookkeeping.

### Two bugs, both invisible in review

- **The torso was never drawn.** `drawBird` placed the neck, head, bill, eyes, legs, feet, wings,
  tail and plumes, and never once touched `R.body` — so the bird was a set of limbs orbiting a
  hole. Obvious in the first screenshot, invisible in the code.
- **The -90 again, fourth time on this build** (§20 crab claw, §21 goby, §27 sea hare). Bodies are
  built along +X and every heading here is `atan2(dx, dz)`, a +Z bearing; a yaw rotation about Y
  sends +X to `(cos a, 0, -sin a)`, so matching needs `a = yaw - PI/2`. Caught, as every previous
  time, by asking for a broadside view and getting a bird facing the camera.

**Decompose the instance matrices instead of squinting at the render.** Reading each part's world
y back out of its matrix — feet 0.03–0.06 above ground, neck stacking 0.70 → 0.99, head 1.03,
wings at the shoulder — settled the whole skeleton in one call and would have found the missing
torso immediately.

### Cost

Ten InstancedMeshes for five birds. The bird is mostly posed limbs rather than a solid, so it is
the most expensive animal here per individual and the cheapest per population.

### Still owed

- Hermit crab (SCAVENGERS is still empty), horn snail.
- *Ulva*, *Sargassum*; the rest of §1's v2 list.
- The **true goby** §24 still owes §5, and an APEX PREDATORS row when the otter lands.

## 31. Hermit crab, horn snail, sand dollar — the first three off ROSTER.md (2026-08-15)

`js/hermitbody.js` + `js/hermitcrabs.js`, `js/hornsnailbody.js` + `js/hornsnails.js`,
`js/sanddollarbody.js` + `js/sanddollars.js`.

ROSTER.md's queue, in its own order. Three species chosen to be three *different kinds of problem*
rather than three more animals: one fills the empty food-web row, one had to justify being a third
grazer, and one is barely visible.

The wiring was exactly what §11 promised — a species file, one `sim` key in species.js, one `pops`
entry and one `update` call in main.js, a follow distance and state labels in ui.js. No UI work,
no food-web work. **The catalog is now 16 species, 11 of them with bodies.**

---

### Hermit crab — the empty row, and a market

`SCAVENGERS` has been a labelled band in foodweb.js with nothing standing on it since §22. This is
what goes there, and it needed almost no new geometry: the body is crabbody.js's limb kit
wholesale — legSeg, legTip, armSeg, clawPalm, both fingers, eyestalk, eye — and the fiddler's
limbs are already the orange a hermit crab wears. **One new part: the shell.**

**The shell is the behaviour.** Everything else on this shore reacts to the tide. This one reacts
to a market. `shells` is one array built at spawn and never appended to; a shell is either held
(`holder` = crab index) or lying free on the sand (`holder` = -1), and a swap is two writes to
that field. A crab can only move up if another crab left something behind, which is the constraint
real hermit crabs live under, and vacancy chains fall out of it for nothing.

Growth is what keeps it liquid: `need` creeps up, so a shell that fitted last tide is tight this
one. `discomfort(shellSize, need)` is the whole economics — too small is six times as bad as too
big, because a shell smaller than the crab leaves its abdomen out and a shell larger is merely
heavy.

**Three corrections, all found by measuring rather than by reading:**

- **Nought fights in twenty tide cycles.** The species' most recognisable behaviour was modelled
  and never once fired. Scattered evenly over a 280 m shore the population sat at one animal per
  hundred square metres and every crab was the only crab that could see any given shell. Fixed by
  placing them in **five colonies**, which is also what they do — plus a home pull in `wander`,
  without which the colonies dissolve into an even scatter within a few cycles and take the market
  with them. 186 fights over the next twenty cycles.
- **Permanent homelessness.** Retirement released the crab's shell, and two or three animals ended
  up wandering with a discomfort of 99 and nothing inside scanning range. A juvenile left holding
  the oversized shell it grew into is the better model anyway: it trades DOWN at the first small
  shell it meets, and *that* swap is how the big shells re-enter the market.
- **`maxNeed` ran past the largest shell on the flat.** An adult that can never fit is a
  structurally under-housed animal, not an interesting one. Capped below `largest / IDEAL`.

Twenty cycles after all three: 385 inspections, 339 swaps, 186 fights, no homeless animals, mean
discomfort down from 0.71 to 0.30. Time budget — forage 53%, withdrawn 32%, seek 11%, inspect
1.6%, fight 0.8%, swap 0.8%.

**The screenshot rule earned its keep again.** The limbs were first laid out at about a third of
the size they needed, and the broadside view was unambiguous: a full-length shell with a small
orange knot of parts under its mouth. A fitted hermit crab sticks out of its shell by roughly a
shell's length, so the walking legs have to reach that far. Two related fixes came with it — all
four legs were at the same `x` (a bundle, not a gait; front and rear pairs now have their own hip
and foot positions), and the two eyes sat closer together than one eye was wide, so they merged
into a single black bar.

The shell itself read as a **banana** on the first pass: an even taper with a strong bend is a
horn. Fixed by fattening the body whorl so it owns the first third on its own, cutting the bend,
and stepping the taper in five whorls — the staircase profile from hornsnailbody.js. The aperture
end also had to round in rather than end square; a flat cap at full radius is a 20 cm black disc
sitting between the crab and its house.

### Horn snail — a third biofilm grazer has to graze differently

The nerite scrapes rock, the conch works the sand flat behind the waterline. A third scraper is
only worth the slot if it does something neither does, and this one does two things.

1. **It is a crowd.** Cohesion is modelled directly, so what you see is a grazing FRONT: a patch
   works itself out, the clump slides onto fresher mud, and behind it is a scrubbed halo far
   bigger than any one snail could make.
2. **It is the nerite inverted.** A nerite grazes while the rock is WET. A horn snail lives higher,
   on mangrove-fringe mud that stays damp on its own, so it grazes while the flat is EXPOSED —
   and climbs up-shore ahead of a spring flood rather than sitting still. Same band, same food,
   opposite clock. Its band (2.0–2.6 m CD) only floods near a spring high, so on neap days the
   climb never happens and on spring days the whole population walks up the shore at once.

Silhouette does the identification work: a long many-whorled turret against the nerite's low dome,
and neritebody.js already explains why a rock snail cannot afford a spire. The whorls are
*modelled*, not painted — the profile is a staircase of nine flats with a pinch at each suture, so
the flat shading picks the rings out for free.

**Tuning, and the mill.** Following §25/§28's rule, the rate was set against what the band regrows
— and the band still ran down anyway, for thirty cycles straight, at every rate tried:

| GRAZE_RATE | film under the animals, by cycle | control (same band, 8 m clear) |
|---|---|---|
| 0.0032 | 0.47 → 0.25 → **0.09** | 0.79 – 0.83 |
| 0.0014 | 0.50 → 0.30 → **0.10** | 0.77 – 0.83 |
| 0.0014 + break-out + faster travel | 0.54 → 0.30 → **0.30, held to cycle 54** | 0.78 – 0.82 |

**Halving the rate only delayed it, which is the tell that the rate was not the problem.**
Cohesion with no escape clause is a trap: the crowd eats the ground out from under itself, every
member then tries to leave, and every member is pulled straight back into the middle of the bare
patch by the others. Two changes fixed it and neither is a rate:

- **Break-out.** If the film under the *clump's own centroid* is worked out, steer OUTWARD from it
  instead of inward, and hold that line long enough to clear the halo.
- **A grazer has to be able to outwalk its own damage.** At 0.045 m/s a snail could not cross its
  clump's scrubbed halo inside one tide cycle. Travelling speed went to 0.078 — a nerite's pace.

Settled state: film under the animals 0.28–0.30 against a control of ~0.79, flat from cycle 20 to
cycle 54, with 50–70% of the population actually rasping. A permanent scrubbed halo that never
runs away — which is what the rule was asking for.

### Sand dollar — the animal you usually cannot see

Every other species here is a body you follow. This one ploughs a centimetre under the sand, so
what the camera gets is a low mound moving very slowly across the lagoon floor. The whole design
is one number:

    bury   1  fully under, mound up over it
           0  lying clear on the drained sand, petals showing

Nothing switches. The test is drawn every frame at every value of `bury` — it is simply below the
terrain surface for most of them — and the mound's scale is `bury` too. No second model, no swap,
no pop. The payoff is the spring low: the lagoon drains, the animal settles, the sand comes off it
and for that one low tide it is a visible animal with five petals on its back. Over twenty cycles:
ploughing 53%, feeding 36%, stranded 11%.

**Two rendering bugs, both only visible in a screenshot:**

- **The mound was bigger than the animal it was supposed to be revealing.** It scaled with `bury`
  in height but kept its footprint, on the theory that a shallow-buried animal still displaces a
  disc's width of sediment. The result was a 52 cm sand blister on top of a 40 cm animal at the
  exact moment the animal was meant to be on show. If it is out of the sand, the sand is not there
  — scale the mound in every axis.
- **The petals came out as a pinwheel**, five wedges running centre to rim. `sweep()` caps its ends
  with a single fan, so every triangle on that cap spans the full radius and there is nowhere for
  a pattern to stop. A petalodium needs concentric subdivision and `sweep()` cannot make it, so
  the test is hand-rolled out of concentric rings (the licence crabbody.js's burrow already takes)
  with each triangle tagged top / bottom / rim, and coloured in (face, radius, angle). Winding is
  not cosmetic here either: three groups, three directions to face.

`Facet.colorize` hands a triangle two axes — along the sweep and up it. That is everything a limb
or a shell needs and it is not enough for anything radial. **Worth remembering for the sea urchin,
the sponge and the carpet anemone**, all of which are radial animals still on the queue.

### Cost

Nine InstancedMeshes for the hermit crabs (the shell mesh is indexed by SHELL, not by crab, which
is why a swap costs nothing to draw), three for the horn snails, and **two for thirty sand
dollars** — by a wide margin the cheapest animal in the build.

### Still owed

- Sea cucumber, moon snail, sand star; the four filter feeders; swimming crab, octopus, anemone
  and anemonefish, horseshoe crab, otter (and its APEX PREDATORS row); *Ulva* and *Sargassum*.
- The **true goby** §24 still owes §5. Still the only mortality path this shore could have.

## 32. Sea cucumber, sand star, pen shell — the low flat fills in (2026-08-15)

`js/seacucumberbody.js` + `js/seacucumbers.js`, `js/sandstarbody.js` + `js/sandstars.js`,
`js/penshellbody.js` + `js/penshells.js`.

The next three off ROSTER.md, and all three live on the same ground: the low flat and the lagoon
below 1 m CD, which until now held the knobbly sea star, the sea hare and §31's sand dollar and
nothing else. That was the interesting constraint — three species in one band have to differ from
each other *and* from what is already standing there, or the band just gets busier.

**The catalog is now 19 species, 14 of them with bodies.** Wiring was §11's four lines again.

---

### Sea cucumber — the one that shows its working

Third deposit feeder. The body is the plainest silhouette on the shore — a sausage — so nothing
about the outline was going to carry it. Two things do, and both are borrowed ideas pointed at a
new target:

- **The tentacle crown**, a ring of branched fronds that wipe the sand and go into the mouth one
  after another. It is the only fast-moving thing on the animal.
- **The casts.** §28 made the fiddler crab's pellets the receipt for its grazing instead of set
  dressing; this is that idea run the other way. A fiddler works a ring around a fixed hole and
  the flood erases the whole field twice a day. A sea cucumber never comes back, so its coils are
  a **trail** — and the ring buffer that caps the cost also gives the trail its length, the oldest
  coil being overwritten as a new one is laid. Nothing spawns, nothing is destroyed, the mesh
  never grows, and what you see behind an animal is the last few minutes of its work.

**The time budget was the bug.** First measurement: 37% feeding against 56% travelling — a deposit
feeder that spends most of its life commuting, which is not the animal. The cause was gating the
eating on the `feed` state. A sea cucumber is a conveyor: the crown never stops, the body just
moves along under it when the sediment in reach runs out. So the grazing, the sweep and the casts
moved out ahead of the state branch, and `feed` versus `crawl` now decides only whether the body
is parked. **82% feeding, 10% crawling, 8% hunkered.**

**And the rate had to come down with it**, because continuous is a much longer duty cycle: 0.030
to 0.005, plus the crawl from 0.022 to 0.030 m/s. Settled film under the animals **0.47 → 0.46 →
0.61 across 33 cycles** against a control of 0.94 — worked patches that recover, which is the §25
rule holding.

Stranded, it contracts. `plump` runs the whole thing off one number — an extended animal is long
and slim, a hunkered one short and fat — which is the same trick `bury` plays for the sand dollar
and `sink` for the sand star. Three species in this build now, none of which needs a second model.

### Sand star — a second sea star has to be a different speed

§23's knobbly is the postcard: rare, enormous, slower than anything here, and the whole point of
it is that it lies out on a spring low for people to walk to. Build a second star that also creeps
and you have built a recolour. So this one is the opposite animal on the axis that shows —
**0.135 m/s against the knobbly's 0.035**, common instead of rare, and buried instead of
displayed.

It quarters: long, nearly straight runs, then stops and digs with the disc humped and the arm tips
curled into the sediment. Then it drops out of sight for a while. **Buried 42%, quartering 41%,
probing 12%, sinking 5%** — mostly not there, which is the species.

The two bodies were built to be readable side by side, and every choice is the opposite of
seastarbody.js's: flat straight-sided arms rather than thick domed ones, a comb of marginal spines
down both arm EDGES rather than tubercles along the arm's spine, and sand-grey rather than
orange-red. The spine comb is the identity — it is what makes the arm read as a blade, and it is
what you find a buried one by.

**It is a predator that never catches anything**, which is §30's decision applied again rather
than dodged. It hunts buried molluscs and this shore has no infauna, so what is modelled is the
search — quarter, stop, dig, move on. The food web lists what the animal eats because the catalog
describes the shore, not the bookkeeping.

One deliberate non-shared behaviour: **it does not lie out when stranded.** The knobbly does, and
that is the sight the spring low exists for; if this one did the same the flat would be paved with
stars and the rare one would stop being rare.

### Pen shell — the barnacle's file, one state wider

`FILTER FEEDERS` has held the barnacle alone since §22, which made the guild look like "the thing
that lives on rocks". A pen shell stands up out of **open sand** where there is nothing to cling
to — it anchors itself on threads it spins, point-down, with the gaping third held into the water.
So it needed neither rockfield.js nor a surface normal: placement is the plain band-and-spacing
scatter, and the body axis is simply up.

§23's barnacle has exactly one decision in the whole file: is there water over me. This is that
file with a second input, and the second input is the interesting one — **a pen shell claps shut
when something passes over it**, which is the only move a sessile animal has that is not about the
tide.

**What sets it off is the sand star**, which ships in the same section and works the same flat, so
the pairing costs nothing and is real. Fourth inter-population wiring on this shore after the sea
star and the sea hare's ink (§27), the egret and the fiddler (§30) and hermit crabs fighting each
other (§31) — optional argument, as all of them are. **215 claps over 36 tide cycles**; 79% open,
20% shut with the tide, 0.5% clapped.

**The valves were built wrong and the broadside caught it.** `put()` derives a part's two side
axes from its length axis, which is exactly right for a limb — a leg does not care how it is
rolled. A bivalve valve is a flat sheet and the whole animal is the ANGLE BETWEEN TWO OF THEM, so
rolling it is the only thing that matters and `put` has no way to say it. The first pass opened
the shell by tilting each valve's length axis instead, and the screenshot came back with two
parallel plates of different apparent widths leaning the same way. Fixed with `putBasis`, which
takes the three axes explicitly; both valves now keep the same length axis and roll apart about
it, like a book about its spine.

`SHUT_ROLL` keeps them a few degrees apart even clamped — two coincident sheets fight over the
same pixels.

### What the measurement pass found in §31

Running the film probe over the whole low flat turned up a defect in the **sand dollar**, built
last section: film under the animals **0.155 against a control of 0.94, and flat** — the signature
of a population parked in the hole it has eaten rather than one moving through the sediment. The
state budget looked fine (53% ploughing) and hid it completely.

Two causes, both mine: it stopped to feed whenever its travel timer expired *whatever it was
standing on*, and its rate was five times what its band regrows. The timer now only re-rolls — the
sand decides — it leaves a spot once it is worked below `SPENT`, and `GRAZE_RATE` went 0.022 →
0.010. Recovered to **0.28 → 0.30 → 0.37 and rising** over 33 cycles.

**A stable number is not automatically a correct one.** §31's horn snail was caught by a *falling*
film reading; this one was flat from the first measurement and still wrong. What gave it away was
comparing two species in the same band against the same control.

### Cost

Five InstancedMeshes for the sea cucumbers (body, papillae, tentacles, and the cast field), three
for the sand stars, three for the pen shells — and the pen shells' sand collars are written once
at spawn and never touched again, like the barnacle's shells.

### Still owed

- Moon snail — **now unblocked**: the pen shell is the first bivalve on the shore, so a predator
  that drills bivalves finally has something to point at.
- Oyster, green mussel, sponge; swimming crab, octopus, carpet anemone + anemonefish, horseshoe
  crab, otter (and its APEX PREDATORS row); *Ulva*, *Sargassum*.
- The **true goby** §24 still owes §5.

## 33. The cheliped, rebuilt — `js/crabbody.js` (2026-08-15)

A new reference landed: `reference/crabclaw.jpg`, a photographed crusher claw. The old cheliped
was built in §20 from the voxel fiddler renders and had never been looked at again, and against a
photograph it was plainly wrong. **Both crab species share crabbody.js's limb kit (§31), so one
file fixes the fiddler and the hermit crab together.**

### What the photograph has that the old part did not

| | old | reference |
|---|---|---|
| palm | a slab of even depth | a **teardrop** — deepest a third from the wrist, tapering to the finger hinge |
| fingers | straight rods, a token `0.11 t²` bend | **hooked hard**, crossing near the tips |
| gape | smooth | **cusps** along both inner edges, dying out toward the points |
| palm surface | flat mottle | **stippled** with dark papillae |
| hinge | nothing | a **hot orange flush** where the palm meets the fingers — the most recognisable mark on the whole claw |

All five are in now. The palm profile peaks at 16–34% and falls away, with a slight `curveY` arc
so the fingers set off at an angle to the wrist; the fingers hook on `0.38 · t^1.3` against the
old `0.11 · t²`, and got thicker (`rad` 0.125 → 0.145, `aspectZ` 0.60 → 0.72) because the first
pass at the new shape came back as two pale slivers.

### The teeth are a profile wobble, not instanced cusps

The established pattern for bumps on this shore is to instance them — the knobbly sea star's
tubercles, the sand star's spine comb. **Not here.** Three cusps on a part carried twice per
cheliped, twice per crab, across 84 fiddlers and 30 hermit crabs is over a thousand extra
instances for a detail two pixels wide at the range you ever see one. So the cusps are a sine
riding on the taper — four extra rings on one shared geometry, zero instances. Same argument
barnacle ribs are painted under (§23).

### Colour is per species, anatomy is shared

The photograph's fingers are horn-black. That is right for a **hermit crab** and wrong for a
**fiddler**: the fiddler's major claw is a display organ, and `reference/fiddler crab.png` — the
render the species was built from — shows it orange with pale tips. Painting it black would have
made the animal less accurate, not more.

So `finger()` takes a `dark` flag and the cache carries `clawUpperDark` / `clawLowerDark`
alongside the pale pair. Two extra cached geometries, no per-instance cost: hermitcrabs.js points
its InstancedMeshes at the dark ones and everything else is shared. It also fixes something §31
left: the hermit crab borrowed the fiddler's limbs *exactly*, which was cheap and correct but made
the two species read as the same animal in different hats. A black claw against a chalky borrowed
shell is now the hermit's own mark — and it lands on the pose that matters, the withdrawn animal
plugging its own aperture with it.

### Verifying a part rather than an animal

Framing a live 25 cm crab at claw range on a 300 m shore is most of an afternoon. Faster, and the
technique worth keeping: **assemble the cached geometry into a throwaway `THREE.Group`, park it in
clear air above the flat and photograph that.** The parts are the real ones out of
`CrabBody.parts()`, posed the way `crabs.js` poses them, so what you are looking at is exactly
what ships — but at whatever size and against whatever background you like. It found the
too-thin-fingers problem in one shot after three wasted attempts at chasing a crab around the mud.

`world.setDayPhase(0.5)` with it: the first isolated shots came back at sunset and every colour
judgement off them would have been wrong.

### §33 follow-up — the fingers swapped over, and shrank

Reviewed against the photograph again and two things were still wrong.

**They were too big.** `MAJOR.finger` 0.52 → 0.40 against a palm of 0.82, so the fingers are now
about half the palm's length rather than nearly two thirds. The hermit crab's `ARM.finger` came
down the same way, 0.27 → 0.21.

**They were the wrong way up.** The long swept finger was riding on TOP with the short one
beneath it; it is the other way round. The pollex now takes the smaller rotation (+0.30 · gape)
and sits above, and the dactyl takes the larger one (−0.45 · gape) and sweeps along underneath at
full length.

**The parts were renamed with them.** `clawUpper` / `clawLower` were named for where they sat, so
the moment they swapped, the names were actively lying — they are `dactyl` and `pollex` now, in
crabbody.js's cache and in both behaviour files' mesh tables. Anatomy names survive a repose;
position names do not. The `dir` hook argument flipped to match, and the gape-side test inside
`finger()` reads off `dir`, so the cusps stayed on the biting edge without touching it.

### §33 follow-up 2 — a shut claw, and an invisible hermit

**The hook was a fraction of the wrong thing.** facet.js's header warns that a curve is a fraction
of a part's LENGTH and that a fit-to-box pass would rescale it by THICKNESS. `curveY` has the same
trap from the other side: it is added straight to the ring's y, and `put()` scales y by `thick`
while it scales x by `len`. So a hook written as a bare `0.38` was 38% of the finger's WIDTH, and
shortening the fingers in the last pass (0.52 → 0.40) silently made the hook half again as strong
relative to the part. The hermit crab, drawing the same geometry at `ARM.finger` 0.21, got it
nearly twice as strong again.

`finger()` now takes `slim` — the length:thickness ratio the species draws it at — and `HOOK` is
what it claims to be: **0.13 of the drawn length**, for both crabs. The two ratios live in
crabbody.js next to the palette with a note that they must track `MAJOR.finger` and `ARM.finger`.

**A claw at rest was springing open.** With `gape` at zero both fingers sat exactly on the palm's
axis, so the only thing separating them was their baked hooks — which curve in OPPOSITE
directions. The result was a V. `REST_SPLIT` (0.12 rad) now holds them a few degrees apart at the
hinge and the hooks close that gap over their length, so a shut claw is two fingers lying along
the same line with the tips together. Open still opens: `gape` adds on top of the split.

**A withdrawn hermit crab draws nothing at all.** §31 kept the big claw out, jammed across the
aperture, because that is what the animal really does. It read as a crab that had failed to get
all the way in. The claw plugs the opening from INSIDE, so there is nothing to see from any angle
the shell can be seen from — `drawCrab` now calls `hideBody` and returns. **A shut hermit crab is
a shell lying on the sand, and being indistinguishable from one is the whole point of the
behaviour.** Verified by decomposing the instance matrices: every limb slot reads scale 0.

### §33 follow-up 3 — the claw becomes a hinge

The two fingers were still being drawn as a symmetrical pair pivoting about one point, which is
why they read as tongs. A cheliped is not symmetrical at all:

- The **pollex** is not a jointed finger. It is the far end of the palm drawn out into a point. It
  hangs LOW on the palm's distal face and it never moves.
- The **dactyl** is the only moving part of the entire claw. It is hinged HIGH on the palm and
  swings down onto the pollex.

So `gape` now reaches exactly one of them, and the two roots are offset along `fup` — world UP
with the palm's own component removed, so they separate square to the palm however it happens to
be posed. `hinge` is perpendicular to both and is what the dactyl turns about.

**The numbers are derived, not tuned, and that is what makes them species-independent.** After the
`slim` fix a finger's hook reach is exactly `HOOK x lf` — a clean fraction of its drawn length —
so expressing the root offset as a fraction of `lf` too puts every term in the same units:

    dactyl tip, unrotated   (ROOT - HOOK_DACTYL) x lf       = +0.040 lf
    pollex tip              (-ROOT + HOOK_POLLEX x 0.84) lf = -0.148 lf
    gap                                                       0.188 lf

and the dactyl is `lf` long, so closing it needs `sin t = 0.188`, `t = 0.19 rad`. That is `SHUT`.
The fiddler and the hermit crab draw fingers at wildly different sizes and both close correctly
off the same constant. They live in `CrabBody.CLAW` next to the geometry they are derived from,
because changing a hook changes the shut angle — keeping them in the behaviour file was how the
two species would eventually drift apart.

The two hooks are also no longer equal: `HOOK_DACTYL` 0.15 against `HOOK_POLLEX` 0.05. The working
finger curves; the fixed one is nearly straight, because it is part of the palm.

**Measured on a live fiddler.** Holding the arm pose and varying only the gape, the pollex's
instance matrix is byte-identical — the fixed finger is genuinely rigid. The tip gap then opens
monotonically 0.046 → 0.133 m across the wave, on a finger 0.192 m long. The residual at shut is
the dactyl overshooting the shorter pollex lengthwise, which is what a real claw does.

**One measurement trap worth recording.** The first check used the ANGLE between the two fingers
and produced nonsense — 9.5° at rest, dipping to 2.4°, then rising to 19°. The angle is unsigned
and the fingers are offset, so parallel axes do not mean a closed claw: the dactyl sweeps through
parallel on its way open. **Measure the tip gap, not the angle.** The second trap was cruder: the
first attempt set `c.scoop` directly, and `update()` recomputes it from the crab's own state
before drawing, so the lever did nothing and the claw looked frozen.

## 34. Everything with a body is clickable, and it glows under the cursor — `js/ui.js` (2026-08-15)

### Five species were silently unclickable

`pick()` skipped anything failing `if (!o.vis || ...)`. `vis` is the "currently drawn" flag, and
only the species that actually hide individuals ever had one — the hermit crab, horn snail, sand
dollar, sea cucumber and pen shell simply never declared the field, so `!o.vis` was true for every
one of them and **five of the fourteen bodied species could not be clicked at all.** They appeared
in the panel, they were in the food web, and the shore just ignored the pointer.

The test is now `o.vis === false`: a species that HAS the flag and is not drawing this individual
is skipped, and a species without one always draws. All fourteen follow on click, verified by
dispatching real mouse events at each species' projected pixel and reading the follow bar back.

Clicking a body now also **follows** it, rather than only opening the fact card. The card's own
Follow button stays — it is the way to follow from the panel.

### The hover glow, which this file said was impossible

ui.js has claimed since §22 that hover-glow could not be ported because an instanced body shares
one material across its whole population, so there is no per-animal material to tint. Both halves
are true and the conclusion was wrong: **the tint does not have to come from the material.**

Every population already writes a per-individual `instanceColor` — the tone variation that stops
eighty crabs looking like eighty copies. three.js multiplies it into the vertex colour in the
shader and **nothing clamps it**, so writing an animal's entry at 1.55x drives it brighter than
the material can otherwise go. A glow is three floats in a buffer nobody else touches after spawn,
and it costs nothing per frame.

**Finding an individual's slots is generic.** For every species, mesh slot i belongs to individual
i, or to a run of `per = count / N` of them — which is how the multi-part meshes (eight legs,
twenty knobs, forty spines) are laid out. So no species has to declare anything. The one exception
is the hermit crab, whose shell mesh is indexed by SHELL rather than by crab (§31 — the whole
reason a swap is free to draw), and it publishes a `glowSlots` saying so. Without it a hovered
hermit lights up its legs and not its house, which is worse than nothing when it is withdrawn and
the legs are hidden.

Slot counts, checked per species: fiddler 39, sand star 46, hermit 27 (26 limb + 1 shell), sea
star 26, sea cucumber 15 (the cast field has no `instanceColor`, so the trail correctly stays
dark), pen shell 4, sand dollar 2. Every one restores byte-exact on un-hover.

**The pick runs once a frame, not on the mousemove.** ui.js stores the pointer position and
`update()` does the work at 20 Hz, so the glow keeps up with an animal that walks under a
stationary cursor and with the camera when it is the camera that moved.

### The bug the glow exposed

A flat 46-pixel pick radius is right for an animal a few metres away and absurd for one two
hundred metres down the shore — two pixels of crab pulling a 46-pixel catchment around itself.
It never showed while picking was click-only, because nobody clicks at empty horizon. The hover
cursor made it obvious in one probe: the pointer turned into a hand over blank sky.

The radius now scales with distance, full out to 14 m and floored at 9 px. **Making something
visible is a way of testing it** — this had been wrong since §22 and only a cursor change found it.

---

> **Gap note.** §35 (moon snail, oyster, mussel, sponge), §36 (swimming crab) and §37 (*Ulva*,
> *Sargassum*) shipped but were never written up here; ROSTER.md carries their one-line summaries.
> This entry is §38 to stay consistent with the numbering the roster and the source comments use.

## 38. Mangrove horseshoe crab — `js/horseshoebody.js` + `js/horseshoecrabs.js` (2026-08-18)

Roster item 3, and the shore's first **tidal commuter**: every other animal here holds a band, and
this one crosses its own with the water. It is also the first chelicerate on the plot — not a
crustacean at all — which the catalogue entry leads with because it is the fact people are most
surprised by.

Two files, six InstancedMeshes, no new engine anywhere. It reuses the sand dollar's `bury` number
(§31), the sea cucumber's ring-buffer trail (§32) and the moon snail's world-space `putWorld`
receipt (§35), and adds nothing to `world.js`.

### The outline is the species, and the first one was an acorn

Nobody identifies this animal by colour or gait. They identify it by a silhouette from directly
above, so `horseshoebody.js` hand-rolls both carapace plates out of concentric rings the way
`sanddollarbody.js:disc()` does — `sweep()` cannot help, because a horseshoe's radius varies
*around* the axis, not along it, and sweep has nowhere to put an `outline(theta)`.

The first outline treated the shape as a circle with the back shortened: scale the radius down
past ~110°. Photographed top-down it came out as an **acorn** — a smooth convex curve, widest
amidships, tapering to a rounded rear, with every identifying feature missing. A horseshoe crab is
not that shape at all. It is widest at the **rear corners**, cuts in hard between them, and draws
each corner out into a genal spine. No single scale factor on a circle can make a radius grow and
then collapse, so the shipped version is three terms — the arch, a lobe that swells at the corner,
and a cut that only bites past it.

**And then the spines still did not show.** They are ~0.10 rad wide, and at `SEG` 44 the angular
step is 0.143 rad, so each spine landed on one vertex and read as a dent. 64 rounded them into
lobes. 96 gave 0.065 rad and they came to a point. Geometry is built once and instanced, so the
extra rings are paid for at load and never again — **count the angular step against the smallest
feature before assuming the shape function is wrong.**

The broadside shot caught two more in one frame, both the usual kind: a dome at 0.235 high with a
`(1-u²)^0.75` falloff that photographed as a limpet (fixed by moving the exponent inside, so the
vault stays level to ~70% of the radius and then turns down), and legs at 0.20 units long hanging
clear below the rim like a spider's (fixed at 0.125 — a real one's legs do not show past the rim
from the side).

### Where it lives was measured, not chosen — and the thresholds set it

This is the part worth reading before building another mobile species.

The roster asked for an animal that ploughs the **mangrove fringe** on the flood. Three tuning
passes tried to put it there and all three drifted:

| spawned at | what happened |
|---|---|
| 1.55–2.95 m CD (in the fringe) | 12 of 12 stranded for a minute at a time, mean-z swing under 1 m |
| 1.30–2.30 m CD | walked 20 m seaward over 6 cycles and stayed |
| 1.75–2.45 m CD | walked 10 m seaward over 10 cycles, still going |

None of that was a bad `ZONE`. The band a mobile species settles in is set by **which of its two
steering decisions runs longer**. For an animal at height `h` with the tide topping out at `high`:

```
landward window   tide runs h+ADVANCE .. high   =  high - h - ADVANCE
seaward window    tide runs h+RETREAT .. h      =  RETREAT
```

The seaward window is a *fixed span of tide* — it does not care where the animal is — while the
landward one shrinks the higher up the shore it gets. So it walks up until the two match and then
stays, at `h = high - (RETREAT + ADVANCE)`. Mean high water here is ~2.65 m CD, so 0.60 and 0.15
predict 1.90; thirteen measured cycles sit at **1.85** and hold, with net drift 2.6 m against 9.7
before. **If a population drifts, do not move it back — work out which of its two decisions is
running longer.**

Raising `RETREAT` strands fewer animals *and* moves the whole population down the shore. There is
no setting that does both; that trade is the knob.

The honest consequence: **the mangrove fringe pairing did not survive the tide model.** The fringe
sits at 2.88–3.05 m CD and only floods on a spring high, and an animal living up there is dry for
so much of the cycle that its commute — the entire point of the species — never fires. It ships as
an upper-mudflat animal that lives *below* the mangroves rather than in them, and the catalogue
text says so.

### It knows which way the tide is going, and it has to

The first steering model used a depth error alone, with nothing in the code aware of the tide's
direction. It is the nicer design and it produced drift rather than a commute: a depth band wide
enough to be usable covers forty metres of a flat this gently sloped, and the waterline crosses it
at metres per second, so nothing that walks can track the edge.

It reads `world.tideDir` instead — which is the more truthful animal anyway, since horseshoe crabs
are a textbook case of an **endogenous tidal clock** and a real one is not inferring the tide from
how wet it is.

A second measurement caught the follow-on: gating feeding on "no commute bearing at all" left the
budget at 4% feeding against 34% walking — a deposit feeder that never fed. It now stops on rich
mud *during* a flood run, because working the mud is what it goes up there for, and declines only
when it genuinely cannot afford to (falling tide, water already low). Final budget over 13 cycles:
**28% ploughing, 15% working, 57% stranded**, which is the right shape for an animal whose
signature state at low water is buried and waiting.

### The furrow is the receipt, and it is a line

§28 made the fiddler's pellets its receipt and §32 made the cucumber's casts its own; this animal
ploughs *through* the top of the mud rather than walking on it, so its receipt is a furrow. It is
laid **per metre travelled, not per second** — a record of distance, so an animal stopped feeding
does not pile up trench in one spot.

The first pass laid a segment every 0.24 m at 0.78 body widths across, standing a fifth of a body
unit proud, and photographed as a scatter of flat angular plates lying *on* the flat — cardboard,
not a trench. Three changes fixed it together: segments **shorter than they are long** so
consecutive ones overlap into one continuous line, **low** enough that only the levee crest stands
proud, and **sunk** so the mud closes over the rest. The palette went darker at the same time, so
turned ground reads as wetter than the flat it cuts rather than paler.

### Wiring

Exactly the five touch points §31 established, and no more: the two species files, one `sim` key in
`species.js`, one `pops` entry plus a spawn and an `update` call in `main.js`, and a follow distance
and three state labels in `ui.js`. No `vis` field — it never hides an individual, and §34's rule is
to add one only if it does.

## 39. Carpet anemone + anemonefish — `js/anemonebody.js`, `js/anemones.js`, `js/anemonefishbody.js`, `js/anemonefish.js` (2026-08-18)

Roster item 2, and the first section on this build that ships a **pair**. Neither species is worth
much alone: an anemone with nobody in it is a sessile predator of the sort this shore can already
imply, and an anemonefish without a host is a small orange fish with no reason to be here. What they
are together is the seventh inter-population wiring and the only mutualism on the plot.

### The anemone is the sponge's answer with a different third axis

`spongebody.js` (§35) hand-rolled concentric rings because `Facet.colorize` reads two axes and a
sponge needs a third — the **angle** about its own centre, for growth bands. This one needs a third
too and it is a **different** third: **height above the disc surface**, because a carpet anemone
reads entirely as the difference between the tentacle tips and the skin between them.

That distinction cost a render to get right. The first pass raised **every other vertex** in a
checker and scored each triangle by how many of its corners were raised — which is a number that
looks correct and paints nothing, because at that cell size every triangle has exactly two raised
corners out of three. Every triangle scored the same and the disc came back in one flat green. The
fix is the cell, not the score: nubs are raised in **2x2 blocks** so a triangle can sit wholly
inside a raised cell or wholly inside a sunk one. That also puts a nub at ~4 cm on a 45 cm animal,
coarser than a real tentacle and the right size for the distance anyone will ever see one from —
the same call the moon snail's sand collar made (§35).

**A one-vertex checker is not a pattern, it is a constant.** If a per-triangle score comes back
uniform, look at the cell size before looking at the scoring.

### The contraction is the colour change, and it costs nothing

Two parts: a green-brown **disc** and an orange-red **column**. Both are real — a Haddon's carpet
anemone is drab on top and orange underneath — and because the column is exactly what a contracted
one shows, the animal changes colour on the ebb with no tinting code at all. The parts simply trade
places. The sponge had to do that job with `instanceColor` because a sponge has only one part to
show; this one gets it out of the geometry.

One knob drives all of it. `open` is 0 shut .. 1 spread, and column height, column girth, disc
diameter, disc height and disc elevation are all read off it — the pen shell's pattern (§32) with
two more reasons to close. Four states, four target values: `spread`, `fold` (something walked onto
it), `embrace` (an anemonefish is sheltering in it), `shrunk` (the water has gone).

### Two proportion bugs, neither visible in code

**The column was wider than the disc.** `COL_R` spread was 0.60 against a `DISC_R` spread of 1.00 —
radius against diameter, in the same table — so the collar meant to hide under the carpet was half
again as wide as it. The render came back as an orange slab wearing a small green cap, which is the
*shut* animal's silhouette with the *spread* animal's numbers.

**Then the column poked through its own disc.** With the widths fixed, the spread column still
finished 0.02 above ground while the disc's underside sat at 0.077, and the column's jittered top
cap interpenetrated the oral cone. From directly above that reads as a deliberate orange starburst
radiating from the mouth. The fix is that a spread anemone's trunk finishes **below ground** —
which is what the file header claimed all along.

Both are the same class of mistake. **Always request the broadside**, and for a radial animal
request the three-quarter-from-above as well.

### The fish: `sweep`'s `t=0` is the TAIL

The body is built along +X and every species here puts its head at +X — the eye and the tail fin in
the behaviour file are what decide that. But `sweep` runs `x` from 0 to `len`, so **t=0 is the −X
end**, the tail. The first pass wrote the three bar positions as nose-distances, fed them straight
to `colorize`, and produced a fish with its head bar on its tail wrist.

Eighteen species have not hit this because a blunt cylinder hides it completely — the mudskipper's
profile carries the same reversal and nothing shows. A barred fish cannot hide it at all. **If a
part is symmetric enough that either orientation looks plausible, the orientation is not verified,
it is merely unrefuted.**

### Bar resolution is §38's lesson in colour

`colorize` is per-**triangle**, so the finest band a swept body can draw is one ring step wide. At
the mudskipper's 9 rings that is 0.11 of the body, the 0.022 black bar-edging fell between
neighbouring triangles, and the head bar came back as a **checkerboard**. 72 rings puts the step at
0.014, comfortably under the edging. Geometry is built once and instanced, so the extra rings cost
nothing per frame.

§38 found the same rule in outline (the horseshoe crab's genal spine at SEG 44/64/96). It is the
same rule: **count the steps against the feature before assuming the shape function is wrong.**

Two fin lessons fell out of the same renders. The body is 0.27 deep either side of the midline,
three times the mudskipper's, so the mudskipper's fin offsets buried the dorsal and the anal inside
it. And a fin root **is not a straight line** — this back drops from the shoulder to the tail wrist
by more than the dorsal's own height, so on a level root the fin's tail end floated clear of the
fish and read as a lump of orange hovering over it. `blade`'s `sweepY` bends the whole blade down to
follow the body, which is what it is for, and it is one line instead of two parts.

### The egret could not frighten the fish, and the constants said so before the code did

The obvious threat was the little egret (§30): it already walks this flat and already sends fiddler
crabs down their burrows. A 600-second run fired the dive **exactly zero times**, and the reason is
in the two species' own numbers rather than anywhere in the code — an egret wades in a hand's depth
of water, this fish withdraws to the channel below 0.30 m of it, and those two windows do not
overlap on any tide. **A predator that is only present when the prey is gone is not a wiring, it is
a decoration.**

The swimming crab (§36) has the opposite schedule — active submerged, buried on the ebb — so it is
on the flat exactly when the fish is, and it is a real predator of small fish. It is also already
one of the two animals that makes the anemone clench, so **one crab paddling past produces both
halves of the partnership in the same frame**: the host closing on the intruder and the guest diving
into the closing host. That was not designed in; it fell out of picking a threat that could actually
be there.

### Counting the events, per §31's rule

Over 600 sim-seconds across 18 anemones and 26 fish:

| | |
|---|---|
| anemone | spread 71% · shrunk 17% · **embrace 11%** · fold 0.6% |
| fish | hover 41% · away 29% · sortie 10% · arrive 10% · **nestle 9%** · dive 0.9% |
| events | **12 folds**, **90 dives** |

The first run of this table returned **2 folds** — the wiring was correct and effectively not
modelled, which is the trap §31's hermit-crab shell fight fell into. `FOLD_R` was 0.85 of the disc
radius, ~0.20 m of reach on a 0.46 m animal. A real anemone's catch is the disc **plus** the reach
of the tentacles round its edge, so 2.4 (~0.55 m) is both more honest and roughly the "twice its own
size" the pen shell's `CLAP_R` already uses.

### The one ordering constraint in `main.js`

The fish sets `host.guests` and the anemone reads it, so `anemones.update` runs **before**
`anemonefish.update` and clears the count for the frame it is about to be told about. Reverse them
and every embrace is a frame late. It is the only pair of update calls in the file whose order
matters.

### Wiring

The five touch points again, doubled for the pair: four species files, two `sim` keys in
`species.js`, two `pops` entries plus two spawns and two `update` calls in `main.js`, and two follow
distances with their state labels in `ui.js`. The fish carries a `vis` field and sets it every frame
(§34) because it genuinely leaves the plot; the anemone does not, because it never does.

And one argument on this shore is finally **not** optional: `AnemoneFish.spawn` with no anemones
returns an empty population, on purpose. Every wiring since §27 has been written so that neither
species needs the other. A homeless anemonefish is not a thing that happens.

---

## 41. Day octopus — `js/octopusbody.js` + `js/octopuses.js` (2026-08-19)

Roster item 1, and the file that was flagged from the start as **the hardest body in the roster**.
It earned that, but not where it was expected to: the eight arms went in cleanly and the two real
bugs were both in the *frame*, not the limbs, and both were invisible in code review.

### The animal that has an address

Every predator on this shore since §30 catches nothing on purpose, and the octopus does not break
that. What it adds is the fourth **receipt** — after the fiddler's pellets (§28), the moon snail's
sand collar (§35) and the horseshoe crab's furrow (§38) — and the first one that is a *record*
rather than a trace. A den with fourteen shells outside it has been lived in longer than a den with
three.

That is also the structural gap it closes. Nothing here had a home it chose: the fiddler defends a
territory round a burrow it re-digs anywhere, the swimming crab digs in wherever the ebb catches it
(§36), and everything sessile is stuck where it settled. The octopus keeps one den, and the whole
state machine is a loop out of it and back — `den → emerge → hunt → pounce → jet → home → den`.

### 192 pounces in 600 seconds, and why no threshold would have fixed it

The first run counted the events per §31's rule and got **192 pounces across six animals** — better
than five a trip. The instinct is to reach for `POUNCE_R` or `SCAN_R`. Neither is the problem.

A real octopus does not eat where it caught something; it carries the crab home and works on it
inside, **which is the entire reason the shells pile up at one address instead of scattering across
the flat**. Making a successful pounce end the trip — set `carry`, jet home, drop the shell on
arrival — took the count to 40 meals from 49 trips, and produced the midden as a side effect rather
than as a separate feature. The receipt and the rate came out of one change.

The misses matter too. `POUNCE_HIT` is 0.55, and without it the midden is a clock rather than a
record: every den would carry the same pile after the same number of tides.

| | 600 sim-seconds, 6 octopuses |
|---|---|
| budget | den 54% · hunt 32% · **pounce 7%** · jet 3.4% · emerge 1.8% · home 1.5% |
| events | **49 trips**, **73 pounces**, **40 meals**, 71 shells on the middens |

### Both bugs were in the body frame, and the matrices found both

Neither of these is visible in a code review and neither needs a renderer to catch — §30's
"decompose the instance matrices" answered both in one call. There was no browser available in this
session at all, and it did not turn out to matter.

**The floor clamp is a plane, not a number.** Arm tips were clamped at `-lift` in body-local Y, on
the reasoning that the pitch is small. It is not small. The body basis is `Ry(yaw)·Rz(-pitch)`, so
world up in body-local is `(-sin p, cos p, 0)`, and a point two body units forward on a crown
pitched 0.16 rad down sits 0.32 units below the origin — more than the whole of `lift`. The tips
were **15 cm under the sand** while the clamp reported every one clear. The correct test solves the
plane: clear when `lift - x·sin p + y·cos p >= FLOOR_CLEAR`.

Fixing that left 7 cm, because the clamp was applied to the running position *after* the segment was
placed — so the last segment of every arm was still drawn along its unclamped direction. **Clamp the
endpoint, then derive the direction from it.** That also gives the crawl posture for free: an arm
aimed below the seabed gets laid flat *along* it, which is what a crawling octopus's arms do, and it
needs no solver.

**A radial crown stacks its own arms in plan view.** Arm `a` at roll φ and its mirror at π−φ have
identical sines and opposite cosines, so seen from above the two are one on top of the other — eight
arms occupying four bearings, with two of the eight plan-view gaps at 0°. A sweep of `DOWN_K` from
0.16 to 0.06 moved the smallest gap from 2° to 1°.

**If a tuning sweep barely moves the number, the number is not controlled by that knob.** The
stacking is inherent to the construction, not to any parameter of it — and the construction is
wrong for this posture anyway. A crawling octopus does not spread its arms *around its body*; it
fans them *across the seabed*, which is a bearing and an elevation rather than a roll and a pitch.
So both are built and blended by a seventh number, `fan`: 0 for the jet, where the arms really are
gathered evenly around the axis, 0.85 for the crawl.

|  | lowest tip | tips on the sand | plan-view gaps |
|---|---|---|---|
| den | 0.016 m | 4/8 | 6–233° |
| hunt | 0.016 m | 7/8 | 20–134° |
| pounce | 0.016 m | 6/8 | 20–124° |
| jet | 0.096 m | 0/8 | 44–46° around the body axis, span 0.53 m |

### The larder was checked vertically, and it was half wrong

ROSTER.md said this animal's food was complete: swimming crab (§36), pen shell (§32), oyster and
mussel (§35). §39's rule is to check that a predator and its prey are ever on the shore at the same
time, and the vertical version of that question answers itself before any scanning code:

```
swimming crab   -0.15 .. 0.85 m CD, z 26-64   overlaps
pen shell        0.10 .. 0.90 m CD, z 26-62   overlaps
oyster / mussel  1.30 .. 2.10 m CD            — high boulders, dry at every low tide
```

The oyster and the mussel are four hundred vertical millimetres above anything that cannot leave the
water. Two rows came off `eats` rather than two scans going in that would have fired zero times.

### Colour is the behaviour, and §36's lesson was used forward

The swimming crab could not be tinted blue because its baked palette was fiddler-orange with almost
no blue channel for `instanceColor` to multiply into (§36). This animal has to run from sand-pale
through dark red-brown to blanched white within a second, so `octopusbody.js` bakes it in a
deliberately **neutral mid-tone** — a canvas, not a finished skin. A "correct" sand-brown octopus
baked in would have been the same trap one species later.

One consequence found on the way: a species writing `instanceColor` per frame collides with ui.js's
hover glow (§34), which saves a colour, multiplies it by 1.55, and writes the saved value back on
unhover — over the top of anything written since. A settled animal would then wear the stale colour
indefinitely. Forcing a refresh twice a second costs a few hundred `setColorAt` calls across the
whole population and needs no coupling to ui.js. `sponges.js` has the same shape and the same hole.

### No ink, and that is a decision

Ink is the one thing everybody knows an octopus for, and there is nothing here to ink at. Nothing on
this shore eats one — the swimming crab is prey, the egret works a drained flat this animal is never
on, and the sea hare already owns the ink gag (§27). Writing the startle now would be writing a
behaviour that never fires, which is precisely §31's hermit-crab shell-fight trap. It goes in with
the **smooth-coated otter**, which is the last item on the roster and the reason `APEX PREDATORS`
still does not exist.

### Wiring

The usual five touch points: two species files, one `sim` key in `species.js`, one `pops` entry plus
a spawn and an `update` call in `main.js`, and a follow distance with state labels in `ui.js`. No
`vis` field (§34) — the den is in the channel, which never exposes, so this animal is never off the
plot and never hidden.

Eight InstancedMeshes: mantle, head, eye, armSeg (8 × 5 = 40 slots an animal), web, siphon, and two
that are furniture rather than animal — `lair` and `shell`. Those last two are deliberately excluded
from the per-frame skin tint, or a white pounce would blanch a shell pile twenty metres away.

Two other notes worth keeping. The **den mouth is a sunk plug, not a bowl**: `sweep`'s sides face
outward, so looking down into a bowl shows its back faces, the FrontSide material culls them, and the
den renders as a tear with the seabed visible through it — facet.js's warning, one shape further on.
And the **jet is the one time this animal travels backwards**: body +X is the arm crown, so during
`jet` the target yaw is `heading + π`, and easing through that half-turn reads as the animal spinning
round to go, which is what it does.

### The range it actually works, measured rather than claimed

`RANGE` is 22 m, but a crawl at 0.38 m/s against a 90-second tide cycle does not spend it: over 600
seconds the population never got further up-shore than z ≈ 49 or onto ground above 0.25 m CD, which
is the sandbar crest. The lagoon proper stays out of reach. That is the honest number and it is left
as it is — §38's rule is that where a mobile species settles is set by its steering thresholds, and
here the binding one is the clock, not the distance.

## 42. Smooth-coated otter — `js/otterbody.js` + `js/otters.js` (2026-08-20)

The last item on the roster, and the one two other species were waiting on. It creates the
`APEX PREDATORS` row `foodweb.js:28` has carried a note about since §9, and it is what finally lets
the octopus ink (§41) — a behaviour deliberately left unwritten because nothing on this shore ate an
octopus yet.

Three things here are new. It is the **only group** on the shore: every population before it is a
scatter of individuals that happen to share a band, and a romp is one animal made of six. It is the
first predator that **actually kills** — it calls `gobies.take()` and the goby's own one-in-one-out
bookkeeping absorbs it, so an apex predator arriving allocates nothing. And it **pushes**: every
wiring since §27 has been a pull, the prey scanning for the predator, which is right when the
interaction belongs to the prey and wrong when running a fish down is the predator's whole
behaviour.

### There was no browser this session either, and the matrices found four bugs

§41 caught two body-frame bugs by decomposing instance matrices with no renderer available. The same
harness — a node script that builds the world headless and drives `update()` by hand at dt=1/30 —
found four here, three of which no code review would have shown.

**The dive never went down.** `ATT.dive` sinks the animal 0.42 body units under the surface, which is
a *posture*, not a depth, and the chase was written in x and z only. Over the lagoon at high water
that left a diving otter **2.19 m above** the goby it was taking, and taking it anyway. This is §41's
vertical check turned on the hunt instead of on the larder: the header's own overlap table asked
whether these two are ever on the shore at the same time and answered yes, and never asked whether
they are ever at the same *depth*. A dive now aims at the prey's own height and `TAKE_R` is a sphere.

| vertical gap to prey at closest approach | before | after |
|---|---|---|
| median, all chases | — | 0.20 m |
| kills taken through more than 0.55 m of water | routine | **0** |

**Hauled limbs 5 cm under the bar.** §41's lesson verbatim, one species on: a clamp against the
ground is a PLANE, not a number. One departure — §41 clamps an arm's endpoint and lets the segment
stretch to reach it, which is fine for an octopus and reads as a broken bone on a leg. This re-aims
the segment upward about its own bearing at rigid length. The foot is clamped as a bone too, because
it is 0.20 body units long, as long as either leg segment, and clamping the ankle while the paddle
carries on downward buries exactly the part that is supposed to be resting on the sand.

**`ReferenceError: sc is not defined`.** A later edit used the update loop's scale variable inside
`walkLimb`, where it is not in scope. `node --check` passes it — it is a reference error, not a
syntax one — and it would have taken the whole sim down on reload. Only running the thing catches
this class. The harness is worth having for that alone.

### Two deadlines, and the guard was written against the slack one

The haul-out would not fire: three trips started, one arrived, `haul` at **0.0%** of the clock. §31's
"a behaviour that never fires", surviving one earlier round of tuning by being *almost* fired —
`HAUL_R` had already been cut 60 m to 30 m for it.

The first fix priced the trip against `romp.visitT` and **changed nothing**, which is the useful part.
`VISIT_MAX` is 95-160 s and the tide cycle is 90 s, so the visit timer never expires: the romp always
leaves because the water went. A guard on `visitT` passes every time it is asked.

**When a behaviour will not come out, check which of the clocks around it is binding** — §38's rule
about steering windows, asked of time instead of distance. `Tide.secsUntilBelow` (new, and
deliberately *not* routed through `tideAt`, which records `lastT` as a side effect for `setPhase` and
`jumpToSpringLow` — a predictor must not move the thing it predicts) answers the tight one. `HAUL_R`
then went back **up** to 70 m, because the metres were never the constraint: the romp arrives 50 m
from the only ground it can lie on, and at 30 m it could not see the bar until the tide had turned.

That fix then ate the hunt — kills fell from 8 per 900 s to 3 per 1800 s, because hunting was gated
on `romp.state === 'work'` and `tohaul` had taken a third of the time on the plot. `tohaul` is travel
through the water the romp was working a moment earlier, and the individuals have no `tohaul` state
at all; they are simply swimming. `haul` is the real exclusion.

| | 1800 sim-seconds, 6 otters | |
|---|---|---|
| | before | after |
| haul-out trips completed | 1 of 3 | **4 of 4** |
| `haul` share of clock | 0.0% | 2.8% |
| kills | 3 | **10** |

### The animal walks, and the header said it did not

`otterbody.js` argued there was no gait to get wrong: a romp arrives swimming, works the flat
swimming, and hauls out only to LIE DOWN. The numbers killed it. "The ground has the last word"
(this section's own rule) labels any animal on dry sand `haul` whatever the group is doing, and the
haul-out trip crosses ground the ebb has drained — so the animal was travelling across the sand
**posed sprawled, sliding on its belly**. Lying and crawling are different postures and the ground
cannot tell them apart; only the speed can, with a gap in the middle (§32's BARE/SPENT/GOOD, asked of
a gait) so an animal on the threshold does not flicker.

**A walk cycle's phase must be driven by DISTANCE, not by time.** A foot in stance holds its world
position while the body travels over it, so advancing the cycle by metres travelled makes a planted
foot's backward slide in body-local space exactly equal to the distance the body advanced — zero
slip at any speed, with no gait clock to tune against the steering. Time-driven phase is what makes
a walk skate, and no gait constant repairs it. Over one cycle the body advances `STRIDE`; over the
stance it advances `STRIDE * DUTY`, and that is the foot's excursion. It is the only number in the
gait with a right answer rather than a taste.

This is also the one limb on the animal that §36's rule sends to **IK** rather than posing: a foot in
stance has a job to do on the ground. The swimming limbs stay posed and were not touched.

**Straight-line planting is not planting.** Distance-driven phase holds a foot still while the animal
walks straight and fails the moment it turns, because a body-local point swings through the world
with the body — and these animals steer toward a formation slot almost constantly. Measuring the two
cases separately is what showed it; the pooled number hid it in a mean.

| stance frames, slide per frame against an 8.7 cm stride | phase only | world plant |
|---|---|---|
| straight-line | 0.07 cm (ratio 0.008) | **0.02 cm (0.002)** |
| turning | 1.43 cm (ratio **0.164**) | **0.07 cm (0.008)** |

So the phase decides *when* a foot is down and where it lands, and after touchdown the plant is
remembered in **world metres** and converted back each frame. A foot left behind by a hard turn
re-plants rather than dragging, which is the corrective step a real quadruped takes.

The budget settles the original argument: **`walk` 4.7% against `haul` 2.0%** — more than twice as
much land time spent moving as lying, all of it previously drawn as a sprawl.

### What is deliberately not here

No otter-on-crab wiring, though a real romp takes crabs and the swimming crab is on the right band at
the right tide. It would mean a second kill path into a population with no mortality bookkeeping,
which is a bigger decision than a food-web row. The fiddler and the egret were both declined by
reading constants rather than by running a scan and counting zero (§39): the fiddler's band is either
dry, where a swimming otter never goes, or flooded, in which case the crab is underground; and the
egret is a low-water visitor that is gone before this one arrives, by construction.

### Still owed

**No rendered frame of this animal exists.** No browser was available in this session, and the house
rule since §31 is to always request a broadside. Every check above is geometric — the matrices say
the parts are in the right places and the feet are on the sand; they cannot say it looks like an
otter. The gait's tempo (`STRIDE`, `LAND_SPEED`) and ride height (`WALK_LIFT`) are single constants
and are the likeliest things to want moving once somebody has watched it.

`INK` fires but is rare: 3, 5, 2 and 0 events across four runs. Worth a long run before the rate is
called settled.

## 43. The otter, measured against the GLB — and finally looked at (2026-08-25 → 09-01)

§42 shipped this animal blind and said so. This section closes that: the body was rebuilt from
measurements off a reference mesh, and then — for the first time — frames of it were rendered and
examined. Both halves found things the other could not have.

### The body is now ONE surface, and the four joins were the problem

`otterbody.js` used to build the tail, torso, neck and head as four separate sweeps with their own
radii, butted end to end. Every one of those joins was a STEP. The rump ended in a cliff with a
needle coming out of it and the skull sat on the neck as a detached box, and tuning the four radii
against each other never fixed it, because **a step is what you get whenever two independently-chosen
radii meet.**

So the animal is one profile `BODY_R x BODY_P(s)` over a single parameter running tail tip (s=0) to
nose (s=1), cut into fourteen links. Continuity is now structural rather than tuned: adjacent links
call the same function at the same shared `s`, so they cannot disagree about how wide the animal is
where they meet. The same argument applied twice — a per-link constant aspect made the WIDTH
continuous and left the HEIGHT stepped, by 23% of the local radius at the rump, so `aspectY` is read
along each link too.

### Measured, not eyeballed

Fitted to `reference/otter/River otter by Poly by Google - dJW3JeUWXQ-.glb` — 1084 triangles, 257
vertices once its ground disc is discarded, one welded shell with no skeleton, so it can only be
measured and rebuilt, never imported part by part. Cross-sections were read at ten stations and
normalised to a torso length of 3.7 in the GLB's own units.

| | before | measured |
|---|---|---|
| head half-width | 0.37 | **0.238** |
| nose | blunt, held full width to the end | tapers to **0.30** of the skull |
| tail length | 0.68 torso lengths | **1.04** |

All three are silhouette errors, which is why re-tuning colour and facet counts had never touched the
problem. Colour was sampled the same way — the GLB's base-colour texture decoded and read through the
mesh's own UVs — and settled two things: back, flank and tail are all 0x321d16, and **the reference
has no pale belly at all** (its belly samples 0x311c15, the same as its back), so the cream underside
this animal used to have is gone and only the throat bib survives.

### THE FACE WAS INSIDE THE HEAD, and only a render could say so

The one-surface rebuild made the head a slice of the body profile instead of its own sweep. The skull
got wider — the real skin is at **0.208**, where the typed constant next to the eye and ear offsets
still said the skull was "0.122 in radius". Those offsets were distances. So they stayed where the old
skull's skin used to be — 0.08 body units, about 6 cm of otter, inside the new one:

| fittings, fraction of vertices under the skin | before | after |
|---|---|---|
| ear | **100%** | 40% |
| eye | **100%** | 66% |
| whisker fan | 93% | 40% |

An otter with no eyes and no ears. Every geometric check in §42 passed straight through this, because
nothing was in the wrong place *relative to what it was told the head was* — the parts were exactly
where they were asked to be, and the thing that had moved was the surface.

**A number that describes a surface must be ASKED OF THE SURFACE, not copied next to it.** So
`otterbody.js` exports `halfW(s)` and `halfH(s)` off the same profile the links are built from, and
`EYE.y/.z`, `EAR.y/.z` and `WHISK.y/.z` stopped being distances and became a DIRECTION out of the
centreline. `onSkin` rides the local cross-section ellipse and returns where the skin actually is. A
fitting can no longer be buried by somebody re-shaping the head; the only way to sink one now is to
ask, which is `EYE_SINK` (an eye is set INTO a face) and `EAR_SINK` (an ear sits ON one), both
fractions of the local radius rather than absolute depths. The state budget is byte-identical across
the change — it is placement, not behaviour.

### The harness that had been drawing the wrong animal

The renders that finally caught this needed the offline rasterizer fixed first. It read instance `oi`
out of every InstancedMesh — correct for the fourteen body links, which are one per animal, and wrong
for every fitting: whiskers are 6 per otter, legs 8, feet 4, ears and eyes 2. So for otter 0 it drew
otter 0's ear, otter 0's third whisker, otter 1's leg, and hung them in space. That is why the first
broadsides showed an otter with no legs and a few detached blocks floating beside it, and why a
session went looking for a limb bug that was never there. The slot is `oi * per + s`.

With that right, the geometry checks out. Limb chains close exactly — knee gap and ankle-to-foot gap
both **0.0000** in `haul` and in `walk` — the hips sit inside the body outline at both stations
(0.155 against a local half-width of 0.232 fore and 0.198 hind), and no limb rises above the spine in
any state. The apparent gaps and the leg-through-the-back were both the three-quarter projection
mixing y and z; a broadside settles that class of question and a 3/4 view does not.

### What the numbers say now

Gait, over 6002 walk frames:

| | |
|---|---|
| true-stance foot scrub per frame | median **0.000 cm**, p95 0.015 cm |
| feet more than 2 cm under the sand | **0.01%** |
| re-plants per stance frame | 0.004 |

State budget over 2400 sim-seconds, 6 otters: swim 73.1%, **walk 16.4%**, haul 7.6%, dive 2.1%,
catch 0.8% of on-plot time; 8 visits, 8 kills. The walk that §42 argued did not exist is now the
second-largest thing this animal does.

### Still owed

**A re-plant is a 29 cm jump in one frame.** When a foot is dragged past full leg reach it is
re-planted at the phase position, and that snap is bounded by the leg's own reach — median 29.2 cm
measured, against a 39 cm stance excursion and a 63 cm cycle. It fires on 0.4% of stance frames, so roughly once every 7.5
seconds per foot while turning. A real corrective step lifts and swings; this one teleports. The fix
is to force the limb into swing rather than to move its plant, and it was left alone because the
frequency is low and the alternative is a second phase authority fighting the first.

`INK` is still unsettled from §41-42: 3, 5, 2 and 0 events across four runs.

## 44. The otter is the reference mesh now — `Otter.obj`, skinned (2026-09-01)

§43 rebuilt this animal by MEASURING a reference and re-sweeping it procedurally. This section stops
doing that: `reference/otter/Otter.obj` **is** the otter. It is un-posed, faceted, coloured from §43's
sampled palette, and skinned per frame by the same centreline and the same limb IK that drove the
swept body. The behaviour is untouched — every state, the romp, the hunt, the haul-out clock and the
kills are the code §42 wrote — and only what wears them changed.

### The mesh, and the one piece of luck in it

1027 vertices, 1000 quads, quad-dominant and clean (889 vertices at valence 4). One welded shell —
so it cannot be imported part by part, same as the GLB — **plus two loose 37-vertex components,
which are the eyes.** Those come free: the bake colours them flat black and weights them to the
skull, and the animal gets eyes without a single line of placement code. The ears are welded into
the head and are simply skin. No `.mtl` ships with it and its one material carries nothing, so the
palette is still §43's, decoded from the *other* reference's texture.

### Skinned, not sliced

The obvious way to use a mesh in this codebase is to cut it into rigid links and hand them to the
existing InstancedMesh kit, which every other body here is. It was rejected: the limbs are welded to
the torso, so cutting means capping four sockets and four stumps, and §43 spent a whole section
killing the steps where independently-placed parts meet.

Skinning has none of that. Every vertex carries its `s` along the spine and its offset from the
centreline — the same parameterisation the fourteen links were built on — so **the spine that used
to carry fourteen matrices now carries a thousand points**, and there is no join anywhere on the
animal, including across a shoulder, which links never managed at all.

It costs the instancing. Six animals in six poses cannot share one geometry, so the body is six
Meshes, and `instanceColor` — where every population here keeps its per-individual tone and where
ui.js drives its hover glow — does not exist for it. The wet/dry tint moved to a material per animal
(three.js multiplies material colour into vertex colour in the same place, so the effect is
identical) and the population publishes a `glowApply` that ui.js calls instead of writing into a
buffer. That is the one change to a shared system, and it is about twenty lines.

Normals are never recomputed. `flatShading` derives them in the shader, which is exact for a flat
facet and free; the alternative is 2000 face normals per animal per frame for nothing.

### The un-posing, and why it is a rotation and not a shear

The OBJ is modelled **standing** — head carried high, back arched, tail sloping down to touch the
ground. The sim's rest frame is a straight animal whose centreline does all the bending, so the
model's own pose has to come out first or the otter swims with a permanent standing arch.

The centreline is measured off the surface by plane-sectioning it, then each vertex is expressed in
the local frame at its nearest point on that curve and re-emitted against a straight axis at the same
arc length. Projecting onto the **polyline** rather than onto the nearest sample matters: snapping to
samples lets two adjacent vertices land on different ones, and the seam between them tears a foot
open. Arc length 34.14 against a straight span of 31.87 — the pose was worth 7% of the animal's own
length.

### THE SHOULDER IS NOT WHERE THE CHEST IS DEEPEST

The bake's first landmark rule was "the shoulder is the peak of `halfH`", which is what a quadruped's
profile ought to do. On this animal it is wrong, and quietly: `halfH` is nearly flat from the hips to
the ribs — 2.95 to 3.49 across the whole torso — and its true maximum is at the waist of the BACK, a
third of the way down the body. That put the front of the animal in the middle of it, and since the
torso IS the body unit, every proportion downstream came out 40% wrong.

The second rule, "the neck is the first local minimum of `halfW` forward of the hips", found the
**abdominal** waist between haunch and ribcage — a real feature, 2.45 wide, and not the one wanted;
the neck is 1.70. The head end has no such ambiguity, so the skull is found from the NOSE walking
backwards, as the first crest, and the neck is then simply the narrowest place between it and the
hips.

Even that is only good enough to report. What sets the scale is the **shoulder JOINT**, fitted from
the forelimb's own vertex cloud — because a width feature near the shoulder is not the shoulder, and
because sectioning the animal perpendicular to its own axis (which the un-posed profile does, and
which the OBJ's own frame does not) nearly erases the neck's waist anyway: 1.63 against 2.01, a dip
of a fifth where the old reference had a third.

| body units, torso = 1 | swept (§43) | `Otter.obj` |
|---|---|---|
| tail | 1.02 | **1.13** |
| head | 0.28 | 0.26 |
| nose to tail | 2.50 | **2.82** |
| max half-width | 0.238 | 0.250 |
| fore hip x | −0.13 | **0.00** |
| hind hip x | −0.78 | **−0.96** |
| hip below the axis | 0.115 | **0.194** |
| fore leg, upper / lower | 0.20 / 0.20 | **0.16 / 0.29** |
| hind leg, upper / lower | 0.20 / 0.20 | **0.20 / 0.19** |

`S` drops 0.70 to **0.6195** so nose-to-tail stays at 1.75 m. Without that the animal grows 13% and
every metre tuned against it — `HAUL_R`, `TAKE_R`, the romp's own spacing — quietly means something
else. §42's decision to leave the limb constants alone ("the reference's stubbier legs are not worth
re-tuning a working walk for") is also reversed, and had to be: a vertex is bound to the bone the
bake fitted, so a rig bone of a different length telescopes the leg inside its own skin.

### Two blends, and the second one was missing

**A vertex bound to its single nearest bone tears at every joint.** The skin either side of a knee
belonged to different rigid pieces, so the joint pulled open every time it flexed. Binding to the
nearest TWO, mixed by inverse distance, closes it.

**A socket is a distance, not a height.** The limb-versus-spine weight started as a vertical cut —
below some fraction of the body's depth you belong to the leg. A hip socket wraps AROUND the leg, so
skin on the flank beside a shoulder sat at weight zero while skin an inch below it sat at one, and
the edge between them carried the entire swing of the limb. It also made the transition band tiny:
76 partial vertices out of a thousand, nine per socket. Distance to the limb's own bone chain is
isotropic and can be as wide as it needs to be.

Measured as **deformed edge length over rest length**, over every edge in the mesh:

| | median | past 2x | worst edge |
|---|---|---|---|
| one bone, vertical socket | 1.002 | 4.4–6.1% | **14.7x** |
| two bones, distance socket | 1.003 | **1.9–4.7%** | **8.0x** |

The median says the spine was never the problem. Everything that was ever wrong here was at a limb.

A third fix has no visible symptom yet and is the kind that waits: the bone frame's reference axis
was chosen by a threshold — world up unless the bone is nearly vertical — and a leg swinging across
that threshold flips its frame and twists a quarter turn in one frame. It is now the world axis the
bone points at LEAST, derived from the REST direction, so the bake and the runtime pick the same one
without either being told and there is no threshold to cross.

### What the checks say

A **rest-pose round trip** — rebuild the animal from `ottermesh.js` alone and compare it to the mesh
the bake started from — comes back at a worst error of **0.00015 body units**, which is the four
decimal places the file is written to. That gate is what makes everything after it trustworthy: a
skinning bug and a rig bug look identical on screen, and this separates them.

Gait, re-pointed at the skin (the paw is no longer a part with a matrix; it is the patch of vertices
bound to each limb's third bone):

| | §43, rigid foot | §44, skinned |
|---|---|---|
| true-stance paw scrub, median | 0.000 cm | 0.074 cm |
| paws more than 2 cm under the sand | 0.01% | 0.06% |
| re-plants per stance frame | 0.004 | 0.005 |

The scrub is worse and is not a plant failure — the plant is the same code and still exact. A paw is
now a patch of skin whose centroid shifts slightly as its socket blends, and 0.074 cm against a 39 cm
stance excursion is two parts in a thousand.

### One more relative-versus-absolute bug, caught by looking

§43's lesson was that a fitting must ask the surface where the skin is, and it fixed the RADIUS. It
did not fix the **x**. The whisker pad sat at a typed 0.41 along the body; the nose moved from 0.46
to 0.70 with the new mesh, and the whiskers came out of the animal's cheek. Both coordinates are
fractions now — `at` along the head, and a direction out of the centreline — and neither can drift
again. The eyes and ears cannot be misplaced at all any more, because they are skin.

### Still owed

The re-plant teleport from §43 is untouched — a foot dragged past full reach still snaps to the phase
position in one frame, now 22 cm, on 0.5% of stance frames.

**Swim and catch still stretch a socket about 4.7% past 2x.** The residual is linear blend skinning
doing what it does at large rotations: the mesh's legs are bound STANDING and the swim pose streams
them about 80 degrees back. Widening the band further starts dragging the belly; the real fixes are a
rotation-aware blend, or accepting that this animal's swim pose asks for more limb rotation than a
standing-bound mesh wants to give. Neither was worth doing blind.

---

## 45. The otter's skin stops tearing — `js/otters.js`, `tools/bake-otter.js` (2026-09-01)

§44 left two things open and named them as a choice: blend rotations instead of positions, or swing
the legs less. Both turned out to be right and neither was the main thing. There were **three**
causes stacked on top of each other, and the measurement that separated them is worth more than any
of the fixes.

### What the numbers were, and are

| state | edges past 2x, before | after | worst edge, before | after |
|---|---|---|---|---|
| walk | 1.85% | **0.13%** | 5.39x | **2.45x** |
| haul | 3.64% | **2.45%** | 6.52x | **3.60x** |
| swim | 4.73% | **2.65%** | 8.01x | **4.08x** |
| catch | 4.46% | **2.55%** | 6.75x | **4.46x** |

The median edge was 1.003 before and 1.005 after: the surface was never wrong and still is not. What
changed is the tail.

### Cause 1 — blending PLACES instead of MOTIONS (fixed, and it was the smallest of the three)

Every vertex is told by two or three things where to go, and the answer used to be the straight-line
average of those places. That is linear blend skinning and it fails in one way: the average of two
points either side of a big rotation lies *inside* the arc.

The fix is dual-quaternion skinning — average the rigid MOTIONS, renormalise, and the result is still
a rigid motion, so nothing can collapse. It needs every influence to act on ONE rest position, and it
turned out one was already there: `s`/`oy`/`oz` reproduce the un-posed vertex for every vertex, limbs
included. So the runtime stopped reading the bone-local `ba`/`bo`/`bs` entirely and derives each
bone's rest frame from the joints instead, the way it already derived `REFA`.

**And it bought almost nothing on its own: 1.85% to 1.79% at walk.** That is the useful part of this
section. The correct algorithm, correctly implemented, moved the number by three hundredths of a
percent — because collapse was not what was happening.

### Cause 2 — three hard tests in the weighting (this was the big one)

What the bake actually did was decide, three times per vertex, with a test:

```
if (v[2] * side < 0.2) continue;          a plane through the body: a vertex just
                                          inside it followed a leg, its neighbour
                                          just outside did not
if (v[0] < win[0] - 1.0) continue;        the same, along x
bmix = min(1, d2/(d1+d2) * 1.6)           a vertex nearer bone A was ENTIRELY A
```

**262 edges — 8.7% of them — joined two vertices whose influences differed by more than half.** Those
are the edges that stretched. Two neighbours told to follow completely different bones go completely
different ways, and no blending scheme can save them, because by the time the blend runs the decision
is already made.

So every test became a ramp, every bone got a share instead of a place in a ranking, and the socket
half of the field is then diffused over the mesh graph. After: **no edge above 0.54, none past half.**

Three things were learned building it:

- **Smooth the socket and the split separately.** Diffusing the whole influence vector together turns
  a leg to mush: a thigh vertex ends up listening to the paw at 0.24, and the leg bends like a rope.
  Which bone inside a limb is already continuous — it comes from a distance kernel, not a ranking —
  and only *how much limb at all* needs diffusing.
- **Pin the core.** Diffusion left to itself walks weight off the paw and onto the spine, and a paw
  that half-follows the body scrubs. Vertices inside a leg's own girth are held at full limb weight;
  only the socket band is free.
- **Arc length along the bone chain does not work on this animal.** It was the obvious way to split
  bones without a perpendicular seam, and the forelimb *doubles back* at the elbow — 0.16 of scapula
  going backwards over 0.29 of forearm coming forward — so two vertices either side of the fold
  project to arc positions far apart, and the split tore exactly where it was meant to blend.

### Cause 3 — the bind pose was one end of the range, not the middle

How far a socket has to shear is set by how far the leg has swung *since it was bound*, and nothing
else. `Otter.obj` was modelled STANDING. Swimming streams the legs about 80 degrees back — and
swimming is seventy per cent of this animal's screen time, so the pose it was drawn in was the one
pose it almost never holds.

So the legs are swung back once, at load, into a bind pose in the middle of the range, using the same
skinning the runtime uses, and every rest position and bone rest frame is re-read off that. `swim`
went 3.57% to 2.84% and, importantly, **walk did not move at all**: the far end of the range paid
nothing for it.

The mesh file is untouched. It is a record of the OBJ; where the animal holds its legs is the rig's
business.

### The knobs, and what they trade

All three were chosen by measurement — bake, then `check-stretch` in every state, then `check-gait`.
The one worth naming is `SHARE_P`, which sets how tightly a bone claims its own middle. At 6 the
stretch is lowest; at 6 the paw is also only 0.75 bound to its own toe bone, and a planted foot
scrubbed 0.111 cm a frame against 0.074 before any of this. **12 puts the scrub back to 0.076 for
0.24% more stretched edges at swim.** A planted foot is a promise the animal makes to the ground;
seven edges are not.

### The corrective step — the re-plant teleport, gone

§43's re-plant dropped the plant and let the foot appear 22 cm away in the *same frame*: no lift, no
swing, no landing. The reason it survived two sections is that the gait phase is driven by DISTANCE
TRAVELLED on purpose, and interrupting it for one leg looked like a second authority fighting the
first.

It is not, if the leg borrows from a CONSTANT rather than from the phase. Each leg already carries
one — `GAIT_PH` — so losing a footing now borrows from a per-leg offset until that leg sits at the top
of its swing, and distance goes on driving everything. The offset unwinds back toward zero so the
diagonal couplets re-form, and it unwinds *only while the leg is in the air* and never by more than
half the phase the distance just advanced: so it can neither move a planted foot nor stall a swinging
one. The swing itself starts from where the foot actually is, eased onto the nominal path, or the
lift would just be the same jump moved one frame later.

**Re-plants per stance frame: 0.005 to 0.000.** 38 corrective steps were taken over 6003 walk frames
and not one of them moved a planted foot.

An earlier version eased EVERY swing off its last stance position, not just a corrective one. It cost
nothing to write and it was wrong: an ordinary swing already starts where the stance left off, and
running all of them through the blend spread a 5 cm discretisation error across the lot and put the
median frame-to-frame discontinuity up twentyfold, to fix a jump that was not there.

### Two gates changed, because their subjects did

- `check-roundtrip.js` no longer has a second parameterisation to check against the first — there is
  only one now. It checks that `s`/`oy`/`oz` reproduce the OBJ, and then, separately, that **bones
  which have not moved move nothing**: rebuild each rest frame from the emitted joints, compose it
  with its own inverse, blend, apply. That is not a tautology. It fails the moment the bake and the
  runtime disagree about how a bone frame is built, and that disagreement is invisible in the rest
  pose while being fatal in every posed frame. It reads 0.000000000.
- `check-gait.js` moved from 20 Hz to **60 Hz**. At 20 Hz and 2.75 m/s a whole gait cycle is under
  four samples and the swing is one of them, so every measure of how *smoothly* a foot moves reads as
  noise — the median second difference came out at 14 cm on a gait with nothing wrong with it. And
  its re-plant metric only looked at frames where a plant existed on both sides, which goes blind the
  moment the fix lifts the foot instead of dropping the plant: the jump moves into a frame the filter
  throws away. It now also measures the paw second difference in every phase.

### Still owed

**A foot leaves the ground at full swing speed.** The 60 Hz gate found it: the worst frame-to-frame
paw discontinuity while walking is **26 cm**, every one of the top ten is the ordinary stance-to-swing
crossing on a hind leg at full speed in a hard turn, and it measures the same before and after
everything above. Nothing teleports — the position is continuous — but the velocity is not: a planted
foot is world-stationary right up to lift-off and then moving at swing speed in one frame.

Shaping the swing as a cubic with the stance's own slope at both ends was tried and **does not fix
it**: the max stayed at 26.9 cm and the median discontinuity went up twentyfold. So the mismatch is
not in x, and the next person should find out which axis it *is* in before writing any more code —
the diagonal is a hard turn, so the sideways sweep of a world-planted foot under a yawing body is the
first suspect, and the reach clamp releasing at lift-off is the second.

### Cost

Six skinned otters went from about 1.44 to about 1.5 ms a step measured the same way — dual
quaternions are roughly twice the arithmetic of two lerps, on a thousand vertices that were never the
expensive part.
