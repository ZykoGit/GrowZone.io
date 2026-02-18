(function () {
  function createBotsSystem(world, dangerZone, player, audio, handlePlayerDeath) {
    const { sounds } = audio;
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

    function distance(x1, y1, x2, y2) {
      return Math.hypot(x2 - x1, y2 - y1);
    }

    function vecTo(fromX, fromY, toX, toY) {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    }

    function isInFog(x, y) {
      return distance(x, y, dangerZone.x, dangerZone.y) > dangerZone.radius;
    }

    function createBotRaw() {
      const angle = Math.random() * Math.PI * 2;
      const dist = dangerZone.radius + 200 + Math.random() * 400;
      const x = dangerZone.x + Math.cos(angle) * dist;
      const y = dangerZone.y + Math.sin(angle) * dist;

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

    function collides(x, y, r, other) {
      return distance(x, y, other.x, other.y) < (r + other.radius) * 0.9;
    }

    function createBot() {
      let bot;
      let attempts = 0;
      do {
        bot = createBotRaw();
        attempts++;
        let bad = false;
        if (player.alive && collides(bot.x, bot.y, bot.radius, player)) bad = true;
        if (!bad) {
          for (const b of bots) {
            if (!b.alive) continue;
            if (collides(bot.x, bot.y, bot.radius, b)) {
              bad = true;
              break;
            }
          }
        }
        if (!bad) return bot;
      } while (attempts < 20);
      return bot;
    }

    function ensureBots() {
      while (bots.length < targetBotCount) {
        bots.push(createBot());
      }
    }

    function scrambleBotNames() {
      for (const b of bots) {
        if (!b.alive) continue;
        b.name = generateBotName();
      }
    }

    function updateBot(bot, dt) {
      if (!bot.alive) return;

      let dir = { x: 0, y: 0 };

      const centerDir = vecTo(bot.x, bot.y, dangerZone.x, dangerZone.y);
      const distToCenter = distance(bot.x, bot.y, dangerZone.x, dangerZone.y);
      const inFog = isInFog(bot.x, bot.y);
      const edgeBuffer = 40;

      if (inFog || distToCenter > dangerZone.radius - edgeBuffer) {
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

      if (isInFog(bot.x, bot.y)) {
        bot.radius -= 15 * dt;
      } else {
        bot.radius += 0.5 * dt;
      }

      if (bot.radius < 10) {
        bot.alive = false;
      }
    }

    function massFromRadius(r) {
      return r * r;
    }

    function radiusFromMass(m) {
      return Math.sqrt(Math.max(1, m));
    }

    function handleEating(dt) {
      if (player.alive) {
        for (const bot of bots) {
          if (!bot.alive) continue;
          const d = distance(player.x, player.y, bot.x, bot.y);
          const biggerPlayer = player.radius > bot.radius * 1.1;
          const biggerBot = bot.radius > player.radius * 1.1;
          const eatDist = Math.min(player.radius, bot.radius) * 0.8;

          if (d < eatDist) {
            if (biggerPlayer) {
              const mPlayer = massFromRadius(player.radius);
              const mBot = massFromRadius(bot.radius);
              const gain = mBot * 0.3;
              const newMass = mPlayer + gain;
              player.radius = radiusFromMass(newMass);
              bot.alive = false;
              sounds.playereat.play();
            } else if (biggerBot) {
              const mPlayer = massFromRadius(player.radius);
              const mBot = massFromRadius(bot.radius);
              const gain = mPlayer * 0.3;
              const newMass = mBot + gain;
              bot.radius = radiusFromMass(newMass);
              player.alive = false;
              sounds.playerdeath.play();
              handlePlayerDeath();
              return;
            }
          }
        }
      }

      // Bot vs bot
      for (let i = 0; i < bots.length; i++) {
        const a = bots[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < bots.length; j++) {
          const b = bots[j];
          if (!b.alive) continue;
          const d = distance(a.x, a.y, b.x, b.y);
          const biggerA = a.radius > b.radius * 1.1;
          const biggerB = b.radius > a.radius * 1.1;
          const eatDist = Math.min(a.radius, b.radius) * 0.8;

          if (d < eatDist) {
            if (biggerA) {
              const mA = massFromRadius(a.radius);
              const mB = massFromRadius(b.radius);
              const gain = mB * 0.3;
              a.radius = radiusFromMass(mA + gain);
              b.alive = false;
              sounds.botvbot.play();
            } else if (biggerB) {
              const mA = massFromRadius(a.radius);
              const mB = massFromRadius(b.radius);
              const gain = mA * 0.3;
              b.radius = radiusFromMass(mB + gain);
              a.alive = false;
              sounds.botvbot.play();
            }
          }
        }
      }

      for (let i = bots.length - 1; i >= 0; i--) {
        if (!bots[i].alive) bots.splice(i, 1);
      }
      ensureBots();
    }

    function updateBots(dt) {
      for (const bot of bots) {
        updateBot(bot, dt);
      }
    }

    return {
      bots,
      ensureBots,
      updateBots,
      handleEating,
      scrambleBotNames
    };
  }

  window.createBotsSystem = createBotsSystem;
})();
