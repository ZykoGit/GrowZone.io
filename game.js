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

  function isMobileScreen() {
    return window.innerWidth < 900;
  }

  const pcHint = document.getElementById('pcHint');
  const leaderboardList = document.getElementById('leaderboardList');
  const zoneTimerEl = document.getElementById('zoneTimer');
  const zoneWarningEl = document.getElementById('zoneWarning');
  const menu = document.getElementById('menu');
  const startBtn = document.getElementById('startBtn');
  const nameInput = document.getElementById('nameInput');

  function updateLayout() {
    pcHint.style.display = isMobileScreen() ? 'none' : 'block';
  }
  updateLayout();

  // AUDIO
  const audio = setupAudio();
  const { sounds, initMusic, setMusicDangerMode, updateMusicVolume, stopMovementLoops, updateMovementSounds } = audio;

  // WORLD
  const world = { width: 4000, height: 4000 };

  const dangerZone = {
    x: world.width / 2,
    y: world.height / 2,
    radius: Math.min(world.width, world.height) * 0.45,
    targetRadius: Math.min(world.width, world.height) * 0.45
  };

  const zoneShrinkInterval = 60;
  const zoneWarningLead = 30;
  const zoneShrinkAmount = 250;
  const zoneShrinkSpeed = 180; // smooth shrink speed
  let zoneTimer = 0;
  let lastTickSecond = null;
  let zoneLevel = 0;

  // PLAYER
  let playerName = 'You';
  const player = {
    x: world.width / 2,
    y: world.height / 2,
    radius: 30,
    minRadius: 15,
    maxRadius: 250,
    speed: 3,
    alive: false,
    name: () => playerName
  };

  let respawnMode = 'full';
  let gameStarted = false;

  // PLAYER DEATH HANDLER
  function handlePlayerDeath() {
    player.alive = false;
    stopMovementLoops();
    sounds.menureturn.play();

    let doSoft = false;
    if (zoneLevel < 3) doSoft = Math.random() < 0.5;

    if (!doSoft) {
      respawnMode = 'full';
      hardResetWorld();
    } else {
      respawnMode = 'soft';
      softResetWorld();
    }

    gameStarted = false;
    menu.style.display = 'flex';
  }

  // BOTS SYSTEM
  const botsSystem = createBotsSystem(world, dangerZone, player, audio, handlePlayerDeath);
  const { bots, ensureBots, updateBots, handleEating, scrambleBotNames } = botsSystem;
  ensureBots();

  // INPUT
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
      window.input.x = x / len;
      window.input.y = y / len;
    } else {
      window.input.x = 0;
      window.input.y = 0;
    }
  }

  // JOYSTICK
  setupJoystick(isMobileScreen);

  // HELPERS
  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function isInFog(x, y) {
    return distance(x, y, dangerZone.x, dangerZone.y) > dangerZone.radius;
  }

  function spawnPlayerCenter() {
    player.x = dangerZone.x;
    player.y = dangerZone.y;
  }

  function spawnPlayerRandomSafe() {
    let attempts = 0;
    while (attempts < 30) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (dangerZone.radius - player.radius - 40);
      const x = dangerZone.x + Math.cos(angle) * r;
      const y = dangerZone.y + Math.sin(angle) * r;

      if (isInFog(x, y)) continue;

      let bad = false;
      for (const b of bots) {
        if (!b.alive) continue;
        if (distance(x, y, b.x, b.y) < (player.radius + b.radius) * 0.9) {
          bad = true;
          break;
        }
      }
      if (!bad) {
        player.x = x;
        player.y = y;
        return;
      }
    }
    spawnPlayerCenter();
  }

  function hardResetWorld() {
    bots.length = 0;
    ensureBots();
    dangerZone.radius = Math.min(world.width, world.height) * 0.45;
    dangerZone.targetRadius = dangerZone.radius;
    zoneTimer = 0;
    lastTickSecond = null;
    zoneLevel = 0;
    zoneWarningEl.style.display = 'none';
  }

  function softResetWorld() {
    scrambleBotNames();
    zoneWarningEl.style.display = 'none';
    lastTickSecond = null;
  }

  function getZoom() {
    return 35 / player.radius;
  }

  function updateLeaderboard() {
    const entries = [];

    if (player.alive) {
      entries.push({ name: player.name(), score: player.radius, you: true });
    }

    for (const b of bots) {
      if (!b.alive) continue;
      entries.push({ name: b.name, score: b.radius, you: false });
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

  // START BUTTON
  startBtn.addEventListener('click', () => {
    const raw = (nameInput.value || '').trim();
    playerName = raw.length > 0 ? raw : 'You';
    sounds.startclick.play();
    sounds.nameaccept.play();
    sounds.gamestart.play();
    initMusic();

    player.radius = 30;
    player.alive = true;

    if (respawnMode === 'soft') {
      spawnPlayerRandomSafe();
    } else {
      spawnPlayerCenter();
    }

    menu.style.display = 'none';
    gameStarted = true;
  });

  // GAME LOOP
  let lastTime = performance.now();

  function update(dt) {
    if (!gameStarted) {
      updateMusicVolume(dt);
      return;
    }

    // ZONE TIMER
    zoneTimer += dt;
    const remaining = zoneShrinkInterval - zoneTimer;

    if (remaining <= zoneWarningLead && remaining > 0) {
      if (zoneWarningEl.style.display === 'none') {
        zoneWarningEl.style.display = 'block';
        sounds.zonewarning.play();
      }
    } else {
      zoneWarningEl.style.display = 'none';
    }

    if (remaining <= 5 && remaining > 0) {
      const sec = Math.ceil(remaining);
      if (sec !== lastTickSecond) {
        lastTickSecond = sec;
        sounds.zonetick.play();
      }
    }

    // SMOOTH SHRINK
    if (zoneTimer >= zoneShrinkInterval) {
      dangerZone.targetRadius -= zoneShrinkAmount;
      if (dangerZone.targetRadius < 200) dangerZone.targetRadius = 200;
      zoneTimer = 0;
      lastTickSecond = null;
      zoneLevel++;
      sounds.zoneboom.play();
      sounds.zoneshrink.play();
    }

    // Smoothly animate radius toward target
    if (dangerZone.radius !== dangerZone.targetRadius) {
      const diff = dangerZone.targetRadius - dangerZone.radius;
      const step = Math.sign(diff) * zoneShrinkSpeed * dt;
      if (Math.abs(step) > Math.abs(diff)) {
        dangerZone.radius = dangerZone.targetRadius;
      } else {
        dangerZone.radius += step;
      }
    }

    // INPUT
    if (!isMobileScreen()) updateKeyboardInput();

    if (!player.alive) {
      updateLeaderboard();
      updateMusicVolume(dt);
      return;
    }

    const moving = window.input.x !== 0 || window.input.y !== 0;

    if (moving) {
      player.x += window.input.x * player.speed * dt * 60;
      player.y += window.input.y * player.speed * dt * 60;

      player.radius -= 3 * dt;
      if (player.radius < player.minRadius) player.radius = player.minRadius;
    } else {
      player.radius += 4.8 * dt;
      if (player.radius > player.maxRadius) player.radius = player.maxRadius;
    }

    player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));

    const inFog = isInFog(player.x, player.y);
    if (inFog) {
      player.radius -= 15 * dt;
      if (player.radius < 15) {
        sounds.playerdeath.play();
        handlePlayerDeath();
        updateMusicVolume(dt);
        return;
      }
    }

    updateMovementSounds(moving, inFog);
    setMusicDangerMode(inFog || remaining <= zoneWarningLead);

    updateBots(dt);
    handleEating(dt);
    updateLeaderboard();
    updateMusicVolume(dt);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) return;

    const zoom = getZoom();
    ctx.save();
    ctx.scale(zoom, zoom);

    const camX = player.x - canvas.width / (2 * zoom);
    const camY = player.y - canvas.height / (2 * zoom);
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;

    ctx.translate(-camX, -camY);

    // GRID
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

    // BOTS
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const bot of bots) {
      if (!bot.alive) continue;

      ctx.beginPath();
      ctx.fillStyle = '#ffb74d';
      ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
      ctx.fill();

      const fontSize = Math.max(12, bot.radius * 0.45);
      ctx.fillStyle = '#fff';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(bot.name, bot.x, bot.y - bot.radius - 4);
    }

    // PLAYER
    if (player.alive) {
      ctx.beginPath();
      ctx.fillStyle = '#4caf50';
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();

      const fontSize = Math.max(12, player.radius * 0.45);
      ctx.fillStyle = '#fff';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(player.name(), player.x, player.y - player.radius - 4);
    }

// FOG OVERLAY (final working version)
ctx.save();

// Draw fog over the visible world area (world coordinates)
ctx.globalAlpha = 0.28;
ctx.fillStyle = '#ff0000';
ctx.fillRect(camX, camY, viewW, viewH);

// Cut out the safe zone (also world coordinates)
ctx.globalCompositeOperation = 'destination-out';
ctx.beginPath();
ctx.arc(dangerZone.x, dangerZone.y, dangerZone.radius, 0, Math.PI * 2);
ctx.fill();

// Restore normal drawing mode
ctx.restore();
ctx.globalCompositeOperation = 'source-over';


    // ZONE LINE
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
