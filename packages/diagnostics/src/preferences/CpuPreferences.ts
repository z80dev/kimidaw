/**
 * CPU Preferences
 * 
 * Multicore support and buffer settings for CPU management.
 */

export type SchedulerPriority = 'high' | 'normal' | 'low';

export interface CpuPreferences {
  /** Enable multicore processing */
  multicoreSupport: boolean;
  
  /** Number of CPU cores to use ('auto' for all) */
  numberOfCores: number | 'auto';
  
  /** Scheduler priority */
  schedulerProORITY: SchedulerPriority;
  
  /** Enable adaptive buffer size based on CPU load */
  enableAdaptiveBufferSize: boolean;
  
  /** Minimum buffer size for adaptive mode */
  minimumBufferSize: number;
  
  /** Maximum buffer size for adaptive mode */
  maximumBufferSize: number;
  
  /** Suspend audio processing in background tabs */
  suspendBackgroundAudio: boolean;
}

/**
 * Get the number of available CPU cores
 */
export function getAvailableCores(): number {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  return 4; // Default assumption
}

/**
 * Calculate recommended core count
 */
export function getRecommendedCoreCount(): number {
  const available = getAvailableCores();
  
  // Leave one core free for system
  return Math.max(1, available - 1);
}

/**
 * Get core count options
 */
export function getCoreCountOptions(): Array<number | 'auto'> {
  const available = getAvailableCores();
  const options: Array<number | 'auto'> = ['auto'];
  
  for (let i = 1; i <= available; i++) {
    options.push(i);
  }
  
  return options;
}

/**
 * Estimate CPU load based on buffer size
 */
export function estimateCpuLoad(
  currentBufferSize: number,
  minBufferSize: number,
  maxBufferSize: number
): number {
  // Lower buffer = higher CPU load
  // Returns estimated load as percentage
  const range = maxBufferSize - minBufferSize;
  const position = currentBufferSize - minBufferSize;
  const normalized = range > 0 ? position / range : 0.5;
  
  // Inverse relationship: smaller buffer = higher load
  return Math.round((1 - normalized) * 100);
}

/**
 * Suggest buffer size based on CPU load
 */
export function suggestBufferSize(
  currentLoad: number,
  minBufferSize: number,
  maxBufferSize: number,
  targetLoad: number
): number {
  // If load is too high, increase buffer
  // If load is low, can try decreasing buffer
  
  const currentBuffer = minBufferSize + (maxBufferSize - minBufferSize) * (1 - currentLoad / 100);
  
  if (currentLoad > targetLoad + 10) {
    // Load too high, increase buffer
    return Math.min(maxBufferSize, currentBuffer * 1.5);
  } else if (currentLoad < targetLoad - 20) {
    // Load low, can decrease buffer for lower latency
    return Math.max(minBufferSize, currentBuffer * 0.75);
  }
  
  return currentBuffer;
}

/**
 * Validate CPU preferences
 */
export function validateCpuPreferences(prefs: CpuPreferences): string[] {
  const errors: string[] = [];
  
  if (typeof prefs.numberOfCores === 'number') {
    const available = getAvailableCores();
    if (prefs.numberOfCores < 1 || prefs.numberOfCores > available) {
      errors.push(`Core count must be between 1 and ${available}`);
    }
  }
  
  if (prefs.minimumBufferSize >= prefs.maximumBufferSize) {
    errors.push('Minimum buffer size must be less than maximum');
  }
  
  if (prefs.minimumBufferSize < 64) {
    errors.push('Minimum buffer size cannot be less than 64');
  }
  
  if (prefs.maximumBufferSize > 8192) {
    errors.push('Maximum buffer size cannot exceed 8192');
  }
  
  return errors;
}
