import * as Tone from 'tone';
import { Layer } from './base';

export interface NoiseLayerParams {
  type: 'white' | 'pink' | 'brown' | 'blue' | 'violet';
  volume: number;
  filterFreq: number;
  filterQ: number;
}

/**
 * Noise layer for ambient textures and atmospheric sounds.
 */
export class NoiseLayer extends Layer {
  private noise: Tone.Noise;
  private filter: Tone.Filter;
  private params: NoiseLayerParams;

  constructor(params: Partial<NoiseLayerParams> = {}) {
    super();
    
    this.params = {
      type: params.type || 'pink',
      volume: params.volume ?? -12,
      filterFreq: params.filterFreq ?? 1000,
      filterQ: params.filterQ ?? 1,
    };

    // Create noise source
    this.noise = new Tone.Noise(this.params.type);
    this.register(this.noise);

    // Create filter for shaping
    this.filter = new Tone.Filter(this.params.filterFreq, 'lowpass', this.params.filterQ);
    this.register(this.filter);

    // Connect: noise -> filter -> output
    this.noise.connect(this.filter);
    this.filter.connect(this.output);

    // Set initial volume
    this.setVolume(this.params.volume, 0);
  }

  start(): void {
    this.noise.start();
  }

  stop(): void {
    this.noise.stop();
  }

  /** Change noise type */
  setType(type: NoiseLayerParams['type']): void {
    this.params.type = type;
    this.noise.type = type;
  }

  /** Set filter frequency with smooth ramp */
  setFilterFreq(freq: number, time = 0.01): void {
    this.params.filterFreq = freq;
    this.filter.frequency.rampTo(freq, time);
  }

  /** Set filter Q with smooth ramp */
  setFilterQ(q: number, time = 0.01): void {
    this.params.filterQ = q;
    this.filter.Q.rampTo(q, time);
  }

  getParams(): NoiseLayerParams {
    return { ...this.params };
  }

  setParams(params: NoiseLayerParams): void {
    if (params.type) this.setType(params.type);
    if (params.volume !== undefined) this.setVolume(params.volume);
    if (params.filterFreq !== undefined) this.setFilterFreq(params.filterFreq);
    if (params.filterQ !== undefined) this.setFilterQ(params.filterQ);
  }

  dispose(): void {
    this.stop();
    super.dispose();
  }
}
