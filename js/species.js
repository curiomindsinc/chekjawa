/* ============================================================
   species.js — the catalog. Everything the UI, the fact cards and
   the food web read about an organism lives here, and nowhere else.

   Two tables, same shape:
     SPECIES  animals            kind: 'animal'
     FLORA    plants / producers kind: 'flora'

   Fields the rest of the build depends on:
     emoji, name, group   species panel row (group = the panel heading)
     category, role       fact-card badge + subtitle
     about, why, funFact  fact-card page 1
     structural[]         fact-card page 2, {title, text}
     behavioural[]        fact-card page 2, {title, text}
     trophic              food-web row — must match a LEVELS label (§9)
     eats[]               food-web links, by key. "eaten by" is reverse-derived
     symbiosis[]          food-web dashed links; listing it on one side is enough
     zone                 metres above Chart Datum, the band it lives in (§1)

     sim                  key of the live population in main.js's `pops` map.
                          Present = you can follow individuals of it.
                          Absent  = catalogued but not yet spawned on the shore
                          (BUILD_GUIDE §11 — the roster lands in batches, and a
                          species belongs in the food web from the day it is
                          written up, not the day it gets a body).

   Adding a species: add an entry here. No UI, panel or food-web code
   changes — both are built by scanning these two tables.
   ============================================================ */

