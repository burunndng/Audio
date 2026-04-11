import { writable, type Writable } from 'svelte/store';
import type { LayerDefinition } from '$lib/audio/engine';
import type { EffectsConfig } from '$lib/audio/effects';

export interface Preset {
  id: string;
  name: string;
  version: number;
  createdAt: number;
  layers: LayerDefinition[];
  effects: EffectsConfig;
  masterVolume: number;
}

// Current engine state
export const engineReady: Writable<boolean> = writable(false);
export const isPlaying: Writable<boolean> = writable(false);

// Selected layer for editing
export const selectedLayerId: Writable<string | null> = writable(null);

// Presets store
export const presets: Writable<Preset[]> = writable([]);
export const currentPresetId: Writable<string | null> = writable(null);

// Master volume
export const masterVolume: Writable<number> = writable(-2); // dB

/**
 * Load presets from localStorage
 */
export function loadPresets(): Preset[] {
  try {
    const stored = localStorage.getItem('echoforge_presets');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load presets:', e);
  }
  return [];
}

/**
 * Save presets to localStorage
 */
export function savePresets(presetList: Preset[]): void {
  try {
    localStorage.setItem('echoforge_presets', JSON.stringify(presetList));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}

/**
 * Create a new preset from current state
 */
export function createPreset(
  name: string,
  layers: LayerDefinition[],
  effects: EffectsConfig,
  volume: number,
): Preset {
  const preset: Preset = {
    id: `preset-${Date.now()}`,
    name,
    version: 1,
    createdAt: Date.now(),
    layers,
    effects,
    masterVolume: volume,
  };
  
  presets.update(list => [...list, preset]);
  return preset;
}

/**
 * Delete a preset
 */
export function deletePreset(id: string): void {
  presets.update(list => list.filter(p => p.id !== id));
  if (currentPresetId.get() === id) {
    currentPresetId.set(null);
  }
}
