import * as Tone from 'tone';
import { Layer } from './base';

export interface BinauralLayerParams {
  baseFreq: number;
  beatFreq: number;
  volume: number;
  panWidth: number;
}

/**
 * Binaural beats layer for meditation and altered states.
 * Plays slightly different frequencies in each ear to create a beating effect.
 */
export class BinauralLayer extends Layer {
  private leftOsc: Tone.Oscillator;
  private rightOsc: Tone.Oscillator;
  private leftPan: Tone.Panner3D;
  private rightPan: Tone.Panner3D;
  private merger: Tone.Merger;
  private params: BinauralLayerParams;

  constructor(params: Partial<BinauralLayerParams> = {}) {
    super();
    
    this.params = {
      baseFreq: params.baseFreq ?? 200,
      beatFreq: params.beatFreq ?? 10,
      volume: params.volume ?? -18,
      panWidth: params.panWidth ?? 1,
    };

    // Create oscillators
    this.leftOsc = new Tone.Oscillator(this.params.baseFreq, 'sine');
    this.rightOsc = new Tone.Oscillator(this.params.baseFreq + this.params.beatFreq, 'sine');
    this.register(this.leftOsc);
    this.register(this.rightOsc);

    // Create panners for stereo separation
    this.leftPan = new Tone.Panner3D(-this.params.panWidth, 0, 1);
    this.rightPan = new Tone.Panner3D(this.params.panWidth, 0, 1);
    this.register(this.leftPan);
    this.register(this.rightPan);

    // Merge stereo signal
    this.merger = new Tone.Merger(2);
    this.register(this.merger);

    // Connect: oscillators -> panners -> merger -> output
    this.leftOsc.connect(this.leftPan);
    this.rightOsc.connect(this.rightPan);
    this.leftPan.connect(this.merger, 0, 0);
    this.rightPan.connect(this.merger, 0, 1);
    this.merger.connect(this.output);

    // Set initial volume
    this.setVolume(this.params.volume, 0);
  }

  start(): void {
    const now = Tone.now();
    this.leftOsc.start(now);
    this.rightOsc.start(now);
  }

  stop(): void {
    const now = Tone.now();
    this.leftOsc.stop(now);
    this.rightOsc.stop(now);
  }

  /** Set base frequency (left ear) */
  setBaseFreq(freq: number, time = 0.01): void {
    this.params.baseFreq = freq;
    this.leftOsc.frequency.rampTo(freq, time);
    // Right ear is base + beat
    this.rightOsc.frequency.rampTo(freq + this.params.beatFreq, time);
  }

  /** Set beat frequency (difference between ears) */
  setBeatFreq(beat: number, time = 0.01): void {
    this.params.beatFreq = beat;
    this.rightOsc.frequency.rampTo(this.params.baseFreq + beat, time);
  }

  /** Set stereo pan width */
  setPanWidth(width: number): void {
    this.params.panWidth = width;
    this.leftPan.positionX.value = -width;
    this.rightPan.positionX.value = width;
  }

  getParams(): BinauralLayerParams {
    return { ...this.params };
  }

  setParams(params: BinauralLayerParams): void {
    if (params.baseFreq !== undefined) this.setBaseFreq(params.baseFreq);
    if (params.beatFreq !== undefined) this.setBeatFreq(params.beatFreq);
    if (params.volume !== undefined) this.setVolume(params.volume);
    if (params.panWidth !== undefined) this.setPanWidth(params.panWidth);
  }

  dispose(): void {
    this.stop();
    super.dispose();
  }
}
