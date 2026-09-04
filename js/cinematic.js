/* ============================================================
   cinematic.js — "The Film": a hands-off camera tour of Chek Jawa,
   built around the smooth-coated otter and the tide that brings it.

   THE ONE RULE, inherited from the savanna's tour: the world is NEVER
   paused and nothing on screen is staged. Every shot is the real
   simulation running at full speed. The tour is allowed to decide that
   the tide is flooding and that a romp has come, the way it decides
   what o'clock it is — it is not allowed to decide that a chase
   connects, that an octopus inks, or that the family lies down.

   WHAT THE TIDE IS DOING HERE. Savanna's tour hangs on weather:
   world.trigger('rain'|'dust'|'fire') forces an event to a length that
   fits a shot. This shore has no weather. What it has is a 90-second
   tide (tide.js) that every animal on the plot is gated on, so the
   tide IS the trailer's weather and the shot list drives it the same
   way — through world.setTide / world.jumpToSpringLow, on hard cuts,
   never by freezing it. `setTideHeight` is deliberately not used
   anywhere below: it sets world.tideFrozen and stops the clock, which
   is exactly the cutscene this file refuses to be.

   THE SHAPE. One tide, out and back in:

     Act I    0:00-0:26   the shore, and the water leaving it
     Act II   0:26-0:56   low water — the egret, the spring-low reveal,
                          the drained flat
     Act III  0:56-2:06   the flood, and the romp — half the running
                          time, which is the point of the exercise
     Sign-off 2:06-2:20

   The egret in Act II is not filler. otters.js's own header calls the
   two visitors mirrors of each other: the heron drops in behind the
   FALLING water and is pushed off by the flood; the romp comes in ON
   the flood and goes out with the ebb, and the two never meet. Showing
   the bird at low water is what makes the otters' arrival read as the
   other half of a pair rather than as six animals turning up.

   THREE BEATS CANNOT BE PRE-AIMED, and each polls for its subject the
   way savanna's fire shot polls world.fireCentre():

     the kill    CATCH_ODDS is 0.45 — most chases fail, by design
     the ink     only fires if the romp wanders inside INK_R of a den
     the haul    the romp prices the trip against the water it has left

   All three fall through to an alternate caption on the same subject
   rather than cutting away, so a run where the otter misses still
   plays as a film and not as a mistake.

   THE UNDERWATER GRADE (world.js §48) is what makes the hunt beat
   possible at all. Shots that go under the surface set `rig.minY`
   below the locked camera's usual 0.8 m floor; the grade itself is a
   world truth and comes on by itself when the camera crosses the
   waterline.
   ============================================================ */
