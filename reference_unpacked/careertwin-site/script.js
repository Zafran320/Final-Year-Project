/* ============================================================
   CareerTwin AI — frame-based character animation

   The source clip was analysed per-pixel to find what actually moves.
   Only a vertical strip (46% of the frame width) ever changes; the room
   behind it is completely static. So the room ships once at full
   1920x1080, and only the character strip is sprited.

   That's what keeps it sharp: packing whole 16:9 frames into one sheet
   forces every frame down to a few hundred pixels, and blowing that back
   up to fill a screen is what caused the blur. Spriting only the strip
   spends the same pixel budget on 1/2 the area, so the character renders
   at roughly native size while the room stays pristine.

   Tracking: cursor angle around the character's eyes -> frame index,
   spring-eased, cross-dissolved between adjacent frames, easing back to
   the idle pose when the pointer leaves.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- sheet geometry ---------- */

  var COLS = 12;
  var ROWS = 6;
  var FRAMES = 72;                 // 5 degrees of gaze per frame
  var DEG_PER_FRAME = 360 / FRAMES;

  // Where the animated strip sits inside the full frame, as fractions.
  // Measured from the motion analysis: x 463..1352 of 1920.
  var STRIP_X = 463 / 1920;
  var STRIP_W = 889 / 1920;

  var ROOM_ASPECT = 16 / 9;

  // The character's eyes within the full frame. Tracking is measured
  // from here so the gaze lands on the cursor, not near it.
  var EYE_X = 0.485;
  var EYE_Y = 0.330;

  /* ---------- elements ---------- */

  var canvas = document.getElementById('bgCanvas');
  var stageEl = document.getElementById('bg');
  var glow = document.getElementById('glow');
  var topbar = document.querySelector('.topbar');

  if (!canvas) return;

  var ctx = canvas.getContext('2d', { alpha: false });

  /* ---------- asset loading ---------- */

  function useMobile() {
    return window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) <= 1200;
  }

  var room = null;
  var sheet = null;
  var idle = null;
  var cellW = 0, cellH = 0;
  var loadedTier = null;

  function loadImage(src, cb) {
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () { cb(img); };
    img.onerror = function () { cb(null); };
    img.src = src;
  }

  function reveal() {
    if (stageEl) stageEl.classList.add('is-loaded');
  }

  loadImage('assets/room.jpg', function (img) {
    room = img;
    reveal();                       // room alone is already a valid picture
  });

  function loadTier() {
    var tier = useMobile() ? 'mobile' : 'desktop';
    if (tier === loadedTier) return;
    loadedTier = tier;

    loadImage('assets/char-' + tier + '.jpg', function (img) {
      if (!img) return;
      sheet = img;
      cellW = img.naturalWidth / COLS;
      cellH = img.naturalHeight / ROWS;
      reveal();
    });

    loadImage('assets/char-' + tier + '-idle.jpg', function (img) {
      idle = img;
      reveal();
    });
  }

  loadTier();

  /* ---------- canvas sizing (cover fit, DPR aware) ---------- */

  var viewW = 0, viewH = 0;
  var fitX = 0, fitY = 0, fitW = 0, fitH = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = window.innerWidth;
    viewH = window.innerHeight;

    canvas.width = Math.max(1, Math.round(viewW * dpr));
    canvas.height = Math.max(1, Math.round(viewH * dpr));
    canvas.style.width = viewW + 'px';
    canvas.style.height = viewH + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (viewW / viewH > ROOM_ASPECT) {
      fitW = viewW;
      fitH = viewW / ROOM_ASPECT;
    } else {
      fitH = viewH;
      fitW = viewH * ROOM_ASPECT;
    }
    fitX = (viewW - fitW) / 2;
    fitY = (viewH - fitH) / 2;

    dirty = true;
  }

  resize();

  /* ---------- tracking state ----------
     Angle is kept in its own space (degrees clockwise from "straight
     down") and converted to a frame index at draw time. The idle pose
     lives outside the sweep, so it's blended in separately rather than
     being mixed into the circular arithmetic. */

  var angle = 0;
  var angleVel = 0;
  var targetAngle = 0;

  var idleMix = 1;                 // 1 = fully at rest
  var pointerActive = false;

  // Critically damped (C = 2*sqrt(K)): a 90-degree turn lands in about
  // 280ms with no overshoot.
  var STIFFNESS = 700;
  var DAMPING = 53;
  var IDLE_EASE = 4.5;

  var PARALLAX = 16;
  var targetOffX = 0, targetOffY = 0;
  var offX = 0, offY = 0;

  var glowTX = 0, glowTY = 0, glowX = 0, glowY = 0;

  var dirty = true;

  function onPointerMove(cx, cy) {
    var eyeX = fitX + offX + EYE_X * fitW;
    var eyeY = fitY + offY + EYE_Y * fitH;

    var dx = cx - eyeX;
    var dy = cy - eyeY;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      var deg = Math.atan2(dy, dx) * 180 / Math.PI;   // 0 = right, +y = down
      targetAngle = ((deg - 90) + 360) % 360;          // clockwise from down
    }

    pointerActive = true;

    var nx = Math.max(-1, Math.min(1, dx / (viewW / 2)));
    var ny = Math.max(-1, Math.min(1, dy / (viewH / 2)));
    targetOffX = -nx * PARALLAX;
    targetOffY = -ny * PARALLAX * 0.6;

    glowTX = cx;
    glowTY = cy;
    dirty = true;
  }

  function onPointerLeave() {
    pointerActive = false;
    targetOffX = 0;
    targetOffY = 0;
    if (glow) glow.classList.remove('is-visible');
    dirty = true;
  }

  window.addEventListener('mousemove', function (e) {
    onPointerMove(e.clientX, e.clientY);
    if (glow) glow.classList.add('is-visible');
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  window.addEventListener('touchend', onPointerLeave);
  window.addEventListener('touchcancel', onPointerLeave);
  document.addEventListener('mouseleave', onPointerLeave);
  window.addEventListener('blur', onPointerLeave);

  var touchOnly = window.matchMedia('(hover: none)').matches;
  var drift = 0;

  /* ---------- drawing ---------- */

  function drawCell(index, alpha, sx, sy, sw, sh) {
    if (!sheet || alpha <= 0.002) return;
    var i = ((index % FRAMES) + FRAMES) % FRAMES;
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      sheet,
      (i % COLS) * cellW, Math.floor(i / COLS) * cellH, cellW, cellH,
      sx, sy, sw, sh
    );
  }

  function render() {
    var ox = fitX + offX;
    var oy = fitY + offY;

    // Static room, at its native resolution.
    ctx.globalAlpha = 1;
    if (room) {
      ctx.drawImage(room, ox, oy, fitW, fitH);
    } else {
      ctx.fillStyle = '#0B0B0E';
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // Animated character strip, positioned exactly where it was cut from.
    var sx = ox + STRIP_X * fitW;
    var sw = STRIP_W * fitW;

    if (idleMix < 0.998) {
      var pos = angle / DEG_PER_FRAME;
      var a = Math.floor(pos);
      var blend = pos - a;
      var trackAlpha = 1 - idleMix;

      // Cross-dissolve between neighbouring frames so 72 discrete poses
      // read as continuous motion.
      drawCell(a, trackAlpha, sx, oy, sw, fitH);
      if (blend > 0.002) drawCell(a + 1, trackAlpha * blend, sx, oy, sw, fitH);
    }

    if (idle && idleMix > 0.002) {
      ctx.globalAlpha = idleMix;
      ctx.drawImage(idle, sx, oy, sw, fitH);
    }

    ctx.globalAlpha = 1;
  }

  /* ---------- loop ---------- */

  function shortestAngle(t, c) {
    var d = (t - c) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  var last = null;

  function tick(ts) {
    if (last === null) last = ts;
    var dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;

    if (touchOnly && !pointerActive) {
      drift += dt * 12;
      targetAngle = drift % 360;
      pointerActive = true;
      dirty = true;
    }

    var prevAngle = angle;
    var prevMix = idleMix;

    var d = shortestAngle(targetAngle, angle);
    angleVel += (d * STIFFNESS - angleVel * DAMPING) * dt;
    angle = (angle + angleVel * dt) % 360;
    if (angle < 0) angle += 360;

    idleMix += ((pointerActive ? 0 : 1) - idleMix) * Math.min(1, IDLE_EASE * dt);

    offX += (targetOffX - offX) * 0.09;
    offY += (targetOffY - offY) * 0.09;

    // Only repaint when something actually changed.
    if (Math.abs(angle - prevAngle) > 0.01 || Math.abs(idleMix - prevMix) > 0.001) dirty = true;

    if (dirty) {
      render();
      dirty = false;
    }

    if (glow) {
      glowX += (glowTX - glowX) * 0.18;
      glowY += (glowTY - glowY) * 0.18;
      glow.style.transform =
        'translate3d(' + glowX.toFixed(1) + 'px,' + glowY.toFixed(1) + 'px,0) translate(-50%,-50%)';
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  /* ---------- resize ---------- */

  var rt = null;
  window.addEventListener('resize', function () {
    resize();
    clearTimeout(rt);
    rt = setTimeout(loadTier, 300);
  });

  window.addEventListener('orientationchange', function () {
    setTimeout(resize, 120);
  });

  /* ---------- scroll reveal ---------- */

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- sticky topbar ---------- */

  if (topbar) {
    var stuck = false;
    window.addEventListener('scroll', function () {
      var should = window.scrollY > 24;
      if (should !== stuck) { stuck = should; topbar.classList.toggle('is-stuck', stuck); }
    }, { passive: true });
  }

})();
