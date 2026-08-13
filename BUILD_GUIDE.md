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
