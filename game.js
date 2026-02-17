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
  let gameStarted = false;

  let playerName = 'You';

  startBtn.addEventListener('click', () => {
    const raw = (nameInput.value || '').trim();
    playerName = raw.length > 0 ? raw : 'You';
    menu.style.display = 'none';
    gameStarted = true;
  });

  // WORLD
  const world = {
    width: 4000,
    height: 4000
  };

  // DANGER ZONE (simple circle that slowly shrinks)
  const dangerZone = {
    x: world.width / 2,
    y: world.height / 2,
    radius: Math.min(world.width, world.height) * 0.45,
    shrinkRate: 0.02 // per frame
  };

  // PLAYER
  const player = {
    x: world.width / 2,
    y: world.height / 2,
    radius: 30,
    minRadius: 15,
    maxRadius: 200,
    speed: 3,
    name: () => playerName
  };

  let input = { x: 0, y: 0 };

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
      vy: 0
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

    entries.push({
      name: player.name(),
      score: player.radius,
      you: true
    });

    for (const b of bots) {
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
  }

  // BOT AI HELPERS
  function vecTo(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function isInDangerZone(x, y) {
    return distance(x, y, dangerZone.x, dangerZone.y) < dangerZone.radius;
  }

  function updateBot(bot) {
    let dir = { x: 0, y: 0 };

    const centerDir = vecTo(bot.x, bot.y, world.width / 2, world.height / 2);
    const fromCenterDir = { x: -centerDir.x, y: -centerDir.y };

    const inDanger = isInDangerZone(bot.x, bot.y);

    if (inDanger) {
      dir.x += fromCenterDir.x * 2;
      dir.y += fromCenterDir.y * 2;
    } else {
      switch (bot.personality) {
        case 'dumb':
          if (Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2;
            dir.x += Math.cos(angle);
            dir.y += Math.sin(angle);
          } else {
            dir.x += bot.vx;
            dir.y += bot.vy;
          }
          break;
        case 'cautious':
          const awayFromPlayer = vecTo(player.x, player.y, bot.x, bot.y);
          if (player.radius > bot.radius * 1.2 &&
              distance(bot.x, bot.y, player.x, player.y) < 600) {
            dir.x += awayFromPlayer.x * 1.5;
            dir.y += awayFromPlayer.y * 1.5;
          } else {
            dir.x += centerDir.x * 0.5;
            dir.y += centerDir.y * 0.5;
          }
          break;
        case 'aggressive':
          if (player.radius < bot.radius * 0.8 &&
              distance(bot.x, bot.y, player.x, player.y) < 700) {
            const toPlayer = vecTo(bot.x, bot.y, player.x, player.y);
            dir.x += toPlayer.x * 1.2;
            dir.y += toPlayer.y * 1.2;
          } else {
            dir.x += centerDir.x * 0.7;
            dir.y += centerDir.y * 0.7;
          }
          break;
        case 'wander':
          if (Math.random() < 0.03) {
            const angle2 = Math.random() * Math.PI * 2;
            dir.x += Math.cos(angle2);
            dir.y += Math.sin(angle2);
          } else {
            dir.x += centerDir.x * 0.3;
            dir.y += centerDir.y * 0.3;
          }
          break;
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

    bot.x += bot.vx * bot.speed;
    bot.y += bot.vy * bot.speed;

    bot.x = Math.max(bot.radius, Math.min(world.width - bot.radius, bot.x));
    bot.y = Math.max(bot.radius, Math.min(world.height - bot.radius, bot.y));

    if (inDanger) {
      bot.radius -= 0.05;
    } else {
      bot.radius += 0.01;
    }

    if (bot.radius < 10) {
      const idx = bots.indexOf(bot);
      if (idx !== -1) bots.splice(idx, 1);
    }
  }

  // GAME UPDATE
  function update() {
    if (!gameStarted) return;

    dangerZone.radius -= dangerZone.shrinkRate;
    if (dangerZone.radius < 200) dangerZone.radius = 200;

    if (!isMobileScreen()) {
      updateKeyboardInput();
    }

    const moving = input.x !== 0 || input.y !== 0;

    if (moving) {
      player.x += input.x * player.speed;
      player.y += input.y * player.speed;

      player.radius -= 0.05;
      if (player.radius < player.minRadius) player.radius = player.minRadius;
    } else {
      player.radius += 0.08;
      if (player.radius > player.maxRadius) player.radius = player.maxRadius;
    }

    player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));

    if (isInDangerZone(player.x, player.y)) {
      player.radius -= 0.03;
      if (player.radius < player.minRadius) player.radius = player.minRadius;
    }

    for (const bot of [...bots]) {
      updateBot(bot);
    }
    ensureBots();

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

    // DANGER ZONE
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,80,80,0.7)';
    ctx.lineWidth = 6;
    ctx.arc(dangerZone.x, dangerZone.y, dangerZone.radius, 0, Math.PI * 2);
    ctx.stroke();

    // BOTS
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const bot of bots) {
      ctx.beginPath();
      ctx.fillStyle = '#ffb74d';
      ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.fillText(bot.name, bot.x, bot.y - bot.radius - 4);
    }

    // PLAYER
    ctx.beginPath();
    ctx.fillStyle = '#4caf50';
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.fillText(player.name(), player.x, player.y - player.radius - 4);

    ctx.restore();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }
  loop();
};
