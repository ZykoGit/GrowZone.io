(function () {
  // Global input vector used by game.js
  window.input = { x: 0, y: 0 };

  function setupJoystick(isMobileScreenFn) {
    let joystickActive = false;
    let joystickCenter = { x: 0, y: 0 };
    let baseEl = null;
    let stickEl = null;

    const maxDist = 60; // visual radius

    function resetJoystick() {
      joystickActive = false;
      window.input.x = 0;
      window.input.y = 0;
      if (stickEl) stickEl.style.transform = 'translate(0px, 0px)';
      if (baseEl && baseEl.parentNode) {
        baseEl.parentNode.removeChild(baseEl);
      }
      baseEl = null;
      stickEl = null;
    }

    function createJoystick(x, y) {
      const base = document.createElement('div');
      base.style.position = 'fixed';
      base.style.width = '120px';
      base.style.height = '120px';
      base.style.marginLeft = '-60px';
      base.style.marginTop = '-60px';
      base.style.left = x + 'px';
      base.style.top = y + 'px';
      base.style.borderRadius = '50%';
      base.style.background = 'rgba(255,255,255,0.08)';
      base.style.zIndex = '15';
      base.style.touchAction = 'none';

      const stick = document.createElement('div');
      stick.style.position = 'absolute';
      stick.style.width = '60px';
      stick.style.height = '60px';
      stick.style.left = '50%';
      stick.style.top = '50%';
      stick.style.marginLeft = '-30px';
      stick.style.marginTop = '-30px';
      stick.style.borderRadius = '50%';
      stick.style.background = 'rgba(255,255,255,0.4)';
      stick.style.touchAction = 'none';

      base.appendChild(stick);
      document.body.appendChild(base);

      baseEl = base;
      stickEl = stick;

      const rect = base.getBoundingClientRect();
      joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    document.addEventListener('touchstart', e => {
      if (!isMobileScreenFn()) return;
      if (joystickActive) return;

      const touch = e.touches[0];
      joystickActive = true;
      createJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    document.addEventListener('touchmove', e => {
      if (!joystickActive || !baseEl || !stickEl) return;
      if (!isMobileScreenFn()) return;
      e.preventDefault();

      const touch = e.touches[0];
      const dx = touch.clientX - joystickCenter.x;
      const dy = touch.clientY - joystickCenter.y;

      let dist = Math.hypot(dx, dy);
      let clampedX = dx;
      let clampedY = dy;

      if (dist > maxDist) {
        clampedX = dx * maxDist / dist;
        clampedY = dy * maxDist / dist;
        dist = maxDist;
      }

      stickEl.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

      if (dist > 8) {
        window.input.x = clampedX / maxDist;
        window.input.y = clampedY / maxDist;
      } else {
        window.input.x = 0;
        window.input.y = 0;
      }
    }, { passive: false });

    document.addEventListener('touchend', () => {
      resetJoystick();
    });

    document.addEventListener('touchcancel', () => {
      resetJoystick();
    });
  }

  window.setupJoystick = setupJoystick;
})();
