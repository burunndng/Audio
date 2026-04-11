import * as Tone from 'tone';
import { Layer } from './base';

export interface SynthLayerParams {
  waveform: 'sine' | 'triangle' | 'square' | 'sawtooth';
  frequency: number;
  detune: number;
  volume: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/**
 * Synth layer for melodic and harmonic content.
 */
export class SynthLayer extends Layer {
  private synth: Tone.PolySynth;
  private params: SynthLayerParams;
  private activeNotes: string[] = [];

  constructor(params: Partial<SynthLayerParams> = {}) {
    super();
    
    this.params = {
      waveform: params.waveform || 'sine',
      frequency: params.frequency ?? 440,
      detune: params.detune ?? 0,
      volume: params.volume ?? -6,
      attack: params.attack ?? 0.01,
      decay: params.decay ?? 0.1,
      sustain: params.sustain ?? 0.5,
      release: params.release ?? 0.5,
    };

    // Create polyphonic synth
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: this.params.waveform,
      },
      envelope: {
        attack: this.params.attack,
        decay: this.params.decay,
        sustain: this.params.sustain,
        release: this.params.release,
      },
      volume: this.params.volume,
    }).toDestination();
    
    this.register(this.synth);

    // Reconnect to our output instead of destination
    this.synth.disconnect();
    this.synth.connect(this.output);
  }

  /** Play a note or chord */
  start(notes?: string | string[]): void {
    const notesToPlay = notes || `${this.params.frequency}Hz`;
    if (typeof notesToPlay === 'string') {
      this.activeNotes.push(notesToPlay);
      this.synth.triggerAttack(notesToPlay);
    } else {
      this.activeNotes.push(...notesToPlay);
      this.synth.triggerAttack(notesToPlay);
    }
  }

  /** Stop all active notes */
  stop(): void {
    if (this.activeNotes.length > 0) {
      this.synth.triggerRelease(this.activeNotes);
      this.activeNotes = [];
    }
  }

  /** Play a note with envelope (attack + release) */
  trigger(note?: string, duration = 1): void {
    const noteToPlay = note || `${this.params.frequency}Hz`;
    this.synth.triggerAttackRelease(noteToPlay, duration);
  }

  /** Change waveform */
  setWaveform(waveform: SynthLayerParams['waveform']): void {
    this.params.waveform = waveform;
    (this.synth.voice0 as any).oscillator.type = waveform;
  }

  /** Set frequency */
  setFrequency(freq: number): void {
    this.params.frequency = freq;
  }

  /** Set envelope parameters */
  setEnvelope(attack: number, decay: number, sustain: number, release: number): void {
    this.params.attack = attack;
    this.params.decay = decay;
    this.params.sustain = sustain;
    this.params.release = release;
    this.synth.set({
      envelope: { attack, decay, sustain, release },
    });
  }

  getParams(): SynthLayerParams {
    return { ...this.params };
  }

  setParams(params: SynthLayerParams): void {
    if (params.waveform) this.setWaveform(params.waveform);
    if (params.frequency) this.setFrequency(params.frequency);
    if (params.volume !== undefined) this.setVolume(params.volume);
    if (params.attack !== undefined || params.decay !== undefined || 
        params.sustain !== undefined || params.release !== undefined) {
      this.setEnvelope(
        params.attack ?? this.params.attack,
        params.decay ?? this.params.decay,
        params.sustain ?? this.params.sustain,
        params.release ?? this.params.release,
      );
    }
  }

  dispose(): void {
    this.stop();
    super.dispose();
  }
}
