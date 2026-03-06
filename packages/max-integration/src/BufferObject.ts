/**
 * Buffer Object - Max/MSP buffer~ equivalent
 * 
 * Audio buffer storage and manipulation:
 * - Sample storage with multiple channels
 * - Reading and writing samples
 * - Playback position tracking
 * - Interpolation methods
 * - Loading from/saving to files
 */

// =============================================================================
// Types
// =============================================================================

export interface BufferInfo {
  /** Buffer name */
  name: string;
  /** Number of channels */
  channels: number;
  /** Length in samples */
  length: number;
  /** Length in milliseconds */
  duration: number;
  /** Sample rate */
  sampleRate: number;
  /** File path if loaded from file */
  filePath?: string;
}

export type InterpolationType = "none" | "linear" | "cubic" | "sinc";

// =============================================================================
// Buffer Object
// =============================================================================

export class BufferObject {
  private _name: string;
  private _channels: Float32Array[] = [];
  private _sampleRate = 48000;
  private _filePath?: string;
  private _dirty = false;

  constructor(name: string, channels = 1, length = 44100, sampleRate = 48000) {
    this._name = name;
    this._sampleRate = sampleRate;
    this.resize(channels, length);
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get name(): string {
    return this._name;
  }

  get channels(): number {
    return this._channels.length;
  }

  get length(): number {
    return this._channels[0]?.length ?? 0;
  }

  get duration(): number {
    return (this.length / this._sampleRate) * 1000;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  get filePath(): string | undefined {
    return this._filePath;
  }

  get isDirty(): boolean {
    return this._dirty;
  }

  get info(): BufferInfo {
    return {
      name: this._name,
      channels: this.channels,
      length: this.length,
      duration: this.duration,
      sampleRate: this._sampleRate,
      filePath: this._filePath,
    };
  }

  // ---------------------------------------------------------------------------
  // Resizing and Allocation
  // ---------------------------------------------------------------------------

  resize(channels: number, length: number): void {
    // Preserve existing data when resizing
    const newChannels: Float32Array[] = [];
    
    for (let ch = 0; ch < channels; ch++) {
      const newBuffer = new Float32Array(length);
      
      if (ch < this._channels.length) {
        // Copy existing data
        const oldBuffer = this._channels[ch];
        const copyLength = Math.min(oldBuffer.length, length);
        newBuffer.set(oldBuffer.subarray(0, copyLength));
      }
      
      newChannels.push(newBuffer);
    }
    
    this._channels = newChannels;
    this._dirty = true;
  }

  setSampleRate(sr: number): void {
    this._sampleRate = sr;
  }

  // ---------------------------------------------------------------------------
  // Sample Access
  // ---------------------------------------------------------------------------

  getSample(channel: number, index: number): number {
    if (channel < 0 || channel >= this._channels.length) return 0;
    const buffer = this._channels[channel];
    if (index < 0 || index >= buffer.length) return 0;
    return buffer[index];
  }

  setSample(channel: number, index: number, value: number): void {
    if (channel < 0 || channel >= this._channels.length) return;
    const buffer = this._channels[channel];
    if (index < 0 || index >= buffer.length) return;
    buffer[index] = value;
    this._dirty = true;
  }

  /**
   * Read sample with interpolation
   */
  read(channel: number, position: number, interpolation: InterpolationType = "linear"): number {
    if (channel < 0 || channel >= this._channels.length) return 0;
    const buffer = this._channels[channel];
    
    switch (interpolation) {
      case "none":
        return buffer[Math.floor(position)] ?? 0;
        
      case "linear": {
        const index = Math.floor(position);
        const frac = position - index;
        const s1 = buffer[index] ?? 0;
        const s2 = buffer[index + 1] ?? s1;
        return s1 + (s2 - s1) * frac;
      }
      
      case "cubic": {
        const index = Math.floor(position);
        const frac = position - index;
        const y0 = buffer[index - 1] ?? 0;
        const y1 = buffer[index] ?? 0;
        const y2 = buffer[index + 1] ?? y1;
        const y3 = buffer[index + 2] ?? y2;
        
        // Catmull-Rom cubic interpolation
        const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
        const b = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
        const c = -0.5 * y0 + 0.5 * y2;
        const d = y1;
        
        return ((a * frac + b) * frac + c) * frac + d;
      }
      
      case "sinc":
        // Simplified sinc interpolation (8-point)
        return this._sincInterpolate(buffer, position);
        
      default:
        return buffer[Math.floor(position)] ?? 0;
    }
  }

  private _sincInterpolate(buffer: Float32Array, position: number): number {
    const index = Math.floor(position);
    const frac = position - index;
    
    let sum = 0;
    for (let i = -4; i < 4; i++) {
      const sampleIdx = index + i;
      const sample = buffer[sampleIdx] ?? 0;
      const x = i - frac;
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      // Hann window
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * (i + 4) / 8));
      sum += sample * sinc * window;
    }
    
    return sum;
  }

