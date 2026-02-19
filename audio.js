(function () {
  class Sound {
    constructor(src, { loop = false, volume = 1 } = {}) {
      this.audio = new Audio(src);
      this.audio.loop = loop;
      this.baseVolume = volume;
      this.audio.volume = volume;
      this.fading = false;
    }

    play() {
      this.stopFade();
      this.audio.volume = this.baseVolume;
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    }

    playIfNotPlaying() {
      if (this.audio.paused) {
        this.stopFade();
        this.audio.volume = this.baseVolume;
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      }
    }

    playWithPitch(min = 0.95, max = 1.05) {
      this.audio.playbackRate = min + Math.random() * (max - min);
      this.play();
    }

    stop() {
      this.stopFade();
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.volume = this.baseVolume;
    }

    fadeOut(duration = 0.25) {
      this.stopFade();
      this.fading = true;

      const startVolume = this.audio.volume;
      const startTime = performance.now();

      const tick = (now) => {
        if (!this.fading) return;

        const t = (now - startTime) / (duration * 1000);
        if (t >= 1) {
          this.stop();
          return;
        }

        this.audio.volume = startVolume * (1 - t);
        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }

    stopFade() {
      this.fading = false;
    }

    setVolume(v) {
      this.audio.volume = Math.max(0, Math.min(1, v));
    }
  }

  function setupAudio() {
    const sounds = {
      moving: new Sound('sounds/moving.mp3', { loop: true, volume: 0.6 }),
      still: new Sound('sounds/still.mp3', { loop: true, volume: 0.5 }),
      zoneshrink: new Sound('sounds/zoneshrink.mp3', { loop: false, volume: 0.7 }),
      zonewarning: new Sound('sounds/zonewarning.mp3', { loop: false, volume: 0.9 }),
      zonetick: new Sound('sounds/zonetick.mp3', { loop: false, volume: 0.8 }),
      zoneboom: new Sound('sounds/zoneboom.mp3', { loop: false, volume: 1.0 }),
      dangerzonesizzle: new Sound('sounds/dangerzonesizzle.mp3', { loop: true, volume: 0.6 }),
      playereat: new Sound('sounds/playereat.mp3', { loop: false, volume: 0.9 }),
      botvbot: new Sound('sounds/botvbot.mp3', { loop: false, volume: 0.8 }),
      startclick: new Sound('sounds/startclick.mp3', { loop: false, volume: 0.7 }),
      nameaccept: new Sound('sounds/nameaccept.mp3', { loop: false, volume: 0.7 }),
      gamestart: new Sound('sounds/gamestart.mp3', { loop: false, volume: 0.9 }),
      playerdeath: new Sound('sounds/playerdeath.m4a', { loop: false, volume: 1.0 }),
      menureturn: new Sound('sounds/menureturn.mp3', { loop: false, volume: 0.6 }),
      music: null
    };

    const musicTracks = [
      'sounds/backgroundmusic1.mp3',
      'sounds/backgroundmusic2.mp3',
      'sounds/backgroundmusic3.mp3',
      'sounds/backgroundmusic4.mp3',
      'sounds/backgroundmusic5.mp3'
    ];

    let musicBaseVolume = 0.3;
    let musicTargetVolume = musicBaseVolume;
    let musicInitialized = false;

    function initMusic() {
      if (musicInitialized) return;
      musicInitialized = true;
      const track = musicTracks[Math.floor(Math.random() * musicTracks.length)];
      sounds.music = new Sound(track, { loop: true, volume: musicBaseVolume });
      sounds.music.playIfNotPlaying();
    }

    function setMusicDangerMode(on) {
      musicTargetVolume = on ? 0.12 : musicBaseVolume;

      // SFX ducking
      const duck = on ? 0.8 : 1.0;
      sounds.moving.baseVolume = 0.6 * duck;
      sounds.still.baseVolume = 0.5 * duck;
      sounds.dangerzonesizzle.baseVolume = 0.6 * duck;
    }

    function updateMusicVolume(dt) {
      if (!sounds.music) return;
      const current = sounds.music.audio.volume;
      const target = musicTargetVolume;
      const diff = target - current;
      const step = dt * 0.8;

      if (Math.abs(diff) < 0.01) {
        sounds.music.setVolume(target);
      } else {
        sounds.music.setVolume(current + Math.sign(diff) * step);
      }
    }

    function stopMovementLoops() {
      sounds.moving.fadeOut();
      sounds.still.fadeOut();
      sounds.dangerzonesizzle.fadeOut();
    }

    function updateMovementSounds(isMoving, inFog) {
      if (inFog) {
        sounds.moving.fadeOut();
        sounds.still.fadeOut();
        sounds.dangerzonesizzle.playIfNotPlaying();
        return;
      }

      sounds.dangerzonesizzle.fadeOut();

      if (isMoving) {
        sounds.still.fadeOut();
        sounds.moving.playIfNotPlaying();
      } else {
        sounds.moving.fadeOut();
        sounds.still.playIfNotPlaying();
      }
    }

    return {
      sounds,
      initMusic,
      setMusicDangerMode,
      updateMusicVolume,
      stopMovementLoops,
      updateMovementSounds
    };
  }

  window.setupAudio = setupAudio;
})();
