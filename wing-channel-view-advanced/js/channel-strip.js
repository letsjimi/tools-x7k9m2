/**
 * Channel Strip - Individual channel UI and logic
 * Renders a full WING channel strip with all controls
 */

class ChannelStrip {
  constructor(containerId, channelId) {
    this.containerId = containerId;
    this.channelId = channelId;
    this.channel = wingState.getChannel(channelId);
    this.knobElements = new Map();
    this.meterAnimation = null;
    this.simulateMeters = true;
    
    this._render();
    this._initControls();
    this._startMeterSimulation();
  }

  _render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    
    const ch = this.channel;
    const color = WING.COLORS[ch.color] || WING.COLORS.NONE;
    
    container.innerHTML = `
      <div class="channel-strip" data-channel="${ch.id}">
        <!-- Channel Header -->
        <div class="channel-header" style="background: ${color}">
          <div class="channel-name" id="ch-name-${ch.id}">${ch.name}</div>
          <div class="channel-color-indicator">
            <select class="color-select" data-channel="${ch.id}" id="color-select-${ch.id}">
              ${['R','G','B','Y','P'].map(c => `<option value="${c}" ${ch.color === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <!-- Gain/Trim -->
        <div class="channel-section gain-section">
          <div class="section-label">GAIN</div>
          <canvas class="rotary-knob" id="gain-knob-${ch.id}" width="56" height="56" data-param="gain" data-min="-18" data-max="18" data-value="${ch.gain}"></canvas>
          <div class="knob-value" id="gain-val-${ch.id}">${ch.gain.toFixed(1)} dB</div>
        </div>
        
        <!-- 4-Band EQ -->
        <div class="channel-section eq-section">
          <div class="section-label">EQ</div>
          <div class="eq-bands">
            ${WING.EQ.bands.map(band => `
              <div class="eq-band" data-band="${band.id}">
                <div class="eq-band-header">
                  <span class="eq-band-label">${band.label}</span>
                  <button class="eq-band-toggle ${ch.eq[band.id].enabled ? 'active' : ''}" data-band="${band.id}" id="eq-toggle-${ch.id}-${band.id}">
                    ${ch.eq[band.id].enabled ? '●' : '○'}
                  </button>
                </div>
                <div class="eq-band-knobs">
                  <div class="eq-knob-group">
                    <canvas class="rotary-knob eq-knob" id="eq-freq-${ch.id}-${band.id}" width="40" height="40"
                      data-param="eq.${band.id}.freq" data-min="${band.freqMin}" data-max="${band.freqMax}" data-value="${ch.eq[band.id].freq}" data-log="true"></canvas>
                    <span class="eq-knob-label">F</span>
                  </div>
                  <div class="eq-knob-group">
                    <canvas class="rotary-knob eq-knob" id="eq-gain-${ch.id}-${band.id}" width="40" height="40"
                      data-param="eq.${band.id}.gain" data-min="-18" data-max="18" data-value="${ch.eq[band.id].gain}"></canvas>
                    <span class="eq-knob-label">G</span>
                  </div>
                  <div class="eq-knob-group">
                    <canvas class="rotary-knob eq-knob" id="eq-q-${ch.id}-${band.id}" width="40" height="40"
                      data-param="eq.${band.id}.q" data-min="0.1" data-max="10" data-value="${ch.eq[band.id].q}" data-step="0.1"></canvas>
                    <span class="eq-knob-label">Q</span>
                  </div>
                </div>
                <div class="eq-band-values" id="eq-values-${ch.id}-${band.id}">
                  ${this._formatFreq(ch.eq[band.id].freq)} | ${ch.eq[band.id].gain > 0 ? '+' : ''}${ch.eq[band.id].gain.toFixed(1)} | Q${ch.eq[band.id].q.toFixed(1)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Gate -->
        <div class="channel-section gate-section">
          <div class="section-header">
            <span class="section-label">GATE</span>
            <label class="section-toggle">
              <input type="checkbox" data-param="gate.enabled" id="gate-toggle-${ch.id}" ${ch.gate.enabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="gate-controls ${ch.gate.enabled ? '' : 'disabled'}" id="gate-controls-${ch.id}">
            <div class="mini-knob-group">
              <canvas class="rotary-knob mini-knob" id="gate-thresh-${ch.id}" width="36" height="36"
                data-param="gate.threshold" data-min="-80" data-max="0" data-value="${ch.gate.threshold}"></canvas>
              <span>Thresh</span>
            </div>
            <div class="mini-knob-group">
              <canvas class="rotary-knob mini-knob" id="gate-attack-${ch.id}" width="36" height="36"
                data-param="gate.attack" data-min="0.1" data-max="100" data-value="${ch.gate.attack}"></canvas>
              <span>Attack</span>
            </div>
            <div class="mini-knob-group">
              <canvas class="rotary-knob mini-knob" id="gate-release-${ch.id}" width="36" height="36"
                data-param="gate.release" data-min="10" data-max="2000" data-value="${ch.gate.release}"></canvas>
              <span>Release</span>
            </div>
          </div>
        </div>
        
        <!-- Compressor -->
        <div class="channel-section comp-section">
          <div class="section-header">
            <span class="section-label">COMP</span>
            <label class="section-toggle">
              <input type="checkbox" data-param="compressor.enabled" id="comp-toggle-${ch.id}" ${ch.compressor.enabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="comp-controls ${ch.compressor.enabled ? '' : 'disabled'}" id="comp-controls-${ch.id}">
            <div class="mini-knob-group">
              <canvas class="rotary-knob mini-knob" id="comp-thresh-${ch.id}" width="36" height="36"
                data-param="compressor.threshold" data-min="-60" data-max="0" data-value="${ch.compressor.threshold}"></canvas>
              <span>Thresh</span>
            </div>
            <div class="mini-knob-group">
              <canvas class="rotary-knob mini-knob" id="comp-ratio-${ch.id}" width="36" height="36"
                data-param="compressor.ratio" data-min="1" data-max="20" data-value="${ch.compressor.ratio}"></canvas>
              <span>Ratio</span>
            </div>
            <div class="mini-knob-group">
              <canvas class="rotary-knob mini-knob" id="comp-attack-${ch.id}" width="36" height="36"
                data-param="compressor.attack" data-min="0.1" data-max="100" data-value="${ch.compressor.attack}"></canvas>
              <span>Attack</span>
            </div>
            <div class="mini-knob-group">
              <canvas class="rotary-knob mini-knob" id="comp-release-${ch.id}" width="36" height="36"
                data-param="compressor.release" data-min="10" data-max="1000" data-value="${ch.compressor.release}"></canvas>
              <span>Release</span>
            </div>
            <div class="mini-knob-group">
              <canvas class="rotary-knob mini-knob" id="comp-makeup-${ch.id}" width="36" height="36"
                data-param="compressor.makeup" data-min="0" data-max="24" data-value="${ch.compressor.makeup}"></canvas>
              <span>Makeup</span>
            </div>
          </div>
          <!-- GR Meter -->
          <div class="gr-meter" id="gr-meter-${ch.id}">
            <div class="gr-meter-label">GR</div>
            <div class="gr-meter-bar-container">
              <div class="gr-meter-bar" id="gr-bar-${ch.id}" style="width: 0%"></div>
            </div>
          </div>
        </div>
        
        <!-- Sends -->
        <div class="channel-section sends-section">
          <div class="section-label">SENDS</div>
          <div class="sends-grid">
            ${Array.from({length: 16}, (_, i) => `
              <div class="send-item" data-bus="${i + 1}">
                <div class="send-label">${i + 1}</div>
                <canvas class="rotary-knob send-knob" id="send-${ch.id}-${i}" width="32" height="32"
                  data-param="sends.${i}.level" data-min="-60" data-max="10" data-value="${ch.sends[i].level}" data-bus="${i}"></canvas>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Pan -->
        <div class="channel-section pan-section">
          <div class="section-label">PAN</div>
          <div class="pan-control">
            <canvas class="rotary-knob" id="pan-knob-${ch.id}" width="48" height="48"
              data-param="pan" data-min="-1" data-max="1" data-value="${ch.pan}" data-step="0.02" data-center="true"></canvas>
            <div class="pan-value" id="pan-val-${ch.id}">${WING.PAN.format(ch.pan)}</div>
          </div>
        </div>
        
        <!-- Fader & Meter -->
        <div class="channel-section fader-section">
          <div class="fader-container">
            <div class="meter-strip" id="meter-strip-${ch.id}">
              <canvas id="meter-canvas-${ch.id}" width="20" height="200"></canvas>
            </div>
            <div class="fader-track" id="fader-track-${ch.id}">
              <div class="fader-fill" id="fader-fill-${ch.id}"></div>
              <div class="fader-thumb" id="fader-thumb-${ch.id}" data-channel="${ch.id}"></div>
            </div>
            <div class="fader-scale">
              ${[10,5,0,-5,-10,-20,-40,-60].map(db => `
                <div class="fader-scale-mark" style="bottom: ${(WING.FADER.dbToPos(db) * 100)}%">${WING.FADER.formatDb(db)}</div>
              `).join('')}
            </div>
          </div>
          <div class="fader-value" id="fader-val-${ch.id}">${WING.FADER.formatDb(ch.fader)}</div>
        </div>
        
        <!-- Mute -->
        <div class="channel-section mute-section">
          <button class="mute-btn ${ch.mute ? 'muted' : ''}" id="mute-btn-${ch.id}" data-channel="${ch.id}">
            ${ch.mute ? 'MUTE' : 'MUTE'}
          </button>
        </div>
      </div>
    `;
  }

  _initControls() {
    const ch = this.channel;
    
    // Initialize all rotary knobs
    document.querySelectorAll(`#${this.containerId} .rotary-knob`).forEach(canvas => {
      this._initKnob(canvas);
    });
    
    // EQ band toggles
    WING.EQ.bands.forEach(band => {
      const btn = document.getElementById(`eq-toggle-${ch.id}-${band.id}`);
      if (btn) {
        btn.addEventListener('click', () => {
          const current = ch.eq[band.id].enabled;
          ch.eq[band.id].enabled = !current;
          btn.textContent = !current ? '●' : '○';
          btn.classList.toggle('active', !current);
          wingState.emit('channelUpdated', { id: ch.id, path: `eq.${band.id}.enabled`, value: !current, channel: ch });
        });
      }
    });
    
    // Gate toggle
    const gateToggle = document.getElementById(`gate-toggle-${ch.id}`);
    if (gateToggle) {
      gateToggle.addEventListener('change', (e) => {
        ch.gate.enabled = e.target.checked;
        const controls = document.getElementById(`gate-controls-${ch.id}`);
        if (controls) controls.classList.toggle('disabled', !e.target.checked);
      });
    }
    
    // Compressor toggle
    const compToggle = document.getElementById(`comp-toggle-${ch.id}`);
    if (compToggle) {
      compToggle.addEventListener('change', (e) => {
        ch.compressor.enabled = e.target.checked;
        const controls = document.getElementById(`comp-controls-${ch.id}`);
        if (controls) controls.classList.toggle('disabled', !e.target.checked);
      });
    }
    
    // Color select
    const colorSelect = document.getElementById(`color-select-${ch.id}`);
    if (colorSelect) {
      colorSelect.addEventListener('change', (e) => {
        ch.color = e.target.value;
        const header = document.querySelector(`[data-channel="${ch.id}"] .channel-header`);
        if (header) header.style.background = WING.COLORS[ch.color];
      });
    }
    
    // Mute button
    const muteBtn = document.getElementById(`mute-btn-${ch.id}`);
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        ch.mute = !ch.mute;
        muteBtn.classList.toggle('muted', ch.mute);
      });
    }
    
    // Fader drag
    this._initFader();
  }

  _initKnob(canvas) {
    const ctx = canvas.getContext('2d');
    const min = parseFloat(canvas.dataset.min);
    const max = parseFloat(canvas.dataset.max);
    let value = parseFloat(canvas.dataset.value);
    const step = parseFloat(canvas.dataset.step) || ((max - min) <= 1 ? 0.01 : (max - min) <= 20 ? 0.5 : 1);
    const isLog = canvas.dataset.log === 'true';
    const isCenter = canvas.dataset.center === 'true';
    
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2 + 2;
      const r = Math.min(w, h) / 2 - 6;
      const startAngle = 0.75 * Math.PI;
      const endAngle = 0.25 * Math.PI;
      const totalAngle = 1.5 * Math.PI;
      
      ctx.clearRect(0, 0, w, h);
      
      // Track background
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + totalAngle, false);
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = isCenter ? 3 : 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Center mark for pan knobs
      if (isCenter) {
        const centerAngle = startAngle + totalAngle * 0.5;
        const mx = cx + Math.cos(centerAngle) * (r + 4);
        const my = cy + Math.sin(centerAngle) * (r + 4);
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#555';
        ctx.fill();
      }
      
      // Value arc
      const norm = (value - min) / (max - min);
      const valueAngle = startAngle + norm * totalAngle;
      
      let arcColor;
      if (isCenter) {
        arcColor = norm < 0.48 ? '#3498db' : norm > 0.52 ? '#e74c3c' : '#2ecc71';
      } else {
        arcColor = '#00d4ff';
      }
      
      ctx.beginPath();
      if (isCenter) {
        // Draw from center outward
        const centerAngle = startAngle + totalAngle * 0.5;
        if (norm < 0.5) {
          ctx.arc(cx, cy, r, valueAngle, centerAngle, false);
        } else {
          ctx.arc(cx, cy, r, centerAngle, valueAngle, false);
        }
      } else {
        ctx.arc(cx, cy, r, startAngle, valueAngle, false);
      }
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = isCenter ? 3 : 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Pointer
      const px = cx + Math.cos(valueAngle) * (r - 2);
      const py = cy + Math.sin(valueAngle) * (r - 2);
      ctx.beginPath();
      ctx.arc(px, py, isCenter ? 2 : 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      
      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
    };
    
    draw();
    
    // Interaction
    let dragStartY = 0;
    let dragStartValue = 0;
    
    const onStart = (clientY) => {
      dragStartY = clientY;
      dragStartValue = value;
      canvas.classList.add('knob-active');
    };
    
    const onMove = (clientY) => {
      const delta = (dragStartY - clientY) * step * 0.3;
      value = Math.max(min, Math.min(max, dragStartValue + delta));
      canvas.dataset.value = value;
      
      draw();
      this._onKnobChange(canvas.dataset.param, value, canvas);
    };
    
    const onEnd = () => {
      canvas.classList.remove('knob-active');
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      document.removeEventListener('touchmove', touchMoveHandler);
      document.removeEventListener('touchend', endHandler);
    };
    
    const mouseMoveHandler = (e) => onMove(e.clientY);
    const mouseUpHandler = onEnd;
    const touchMoveHandler = (e) => { e.preventDefault(); onMove(e.touches[0].clientY); };
    const endHandler = onEnd;
    
    canvas.addEventListener('mousedown', (e) => {
      onStart(e.clientY);
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    });
    
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onStart(e.touches[0].clientY);
      document.addEventListener('touchmove', touchMoveHandler, { passive: false });
      document.addEventListener('touchend', endHandler);
    }, { passive: false });
    
    // Double-click to reset
    canvas.addEventListener('dblclick', () => {
      const defaultVal = isCenter ? 0 : (canvas.dataset.default ? parseFloat(canvas.dataset.default) : min);
      value = defaultVal;
      canvas.dataset.value = value;
      draw();
      this._onKnobChange(canvas.dataset.param, value, canvas);
    });
    
    this.knobElements.set(canvas.id, { canvas, draw, getValue: () => value });
  }

  _onKnobChange(param, value, canvas) {
    if (!param) return;
    
    const ch = this.channel;
    const parts = param.split('.');
    let obj = ch;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] !== undefined) obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    
    // Update display values
    if (param === 'gain') {
      const valEl = document.getElementById(`gain-val-${ch.id}`);
      if (valEl) valEl.textContent = value.toFixed(1) + ' dB';
    }
    if (param === 'pan') {
      const valEl = document.getElementById(`pan-val-${ch.id}`);
      if (valEl) valEl.textContent = WING.PAN.format(value);
    }
    
    // Update EQ band values
    if (param.startsWith('eq.')) {
      const bandId = parts[1];
      const valEl = document.getElementById(`eq-values-${ch.id}-${bandId}`);
      if (valEl && ch.eq[bandId]) {
        valEl.textContent = `${this._formatFreq(ch.eq[bandId].freq)} | ${ch.eq[bandId].gain > 0 ? '+' : ''}${ch.eq[bandId].gain.toFixed(1)} | Q${ch.eq[bandId].q.toFixed(1)}`;
      }
    }
    
    wingState.emit('channelUpdated', { id: ch.id, path: param, value, channel: ch });
  }

  _initFader() {
    const track = document.getElementById(`fader-track-${this.channel.id}`);
    const thumb = document.getElementById(`fader-thumb-${this.channel.id}`);
    const fill = document.getElementById(`fader-fill-${this.channel.id}`);
    const valDisplay = document.getElementById(`fader-val-${this.channel.id}`);
    
    if (!track || !thumb) return;
    
    let dragging = false;
    
    const updateFader = (clientY) => {
      const rect = track.getBoundingClientRect();
      let pos = 1 - (clientY - rect.top) / rect.height;
      pos = Math.max(0, Math.min(1, pos));
      
      const db = WING.FADER.posToDb(pos);
      this.channel.fader = db;
      
      thumb.style.bottom = (pos * 100) + '%';
      fill.style.height = (pos * 100) + '%';
      if (valDisplay) valDisplay.textContent = WING.FADER.formatDb(db);
    };
    
    const mouseMove = (e) => { if (dragging) updateFader(e.clientY); };
    const touchMove = (e) => { if (dragging) { e.preventDefault(); updateFader(e.touches[0].clientY); } };
    const endDrag = () => {
      dragging = false;
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', endDrag);
    };
    
    thumb.addEventListener('mousedown', (e) => {
      dragging = true;
      e.preventDefault();
      document.addEventListener('mousemove', mouseMove);
      document.addEventListener('mouseup', endDrag);
    });
    
    thumb.addEventListener('touchstart', (e) => {
      dragging = true;
      e.preventDefault();
      document.addEventListener('touchmove', touchMove, { passive: false });
      document.addEventListener('touchend', endDrag);
    }, { passive: false });
    
    // Click on track
    track.addEventListener('click', (e) => {
      if (e.target === thumb) return;
      updateFader(e.clientY);
    });
    
    // Double-click to reset to 0dB
    thumb.addEventListener('dblclick', () => {
      const pos = WING.FADER.dbToPos(0);
      this.channel.fader = 0;
      thumb.style.bottom = (pos * 100) + '%';
      fill.style.height = (pos * 100) + '%';
      if (valDisplay) valDisplay.textContent = WING.FADER.formatDb(0);
    });
    
    // Set initial position
    const initPos = WING.FADER.dbToPos(this.channel.fader);
    thumb.style.bottom = (initPos * 100) + '%';
    fill.style.height = (initPos * 100) + '%';
  }

  _startMeterSimulation() {
    const canvas = document.getElementById(`meter-canvas-${this.channel.id}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    let level = -60;
    let peak = -60;
    let peakHold = 0;
    
    const drawMeter = () => {
      if (!this.channel.mute) {
        // Simulate level based on fader position
        const baseLevel = this.channel.fader - 12 + (Math.random() * 6 - 3);
        level += (baseLevel - level) * 0.3;
      } else {
        level = -Infinity;
      }
      
      // Peak tracking
      if (level > peak) {
        peak = level;
        peakHold = 30;
      } else {
        if (peakHold > 0) peakHold--;
        else peak = Math.max(level, peak - 0.5);
      }
      
      // GR meter simulation
      if (this.channel.compressor.enabled) {
        const overDb = this.channel.fader + this.channel.gain - this.channel.compressor.threshold;
        const gr = overDb > 0 ? overDb * (1 - 1 / this.channel.compressor.ratio) : 0;
        const grBar = document.getElementById(`gr-bar-${this.channel.id}`);
        if (grBar) grBar.style.width = Math.min(100, gr * 5) + '%';
      }
      
      ctx.clearRect(0, 0, w, h);
      
      // Background
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, w, h);
      
      // Meter segments
      const segH = 2;
      const numSegs = Math.floor(h / (segH + 1));
      
      for (let i = 0; i < numSegs; i++) {
        const segDb = -60 + (i / numSegs) * 70;
        const y = h - (i + 1) * (segH + 1);
        
        if (segDb <= level) {
          if (segDb > 6) ctx.fillStyle = '#ff0000';
          else if (segDb > 0) ctx.fillStyle = '#ff6600';
          else if (segDb > -10) ctx.fillStyle = '#ffcc00';
          else ctx.fillStyle = '#00cc44';
          ctx.fillRect(2, y, w - 4, segH);
        }
      }
      
      // Peak indicator
      if (peak > -60) {
        const peakY = h - ((peak + 60) / 70) * h;
        ctx.fillStyle = peak > 0 ? '#ff0000' : '#ffffff';
        ctx.fillRect(2, peakY, w - 4, 2);
      }
      
      this.meterAnimation = requestAnimationFrame(drawMeter);
    };
    
    drawMeter();
  }

  _formatFreq(freq) {
    if (freq >= 1000) return (freq / 1000).toFixed(freq >= 10000 ? 0 : 1) + 'k';
    return Math.round(freq).toString();
  }

  destroy() {
    if (this.meterAnimation) {
      cancelAnimationFrame(this.meterAnimation);
    }
  }

  // Refresh display from channel state
  refresh() {
    this._render();
    this._initControls();
    this._startMeterSimulation();
  }
}