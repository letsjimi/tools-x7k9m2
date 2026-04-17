/**
 * WING Core - Audio engine constants, math, and shared state
 * Behringer WING Digital Mixer Emulation
 */

const WING = {
  // Sample rate and buffer
  SAMPLE_RATE: 48000,
  BUFFER_SIZE: 64,
  
  // Latency calculations
  LATENCY: {
    baseMs: function() { return (this.bufferSize / this.sampleRate) * 1000; },
    bufferSize: 64,
    sampleRate: 48000,
    // Per-channel processing: 32 samples without effects
    channelProcessingSamples: 32,
    channelProcessingMs: function() { return (this.channelProcessingSamples / this.sampleRate) * 1000; },
    // Effect latency additions (approximate, algorithm-dependent)
    effects: {
      'hall':     { samples: 0,  ms: 0,     name: 'Hall Reverb' },
      'delay':    { samples: 0,  ms: 0,     name: 'Delay' },
      'chorus':   { samples: 64, ms: 1.33,  name: 'Chorus' },
      'compressor':{ samples: 32, ms: 0.67, name: 'Compressor' },
      'eq':       { samples: 16, ms: 0.33,  name: 'Parametric EQ' },
      'de-esser': { samples: 32, ms: 0.67,  name: 'De-Esser' },
      'gate':     { samples: 16, ms: 0.33,  name: 'Gate' },
      'limiter':  { samples: 16, ms: 0.33,  name: 'Limiter' }
    },
    totalMs: function(activeEffects) {
      let total = this.channelProcessingMs();
      activeEffects.forEach(eff => {
        if (this.effects[eff]) {
          total += this.effects[eff].ms;
        }
      });
      return total;
    }
  },

  // Channel colors matching WING hardware
  COLORS: {
    R: '#e74c3c',  // Red
    G: '#2ecc71',  // Green
    B: '#3498db',  // Blue
    Y: '#f1c40f',  // Yellow
    P: '#9b59b6',  // Purple
    NONE: '#555555'
  },

  // EQ Band definitions (WING parametric EQ ranges)
  EQ: {
    bands: [
      { id: 'low',      label: 'Low',      freqMin: 20,    freqMax: 500,   freqDefault: 80,    gainMin: -18, gainMax: 18, qMin: 0.1, qMax: 10, qDefault: 0.7, type: 'shelf' },
      { id: 'lowmid',   label: 'Low-Mid',   freqMin: 100,   freqMax: 8000,  freqDefault: 500,   gainMin: -18, gainMax: 18, qMin: 0.1, qMax: 10, qDefault: 1.0, type: 'bell' },
      { id: 'highmid',  label: 'High-Mid',  freqMin: 200,   freqMax: 16000, freqDefault: 2000,  gainMin: -18, gainMax: 18, qMin: 0.1, qMax: 10, qDefault: 1.0, type: 'bell' },
      { id: 'high',     label: 'High',      freqMin: 1000,  freqMax: 20000, freqDefault: 8000, gainMin: -18, gainMax: 18, qMin: 0.1, qMax: 10, qDefault: 0.7, type: 'shelf' }
    ]
  },

  // Bus send defaults
  BUS_COUNT: 16,
  
  // Fader range
  FADER: {
    min: -Infinity,
    max: 10, // +10dB
    steps: 1024,
    // dB to position (0-1)
    dbToPos: function(db) {
      if (db === -Infinity) return 0;
      if (db <= -60) return 0;
      if (db >= 10) return 1;
      // WING style: -60 to +10 mapped to 0-1 with log taper
      const pos = (db + 60) / 70;
      return Math.max(0, Math.min(1, pos));
    },
    posToDb: function(pos) {
      if (pos <= 0) return -Infinity;
      if (pos >= 1) return 10;
      return -60 + pos * 70;
    },
    formatDb: function(db) {
      if (db === -Infinity || db <= -60) return '-∞';
      return (db >= 0 ? '+' : '') + db.toFixed(1);
    }
  },

  // Knob utility
  KNOB: {
    // Convert angle (-150 to 150 degrees) to value (0-1)
    angleToValue: function(angle) {
      return (angle + 150) / 300;
    },
    valueToAngle: function(value) {
      return value * 300 - 150;
    },
    // Log scale for frequency
    freqToAngle: function(freq, min, max) {
      const norm = Math.log(freq / min) / Math.log(max / min);
      return norm * 300 - 150;
    },
    angleToFreq: function(angle, min, max) {
      const norm = (angle + 150) / 300;
      return min * Math.pow(max / min, norm);
    }
  },

  // Pan utility
  PAN: {
    // -1 (left) to +1 (right), 0 = center
    format: function(val) {
      if (Math.abs(val) < 0.05) return 'C';
      return val < 0 ? 'L' + Math.round(Math.abs(val) * 50) : 'R' + Math.round(val * 50);
    }
  }
};

