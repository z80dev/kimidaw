/**
 * Maintenance Preferences
 * 
 * Cache management and diagnostic settings.
 */

export interface MaintenancePreferences {
  /** Current cache size in bytes */
  cacheSize: number;
  
  /** Maximum cache size in bytes */
  maxCacheSize: number;
  
  /** Clear cache on exit */
  clearCacheOnExit: boolean;
  
  /** Additional plugin scan paths */
  pluginScanPaths: string[];
  
  /** Skip plugin scanning on startup */
  skipPluginScan: boolean;
  
  /** Enable verbose logging */
  verboseLogging: boolean;
  
  /** Show CPU usage in UI */
  showCpuUsage: boolean;
  
  /** Show memory usage in UI */
  showMemoryUsage: boolean;
}

export interface CacheInfo {
  type: 'waveform' | 'analysis' | 'plugin' | 'script' | 'other';
  size: number;
  fileCount: number;
  lastAccessed: Date;
}

export interface DiagnosticInfo {
  /** Application version */
  appVersion: string;
  /** Build number */
  buildNumber: string;
  /** Platform */
  platform: string;
  /** Browser/engine */
  engine: string;
  /** Last crash timestamp */
  lastCrash?: Date;
  /** Crash count */
  crashCount: number;
  /** Session start time */
  sessionStart: Date;
  /** Total session time */
  sessionTime: number;
}

/**
 * Format bytes to human-readable string
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get cache breakdown
 */
export function getCacheBreakdown(cacheInfo: CacheInfo[]): {
  total: number;
  byType: Record<CacheInfo['type'], number>;
} {
  const byType: Record<CacheInfo['type'], number> = {
    waveform: 0,
    analysis: 0,
    plugin: 0,
    script: 0,
    other: 0,
  };
  
  let total = 0;
  
  for (const info of cacheInfo) {
    total += info.size;
    byType[info.type] += info.size;
  }
  
  return { total, byType };
}

/**
 * Get default cache location
 */
export function getDefaultCacheLocation(): string {
  return './Cache';
}

/**
 * Get diagnostic info
 */
export function getDiagnosticInfo(): DiagnosticInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  return {
    appVersion: '1.0.0',
    buildNumber: '1000',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    engine: detectEngine(ua),
    crashCount: 0,
    sessionStart: new Date(),
    sessionTime: 0,
  };
}

function detectEngine(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

/**
 * Validate maintenance preferences
 */
export function validateMaintenancePreferences(prefs: MaintenancePreferences): string[] {
  const errors: string[] = [];
  
  if (prefs.maxCacheSize < 100 * 1024 * 1024) {
    errors.push('Maximum cache size must be at least 100MB');
  }
  
  if (prefs.maxCacheSize > 10 * 1024 * 1024 * 1024) {
    errors.push('Maximum cache size cannot exceed 10GB');
  }
  
  return errors;
}
