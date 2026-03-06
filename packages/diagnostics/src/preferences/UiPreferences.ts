/**
 * UI Preferences
 * 
 * User interface settings including colors, fonts, and behavior.
 */

export type Theme = 'light' | 'dark' | 'system';
export type ColorScheme = 'default' | 'blue' | 'orange' | 'pink' | 'green' | 'purple';
export type TimelineFormat = 'bars-beats' | 'minutes-seconds' | 'samples' | 'timecode';
export type FollowBehavior = 'scroll' | 'page' | 'none';

export interface UiPreferences {
  /** UI theme */
  theme: Theme;
  
  /** Color scheme */
  colorScheme: ColorScheme;
  
  /** Base font size in pixels */
  fontSize: number;
  
  /** Interface language */
  language: string;
  
  /** Show info text in detail view */
  showInfoText: boolean;
  
  /** Permanent scrub area in arrangement */
  permanentScrubArea: boolean;
  
  /** Auto-hide plugin windows when switching tracks */
  autoHidePlugins: boolean;
  
  /** Auto-show plugin windows when selecting devices */
  autoShowPlugins: boolean;
  
  /** Track color saturation (0-200) */
  trackColorSaturation: number;
  
  /** Show grid in editors */
  showGrid: boolean;
  
  /** Grid line width in pixels */
  gridLineWidth: number;
  
  /** Timeline display format */
  timelineFormat: TimelineFormat;
  
  /** Follow behavior during playback */
  followBehavior: FollowBehavior;
  
  /** Draw waveforms on clip overview */
  drawWaveformsOnClipOverview: boolean;
  
  /** Show zoom scrollbars in overview */
  showOverviewZoomScrollbars: boolean;
  
  /** Auto-adjust macro mapping range */
  autoAdjustMacroMappingRange: boolean;
  
  /** Show modulation overview */
  showModulationOverview: boolean;
  
  /** Highlight active clip border */
  highlightActiveClipBorder: boolean;
}

export interface ColorTheme {
  name: string;
  background: string;
  surface: string;
  surfaceHighlight: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  error: string;
  warning: string;
  success: string;
  grid: string;
  playhead: string;
  selection: string;
  clipAudio: string;
  clipMidi: string;
  clipAutomation: string;
  trackHeader: string;
  meterGreen: string;
  meterYellow: string;
  meterRed: string;
}

/**
 * Get the current color theme based on preferences
 */
export function getColorTheme(prefs: UiPreferences): ColorTheme {
  const themes: Record<ColorScheme, Partial<ColorTheme>> = {
    default: {
      accent: '#FF6B35',
      accentHover: '#FF8555',
    },
    blue: {
      accent: '#2196F3',
      accentHover: '#42A5F5',
    },
    orange: {
      accent: '#FF9800',
      accentHover: '#FFB74D',
    },
    pink: {
      accent: '#E91E63',
      accentHover: '#F06292',
    },
    green: {
      accent: '#4CAF50',
      accentHover: '#66BB6A',
    },
    purple: {
      accent: '#9C27B0',
      accentHover: '#AB47BC',
    },
  };
  
  const baseTheme: ColorTheme = {
    name: prefs.colorScheme,
    background: prefs.theme === 'dark' ? '#1E1E1E' : '#F5F5F5',
    surface: prefs.theme === 'dark' ? '#2D2D2D' : '#FFFFFF',
    surfaceHighlight: prefs.theme === 'dark' ? '#3D3D3D' : '#F0F0F0',
    border: prefs.theme === 'dark' ? '#404040' : '#E0E0E0',
    text: prefs.theme === 'dark' ? '#E0E0E0' : '#212121',
    textMuted: prefs.theme === 'dark' ? '#888888' : '#757575',
    accent: '#FF6B35',
    accentHover: '#FF8555',
    error: '#F44336',
    warning: '#FFC107',
    success: '#4CAF50',
    grid: prefs.theme === 'dark' ? '#333333' : '#EEEEEE',
    playhead: '#00FF00',
    selection: '#0066CC40',
    clipAudio: '#4CAF50',
    clipMidi: '#2196F3',
    clipAutomation: '#FF9800',
    trackHeader: prefs.theme === 'dark' ? '#2D2D2D' : '#FFFFFF',
    meterGreen: '#4CAF50',
    meterYellow: '#FFC107',
    meterRed: '#F44336',
  };
  
  return { ...baseTheme, ...themes[prefs.colorScheme] };
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): Array<{ code: string; name: string }> {
  return [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ];
}

/**
 * Validate UI preferences
 */
export function validateUiPreferences(prefs: UiPreferences): string[] {
  const errors: string[] = [];
  
  if (prefs.fontSize < 8 || prefs.fontSize > 24) {
    errors.push('Font size must be between 8 and 24');
  }
  
  if (prefs.trackColorSaturation < 0 || prefs.trackColorSaturation > 200) {
    errors.push('Track color saturation must be between 0 and 200');
  }
  
  if (prefs.gridLineWidth < 0.5 || prefs.gridLineWidth > 4) {
    errors.push('Grid line width must be between 0.5 and 4');
  }
  
  const validLanguages = getAvailableLanguages().map(l => l.code);
  if (!validLanguages.includes(prefs.language)) {
    errors.push(`Unsupported language: ${prefs.language}`);
  }
  
  return errors;
}
