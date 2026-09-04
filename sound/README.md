# sound/

`js/sound.js` loads one file from this directory:

```
sound/intertidal audio.mp3
```

It is a ~72 MB looping field recording of the shore, kept out of the repository so a clone stays
small. Without it the simulation runs exactly as normal, silently — `audio.play()` fails, the
failure is swallowed, and the mute toggle still works.

To restore sound, drop any looping ambience track in at that exact path and filename. It is played
at `volume = 0.35` with `loop = true`, so a seamless loop of a minute or more works best.