  /**
   * Write sample (with optional interpolation for sub-sample positions)
   */
  write(channel: number, position: number, value: number): void {
    if (channel < 0 || channel >= this._channels.length) return;
    const buffer = this._channels[channel];
    
    const index = Math.floor(position);
    const frac = position - index;
    
    if (index >= 0 && index < buffer.length) {
      // Simple linear write (distribute energy to adjacent samples)
      buffer[index] += value * (1 - frac);
      if (index + 1 < buffer.length) {
        buffer[index + 1] += value * frac;
      }
      this._dirty = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------

  /**
   * Get a channel buffer (copy)
   */
  getChannelData(channel: number): Float32Array | null {
    if (channel < 0 || channel >= this._channels.length) return null;
    return new Float32Array(this._channels[channel]);
  }

  /**
   * Set a channel buffer
   */
  setChannelData(channel: number, data: Float32Array): void {
    if (channel < 0 || channel >= this._channels.length) return;
    
    const buffer = this._channels[channel];
    const copyLength = Math.min(data.length, buffer.length);
    buffer.set(data.subarray(0, copyLength));
    this._dirty = true;
  }

  /**
   * Copy samples from another buffer
   */
  copyFrom(
    source: BufferObject,
    destChannel = 0,
    sourceChannel = 0,
    destStart = 0,
    sourceStart = 0,
    length?: number
  ): void {
    const sourceData = source._channels[sourceChannel];
    const destData = this._channels[destChannel];
    
    if (!sourceData || !destData) return;
    
    const maxLength = length ?? Math.min(sourceData.length - sourceStart, destData.length - destStart);
    
    for (let i = 0; i < maxLength; i++) {
      destData[destStart + i] = sourceData[sourceStart + i] ?? 0;
    }
    
    this._dirty = true;
  }

  /**
   * Clear buffer (fill with zeros)
   */
  clear(channel?: number): void {
    if (channel !== undefined) {
      if (channel >= 0 && channel < this._channels.length) {
        this._channels[channel].fill(0);
      }
    } else {
      for (const ch of this._channels) {
        ch.fill(0);
      }
    }
    this._dirty = true;
  }

  /**
   * Normalize buffer to peak level
   */
  normalize(targetPeak = 1.0, channel?: number): void {
    const channelsToNormalize = channel !== undefined ? [channel] : this._channels.keys();
    
    for (const ch of channelsToNormalize) {
      const buffer = this._channels[ch];
      if (!buffer) continue;
      
      // Find peak
      let peak = 0;
      for (const sample of buffer) {
        peak = Math.max(peak, Math.abs(sample));
      }
      
      if (peak > 0) {
        const gain = targetPeak / peak;
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] *= gain;
        }
      }
    }
    
    this._dirty = true;
  }

  /**
   * Reverse buffer
   */
  reverse(channel?: number): void {
    const channelsToReverse = channel !== undefined ? [channel] : this._channels.keys();
    
    for (const ch of channelsToReverse) {
      const buffer = this._channels[ch];
      if (!buffer) continue;
      
      for (let i = 0; i < buffer.length / 2; i++) {
        const j = buffer.length - 1 - i;
        [buffer[i], buffer[j]] = [buffer[j], buffer[i]];
      }
    }
    
    this._dirty = true;
  }

