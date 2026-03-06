/**
 * Audio Preferences
 * 
 * Audio driver, sample rate, buffer size, and latency settings.
 */

export type AudioDriver = 'default' | 'asio' | 'coreaudio' | 'wasapi' | 'directsound' | 'jack';
export type SampleRate = 44100 | 48000 | 88200 | 96000;
export type BufferSize = 128 | 256 | 512 | 1024 | 2048 | 4096;
export type BitDepth = 16 | 24 | 32;

export interface AudioDevice {
  id: string;
  name: string;
  channelCount: number;
  isDefault: boolean;
}

export interface AudioPreferences {
  /** Audio driver type */
  driver: AudioDriver;
  
  /** Sample rate in Hz */
  sampleRate: SampleRate;
  
  /** Buffer size in samples */
  bufferSize: BufferSize;
  
  /** Bit depth for recording and rendering */
  bitDepth: BitDepth;
  
  /** Selected input device (null for default) */
  inputDevice: AudioDevice | null;
  
  /** Selected output device (null for default) */
  outputDevice: AudioDevice | null;
  
  /** Enable exclusive mode (lower latency) */
  enableExclusiveMode: boolean;
  
  /** Run audio test on startup */
  testOnStart: boolean;
  
  /** Input latency compensation in samples */
  inLatency: number;
  
  /** Output latency compensation in samples */
  outLatency: number;
  
  /** Enable input monitoring */
  enableInputMonitoring: boolean;
  
  /** Reduce latency when monitoring */
  reduceLatencyWhenMonitoring: boolean;
  
  /** CPU idle time percentage */
  cpuIdle: number;
}

/**
 * Get a list of available audio drivers for the current platform
 */
export function getAvailableDrivers(): AudioDriver[] {
  const platform = typeof navigator !== 'undefined' ? navigator.platform : '';
  
  if (platform.includes('Win')) {
    return ['default', 'wasapi', 'asio', 'directsound'];
  } else if (platform.includes('Mac')) {
    return ['default', 'coreaudio'];
  } else {
    return ['default', 'jack'];
  }
}

/**
 * Calculate latency from buffer size and sample rate
 */
export function calculateLatency(bufferSize: number, sampleRate: number): number {
  return (bufferSize / sampleRate) * 1000; // in milliseconds
}

/**
 * Get recommended buffer size based on use case
 */
export function getRecommendedBufferSize(
  useCase: 'recording' | 'mixing' | 'mastering' | 'live'
): BufferSize {
  switch (useCase) {
    case 'recording':
    case 'live':
      return 128;
    case 'mixing':
      return 512;
    case 'mastering':
      return 1024;
    default:
      return 512;
  }
}

/**
 * Validate audio preferences
 */
export function validateAudioPreferences(prefs: AudioPreferences): string[] {
  const errors: string[] = [];
  
  if (!getAvailableDrivers().includes(prefs.driver)) {
    errors.push(`Driver '${prefs.driver}' is not available on this platform`);
  }
  
  if (![44100, 48000, 88200, 96000].includes(prefs.sampleRate)) {
    errors.push('Invalid sample rate');
  }
  
  if (prefs.cpuIdle < 0 || prefs.cpuIdle > 100) {
    errors.push('CPU idle must be between 0 and 100');
  }
  
  return errors;
}
