class AudioService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

  constructor() {
    // Lazily initialize on first user interaction if needed, 
    // but we'll try to init immediately and handle suspended state
    try {
      const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (CtxClass) {
        this.ctx = new CtxClass();
      }
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private async ensureContext() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public playMove() {
    // Very subtle click
    if (!this.enabled || !this.ctx) return;
    // this.playTone(200, 'triangle', 0.05, 0.05); // Optional: can be annoying
  }

  public playEat() {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();
    // High pitched happy bloop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playGameOver() {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();
    // Sad descending sawtooth
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  public playStart() {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();
    // Ascending arpeggio
    const now = this.ctx.currentTime;
    [440, 554, 659].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }
}

export const audioService = new AudioService();