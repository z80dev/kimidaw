/**
 * Operator AudioWorklet Processor
 * 
 * Realtime-safe FM synthesis processor that runs in the AudioWorklet thread.
 * Implements the same 8-operator FM synthesis algorithm as the main Operator
 * but optimized for the AudioWorklet environment.
 * 
 * @class OperatorProcessor
 * @extends AudioWorkletProcessor
 */

// Type declarations for AudioWorkletGlobalScope
declare const sampleRate: number;
interface AudioWorkletProcessor {
  port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}
declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (): AudioWorkletProcessor;
};
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;

// =============================================================================
// Realtime-Safe FM Operator
// =============================================================================

interface OperatorConfig {
  enabled: number; // 0 or 1
  coarse: number;
  fine: number;
  fixedMode: number; // 0 = ratio, 1 = fixed
  waveform: number; // 0=sine, 1=saw, 2=square, 3=triangle, 4=noise, 5=pulse
  level: number;
  attack: number; // in samples
  decay: number; // in samples
  sustain: number; // 0-1
  release: number; // in samples
  velocitySens: number;
}

const enum Waveform {
  SINE = 0,
  SAW = 1,
  SQUARE = 2,
  TRIANGLE = 3,
  NOISE = 4,
  PULSE = 5,
}

const enum EnvelopePhase {
  IDLE = 0,
  ATTACK = 1,
  DECAY = 2,
  SUSTAIN = 3,
  RELEASE = 4,
}

/** Realtime-safe FM operator for AudioWorklet */
class WorkletFMOperator {
  // Phase accumulator
  private _phase = 0;
  
  // Envelope state
  private _envPhase: EnvelopePhase = EnvelopePhase.IDLE;
  private _envLevel = 0;
  
  // Frequency
  private _baseFreq = 440;
  private _currentFreq = 440;
  private _note = 60;
  
  // Configuration (copied for local access)
  private _config: OperatorConfig = {
    enabled: 1,
    coarse: 1,
    fine: 0,
    fixedMode: 0,
    waveform: 0,
    level: 0.5,
    attack: 48, // 1ms at 48kHz
    decay: 9600, // 200ms
    sustain: 0.8,
    release: 14400, // 300ms
    velocitySens: 0.5,
  };
  
  // Runtime state
  private _velocity = 127;
  private _attackInc = 0;
  private _decayCoeff = 0;
  private _releaseCoeff = 0;
  private _noiseSeed = 12345;
  
  configure(config: Partial<OperatorConfig>): void {
    this._config = { ...this._config, ...config };
    this._recalculateEnvelope();
  }
  
  setFrequency(baseFreq: number, note: number): void {
    this._baseFreq = baseFreq;
    this._note = note;
    this._updateFrequency();
  }
  
  trigger(velocity: number): void {
    this._velocity = velocity;
    this._envPhase = EnvelopePhase.ATTACK;
    this._envLevel = 0;
    this._phase = 0;
  }
  
  release(): void {
    if (this._envPhase !== EnvelopePhase.IDLE) {
      this._envPhase = EnvelopePhase.RELEASE;
    }
  }
  
  stop(): void {
    this._envPhase = EnvelopePhase.IDLE;
    this._envLevel = 0;
  }
  
  process(modulation: number): number {
    if (!this._config.enabled) return 0;
    
    // Process envelope
    this._processEnvelope();
    
    // Calculate phase increment with modulation
    const freq = this._currentFreq * (1 + modulation);
    const phaseInc = freq / sampleRate;
    
    this._phase += phaseInc;
    while (this._phase >= 1) this._phase -= 1;
    
    // Generate waveform
    const rawOutput = this._generateWaveform();
    
    // Apply envelope and velocity
    const velScale = 0.3 + (this._velocity / 127) * 0.7 * this._config.velocitySens;
    return rawOutput * this._envLevel * velScale * this._config.level;
  }
  
  get level(): number {
    return this._envLevel;
  }
  
  get isActive(): boolean {
    return this._envPhase !== EnvelopePhase.IDLE;
  }
  
  private _updateFrequency(): void {
    if (this._config.fixedMode > 0) {
      this._currentFreq = this._config.coarse;
    } else {
      const ratio = this._config.coarse;
      const fineRatio = Math.pow(2, this._config.fine / 1200);
      this._currentFreq = this._baseFreq * ratio * fineRatio;
    }
  }
  
  private _recalculateEnvelope(): void {
    // Convert times from ms to samples at current sample rate
    const sr = sampleRate;
    const attackMs = this._config.attack;
    const decayMs = this._config.decay;
    const releaseMs = this._config.release;
    
    this._attackInc = 1 / Math.max(1, attackMs * sr / 1000);
    this._decayCoeff = Math.exp(-5 / Math.max(1, decayMs * sr / 1000));
    this._releaseCoeff = Math.exp(-5 / Math.max(1, releaseMs * sr / 1000));
  }
  
