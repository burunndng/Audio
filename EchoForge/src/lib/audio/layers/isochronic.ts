import * as Tone from 'tone';
import { Layer } from './base';

export interface IsochronicLayerParams {
  carrierFreq: number;
  pulseRate: number;
  pulseWidth: number;
  volume: number;
}

/**
 * Isochronic tones layer - regular pulses at specific rates.
 * Different from binaural beats (single tone, amplitude modulated).
 */
export class IsochronicLayer extends Layer {
  private carrier: Tone.Oscillator;
  private gain: Tone.Gain;
  private lfo: Tone.LFO;
  private params: IsochronicLayerParams;

  constructor(params: Partial<IsochronicLayerParams> = {}) {
    super();
    
    this.params = {
      carrierFreq: params.carrierFreq ?? 200,
      pulseRate: params.pulseRate ?? 10,
      pulseWidth: params.pulseWidth ?? 0.5,
      volume: params.volume ?? -12,
    };

    // Create carrier oscillator
    this.carrier = new Tone.Oscillator(this.params.carrierFreq, 'sine');
    this.register(this.carrier);

    // Create LFO for pulsing
    this.lfo = new Tone.LFO(this.params.pulseRate, 1, 0).start();
    this.register(this.lfo);

    // Create gain for amplitude modulation
    this.gain = new Tone.Gain(0.5);
    this.register(this.gain);

    // Connect: carrier -> gain (modulated by LFO) -> output
    this.carrier.connect(this.gain);
    this.lfo.connect(this.gain.gain);
    this.gain.connect(this.output);

    // Set initial volume
    this.setVolume(this.params.volume, 0);
  }

  start(): void {
    this.carrier.start();
  }

  stop(): void {
    this.carrier.stop();
  }

  /** Set carrier frequency */
  setCarrierFreq(freq: number, time = 0.01): void {
    this.params.carrierFreq = freq;
    this.carrier.frequency.rampTo(freq, time);
  }

  /** Set pulse rate (Hz) */
  setPulseRate(rate: number, time = 0.01): void {
    this.params.pulseRate = rate;
    this.lfo.frequency.rampTo(rate, time);
  }

  /** Set pulse width (0-1, affects LFO min value) */
  setPulseWidth(width: number): void {
    this.params.pulseWidth = width;
    // LFO goes from (1-width) to 1, creating the pulse shape
    this.lfo.min = 1 - width;
    this.lfo.max = 1;
  }

  getParams(): IsochronicLayerParams {
    return { ...this.params };
  }

  setParams(params: IsochronicLayerParams): void {
    if (params.carrierFreq !== undefined) this.setCarrierFreq(params.carrierFreq);
    if (params.pulseRate !== undefined) this.setPulseRate(params.pulseRate);
    if (params.pulseWidth !== undefined) this.setPulseWidth(params.pulseWidth);
    if (params.volume !== undefined) this.setVolume(params.volume);
  }

  dispose(): void {
    this.stop();
    this.lfo.stop();
    super.dispose();
  }
}
