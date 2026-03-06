import { describe, it, expect } from 'vitest';
import {
  getQuantizationTicks,
  quantizeTick,
  quantizeTickUp,
  calculateLaunchTime,
  getLaunchCountdown,
  formatTickTime,
  quantizationToString,
  isOnQuantizationGrid,
} from '../utils/quantization';
import type { QuantizationValue } from '../types';

describe('getQuantizationTicks', () => {
  const PPQ = 960;

  it('should return 0 for none', () => {
    expect(getQuantizationTicks('none')).toBe(0);
  });

  it('should return correct ticks for standard values', () => {
    expect(getQuantizationTicks('1/4')).toBe(PPQ);
    expect(getQuantizationTicks('1/2')).toBe(PPQ * 2);
    expect(getQuantizationTicks('1 bar')).toBe(PPQ * 4);
    expect(getQuantizationTicks('2 bars')).toBe(PPQ * 8);
  });

  it('should use global quantization when specified', () => {
    expect(getQuantizationTicks('global', '1/4')).toBe(PPQ);
    expect(getQuantizationTicks('global', '1 bar')).toBe(PPQ * 4);
  });
});

describe('quantizeTick', () => {
  const PPQ = 960;

  it('should return same tick for none', () => {
    expect(quantizeTick(1234, 'none')).toBe(1234);
  });

  it('should quantize to nearest grid', () => {
    // At 960 PPQ, 1 bar = 3840 ticks
    // Tick 2000 should quantize to 1920 (half bar) or 3840 (full bar)
    const result = quantizeTick(2000, '1 bar');
    expect(result).toBe(0); // Closer to 0 than 3840

    const result2 = quantizeTick(3000, '1 bar');
    expect(result2).toBe(3840); // Closer to 3840
  });

  it('should quantize to 1/4 notes', () => {
    expect(quantizeTick(100, '1/4')).toBe(0);
    expect(quantizeTick(500, '1/4')).toBe(PPQ); // 960
  });
});

describe('quantizeTickUp', () => {
  const PPQ = 960;

  it('should return same tick for none', () => {
    expect(quantizeTickUp(1234, 'none')).toBe(1234);
  });

  it('should quantize up to next grid', () => {
    expect(quantizeTickUp(100, '1 bar')).toBe(3840);
    expect(quantizeTickUp(4000, '1 bar')).toBe(7680);
  });

  it('should handle exact grid positions', () => {
    expect(quantizeTickUp(0, '1 bar')).toBe(0);
    expect(quantizeTickUp(3840, '1 bar')).toBe(3840);
  });
});

describe('calculateLaunchTime', () => {
  const PPQ = 960;

  it('should return current tick for none', () => {
    expect(calculateLaunchTime(1234, 'none')).toBe(1234);
  });

  it('should quantize up for other values', () => {
    expect(calculateLaunchTime(100, '1 bar')).toBe(3840);
    expect(calculateLaunchTime(500, '1/4')).toBe(PPQ);
  });
});

describe('getLaunchCountdown', () => {
  it('should return positive time until launch', () => {
    expect(getLaunchCountdown(100, 500)).toBe(400);
  });

  it('should return 0 when past launch time', () => {
    expect(getLaunchCountdown(500, 100)).toBe(0);
  });

  it('should return 0 when at launch time', () => {
    expect(getLaunchCountdown(500, 500)).toBe(0);
  });
});

describe('formatTickTime', () => {
  const PPQ = 960;

  it('should format bar 1, beat 1', () => {
    expect(formatTickTime(0)).toBe('1.1.1');
  });

  it('should format bar 2, beat 1', () => {
    expect(formatTickTime(PPQ * 4)).toBe('2.1.1');
  });

  it('should format bar 1, beat 2', () => {
    expect(formatTickTime(PPQ)).toBe('1.2.1');
  });

  it('should format bar 1, beat 1, sixteenth 2', () => {
    expect(formatTickTime(PPQ / 4)).toBe('1.1.2');
  });
});

describe('quantizationToString', () => {
  it('should return Global for global', () => {
    expect(quantizationToString('global')).toBe('Global');
  });

  it('should return None for none', () => {
    expect(quantizationToString('none')).toBe('None');
  });

  it('should return value as-is for others', () => {
    expect(quantizationToString('1/4')).toBe('1/4');
    expect(quantizationToString('1 bar')).toBe('1 bar');
  });
});

describe('isOnQuantizationGrid', () => {
  const PPQ = 960;

  it('should return true for none', () => {
    expect(isOnQuantizationGrid(123, 'none')).toBe(true);
  });

  it('should return true when on grid', () => {
    expect(isOnQuantizationGrid(0, '1 bar')).toBe(true);
    expect(isOnQuantizationGrid(PPQ * 4, '1 bar')).toBe(true);
  });

  it('should return false when off grid', () => {
    expect(isOnQuantizationGrid(100, '1 bar')).toBe(false);
    expect(isOnQuantizationGrid(PPQ * 4 + 100, '1 bar')).toBe(false);
  });

  it('should use epsilon for tolerance', () => {
    expect(isOnQuantizationGrid(2, '1 bar', undefined, 5)).toBe(true);
    expect(isOnQuantizationGrid(10, '1 bar', undefined, 5)).toBe(false);
  });
});
