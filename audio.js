(function () {
  class Sound {
    constructor(src, { loop = false, volume = 1 } = {}) {
      this.audio = new Audio(src);
      this.audio.loop = loop;
      this.audio.volume = volume;
    }
    play() {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    }
    playIfNotPlaying() {
      if (this.audio.paused) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      }
    }
    stop() {
      this.audio.pause();
      this.audio.currentTime = 0;
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
      playerdeath: new Sound('sounds/playerdeath.mp3', { loop: false, volume: 1.0 }),
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
      sounds.moving.stop();
      sounds.still.stop();
      sounds.dangerzonesizzle.stop();
    }

    function updateMovementSounds(isMoving, inFog) {
      if (inFog) {
        sounds.moving.stop();
        sounds.still.stop();
        sounds.dangerzonesizzle.playIfNotPlaying();
      } else {
        sounds.dangerzonesizzle.stop();
        if (isMoving) {
          sounds.still.stop();
          sounds.moving.playIfNotPlaying();
        } else {
          sounds.moving.stop();
          sounds.still.playIfNotPlaying();
        }
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
