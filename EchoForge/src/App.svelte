<script lang="ts">
  import { onMount } from 'svelte';
  import * as Tone from 'tone';
  import { getAudioEngine, disposeAudioEngine, type LayerType } from './lib/audio/engine';
  import { engineReady, isPlaying, selectedLayerId, masterVolume } from './lib/stores';

  let audioStarted = $state(false);
  let activeLayers: { id: string; type: LayerType; name: string; muted: boolean; volume: number }[] = $state([]);
  let engine: any = null;
  let layerVolumes = $state<Record<string, number>>({});

  async function initAudio() {
    if (audioStarted) return;
    
    await Tone.start();
    engine = getAudioEngine();
    audioStarted = true;
    engineReady.set(true);
    
    const noiseLayer = engine.createLayer('noise', 'noise-1', {
      type: 'pink',
      volume: -18,
      filterFreq: 800,
      filterQ: 1,
    });
    noiseLayer.start();
    layerVolumes['noise-1'] = -18;
    
    const binauralLayer = engine.createLayer('binaural', 'binaural-1', {
      baseFreq: 200,
      beatFreq: 6,
      volume: -24,
      panWidth: 1,
    });
    binauralLayer.start();
    layerVolumes['binaural-1'] = -24;
    
    updateActiveLayers();
    isPlaying.set(true);
  }

  function updateActiveLayers() {
    if (!engine) return;
    activeLayers = Array.from(engine.layers.entries()).map(([id, layer]: [string, any]) => ({
      id,
      type: layer.constructor.name.replace('Layer', '').toLowerCase() as LayerType,
      name: layer.constructor.name.replace('Layer', ''),
      muted: layer.muted,
      volume: layer.volume,
    }));
  }

  function toggleLayer(id: string) {
    if (!engine) return;
    const layer = engine.getLayer(id);
    if (layer) {
      layer.setMuted(!layer.muted);
      updateActiveLayers();
    }
  }

  function setLayerVolume(id: string, db: number) {
    if (!engine) return;
    const layer = engine.getLayer(id);
    if (layer) {
      layer.setVolume(db);
      layerVolumes[id] = db;
      updateActiveLayers();
    }
  }

  function addLayer(type: LayerType) {
    if (!engine) return;
    const id = `${type}-${Date.now()}`;
    const layer = engine.createLayer(type, id);
    layer.start();
    layerVolumes[id] = -12;
    updateActiveLayers();
  }

  function removeLayer(id: string) {
    if (!engine) return;
    engine.removeLayer(id);
    delete layerVolumes[id];
    updateActiveLayers();
  }

  function setMasterVol(db: number) {
    if (!engine) return;
    engine.setMasterVolume(db);
    masterVolume.set(db);
  }

  onMount(() => {
    return () => {
      if (engine) {
        engine.stopAll();
        disposeAudioEngine();
      }
    };
  });
</script>