  private _processEnvelope(): void {
    switch (this._envPhase) {
      case EnvelopePhase.ATTACK:
        this._envLevel += this._attackInc;
        if (this._envLevel >= 1) {
          this._envLevel = 1;
          this._envPhase = EnvelopePhase.DECAY;
        }
        break;
        
      case EnvelopePhase.DECAY:
        this._envLevel = this._config.sustain + (this._envLevel - this._config.sustain) * this._decayCoeff;
        if (Math.abs(this._envLevel - this._config.sustain) < 0.001) {
          this._envLevel = this._config.sustain;
          this._envPhase = EnvelopePhase.SUSTAIN;
        }
        break;
        
      case EnvelopePhase.SUSTAIN:
        this._envLevel = this._config.sustain;
        break;
        
      case EnvelopePhase.RELEASE:
        this._envLevel *= this._releaseCoeff;
        if (this._envLevel < 0.0001) {
          this._envLevel = 0;
          this._envPhase = EnvelopePhase.IDLE;
        }
        break;
    }
  }
  
  private _generateWaveform(): number {
    const phase = this._phase;
    
    switch (this._config.waveform) {
      case Waveform.SINE:
        return Math.sin(phase * 2 * Math.PI);
        
      case Waveform.SAW:
        return 2 * phase - 1;
        
      case Waveform.SQUARE:
        return phase < 0.5 ? 1 : -1;
        
      case Waveform.TRIANGLE:
        return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
        
      case Waveform.PULSE:
        return phase < 0.25 ? 1 : -1;
        
      case Waveform.NOISE:
        // Linear congruential generator for deterministic noise
        this._noiseSeed = (this._noiseSeed * 1664525 + 1013904223) >>> 0;
        return (this._noiseSeed / 0x7fffffff) * 2 - 1;
        
      default:
        return Math.sin(phase * 2 * Math.PI);
    }
  }
}

// =============================================================================
// Biquad Filter (Worklet)
// =============================================================================

class WorkletBiquadFilter {
  private _b0 = 1;
  private _b1 = 0;
  private _b2 = 0;
  private _a1 = 0;
  private _a2 = 0;
  private _z1 = 0;
  private _z2 = 0;
  private _sampleRate = 48000;
  
  setSampleRate(sr: number): void {
    this._sampleRate = sr;
  }
  
  setLowpass(freq: number, q: number): void {
    const w0 = 2 * Math.PI * freq / this._sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * q);
    
    this._b0 = (1 - cosw0) / 2;
    this._b1 = 1 - cosw0;
    this._b2 = (1 - cosw0) / 2;
    const a0 = 1 + alpha;
    this._a1 = -2 * cosw0 / a0;
    this._a2 = (1 - alpha) / a0;
    this._b0 /= a0;
    this._b1 /= a0;
    this._b2 /= a0;
  }
  
  process(input: number): number {
    const output = this._b0 * input + this._b1 * this._z1 + this._b2 * this._z2
                 - this._a1 * this._z1 - this._a2 * this._z2;
    
    this._z2 = this._z1;
    this._z1 = output;
    
    return output;
  }
  
  reset(): void {
    this._z1 = 0;
    this._z2 = 0;
  }
}

// =============================================================================
// FM Voice (Worklet)
// =============================================================================

class WorkletFMVoice {
  private _operators: WorkletFMOperator[] = [];
  private _filter: WorkletBiquadFilter;
  
  // State
  public note = 0;
  public velocity = 0;
  public active = false;
  public age = 0;
  
  private _baseFreq = 440;
  private _algorithm = 7;
  private _feedback = 0;
  private _feedbackState = 0;
  
  // Algorithm connections (pre-computed)
  private _connections: number[][] = [];
  private _carriers: number[] = [];
  
  // Filter
  private _filterFreq = 20000;
  private _filterRes = 0.707;
  
  constructor() {
    // Create operators
    for (let i = 0; i < 8; i++) {
      this._operators.push(new WorkletFMOperator());
    }
    
    // Create filter
    this._filter = new WorkletBiquadFilter();
    this._filter.setSampleRate(sampleRate);
    this._filter.setLowpass(20000, 0.707);
    
    // Initialize algorithm
    this._updateAlgorithm(7);
  }
  
  configure(
    opConfigs: OperatorConfig[],
    algorithm: number,
    feedback: number,
    filterFreq: number,
    filterRes: number
  ): void {
    this._algorithm = algorithm;
    this._feedback = feedback;
    this._filterFreq = filterFreq;
    this._filterRes = 0.5 + filterRes / 100 * 9.5;
    
    for (let i = 0; i < 8; i++) {
      this._operators[i].configure(opConfigs[i]);
    }
    
    this._updateAlgorithm(algorithm);
  }
  