  /**
   * Apply gain to buffer
   */
  applyGain(gain: number, channel?: number): void {
    const channelsToProcess = channel !== undefined ? [channel] : this._channels.keys();
    
    for (const ch of channelsToProcess) {
      const buffer = this._channels[ch];
      if (!buffer) continue;
      
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] *= gain;
      }
    }
    
    this._dirty = true;
  }

  // ---------------------------------------------------------------------------
  // File Operations
  // ---------------------------------------------------------------------------

  async loadFromFile(filePath: string): Promise<void> {
    // This would load audio file using the host's audio file loader
    // For now, just store the path
    this._filePath = filePath;
    this._dirty = false;
  }

  async saveToFile(filePath?: string): Promise<void> {
    const path = filePath ?? this._filePath;
    if (!path) throw new Error("No file path specified");
    
    // This would save to audio file using the host's audio file writer
    this._dirty = false;
  }

  // ---------------------------------------------------------------------------
  // Analysis
  // ---------------------------------------------------------------------------

  /**
   * Find peak sample value
   */
  getPeak(channel?: number): { value: number; index: number } {
    let peakValue = 0;
    let peakIndex = 0;
    
    const channelsToAnalyze = channel !== undefined ? [channel] : this._channels.keys();
    
    for (const ch of channelsToAnalyze) {
      const buffer = this._channels[ch];
      if (!buffer) continue;
      
      for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(buffer[i]);
        if (abs > peakValue) {
          peakValue = abs;
          peakIndex = i;
        }
      }
    }
    
    return { value: peakValue, index: peakIndex };
  }

  /**
   * Calculate RMS level
   */
  getRMS(channel?: number): number {
    let sum = 0;
    let count = 0;
    
    const channelsToAnalyze = channel !== undefined ? [channel] : this._channels.keys();
    
    for (const ch of channelsToAnalyze) {
      const buffer = this._channels[ch];
      if (!buffer) continue;
      
      for (const sample of buffer) {
        sum += sample * sample;
        count++;
      }
    }
    
    return count > 0 ? Math.sqrt(sum / count) : 0;
  }

  /**
   * Find zero crossings
   */
  getZeroCrossings(channel: number, start = 0, end?: number): number[] {
    const buffer = this._channels[channel];
    if (!buffer) return [];
    
    const crossings: number[] = [];
    const endIdx = Math.min(end ?? buffer.length, buffer.length);
    
    for (let i = start + 1; i < endIdx; i++) {
      if ((buffer[i - 1] < 0 && buffer[i] >= 0) || (buffer[i - 1] > 0 && buffer[i] <= 0)) {
        crossings.push(i);
      }
    }
    
    return crossings;
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  markClean(): void {
    this._dirty = false;
  }

  dispose(): void {
    this._channels = [];
  }
}

// =============================================================================
// Buffer Manager
// =============================================================================

export class BufferManager {
  private buffers: Map<string, BufferObject> = new Map();

  create(name: string, channels = 1, length = 44100, sampleRate = 48000): BufferObject {
    const buffer = new BufferObject(name, channels, length, sampleRate);
    this.buffers.set(name, buffer);
    return buffer;
  }

  get(name: string): BufferObject | undefined {
    return this.buffers.get(name);
  }

  remove(name: string): boolean {
    const buffer = this.buffers.get(name);
    if (buffer) {
      buffer.dispose();
      return this.buffers.delete(name);
    }
    return false;
  }

  getAll(): BufferObject[] {
    return Array.from(this.buffers.values());
  }

  clear(): void {
    for (const buffer of this.buffers.values()) {
      buffer.dispose();
    }
    this.buffers.clear();
  }

  rename(oldName: string, newName: string): boolean {
    const buffer = this.buffers.get(oldName);
    if (buffer && !this.buffers.has(newName)) {
      this.buffers.delete(oldName);
      (buffer as unknown as { _name: string })._name = newName;
      this.buffers.set(newName, buffer);
      return true;
    }
    return false;
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createBufferManager(): BufferManager {
  return new BufferManager();
}

export function createBuffer(
  name: string,
  channels = 1,
  length = 44100,
  sampleRate = 48000
): BufferObject {
  return new BufferObject(name, channels, length, sampleRate);
}
