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

  oyster: {
    emoji: '🦪', name: 'Oyster', group: 'HIGH SHORE',
    kind: 'animal', sim: 'oyster',
    category: 'MOLLUSC', role: 'Filter feeder · sessile',
    zone: '1.55 – 2.25 m CD',
    trophic: 'FILTER FEEDERS',
    eats: ['plankton'],
    about: 'A bivalve that cements one valve flat to the rock as a larva and never moves again. The ' +
      'lower valve grows into a deep, ridged bowl; the upper valve is a lighter lid that lifts clear ' +
      'while the animal is covered, drawing water across the gills and straining plankton out of it. ' +
      'A patch of rock worked by oysters for years builds up into a reef of overlapping shells, dead ' +
      'ones and living ones fused together.',
    why: 'One oyster can filter tens of litres of water a day, so a bed of them is a real water-' +
      'treatment plant sitting on the boulders. The reef they build is also a foundation in its own ' +
      'right: every gap and dead shell in it is a hiding place for something smaller.',
    funFact: 'An oyster can change sex, sometimes more than once in its life — it is common for one ' +
      'to spend a season as a male and the next as a female, depending on which is more useful to the ' +
      'population around it.',
    structural: [
      { title: 'Cemented lower valve', text: 'Grown as a deep bowl and glued to the rock for life. It never moves again after the larva settles, so everything about where an oyster bed is was decided on one day, years earlier.' },
      { title: 'Ruffled growing edge', text: 'The shell margin is fluted rather than smooth, which is simply how the animal adds new shell fastest — a straight edge would take longer to grow.' },
      { title: 'Single strong adductor', text: 'One heavy muscle, not two, clamps the valves shut. It is why an oyster is hard to prise open by hand and easy to open with a knife in exactly the right spot.' }
    ],
    behavioural: [
      { title: 'Gaping with the tide', text: 'The barnacle\'s clock again, one band lower down the shore: valves part on the flood, clamp on the ebb.' },
      { title: 'Settling into a bed', text: 'A larva looking for a place to cement itself is drawn to rock that already carries oyster shell — which is why oysters arrive in reefs, not singly.' },
      { title: 'Sealed against the air', text: 'Clamped shut, it holds a pocket of seawater inside exactly like the barnacle does, breathing off that one mouthful until the tide comes back.' }
    ]
  },

  mussel: {
    emoji: '🔵', name: 'Green Mussel', group: 'HIGH SHORE',
    kind: 'animal', sim: 'mussel',
    category: 'MOLLUSC', role: 'Filter feeder · sessile',
    zone: '1.30 – 2.10 m CD',
    trophic: 'FILTER FEEDERS',
    eats: ['plankton'],
    about: 'A long, wedge-shaped bivalve, glossy blue-black over most of the shell and banded in ' +
      'vivid green right at the growing edge — the mark that gives it its name. It does not cement ' +
      'itself down the way an oyster does; instead it spins a beard of tough protein threads, the ' +
      'byssus, from a gland in its foot and glues them to the rock and to its own neighbours, which ' +
      'is how mussels end up packed edge to edge in a bed rather than scattered.',
    why: 'A mussel bed is the densest living surface on this shore\'s rock — individuals packed so ' +
      'tightly that the bed itself becomes the substrate for everything smaller. Like the oyster and ' +
      'the barnacle it also strains plankton out of the water column all day, every day it is covered.',
    funFact: 'The byssus is spun as a liquid that sets hard the instant it touches seawater — the same ' +
      'trick engineers have copied trying to build glues that cure underwater instead of failing in it.',
    structural: [
      { title: 'Byssal thread anchor', text: 'A beard of threads, spun fresh from a gland in the foot, glues the shell to rock and to its neighbours. Unlike an oyster\'s cement, it can be released and re-spun, so a mussel can shift position within a crowded bed.' },
      { title: 'Wedge-shaped shell', text: 'Narrow at the anchored point, broad and rounded at the free end — a shape built to shed wave force along its length instead of catching it broadside.' },
      { title: 'Green growing edge', text: 'New shell is laid down as a band of bright green at the rim before it darkens with age, so the edge of an actively growing mussel is its own field mark.' }
    ],
    behavioural: [
      { title: 'Gaping narrowly with the tide', text: 'The valves part only a little compared to an oyster\'s — enough to filter, never wide enough to risk the gap in a rough current.' },
      { title: 'Packing into a bed', text: 'Byssal threads let a mussel haul itself fractionally closer to its neighbours over time, which is why a bed thickens from a scatter of settlers into a solid mat.' },
      { title: 'Shut on exposure', text: 'The same reflex as every sessile filter feeder on this shore: air means clamp down and wait, whatever else is happening.' }
    ]
  },

  sponge: {
    emoji: '🧽', name: 'Encrusting Sponge', group: 'HIGH SHORE',
    kind: 'animal', sim: 'sponge',
    category: 'PORIFERAN', role: 'Filter feeder · sessile',
    zone: '1.0 – 2.05 m CD, the lowest rock this shore has',
    trophic: 'FILTER FEEDERS',
    eats: ['plankton'],
    about: 'A low orange cushion cemented over the rock, ringed with faint concentric growth bands and ' +
      'dotted with small raised pores — the oscula, where water it has already filtered is pumped back ' +
      'out. It has no gut, no nerves and no muscle to speak of: a sponge is a colony of specialised ' +
      'cells built around one job, pulling water in through thousands of tiny pores and pushing it back ' +
      'out through the oscula, plankton and debris strained out along the way.',
    why: 'Sponges are the quiet end of the same guild as the barnacle, the oyster and the mussel — ' +
      'together they are a machine for taking plankton back out of the water that floods this flat ' +
      'twice a day. A sponge also does it without ever stopping to wait for the tide: it has no valves ' +
      'to shut, so its whole pumping day is however long the water actually covers it.',
    funFact: 'A sponge pressed through a fine cloth, cell by cell, will crawl back together into a ' +
      'living sponge again — one of the only animals that can be taken apart at the cellular level and ' +
      'reassemble itself.',
    structural: [
      { title: 'Concentric growth rings', text: 'A cushion sponge thickens outward from wherever it first settled, and each ring marks a season of growth — the same read a tree stump gives, on an animal instead of a plant.' },
      { title: 'Oscula', text: 'The raised pores where filtered water is pumped back out. A healthy sponge is visibly jetting from these if you watch one closely enough, for long enough.' },
      { title: 'No hard skeleton', text: 'Just a soft, spongy matrix supported by microscopic mineral or protein spicules — nothing here to armour it, which is why it grows only where nothing bothers to eat it.' }
    ],
    behavioural: [
      { title: 'Pumping while covered', text: 'The whole animal is a pump with no moving parts big enough to see: water goes in through the body, comes out through the oscula, continuously, for as long as the tide allows it.' },
      { title: 'Dulling in the air', text: 'Exposed and drying in the sun, the colour visibly flattens and greys before it brightens again on the next flood — the one tell this species gives of doing anything at all.' },
      { title: 'Encrusting the lowest rock', text: 'It favours the most reliably submerged stone on the shore, which on a real flat runs down to the channel edge — the boundary of how long a colony can go without water.' }
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

  hornsnail: {
    emoji: '🌀', name: 'Horn Snail', group: 'HIGH SHORE',
    kind: 'animal', sim: 'hornsnail',
    category: 'MOLLUSC', role: 'Grazer · biofilm scraper',
    zone: '2.0 – 2.6 m CD',
    trophic: 'GRAZERS',
    eats: ['biofilm'],
    symbiosis: ['mangrove'],
    about: 'A long, pointed, mud-brown snail of the mangrove fringe, shaped like a spiral horn ' +
      'and usually found in crowds — dozens or hundreds packed onto a few square metres of damp ' +
      'mud, all rasping the same film. It lives higher up the shore than almost anything else ' +
      'here, on ground the sea only covers on the biggest tides.',
    why: 'Horn snails are the fringe\'s recyclers. They graze the film off mangrove mud and turn ' +
      'fallen leaf litter into something the flat can use, in enough numbers to matter: where ' +
      'they are dense, the mud surface is visibly cleaner, and their droppings are a food supply ' +
      'in their own right.',
    funFact: 'Horn snails are one of the most heavily parasitised animals on any mudflat — flukes ' +
      'use them as a first host and often sterilise them, so a dense bed can be a colony of snails ' +
      'that will never breed again.',
    structural: [
      { title: 'Turreted spire', text: 'Eight or nine whorls drawn out into a long cone. It lives on soft mud where nothing slams it into rock, so it can afford a shape a wave-swept snail could never keep.' },
      { title: 'Beaded ribs', text: 'Rows of small knobs run around each whorl. They break up the outline against wet mud and give a probing bill nothing smooth to grip.' },
      { title: 'Operculum door', text: 'The same hard plate the nerite carries — sealed shut, it keeps the animal wet through hours of exposure at the top of the shore.' }
    ],
    behavioural: [
      { title: 'Grazes on the exposed flat', text: 'The exact inverse of the nerite next to it: the fringe mud stays damp on its own, so this snail feeds while the tide is OUT and stops when the water arrives.' },
      { title: 'Dense aggregations', text: 'It moves as a crowd. A patch is worked out, the whole clump slides onto fresher mud, and what is left behind is a scrubbed halo far bigger than one snail could make.' },
      { title: 'Climbing ahead of the flood', text: 'On a spring tide, when the water finally reaches this band, the population walks up-shore in front of it rather than sitting still and being covered.' }
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

  hermit: {
    emoji: '🦞', name: 'Hermit Crab', group: 'THE MUDFLAT',
    kind: 'animal', sim: 'hermit',
    category: 'CRUSTACEAN', role: 'Scavenger · shell borrower',
    zone: '0.6 – 1.8 m CD',
    trophic: 'SCAVENGERS',
    scavenger: true,
    eats: ['biofilm'],
    symbiosis: ['conch'],
    about: 'A crab with no shell of its own. Its back end is soft, coiled and completely ' +
      'undefended, so it reverses into an empty sea snail\'s shell and carries it everywhere — ' +
      'and because a crab grows and a shell does not, it has to keep finding bigger ones. Most of ' +
      'what a hermit crab does on this flat is look for a better house.',
    why: 'It is the shore\'s clean-up crew: the animal that finds what has died, what has been ' +
      'dropped and what the tide has left, and puts it back into the food chain. It is also the ' +
      'reason an empty shell is never just litter here — every dead snail on this flat is ' +
      'somebody\'s next home, and there are never enough to go round.',
    funFact: 'Hermit crabs queue. Put down one big shell and they will line up beside it smallest ' +
      'to largest, and the moment the biggest one moves in, every crab in the line swaps up at ' +
      'once — a vacancy chain, and one of the few genuinely co-operative housing markets in nature.',
    structural: [
      { title: 'Borrowed shell', text: 'Not part of the animal at all. It is a dead gastropod\'s house, gripped from the inside by a twisted abdomen and a pair of hooked back legs.' },
      { title: 'Asymmetric claws', text: 'The right cheliped is much the larger, and it is a door rather than a weapon: pulled in, it plugs the mouth of the shell exactly.' },
      { title: 'Soft, coiled abdomen', text: 'No armour, and curled to match a spiral shell. It is the reason the whole life history is about housing.' }
    ],
    behavioural: [
      { title: 'Sizing up a shell', text: 'It will not swap blind. An empty shell gets turned over, felt out and measured against its own body before the crab commits to the one moment it is defenceless.' },
      { title: 'Shell fights', text: 'Two crabs reaching the same shell square up and rap their houses together. Size settles it, and the loser walks away and keeps looking.' },
      { title: 'Withdrawing on the ebb', text: 'When the water leaves it pulls in, jams the big claw across the opening and waits — the same answer the nerite and the conch give, with different hardware.' }
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

  horseshoe: {
    emoji: '🪖', name: 'Mangrove Horseshoe Crab', group: 'THE MUDFLAT',
    kind: 'animal', sim: 'horseshoe',
    category: 'CHELICERATE', role: 'Deposit feeder · tidal commuter',
    zone: '1.80 – 2.00 m CD, the upper mudflat below the mangroves',
    trophic: 'DEPOSIT FEEDERS',
    eats: [],
    about: 'Not a crab at all, and not a crustacean: its closest living relatives are spiders and ' +
      'scorpions. A smooth domed carapace shaped like a horseshoe covers the whole front of the ' +
      'animal, a smaller spined plate hinges behind it, and a long rigid tail spike trails off the ' +
      'back. Ten legs work underneath, hidden, and it ploughs through the top centimetre of mud ' +
      'rather than walking over it — so what you usually find is a furrow, with the animal at the end.',
    why: 'Every other animal on this shore holds a band and stays in it. This one commutes across ' +
      'its own: it works up-shore while the flood is over it and turns back down as soon as the ' +
      'water starts to leave, so where it is at any moment is a reading of the tide rather than a ' +
      'place it lives. It loses that race often — the water falls faster than anything this slow ' +
      'can walk — and a caught-out horseshoe crab buried in the mud with its furrow leading up to ' +
      'it is the state you will most often find it in.',
    funFact: 'Its blood is blue, and it clots around bacterial toxins on contact. That reaction was ' +
      'turned into the standard purity test for injectable medicine, so nearly every vaccine and ' +
      'implant made in the last fifty years was cleared for use by an extract of this animal.',
    structural: [
      { title: 'The horseshoe carapace', text: 'A single domed plate arching over the head and thorax, cut off square at the back with a spine trailing from each corner — a shape that lets it plough forward through sediment and shrug water off from any direction.' },
      { title: 'The telson', text: 'The tail spike is not a sting and not a rudder. It is a lever: flipped onto its back by a wave, the animal drives the telson into the mud and levers itself over.' },
      { title: 'Ten legs, all hidden', text: 'Five pairs, entirely enclosed under the carapace, each ending in a small pincer. Nothing of the walking apparatus is visible from above — part of why it reads as a shell moving under its own power.' }
    ],
    behavioural: [
      { title: 'Commuting with the tide', text: 'It works up-shore on the flood and back down on the ebb, moving with the water rather than holding a fixed patch — horseshoe crabs run on an internal tidal clock and do not have to feel the water to know which way it is going.' },
      { title: 'Ploughing a furrow', text: 'It pushes through the surface mud instead of walking on it, leaving a shallow turned trench with a low levee either side — the trail is usually spotted long before the animal is.' },
      { title: 'Burying when stranded', text: 'Caught by the ebb, it works itself down until only the rim of the carapace shows and waits there for the next flood, which it can do for hours without harm.' }
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

  sandstar: {
    emoji: '✳️', name: 'Sand Star', group: 'LOW WATER',
    kind: 'animal', sim: 'sandstar',
    category: 'ECHINODERM', role: 'Predator · buried hunter',
    zone: '0.15 – 1.0 m CD',
    trophic: 'PREDATORS',
    eats: ['conch', 'sanddollar'],
    about: 'The other sea star on this flat, and the one nobody photographs. It is flat, sand-' +
      'coloured and fringed down every arm edge with a comb of pale spines, and it spends most of ' +
      'its life just under the surface. When it does come up it moves — for a sea star, fast — in ' +
      'long straight runs across the sand, stopping to dig with its arm tips and then carrying on.',
    why: 'It is the answer to what a sea star does when it is not a showpiece. The knobbly is rare, ' +
      'enormous and slow, and it survives by being armoured; this one is common, small and quick, ' +
      'and it survives by not being seen. Between them they cover both ways of being an echinoderm ' +
      'on an open flat.',
    funFact: 'It swallows its prey whole — unlike most sea stars, which push their stomach out over ' +
      'a meal, a sand star has no suckers on its tube feet and simply engulfs small buried shells ' +
      'and digests them inside.',
    structural: [
      { title: 'Marginal spine comb', text: 'A fringe of flattened spines runs down both edges of every arm. They are shovels: the animal digs itself under with them, and when it is buried they are the only part still breaking the surface.' },
      { title: 'Flat, straight-sided arms', text: 'Triangular blades rather than the knobbly\'s thick cones. Nothing on this animal stands proud enough to catch a current or a bird\'s eye.' },
      { title: 'Pointed tube feet', text: 'No suckers — it cannot grip rock or prise a shell open. Those feet are for walking on and digging into loose sand, which is the only ground it lives on.' }
    ],
    behavioural: [
      { title: 'Quartering the flat', text: 'It searches in long, nearly straight lines rather than wandering. Cover ground, stop, dig, carry on — the same pattern a dog works a field with.' },
      { title: 'Hunting by digging', text: 'Prey is buried, so the hunt looks like excavation: the disc humps up and the arm tips curl down into the sediment while it feels around underneath itself.' },
      { title: 'Vanishing', text: 'Threatened, finished, or left by the tide, it works straight down into the sand. It does not lie out on a drained flat the way the knobbly does — being visible is not something this animal does.' }
    ]
  },

  penshell: {
    emoji: '🔺', name: 'Pen Shell', group: 'LOW WATER',
    kind: 'animal', sim: 'penshell',
    category: 'MOLLUSC', role: 'Filter feeder · sessile',
    zone: '0.1 – 0.9 m CD',
    trophic: 'FILTER FEEDERS',
    eats: ['plankton'],
    about: 'A big fan-shaped bivalve that lives standing on its point, buried two thirds deep in ' +
      'open sand with its wide gaping end held up into the water. It is anchored by a beard of ' +
      'tough threads it spins itself, and it can be as long as your forearm — the largest shellfish ' +
      'on this flat, and one you can walk past without seeing.',
    why: 'A pen shell is a filter feeder that does not need a rock. It builds its own foundation ' +
      'out of open sediment, which is how the guild reaches the middle of a bare sand flat at all — ' +
      'and standing up out of the bottom, it becomes a surface in its own right: algae, barnacles ' +
      'and small animals settle on its exposed edge, so one shell seeds a patch of hard ground ' +
      'where there was none.',
    funFact: 'The threads that anchor it, byssus, were once woven into "sea silk" — a cloth so ' +
      'fine and so rare that a pair of gloves made from it could be folded into a walnut shell.',
    structural: [
      { title: 'Wedge standing point-down', text: 'Two long triangular valves, buried at the narrow end. The posture does all the work: it is anchored, upright, and its intake is held clear of the sediment it would otherwise be choked by.' },
      { title: 'Byssal anchor', text: 'A beard of protein threads spun onto sand grains and shell fragments below the surface. It is how a heavy animal stays upright in ground that offers nothing to hold.' },
      { title: 'Encrusted exposed edge', text: 'The third of the shell above the sand is a wall in the current, so everything that needs hard ground settles on it. An old pen shell carries a whole community on its rim.' }
    ],
    behavioural: [
      { title: 'Gaping with the tide', text: 'It can only feed while covered, so the valves part when the water arrives and clamp when it leaves — the barnacle\'s clock, one band lower down the shore.' },
      { title: 'Clapping shut', text: 'Anything passing close makes it slam. It is the only move a sessile animal has, and it costs it a few seconds of feeding every time something crosses over it.' },
      { title: 'Never moving again', text: 'It settles once as a larva and that spot is the rest of its life. Everything about where a pen shell bed is was decided by a current years earlier.' }
    ]
  },

  moonsnail: {
    emoji: '🌙', name: 'Moon Snail', group: 'LOW WATER',
    kind: 'animal', sim: 'moonsnail',
    category: 'MOLLUSC', role: 'Predator · buried hunter',
    zone: '0.05 – 0.85 m CD',
    trophic: 'PREDATORS',
    eats: ['penshell', 'oyster', 'mussel'],
    about: 'A smooth, pale, almost featureless globe of a shell, ploughing just under the surface with ' +
      'a foot big enough to spread out and swallow the whole animal from view. It is this shore\'s ' +
      'specialist bivalve hunter: find something worth the effort and the foot balloons out over it, ' +
      'the radula rasps a neat round hole through the shell, and the snail feeds through the hole it ' +
      'made rather than prising the animal open.',
    why: 'The pen shell, the oyster and the mussel are this flat\'s three bivalves, and a moon snail is ' +
      'the reason none of them is safe just for being a shell. A predator that specialises on one kind ' +
      'of prey shapes where that prey can survive — a real bivalve bed always keeps half an eye on the ' +
      'sand for the smooth, low mound of one of these working past.',
    funFact: 'The hole it drills is left behind as evidence long after the snail has moved on: a clean, ' +
      'countersunk circle, bevelled like a countersunk screw hole, that beachcombers use to tell a moon ' +
      'snail kill from a shell that simply died and washed in empty.',
    structural: [
      { title: 'Smooth globular shell', text: 'No spire worth mentioning and no surface ornament at all — a shape built to plough through clean sand without catching on anything, the opposite problem to every rock-dwelling snail on this shore.' },
      { title: 'Enormous foot', text: 'Inflated with seawater until it can spread wide enough to wrap an entire bivalve, pinning it still while the shell underneath gets to work.' },
      { title: 'Drilling radula', text: 'A ribbon of teeth combined with an acid gland bores a precise round hole through solid shell — slow, but it needs no crack or gap to get in through.' }
    ],
    behavioural: [
      { title: 'Ploughing the sand', text: 'Mostly hidden, moving as a low travelling hump — the same trick the sand dollar uses to cross open ground, on a hunter instead of a deposit feeder.' },
      { title: 'Drilling a bivalve', text: 'Found prey stops the plough entirely: the foot spreads out over the shell and stays there while the hole is bored, however long that takes.' },
      { title: 'Laying a sand collar', text: 'A female moon snail cements a mix of mucus, sand and eggs into a ring the shape of her own shell. It is one of the commonest, oddest things a spring low uncovers, and most people who find one have no idea what laid it.' }
    ]
  },

  swimmingcrab: {
    emoji: '🏊', name: 'Swimming Crab', group: 'LOW WATER',
    kind: 'animal', sim: 'swimmingcrab',
    category: 'CRUSTACEAN', role: 'Predator · active swimmer',
    zone: '-0.15 – 0.85 m CD, the lagoon floor to the sandbar',
    trophic: 'PREDATORS',
    eats: ['penshell', 'oyster', 'mussel', 'fiddler'],
    about: 'A flattened, hexagonal crab with a sharp spine jutting from each side of its shell, and ' +
      'the back-most pair of legs on each side widened into a flat oval paddle. It is the shore\'s ' +
      'most mobile predator: mostly it paddles, gliding a hand\'s width above the sand on quick, ' +
      'sculling strokes of those paddles, dropping down every so often to crawl the bottom on its ' +
      'other six legs the ordinary way a crab does.',
    why: 'This is the fiddler crab turned inside out — an air-breather that shuts down on the flood ' +
      'meets a swimmer that shuts down on the ebb, and between the two the same falling tide is ' +
      'shown working two completely different bodies for opposite reasons. It also covers ground no ' +
      'walking animal on this shore can: a paddling crab crosses the lagoon in the time a fiddler ' +
      'spends walking to the next puddle.',
    funFact: 'That last pair of paddle-tipped legs is also a spare set of oars if the crab loses one: ' +
      'unlike most of its legs, which are true walking legs first, the paddle pair is built for ' +
      'swimming alone, so a portunid missing a walking leg can still cross open water at nearly full speed.',
    structural: [
      { title: 'Lateral shell spines', text: 'A sharp point on each side of the carapace, at its widest — a field mark shared by every member of this family and a real weapon against anything that tries to swallow one sideways.' },
      { title: 'Paddle-tipped hind legs', text: 'The fifth pair is flattened into a broad, thin oval instead of tapering to a walking point, turning a leg built for the sand into a blade built for water.' },
      { title: 'A flattened, hydrodynamic shell', text: 'Wider than it is deep and nearly flat in cross-section — a shape built to slip sideways through water with the least possible drag.' }
    ],
    behavioural: [
      { title: 'Paddling', text: 'A fast, broad power stroke pushes the paddle back edge-on to the water; the recovery lifts and twists the blade nearly flat to cut resistance on the way forward — a rowing cycle, not a walking one.' },
      { title: 'Switching to a crawl', text: 'It drops to the bottom and walks sideways on its remaining six legs exactly like any other crab, in bouts between swims — paddling everywhere, all the time, would be exhausting even for this animal.' },
      { title: 'Burying flush with the sand', text: 'Left by the ebb, it digs itself down until only its eyes break the surface and waits there for the flood — the same trick the sand star and the moon snail use, on a crab instead of an echinoderm or a snail.' }
    ]
  },

  seacucumber: {
    emoji: '🥒', name: 'Sea Cucumber', group: 'LOW WATER',
    kind: 'animal', sim: 'seacucumber',
    category: 'ECHINODERM', role: 'Deposit feeder · sediment processor',
    zone: '0.05 – 0.9 m CD',
    trophic: 'DEPOSIT FEEDERS',
    eats: ['biofilm'],
    about: 'A dark, warty sausage lying on the lagoon floor, working a ring of short branched ' +
      'tentacles over the sand and stuffing them one after another into its mouth. It eats the ' +
      'sediment, takes the living film and detritus off it, and puts the cleaned grains back out ' +
      'behind itself as a coil. It is a sea star that gave up its arms and its symmetry to do this.',
    why: 'Sea cucumbers are how a lagoon floor gets cleaned. A bed of them turns over the top ' +
      'centimetre of sediment again and again, which keeps it oxygenated and stops the organic ' +
      'matter that settles out of the water from going foul. Their casts are the clearest evidence ' +
      'on any flat that something down there is working.',
    funFact: 'Threatened, some sea cucumbers eject their own internal organs at the attacker and ' +
      'crawl away — and then regrow the lot over a few weeks.',
    structural: [
      { title: 'Tentacle crown', text: 'Ten short branched fronds ring the mouth. They are modified tube feet run on water pressure, and they work in sequence — out to the sand, wipe, and into the mouth.' },
      { title: 'No skeleton', text: 'The body wall is muscle and collagen with only microscopic plates in it, so the animal can lengthen, shorten and squeeze anywhere it likes. Contracted, it is a different shape entirely.' },
      { title: 'Sole of tube feet', text: 'The underside carries the feet it walks on; the top carries soft papillae instead. Even without arms it is still a radial animal wearing a flat side.' }
    ],
    behavioural: [
      { title: 'Working a patch out', text: 'It stops where the sediment is rich, sweeps everything in reach, and only moves on when there is nothing left worth taking — so its track is a series of worked spots joined by short crawls.' },
      { title: 'Leaving casts', text: 'Cleaned sediment comes out in coils behind it. The trail is the receipt for what it has eaten, and it is usually easier to find than the animal.' },
      { title: 'Contracting when stranded', text: 'It cannot follow the water and it cannot dig. Left dry it pulls its crown inside and draws itself into a short fat lump, and waits there for the flood.' }
    ]
  },

  sanddollar: {
    emoji: '🪙', name: 'Sand Dollar', group: 'LOW WATER',
    kind: 'animal', sim: 'sanddollar',
    category: 'ECHINODERM', role: 'Deposit feeder · sand plougher',
    zone: '0.05 – 0.95 m CD',
    trophic: 'DEPOSIT FEEDERS',
    eats: ['biofilm'],
    about: 'A flattened sea urchin that lives inside the sand rather than on it. It ploughs along ' +
      'a centimetre under the surface at about a centimetre a second, sorting edible grains out of ' +
      'the sediment with thousands of tiny spines and tube feet, so for most of the tide the only ' +
      'sign of one is a low mound of sand moving very slowly across the flat.',
    why: 'A dense bed of sand dollars turns the top few centimetres of a sand flat over ' +
      'continuously — the same job the fiddler crab does on exposed mud, done underwater and out ' +
      'of sight. They are also a good report card on the sediment: they need clean, well-sorted ' +
      'sand, and they go first when a flat silts up.',
    funFact: 'The five-petalled pattern on its back is not decoration — each "petal" is a field of ' +
      'flattened tube feet used purely for breathing, so the animal is wearing its gills as a ' +
      'flower.',
    structural: [
      { title: 'Flattened test', text: 'A rigid disc of fused plates, thin enough to slip through sand and heavy enough that a current cannot lift it off the bottom.' },
      { title: 'Petalodium', text: 'Five petal-shaped fields of respiratory tube feet on the upper surface — the pattern everybody recognises, and the reason it can breathe while buried.' },
      { title: 'Spine carpet', text: 'The whole animal is furred with short movable spines. They are the legs, the digging tools and the conveyor that walks food to the mouth underneath.' }
    ],
    behavioural: [
      { title: 'Ploughing under the surface', text: 'It travels buried, pushing a low mound of sand ahead of and over itself. What the eye follows is the sediment, not the animal.' },
      { title: 'Stopping on rich sand', text: 'Where the sediment is worth working it simply stops and processes it. Moving costs more than staying, so it only moves when the sand runs poor.' },
      { title: 'Lying out on a spring low', text: 'It cannot follow the water off the flat, so when the lagoon drains it settles, the sand comes off its back, and for that one low tide it is a visible animal.' }
    ]
  },

  anemone: {
    emoji: '🏵️', name: 'Carpet Anemone', group: 'LOW WATER',
    kind: 'animal', sim: 'anemone',
    category: 'CNIDARIAN', role: 'Predator · sessile',
    zone: '0.25 – 1.15 m CD, the low sand flat',
    trophic: 'PREDATORS',
    eats: ['plankton', 'swimmingcrab'],
    symbiosis: ['anemonefish'],
    about: 'Haddon\'s carpet anemone is a soft-bodied relative of corals and jellyfish that anchors ' +
      'its column deep in the sand and spreads an oral disc up to half a metre across on the ' +
      'surface. The disc is carpeted with thousands of short, blunt, extremely sticky tentacles, ' +
      'each loaded with stinging cells, and the mouth sits in the middle of it. It does not chase ' +
      'anything. It lies open and waits for the shore to walk onto it.',
    why: 'This is the shore\'s ambush predator, and the clearest case here of an animal that has ' +
      'traded movement for patience — every other hunter on this flat pays to travel. It is also a ' +
      'habitat in its own right: the sting that makes it dangerous to everything else makes the ' +
      'space above it the safest square metre on the flat for the one fish that can live in it.',
    funFact: 'Half its food is not caught at all. Like a coral, it farms single-celled algae inside ' +
      'its own tissues and lives partly on the sugars they make — which is why it needs to lie in ' +
      'the light, and why it is the colour it is.',
    structural: [
      { title: 'Carpet of stinging tentacles', text: 'Thousands of short blunt tentacles cover the whole disc, each armed with harpoon cells that fire on contact. Touch one with a finger and it grips — this is one of the few anemones that can hold a human hand.' },
      { title: 'Buried column', text: 'The trunk of the animal is anchored under the sand, out of the sun and out of reach. What you see on the surface is the top of it.' },
      { title: 'Ruffled margin', text: 'The rim of the disc folds into a wavy edge rather than a circle, which is how a soft animal packs more feeding surface into the same footprint.' }
    ],
    behavioural: [
      { title: 'Closing on contact', text: 'Anything that walks across the disc makes it purse shut over the top. A sand star or a swimming crab crossing it will set the whole animal folding.' },
      { title: 'Contracting on the ebb', text: 'When the water leaves it pulls itself down into the sand until only the orange column shows — a wrinkled blob, and nothing like the carpet it was an hour before.' },
      { title: 'Sheltering a guest', text: 'The same tentacles that clench on a crab close loosely around an anemonefish and hold it. The difference is chemical, and it is the whole basis of the partnership.' }
    ]
  },

  anemonefish: {
    emoji: '🐠', name: 'Anemonefish', group: 'LOW WATER',
    kind: 'animal', sim: 'anemonefish',
    category: 'FISH', role: 'Omnivore · anemone dweller',
    zone: '0.25 – 1.15 m CD, over its host anemone',
    trophic: 'GRAZERS',
    eats: ['plankton', 'ulva'],
    symbiosis: ['anemone'],
    about: 'A small, deep-bodied orange damselfish barred three times in white, which spends its ' +
      'entire adult life inside about a metre of one carpet anemone. A layer of mucus on its skin ' +
      'stops the anemone\'s stinging cells from firing, so it can swim into a carpet that would ' +
      'hold anything else fast. It rows almost everywhere on its pectoral fins and only uses its ' +
      'tail to bolt.',
    why: 'Nothing else on this shore is brightly coloured, because nothing else on this shore can ' +
      'afford to be. An anemonefish advertises itself in orange precisely because it is never more ' +
      'than a second from a host nothing can follow it into — the colour is a statement about the ' +
      'anemone, not about the fish.',
    funFact: 'Every anemonefish is born male. The largest fish in a group becomes the female, and if ' +
      'she dies the largest male changes sex and takes her place — the queue simply moves up one.',
    structural: [
      { title: 'Mucus coat', text: 'A chemical film over the skin reads to the anemone as "self", so the stinging cells never fire. A fish kept away from anemones long enough loses the coat and gets stung on its way back in.' },
      { title: 'Three white bars', text: 'A head bar, a tail bar and a middle bar with a broad wedge pointing forward down the flank — each edged in black. The wedge is what tells this species from its near relatives.' },
      { title: 'Rowing pectorals', text: 'Broad paddle-shaped pectoral fins beat alternately and do nearly all the swimming. It is built to hover in one spot, not to cover ground.' }
    ],
    behavioural: [
      { title: 'Never leaving home', text: 'It holds station a body length above the anemone and returns to the tentacles every few seconds all day. Everything it does is measured from one address.' },
      { title: 'Diving from a passing crab', text: 'A swimming crab paddling close sends it straight down into the carpet, where nothing without a mucus coat can follow. The same crab makes the anemone clench — the host closes on the intruder and cradles the guest in the same movement.' },
      { title: 'Leaving on the ebb', text: 'When the water over its anemone runs too shallow it withdraws to the channel and comes back on the flood — one of only two animals here that is genuinely off the shore some of the time.' }
    ]
  },

  /* The goby and the mudskipper are kept side by side in this file on
     purpose. They are close relatives filling opposite roles — one is
     a fish that means to be out of the water, the other is a fish that
     is in trouble the moment it is — and the pair only makes sense
     read together. §24 replaced one with the other; §40 put the first
     one back alongside it. */
  goby: {
    emoji: '🐡', name: 'Sand Goby', group: 'LOW WATER',
    kind: 'animal', sim: 'goby',
    category: 'FISH', role: 'Predator · tidal transient',
    zone: '0.10 – 1.75 m CD, the sand flat down to the channel',
    trophic: 'PREDATORS',
    /* Nothing, deliberately — the same call the horseshoe crab makes.
       What a small goby actually eats is amphipods, copepods and worms
       out of the top centimetre of sand, and none of that infauna is
       modelled here. Listing plankton instead would put a false link in
       the web to make the node look connected. */
    eats: [],
    about: 'A small bottom-living fish, sand-coloured with four dark saddles down its back and a ' +
      'black spot at the root of its tail. It spends its life on the flat rather than in the water ' +
      'over it — a short dash, then down on the sand again, propped on a sucker under its chest. ' +
      'It rides the tide up the shore to feed and follows the water back down on the ebb, and the ' +
      'ones that misjudge it spend low water in a pool.',
    why: 'This is the animal that shows what a tide pool is FOR. Every other species here treats ' +
      'the low tide as weather to be sat out; a goby caught above the falling waterline has to ' +
      'find standing water or die in the open, so the basins the shore leaves behind stop being ' +
      'scenery and become the difference between one outcome and the other. It is also the only ' +
      'animal on this flat that can be killed on it.',
    funFact: 'A goby stranded between pools can jump to the next one without seeing it. It learns ' +
      'the layout of the rocks by swimming over them at high tide and remembers it well enough to ' +
      'leap blind hours later — one of the few clear cases of a fish carrying a map in its head.',
    structural: [
      { title: 'Fused pelvic disc', text: 'The two pelvic fins are joined into a single oval sucker under the chest. It is the character that defines the whole goby family, and it is what lets the fish hold its place on the bottom in moving water instead of being washed about.' },
      { title: 'Saddled sand camouflage', text: 'Pale olive over a white belly, broken by four dark blotches and a spot at the tail root. Against wet sand in shallow water the outline disappears, which matters more to a fish stuck in a pool than to one in the sea.' },
      { title: 'Two dorsal fins', text: 'A short spiny flag in front and a long low one behind it. The front fin goes up when the fish settles and clamps flat when it bolts.' }
    ],
    behavioural: [
      { title: 'Following the water out', text: 'As the tide falls it stops feeding and moves down the gradient with the waterline. It is not heading anywhere in particular — it is simply staying wet, and that is enough to get most of them off the flat.' },
      { title: 'Caught in a pool', text: 'A fish that happens to be over a basin never feels the water go, because the basin holds it. The sea leaves without it, and low tide is then spent in a few square metres with a heron working the flat outside.' },
      { title: 'Jumping between pools', text: 'When a small pool turns warm and stale it goes over the rim and leaps to a bigger one, aiming at water it cannot see from where it starts.' }
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

  octopus: {
    emoji: '🐙', name: 'Day Octopus', group: 'LOW WATER',
    kind: 'animal', sim: 'octopus',
    category: 'MOLLUSC', role: 'Predator · den holder',
    zone: '−0.6 – 0.8 m CD, the channel and the runnel, out to the lagoon on the flood',
    trophic: 'PREDATORS',
    /* Two, not four. The oyster and the mussel are textbook octopus
       food and both live at 1.30–2.10 m CD on boulders that dry at
       every low tide, which puts them out of reach of an animal that
       cannot leave the water. Listing them would draw two links on the
       web that nothing in the sim can ever traverse. */
    eats: ['swimmingcrab', 'penshell'],
    about: 'A large, boneless mollusc with eight arms and no fixed shape, which lives in a den ' +
      'under a rock or in the sand and comes out over the flat to hunt when there is water enough ' +
      'to cover it. It crawls arms-first, feeling ahead over the bottom, and throws the web ' +
      'between its arms over anything it finds like a net. Going home it turns round and jets, ' +
      'mantle first, at five times the speed it came out at.',
    why: 'This is the only animal on the shore that changes what it looks like on purpose. ' +
      'Everything else here is the colour it is; an octopus repaints itself in under a second — ' +
      'dark red-brown in the hole, sand-pale on the flat, blanched white the instant it lands on ' +
      'something — and it is doing it with skin cells it controls directly, with no brain step in ' +
      'between worth speaking of. It is also the shore\'s clearest case of an address: the pile of ' +
      'broken shells outside the door is a record of every meal it has brought home.',
    funFact: 'It is colour-blind. Every cell in the eye sees the same single wavelength, and the ' +
      'animal still matches the colour of the rock it is sitting on — probably by reading colour ' +
      'through the skin itself, which is scattered with the same light-sensitive protein its ' +
      'retina uses.',
    structural: [
      { title: 'The mantle is not the head', text: 'The big bag is the body, and it is BEHIND the head. The head is the short section carrying the eyes, between the bag and the arms — which is why an octopus swimming away from you looks like it is going backwards, and is.' },
      { title: 'Horizontal slit pupil', text: 'The pupil stays level however the animal rolls, held there by organs of balance in the head. A level slit across a lumpy grey animal is usually the first thing that gives one away.' },
      { title: 'Interbrachial web', text: 'A membrane slung between the bases of the eight arms. Collapsed it is invisible; thrown open it is a net wider than the animal, and it is how most things get caught.' },
      { title: 'Two thousand suckers', text: 'Each one grips and tastes at the same time. An arm exploring a crevice is reading the chemistry of what is in it before any part of the animal has seen inside.' }
    ],
    behavioural: [
      { title: 'Den fidelity', text: 'It keeps one den and comes back to the same one, trip after trip. Nothing else on this shore has a home it chose — the fiddler re-digs its burrow anywhere and the swimming crab digs in wherever the ebb catches it.' },
      { title: 'The midden', text: 'Empty shells and crab carapaces are carried out and dropped at the door. The heap outside a den is how a diver finds one, and how long the pile is tells you how long the animal has been there.' },
      { title: 'Web-pounce', text: 'It crawls up on a crab with the arms spread low, then throws itself forward and drops the web over it. The animal blanches white on contact, which is the only moment it is not trying to be invisible.' },
      { title: 'Jetting home', text: 'Coming back is a different animal from going out: it turns round, streams the arms behind it, and drives water out of the funnel — mantle-first at five times crawling speed.' },
      { title: 'Inking at an otter', text: 'A romp coming over the flat is the one thing on this shore that will eat an octopus. It goes almost black, throws a cloud of ink where it was standing, and is gone — the ink is a decoy, and the darkening is what makes the decoy the brighter of the two things to look at.' }
    ]
  },

  /* ---------------- the visitors ----------------
     Two of them, and they are opposites. The egret drops in behind the
     falling water and is pushed off by the flood; the otter swims in
     ON the flood and leaves as the flat drains. Between them the shore
     is visited from outside at both ends of every tide by two animals
     that never meet. */

  otter: {
    emoji: '🦦', name: 'Smooth-coated Otter', group: 'THE VISITORS',
    kind: 'animal', sim: 'otter',
    category: 'MAMMAL', role: 'Apex predator · visitor',
    zone: 'the flooded flat, the lagoon and the channel, on a rising tide',
    trophic: 'APEX PREDATORS',
    /* The goby only. It is the one species here that can actually die,
       and it is the one the romp is built to catch. A real romp also
       takes crabs, and the swimming crab is on the right band at the
       right tide — but adding it would mean a second kill path into a
       population with no mortality bookkeeping at all, which is a
       bigger decision than a food-web row. */
    eats: ['goby'],
    about: 'The largest animal on this shore and the only mammal on it. Smooth-coated otters ' +
      'live in family groups of four to eight — a romp — and they do everything together: they ' +
      'arrive together on the flood, swim the flooded flat abreast, dive as a group when they ' +
      'find fish, and haul out on a sandbar to lie in a heap and dry off. They are gone again ' +
      'before the water is.',
    why: 'Everything else on this shore is a scatter of individuals that happen to share a ' +
      'species. A romp is one animal made of six, and it is the only thing here where the GROUP ' +
      'is the unit that makes decisions. It is also the shore\'s only apex predator — nothing ' +
      'eats an otter — and the first one whose hunting is a real death rather than a ' +
      'demonstration that stops short.',
    funFact: 'Singapore\'s otters were effectively gone by the 1970s and came back on their own ' +
      'in the 1990s, swimming down the Johor Strait. They now live in the middle of the city, and ' +
      'the families are individually known and named by the people who follow them.',
    structural: [
      { title: 'The tail is the rudder', text: 'Almost a third of the animal is tail, thick at the base and tapering to a point, and it does most of the steering. On a real smooth-coated otter it is also flattened top-to-bottom rather than round — the field mark that separates this species from every other otter in the region — which the model here does not show: it is built from a reference mesh with a round tail.' },
      { title: 'Webbed feet with claws', text: 'Full webs between the toes for driving, and claws on the ends for holding a fish that is trying very hard not to be held.' },
      { title: 'Two coats', text: 'A short sleek outer coat over dense underfur that never gets wet. The animal is insulated by trapped air rather than by fat, which is why a wet otter looks half the size of a dry one.' },
      { title: 'Cream throat', text: 'The pale bib under the chin is the field mark, and in a river of brown backs it is the only part of a swimming romp you can count heads by.' }
    ],
    behavioural: [
      { title: 'Hunting as a family', text: 'The romp swims abreast and drives fish ahead of it. An individual breaks formation to chase something, catches it, and comes back — the group never waits, and it never leaves anybody either.' },
      { title: 'Eating at the surface', text: 'It does not swallow underwater. A caught fish is brought up and eaten floating on the surface, head first, which is the only moment an otter here holds still.' },
      { title: 'Hauling out', text: 'Between bouts the whole family comes out onto a bar just awash, rolls in the sand, grooms and dries off. Grooming is not vanity — the coat only insulates while the underfur is dry.' },
      { title: 'Arriving on the flood', text: 'They need water to swim in, so they come up with the tide and leave as it drains. That is the exact opposite of the egret\'s day, and the two are almost never on the shore together.' }
    ]
  },


  egret: {
    emoji: '🕊️', name: 'Little Egret', group: 'THE VISITORS',
    kind: 'animal', sim: 'egret',
    category: 'BIRD', role: 'Predator · visitor',
    zone: '0.9 – 2.3 m CD, while it is dry',
    trophic: 'PREDATORS',
    /* The goby joined this list in §40, and it is the only one of the
       three the bird actually catches. A fiddler crab bolts down its
       burrow and a mudskipper walks away; a goby cut off in a pool at
       low water has nowhere to be. */
    eats: ['fiddler', 'mudskipper', 'goby'],
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
    kind: 'flora', sim: 'seagrass',
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
    kind: 'flora', sim: 'spoongrass',
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

  ulva: {
    emoji: '🥬', name: 'Sea Lettuce', group: 'PRODUCERS',
    kind: 'flora', sim: 'ulva',
    category: 'GREEN ALGA', role: 'Producer · rock coloniser',
    zone: '1.55 – 2.45 m CD, mid flat into the barnacle boulders',
    trophic: 'PRODUCERS',
    about: 'A bright green sheet only two cells thick, with no proper root — it grips whatever it ' +
      'lands on, sand or bare stone, and holds. It grows a whole band higher than the two ' +
      'seagrasses below it, up where the flat turns to boulders, and is the first plant here that ' +
      'does not care which one it is standing on.',
    why: 'Every producer before it roots in something soft. Sea lettuce does not need to, so it is ' +
      'the first green thing living in the barnacle\'s own band — a rock grazer up there finally ' +
      'has a plant to eat, not just a film of algae scraped off stone.',
    funFact: 'It is edible, and eaten — the same genus turns up in sea vegetable salads. A sheet can ' +
      'grow from a single detached cell, which is part of why it colonises so fast after a patch is ' +
      'stripped bare.',
    structural: [
      { title: 'A sheet, not a blade', text: 'Two cell layers with nothing between them — there is no thickness worth having a skeleton for, just a ruffled green membrane.' },
      { title: 'Holdfast on anything', text: 'No rhizome, no runner — it clings by contact alone, which is what lets it take bare rock as readily as sand.' }
    ],
    behavioural: [
      { title: 'Bleaches, does not dull', text: 'Sun on an exposed sheet drives the chlorophyll pale toward a washed-out yellow-green rather than darkening it — the opposite tide beat to the seagrasses beside it.' },
      { title: 'Shrivels dry, billows wet', text: 'A drained sheet shrinks in on itself against whatever it is lying on; resubmerged, it swells and ripples across its width in the current.' }
    ]
  },

  sargassum: {
    emoji: '🟤', name: 'Sargassum', group: 'PRODUCERS',
    kind: 'flora', sim: 'sargassum',
    category: 'BROWN ALGA', role: 'Producer · the boulder canopy',
    zone: '1.45 – 2.35 m CD, the barnacle boulders',
    trophic: 'PRODUCERS',
    about: 'The tallest thing on this shore that is not a tree — a branching brown seaweed up ' +
      'to a metre long, gripping a boulder with a holdfast and standing upright on strings of ' +
      'gas-filled bladders once the tide covers it. Every other producer here lies ankle-high or ' +
      'flatter; this one has a silhouette you can pick out across the flat.',
    why: 'Boulders in the barnacle band are otherwise bare stone between low tides. Sargassum ' +
      'turns them into a canopy — the one plant on this shore built to be seen from a distance ' +
      'rather than found underfoot, and cover for anything small enough to shelter in the fronds.',
    funFact: 'Its floating rafts, torn loose and carried out to sea, became a sea of their own — ' +
      'the Sargasso Sea is named for drifting mats of this genus, and a whole community of fish, ' +
      'crabs and shrimp lives nowhere else but clinging to them.',
    structural: [
      { title: 'Air bladders', text: 'Small gas-filled floats strung along every frond hold the whole plant upright in the current — the buoyancy that lifts a metre of seaweed off the rock is a handful of bubbles.' },
      { title: 'Holdfast on stone', text: 'A gripping base fixes to the boulder itself, not to sand — the same rock the barnacles and mussels already crowd, one band higher than any other producer here reaches.' }
    ],
    behavioural: [
      { title: 'Stands and collapses like the lagoon meadow', text: 'Buoyed upright and swaying while the tide covers it, the whole thallus collapses down the rock face and hangs limp the moment the water drops below it — the tape seagrass\'s own trick, on a boulder instead of the mud.' },
      { title: 'Falls the way the rock slopes, not the way the current pushes', text: 'A drained plant drapes down whichever way the boulder itself leans at its holdfast, the same face every low tide, rather than settling wherever the last current left it.' }
    ]
  },

  mangrove: {
    emoji: '🌳', name: 'Mangrove', group: 'PRODUCERS',
    kind: 'flora', sim: 'mangrove',
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
