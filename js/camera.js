/* ============================================================
   camera.js — free shore camera.
     Drag   = rotate    Scroll = zoom    WASD = move
     Q / E  = zoom      Click  = inspect (handled via callback)
   Can also follow an organism (species panel / inspect card).
   ============================================================ */
(function () {
  'use strict';

  function CameraRig(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;

    this.target = new THREE.Vector3(0, 0.8, 4);
    this.yaw = 0.18;          // looking landward from out over the channel, slightly off-axis
    this.pitch = 0.50;        // radians above horizontal — high enough to see the whole transect
    this.dist = 168;          // framed so the 300 m plot fills the view; max zoom-out is capped
                              // at 235 because past that you are mostly looking at empty sky
                              // around the cross-section

    this.followed = null;     // Organism or null
    this.boundX = 0;          // look-at clamp, set from world.simArea by main.js
    this.boundZ = 0;

    this.keys = {};
    this.onClick = null;      // set by ui.js — receives (clientX, clientY)

    this._bind();
  }

  CameraRig.prototype._bind = function () {
    var self = this;
    var dragging = false, moved = 0, lastX = 0, lastY = 0;

    this.dom.addEventListener('mousedown', function (e) {
      dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX; lastY = e.clientY;
      self.yaw -= dx * 0.005;
      self.pitch = Math.max(0.03, Math.min(1.45, self.pitch + dy * 0.004));
    });
    window.addEventListener('mouseup', function (e) {
      if (dragging && moved < 6 && self.onClick) self.onClick(e.clientX, e.clientY);
      dragging = false;
    });

    this.dom.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.dist = Math.max(6, Math.min(235, self.dist * (1 + e.deltaY * 0.0011)));
    }, { passive: false });

    window.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT') return;
      self.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', function (e) {
      self.keys[e.key.toLowerCase()] = false;
    });

    // touch: one-finger rotate, pinch zoom
    var touchDist = 0;
    this.dom.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
      if (e.touches.length === 2) {
        touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    this.dom.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) {
        var dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        self.yaw -= dx * 0.006;
        self.pitch = Math.max(0.03, Math.min(1.45, self.pitch + dy * 0.005));
      } else if (e.touches.length === 2) {
        var d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
        self.dist = Math.max(6, Math.min(235, self.dist * (touchDist / d)));
        touchDist = d;
      }
    }, { passive: true });
  };

  /* Follow anything that carries x / y / z.

     Savanna passed an Organism and the rig read `organism.group.position`.
     Here an animal is an instance slot, not an Object3D — a crab is a plain
     object holding x / y / z (crabs.js) and a mudskipper the same (mudskippers.js) — so
     the rig takes the individual itself as the target. Vector3.lerp only reads
     .x / .y / .z, so both shapes work, and the `.group.position` form is kept
     for anything that does own a node.

     `dist` is the framing range for that species: a 2 cm fiddler crab and a
     hand-length mudskipper do not read at the same distance, so ui.js passes one per
     species rather than leaving the rig to guess. */
  CameraRig.prototype.follow = function (organism, dist) {
    this.followed = organism;
    if (!organism) return;
    this.dist = Math.min(this.dist, dist || 40);
    this.pitch = Math.min(this.pitch, 0.42);   // come down to the animal's eye level
  };

  CameraRig.prototype.followPoint = function () {
    var f = this.followed;
    if (!f) return null;
    return f.group ? f.group.position : f;
  };

  CameraRig.prototype.update = function (dt) {
    var k = this.keys;

    // While the cinematic is running it owns the camera outright: the shot list
    // writes target/yaw/pitch/dist every frame, so a stray WASD press or drag
    // would fight it. Mouse/touch handlers still run (they are bound once at
    // construction) but their writes are overwritten on the next frame anyway;
    // this is what stops the keyboard from dragging the look-at point away.
    if (this.locked) {
      var lcp = Math.cos(this.pitch), lsp = Math.sin(this.pitch);
      this.camera.position.set(
        this.target.x + this.dist * lcp * Math.sin(this.yaw),
        this.target.y + this.dist * lsp,
        this.target.z + this.dist * lcp * Math.cos(this.yaw)
      );
      if (this.camera.position.y < 0.8) this.camera.position.y = 0.8;
      this.camera.lookAt(this.target);
      return;
    }

    // WASD moves the look-at point on the sea floor plane
    var move = 34 * dt * (this.dist / 85 + 0.4);
    var fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);   // camera forward on XZ
    if (k['w']) { this.target.x -= fx * move; this.target.z -= fz * move; this.followed = null; }
    if (k['s']) { this.target.x += fx * move; this.target.z += fz * move; this.followed = null; }
    if (k['a']) { this.target.x -= fz * move; this.target.z += fx * move; this.followed = null; }
    if (k['d']) { this.target.x += fz * move; this.target.z -= fx * move; this.followed = null; }
    if (k['q']) this.dist = Math.max(6, this.dist - 55 * dt);
    if (k['e']) this.dist = Math.min(235, this.dist + 55 * dt);

    // follow mode: glide the look-at point onto the organism
    if (this.followed) {
      this.target.lerp(this.followPoint(), Math.min(1, 3.5 * dt));
    } else {
      /* Keep the look-at point on the STUDY PLOT (world.simArea), not on the
         whole 420 m terrain. The terrain beyond the plot exists so the shore
         runs off-frame instead of ending in a square — there is nothing alive
         out there to look at, so the camera should not invite you to go
         hunting. A little slack in x so the plot's edges can still be framed,
         and the usual z slack for pulling back over the channel. */
      var limX = this.boundX || 190, limZ = this.boundZ || 88;
      if (this.target.x >  limX) this.target.x =  limX;
      if (this.target.x < -limX) this.target.x = -limX;
      if (this.target.z >  limZ) this.target.z =  limZ;
      if (this.target.z < -limZ) this.target.z = -limZ;
      this.target.y = Math.max(0, Math.min(22, this.target.y));
    }

    var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.camera.position.set(
      this.target.x + this.dist * cp * Math.sin(this.yaw),
      this.target.y + this.dist * sp,
      this.target.z + this.dist * cp * Math.cos(this.yaw)
    );
    /* The camera normally may not drop below 1.5 m — that is about the
       waterline at high tide, and it keeps the free view out of the mud. A
       followed animal IS on the mud, so while following, the floor drops to
       just above whatever it is standing on. */
    var floorY = this.followed ? this.followPoint().y + 0.6 : 1.5;
    if (this.camera.position.y < floorY) this.camera.position.y = floorY;
    this.camera.lookAt(this.target);
  };

  window.CameraRig = CameraRig;
})();
