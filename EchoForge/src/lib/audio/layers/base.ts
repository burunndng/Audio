import * as Tone from 'tone';

/**
 * Abstract base class for all audio layers.
 * Handles registration with Tone.js graph and cleanup.
 */
export abstract class Layer {
  protected nodes: Tone.ToneAudioNode[] = [];
  public output: Tone.Gain;
  public muted = false;
  public volume = 0; // dB

  constructor() {
    this.output = new Tone.Gain(1).toDestination();
  }

  /** Register a node for automatic cleanup */
  protected register(node: Tone.ToneAudioNode): void {
    this.nodes.push(node);
  }

  /** Set layer volume with smooth ramp */
  setVolume(db: number, time = 0.01): void {
    this.volume = db;
    this.output.gain.rampTo(Tone.dbToGain(db), time);
  }

  /** Mute/unmute with smooth transition */
  setMuted(muted: boolean, time = 0.01): void {
    this.muted = muted;
    const targetGain = muted ? 0 : Tone.dbToGain(this.volume);
    this.output.gain.rampTo(targetGain, time);
  }

  /** Connect this layer's output to another node */
  connect(node: Tone.ToneAudioNode): void {
    this.output.connect(node);
  }

  /** Disconnect from destination (for routing) */
  disconnectFromDestination(): void {
    this.output.disconnect();
  }

  /** Dispose all registered nodes */
  dispose(): void {
    this.output.dispose();
    for (const node of this.nodes) {
      if (node && typeof node.dispose === 'function') {
        node.dispose();
      }
    }
    this.nodes = [];
  }

  /** Start the layer */
  abstract start(): void;

  /** Stop the layer */
  abstract stop(): void;

  /** Get current parameter values for presets */
  abstract getParams(): Record<string, any>;

  /** Set parameters from preset */
  abstract setParams(params: Record<string, any>): void;
}
