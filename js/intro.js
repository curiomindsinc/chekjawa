/* ============================================================
   intro.js — the welcome / onboarding overlay shown when the
   Chek Jawa simulator starts. Self-contained: builds its own DOM,
   styled by theme.css (.intro-*). No dependencies.

   Two jobs, in order: (1) explain what an intertidal zone is and
   why Chek Jawa specifically matters, before a single button is
   mentioned — a visitor who doesn't know why this mudflat is worth
   looking at won't care what the buttons do; (2) walk the controls
   one at a time, each step ringing the ONE element it's about, so
   the glow always matches what's on screen instead of a generic
   "here's the toolbar" wave.

   `ring` on a step is a CSS selector (id or class) — placeRing()
   just needs an element with getBoundingClientRect(), so a whole
   panel (#tide-panel) works the same as a single round button.

   Edit STEPS below to change the wording / order of the pages.
   ============================================================ */
(function () {
  'use strict';

  var STEPS = [
    {
      icon: '🌊',
      title: 'What Is an Intertidal Zone?',
      body: 'Twice a day the sea retreats and returns over the same ground. That strip between the highest and lowest tide lines — flooded, then baked in the sun, then flooded again — is the intertidal zone. Chek Jawa squeezes a rocky shore, a sand/mud flat, a seagrass lagoon and a mangrove fringe into one short walk, so almost every intertidal habitat in Singapore shows up here at once.'
    },
    {
      icon: '🦀',
      title: 'Why Chek Jawa Matters',
      body: 'In 2001 this shore was slated for land reclamation. A public outcry — and the sheer number of species divers and students turned up on it — got the plan shelved. It remains one of the richest, most accessible patches of shoreline in Singapore: a place most people can only read about, made walkable at low tide.'
    },
    {
      icon: '🐾',
      title: 'Move Around the Shore',
      body: 'Drag to orbit the camera, scroll or Q / E to zoom, WASD to move.',
      chips: [
        { k: '🖱', t: 'Drag to orbit' },
        { k: '🔍', t: 'Scroll / Q·E zoom' },
        { k: '⌨', t: 'WASD move' }
      ],
      ring: '#controls'
    },
    {
      icon: '🌙',
      title: 'Watch the Tide',
      body: 'The gauge on the left is the shore’s clock. The white marker is the waterline right now — everything below it is underwater, everything above it is drying out. What you see walking the shore is downstream of this one number.',
      pill: 'Live tide height · metres above Chart Datum',
      ring: '#tide-panel'
    },
    {
      icon: '⏭',
      title: 'Jump the Tide',
      body: 'Two buttons under the gauge move time for you instead of waiting on it.',
      chips: [
        { k: '⏭', t: 'Spring low — surfaces the lagoon' },
        { k: '⏸', t: 'Freeze — holds the tide still' }
      ],
      ring: '.tide-btns'
    },
    {
      icon: '🎚',
      title: 'Set the Tide by Hand',
      body: 'Drag this slider to park the waterline at any height you want and hold it there — useful for lining up a shot or catching an animal at exactly the tide it prefers.',
      ring: '#tide-scrub'
    },
    {
      icon: '📋',
      title: 'Species List',
      body: 'Tap the list icon top-right for the full roster. Click a name to lock the camera onto one animal; press U to jump to the next individual of that species.',
      rows: [
        { e: '🦀', n: 'Fiddler Crab' },
        { e: '🐦', n: 'Egret' }
      ],
      rowHint: 'Camera follows — press U for the next one, tap i for facts',
      ring: '#btn-species'
    },
    {
      icon: '🕸',
      title: 'Food Web',
      body: 'This button lays out who eats whom on the shore — predators, prey, scavengers and symbionts in one diagram.',
      pill: '🕸 See who eats whom',
      ring: '#btn-foodweb'
    },
    {
      icon: '🔊',
      title: 'Sound',
      body: 'Toggle the shore’s ambient sound — waves, wind, the odd bird — on or off.',
      pill: '🔊 Ambient sound on/off',
      ring: '#btn-sound'
    },
    {
      icon: '✨',
      title: 'Click Any Animal',
      body: 'Beyond the menu, you can click directly on any animal, rock-dweller or plant on the shore to open its fact card on the spot.',
      pill: '✨ Click organism → Fact card',
      last: true
    }
  ];

  var step = 0;
  var overlay, card, ring;

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'intro-overlay';
    overlay.innerHTML =
      '<div id="intro-card" class="glass">' +
      '  <div class="intro-dots"></div>' +
      '  <div class="intro-icon"></div>' +
      '  <h2 class="intro-title"></h2>' +
      '  <p class="intro-body"></p>' +
      '  <div class="intro-extra"></div>' +
      '  <div class="intro-nav">' +
      '    <button class="intro-back">Back</button>' +
      '    <button class="intro-next"></button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(overlay);

    ring = document.createElement('div');
    ring.id = 'intro-ring';
    ring.className = 'hidden';
    ring.innerHTML = '<span class="intro-ring-label">↑ here</span>';
    document.body.appendChild(ring);

    card = overlay.querySelector('#intro-card');
    overlay.querySelector('.intro-back').addEventListener('click', prev);
    overlay.querySelector('.intro-next').addEventListener('click', next);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', placeRing);
  }

  function render() {
    var s = STEPS[step];

    // dots
    var dots = '';
    for (var i = 0; i < STEPS.length; i++) {
      dots += '<span class="' + (i === step ? 'on' : '') + '"></span>';
    }
    card.querySelector('.intro-dots').innerHTML = dots;

    card.querySelector('.intro-icon').textContent = s.icon;
    card.querySelector('.intro-title').textContent = s.title;
    card.querySelector('.intro-body').textContent = s.body;

    // extra block: chips / pill / rows
    var extra = '';
    if (s.chips) {
      extra = '<div class="intro-chips">' + s.chips.map(function (c) {
        return '<span class="intro-chip"><b>' + c.k + '</b> ' + c.t + '</span>';
      }).join('') + '</div>';
    } else if (s.rows) {
      extra = '<div class="intro-rows">' + s.rows.map(function (r) {
        return '<div class="intro-row"><span>' + r.e + ' ' + r.n + '</span><span class="intro-row-cta">↻ U next</span></div>';
      }).join('') +
        '<div class="intro-row-hint">' + (s.rowHint || '') + '</div></div>';
    } else if (s.pill) {
      extra = '<div class="intro-pill">' + s.pill + '</div>';
    }
    card.querySelector('.intro-extra').innerHTML = extra;

    // nav
    var back = card.querySelector('.intro-back');
    var nxt = card.querySelector('.intro-next');
    back.classList.toggle('hidden', step === 0);
    nxt.textContent = s.last ? 'Explore  🦀' : 'Next  →';
    nxt.classList.toggle('full', step === 0);

    // ring highlight over whatever this step is teaching
    if (s.ring) { ring.classList.remove('hidden'); placeRing(); }
    else ring.classList.add('hidden');
  }

  function placeRing() {
    if (ring.classList.contains('hidden')) return;
    var sel = STEPS[step].ring;
    var el = sel && document.querySelector(sel);
    if (!el) { ring.classList.add('hidden'); return; }
    var r = el.getBoundingClientRect();
    var pad = 8;
    ring.style.left = (r.left - pad) + 'px';
    ring.style.top = (r.top - pad) + 'px';
    ring.style.width = (r.width + pad * 2) + 'px';
    ring.style.height = (r.height + pad * 2) + 'px';
    // a whole panel reads better as a rounded rect than a near-circle
    ring.style.borderRadius = (r.width > 90 || r.height > 90) ? '14px' : '50%';
  }

  function next() { if (step < STEPS.length - 1) { step++; render(); } else finish(); }
  function prev() { if (step > 0) { step--; render(); } }

  function onKey(e) {
    if (!overlay || overlay.classList.contains('hidden')) return;
    var k = e.key;
    if (k === 'Escape') finish();
    else if (k === 'ArrowRight' || k === 'Enter') next();
    else if (k === 'ArrowLeft') prev();
  }

  function finish() {
    overlay.classList.add('hidden');
    ring.classList.add('hidden');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', placeRing);
  }

  function start() { build(); render(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