  trigger(note: number, velocity: number): void {
    this.note = note;
    this.velocity = velocity;
    this.active = true;
    this.age = 0;
    this._feedbackState = 0;
    
    this._baseFreq = 440 * Math.pow(2, (note - 69) / 12);
    
    for (let i = 0; i < 8; i++) {
      this._operators[i].setFrequency(this._baseFreq, note);
      this._operators[i].trigger(velocity);
    }
    
    this._filter.reset();
  }
  
  release(): void {
    for (const op of this._operators) {
      op.release();
    }
  }
  
  stop(): void {
    for (const op of this._operators) {
      op.stop();
    }
    this.active = false;
  }
  
  isFinished(): boolean {
    return !this._operators.some(op => op.isActive);
  }
  
  process(): number {
    if (!this.active) return 0;
    
    if (this.isFinished()) {
      this.active = false;
      return 0;
    }
    
    const opOutputs = new Float32Array(8);
    
    // Process operators according to algorithm
    for (let opIdx = 0; opIdx < 8; opIdx++) {
      // Calculate modulation
      let modulation = 0;
      for (let i = 0; i < this._connections.length; i++) {
        const [from, to] = this._connections[i];
        if (to === opIdx) {
          modulation += opOutputs[from] * 2;
        }
      }
      
      // Feedback
      if (opIdx === 0) {
        modulation += this._feedbackState * this._feedback / 100;
      }
      
      opOutputs[opIdx] = this._operators[opIdx].process(modulation);
    }
    
    // Update feedback state
    if (this._carriers.length > 0) {
      this._feedbackState = opOutputs[this._carriers[0]];
    }
    
    // Sum carriers
    let output = 0;
    for (const carrierIdx of this._carriers) {
      output += opOutputs[carrierIdx];
    }
    
    // Apply filter
    this._filter.setLowpass(this._filterFreq, this._filterRes);
    output = this._filter.process(output);
    
    this.age++;
    return output;
  }
  
  private _updateAlgorithm(algorithm: number): void {
    // Algorithm definitions (same as main thread)
    const algorithms: number[][][] = [
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
      [[0, 2], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
      [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
      [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [5, 6], [6, 7]],
      [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7]],
      [[0, 1], [2, 3], [4, 5]],
      [[0, 2], [1, 2], [3, 5], [4, 5]],
      [[0, 1], [0, 2], [0, 3]],
      [[0, 1], [2, 5], [3, 5], [4, 5]],
      [[0, 2], [1, 2]],
      [],
    ];
    
    this._connections = algorithms[Math.max(0, Math.min(10, algorithm))] ?? [];
    
    // Calculate carriers
    const hasOutput = new Set<number>();
    for (const [from] of this._connections) {
      hasOutput.add(from);
    }
    
    this._carriers = [];
    for (let i = 0; i < 8; i++) {
      if (!hasOutput.has(i)) {
        this._carriers.push(i);
      }
    }
  }
}

// =============================================================================
// Main Processor
// =============================================================================

interface NoteEvent {
  type: "noteOn" | "noteOff";
  note: number;
  velocity: number;
  time: number;
}

class OperatorProcessor extends AudioWorkletProcessor {
  private _voices: WorkletFMVoice[] = [];
  private _activeVoices = 0;
  private _maxVoices = 8;
  
  // Current parameter values
  private _algorithm = 7;
  private _feedback = 0;
  private _filterFreq = 20000;
  private _filterRes = 0;
  private _masterLevel = 0;
  private _masterPan = 0;
  
  // Operator configs
  private _opConfigs: OperatorConfig[] = [];
  
  // Pending note events
  private _noteQueue: NoteEvent[] = [];
  
