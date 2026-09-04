# EcoVerse: Chek Jawa

A real-time simulation of the intertidal shore at **Chek Jawa**, Pulau Ubin, Singapore — 32 species
on one tidal flat, each with its own body, its own reason to move, and its own way of dying.

The tide is the clock. Everything else answers to it: the fiddler crab feeds on the falling water
and plugs its burrow on the rise, the horseshoe crab commutes in with the flood, the seagrass
collapses flat on a spring low, and the otters come through to eat. Nothing is scripted — the
animals read the same world state you can see, and the shore is whatever they leave behind.

Runs in the browser. No build step, no dependencies to install, one vendored copy of three.js.

## Run it

Any static server works — `file://` will not, because the modules and assets are fetched.

```
npx http-server -c-1 .
# then open http://localhost:8080
```

`-c-1` disables caching, which matters while editing.

## Sound

Shore ambience starts on the first click or keypress — browsers will not autoplay audio before a
gesture — and the speaker button top-right mutes it. `sound/intertidal-loop.mp3` is a seamless
five-minute cut from an hour-long field recording; `sound/README.md` says where the seam is and how
to re-cut it.

## Layout

| path | what it is |
|---|---|
| `index.html` | the whole UI shell — tide panel, species list, food web, cinematic mode |
| `js/` | 72 modules. One per species (`crabs.js`) plus its body (`crabbody.js`), and the shared world: `world.js`, `tide.js`, `foodweb.js`, `main.js` |
| `theme.css` | every visual token in the interface |
| `tools/` | node-side harness — headless sim runs, gait and mesh checks, and `make-otter-obj.js`, which generates the otter mesh from a table of stations |
| `vendor/three.min.js` | three.js (MIT) |

## Documents

- **`BUILD_GUIDE.md`** — the design history, section by section. Why each animal behaves the way it
  does, and what was tried before it worked.
- **`ROSTER.md`** — what is built, and what debt is left.
- **`CONTINUE.md`** — the live working notes for whatever is mid-flight.

## Credit

Created by **Mr Lau Chin Hang** — [@curiominds.inc](https://www.instagram.com/curiominds.inc/) ·
[YouTube](https://www.youtube.com/@Curiominds.inc88) · [Website](https://curiomindsinc.pages.dev/)
