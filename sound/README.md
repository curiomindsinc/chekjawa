# sound/

`js/sound.js` loads one file:

```
sound/intertidal-loop.mp3     5:00, 96 kbps stereo, 3.6 MB — in the repo
```

It plays at `volume = 0.35` with `loop = true`, starting on the first click or keypress (browsers
refuse to autoplay audio before a gesture).

## Where it came from

The master recording is `intertidal audio.mp3` — 60 minutes, 164 kbps, 72 MB. It is **not** in the
repo: it is 35 times the size of everything else here, and a page that makes people wait for 72 MB
before the shore makes a sound is worse than a page with a shorter loop.

Across the full hour the recording is uniform — no sections, no speech, no distinct events, all its
energy below 4 kHz with a hard ceiling at 14 kHz (it had been compressed once before we got it).
Nothing is lost by looping five minutes of it.

## Re-cutting the loop

The seam is the whole problem. Waves crash every few seconds, so a cut placed at random lands
mid-crash and the loop point thumps — the first attempt ended 7.5 dB louder than it began, which no
crossfade can hide, because a crossfade smooths the waveform and not the level.

`645s` was chosen by scanning the hour for a window whose first six seconds and last six seconds sit
at the same loudness: −24.33 dB against −24.82 dB, half a decibel apart. The finished loop measures
−26.92 dB at its head and −27.46 dB at its tail, a smaller step than the wave-to-wave variation
inside it.

```
ffmpeg -ss 645 -t 306 -i "sound/intertidal audio.mp3" -filter_complex "\
  [0:a]atrim=0:300,asetpts=N/SR/TB[main];\
  [0:a]atrim=300:306,asetpts=N/SR/TB[tail];\
  [tail][main]acrossfade=d=6:c1=tri:c2=tri,lowpass=14000[out]" \
  -map "[out]" -c:a libmp3lame -b:a 96k -ar 44100 -ac 2 sound/intertidal-loop.mp3
```

The extra six seconds are the trick: the tail is crossfaded onto the head, so the material that
follows the last sample is already fading in under the first one, and the loop closes on itself.

If you re-cut it at a different offset, measure both ends before shipping — a matched seam is the
only thing that makes this inaudible.
