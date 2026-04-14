import * as Tone from 'tone';
import { Layer } from './layers/base';
import { NoiseLayer, NoiseLayerParams } from './layers/noise';
import { SynthLayer, SynthLayerParams } from './layers/synth';
import { BinauralLayer, BinauralLayerParams } from './layers/binaural';
import { IsochronicLayer, IsochronicLayerParams } from './layers/isochronic';
import { EffectsChain, EffectsConfig } from './effects';

export type LayerType = 'noise' | 'synth' | 'binaural' | 'isochronic';

export interface LayerDefinition {
  id: string;
  type: LayerType;
  name: string;
  params: NoiseLayerParams | SynthLayerParams | BinauralLayerParams | IsochronicLayerParams;
}

/**
 * Main audio engine that manages all layers and effects.
 */
export class AudioEngine {
  public layers: Map<string, Layer>;
  public effects: EffectsChain;
  private masterGain: Tone.Gain;
  private analyser: Tone.Analyser;

  constructor() {
    this.layers = new Map();
    this.masterGain = new Tone.Gain(0.8).toDestination();
    this.analyser = new Tone.Analyser('fft', 256);
    this.effects = new EffectsChain();
    
    // Connect effects to master
    this.effects.output.connect(this.masterGain);
  }

  /** Create a new layer by type */
  createLayer(type: LayerType, id?: string, params?: any): Layer {
    const layerId = id || `${type}-${Date.now()}`;
    
    let layer: Layer;
    switch (type) {
      case 'noise':
        layer = new NoiseLayer(params);
        break;
      case 'synth':
        layer = new SynthLayer(params);
        break;
      case 'binaural':
        layer = new BinauralLayer(params);
        break;
      case 'isochronic':
        layer = new IsochronicLayer(params);
        break;
      default:
        throw new Error(`Unknown layer type: ${type}`);
    }

    // Connect layer to effects chain input
    layer.connect(this.effects.input);
    this.layers.set(layerId, layer);
    
    return layer;
  }

  /** Get a layer by ID */
  getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  /** Remove and dispose a layer */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.dispose();
      this.layers.delete(id);
    }
  }

  /** Remove all layers */
  clearLayers(): void {
    for (const [id, layer] of this.layers.entries()) {
      layer.dispose();
    }
    this.layers.clear();
  }

  /** Start all layers */
  startAll(): void {
    for (const layer of this.layers.values()) {
      layer.start();
    }
  }

  /** Stop all layers */
  stopAll(): void {
    for (const layer of this.layers.values()) {
      layer.stop();
    }
  }

  /** Set master volume */
  setMasterVolume(db: number, time = 0.01): void {
    this.masterGain.gain.rampTo(Tone.dbToGain(db), time);
  }

  /** Get frequency data for visualization */
  getFrequencyData(): Float32Array {
    return this.analyser.getValue() as Float32Array;
  }

  /** Get current state for presets */
  getState(): {
    layers: LayerDefinition[];
    effects: EffectsConfig;
    masterVolume: number;
  } {
    const layerDefs: LayerDefinition[] = [];
    for (const [id, layer] of this.layers.entries()) {
      let type: LayerType = 'noise';
      if (layer instanceof NoiseLayer) type = 'noise';
      else if (layer instanceof SynthLayer) type = 'synth';
      else if (layer instanceof BinauralLayer) type = 'binaural';
      else if (layer instanceof IsochronicLayer) type = 'isochronic';

      layerDefs.push({
        id,
        type,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        params: layer.getParams(),
      });
    }

    return {
      layers: layerDefs,
      effects: this.effects.getParams(),
      masterVolume: Tone.gainToDb(this.masterGain.gain.value),
    };
  }

  /** Load state from preset */
  loadState(state: {
    layers: LayerDefinition[];
    effects: EffectsConfig;
    masterVolume: number;
  }): void {
    // Clear existing layers
    this.clearLayers();

    // Recreate layers
    for (const def of state.layers) {
      const layer = this.createLayer(def.type, def.id, def.params);
      layer.setParams(def.params);
      layer.start();
    }

    // Restore effects
    this.effects.setReverb(
      state.effects.reverb.decay,
      state.effects.reverb.wet,
      state.effects.reverb.enabled,
    );
    this.effects.setDelay(
      state.effects.delay.time,
      state.effects.delay.feedback,
      state.effects.delay.wet,
      state.effects.delay.enabled,
    );
    this.effects.setCompressor(
      state.effects.compressor.threshold,
      state.effects.compressor.ratio,
      state.effects.compressor.enabled,
    );

    // Restore master volume
    this.setMasterVolume(state.masterVolume);
  }

  dispose(): void {
    this.clearLayers();
    this.effects.dispose();
    this.masterGain.dispose();
    this.analyser.dispose();
  }
}

// Singleton instance
let engineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}

export function disposeAudioEngine(): void {
  if (engineInstance) {
    engineInstance.dispose();
    engineInstance = null;
  }
}
