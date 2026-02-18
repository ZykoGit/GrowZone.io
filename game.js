window.onload = () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    // UI elements
    const leaderboardList = document.getElementById("leaderboardList");
    const zoneTimerEl = document.getElementById("zoneTimer");
    const zoneWarningEl = document.getElementById("zoneWarning");
    const menu = document.getElementById("menu");
    const startBtn = document.getElementById("startBtn");
    const nameInput = document.getElementById("nameInput");

    // AUDIO (from audio.js)
    const audio = setupAudio();
    const { sounds, initMusic, updateMusicVolume, setMusicDangerMode, stopMovementLoops, updateMovementSounds } = audio;

    // WORLD
    const world = { width: 4000, height: 4000 };

    // SAFE ZONE
    const dangerZone = {
        x: world.width / 2,
        y: world.height / 2,
        radius: 1800,
        targetRadius: 1800
    };

    const zoneShrinkInterval = 60;
    const zoneShrinkAmount = 250;
    const zoneShrinkSpeed = 180;
    const zoneWarningLead = 30;

    let zoneTimer = 0;
    let lastTickSecond = null;
    let zoneLevel = 0;

    // PLAYER
    let playerName = "You";
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

    let gameStarted = false;
    let respawnMode = "full";

    // BOTS (from bots.js)
    const botsSystem = createBotsSystem(world, dangerZone, player, audio, handlePlayerDeath);
    const { bots, ensureBots, updateBots, handleEating, scrambleBotNames } = botsSystem;
    ensureBots();

    // INPUT
    const keys = {};
    window.addEventListener("keydown", e => keys[e.key] = true);
    window.addEventListener("keyup", e => keys[e.key] = false);

    setupJoystick(() => window.innerWidth < 900);

    function updateKeyboardInput() {
        let x = 0, y = 0;
        if (keys["w"] || keys["ArrowUp"]) y -= 1;
        if (keys["s"] || keys["ArrowDown"]) y += 1;
        if (keys["a"] || keys["ArrowLeft"]) x -= 1;
        if (keys["d"] || keys["ArrowRight"]) x += 1;

        const len = Math.hypot(x, y);
        if (len > 0) {
            window.input.x = x / len;
            window.input.y = y / len;
        } else {
            window.input.x = 0;
            window.input.y = 0;
        }
    }

    // HELPERS
    function dist(a, b, c, d) {
        return Math.hypot(c - a, d - b);
    }

    function isInFog(x, y) {
        return dist(x, y, dangerZone.x, dangerZone.y) > dangerZone.radius;
    }

    function spawnPlayerCenter() {
        player.x = dangerZone.x;
        player.y = dangerZone.y;
    }

    function spawnPlayerRandomSafe() {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (dangerZone.radius - player.radius - 40);
            const x = dangerZone.x + Math.cos(angle) * r;
            const y = dangerZone.y + Math.sin(angle) * r;

            if (!isInFog(x, y)) {
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
        dangerZone.radius = 1800;
        dangerZone.targetRadius = 1800;
        zoneTimer = 0;
        lastTickSecond = null;
        zoneLevel = 0;
        zoneWarningEl.style.display = "none";
    }

    function softResetWorld() {
        scrambleBotNames();
        zoneWarningEl.style.display = "none";
        lastTickSecond = null;
    }

    function handlePlayerDeath() {
        player.alive = false;
        stopMovementLoops();
        sounds.menureturn.play();

        if (zoneLevel < 3 && Math.random() < 0.5) {
            respawnMode = "soft";
            softResetWorld();
        } else {
            respawnMode = "full";
            hardResetWorld();
        }

        gameStarted = false;
        menu.style.display = "flex";
    }

    function getZoom() {
        return 35 / player.radius;
    }

    function updateLeaderboard() {
        const entries = [];

        if (player.alive) entries.push({ name: player.name(), score: player.radius, you: true });
        for (const b of bots) if (b.alive) entries.push({ name: b.name, score: b.radius });

        entries.sort((a, b) => b.score - a.score);

        leaderboardList.innerHTML = "";
        for (const e of entries.slice(0, 5)) {
            const li = document.createElement("li");
            if (e.you) li.classList.add("you");
            li.innerHTML = `<span>${e.name}</span><span>${Math.round(e.score)}</span>`;
            leaderboardList.appendChild(li);
        }

        zoneTimerEl.textContent = `Next shrink: ${Math.ceil(Math.max(0, zoneShrinkInterval - zoneTimer))}s`;
    }

    // START BUTTON
    startBtn.addEventListener("click", () => {
        playerName = (nameInput.value || "").trim() || "You";

        sounds.startclick.play();
        sounds.nameaccept.play();
        sounds.gamestart.play();
        initMusic();

        player.radius = 30;
        player.alive = true;

        if (respawnMode === "soft") spawnPlayerRandomSafe();
        else spawnPlayerCenter();

        menu.style.display = "none";
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
            if (zoneWarningEl.style.display === "none") {
                zoneWarningEl.style.display = "block";
                sounds.zonewarning.play();
            }
        } else {
            zoneWarningEl.style.display = "none";
        }

        if (remaining <= 5 && remaining > 0) {
            const sec = Math.ceil(remaining);
            if (sec !== lastTickSecond) {
                lastTickSecond = sec;
                sounds.zonetick.play();
            }
        }

        if (zoneTimer >= zoneShrinkInterval) {
            dangerZone.targetRadius -= zoneShrinkAmount;
            if (dangerZone.targetRadius < 200) dangerZone.targetRadius = 200;
            zoneTimer = 0;
            lastTickSecond = null;
            zoneLevel++;
            sounds.zoneboom.play();
            sounds.zoneshrink.play();
        }

        // Smooth shrink
        const diff = dangerZone.targetRadius - dangerZone.radius;
        if (Math.abs(diff) > 0.1) {
            dangerZone.radius += Math.sign(diff) * zoneShrinkSpeed * dt;
        }

        // INPUT
        if (window.innerWidth >= 900) updateKeyboardInput();

        if (!player.alive) {
            updateLeaderboard();
            updateMusicVolume(dt);
            return;
        }

        const moving = window.input.x !== 0 || window.input.y !== 0;

        if (moving) {
            player.x += window.input.x * player.speed * dt * 60;
            player.y += window.input.y * player.speed * dt * 60;
            player.radius = Math.max(player.minRadius, player.radius - 3 * dt);
        } else {
            player.radius = Math.min(player.maxRadius, player.radius + 4.8 * dt);
        }

        player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));

        const inFog = isInFog(player.x, player.y);
        if (inFog) {
            player.radius -= 15 * dt;
            if (player.radius < 15) {
                sounds.playerdeath.play();
                handlePlayerDeath();
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
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 2;
        for (let x = 0; x < world.width; x += 100) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, world.height);
            ctx.stroke();
        }
        for (let y = 0; y < world.height; y += 100) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(world.width, y);
            ctx.stroke();
        }

        // BOTS
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        for (const bot of bots) {
            if (!bot.alive) continue;

            ctx.beginPath();
            ctx.fillStyle = "#ffb74d";
            ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
            ctx.fill();

            const fontSize = Math.max(12, bot.radius * 0.45);
            ctx.fillStyle = "#fff";
            ctx.font = `${fontSize}px sans-serif`;
            ctx.fillText(bot.name, bot.x, bot.y - bot.radius - 4);
        }

        // PLAYER
        if (player.alive) {
            ctx.beginPath();
            ctx.fillStyle = "#4caf50";
            ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            ctx.fill();

            const fontSize = Math.max(12, player.radius * 0.45);
            ctx.fillStyle = "#fff";
            ctx.font = `${fontSize}px sans-serif`;
            ctx.fillText(player.name(), player.x, player.y - player.radius - 4);
        }

        // FOG (WORLD SPACE, FIXED)
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(camX, camY, viewW, viewH);

        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(dangerZone.x, dangerZone.y, dangerZone.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.globalCompositeOperation = "source-over";
        // ANTI‑FOG OVERLAY (cancels red tint inside safe zone)
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(dangerZone.x, dangerZone.y, dangerZone.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = "source-over";

        // ZONE OUTLINE
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,80,80,0.9)";
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
