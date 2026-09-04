/* ============================================================
   sound.js — background shore audio + top-right mute toggle.

   Browsers block autoplay with sound until a user gesture, so
   playback starts on the first click/keydown/touch anywhere on the
   page rather than at load. The mute button always reflects state
   and works before that first gesture too (it just sets the flag
   that decides whether play() is attempted once unlocked).
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'chekjawa-sound-muted';
  var audio = new Audio('sound/intertidal-loop.mp3');
  audio.loop = true;
  audio.volume = 0.35;

  var muted = localStorage.getItem(STORAGE_KEY) === '1';
  var unlocked = false;

  function $(id) { return document.getElementById(id); }

  function applyIcon() {
    var btn = $('btn-sound');
    $('sound-icon-on').classList.toggle('hidden', muted);
    $('sound-icon-off').classList.toggle('hidden', !muted);
    if (btn) btn.title = muted ? 'Unmute sound' : 'Mute sound';
  }

  function tryPlay() {
    if (muted || !unlocked) return;
    audio.play().catch(function () {});
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    tryPlay();
  }

  function setMuted(next) {
    muted = next;
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    applyIcon();
    if (muted) audio.pause(); else tryPlay();
  }

  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  applyIcon();
  $('btn-sound').addEventListener('click', function (e) {
    setMuted(!muted);
    e.stopPropagation();
  });
})();
