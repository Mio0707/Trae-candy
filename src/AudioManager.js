export class AudioManager {
  constructor() {
    this.audioMap = new Map();
    this.currentAudio = null;
    this.enabled = false;  // 默认禁用，由首页讲解模式按钮控制
    this.basePath = import.meta.env.BASE_URL + 'assets/audio/';
    this.supported = 'AudioContext' in window;
  }

  async init() {
    if (!this.supported) {
      console.warn('Audio not supported');
      return;
    }

    const audioIds = [
      'landing-intro',
      'base-small', 'body-block', 'front-legs', 'back-mustache',
      'head-place', 'ears', 'head-lines', 'ball-place',
      'complete', 'lift-blessing', 'fortune-shell', 'blessing-complete'
    ];

    for (const id of audioIds) {
      await this.preload(id);
    }

    this.enabled = true;
  }

  async preload(id) {
    return new Promise((resolve) => {
      const audio = new Audio(`${this.basePath}${id}.mp3`);
      audio.preload = 'auto';
      audio.onloadeddata = () => {
        this.audioMap.set(id, audio);
        resolve();
      };
      audio.onerror = () => {
        console.warn(`Audio ${id}.mp3 not found`);
        resolve();
      };
    });
  }

  play(id, force = false) {
    if ((!this.enabled && !force) || !this.supported) return;

    this.stop();

    const audio = this.audioMap.get(id);
    if (!audio) {
      console.warn(`Audio ${id}.mp3 not loaded`);
      return;
    }

    audio.currentTime = 0;
    audio.play().catch(e => {
      console.warn('Audio play failed:', e);
    });
    this.currentAudio = audio;
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }

  isPlaying() {
    return this.currentAudio && !this.currentAudio.paused;
  }
}