(function () {
  'use strict';

  var rig, camera, world, pops;
  var active = false;
  var t = 0;                  // seconds since the tour started
  var shotIdx = -1;
  var shotT = 0;
  var subject = null;         // the individual the current shot is riding
  var hold = null;            // eased look-at point, for shots that chase something
  var elCine, elTime, elCap, elSub;

  // Summed from the shot list at init rather than typed — a shot whose
  // length is tuned must not leave the on-screen clock lying.
  var TOTAL = 0;

  /* ---------- helpers the shot list leans on ---------- */

  function lerp(a, b, u) { return a + (b - a) * u; }
  function easeInOut(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }

  /* Ease a point toward a moving subject instead of snapping to it.
     Every chase shot below uses this: an otter after a fish turns
     harder than a camera should, and a look-at pinned rigidly to it
     reads as a whip rather than as a follow. First sighting snaps,
     because the camera is still wide at that moment. */
  function chase(p, dt, rate) {
    if (!hold) { hold = { x: p.x, y: p.y, z: p.z }; return hold; }
    var k = Math.min(1, dt * (rate || 2.2));
    hold.x += (p.x - hold.x) * k;
    hold.y += ((p.y === undefined ? hold.y : p.y) - hold.y) * k;
    hold.z += (p.z - hold.z) * k;
    return hold;
  }

  /* Centre of the crabs that are actually out of their burrows — the
     upper flat is 300 m wide and most of it is empty at any moment.

     RETURNS A y, and it has to. The fiddler band sits at 1.8-2.2 m CD,
     the highest ground anything lives on here, and the shot that uses
     this carried a typed `y: 0.6` — a look-at point a metre and a half
     UNDER the mudflat. The camera dutifully orbited it, went below the
     beach, and filmed the underside of the terrain. Nothing that frames
     a ground-dwelling animal may type its own height. */
  function crabCentre() {
    var list = pops.crabs && pops.crabs.crabs, x = 0, y = 0, z = 0, n = 0;
    if (!list) return { x: 0, y: world.heightAt(0, -22), z: -22 };
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.state === 'down' || !c.vis) continue;   // 'down' is in the burrow (crabs.js)
      x += c.x; y += c.y; z += c.z; n++;
    }
    return n ? { x: x / n, y: y / n, z: z / n }
             : { x: 0, y: world.heightAt(0, -22), z: -22 };
  }

  /* ---------- the nudge ----------
     Two of these, and between them they are the only influence the tour
     has on what the romp does: they say WHERE the family swims, the way
     the shot list says what o'clock it is. Neither decides that a chase
     starts (HUNT_R), that one connects (CATCH_ODDS), or that an octopus
     panics (INK_R) — those all still have to happen on their own.

     Without them the first cut of this film had a diving otter on screen
     for 2 seconds of a 12-second hunt shot and no ink at all, because
     six animals working 300 m of shore are simply not often near the
     one fish or the one den the camera is waiting on. */
  function gobyCentre() {
    var list = pops.gobies && pops.gobies.fish, x = 0, z = 0, n = 0;
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.state === 'dead' || !f.vis) continue;
      x += f.x; z += f.z; n++;
    }
    return n ? { x: x / n, z: z / n } : null;
  }

  /* The bird the egret shot commits to, and it wants one STILL COMING
     IN if there is one.

     `egrets.striker()` prefers a bird that is already stabbing, which is
     the right answer for a shot that wants the strike and the wrong one
     for a shot that wants to watch an arrival. Five birds pitch in over
     an ARRIVE_STAGGER of up to nine seconds, so at the moment this shot
     opens there is usually one already working the mud and one still in
     the air — and taking the one in the air means the shot gets the
     landing, the walk and the hunting rather than joining halfway
     through. Falls back to `striker` once they are all down.

     AND OF THE INBOUND BIRDS IT TAKES THE NEAREST ITS TARGET, which is
     the one that will land soonest. Taking whichever came first in the
     array meant committing to a bird that might be a full eleven-second
     glide out while another was on short finals, and the difference is
     most of the time this shot has to spend on the ground. Distance to
     go is the only honest measure of that — the birds all fly at
     FLY_SPD, so nearest is soonest. */
  function pickEgret() {
    var eg = pops.egrets, list = eg && eg.birds;
    if (!list) return null;
    var best = null, bestD = Infinity;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.state !== 'inbound') continue;
      var dx = b.tgtX - b.x, dz = b.tgtZ - b.z, d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = b; }
    }
    return best || (eg.striker ? eg.striker() : null);
  }

  // An octopus that is out of its den. A denned one is inside a rock and
  // cannot be startled, so steering the romp at it would prove nothing.
  function octopusOut() {
    var list = pops.octopuses && pops.octopuses.octopuses;
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o.state !== 'den' && o.state !== 'home') return o;
    }
    return null;
  }

  /* ---------- the shot list ----------
     pose  = { x, y, z, yaw, pitch, dist }   x/y/z is the LOOK-AT point
     from/to interpolate across the shot; `tick` overrides both and
     returns a pose per frame. `minY` drops the locked camera's floor
     for the shots that go under the water.

     On yaw: 0 puts the camera out over the CHANNEL looking landward,
     which is the transect's good side — the bands stack away from you
     in the order the shore actually lays them out. PI is the reverse
     view, from the mangroves out to sea.

     On z: the transect runs -72 (mangrove fringe) through -22 (fiddler
     mudflat), -4 to 22 (sand flat and pools), 34-44 (seagrass lagoon),
     56 (sandbar crest) to 72 (subtidal channel). See world.js PROFILE.
  */
  var SHOTS = [
    /* ================= ACT I — the shore, and its clock ================= */
    {
      dur: 8, cap: 'Chek Jawa', sub: 'Six habitats in three hundred metres of shore',
      // Late morning regardless of what o'clock the sim is at — the colour
      // bands and the wet-sand line are the whole of this shot and neither
      // reads in the dark. Same reason savanna opens at 0.32.
      enter: function () { world.setDayPhase(0.34); world.setTide(0.16); },
      from: { x: 0, y: 2, z: 6, yaw: 0.32, pitch: 0.40, dist: 150 },
      to:   { x: 0, y: 2, z: 2, yaw: 0.05, pitch: 0.30, dist: 104 }
    },
    {
      dur: 10, cap: 'The tide is the clock', sub: 'Everything here is timed by the water',
      /* Low and near the waterline, so the thing that moves is the GROUND.
         No other sim in this series does this and it is worth ten seconds.

         THE SPRING-LOW FUSE IS LIT HERE, two shots before the reveal it
         is for. jumpToSpringLow leaves the water high and visibly
         falling and puts the low 26 seconds out (tide.js LEAD), so the
         ebb this shot is about IS that fuse burning — the shot shows
         the cause of the payoff two shots later. Aiming a 26-second
         fuse is the whole reason LEAD exists.

         It used to be lit one shot later, when the egret beat still sat
         between here and the reveal and had to be short enough to fit
         inside the fuse. The egret has its own tide now (see its shot)
         and the arithmetic came back here. */
      enter: function () { world.jumpToSpringLow(); },
      from: { x: 0, y: 1, z: 10, yaw: 1.45, pitch: 0.15, dist: 40 },
      to:   { x: 0, y: 1, z: 16, yaw: 1.05, pitch: 0.10, dist: 24 }
    },
    {
      cap: 'Everything lives on a band', sub: 'Mangrove, boulders, mudflat, sand, lagoon, channel',
      /* Eight seconds, and the length is set by the fuse lit in the shot
         before: the low arrives 26 s after that call, and this shot plus
         the reveal's own opening seconds have to fit inside it. */
      dur: 8,
      from: { x: -22, y: 2, z: -22, yaw: 0.10, pitch: 0.26, dist: 80 },
      to:   { x:  22, y: 2, z:  22, yaw: 0.22, pitch: 0.20, dist: 70 }
    },

    /* ================= ACT II — low water ================= */
    {
      dur: 14, cap: 'Spring low', sub: 'The lagoon surfaces — this only happens on the biggest tides',
      /* The payoff of the whole biome, and tide.js says so in its own
         header. Framed across the lagoon and the bar (z 34-56) from
         out over the channel, wide enough that the meadow coming out
         of the water reads as an area rather than as a texture. */
      from: { x: -8, y: 1, z: 40, yaw: 0.16, pitch: 0.26, dist: 70 },
      to:   { x:  8, y: 1, z: 44, yaw: 0.42, pitch: 0.16, dist: 40 }
    },
    {
      dur: 8, cap: 'The flat belongs to the crabs', sub: 'Fiddlers come out when the water goes — the shore’s one inversion',
      /* The look-at is planted on the crabs in all THREE axes, y
         included — see crabCentre. A fiddler is a couple of centimetres
         of animal on the highest ground in the sim, so this is the shot
         with the least room for a typed height and it is the one that
         had one. 0.25 m over the mud puts the frame at eye level with
         the claw rather than staring down at the burrow field. */
      enter: function () {
        var c = crabCentre();
        this.from.x = this.to.x = c.x;
        this.from.z = this.to.z = c.z;
        this.from.y = this.to.y = c.y + 0.25;
      },
      from: { x: 0, y: 2.3, z: -22, yaw: 2.2, pitch: 0.22, dist: 15 },
      to:   { x: 0, y: 2.3, z: -22, yaw: 2.9, pitch: 0.14, dist: 6.5 }
    },
    {
      dur: 24, cap: 'The other visitor', sub: 'A little egret drops in behind the falling water',
      /* ONE BIRD, ALL SHOT. `striker()` returns whichever bird is
         stabbing right now, and polling it every frame meant the camera
         hopped between five birds working five different patches — you
         never saw any of them do anything from start to finish. So the
         shot commits to the first bird it finds and holds it until that
         bird actually leaves. The others are still on the flat and still
         in frame; this one is just the one we are with.

         THE FRAMING IS DRIVEN BY THE BIRD, NOT BY THE SHOT CLOCK, and
         that is what buys the linger. A distance interpolated across
         `u` is still gliding in while the bird lands and still gliding
         when it starts hunting — it never settles anywhere, so there is
         no held frame in which to watch the animal do its job. Here the
         camera has a target distance per BEHAVIOUR and eases toward it,
         which means it goes wide on its own for the descent, comes down
         to the bird when it puts its feet on the mud, and then STOPS
         and stays there for as long as the bird keeps working.

         TWENTY-FOUR SECONDS, AND ITS OWN TIDE, and both are forced by
         how long this bird takes to arrive. The chain is: the water
         drops past 1.30 m CD, the bird waits out an ARRIVE_STAGGER of
         up to nine seconds, and then it FLIES IN — 120-odd metres at
         FLY_SPD 11 m/s, which is eleven seconds of descent. So it is on
         the mud somewhere between seventeen and twenty-six seconds
         after the water passes its mark, and a ten-second shot spent
         three seconds on an empty flat, eleven on a distant glide, and
         four on the animal actually doing something.

         That is also why this beat moved to the END of Act II and got a
         wind-back of its own. It used to sit between the fuse and the
         spring-low reveal, which capped it at whatever was left of 26
         seconds — and the arithmetic simply does not fit: the bird has
         not landed yet when the low arrives. The reveal and the crabs
         now take the natural low, and the tide is wound back here to
         just above the bird's own trigger so the whole arrival happens
         inside this shot instead of being cut in half by it.

         0.50 is mean water on the FALLING limb — three seconds above
         the 1.30 m mark, so the trigger fires almost at once and the
         shot is not paying for the ebb as well as the flight. */
      enter: function () {
        world.setTide(0.50);
        subject = null; hold = null; this._d = 30; this._p = 0.26;
      },
      tick: function (u, dt) {
        var b = subject;
        // Re-pick only if we have nobody, or the one we had has gone.
        if (!b || b.state === 'away') b = subject = pickEgret();

        var wantD, wantP;
        if (!b) {
          // Birds not down yet. Hold on the draining flat rather than
          // cutting — the water leaving IS what brings them.
          this.say('Low water coming', 'The flat drains from the top of the shore down');
          wantD = 34; wantP = 0.26;
        } else if (b.state === 'inbound') {
          this.say('The other visitor', 'A little egret drops in behind the falling water');
          wantD = 26; wantP = 0.22;
        } else if (b.stab > 0) {
          this.say('The strike', 'Head down, and it takes whatever the water left behind');
          wantD = 6.5; wantP = 0.09;
        } else if (b.state === 'outbound') {
          this.say('Off again', 'The flood will push it off the flat long before the otters come');
          wantD = 22; wantP = 0.20;
        } else {
          // LANDED, AND THIS IS THE ONE THAT LINGERS. 9 m is what ui.js
          // follows an egret at — close enough to read the neck and the
          // feet, far enough that the whole bird stays in frame when it
          // stretches. The camera arrives here and then holds.
          this.say('Working the flat', 'It walks the drained sand, freezes, stirs the mud with a foot');
          wantD = 9; wantP = 0.11;
        }

        /* Eased, not cut. 1.4/s is slow enough that the move down onto a
           landing bird reads as the camera settling rather than a zoom. */
        var k = Math.min(1, dt * 1.4);
        this._d += (wantD - this._d) * k;
        this._p += (wantP - this._p) * k;

        var p = b ? chase(b, dt, 2.6) : chase({ x: 0, y: 1.4, z: -6 }, dt, 1.4);
        // A slow drift round the bird over the shot, so a held frame is
        // still a moving one.
        return { x: p.x, y: p.y + 0.4, z: p.z,
                 yaw: 0.75 - u * 0.85, pitch: this._p, dist: this._d };
      }
    },

    /* ================= ACT III — the flood, and the romp ================= */
    {
      dur: 8, cap: 'The flood', sub: 'And it all runs backwards',
      /* ACT III IS ANCHORED HERE, and it has to be anchored somewhere.

         This shot used to take the water as it found it, on the theory
         that the flood after the spring low is a real flood and needs no
         help. That was true only as long as Act II was exactly the
         length it happened to be: lengthening the egret beat by
         twenty-four seconds slid the whole of Act III a quarter of a
         tide later, the romp was summoned into 0.43 m of water — below
         its own ARRIVE_ABOVE, and under SWIM_DEPTH over most of the
         flat — and it spent the hunt shot unable to swim anywhere while
         the gobies sat in pools it could not reach. Twenty seconds of
         green water and no otter in it.

         So the flood is set rather than inherited, and every shot after
         this one is measured from here. 0.93 is a real low on the rise:
         the waterline starts at 0.99 m and is at 1.79 by the end of
         this shot, which is both a flood you can watch happen and
         enough water for what arrives next. Change any shot length in
         Act II now and Act III does not care. */
      enter: function () { world.setTide(0.93); },
      from: { x: 0, y: 1, z: 20, yaw: 1.25, pitch: 0.14, dist: 46 },
      to:   { x: 0, y: 1, z:  4, yaw: 1.85, pitch: 0.17, dist: 28 }
    },
    {
      dur: 10, cap: 'The romp arrives', sub: 'Six smooth-coated otters, in from the channel on the flood',
      /* SUMMON SKIPS THE DICE AND NOTHING ELSE. A romp visits on half
         of the qualifying tides (VISIT_ODDS 0.5) and a two-minute
         third act cannot hang on a coin flip — but everything after
         this call is the ordinary arrival the sim runs unattended.
         150 seconds of visit clock covers the rest of the act.

         holdHaul goes on here and comes off at the ink beat: a family
         that decides to lie down in the middle of the hunt is a family
         that is not hunting. It delays the decision, it does not make
         one. */
      enter: function () {
        pops.otters.summon(150);
        pops.otters.holdHaul(true);
        hold = null;
      },
      tick: function (u, dt) {
        var c = pops.otters.centre();
        var p = c ? chase(c, dt, 1.8) : chase({ x: 0, y: 1.6, z: 60 }, dt, 1.2);
        var e = easeInOut(u);
        return { x: p.x, y: p.y + 0.5, z: p.z,
                 yaw: lerp(3.05, 2.55, e), pitch: lerp(0.16, 0.07, e), dist: lerp(34, 14, e) };
      }
    },
    {
      dur: 8, cap: 'Six animals, one animal', sub: 'A romp is a family — they arrive, work and leave together',
      /* Steered at the OCTOPUS, not the fish, and the running order is
         why. Octopus dens are cut at z 46-70 (octopuses.js DEN_Z) —
         which is the channel and the bar, exactly where the romp comes
         ashore — and the family works LANDWARD from there for the rest
         of the visit. So the one window in which six otters are ever
         within INK_R of a den is the first twenty seconds of the visit,
         and it closes for good after that.

         The first cut had the ink beat at the end of the act, after the
         hunt, and it fired in the sim four or five times a run and NEVER
         ONCE inside its own shot: by then the animals were forty metres
         up the shore with the whole den field behind them. The beat did
         not need better polling, it needed to be earlier. */
      tick: function (u, dt) {
        var oc = octopusOut();
        if (oc) pops.otters.steerTo(oc.x, oc.z);
        var c = pops.otters.centre();
        var p = c ? chase(c, dt, 2.4) : chase({ x: 0, y: 1.6, z: 40 }, dt, 1.4);
        var e = easeInOut(u);
        return { x: p.x, y: p.y + 0.3, z: p.z,
                 yaw: lerp(1.5, 2.3, e), pitch: lerp(0.10, 0.06, e), dist: lerp(17, 10, e) };
      }
    },
    {
      dur: 10, cap: 'Ink', sub: 'An octopus meets a romp — the only thing on this shore that makes one ink',
      /* THE FIRE SHOT OF THIS FILM. It cannot be pre-aimed: an octopus
         only inks when a romp comes inside INK_R (5.5 m) of it, so the
         shot polls octopuses.inkAt() and flies to the cloud if one goes
         up. And it follows the CLOUD, not the animal — the whole point
         of ink is that the octopus is home behind its door before the
         cloud has finished spreading, so a camera on the octopus is a
         camera on an empty rock.

         STAYS PUT if nothing inks: it holds on the romp with a different
         caption rather than cutting the beat short. Ten seconds of
         otters over the den field is not a hole in the film; a hard cut
         on a miss would be. */
      enter: function () { hold = null; },
      tick: function (u, dt) {
        var oc = octopusOut();
        if (oc) pops.otters.steerTo(oc.x, oc.z);
        var ink = pops.octopuses && pops.octopuses.inkAt && pops.octopuses.inkAt();
        var e = easeInOut(u);
        if (ink) {
          this.say('Ink', 'The cloud is a decoy — it is already home behind its door');
          var p = chase(ink, dt, 2.4);
          return { x: p.x, y: p.y, z: p.z,
                   yaw: lerp(0.9, 1.7, e), pitch: lerp(0.14, 0.08, e), dist: lerp(9, 4.5, e) };
        }
        this.say('Over the dens', 'Nothing on this shore is big enough to eat them');
        var c = pops.otters.centre();
        var q = c ? chase(c, dt, 1.8) : chase({ x: 0, y: 1.4, z: 52 }, dt, 1.2);
        return { x: q.x, y: q.y + 0.4, z: q.z,
                 yaw: lerp(0.9, 1.7, e), pitch: lerp(0.12, 0.08, e), dist: lerp(15, 10, e) };
      }
    },
    {
      dur: 20, cap: 'The hunt', sub: 'One breaks formation for a fish',
      /* UNDER THE WATER, and this is the shot the grade was built for.
         `minY` drops the locked camera's 0.8 m floor: a goby holds the
         bed at 0.10-1.75 m CD and a camera that cannot get below 0.8 m
         is above the animal it is filming on half the tides here.

         THE TIDE IS WOUND BACK HERE, and Act III needs it to be: the
         act runs seventy seconds, a tide cycle is ninety, and only about
         forty-five of those carry enough water for a romp — so the act
         cannot play on one flood, by arithmetic. This is a hard cut to
         a single animal underwater, which is the one place in the film
         where a jump in the waterline cannot be seen. The tide is still
         running; only the offset moved.

         0.02 — just past mean water and rising — is the one phase that
         serves BOTH this shot and the haul-out two shots later, and it
         took three cuts to find because the two want opposite things.

         THIS shot wants water: at 1.78 m there is 0.7 to 1.7 m over the
         band the gobies hold (0.10-1.75 m CD), which is enough to put a
         camera under and still see the bed.

         THE HAUL-OUT wants a LOW WATERLINE. The romp prices its trip to
         the bar against HAUL_R and against Tide.secsUntilBelow, and a
         wind-back to high water fails the first test — at a spring high
         the only ground shallow enough to lie on is eighty metres up
         the shore, past the range, so the trip is declined every time
         it is offered. A wind-back to low water fails the second: there
         is no water left to pay for it, and none to swim there in.
         Rising through mean passes both, and it is the only thing that
         does.

         AND `holdHaul` COMES OFF ON THE SAME LINE. That looks like it
         should belong to a later shot — the family is about to be sent
         off toward the bar in the middle of the hunt — and it was
         tried there, twice. It cannot be: the trip is 30-50 m of
         swimming plus a lie-down, and released any later the romp is
         still crossing when the film ends. The water and the permission
         both have to land here.

         THE CHASE AND THE RAFT ARE ONE SHOT, and that is what makes the
         above work. They were two — a hunt beat and a belly-up beat —
         and the seam between them was where everything fell apart: the
         hunt shot rode a chase through to the kill, the animal finished
         its fish inside that shot (CHEW_SECS is only 3-5.5), and the
         belly-up shot then had to find a SECOND catch in a family that
         was by then swimming toward the haul-out with every hunter on
         cooldown. It spent its whole length on the "most chases fail"
         caption while the actual kill had played out one shot earlier
         under the wrong title.

         So the camera picks one animal and stays with it from the dive
         to the last bite, and the CAPTION changes underneath rather
         than the shot. Which is also the honest version: a chase and
         the meal after it are one event, and the only reason to cut
         between them was that the shot list was built before anyone had
         watched one. */
      minY: 0.35,
      enter: function () { world.setTide(0.02); pops.otters.holdHaul(false); hold = null; subject = null; },
      tick: function (u, dt) {
        var g = gobyCentre();
        if (g) pops.otters.steerTo(g.x, g.z);
        /* COMMIT to the animal, then let go. Re-polling every frame put
           the camera on whichever otter happened to be diving this
           instant and dropped it the moment that one gave up — which is
           most of them, most of the time. Hold the one we found through
           the dive AND the meal, and only look for another once it is
           back in formation. */
        var o = subject;
        if (!o || !o.vis || (o.state !== 'dive' && o.state !== 'catch')) {
          o = subject = pops.otters.hunter('dive') || pops.otters.hunter();
        }
        var e = easeInOut(u);
        if (o && o.state === 'catch') {
          /* SURFACED. The raft posture only reads from near the
             waterline — from above, a floating otter is a brown shape —
             so the camera comes up with it, and letting the floor back
             up to the default is what carries it out through the
             surface and releases the underwater grade on its own. */
          rig.minY = null;
          this.say('Belly up', 'It surfaces on its back and eats with the fish on its chest');
          var p = chase(o, dt, 2.6);
          return { x: p.x, y: p.y + 0.15, z: p.z,
                   yaw: lerp(1.6, 2.6, e), pitch: 0.07, dist: lerp(5, 3.2, e) };
        }
        rig.minY = 0.35;
        if (o) {
          this.say('The hunt', 'Twice a goby’s speed, and five seconds of patience');
          var q = chase(o, dt, 3.0);
          return { x: q.x, y: q.y + 0.1, z: q.z,
                   yaw: lerp(1.1, 2.4, e), pitch: lerp(0.05, 0.02, e), dist: lerp(9, 4.5, e) };
        }
        // Nobody is chasing anything this second — stay with the family
        // rather than cutting away from the act.
        this.say('Under the surface', 'The flat they work is a metre of green water');
        var c = pops.otters.centre();
        var r = c ? chase(c, dt, 2.0) : chase({ x: 0, y: 1.2, z: 30 }, dt, 1.2);
        return { x: r.x, y: r.y, z: r.z,
                 yaw: lerp(1.1, 2.4, e), pitch: lerp(0.06, 0.03, e), dist: lerp(13, 8, e) };
      }
    },
    {
      dur: 18, cap: 'Haul out', sub: 'They lie up on the bar and dry off',
      /* Long, because the DRYING is the content and it is slow on
         purpose: DRY_RATE is 0.055, about twenty seconds from the
         near-black of a wet coat to milk chocolate. Fourteen seconds
         gets most of the way there.

         Three captions for three real outcomes, because the romp
         decides this one: swimming to the bar, lying on it, or still
         out on the water because the trip did not price. */
      enter: function () { hold = null; },
      tick: function (u, dt) {
        var st = pops.otters.romp.state;
        if (st === 'haul') this.say('Haul out', 'Wet they are nearly black; twenty seconds dry and they are milk chocolate');
        else if (st === 'tohaul') this.say('To the bar', 'They only go if the tide leaves them time to lie down');
        else this.say('Still working', 'A haul-out is priced against the water they have left');
        var c = pops.otters.centre();
        var p = c ? chase(c, dt, 1.6) : chase({ x: 0, y: 1.2, z: 40 }, dt, 1.2);
        var e = easeInOut(u);
        return { x: p.x, y: p.y + 0.3, z: p.z,
                 yaw: lerp(2.6, 1.9, e), pitch: lerp(0.09, 0.15, e), dist: lerp(9, 17, e) };
      }
    },
    {
      dur: 8, cap: 'And they go', sub: 'In on the flood, out on the ebb — one stop on a coastline of them',
      /* `dismiss` puts the romp into its own `leave` state on the cut.
         The ebb would do this by itself within the minute; the shot
         wants it now, and `leave` is the animal's real departure — it
         swims out to the channel, it is not despawned. */
      enter: function () { pops.otters.dismiss(); hold = null; },
      tick: function (u, dt) {
        var c = pops.otters.centre();
        var p = c ? chase(c, dt, 1.2) : chase({ x: 0, y: 1.4, z: 58 }, dt, 1.0);
        var e = easeInOut(u);
        return { x: p.x, y: p.y + 1.0, z: p.z,
                 yaw: lerp(0.2, 0.05, e), pitch: lerp(0.14, 0.28, e), dist: lerp(18, 60, e) };
      }
    },
    {
      dur: 10, cap: 'EcoVerse · Chek Jawa', sub: 'The tide turns again in ninety seconds, with or without you',
      from: { x: 0, y: 2, z: 4, yaw: 0.05, pitch: 0.28, dist: 100 },
      to:   { x: 0, y: 2, z: 8, yaw: 0.55, pitch: 0.36, dist: 155 }
    }
  ];

  /* ---------- overlay ---------- */

  function caption(a, b) {
    if (elCap.textContent !== a) elCap.textContent = a;
    if (elSub.textContent !== b) elSub.textContent = b;
  }
  // Shots call this on themselves from inside tick — the polling beats
  // change their own caption depending on what they actually found.
  var say = caption;

  function clock(sec) {
    var s = Math.max(0, Math.floor(sec));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  /* ---------- lifecycle ---------- */

  function start() {
    if (active) return;
    active = true;
    t = 0; shotIdx = -1; shotT = 0; subject = null; hold = null;

    document.body.classList.add('cine-active');
    elCine.classList.remove('hidden');
    rig.locked = true;
    rig.followed = null;        // the shot list drives the look-at point itself
    // Drop follow mode if the species panel had one running — two things
    // writing rig.target is one too many, and CSS only HIDES the panel.
    if (window.UI && UI.follow) UI.follow(null);
  }

  function stop() {
    if (!active) return;
    active = false;
    document.body.classList.remove('cine-active');
    elCine.classList.add('hidden');
    rig.locked = false;
    rig.minY = null;
    /* Hand the shore back the way we found it. The romp is NOT sent
       away — it is a real animal on a real visit and the ebb will take
       it out on its own — but the haul-out hold is the tour's and must
       not outlive it, or a family stopped mid-film would never lie
       down again. */
    if (pops.otters) pops.otters.holdHaul(false);
  }

  function enterShot(i) {
    shotIdx = i; shotT = 0;
    var sh = SHOTS[i];
    if (!sh) return;
    rig.minY = sh.minY === undefined ? null : sh.minY;
    if (sh.enter) sh.enter();
    caption(sh.cap, sh.sub);
  }

  /* THE LOOK-AT POINT MAY NOT BE INSIDE THE SHORE EITHER, and this is
     the half of the problem the camera's own floor cannot fix.

     A pose carries an absolute y, and the shore runs from -0.55 m in the
     channel to 3.05 m at the mangrove fringe — so a y that frames the
     sand flat nicely is buried a metre deep over the fiddler mudflat.
     The camera then orbits a point INSIDE the terrain, and at a low
     pitch it swings under the beach and films it from below. Clamping
     the camera alone would only have pushed it up while it went on
     aiming into the ground.

     0.35 m of clearance rather than nothing: a look-at exactly on the
     surface puts the horizon through the middle of the frame. */
  function applyPose(p) {
    var y = p.y;
    var g = world.heightAt(p.x, p.z) + 0.35;
    if (y < g) y = g;
    rig.target.x = p.x; rig.target.y = y; rig.target.z = p.z;
    rig.yaw = p.yaw; rig.pitch = p.pitch; rig.dist = p.dist;
  }

  function update(dt) {
    if (!active) return;
    t += dt; shotT += dt;

    if (shotIdx < 0) enterShot(0);
    var sh = SHOTS[shotIdx];
    while (sh && shotT >= sh.dur) {
      shotT -= sh.dur;
      if (shotIdx + 1 >= SHOTS.length) { stop(); return; }
      enterShot(shotIdx + 1);
      sh = SHOTS[shotIdx];
    }
    if (!sh) { stop(); return; }

    var u = Math.min(1, shotT / sh.dur);
    var pose;

    if (sh.tick) {
      pose = sh.tick(u, dt);
    } else {
      var e = easeInOut(u);
      pose = {
        x: lerp(sh.from.x || 0, sh.to.x || 0, e),
        y: lerp(sh.from.y, sh.to.y, e),
        z: lerp(sh.from.z || 0, sh.to.z || 0, e),
        yaw: lerp(sh.from.yaw, sh.to.yaw, e),
        pitch: lerp(sh.from.pitch, sh.to.pitch, e),
        dist: lerp(sh.from.dist, sh.to.dist, e)
      };
    }

    applyPose(pose);
    elTime.textContent = clock(t) + ' / ' + clock(TOTAL);
  }

  function init(ctx) {
    rig = ctx.rig; camera = ctx.camera; world = ctx.world; pops = ctx.pops;

    // Every shot that has a `tick` calls `this.say(...)` on itself.
    for (var i = 0; i < SHOTS.length; i++) { SHOTS[i].say = say; TOTAL += SHOTS[i].dur; }

    elCine = document.getElementById('cine-overlay');
    elTime = document.querySelector('#cine-time span');   // the <i> beside it is the REC dot
    elCap = document.getElementById('cine-cap');
    elSub = document.getElementById('cine-sub');

    var btn = document.getElementById('btn-cinematic');
    if (btn) btn.addEventListener('click', function () { active ? stop() : start(); });
    var skip = document.getElementById('cine-skip');
    if (skip) skip.addEventListener('click', stop);
    window.addEventListener('keydown', function (e) {
      if (active && e.key === 'Escape') stop();
    });
  }

  window.Cinematic = {
    init: init,
    start: start,
    stop: stop,
    update: update,
    isActive: function () { return active; },
    /* Read-only peek at the tour's live state. Nothing in the sim uses
       it — it exists so the shot list can be checked from outside the
       page, since main.js is an IIFE and rig/world are otherwise
       unreachable from the console. */
    debug: function () {
      return {
        t: t, shot: shotIdx, cap: elCap ? elCap.textContent : '',
        tide: world ? world.tide : null,
        dir: world ? world.tideDir : null,
        underwater: world ? world.underwater : null,
        romp: pops && pops.otters ? pops.otters.romp.state : null,
        target: rig ? { x: rig.target.x, y: rig.target.y, z: rig.target.z } : null,
        dist: rig ? rig.dist : null,
        cam: camera ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null
      };
    }
  };
})();