// State management
class WingState {
  constructor() {
    this.channels = new Map();
    this.activeEffectSlots = new Map(); // slot index -> effect type
    this.selectedChannel = null;
    this.listeners = new Map();
  }

  // Create default channel state
  createChannel(id, name, color) {
    const channel = {
      id,
      name: name || `CH ${id}`,
      color: color || 'G',
      gain: 0,          // dB
      // EQ
      eq: {
        low:     { freq: 80,   gain: 0,  q: 0.7,  enabled: true },
        lowmid:  { freq: 500,  gain: 0,  q: 1.0,  enabled: true },
        highmid: { freq: 2000, gain: 0,  q: 1.0,  enabled: true },
        high:    { freq: 8000, gain: 0,  q: 0.7,  enabled: true }
      },
      // Gate
      gate: { enabled: false, threshold: -40, attack: 1, hold: 50, release: 100, range: -80 },
      // Compressor
      compressor: { enabled: false, threshold: -20, ratio: 4, attack: 10, release: 100, makeup: 0, knee: 6 },
      // Sends (bus 1-16)
      sends: Array.from({length: 16}, (_, i) => ({ level: -Infinity, enabled: false })),
      // Pan
      pan: 0,
      // Fader
      fader: 0,  // dB
      // Mute
      mute: false,
      // Meter level (simulated)
      meter: -60,
      meterPeak: -60
    };
    this.channels.set(id, channel);
    this.emit('channelCreated', channel);
    return channel;
  }

  getChannel(id) {
    return this.channels.get(id);
  }

  updateChannel(id, path, value) {
    const channel = this.channels.get(id);
    if (!channel) return;
    
    const parts = path.split('.');
    let obj = channel;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] === undefined) return;
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    this.emit('channelUpdated', { id, path, value, channel });
  }

  // Effect slot management
  assignEffect(slotIndex, effectType) {
    this.activeEffectSlots.set(slotIndex, effectType);
    this.emit('effectAssigned', { slotIndex, effectType });
  }

  removeEffect(slotIndex) {
    const type = this.activeEffectSlots.get(slotIndex);
    this.activeEffectSlots.delete(slotIndex);
    this.emit('effectRemoved', { slotIndex, type });
  }

  getActiveEffects() {
    return Array.from(this.activeEffectSlots.values());
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event);
    const idx = list.indexOf(callback);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(cb => cb(data));
  }

  // Latency info
  getLatencyInfo() {
    const activeEffects = this.getActiveEffects();
    return {
      bufferMs: WING.LATENCY.baseMs(),
      channelMs: WING.LATENCY.channelProcessingMs(),
      effectsMs: WING.LATENCY.totalMs(activeEffects) - WING.LATENCY.channelProcessingMs(),
      totalMs: WING.LATENCY.totalMs(activeEffects),
      activeEffects: activeEffects,
      breakdown: activeEffects.map(e => ({
        type: e,
        ...WING.LATENCY.effects[e]
      }))
    };
  }
}

// Singleton
const wingState = new WingState();