  constructor() {
    super();
    
    // Initialize operator configs
    for (let i = 0; i < 8; i++) {
      this._opConfigs.push({
        enabled: i < 4 ? 1 : 0,
        coarse: i < 4 ? 1 + i * 0.5 : 1,
        fine: 0,
        fixedMode: 0,
        waveform: 0,
        level: i < 4 ? 0.5 : 0.8,
        attack: 10,
        decay: 200,
        sustain: 0.8,
        release: 300,
        velocitySens: 0.5,
      });
    }
    
    // Create voices
    for (let i = 0; i < this._maxVoices; i++) {
      const voice = new WorkletFMVoice();
      this._voices.push(voice);
    }
    
    // Handle messages from main thread
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case "noteOn":
          this._noteQueue.push({
            type: "noteOn",
            note: data.note,
            velocity: data.velocity,
            time: 0, // Process immediately
          });
          break;
          
        case "noteOff":
          this._noteQueue.push({
            type: "noteOff",
            note: data.note,
            velocity: 0,
            time: 0,
          });
          break;
          
        case "paramChange":
          this._handleParamChange(data.id, data.value);
          break;
          
        case "configure":
          this._configure(data);
          break;
      }
    };
  }
  
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const outputL = outputs[0]?.[0];
    const outputR = outputs[0]?.[1] ?? outputL;
    
    if (!outputL) return true;
    
    const blockSize = outputL.length;
    
    // Process note events
    this._processNoteEvents();
    
    // Process audio
    for (let i = 0; i < blockSize; i++) {
      let sum = 0;
      
      for (const voice of this._voices) {
        if (voice.active) {
          sum += voice.process();
        }
      }
      
      // Apply master gain and pan
      const gain = Math.pow(10, this._masterLevel / 20);
      const panL = Math.cos((this._masterPan / 50 + 1) * Math.PI / 4);
      const panR = Math.sin((this._masterPan / 50 + 1) * Math.PI / 4);
      
      outputL[i] = sum * gain * panL;
      if (outputR) {
        outputR[i] = sum * gain * panR;
      }
    }
    
    return true;
  }
  
  private _processNoteEvents(): void {
    for (const event of this._noteQueue) {
      if (event.type === "noteOn") {
        this._triggerNote(event.note, event.velocity);
      } else {
        this._releaseNote(event.note);
      }
    }
    this._noteQueue = [];
  }
  
  private _triggerNote(note: number, velocity: number): void {
    // Find free voice
    let voice: WorkletFMVoice | null = null;
    
    for (const v of this._voices) {
      if (!v.active) {
        voice = v;
        break;
      }
    }
    
    // Steal oldest if no free voice
    if (!voice) {
      let oldest = this._voices[0];
      for (const v of this._voices) {
        if (v.age > oldest.age) {
          oldest = v;
        }
      }
      oldest.stop();
      voice = oldest;
    }
    
    // Configure and trigger
    voice.configure(
      this._opConfigs,
      this._algorithm,
      this._feedback,
      this._filterFreq,
      this._filterRes
    );
    voice.trigger(note, velocity);
  }
  
  private _releaseNote(note: number): void {
    for (const voice of this._voices) {
      if (voice.active && voice.note === note) {
        voice.release();
      }
    }
  }
  
  private _handleParamChange(id: string, value: number): void {
    // Handle operator parameters
    const opMatch = id.match(/^op(\d+)(\w+)$/);
    if (opMatch) {
      const opIdx = parseInt(opMatch[1], 10) - 1;
      if (opIdx >= 0 && opIdx < 8) {
        const param = opMatch[2];
        switch (param.toLowerCase()) {
          case "enabled":
            this._opConfigs[opIdx].enabled = value > 0.5 ? 1 : 0;
            break;
          case "coarse":
            this._opConfigs[opIdx].coarse = 0.25 + value * 15.75;
            break;
          case "fine":
            this._opConfigs[opIdx].fine = (value - 0.5) * 200;
            break;
          case "level":
            this._opConfigs[opIdx].level = value;
            break;
          case "attack":
            this._opConfigs[opIdx].attack = value;
            break;
          case "decay":
            this._opConfigs[opIdx].decay = value;
            break;
          case "sustain":
            this._opConfigs[opIdx].sustain = value;
            break;
          case "release":
            this._opConfigs[opIdx].release = value;
            break;
        }
      }
      return;
    }
    
    // Global parameters
    switch (id) {
      case "algorithm":
        this._algorithm = Math.round(value * 10);
        break;
      case "feedback":
        this._feedback = value * 100;
        break;
      case "filterFreq":
        this._filterFreq = 20 + value * 19980;
        break;
      case "filterRes":
        this._filterRes = value * 100;
        break;
      case "masterLevel":
        this._masterLevel = -96 + value * 108;
        break;
      case "masterPan":
        this._masterPan = (value - 0.5) * 100;
        break;
    }
  }
  
  private _configure(data: {
    algorithm?: number;
    feedback?: number;
    filterFreq?: number;
    filterRes?: number;
    operators?: OperatorConfig[];
  }): void {
    if (data.algorithm !== undefined) this._algorithm = data.algorithm;
    if (data.feedback !== undefined) this._feedback = data.feedback;
    if (data.filterFreq !== undefined) this._filterFreq = data.filterFreq;
    if (data.filterRes !== undefined) this._filterRes = data.filterRes;
    if (data.operators) this._opConfigs = data.operators;
  }
}

registerProcessor("operator-processor", OperatorProcessor);