<main class="container">
  <header>
    <h1>🎛️ EchoForge</h1>
    <p class="subtitle">Modular Sound Design Playground</p>
  </header>

  {#if !audioStarted}
    <div class="start-overlay" onclick={initAudio}>
      <div class="start-content">
        <h2>Click to Start</h2>
        <p>Initialize audio engine</p>
        <button class="start-btn">Begin</button>
      </div>
    </div>
  {:else}
    <div class="interface">
      <section class="master-section">
        <div class="control-group">
          <label>Master Volume</label>
          <input 
            type="range" 
            min="-60" 
            max="6" 
            value={$masterVolume}
            oninput={(e) => setMasterVol(parseFloat(e.target.value))}
          />
          <span class="value">{$masterVolume.toFixed(1)} dB</span>
        </div>
      </section>

      <section class="layers-section">
        <div class="section-header">
          <h2>Layers</h2>
          <div class="add-buttons">
            <button onclick={() => addLayer('noise')}>+ Noise</button>
            <button onclick={() => addLayer('synth')}>+ Synth</button>
            <button onclick={() => addLayer('binaural')}>+ Binaural</button>
            <button onclick={() => addLayer('isochronic')}>+ Isochronic</button>
          </div>
        </div>

        <div class="layers-list">
          {#if activeLayers.length === 0}
            <p class="empty-state">No layers yet. Add one above!</p>
          {:else}
            {#each activeLayers as layer (layer.id)}
              <div class="layer-card">
                <div class="layer-header">
                  <span class="layer-name">{layer.name}</span>
                  <button class="remove-btn" onclick={() => removeLayer(layer.id)}>×</button>
                </div>
                <div class="layer-controls">
                  <label>Volume</label>
                  <input 
                    type="range" 
                    min="-60" 
                    max="6" 
                    value={layerVolumes[layer.id] ?? -12}
                    oninput={(e) => setLayerVolume(layer.id, parseFloat(e.target.value))}
                  />
                  <span class="vol-value">{(layerVolumes[layer.id] ?? -12).toFixed(0)} dB</span>
                </div>
                <div class="layer-status">
                  <button 
                    class="mute-btn" 
                    class:muted={layer.muted}
                    onclick={() => toggleLayer(layer.id)}
                  >
                    {layer.muted ? '🔇 Muted' : '🔊 Active'}
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </section>

      <footer class="status-bar">
        <span class="status-indicator active">●</span>
        <span>Audio Engine Active</span>
        <span class="cpu-meter">Layers: {activeLayers.length}</span>
      </footer>
    </div>
  {/if}
</main>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0f;
    color: #e0e0e0;
    min-height: 100vh;
  }

  .container {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: #666;
    margin-top: 0.5rem;
  }

  .start-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 15, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    cursor: pointer;
  }

  .start-content {
    text-align: center;
  }

  .start-content h2 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .start-content p {
    color: #666;
    margin-bottom: 1.5rem;
  }

  .start-btn {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .start-btn:hover {
    transform: scale(1.05);
  }

  .interface {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .master-section,
  .layers-section {
    background: #12121a;
    border-radius: 12px;
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
  }

  .add-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .add-buttons button {
    padding: 0.5rem 1rem;
    background: #2a2a3a;
    border: 1px solid #3a3a4a;
    border-radius: 6px;
    color: #e0e0e0;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }

  .add-buttons button:hover {
    background: #3a3a4a;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .control-group label {
    min-width: 120px;
  }

  .control-group input[type="range"] {
    flex: 1;
    max-width: 300px;
  }

  .control-group .value {
    min-width: 60px;
    text-align: right;
    font-family: monospace;
    color: #667eea;
  }

  .layers-list {
    display: grid;
    gap: 1rem;
  }

  .empty-state {
    color: #666;
    text-align: center;
    padding: 2rem;
  }

  .layer-card {
    background: #1a1a25;
    border-radius: 8px;
    padding: 1rem;
  }

  .layer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .layer-name {
    font-weight: 600;
  }

  .remove-btn {
    background: #ff4444;
    border: none;
    border-radius: 4px;
    width: 28px;
    height: 28px;
    color: white;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
  }

  .layer-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .layer-controls label {
    min-width: 60px;
    font-size: 0.875rem;
    color: #888;
  }

  .layer-controls input[type="range"] {
    flex: 1;
  }

  .layer-controls .vol-value {
    min-width: 50px;
    text-align: right;
    font-family: monospace;
    color: #888;
  }

  .layer-status {
    display: flex;
  }

  .mute-btn {
    padding: 0.5rem 1rem;
    background: #2a2a3a;
    border: 1px solid #3a3a4a;
    border-radius: 6px;
    color: #e0e0e0;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .mute-btn.muted {
    background: #4a2a2a;
    border-color: #ff4444;
    color: #ff6666;
  }

  .mute-btn:hover {
    background: #3a3a4a;
  }

  .mute-btn.muted:hover {
    background: #5a3a3a;
  }

  input[type="range"] {
    -webkit-appearance: none;
    background: #2a2a3a;
    height: 6px;
    border-radius: 3px;
    outline: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: #667eea;
    border-radius: 50%;
    cursor: pointer;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #12121a;
    border-radius: 8px;
    font-size: 0.875rem;
  }

  .status-indicator {
    color: #444;
  }

  .status-indicator.active {
    color: #4ade80;
  }

  .cpu-meter {
    margin-left: auto;
    font-family: monospace;
    color: #666;
  }
</style>
