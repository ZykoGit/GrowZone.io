window.onload = () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', () => {
    resize();
    updateLayout();
  });
  resize();

  // Responsive layout
  function isMobileScreen() {
    return window.innerWidth < 900;
  }

  const mobileControls = document.getElementById('mobileControls');
  const pcHint = document.getElementById('pcHint');

  function updateLayout() {
    if (isMobileScreen()) {
      mobileControls.style.display = 'block';
      pcHint.style.display = 'none';
    } else {
      mobileControls.style.display = 'none';
      pcHint.style.display = 'block';
    }
  }
  updateLayout();

  // MENU + NAME
  const menu = document.getElementById('menu');
  const startBtn = document.getElementById('startBtn');
  const nameInput = document.getElementById('nameInput');
  const zoneWarningEl = document.getElementById('zoneWarning');
  const zoneTimerEl = document.getElementById('zoneTimer');

  let gameStarted = false;
  let playerName = 'You';

  // WORLD
  const world = {
    width: 4000,
    height: 4000
  };

  // DANGER ZONE (safe circle; fog is outside)
  const dangerZone = {
    x: world.width / 2,
    y: world.height / 2,
    radius: Math.min(world.width, world.height) * 0.45
  };

  const zoneShrinkInterval = 60; // seconds between shrinks
  const zoneWarningLead = 30;    // seconds before shrink to warn
  const zoneShrinkAmount = 250;  // how much radius shrinks each time
  let zoneTimer = 0;             // seconds since last shrink

  // PLAYER
  const player = {
    x: world.width / 2,
    y: world.height / 2,
    radius: 30,
    minRadius: 15,
    maxRadius: 250,
    speed: 3,
    alive: true,
    name: () => playerName
  };

  let input = { x: 0, y: 0 };

  function resetGameState() {
    player.x = world.width / 2;
    player.y = world.height / 2;
    player.radius = 30;
    player.alive = true;

    dangerZone.radius = Math.min(world.width, world.height) * 0.45;
    zoneTimer = 0;

    bots.length = 0;
    ensureBots();

    gameStarted = false;
    menu.style.display = 'flex';
  }

  startBtn.addEventListener('click', () => {
    const raw = (nameInput.value || '').trim();
    playerName = raw.length > 0 ? raw : 'You';
    menu.style.display = 'none';
    gameStarted = true;
  });

  // Keyboard
  const keys = {};
  window.addEventListener('keydown', e => keys[e.key] = true);
  window.addEventListener('keyup', e => keys[e.key] = false);

  function updateKeyboardInput() {
    let x = 0, y = 0;
    if (keys['w'] || keys['ArrowUp']) y -= 1;
    if (keys['s'] || keys['ArrowDown']) y += 1;
    if (keys['a'] || keys['ArrowLeft']) x -= 1;
    if (keys['d'] || keys['ArrowRight']) x += 1;

    const len = Math.hypot(x, y);
    if (len > 0) {
      input.x = x / len;
      input.y = y / len;
    } else {
      input.x = 0;
      input.y = 0;
    }
  }

  // Mobile joystick
  const joystickBase = document.getElementById('joystickBase');
  const joystickStick = document.getElementById('joystickStick');
  let joystickActive = false;
  let joystickCenter = { x: 0, y: 0 };

  if (joystickBase && joystickStick) {
    joystickBase.addEventListener('touchstart', e => {
      e.preventDefault();
      joystickActive = true;
      const rect = joystickBase.getBoundingClientRect();
      joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });

    joystickBase.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!joystickActive) return;

      const touch = e.touches[0];
      const dx = touch.clientX - joystickCenter.x;
      const dy = touch.clientY - joystickCenter.y;

      const maxDist = 40;
      let dist = Math.hypot(dx, dy);

      let nx = dx, ny = dy;
      if (dist > maxDist) {
        nx = dx * maxDist / dist;
        ny = dy * maxDist / dist;
        dist = maxDist;
      }

      joystickStick.style.transform = `translate(${nx}px, ${ny}px)`;

      if (dist > 5) {
        input.x = dx / dist;
        input.y = dy / dist;
      } else {
        input.x = 0;
        input.y = 0;
      }
    });

    joystickBase.addEventListener('touchend', e => {
      e.preventDefault();
      joystickActive = false;
      joystickStick.style.transform = 'translate(0px, 0px)';
      input.x = 0;
      input.y = 0;
    });
  }

  // CAMERA + ZOOM
  function getZoom() {
    return 35 / player.radius;
  }

  // BOT SYSTEM
  const bots = [];
  const targetBotCount = 10;

  const sillyFirst = [
    'Wobble', 'Flibber', 'Snorkle', 'Jibble', 'Ploop', 'Doodle',
    'Noodle', 'Bumble', 'Fizzle', 'Glimmer', 'Puff', 'Twiddle'
  ];
  const sillySecond = [
    'Snout', 'Dunk', 'Pop', 'Chonk', 'Bean', 'Mop',
    'Nugget', 'Sprout', 'Fizz', 'Blob', 'Bop', 'Fluff'
  ];

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateBotName() {
    return randomFrom(sillyFirst) + randomFrom(sillySecond);
  }

  function createBot() {
    const angle = Math.random() * Math.PI * 2;
    const dist = world.width * 0.45 + Math.random() * 400;
    const x = world.width / 2 + Math.cos(angle) * dist;
    const y = world.height / 2 + Math.sin(angle) * dist;

    const personalities = ['dumb', 'cautious', 'aggressive', 'wander', 'center'];
    const personality = personalities[Math.floor(Math.random() * personalities.length)];

    return {
      x,
      y,
      radius: 20 + Math.random() * 20,
      speed: 2 + Math.random() * 0.8,
      name: generateBotName(),
      personality,
      vx: 0,
      vy: 0,
      alive: true
    };
  }

  function ensureBots() {
    while (bots.length < targetBotCount) {
      bots.push(createBot());
    }
  }
  ensureBots();

  // LEADERBOARD
  const leaderboardList = document.getElementById('leaderboardList');

  function updateLeaderboard() {
    const entries = [];

    if (player.alive) {
      entries.push({
        name: player.name(),
        score: player.radius,
        you: true
      });
    }

    for (const b of bots) {
      if (!b.alive) continue;
      entries.push({
        name: b.name,
        score: b.radius,
        you: false
      });
    }

    entries.sort((a, b) => b.score - a.score);

    const top = entries.slice(0, 5);

    leaderboardList.innerHTML = '';
    for (const e of top) {
      const li = document.createElement('li');
      if (e.you) li.classList.add('you');
      const nameSpan = document.createElement('span');
      nameSpan.textContent = e.name;
      const scoreSpan = document.createElement('span');
      scoreSpan.textContent = Math.round(e.score);
      li.appendChild(nameSpan);
      li.appendChild(scoreSpan);
      leaderboardList.appendChild(li);
    }

    const remaining = Math.max(0, zoneShrinkInterval - zoneTimer);
    zoneTimerEl.textContent = `Next shrink: ${Math.ceil(remaining)}s`;
  }

  // HELPERS
  function vecTo(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function isInFog(x, y) {
    // Fog is OUTSIDE the danger zone circle
    return distance(x, y, dangerZone.x, dangerZone.y) > dangerZone.radius;
  }

  // BOT AI
  function updateBot(bot, dt) {
    if (!bot.alive) return;

    let dir = { x: 0, y: 0 };

    const centerDir = vecTo(bot.x, bot.y, world.width / 2, world.height / 2);
    const inFog = isInFog(bot.x, bot.y);

    if (inFog) {
      // Push inward strongly if in fog
      dir.x += centerDir.x * 2.5;
      dir.y += centerDir.y * 2.5;
    } else {
      switch (bot.personality) {
        case 'dumb': {
          if (Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2;
            dir.x += Math.cos(angle);
            dir.y += Math.sin(angle);
          } else {
            dir.x += bot.vx;
            dir.y += bot.vy;
          }
          break;
        }
        case 'cautious': {
          const awayFromPlayer = vecTo(player.x, player.y, bot.x, bot.y);
          if (player.alive &&
              player.radius > bot.radius * 1.2 &&
              distance(bot.x, bot.y, player.x, player.y) < 600) {
            dir.x += awayFromPlayer.x * 1.5;
            dir.y += awayFromPlayer.y * 1.5;
          } else {
            dir.x += centerDir.x * 0.7;
            dir.y += centerDir.y * 0.7;
          }
          break;
        }
        case 'aggressive': {
          if (player.alive &&
              player.radius < bot.radius * 0.8 &&
              distance(bot.x, bot.y, player.x, player.y) < 700) {
            const toPlayer = vecTo(bot.x, bot.y, player.x, player.y);
            dir.x += toPlayer.x * 1.2;
            dir.y += toPlayer.y * 1.2;
          } else {
            dir.x += centerDir.x * 0.7;
            dir.y += centerDir.y * 0.7;
          }
          break;
        }
        case 'wander': {
          if (Math.random() < 0.03) {
            const angle2 = Math.random() * Math.PI * 2;
            dir.x += Math.cos(angle2);
            dir.y += Math.sin(angle2);
          } else {
            dir.x += centerDir.x * 0.4;
            dir.y += centerDir.y * 0.4;
          }
          break;
        }
        case 'center':
        default:
          dir.x += centerDir.x;
          dir.y += centerDir.y;
          break;
      }
    }

    const len = Math.hypot(dir.x, dir.y) || 1;
    dir.x /= len;
    dir.y /= len;

    bot.vx = dir.x;
    bot.vy = dir.y;

    bot.x += bot.vx * bot.speed * dt * 60;
    bot.y += bot.vy * bot.speed * dt * 60;

    bot.x = Math.max(bot.radius, Math.min(world.width - bot.radius, bot.x));
    bot.y = Math.max(bot.radius, Math.min(world.height - bot.radius, bot.y));

    // Zone damage
    if (isInFog(bot.x, bot.y)) {
      bot.radius -= 15 * dt; // 15 damage per second
    } else {
      bot.radius += 0.5 * dt;
    }

    if (bot.radius < 10) {
      bot.alive = false;
    }
  }

  // MASS / EATING
  function massFromRadius(r) {
    return r * r;
  }

  function radiusFromMass(m) {
    return Math.sqrt(Math.max(1, m));
  }

  function handleEating(dt) {
    if (!player.alive) return;

    // Player vs bots
    for (const bot of bots) {
      if (!bot.alive) continue;
      const d = distance(player.x, player.y, bot.x, bot.y);
      const biggerPlayer = player.radius > bot.radius * 1.1;
      const biggerBot = bot.radius > player.radius * 1.1;

      const eatDist = Math.min(player.radius, bot.radius) * 0.8;

      if (d < eatDist) {
        if (biggerPlayer) {
          // Player eats bot
          const mPlayer = massFromRadius(player.radius);
          const mBot = massFromRadius(bot.radius);
          const gain = mBot * 0.3;
          const newMass = mPlayer + gain;
          player.radius = radiusFromMass(newMass);
          bot.alive = false;
        } else if (biggerBot) {
          // Bot eats player
          const mPlayer = massFromRadius(player.radius);
          const mBot = massFromRadius(bot.radius);
          const gain = mPlayer * 0.3;
          const newMass = mBot + gain;
          bot.radius = radiusFromMass(newMass);
          player.alive = false;
          resetGameState();
          return;
        }
      }
    }

    // Clean up dead bots and respawn
    for (let i = bots.length - 1; i >= 0; i--) {
      if (!bots[i].alive) bots.splice(i, 1);
    }
    ensureBots();
  }

  // GAME UPDATE
  let lastTime = performance.now();

  function update(dt) {
    if (!gameStarted) return;

    // Zone timer
    zoneTimer += dt;
    const remaining = zoneShrinkInterval - zoneTimer;

    if (remaining <= zoneWarningLead && remaining > 0) {
      zoneWarningEl.style.display = 'block';
    } else {
      zoneWarningEl.style.display = 'none';
    }

    if (zoneTimer >= zoneShrinkInterval) {
      dangerZone.radius -= zoneShrinkAmount;
      if (dangerZone.radius < 200) dangerZone.radius = 200;
      zoneTimer = 0;
    }

    if (!isMobileScreen()) {
      updateKeyboardInput();
    }

    if (!player.alive) return;

    const moving = input.x !== 0 || input.y !== 0;

    if (moving) {
      player.x += input.x * player.speed * dt * 60;
      player.y += input.y * player.speed * dt * 60;

      player.radius -= 3 * dt;
      if (player.radius < player.minRadius) player.radius = player.minRadius;
    } else {
      player.radius += 4.8 * dt;
      if (player.radius > player.maxRadius) player.radius = player.maxRadius;
    }

    player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));

    // Zone damage (fog)
    if (isInFog(player.x, player.y)) {
      player.radius -= 15 * dt; // 15 damage per second
      if (player.radius < 15) {
        // Death by zone
        player.alive = false;
        resetGameState();
        return;
      }
    }

    // Bots
    for (const bot of bots) {
      updateBot(bot, dt);
    }

    // Eating
    handleEating(dt);

    // Leaderboard
    updateLeaderboard();
  }

  // DRAW
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) return;

    const zoom = getZoom();

    ctx.save();
    ctx.scale(zoom, zoom);

    const camX = player.x - canvas.width / (2 * zoom);
    const camY = player.y - canvas.height / (2 * zoom);

    ctx.translate(-camX, -camY);

    // WORLD GRID
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    const step = 100;
    for (let x = 0; x < world.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, world.height);
      ctx.stroke();
    }
    for (let y = 0; y < world.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(world.width, y);
      ctx.stroke();
    }

    // BOTS (under fog & zone line)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const bot of bots) {
      if (!bot.alive) continue;

      ctx.beginPath();
      ctx.fillStyle = '#ffb74d';
      ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
      ctx.fill();

      const fontSize = Math.max(10, Math.min(24, bot.radius * 0.4));
      ctx.fillStyle = '#fff';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(bot.name, bot.x, bot.y - bot.radius - 4);
    }

    // PLAYER (under fog & zone line)
    if (player.alive) {
      ctx.beginPath();
      ctx.fillStyle = '#4caf50';
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();

      const fontSize = Math.max(10, Math.min(26, player.radius * 0.45));
      ctx.fillStyle = '#fff';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(player.name(), player.x, player.y - player.radius - 4);
    }

    // FOG OVERLAY (outside zone)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(camX, camY, world.width, world.height);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(dangerZone.x, dangerZone.y, dangerZone.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ZONE LINE (on top of everything)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,80,80,0.9)';
    ctx.lineWidth = 6;
    ctx.arc(dangerZone.x, dangerZone.y, dangerZone.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
};
