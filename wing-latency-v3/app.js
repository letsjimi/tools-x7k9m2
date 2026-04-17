// WING Latenz Rechner v3 — Exakte PDF-Daten
(() => {
  'use strict';

  // ── Latenz-Daten (Samples bei 48kHz) ──
  const FX_DATA = {
    // === REVERB (32 Samples) ===
    'Hall Reverb':       { samples: 32, group: 'reverb' },
    'Room Reverb':       { samples: 32, group: 'reverb' },
    'Chamber':           { samples: 32, group: 'reverb' },
    'Plate':             { samples: 32, group: 'reverb' },
    'Concert':           { samples: 32, group: 'reverb' },
    'Ambi':              { samples: 32, group: 'reverb' },
    'VSS3':              { samples: 32, group: 'reverb' },
    'Vintage Room':      { samples: 32, group: 'reverb' },
    'Vintage Reverb':    { samples: 32, group: 'reverb' },
    'Vintage Plate':     { samples: 32, group: 'reverb' },
    'Blue Plate':        { samples: 32, group: 'reverb' },
    'Gated Reverb':      { samples: 32, group: 'reverb' },
    'Reverse Reverb':    { samples: 32, group: 'reverb' },
    'Delay Reverb':      { samples: 32, group: 'reverb' },
    'Shimmer Reverb':    { samples: 32, group: 'reverb' },
    'Spring Reverb':     { samples: 32, group: 'reverb' },

    // === DELAY (32 Samples) ===
    'Wing Delay':        { samples: 32, group: 'delay' },
    'Ultra Tap Delay':   { samples: 32, group: 'delay' },
    'Tape Delay':        { samples: 32, group: 'delay' },
    'Oilcan Delay':      { samples: 32, group: 'delay' },
    'BBD Delay':         { samples: 32, group: 'delay' },

    // === MOD/FX (32 Samples Standard) ===
    'Stereo Chorus':     { samples: 32, group: 'mod' },
    'Stereo Flanger':    { samples: 32, group: 'mod' },
    'Rotary Speaker':    { samples: 32, group: 'mod' },
    'Phaser':            { samples: 32, group: 'mod' },
    'Tremolo/Panner':    { samples: 32, group: 'mod' },
    'Pulsar':            { samples: 32, group: 'mod' },
    'Mach04':            { samples: 32, group: 'mod' },

    // === MOD/FX — Exceptions ===
    'Exciter':           { samples: 43, group: 'mod', exception: true },

    // === MOD/FX — Unclear ===
    'Dimension Chorus':  { samples: null, group: 'mod', unclear: true, est: '~32' },
    'Tape':              { samples: null, group: 'mod', unclear: true, est: 'var.' },
    'Mood Filter':       { samples: null, group: 'mod', unclear: true, est: 'var.' },
    'Bodyrez':           { samples: null, group: 'mod', unclear: true, est: 'var.' },

    // === DYNAMICS (32 Samples Standard) ===
    'De-esser':          { samples: 32, group: 'dynamics' },
    'Ultra Enhancer':    { samples: 32, group: 'dynamics' },
    'Triple DEQ':        { samples: 32, group: 'dynamics' },
    'Sub Octaver':       { samples: 32, group: 'dynamics' },
    'Sub Monster':       { samples: 32, group: 'dynamics' },
    'Velvet Imager':     { samples: 32, group: 'dynamics' },
    'Double Vocal':      { samples: 32, group: 'dynamics' },
    'STD ALL FX GEQ':    { samples: 32, group: 'dynamics' },
    'PIA S60 GEQ':       { samples: 32, group: 'dynamics' },

    // === DYNAMICS — Exceptions ===
    'Speaker Manager':   { samples: 33, group: 'dynamics', exception: true },
    'Mastering':         { samples: 36, group: 'dynamics', exception: true },

    // === DYNAMICS — Unclear ===
    'Combinator':        { samples: null, group: 'dynamics', unclear: true, est: 'var.' },
    'Precision Limiter': { samples: null, group: 'dynamics', unclear: true, est: 'var.' },
    'Psycho Bass':       { samples: null, group: 'dynamics', unclear: true, est: 'var.' },

    // === PITCH/AMP (32 Samples Standard) ===
    'Dual Pitch':        { samples: 32, group: 'pitch' },
    'Even 88 Formant':   { samples: 32, group: 'pitch' },
    'Even 84':           { samples: 32, group: 'pitch' },
    'Fortissimo 110':    { samples: 32, group: 'pitch' },

    // === PITCH/AMP — Unclear ===
    'Stereo Pitch':      { samples: null, group: 'pitch', unclear: true, est: 'var.' },
    'Pitch Fix':         { samples: null, group: 'pitch', unclear: true, est: 'var.' },
    'Angel Amp':         { samples: null, group: 'pitch', unclear: true, est: 'var.' },
    'Rack Amp':          { samples: null, group: 'pitch', unclear: true, est: 'var.' },
    'Rock Amp':          { samples: null, group: 'pitch', unclear: true, est: 'var.' },
    'Jazz Clean Amp':    { samples: null, group: 'pitch', unclear: true, est: 'var.' },
    'Delux Amp':         { samples: null, group: 'pitch', unclear: true, est: 'var.' },

    // === CHANNEL (32 Samples Standard) ===
    'Soul Analog':       { samples: 32, group: 'channel' },
    'Even Channel':      { samples: 32, group: 'channel' },
    'Soul Channel':      { samples: 32, group: 'channel' },
    'Vintage Channel':   { samples: 32, group: 'channel' },
    'Bus Channel':        { samples: 32, group: 'channel' },

    // === CHANNEL — Unclear ===
    // (none in channel group)
  };

  // ── Tab → Group Mapping ──
  const TAB_GROUPS = {
    reverb: 'reverb',
    delay: 'delay',
    mod: 'mod',
    dynamics: 'dynamics',
    pitch: 'pitch',
    channel: 'channel',
  };

  // ── State ──
  let sampleRate = 48000;
  let activeEffects = []; // array of effect names
  let currentTab = 'reverb';

  // ── Helpers ──
  function samplesToMs(samples) {
    if (samples === null) return null;
    return (samples / 48000) * 1000; // base is always 48kHz samples
  }

  function getDisplaySamples(samples48k) {
    // Samples scale proportionally with sample rate (same DSP → more samples at higher rate)
    if (samples48k === null) return null;
    return Math.round(samples48k * (sampleRate / 48000));
  }

  function getDisplayMs(samples48k) {
    if (samples48k === null) return null;
    // ms stays the same regardless of sample rate (same algorithm, same time)
    return (samples48k / 48000) * 1000;
  }

  // ── Render ──
  function render() {
    renderLatencyDisplay();
    renderRack();
    renderFxGrid();
  }

  function renderLatencyDisplay() {
    let inputSamples = 0;
    let outputSamples = 0;

    activeEffects.forEach(name => {
      const fx = FX_DATA[name];
      if (fx && fx.samples !== null) {
        // All effects contribute to total; first half = input path, second = output
        // For simplicity: input = first effect latency, output = last effect latency
        // But actually: total = sum of all active effect latencies
        // Input/Output split: input gets first, output gets the rest
      }
    });

    // Simpler model: total = sum of all latencies
    // Input = sum of insert effects, Output = sum of output effects
    // Most natural: total = sum, input ≈ first effect, output ≈ last
    // Best approach: total is the sum; input = total (since all add to the input→output chain)

    let totalS48 = 0;
    let hasUnclear = false;

    activeEffects.forEach(name => {
      const fx = FX_DATA[name];
      if (fx) {
        if (fx.samples !== null) {
          totalS48 += fx.samples;
        } else {
          hasUnclear = true;
        }
      }
    });

    // Input path: latency from input processing
    // Output path: latency from output processing
    // In a digital mixer, the total round-trip = input latency + output latency
    // For WING: input processing ≈ output processing when effects are on insert points
    // Simplified: show total as the sum, input = ceil(total/2), output = floor(total/2)
    // Actually, the most useful display: total = all effects summed
    // Input shows the input-side contribution, Output shows output-side

    const totalDisp = getDisplaySamples(totalS48);
    const totalMs = getDisplayMs(totalS48);

    // Split: first half of effects → input, second half → output
    const mid = Math.ceil(activeEffects.length / 2);
    let inputS48 = 0, outputS48 = 0;
    activeEffects.forEach((name, i) => {
      const fx = FX_DATA[name];
      if (fx && fx.samples !== null) {
        if (i < mid) inputS48 += fx.samples;
        else outputS48 += fx.samples;
      }
    });

    const inputDisp = getDisplaySamples(inputS48);
    const inputMsVal = getDisplayMs(inputS48);
    const outputDisp = getDisplaySamples(outputS48);
    const outputMsVal = getDisplayMs(outputS48);

    document.getElementById('input-samples').textContent = inputDisp;
    document.getElementById('input-ms').textContent = inputMsVal.toFixed(2) + ' ms';
    document.getElementById('total-samples').textContent = totalDisp + (hasUnclear ? '+' : '');
    document.getElementById('total-ms').textContent = totalMs.toFixed(2) + ' ms' + (hasUnclear ? ' +' : '');
    document.getElementById('output-samples').textContent = outputDisp;
    document.getElementById('output-ms').textContent = outputMsVal.toFixed(2) + ' ms';
  }

  function renderRack() {
    const container = document.getElementById('active-effects');

    if (activeEffects.length === 0) {
      container.innerHTML = '<span class="rack-empty">Tippe Effekte zum Hinzufügen</span>';
      return;
    }

    container.innerHTML = activeEffects.map((name, i) => {
      const fx = FX_DATA[name];
      const isUnclear = fx && fx.unclear;
      const cls = isUnclear ? 'rack-chip unclear' : 'rack-chip';
      const latText = fx ? (fx.samples !== null ? (getDisplaySamples(fx.samples) + ' S') : (fx.est || '?')) : '?';

      return `<div class="${cls}" data-index="${i}">
        <span>${name}</span>
        <span class="chip-samples">${latText}</span>
        <span class="chip-remove">✕</span>
      </div>`;
    }).join('');

    // Bind remove
    container.querySelectorAll('.rack-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const idx = parseInt(chip.dataset.index);
        activeEffects.splice(idx, 1);
        render();
      });
    });
  }

  function renderFxGrid() {
    const grid = document.getElementById('fx-grid');
    const groupNames = Object.keys(TAB_GROUPS);
    const currentGroup = TAB_GROUPS[currentTab];

    const fxs = Object.entries(FX_DATA)
      .filter(([_, fx]) => fx.group === currentGroup)
      .sort((a, b) => {
        // Clear ones first, then exceptions, then unclear
        const order = (fx) => fx.unclear ? 2 : (fx.exception ? 1 : 0);
        const oa = order(a[1]), ob = order(b[1]);
        if (oa !== ob) return oa - ob;
        return a[0].localeCompare(b[0]);
      });

    grid.innerHTML = fxs.map(([name, fx]) => {
      const isActive = activeEffects.includes(name);
      const isUnclear = fx.unclear;
      const isException = fx.exception;

      let cls = 'fx-btn';
      if (isActive) cls += ' active';
      if (isUnclear) cls += ' unclear';
      else if (isException) cls += ' exception';

      const latText = fx.samples !== null
        ? (getDisplaySamples(fx.samples) + ' S / ' + getDisplayMs(fx.samples).toFixed(2) + 'ms')
        : (fx.est || '?');

      return `<div class="${cls}" data-name="${name}">
        <span class="fx-name">${name}</span>
        <span class="fx-lat">${latText}</span>
      </div>`;
    }).join('');

    // Bind toggle
    grid.querySelectorAll('.fx-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const idx = activeEffects.indexOf(name);
        if (idx >= 0) {
          activeEffects.splice(idx, 1);
        } else {
          activeEffects.push(name);
        }
        render();
      });
    });
  }

  // ── Event Binding ──
  function bindEvents() {
    // Sample rate buttons
    document.querySelectorAll('.rate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sampleRate = parseInt(btn.dataset.rate);
        render();
      });
    });

    // FX tabs
    document.querySelectorAll('.fx-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.fx-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        renderFxGrid();
      });
    });

    // Clear all
    document.getElementById('clear-all').addEventListener('click', () => {
      activeEffects = [];
      render();
    });
  }

  // ── Init ──
  function init() {
    bindEvents();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();