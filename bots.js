function createBotsSystem(world, dangerZone, player, audio, onPlayerDeath) {

    const { sounds } = audio;

    const bots = [];
    const BOT_COUNT = 25;

    function randomName() {
        const names = [
            "NoodleNugget", "PuffFluff", "PloopBop", "FlibberSnout",
            "Zorp", "Muncher", "Globbo", "Snarf", "Bibble", "Womp"
        ];
        return names[Math.floor(Math.random() * names.length)];
    }

    function spawnBotInsideSafeZone(bot) {
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (dangerZone.radius - bot.radius - 40);
            bot.x = dangerZone.x + Math.cos(angle) * r;
            bot.y = dangerZone.y + Math.sin(angle) * r;

            let bad = false;
            for (const other of bots) {
                if (!other.alive || other === bot) continue;
                if (Math.hypot(bot.x - other.x, bot.y - other.y) < bot.radius + other.radius) {
                    bad = true;
                    break;
                }
            }
            if (!bad) return;
        }

        bot.x = dangerZone.x;
        bot.y = dangerZone.y;
    }

    function createBot() {
        const bot = {
            x: 0,
            y: 0,
            radius: 20 + Math.random() * 20,
            speed: 2 + Math.random(),
            alive: true,
            name: randomName(),
            vx: 0,
            vy: 0
        };

        spawnBotInsideSafeZone(bot);
        return bot;
    }

    function ensureBots() {
        while (bots.length < BOT_COUNT) {
            bots.push(createBot());
        }
    }

    function updateBots(dt) {
        for (const bot of bots) {
            if (!bot.alive) continue;

            // Random wandering
            if (Math.random() < 0.02) {
                const angle = Math.random() * Math.PI * 2;
                bot.vx = Math.cos(angle);
                bot.vy = Math.sin(angle);
            }

            bot.x += bot.vx * bot.speed * dt * 60;
            bot.y += bot.vy * bot.speed * dt * 60;

            // Stay inside world
            bot.x = Math.max(bot.radius, Math.min(world.width - bot.radius, bot.x));
            bot.y = Math.max(bot.radius, Math.min(world.height - bot.radius, bot.y));

            // Fog damage
            const d = Math.hypot(bot.x - dangerZone.x, bot.y - dangerZone.y);
            if (d > dangerZone.radius) {
                bot.radius -= 10 * dt;
                if (bot.radius < 10) {
                    bot.alive = false;
                    sounds.botdeath.play();
                }
            }
        }
    }

    function handleEating(dt) {
        for (const bot of bots) {
            if (!bot.alive) continue;

            const d = Math.hypot(bot.x - player.x, bot.y - player.y);
            if (d < bot.radius + player.radius) {
                if (bot.radius > player.radius) {
                    sounds.playerdeath.play();
                    onPlayerDeath();
                    return;
                } else {
                    bot.alive = false;
                    player.radius += bot.radius * 0.4;
                    sounds.boteat.play();
                }
            }
        }
    }

    function scrambleBotNames() {
        for (const bot of bots) {
            if (bot.alive) bot.name = randomName();
        }
    }

    return {
        bots,
        ensureBots,
        updateBots,
        handleEating,
        scrambleBotNames,
        spawnBotInsideSafeZone
    };
}
