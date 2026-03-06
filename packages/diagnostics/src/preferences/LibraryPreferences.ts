/**
 * Library Preferences
 * 
 * Pack management and library locations.
 */

export interface LibraryPreferences {
  /** Location of installed packs */
  packsLocation: string;
  
  /** Location of user library (presets, samples, etc.) */
  userLibraryLocation: string;
  
  /** Location of cache files */
  cacheLocation: string;
  
  /** Install packs in user library instead of packs folder */
  installPacksInUserLibrary: boolean;
  
  /** Download packs automatically when available */
  downloadPacksAutomatically: boolean;
  
  /** Show packs in browser */
  showPacksInBrowser: boolean;
  
  /** Auto-update packs */
  autoUpdatePacks: boolean;
}

export interface PackInfo {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  installDate: Date;
  size: number;
  isBuiltIn: boolean;
  tags: string[];
}

export interface LibraryBrowserConfig {
  /** Show preview in browser */
  showPreview: boolean;
  /** Preview volume (0-1) */
  previewVolume: number;
  /** Auto-preview on selection */
  autoPreview: boolean;
  /** Show user content first */
  userContentFirst: boolean;
  /** Default sort mode */
  defaultSort: 'name' | 'date' | 'type' | 'size';
}

/**
 * Get default library paths based on platform
 */
export function getDefaultLibraryPaths(): {
  packsLocation: string;
  userLibraryLocation: string;
  cacheLocation: string;
} {
  // In browser environment, use relative paths
  return {
    packsLocation: './Packs',
    userLibraryLocation: './User Library',
    cacheLocation: './Cache',
  };
}

/**
 * Get content types in user library
 */
export function getUserLibraryContentTypes(): string[] {
  return [
    'Presets',
    'Samples',
    'Clips',
    'Grooves',
    'Templates',
    'MIDI Clips',
    'Projects',
    'Remote Scripts',
  ];
}

/**
 * Validate library preferences
 */
export function validateLibraryPreferences(prefs: LibraryPreferences): string[] {
  const errors: string[] = [];
  
  if (!prefs.packsLocation || prefs.packsLocation.trim() === '') {
    errors.push('Packs location cannot be empty');
  }
  
  if (!prefs.userLibraryLocation || prefs.userLibraryLocation.trim() === '') {
    errors.push('User library location cannot be empty');
  }
  
  if (!prefs.cacheLocation || prefs.cacheLocation.trim() === '') {
    errors.push('Cache location cannot be empty');
  }
  
  return errors;
}
