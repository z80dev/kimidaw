/**
 * Quantization Utilities
 * Handles timing calculations for clip/scene launching
 */

import type { QuantizationValue } from '../types';

// PPQ (Pulses Per Quarter note) - standard MIDI resolution
const PPQ = 960;

// Map quantization values to tick intervals
const QUANTIZATION_TICKS: Record<Exclude<QuantizationValue, 'none' | 'global'>, number> = {
  '1/32': PPQ / 8,
  '1/16': PPQ / 4,
  '1/8': PPQ / 2,
  '1/4': PPQ,
  '1/2': PPQ * 2,
  '1 bar': PPQ * 4,
  '2 bars': PPQ * 8,
  '4 bars': PPQ * 16,
  '8 bars': PPQ * 32,
};

/**
 * Get the tick interval for a quantization value
 */
export function getQuantizationTicks(
  quantization: QuantizationValue,
  globalQuantization: QuantizationValue = '1 bar'
): number {
  if (quantization === 'none') {
    return 0; // Immediate
  }
  
  if (quantization === 'global') {
    return getQuantizationTicks(globalQuantization);
  }
  
  return QUANTIZATION_TICKS[quantization];
}

/**
 * Quantize a tick position to the nearest grid point
 */
export function quantizeTick(
  tick: number,
  quantization: QuantizationValue,
  globalQuantization?: QuantizationValue
): number {
  if (quantization === 'none') {
    return tick;
  }
  
  const interval = getQuantizationTicks(quantization, globalQuantization);
  if (interval === 0) {
    return tick;
  }
  
  return Math.round(tick / interval) * interval;
}

/**
 * Quantize a tick position UP to the next grid point
 * Used for calculating next launch time
 */
export function quantizeTickUp(
  tick: number,
  quantization: QuantizationValue,
  globalQuantization?: QuantizationValue
): number {
  if (quantization === 'none') {
    return tick;
  }
  
  const interval = getQuantizationTicks(quantization, globalQuantization);
  if (interval === 0) {
    return tick;
  }
  
  return Math.ceil(tick / interval) * interval;
}

/**
 * Calculate the next launch time for a clip/scene
 * Returns the quantized tick position for launching
 */
export function calculateLaunchTime(
  currentTick: number,
  quantization: QuantizationValue,
  globalQuantization?: QuantizationValue
): number {
  if (quantization === 'none') {
    return currentTick;
  }
  
  return quantizeTickUp(currentTick, quantization, globalQuantization);
}

/**
 * Get the countdown time until the next quantized launch point
 * Returns time in ticks
 */
export function getLaunchCountdown(
  currentTick: number,
  targetTick: number
): number {
  return Math.max(0, targetTick - currentTick);
}

/**
 * Format ticks as a human-readable time string (bars.beats.sixteenths)
 */
export function formatTickTime(tick: number): string {
  const ticksPerBeat = PPQ;
  const ticksPerBar = ticksPerBeat * 4;
  const ticksPerSixteenth = PPQ / 4;
  
  const bars = Math.floor(tick / ticksPerBar) + 1;
  const beats = Math.floor((tick % ticksPerBar) / ticksPerBeat) + 1;
  const sixteenths = Math.floor((tick % ticksPerBeat) / ticksPerSixteenth) + 1;
  
  return `${bars}.${beats}.${sixteenths}`;
}

/**
 * Convert quantization value to display string
 */
export function quantizationToString(q: QuantizationValue): string {
  if (q === 'global') return 'Global';
  if (q === 'none') return 'None';
  return q;
}

/**
 * Check if a tick position is on a quantization grid boundary
 */
export function isOnQuantizationGrid(
  tick: number,
  quantization: QuantizationValue,
  globalQuantization?: QuantizationValue,
  epsilon: number = 1
): boolean {
  if (quantization === 'none') {
    return true;
  }
  
  const interval = getQuantizationTicks(quantization, globalQuantization);
  if (interval === 0) {
    return true;
  }
  
  const remainder = tick % interval;
  return remainder < epsilon || remainder > interval - epsilon;
}
