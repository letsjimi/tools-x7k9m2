/**
 * Effects Rack - 8-slot effect management with drag & drop
 * Simulates WING effect rack architecture
 */

class EffectsRack {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.slots = [];
    this.onEffectChange = null; // callback when effects change
    this.onEffectOpen = null;   // callback to open effect UI
    
    this.availableEffects = [
      { type: 'hall',       name: 'Hall Reverb',   icon: '🏛️', color: '#3498db' },
      { type: 'delay',      name: 'Delay',          icon: '⏱️', color: '#e67e22' },
      { type: 'chorus',     name: 'Chorus',         icon: '🌊', color: '#2ecc71' },
      { type: 'compressor', name: 'Compressor',     icon: '🔧', color: '#e74c3c' },
      { type: 'eq',         name: 'Parametric EQ',  icon: '📊', color: '#9b59b6' },
      { type: 'de-esser',   name: 'De-Esser',       icon: '🔇', color: '#1abc9c' },
      { type: 'gate',       name: 'Gate',           icon: '🚪', color: '#f39c12' },
      { type: 'limiter',    name: 'Limiter',        icon: '⛔', color: '#c0392b' }
    ];
    
    // Effect parameter defaults
    this.effectDefaults = {
      hall: {
        preDelay: 20,    // ms
        decay: 2.0,      // s
        diffusion: 0.8,
        damping: 0.5,
        mix: 0.3,
        size: 0.7
      },
      delay: {
        time: 250,       // ms
        feedback: 0.4,
        mix: 0.3,
        pingPong: false,
        sync: false,
        hpFilter: 80
      },
      chorus: {
        rate: 1.5,       // Hz
        depth: 0.7,
        mix: 0.3,
        voices: 3,
        delay: 10        // ms
      },
      compressor: {
        threshold: -20,  // dB
        ratio: 4,
        attack: 10,      // ms
        release: 100,     // ms
        makeup: 0,        // dB
        knee: 6,          // dB
        mix: 1.0
      },
      eq: {
        bands: [
          { freq: 80, gain: 0, q: 0.7, type: 'shelf' },
          { freq: 500, gain: 0, q: 1.0, type: 'bell' },
          { freq: 2000, gain: 0, q: 1.0, type: 'bell' },
          { freq: 8000, gain: 0, q: 0.7, type: 'shelf' }
        ]
      },
      'de-esser': {
        frequency: 6000,
        threshold: -20,
        ratio: 4,
        attack: 1,
        release: 50,
        mix: 1.0
      },
      gate: {
        threshold: -40,
        attack: 1,
        hold: 50,
        release: 100,
        range: -80,
        keyFilter: 0
      },
      limiter: {
        ceiling: -0.3,
        threshold: -6,
        release: 50,
        attack: 1,
        mix: 1.0
      }
    };
    
    // Current effect states (keyed by slot index)
    this.effectStates = {};
    
