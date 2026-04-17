/**
 * EQ Visualizer - SVG-based parametric EQ curve rendering
 * Draws frequency response curve based on 4-band EQ parameters
 */

class EQVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.svgNS = 'http://www.w3.org/2000/svg';
    this.width = 0;
    this.height = 0;
    this.padding = { top: 20, right: 20, bottom: 30, left: 40 };
    
    // Grid parameters
    this.freqMin = 20;
    this.freqMax = 20000;
    this.dbMin = -18;
    this.dbMax = 18;
    
    // Interaction
    this.dragging = null; // { band, param }
    this.onParamChange = null; // callback(band, param, value)
    
    this._initSVG();
    this._drawGrid();
    
    // Resize observer
    this._resizeObserver = new ResizeObserver(() => {
      this._updateSize();
      this._drawGrid();
      if (this.lastEqState) this.drawCurve(this.lastEqState);
    });
    this._resizeObserver.observe(this.container);
  }

  _initSVG() {
    this.svg = document.createElementNS(this.svgNS, 'svg');
    this.svg.setAttribute('class', 'eq-visualizer-svg');
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    
    // Defs for gradient
    const defs = document.createElementNS(this.svgNS, 'defs');
    const gradient = document.createElementNS(this.svgNS, 'linearGradient');
    gradient.setAttribute('id', 'eqCurveGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS(this.svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#00d4ff');
    stop1.setAttribute('stop-opacity', '0.3');
    const stop2 = document.createElementNS(this.svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#00d4ff');
    stop2.setAttribute('stop-opacity', '0.0');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    this.svg.appendChild(defs);
    
    this.container.appendChild(this.svg);
    this._updateSize();
    
    // Event listeners for interaction
    this.svg.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.svg.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.svg.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.svg.addEventListener('mouseleave', (e) => this._onMouseUp(e));
    // Touch
    this.svg.addEventListener('touchstart', (e) => { e.preventDefault(); this._onTouchStart(e); }, { passive: false });
    this.svg.addEventListener('touchmove', (e) => { e.preventDefault(); this._onTouchMove(e); }, { passive: false });
    this.svg.addEventListener('touchend', (e) => this._onMouseUp(e));
  }

  _updateSize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
  }

  _freqToX(freq) {
    const norm = Math.log10(freq / this.freqMin) / Math.log10(this.freqMax / this.freqMin);
    return this.padding.left + norm * (this.width - this.padding.left - this.padding.right);
  }

  _dbToY(db) {
    const norm = (db - this.dbMin) / (this.dbMax - this.dbMin);
    return this.padding.top + (1 - norm) * (this.height - this.padding.top - this.padding.bottom);
  }

  _xToFreq(x) {
    const norm = (x - this.padding.left) / (this.width - this.padding.left - this.padding.right);
    return this.freqMin * Math.pow(this.freqMax / this.freqMin, norm);
  }

  _yToDb(y) {
    const norm = 1 - (y - this.padding.top) / (this.height - this.padding.top - this.padding.bottom);
    return this.dbMin + norm * (this.dbMax - this.dbMin);
  }

  _drawGrid() {
    // Clear existing grid elements
    const existing = this.svg.querySelectorAll('.grid-element');
    existing.forEach(el => el.remove());
    
    const plotW = this.width - this.padding.left - this.padding.right;
    const plotH = this.height - this.padding.top - this.padding.bottom;
    
    // Background
    const bg = document.createElementNS(this.svgNS, 'rect');
    bg.setAttribute('class', 'grid-element');
    bg.setAttribute('x', this.padding.left);
    bg.setAttribute('y', this.padding.top);
    bg.setAttribute('width', plotW);
    bg.setAttribute('height', plotH);
    bg.setAttribute('fill', '#0a0a12');
    bg.setAttribute('rx', '4');
    this.svg.appendChild(bg);
    
    // Frequency gridlines (standard audio frequencies)
    const freqLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    const freqLabels = ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k'];
    
    freqLines.forEach((freq, i) => {
      const x = this._freqToX(freq);
      const line = document.createElementNS(this.svgNS, 'line');
      line.setAttribute('class', 'grid-element');
      line.setAttribute('x1', x);
      line.setAttribute('y1', this.padding.top);
      line.setAttribute('x2', x);
      line.setAttribute('y2', this.height - this.padding.bottom);
      line.setAttribute('stroke', freq === 1000 ? '#334' : '#1a1a2e');
      line.setAttribute('stroke-width', freq === 1000 ? '1.5' : '0.5');
      this.svg.appendChild(line);
      
      const label = document.createElementNS(this.svgNS, 'text');
      label.setAttribute('class', 'grid-element');
      label.setAttribute('x', x);
      label.setAttribute('y', this.height - this.padding.bottom + 16);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', '#667');
      label.setAttribute('font-size', '10');
      label.textContent = freqLabels[i];
      this.svg.appendChild(label);
    });
    
    // dB gridlines
    for (let db = this.dbMin; db <= this.dbMax; db += 6) {
      const y = this._dbToY(db);
      const line = document.createElementNS(this.svgNS, 'line');
      line.setAttribute('class', 'grid-element');
      line.setAttribute('x1', this.padding.left);
      line.setAttribute('y1', y);
      line.setAttribute('x2', this.width - this.padding.right);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', db === 0 ? '#334' : '#1a1a2e');
      line.setAttribute('stroke-width', db === 0 ? '1.5' : '0.5');
      this.svg.appendChild(line);
      
      const label = document.createElementNS(this.svgNS, 'text');
      label.setAttribute('class', 'grid-element');
      label.setAttribute('x', this.padding.left - 6);
      label.setAttribute('y', y + 4);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', '#667');
      label.setAttribute('font-size', '10');
      label.textContent = (db > 0 ? '+' : '') + db;
      this.svg.appendChild(label);
    }
    
    // Band control dots group
    this.dotsGroup = document.createElementNS(this.svgNS, 'g');
    this.dotsGroup.setAttribute('class', 'grid-element eq-dots');
    this.svg.appendChild(this.dotsGroup);
    
    // Curve group (rendered above grid, below dots)
    this.curveGroup = document.createElementNS(this.svgNS, 'g');
    this.curveGroup.setAttribute('class', 'grid-element eq-curve');
    this.svg.insertBefore(this.curveGroup, this.dotsGroup);
  }

  // Calculate frequency response at a given frequency for all bands combined
  _calcResponse(freq, eqState) {
    let totalGainDb = 0;
    
    for (const bandId of ['low', 'lowmid', 'highmid', 'high']) {
      const band = eqState[bandId];
      if (!band || !band.enabled) continue;
      
      const bandDef = WING.EQ.bands.find(b => b.id === bandId);
      const gain = band.gain;
      const centerFreq = band.freq;
      const Q = band.q;
      
      if (bandDef.type === 'bell') {
        // Parametric bell
        const ratio = freq / centerFreq;
        const bw = 1 / (2 * Q);
        const x = Math.log2(ratio) / bw;
        totalGainDb += gain * Math.exp(-0.5 * x * x);
      } else {
        // Shelf (simplified 2nd order)
        const ratio = freq / centerFreq;
        const x = Math.log2(Math.abs(ratio));
        const slope = 2 * Q;
        if (bandId === 'low') {
          totalGainDb += gain / (1 + Math.exp(slope * x));
        } else {
          totalGainDb += gain / (1 + Math.exp(-slope * x));
        }
      }
    }
    
    return Math.max(this.dbMin, Math.min(this.dbMax, totalGainDb));
  }

  drawCurve(eqState) {
    this.lastEqState = eqState;
    
    // Clear curve
    while (this.curveGroup.firstChild) this.curveGroup.removeChild(this.curveGroup.firstChild);
    while (this.dotsGroup.firstChild) this.dotsGroup.removeChild(this.dotsGroup.firstChild);
    
    if (!eqState) return;
    
    const numPoints = 256;
    const points = [];
    
    for (let i = 0; i < numPoints; i++) {
      const norm = i / (numPoints - 1);
      const freq = this.freqMin * Math.pow(this.freqMax / this.freqMin, norm);
      const db = this._calcResponse(freq, eqState);
      points.push({ x: this._freqToX(freq), y: this._dbToY(db) });
    }
    
    // Draw filled area
    const areaPath = document.createElementNS(this.svgNS, 'path');
    let areaD = `M ${points[0].x} ${this._dbToY(0)}`;
    points.forEach(p => areaD += ` L ${p.x} ${p.y}`);
    areaD += ` L ${points[points.length-1].x} ${this._dbToY(0)} Z`;
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('fill', 'url(#eqCurveGradient)');
    areaPath.setAttribute('stroke', 'none');
    this.curveGroup.appendChild(areaPath);
    
    // Draw curve line
    const linePath = document.createElementNS(this.svgNS, 'path');
    let lineD = `M ${points[0].x} ${points[0].y}`;
    // Smooth with cubic bezier
    for (let i = 1; i < points.length; i++) {
      const prev = points[i-1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      lineD += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    linePath.setAttribute('d', lineD);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', '#00d4ff');
    linePath.setAttribute('stroke-width', '2');
    linePath.setAttribute('stroke-linecap', 'round');
    this.curveGroup.appendChild(linePath);
    
    // Draw individual band responses (thin lines)
    const bandColors = { low: '#ff6b6b', lowmid: '#ffa94d', highmid: '#69db7c', high: '#74c0fc' };
    for (const bandId of ['low', 'lowmid', 'highmid', 'high']) {
      const band = eqState[bandId];
      if (!band || !band.enabled || Math.abs(band.gain) < 0.5) continue;
      
      const bandPoints = [];
      for (let i = 0; i < numPoints; i++) {
        const norm = i / (numPoints - 1);
        const freq = this.freqMin * Math.pow(this.freqMax / this.freqMin, norm);
        const singleEq = { ...eqState };
        // Zero out other bands
        for (const b of ['low', 'lowmid', 'highmid', 'high']) {
          if (b !== bandId) singleEq[b] = { ...singleEq[b], gain: 0 };
        }
        const db = this._calcResponse(freq, singleEq);
        bandPoints.push({ x: this._freqToX(freq), y: this._dbToY(db) });
      }
      
      const bandPath = document.createElementNS(this.svgNS, 'path');
      let bandD = `M ${bandPoints[0].x} ${bandPoints[0].y}`;
      for (let i = 1; i < bandPoints.length; i++) {
        const prev = bandPoints[i-1];
        const curr = bandPoints[i];
        const cpx = (prev.x + curr.x) / 2;
        bandD += ` C ${cpx} ${prev.y} ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
      }
      bandPath.setAttribute('d', bandD);
      bandPath.setAttribute('fill', 'none');
      bandPath.setAttribute('stroke', bandColors[bandId]);
      bandPath.setAttribute('stroke-width', '1');
      bandPath.setAttribute('stroke-opacity', '0.5');
      bandPath.setAttribute('stroke-dasharray', '4 2');
      this.curveGroup.appendChild(bandPath);
    }
    
    // Draw control dots
    const dotRadius = 8;
    for (const bandId of ['low', 'lowmid', 'highmid', 'high']) {
      const band = eqState[bandId];
      if (!band || !band.enabled) continue;
      
      const x = this._freqToX(band.freq);
      const y = this._dbToY(band.gain);
      
      // Outer circle
      const outer = document.createElementNS(this.svgNS, 'circle');
      outer.setAttribute('cx', x);
      outer.setAttribute('cy', y);
      outer.setAttribute('r', dotRadius);
      outer.setAttribute('fill', bandColors[bandId]);
      outer.setAttribute('fill-opacity', '0.3');
      outer.setAttribute('stroke', bandColors[bandId]);
      outer.setAttribute('stroke-width', '2');
      outer.setAttribute('class', `eq-dot eq-dot-${bandId}`);
      outer.setAttribute('data-band', bandId);
      outer.style.cursor = 'pointer';
      this.dotsGroup.appendChild(outer);
      
      // Inner dot
      const inner = document.createElementNS(this.svgNS, 'circle');
      inner.setAttribute('cx', x);
      inner.setAttribute('cy', y);
      inner.setAttribute('r', 3);
      inner.setAttribute('fill', bandColors[bandId]);
      inner.setAttribute('class', `eq-dot-inner eq-dot-${bandId}`);
      inner.setAttribute('data-band', bandId);
      this.dotsGroup.appendChild(inner);
      
      // Frequency label
      const freqLabel = document.createElementNS(this.svgNS, 'text');
      freqLabel.setAttribute('x', x);
      freqLabel.setAttribute('y', y - dotRadius - 4);
      freqLabel.setAttribute('text-anchor', 'middle');
      freqLabel.setAttribute('fill', bandColors[bandId]);
      freqLabel.setAttribute('font-size', '9');
      freqLabel.setAttribute('font-weight', 'bold');
      freqLabel.setAttribute('class', 'grid-element');
      freqLabel.textContent = this._formatFreq(band.freq);
      this.dotsGroup.appendChild(freqLabel);
    }
  }

  _formatFreq(freq) {
    if (freq >= 1000) return (freq / 1000).toFixed(freq >= 10000 ? 0 : 1) + 'k';
    return Math.round(freq).toString();
  }

  // Mouse interaction on EQ graph
  _getMousePos(e) {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  _findNearestDot(pos) {
    let nearest = null;
    let minDist = 20; // min pixel distance to grab
    
    if (!this.lastEqState) return null;
    
    for (const bandId of ['low', 'lowmid', 'highmid', 'high']) {
      const band = this.lastEqState[bandId];
      if (!band || !band.enabled) continue;
      
      const x = this._freqToX(band.freq);
      const y = this._dbToY(band.gain);
      const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = { band: bandId, x, y };
      }
    }
    return nearest;
  }

  _onMouseDown(e) {
    const pos = this._getMousePos(e);
    const dot = this._findNearestDot(pos);
    if (dot) {
      this.dragging = dot;
      this.svg.style.cursor = 'grabbing';
    }
  }

  _onTouchStart(e) {
    const touch = e.touches[0];
    const pos = this._getMousePos(touch);
    const dot = this._findNearestDot(pos);
    if (dot) {
      this.dragging = dot;
    }
  }

  _onMouseMove(e) {
    if (!this.dragging) {
      const pos = this._getMousePos(e);
      const dot = this._findNearestDot(pos);
      this.svg.style.cursor = dot ? 'grab' : 'default';
      return;
    }
    const pos = this._getMousePos(e);
    this._applyDrag(pos);
  }

  _onTouchMove(e) {
    if (!this.dragging) return;
    const touch = e.touches[0];
    const pos = this._getMousePos(touch);
    this._applyDrag(pos);
  }

  _applyDrag(pos) {
    const freq = this._xToFreq(pos.x);
    const gain = this._yToDb(pos.y);
    
    const clampedFreq = Math.max(20, Math.min(20000, freq));
    const clampedGain = Math.max(-18, Math.min(18, gain));
    
    if (this.onParamChange) {
      this.onParamChange(this.dragging.band, 'freq', clampedFreq);
      this.onParamChange(this.dragging.band, 'gain', clampedGain);
    }
  }

  _onMouseUp() {
    this.dragging = null;
    this.svg.style.cursor = 'default';
  }
}