var SPECIES = {

  /* ---------------- high shore: rock and root ---------------- */

  barnacle: {
    emoji: '🪸', name: 'Barnacle', group: 'HIGH SHORE',
    kind: 'animal', sim: 'barnacle',
    category: 'CRUSTACEAN', role: 'Filter feeder · sessile',
    zone: '2.2 – 2.8 m CD',
    trophic: 'FILTER FEEDERS',
    eats: ['plankton'],
    about: 'A barnacle is a crustacean that glues itself head-down to a rock and builds a ' +
      'limestone fort around its own body. It spends its whole adult life in one spot, so the ' +
      'tide decides everything: submerged, the shell plates open and six pairs of feathery legs ' +
      'sweep the water for plankton; exposed, the plates shut and seal a mouthful of seawater ' +
      'inside to breathe from.',
    why: 'Barnacles set the top of the living shore. The height their band stops at marks how ' +
      'long a spot stays wet, so a naturalist can read the tide range off a boulder without a ' +
      'gauge. They also pull plankton out of the water column and lock it into the rock face, ' +
      'feeding everything that grazes or preys there.',
    funFact: 'A barnacle cements itself down with a natural glue that sets underwater and holds ' +
      'harder than most industrial adhesives — dentists have studied it.',
    structural: [
      { title: 'Calcareous plate wall', text: 'Six interlocking limestone plates form a cone, with two more that close like a trapdoor — armour against waves, predators and drying out.' },
      { title: 'Feathery cirri', text: 'Modified legs unfurl into a fan and comb plankton from passing water. The animal is kicking food into its own mouth.' },
      { title: 'Sealed water store', text: 'On the ebb the plates close on a pocket of seawater, so the gills stay wet through hours of exposure and full sun.' }
    ],
    behavioural: [
      { title: 'Tide-locked feeding', text: 'Sweeping only happens while submerged. It cannot chase food, so its entire feeding budget is the hours the water covers it.' },
      { title: 'Settling beside neighbours', text: 'Larvae choose rock that already carries barnacles — proof the spot works, and it puts a mate within reach of an animal that can never move.' },
      { title: 'Shut on exposure', text: 'Air, not danger, triggers the close. Same reflex whether the threat is a hot afternoon or a passing crab.' }
    ]
  },

  nerite: {
    emoji: '🐌', name: 'Nerite Snail', group: 'HIGH SHORE',
    kind: 'animal', sim: 'nerite',
    category: 'MOLLUSC', role: 'Grazer · biofilm scraper',
    zone: '1.9 – 2.7 m CD',
    trophic: 'GRAZERS',
    eats: ['biofilm'],
    about: 'A small, hard-shelled snail that lives where the sea only reaches part of the day. ' +
      'While the rock is wet it crawls and scrapes the invisible skin of algae and diatoms off ' +
      'the surface with a file-like tongue. When the rock dries it clamps down, seals the shell ' +
      'with a hard door and waits — sometimes for hours — until the water returns.',
    why: 'Nerites are the lawnmowers of the high shore. Without them biofilm thickens and smothers ' +
      'the rock, and barnacle larvae have nowhere clean to settle. Grazing is what keeps the rock ' +
      'face open for everything else.',
    funFact: 'Its rasping tongue, the radula, carries thousands of teeth on a conveyor belt — worn ' +
      'ones drop off the front while new ones grow in at the back, for life.',
    structural: [
      { title: 'Thick domed shell', text: 'A low, heavy dome sheds wave force instead of catching it, and there is no fragile spire to snap off against rock.' },
      { title: 'Operculum door', text: 'A hard plate on the foot seals the shell shut, trapping moisture inside — the barnacle trick, different hardware.' },
      { title: 'Radula file', text: 'A ribbon of mineral-hardened teeth scrapes algae off bare stone without wearing the mouth out.' }
    ],
    behavioural: [
      { title: 'Grazes only while wet', text: 'Movement tracks the waterline. Dry rock means clamp and wait; wet rock means feed, and fast.' },
      { title: 'Homing to a scar', text: 'High-shore grazers return to the same shallow depression on the rock, where the shell fits tightest and loses least water.' },
      { title: 'Crowding into crevices', text: 'At low water they huddle in shaded cracks. A cluster loses far less water than a snail alone in the sun.' }
    ]
  },

  /* ---------------- the mudflat ---------------- */

  fiddler: {
    emoji: '🦀', name: 'Fiddler Crab', group: 'THE MUDFLAT',
    kind: 'animal', sim: 'fiddler',
    category: 'CRUSTACEAN', role: 'Deposit feeder · burrower',
    zone: '1.8 – 2.2 m CD',
    trophic: 'DEPOSIT FEEDERS',
    eats: ['biofilm', 'seagrass'],
    symbiosis: ['mangrove'],
    about: 'The one animal on this shore that runs backwards to everything else. A fiddler crab ' +
      'is an air-breather living in a hole: it comes out when the tide leaves, feeds on the ' +
      'exposed mud, and goes down the burrow as the water walks back up. Males carry one hugely ' +
      'oversized claw and wave it at the sky in bouts — a signal to females and a warning to ' +
      'other males, useless for feeding.',
    why: 'Fiddler burrows turn the mudflat over. Every hole carries oxygen down into black, ' +
      'airless mud and drags surface food below, which is what lets mangrove roots and buried ' +
      'life survive there at all. A flat full of fiddlers is a flat that breathes.',
    funFact: 'The big claw can be a third of the crab\'s whole body weight. Lose it and the crab ' +
      'regrows it on the other side — the small feeding claw becomes the new fiddle.',
    structural: [
      { title: 'One oversized claw', text: 'Males carry a major claw far too heavy to feed with. It is a billboard: bigger claw, better burrow, better mate.' },
      { title: 'Spoon-tipped feeding claw', text: 'The small claw shovels mud to the mouth, where gills sort edible film and detritus from grit. The cleaned grit comes back out as pellets ringing the hole.' },
      { title: 'Air-breathing gill chamber', text: 'A damp chamber works like a lung, so the crab can stay out of water for a whole low tide — as long as it keeps the chamber wet.' }
    ],
    behavioural: [
      { title: 'Inverted tide clock', text: 'Active while dry, shut down on the flood — the mirror image of every other species here, so the shore is never empty.' },
      { title: 'Waving bouts', text: 'Two to six sweeps, then a rest. Activity peaks at the bottom of the tide, when the mud is workable and the flat is crowded with rivals.' },
      { title: 'Burrow fidelity', text: 'It feeds in a tight circle around its own hole and bolts straight back at the first sign of water or a shadow overhead.' }
    ]
  },

  conch: {
    emoji: '🐚', name: 'Dog Conch', group: 'THE MUDFLAT',
    kind: 'animal', sim: 'conch',
    category: 'MOLLUSC', role: 'Grazer · tide follower',
    zone: '1.0 – 1.8 m CD',
    trophic: 'GRAZERS',
    eats: ['biofilm', 'spoongrass', 'seagrass'],
    about: 'A heavy, thick-lipped sea snail of the sandy flats — one of the animals Chek Jawa is ' +
      'known for. It does not crawl like an ordinary snail. It plants a pointed, claw-like foot ' +
      'into the sand and vaults, hopping down-shore behind the falling water. Caught out in the ' +
      'open it digs in and waits the low tide out under the sand.',
    why: 'Dog conches graze algae and detritus off the sand surface and are, in turn, a staple ' +
      'meal for crabs, rays and people — they have been harvested here for generations. They are ' +
      'the clearest link between the flat\'s producers and everything that hunts on it.',
    funFact: 'Its eyes sit on stalks and can be regrown if bitten off — and each one carries a real ' +
      'lens, closer to a fish eye than to a garden snail\'s.',
    structural: [
      { title: 'Flared, thickened lip', text: 'The adult shell grows a heavy flared edge that makes the animal too wide and too armoured for most crab claws to crush.' },
      { title: 'Claw-shaped operculum', text: 'The door doubles as a pole. Jabbed into the sand it levers the whole animal forward in a hop.' },
      { title: 'Stalked lens eyes', text: 'Two long eye stalks lift image-forming eyes clear of the sand — rare in snails, and useful for reading a shadow early.' }
    ],
    behavioural: [
      { title: 'Follows the waterline', text: 'It tracks the ebb down-shore rather than sitting still, staying in the thin wet band where grazing is safe and food is fresh.' },
      { title: 'Leaping escape', text: 'Threatened, it vaults instead of retreating — an abrupt hop that breaks a predator\'s grip and its search image at once.' },
      { title: 'Burying when stranded', text: 'Caught by the falling tide, it works itself under the sand where the mud stays cool and wet until the flood returns.' }
    ]
  },

  /* ---------------- low water: the lagoon ---------------- */

  seastar: {
    emoji: '⭐', name: 'Knobbly Sea Star', group: 'LOW WATER',
    kind: 'animal', sim: 'seastar',
    category: 'ECHINODERM', role: 'Predator · slow forager',
    zone: '0.3 – 0.9 m CD',
    trophic: 'PREDATORS',
    eats: ['barnacle', 'nerite', 'conch'],
    about: 'Chek Jawa\'s mascot: a broad, orange-red star studded with blunt knobs, big enough to ' +
      'cover both hands. It creeps over the seagrass lagoon on hundreds of tube feet, feeding on ' +
      'sponges, small molluscs and whatever dead matter it finds. It only shows up on the lowest ' +
      'spring tides, which is exactly why those tides draw crowds here.',
    why: 'A slow predator that eats what nothing else bothers with, and a species so sensitive to ' +
      'sediment and freshwater that its presence is a report card on the whole shore. When Chek ' +
      'Jawa was hit by prolonged rain in 2007, the knobbly sea stars were among the first to go.',
    funFact: 'A sea star has no brain and no blood. It runs on seawater, pumped through a network ' +
      'of canals that drives every one of its hundreds of tube feet.',
    structural: [
      { title: 'Knobbed armour', text: 'Hard tubercles set in a leathery body wall make the star an awkward, gritty mouthful for anything that tries.' },
      { title: 'Water vascular system', text: 'Seawater under pressure powers the tube feet — locomotion, grip and breathing all off the same plumbing.' },
      { title: 'Regenerating arms', text: 'A lost arm regrows over months. A predator that takes one gets a snack; the star gets to keep living.' }
    ],
    behavioural: [
      { title: 'Follows water down', text: 'It tracks the ebb into the lagoon rather than risk being caught high on the drying flat.' },
      { title: 'Burrows when stranded', text: 'Left dry, it works down into wet sand and waits — heat and sun are the killers, not the exposure itself.' },
      { title: 'Stomach-out feeding', text: 'It pushes its stomach out through its mouth and digests prey where the prey sits, no swallowing required.' }
    ]
  },

  seahare: {
    emoji: '🐇', name: 'Sea Hare', group: 'LOW WATER',
    kind: 'animal', sim: 'seahare',
    category: 'MOLLUSC', role: 'Grazer · seagrass forager',
    zone: '0.05 – 0.9 m CD',
    trophic: 'GRAZERS',
    eats: ['seagrass'],
    about: 'A sea slug the size of two fists, olive and warty, grazing its way across the seagrass ' +
      'lagoon. It is a snail that gave up its shell — what is left is a soft bag with a pair of ' +
      'rolled, ear-like horns on its head, which is where the name comes from. Chek Jawa\'s big ' +
      'one is the extraordinary sea hare, and it is one of the animals a spring low uncovers.',
    why: 'Sea hares are the lagoon\'s lawnmowers: big-bodied grazers that crop seagrass and algae ' +
      'faster than anything else down here, and then move on, which keeps the meadow from being ' +
      'smothered by its own growth. Everything they eat, they eventually return to the mud.',
    funFact: 'Threatened, it fires a cloud of purple ink — and the ink does more than hide it. It ' +
      'gums up a predator\'s sense of smell, so the attacker loses the trail as well as the sight ' +
      'of its target.',
    structural: [
      { title: 'No shell at all', text: 'Only a small internal plate remains, buried in the back. The animal is defended by chemistry and camouflage instead of armour.' },
      { title: 'Rhinophores', text: 'The two rolled horns on its head are chemical sensors — it smells its way to a good patch of weed rather than seeing one.' },
      { title: 'Parapodia', text: 'Two muscular flaps of mantle stand along the back like a ruffled wall. In some sea hares they are big enough to flap and swim with.' }
    ],
    behavioural: [
      { title: 'Eats a patch out, then moves', text: 'It crops the turf under it until there is nothing worth staying for, then crosses open ground to the best patch it can smell.' },
      { title: 'Inking', text: 'Disturbed, it releases purple ink and crawls off behind the screen — the whole defence of an animal too soft and too slow to have another one.' },
      { title: 'Hunkers down at low water', text: 'It cannot follow the tide out at four centimetres a second, so it does not try: it flattens into a wet hollow and waits the low out.' }
    ]
  },

  mudskipper: {
    emoji: "🐟", name: "Mudskipper", group: "THE MUDFLAT",
    kind: "animal", sim: "mudskipper",
    category: "FISH", role: "Predator · amphibious",
    zone: "0.8 – 2.1 m CD, the water edge",
    trophic: "PREDATORS",
    eats: ["fiddler"],
    about: "A fish that spends most of its life out of the water. When the tide uncovers the flat " +
      "a mudskipper comes out with it, propped upright on muscular pectoral fins, skipping across " +
      "wet mud after crabs and insects. It breathes through its skin and through a mouthful of " +
      "water carried in its gill chamber, so the one thing it cannot do is dry out — which is why " +
      "you never find one far from the waterline.",
    why: "The mudskipper is the animal that makes a mudflat look inhabited. It is also the clearest " +
      "living argument on this shore that the line between water and land is a place, not a border: " +
      "it feeds on land, breathes air, courts on the mud, and goes back to the water to wet itself " +
      "and to escape.",
    funFact: "It can climb. Its pelvic fins are fused into a suction cup, so a mudskipper can hold " +
      "station on a mangrove root above the water and stay there while the tide runs past beneath it.",
    structural: [
      { title: "Arm-like pectoral fins", text: "Thick fins on muscular stubby bases work as crutches. The animal props itself upright on them and walks — a fin doing a limb’s job." },
      { title: "Periscope eyes", text: "Bulging eyes mounted on top of the head give it an all-round view above the mud, and a retractable lid keeps them wet in air." },
      { title: "Skin and gill-chamber breathing", text: "It absorbs oxygen through wet skin and carries a mouthful of water over its gills — a portable set of lungs that only works while it stays damp." }
    ],
    behavioural: [
      { title: "Skipping, not swimming", text: "On land it flicks its tail against the mud and launches into a low arc, landing back on its props. That skip is where the name comes from." },
      { title: "Never far from water", text: "It works the wet margin and goes back to dip whenever it dries. The population strings itself along the waterline and walks up and down the shore with the tide." },
      { title: "Flying the dorsal", text: "A perched mudskipper raises its first dorsal fin like a sail to claim its patch of mud and warn off rivals." }
    ]
  },

  /* ---------------- the visitor ---------------- */

  egret: {
    emoji: '🕊️', name: 'Little Egret', group: 'THE VISITORS',
    kind: 'animal', sim: 'egret',
    category: 'BIRD', role: 'Predator · visitor',
    zone: '0.9 – 2.3 m CD, while it is dry',
    trophic: 'PREDATORS',
    eats: ['fiddler', 'mudskipper'],
    about: 'A small white heron that is only here for part of the day. It flies in as the tide ' +
      'drops and the flat comes out of the water, works the waterline on black legs, and leaves ' +
      'again when the sea covers its hunting ground. It hunts by standing still — a slow wade, a ' +
      'long freeze with the neck folded back, then a strike faster than you can follow.',
    why: 'The egret is the shore\'s reminder that a mudflat is not a closed world. Everything ' +
      'else here spends its whole life between these tide marks; this one arrives from somewhere ' +
      'else, takes what the low tide exposes, and goes. That is how the flat\'s productivity ' +
      'leaves the flat — carried out of it on wings.',
    funFact: 'The yellow feet on black legs are the field mark, and they may also be a tool: ' +
      'egrets vibrate one foot in the sediment to flush hiding prey into the open.',
    structural: [
      { title: 'Dagger bill', text: 'Straight, sharp and pointed all the way out. It is a spear rather than a beak — the whole neck is the throwing arm behind it.' },
      { title: 'Folded S-neck', text: 'Vertebrae stack into a spring at rest and unfold in one stroke, which is what makes the strike so much faster than the wade.' },
      { title: 'Yellow feet, black legs', text: 'The mark that separates a little egret from every other white heron on this coast.' }
    ],
    behavioural: [
      { title: 'Tidal commuter', text: 'Arrives on the ebb, leaves on the flood. Its working day is set by the water, not by the sun — though it does roost at night.' },
      { title: 'Freeze and stab', text: 'Most of a hunting heron\'s time is spent doing nothing at all. The stillness is the hunting; the strike is only the end of it.' },
      { title: 'Foot-stirring', text: 'Vibrates a foot in soft sediment to panic whatever is buried there into moving, then takes it as it runs.' }
    ]
  }
};