    this._render();
    this._setupDragDrop();
  }

  _render() {
    this.container.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.className = 'effects-rack-header';
    header.innerHTML = `
      <h3>⚙️ Effects Rack</h3>
      <div class="latency-display" id="latency-display">
        Latency: <span id="total-latency">0.67</span>ms
      </div>
    `;
    this.container.appendChild(header);
    
    // Available effects palette (draggable sources)
    const palette = document.createElement('div');
    palette.className = 'effects-palette';
    palette.innerHTML = '<div class="palette-label">Available Effects</div>';
    
    this.availableEffects.forEach(eff => {
      const chip = document.createElement('div');
      chip.className = 'effect-chip';
      chip.draggable = true;
      chip.dataset.effectType = eff.type;
      chip.style.borderColor = eff.color;
      chip.innerHTML = `<span class="effect-icon">${eff.icon}</span><span class="effect-name">${eff.name}</span>`;
      
      chip.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', eff.type);
        e.dataTransfer.effectAllowed = 'copy';
        chip.classList.add('dragging');
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      
      palette.appendChild(chip);
    });
    
    this.container.appendChild(palette);
    
    // Slots
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'effects-slots';
    slotsContainer.innerHTML = '<div class="palette-label">Rack Slots (drag effects here)</div>';
    
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'effect-slot';
      slot.dataset.slotIndex = i;
      
      const slotNum = document.createElement('div');
      slotNum.className = 'slot-number';
      slotNum.textContent = i + 1;
      slot.appendChild(slotNum);
      
      const slotContent = document.createElement('div');
      slotContent.className = 'slot-content';
      slotContent.id = `slot-content-${i}`;
      slotContent.innerHTML = `<div class="slot-empty">Drop Effect</div>`;
      slot.appendChild(slotContent);
      
      // Drop zone events
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        slot.classList.add('slot-drag-over');
      });
      slot.addEventListener('dragleave', () => {
        slot.classList.remove('slot-drag-over');
      });
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('slot-drag-over');
        const effectType = e.dataTransfer.getData('text/plain');
        if (effectType) {
          this.assignEffect(i, effectType);
        }
      });
      
      slotsContainer.appendChild(slot);
      this.slots.push(slot);
    }
    
    this.container.appendChild(slotsContainer);
  }

  _setupDragDrop() {
    // Global drag end cleanup
    document.addEventListener('dragend', () => {
      document.querySelectorAll('.slot-drag-over').forEach(el => el.classList.remove('slot-drag-over'));
    });
  }

  assignEffect(slotIndex, effectType) {
    const effDef = this.availableEffects.find(e => e.type === effectType);
    if (!effDef) return;
    
    // Create effect state from defaults
    this.effectStates[slotIndex] = JSON.parse(JSON.stringify(this.effectDefaults[effectType]));
    
    // Update UI
    const content = document.getElementById(`slot-content-${slotIndex}`);
    if (!content) return;
    
    content.innerHTML = `
      <div class="slot-effect" style="border-left: 3px solid ${effDef.color}">
        <div class="slot-effect-header">
          <span class="effect-icon">${effDef.icon}</span>
          <span class="effect-name">${effDef.name}</span>
          <button class="slot-remove" data-slot="${slotIndex}" title="Remove">✕</button>
        </div>
        <button class="slot-open" data-slot="${slotIndex}" data-type="${effectType}">
          Open Editor
        </button>
        <div class="slot-power">
          <label class="power-toggle">
            <input type="checkbox" checked data-slot="${slotIndex}" class="effect-power">
            <span class="power-slider"></span>
          </label>
        </div>
      </div>
    `;
    
    // Event listeners
    content.querySelector('.slot-remove').addEventListener('click', () => {
      this.removeEffect(slotIndex);
    });
    
    content.querySelector('.slot-open').addEventListener('click', () => {
      if (this.onEffectOpen) {
        this.onEffectOpen(slotIndex, effectType);
      }
    });
    
    content.querySelector('.effect-power').addEventListener('change', (e) => {
      if (this.onEffectChange) {
        this.onEffectChange(slotIndex, effectType, e.target.checked ? 'enabled' : 'disabled');
      }
    });
    
    // Update state
    wingState.assignEffect(slotIndex, effectType);
    this._updateLatency();
  }

  removeEffect(slotIndex) {
    const content = document.getElementById(`slot-content-${slotIndex}`);
    if (!content) return;
    
    content.innerHTML = '<div class="slot-empty">Drop Effect</div>';
    delete this.effectStates[slotIndex];
    
    wingState.removeEffect(slotIndex);
    this._updateLatency();
    
    if (this.onEffectChange) {
      this.onEffectChange(slotIndex, null, 'removed');
    }
  }

  _updateLatency() {
    const info = wingState.getLatencyInfo();
    const display = document.getElementById('total-latency');
    if (display) {
      display.textContent = info.totalMs.toFixed(2);
    }
  }

  getEffectState(slotIndex) {
    return this.effectStates[slotIndex] || null;
  }

  updateEffectParam(slotIndex, param, value) {
    if (this.effectStates[slotIndex]) {
      this.effectStates[slotIndex][param] = value;
    }
  }

  // Render effect detail popup
  showEffectPopup(slotIndex, effectType) {
    // Remove existing popup
    const existing = document.getElementById('effect-popup');
    if (existing) existing.remove();
    
    const state = this.effectStates[slotIndex];
    if (!state) return;
    
    const effDef = this.availableEffects.find(e => e.type === effectType);
    
    const popup = document.createElement('div');
    popup.id = 'effect-popup';
    popup.className = 'effect-popup';
    popup.style.setProperty('--effect-color', effDef.color);
    
    const params = this._buildEffectUI(effectType, state, slotIndex);
    
    popup.innerHTML = `
      <div class="popup-header" style="background: ${effDef.color}">
        <span class="popup-icon">${effDef.icon}</span>
        <span class="popup-title">${effDef.name}</span>
        <span class="popup-slot">Slot ${slotIndex + 1}</span>
        <button class="popup-close" id="popup-close">✕</button>
      </div>
      <div class="popup-body">
        ${params}
      </div>
      <div class="popup-footer">
        <div class="popup-latency">
          Additional Latency: <strong>${WING.LATENCY.effects[effectType]?.ms || 0}ms</strong>
          (${WING.LATENCY.effects[effectType]?.samples || 0} samples)
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Close handler
    document.getElementById('popup-close').addEventListener('click', () => popup.remove());
    popup.addEventListener('click', (e) => {
      if (e.target === popup) popup.remove();
    });
    
    // Initialize knobs in popup
    this._initPopupKnobs(popup, slotIndex, effectType);
  }

  _buildEffectUI(effectType, state, slotIndex) {
    const knobHtml = (label, param, min, max, value, unit = '', step = null) => {
      const steps = step || ((max - min) <= 1 ? 0.01 : (max - min) <= 10 ? 0.1 : 1);
      return `
        <div class="popup-param">
          <div class="popup-param-label">${label}</div>
          <div class="popup-knob-wrapper">
            <canvas class="popup-knob" data-param="${param}" data-min="${min}" data-max="${max}" data-value="${value}" data-step="${steps}" width="60" height="60"></canvas>
          </div>
          <div class="popup-param-value" id="popup-val-${param}">${this._formatParam(value, unit)}</div>
        </div>
      `;
    };

    switch (effectType) {
      case 'hall':
        return `
          ${knobHtml('Pre Delay', 'preDelay', 0, 100, state.preDelay, 'ms')}
          ${knobHtml('Decay', 'decay', 0.1, 8.0, state.decay, 's', 0.1)}
          ${knobHtml('Diffusion', 'diffusion', 0, 1, state.diffusion, '')}
          ${knobHtml('Damping', 'damping', 0, 1, state.damping, '')}
          ${knobHtml('Mix', 'mix', 0, 1, state.mix, '')}
          ${knobHtml('Size', 'size', 0, 1, state.size, '')}
        `;
      case 'delay':
        return `
          ${knobHtml('Time', 'time', 1, 2000, state.time, 'ms')}
          ${knobHtml('Feedback', 'feedback', 0, 0.95, state.feedback, '')}
          ${knobHtml('Mix', 'mix', 0, 1, state.mix, '')}
          ${knobHtml('HP Filter', 'hpFilter', 20, 500, state.hpFilter, 'Hz')}
          <div class="popup-param">
            <div class="popup-param-label">Ping Pong</div>
            <label class="toggle-switch">
              <input type="checkbox" data-param="pingPong" ${state.pingPong ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        `;
      case 'chorus':
        return `
          ${knobHtml('Rate', 'rate', 0.1, 10, state.rate, 'Hz', 0.1)}
          ${knobHtml('Depth', 'depth', 0, 1, state.depth, '')}
          ${knobHtml('Mix', 'mix', 0, 1, state.mix, '')}
          ${knobHtml('Voices', 'voices', 1, 8, state.voices, '')}
          ${knobHtml('Delay', 'delay', 1, 50, state.delay, 'ms')}
        `;
      case 'compressor':
        return `
          ${knobHtml('Threshold', 'threshold', -60, 0, state.threshold, 'dB')}
          ${knobHtml('Ratio', 'ratio', 1, 20, state.ratio, ':1', 0.1)}
          ${knobHtml('Attack', 'attack', 0.1, 100, state.attack, 'ms')}
          ${knobHtml('Release', 'release', 10, 1000, state.release, 'ms')}
          ${knobHtml('Makeup', 'makeup', 0, 24, state.makeup, 'dB')}
          ${knobHtml('Knee', 'knee', 0, 12, state.knee, 'dB')}
        `;
      case 'eq':
        return state.bands.map((band, i) => `
          ${knobHtml(`Band ${i+1} Freq`, 'bands.' + i + '.freq', 20, 20000, band.freq, 'Hz')}
          ${knobHtml(`Band ${i+1} Gain`, 'bands.' + i + '.gain', -18, 18, band.gain, 'dB')}
          ${knobHtml(`Band ${i+1} Q`, 'bands.' + i + '.q', 0.1, 10, band.q, '', 0.1)}
        `).join('');
      case 'de-esser':
        return `
          ${knobHtml('Frequency', 'frequency', 2000, 12000, state.frequency, 'Hz')}
          ${knobHtml('Threshold', 'threshold', -60, 0, state.threshold, 'dB')}
          ${knobHtml('Ratio', 'ratio', 1, 20, state.ratio, ':1', 0.1)}
          ${knobHtml('Attack', 'attack', 0.1, 50, state.attack, 'ms')}
          ${knobHtml('Release', 'release', 10, 500, state.release, 'ms')}
        `;
      case 'gate':
        return `
          ${knobHtml('Threshold', 'threshold', -80, 0, state.threshold, 'dB')}
          ${knobHtml('Attack', 'attack', 0.1, 100, state.attack, 'ms')}
          ${knobHtml('Hold', 'hold', 0, 2000, state.hold, 'ms')}
          ${knobHtml('Release', 'release', 10, 2000, state.release, 'ms')}
          ${knobHtml('Range', 'range', -80, 0, state.range, 'dB')}
        `;
      case 'limiter':
        return `
          ${knobHtml('Ceiling', 'ceiling', -6, 0, state.ceiling, 'dB', 0.1)}
          ${knobHtml('Threshold', 'threshold', -24, 0, state.threshold, 'dB')}
          ${knobHtml('Release', 'release', 1, 500, state.release, 'ms')}
          ${knobHtml('Attack', 'attack', 0.1, 50, state.attack, 'ms')}
        `;
      default:
        return '<p>No parameters available</p>';
    }
  }

  _formatParam(value, unit) {
    if (typeof value === 'boolean') return value ? 'On' : 'Off';
    const formatted = Math.abs(value) < 10 ? value.toFixed(2) : value.toFixed(1);
    return formatted + (unit ? ' ' + unit : '');
  }

  _initPopupKnobs(popup, slotIndex, effectType) {
    const canvases = popup.querySelectorAll('.popup-knob');
    canvases.forEach(canvas => {
      const param = canvas.dataset.param;
      const min = parseFloat(canvas.dataset.min);
      const max = parseFloat(canvas.dataset.max);
      const value = parseFloat(canvas.dataset.value);
      const step = parseFloat(canvas.dataset.step);
      
      this._drawSmallKnob(canvas, value, min, max);
      
      // Interaction
      let startY = 0;
      let startValue = 0;
      
      const onStart = (e) => {
        const y = e.clientY || e.touches[0].clientY;
        startY = y;
        startValue = parseFloat(canvas.dataset.value);
        e.preventDefault();
      };
      
      const onMove = (e) => {
        const y = e.clientY || e.touches[0].clientY;
        const delta = (startY - y) * (step || 1) * 0.5;
        let newValue = startValue + delta;
        newValue = Math.max(min, Math.min(max, newValue));
        
        canvas.dataset.value = newValue;
        this._drawSmallKnob(canvas, newValue, min, max);
        
        // Update display
        const valDisplay = document.getElementById(`popup-val-${param}`);
        if (valDisplay) {
          valDisplay.textContent = this._formatParam(newValue, '');
        }
        
        // Update state
        this.updateEffectParam(slotIndex, param, newValue);
      };
      
      const onEnd = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      };
      
      canvas.addEventListener('mousedown', (e) => {
        onStart(e);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
      });
      
      canvas.addEventListener('touchstart', (e) => {
        onStart(e);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
      }, { passive: false });
    });
    
    // Toggle switches
    popup.querySelectorAll('.toggle-switch input').forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateEffectParam(slotIndex, input.dataset.param, e.target.checked);
      });
    });
  }

  _drawSmallKnob(canvas, value, min, max) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + 4;
    const r = 22;
    
    ctx.clearRect(0, 0, w, h);
    
    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, 0.25 * Math.PI, false);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Value arc
    const norm = (value - min) / (max - min);
    const endAngle = 0.75 * Math.PI + norm * 1.5 * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, endAngle, false);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--effect-color') || '#00d4ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
    
    // Indicator line
    const indicatorAngle = 0.75 * Math.PI + norm * 1.5 * Math.PI;
    const ix = cx + Math.cos(indicatorAngle) * (r - 6);
    const iy = cy + Math.sin(indicatorAngle) * (r - 6);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ix, iy);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}