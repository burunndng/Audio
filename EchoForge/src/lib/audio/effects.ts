import * as Tone from 'tone';

/**
 * Global effects chain for the audio engine.
 * Applied to the master output.
 */
export interface EffectsConfig {
  reverb: {
    enabled: boolean;
    decay: number;
    wet: number;
  };
  delay: {
    enabled: boolean;
    time: string;
    feedback: number;
    wet: number;
  };
  compressor: {
    enabled: boolean;
    threshold: number;
    ratio: number;
  };
}

export class EffectsChain {
  public reverb: Tone.Reverb;
  public delay: Tone.FeedbackDelay;
  public compressor: Tone.Compressor;
  public input: Tone.Gain;
  public output: Tone.Gain;
  
  private config: EffectsConfig;

  constructor(config: Partial<EffectsConfig> = {}) {
    this.config = {
      reverb: {
        enabled: config.reverb?.enabled ?? false,
        decay: config.reverb?.decay ?? 2,
        wet: config.reverb?.wet ?? 0.3,
      },
      delay: {
        enabled: config.delay?.enabled ?? false,
        time: config.delay?.time ?? '8n',
        feedback: config.delay?.feedback ?? 0.4,
        wet: config.delay?.wet ?? 0.2,
      },
      compressor: {
        enabled: config.compressor?.enabled ?? true,
        threshold: config.compressor?.threshold ?? -24,
        ratio: config.compressor?.ratio ?? 12,
      },
    };

    // Create nodes
    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    
    this.reverb = new Tone.Reverb(this.config.reverb.decay).toDestination();
    this.reverb.wet.value = this.config.reverb.enabled ? this.config.reverb.wet : 0;
    
    this.delay = new Tone.FeedbackDelay(this.config.delay.time, this.config.delay.feedback);
    this.delay.wet.value = this.config.delay.enabled ? this.config.delay.wet : 0;
    
    this.compressor = new Tone.Compressor(this.config.compressor.threshold, this.config.compressor.ratio);
    if (!this.config.compressor.enabled) {
      this.compressor.bypass = true;
    }

    // Build chain: input -> compressor -> delay -> reverb -> output
    this.input.connect(this.compressor);
    this.compressor.connect(this.delay);
    this.delay.connect(this.reverb);
    this.reverb.connect(this.output);
    this.output.toDestination();
  }

  /** Set reverb parameters */
  setReverb(decay: number, wet: number, enabled?: boolean): void {
    this.config.reverb.decay = decay;
    this.config.reverb.wet = wet;
    if (enabled !== undefined) this.config.reverb.enabled = enabled;
    
    this.reverb.decay = decay;
    this.reverb.wet.rampTo(enabled === false ? 0 : wet, 0.01);
  }

  /** Set delay parameters */
  setDelay(time: string, feedback: number, wet: number, enabled?: boolean): void {
    this.config.delay.time = time;
    this.config.delay.feedback = feedback;
    this.config.delay.wet = wet;
    if (enabled !== undefined) this.config.delay.enabled = enabled;
    
    this.delay.delayTime.value = Tone.Time(time).toSeconds();
    this.delay.feedback.rampTo(feedback, 0.01);
    this.delay.wet.rampTo(enabled === false ? 0 : wet, 0.01);
  }

  /** Set compressor parameters */
  setCompressor(threshold: number, ratio: number, enabled?: boolean): void {
    this.config.compressor.threshold = threshold;
    this.config.compressor.ratio = ratio;
    if (enabled !== undefined) this.config.compressor.enabled = enabled;
    
    this.compressor.threshold.value = threshold;
    this.compressor.ratio.value = ratio;
    this.compressor.bypass = !enabled;
  }

  /** Toggle individual effects */
  toggleReverb(enabled: boolean): void {
    this.config.reverb.enabled = enabled;
    this.reverb.wet.rampTo(enabled ? this.config.reverb.wet : 0, 0.01);
  }

  toggleDelay(enabled: boolean): void {
    this.config.delay.enabled = enabled;
    this.delay.wet.rampTo(enabled ? this.config.delay.wet : 0, 0.01);
  }

  toggleCompressor(enabled: boolean): void {
    this.config.compressor.enabled = enabled;
    this.compressor.bypass = !enabled;
  }

  getParams(): EffectsConfig {
    return { ...this.config };
  }

  dispose(): void {
    this.input.dispose();
    this.output.dispose();
    this.reverb.dispose();
    this.delay.dispose();
    this.compressor.dispose();
  }
}
