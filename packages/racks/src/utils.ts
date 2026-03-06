/**
 * Utility Functions
 * 
 * Shared utility functions for the Racks System.
 */

// =============================================================================
// Audio/Math Utilities
// =============================================================================

/**
 * Convert dB to linear gain
 */
export function dbToLinear(db: number): number {
  if (db <= -96) return 0;
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain to dB
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

/**
 * Clamp a value to a range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp to 0-1 range
 */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Cubic interpolation
 */
export function cubicInterp(a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  
  return (
    0.5 * (
      (2 * b) +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3
    )
  );
}

/**
 * Equal-power crossfade between two gains
 */
export function equalPowerCrossfade(position: number): { a: number; b: number } {
  const angle = position * Math.PI / 2;
  return {
    a: Math.cos(angle),
    b: Math.sin(angle),
  };
}

/**
 * Apply a curve to a normalized value (0-1)
 * curve: -1 (exponential) to 1 (logarithmic), 0 = linear
 */
export function applyCurve(value: number, curve: number): number {
  const clamped = clamp01(value);
  
  if (curve === 0) return clamped;
  
  // S-curve
  if (Math.abs(curve) > 0.8) {
    const sign = curve > 0 ? 1 : -1;
    const t = clamped * 2 - 1; // -1 to 1
    const shaped = sign * t * t * t / 2 + 0.5;
    return clamp01(shaped);
  }
  
  // Exponential/logarithmic
  const power = Math.pow(3, Math.abs(curve));
  if (curve > 0) {
    return Math.pow(clamped, 1 / power);
  } else {
    return 1 - Math.pow(1 - clamped, power);
  }
}

// =============================================================================
// MIDI Utilities
// =============================================================================

/**
 * Convert MIDI note number to frequency (A4 = 440Hz)
 */
export function midiToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/**
 * Convert frequency to nearest MIDI note number
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

/**
 * Get note name from MIDI note number
 */
export function midiToNoteName(note: number, includeOctave = true): string {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(note / 12) - 2;
  const name = noteNames[note % 12];
  return includeOctave ? `${name}${octave}` : name;
}

/**
 * Parse note name to MIDI note number
 */
export function noteNameToMidi(noteName: string): number {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  const match = noteName.match(/^([A-Ga-g][#b]?)(-?\d+)?$/);
  if (!match) return 60; // Default to C4
  
  let notePart = match[1]!.toUpperCase();
  const octavePart = match[2] ? parseInt(match[2]) : 4;
  
  // Normalize flat to sharp
  if (notePart.endsWith("b")) {
    const baseNote = notePart[0]!;
    const prevNoteIndex = noteNames.findIndex(n => n[0] === baseNote) - 1;
    notePart = noteNames[(prevNoteIndex + 12) % 12]!;
  }
  
  const noteIndex = noteNames.indexOf(notePart);
  if (noteIndex === -1) return 60;
  
  return (octavePart + 2) * 12 + noteIndex;
}

/**
 * Map velocity (0-127) to a dB range
 */
export function velocityToDb(velocity: number, minDb: number = -60, maxDb: number = 0): number {
  const normalized = velocity / 127;
  return lerp(minDb, maxDb, normalized);
}

/**
 * Map velocity with a curve
 */
export function curvedVelocity(velocity: number, curve: number): number {
  const normalized = velocity / 127;
  const curved = applyCurve(normalized, curve);
  return Math.round(curved * 127);
}

// =============================================================================
// Pan Utilities
// =============================================================================

/**
 * Calculate pan gains using constant power law
 * pan: -1 (left) to 1 (right), 0 = center
 */
export function calculatePanGains(pan: number): { left: number; right: number } {
  const normalizedPan = clamp(pan, -1, 1);
  const angle = (normalizedPan + 1) * Math.PI / 4; // 0 to PI/2
  
  return {
    left: Math.cos(angle),
    right: Math.sin(angle),
  };
}

/**
 * Calculate linear pan gains (cheaper but not constant power)
 */
export function calculateLinearPanGains(pan: number): { left: number; right: number } {
  const normalizedPan = clamp(pan, -1, 1);
  return {
    left: 1 - (normalizedPan + 1) / 2,
    right: (normalizedPan + 1) / 2,
  };
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// =============================================================================
// Array Utilities
// =============================================================================

/**
 * Remove an item from an array
 */
export function removeFromArray<T>(array: T[], item: T): boolean {
  const index = array.indexOf(item);
  if (index >= 0) {
    array.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Move an item within an array
 */
export function moveInArray<T>(array: T[], fromIndex: number, toIndex: number): boolean {
  if (fromIndex < 0 || fromIndex >= array.length) return false;
  if (toIndex < 0 || toIndex >= array.length) return false;
  
  const [item] = array.splice(fromIndex, 1);
  array.splice(toIndex, 0, item);
  return true;
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]!;
  }
  return result;
}

// =============================================================================
// String Utilities
// =============================================================================

/**
 * Truncate a string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// =============================================================================
// Debounce/Throttle
// =============================================================================

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  } : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = Math.round(clamp(x, 0, 255)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("")}`;
}

/**
 * Generate a random color
 */
export function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Generate colors for a palette
 */
export function generatePalette(count: number): string[] {
  const colors: string[] = [];
  const step = 360 / count;
  
  for (let i = 0; i < count; i++) {
    const hue = Math.floor(i * step);
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  
  return colors;
}
