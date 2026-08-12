const paths = {
  click: './assets/audio/click.mp3',
  step: './assets/audio/step.mp3',
  dice: './assets/audio/dice.mp3',
  coin: './assets/audio/coin.mp3',
  purchase: './assets/audio/purchase.mp3',
  build: './assets/audio/build.mp3',
  beam: './assets/audio/beam.mp3',
  card: './assets/audio/card.mp3',
  roulette: './assets/audio/roulette.mp3',
  win: './assets/audio/win.mp3',
  bankrupt: './assets/audio/bankrupt.mp3',
};

const musicSource = './assets/audio/golden-gilded-avenues.mp3';

class GameAudio {
  constructor() {
    this.unlocked = false;
    this.musicEnabled = localStorage.getItem('property-music') !== 'off';
    this.music = new Audio(musicSource);
    this.music.loop = true;
    this.music.preload = 'auto';
    this.music.volume = .20;
    this.samples = new Map(Object.entries(paths).map(([name, source]) => {
      const sample = new Audio(source);
      sample.preload = 'auto';
      return [name, sample];
    }));
  }

  async unlock() {
    this.unlocked = true;
    if (!this.musicEnabled || !this.music.paused) return;
    try { await this.music.play(); } catch { /* 浏览器仍可等待下一次点击。 */ }
  }

  play(name, volume = 1) {
    if (!this.unlocked) return null;
    const sample = this.samples.get(name);
    if (!sample) return null;
    const voice = sample.cloneNode();
    voice.volume = Math.max(0, Math.min(1, volume));
    voice.play().catch(() => {});
    return voice;
  }

  fadeOut(voice, duration = 140) {
    if (!voice || voice.paused) return;
    const started = performance.now();
    const initialVolume = voice.volume;
    const step = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      voice.volume = initialVolume * (1 - progress);
      if (progress < 1 && !voice.paused) requestAnimationFrame(step);
      else voice.pause();
    };
    requestAnimationFrame(step);
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    localStorage.setItem('property-music', this.musicEnabled ? 'on' : 'off');
    if (this.musicEnabled) this.unlock();
    else this.music.pause();
    return this.musicEnabled;
  }
}

export const gameAudio = new GameAudio();