/* ============================================================
   FLORA — producers, and the habitat they build. No `sim` keys:
   mangroves stand in the scene as scenery (world.js), and the rest
   are catalogued for the food web while the biofilm / seagrass
   resource grid (§7) is still to come.
   ============================================================ */

var FLORA = {

  plankton: {
    emoji: '🦠', name: 'Plankton', group: 'PRODUCERS',
    kind: 'flora',
    category: 'DRIFTING LIFE', role: 'Producer · suspended in the water',
    zone: 'wherever the water goes',
    trophic: 'PRODUCERS',
    about: 'The cloud of microscopic algae and larvae carried in on every tide. Invisible from the ' +
      'boardwalk, and the single largest food delivery this shore receives — the reason a filter ' +
      'feeder can spend its whole life bolted to one rock and never go hungry.',
    why: 'Plankton is how the open sea feeds the shore. Every high tide is a meal arriving; every ' +
      'barnacle, mussel and sponge on the flat is a machine for taking it back out of the water.',
    funFact: 'Marine phytoplankton produce a large share of the oxygen in every breath you take — ' +
      'roughly half of it, more than all the world\'s rainforests combined.',
    structural: [
      { title: 'Small enough to drift', text: 'Too small to sink fast and too small to swim against a current, so it goes where the water goes — which is up this shore, twice a day.' }
    ],
    behavioural: [
      { title: 'Delivered by the tide', text: 'Its distribution is the tide\'s distribution. Filter feeders do not search for it; they wait for it.' }
    ]
  },

  biofilm: {
    emoji: '🟩', name: 'Diatom Biofilm', group: 'PRODUCERS',
    kind: 'flora',
    category: 'MICROALGAE', role: 'Producer · the invisible pasture',
    zone: 'the whole flat',
    trophic: 'PRODUCERS',
    about: 'The brown-gold sheen on wet mud at low tide is not dirt. It is a living carpet of ' +
      'single-celled diatoms, thin as a coat of paint, that photosynthesises the moment the water ' +
      'clears off it. It is the base of the mudflat food chain and almost nobody sees it.',
    why: 'Grazers and deposit feeders on this shore are all, in the end, eating biofilm. It regrows ' +
      'in hours, which is what lets a mudflat support more animal weight per square metre than ' +
      'most forests.',
    funFact: 'Diatoms build glass houses: each cell sits inside a two-part shell of silica, ' +
      'patterned finely enough that Victorian microscopists used them to test their lenses.',
    structural: [
      { title: 'Silica cell walls', text: 'A glass box around each cell — hard enough that grazers need a mineral-tipped tongue to scrape it up.' },
      { title: 'Sticky mucus mat', text: 'Cells glue themselves together and to the mud. That mat is also what stops the flat washing away on the ebb.' }
    ],
    behavioural: [
      { title: 'Vertical migration', text: 'Diatoms climb to the surface when the tide uncovers the mud in daylight, and sink back down before the water returns. The flat changes colour on a tidal clock.' }
    ]
  },

  seagrass: {
    emoji: '🌿', name: 'Tape Seagrass', group: 'PRODUCERS',
    kind: 'flora',
    category: 'FLOWERING PLANT', role: 'Producer · habitat builder',
    zone: '0.0 – 1.0 m CD, the lagoon',
    trophic: 'PRODUCERS',
    about: 'Not seaweed — a true flowering plant that went back to the sea, with roots, veins and ' +
      'pollen. Chek Jawa\'s lagoon holds metre-long ribbons of tape seagrass that only surface on ' +
      'the lowest spring tides. Everything about the lagoon\'s richness starts here.',
    why: 'Seagrass meadows do three jobs at once: they feed grazers directly, they hold the ' +
      'sediment down so the flat stays a flat, and their blades are the nursery walls that ' +
      'juvenile fish and cuttlefish shelter inside.',
    funFact: 'Seagrass flowers underwater and its pollen drifts on currents instead of wind — and a ' +
      'meadow can lock away carbon far faster per hectare than forest on land.',
    structural: [
      { title: 'Ribbon blades', text: 'Long flexible straps lie flat under a passing current instead of tearing, then stand up again on the slack.' },
      { title: 'Root and rhizome mat', text: 'An underground network binds the sediment. Pull the meadow out and the lagoon floor starts to wash away.' }
    ],
    behavioural: [
      { title: 'Meadow shelter', text: 'The stand itself is the adaptation — dense blades break sightlines and currents, which is why juveniles of so many species are found only inside them.' }
    ]
  },

  spoongrass: {
    emoji: '🍃', name: 'Spoon Seagrass', group: 'PRODUCERS',
    kind: 'flora',
    category: 'FLOWERING PLANT', role: 'Producer · pioneer',
    zone: '0.9 – 1.7 m CD, the sand flat',
    trophic: 'PRODUCERS',
    about: 'The smallest seagrass here and the toughest — paired oval leaves the size of a ' +
      'thumbnail, run out along a creeping stem just under the sand. It grows a whole band higher ' +
      'up the shore than tape seagrass, out on the open flat, where it spends part of every tide ' +
      'lying exposed to the sun.',
    why: 'Spoon seagrass is the coloniser. It takes bare sand nothing else will hold, grows back ' +
      'from almost nothing in days, and by doing so it is the plant that most animals on this ' +
      'shore can actually reach — the lagoon meadow is under water when they are feeding, this ' +
      'is not. It is also the favourite food of dugongs, which plough it in visible trails.',
    funFact: 'It is called dugong grass. A feeding dugong leaves a bare winding furrow through the ' +
      'mat that can still be seen from the air days later — some of the best evidence we have of ' +
      'where they have been.',
    structural: [
      { title: 'Paired oval leaves', text: 'Two spoon-shaped blades to a node, opposed across the runner. Small enough that a drained flat cannot flatten them — they are already flat.' },
      { title: 'Creeping rhizome', text: 'A runner just under the surface sends up a new pair every few centimetres, so the plant spreads sideways across open sand instead of upward.' }
    ],
    behavioural: [
      { title: 'Grows back fastest', text: 'Cropped to stubs it regrows in days, not months. That is the whole strategy — it survives being eaten rather than avoiding it.' },
      { title: 'Wilts and waits', text: 'Exposed at low water the mat dulls olive and lies over; the flood lifts and greens it again within minutes.' }
    ]
  },

  mangrove: {
    emoji: '🌳', name: 'Mangrove', group: 'PRODUCERS',
    kind: 'flora',
    category: 'TREE', role: 'Producer · shore builder',
    zone: 'the landward fringe',
    trophic: 'PRODUCERS',
    symbiosis: ['fiddler'],
    about: 'The trees standing in salt mud at the top of the shore, propped on arching roots with ' +
      'fields of pencil-shaped pneumatophores poking up through the mud around them. They live ' +
      'somewhere no ordinary tree can: waterlogged, airless, salty ground that floods twice a day.',
    why: 'Mangroves manufacture this shore. Their roots trap sediment and build the flat, their ' +
      'fallen leaves rot into the detritus deposit feeders live on, and the tangle absorbs wave ' +
      'energy that would otherwise strip the coast bare.',
    funFact: 'Some mangroves are viviparous — the seed germinates while still hanging on the parent ' +
      'tree, so what drops into the mud is already a living seedling with a head start.',
    structural: [
      { title: 'Pneumatophores', text: 'Pencil roots grow upward out of the mud to breathe at low tide. In airless sediment, roots have to come up for air.' },
      { title: 'Prop roots', text: 'Arching stilts spread the load over soft mud and hold the tree upright where there is nothing solid to grip.' },
      { title: 'Salt handling', text: 'Roots exclude most salt on the way in, and the leaves dump the rest — excreted onto the surface, or dropped with the old leaf.' }
    ],
    behavioural: [
      { title: 'Litter fall', text: 'Shed leaves are the flat\'s food supply. What the tree throws away is what the crabs and snails live on.' },
      { title: 'Housing the burrowers', text: 'Crab burrows aerate the root zone while the tree\'s litter feeds the crabs — each one makes the other\'s ground liveable.' }
    ]
  }
};
