/**
 * File Preferences
 * 
 * Default locations and file handling settings.
 */

export type RecordingFileType = 'wav' | 'aiff' | 'flac';

export interface FilePreferences {
  /** Default folder for new projects */
  defaultProjectFolder: string;
  
  /** Default folder for audio recordings */
  defaultAudioRecordingFolder: string;
  
  /** Default folder for exports */
  defaultExportFolder: string;
  
  /** Default folder for saving (null = same as project) */
  defaultSaveFolder: string | null;
  
  /** Enable auto-save */
  autoSaveEnabled: boolean;
  
  /** Auto-save interval in seconds */
  autoSaveInterval: number;
  
  /** Create analysis files (.asd) for imported audio */
  createAnalysisFiles: boolean;
  
  /** Convert warped audio to RAM mode for better performance */
  convertWarpedAudioToRAM: boolean;
  
  /** Generate temporary files during editing */
  generateTemporaryFiles: boolean;
  
  /** Ignore missing files when loading projects */
  ignoreMissingFilesOnLoad: boolean;
}

/**
 * Default folder structure for a project
 */
export interface ProjectFolderStructure {
  root: string;
  samples: string;
  recordings: string;
  exports: string;
  backups: string;
  render: string;
}

/**
 * Get default folder structure
 */
export function getProjectFolderStructure(projectPath: string): ProjectFolderStructure {
  return {
    root: projectPath,
    samples: `${projectPath}/Samples`,
    recordings: `${projectPath}/Samples/Recorded`,
    exports: `${projectPath}/Exports`,
    backups: `${projectPath}/Backup`,
    render: `${projectPath}/Render`,
  };
}

/**
 * Get supported audio file formats for import
 */
export function getSupportedImportFormats(): string[] {
  return [
    'wav',
    'aif',
    'aiff',
    'mp3',
    'ogg',
    'flac',
    'm4a',
    'aac',
    'wma',
    'rex',
    'rx2',
  ];
}

/**
 * Get supported audio file formats for export
 */
export function getSupportedExportFormats(): Array<{
  extension: string;
  name: string;
  supportsLossless: boolean;
}> {
  return [
    { extension: 'wav', name: 'WAV', supportsLossless: true },
    { extension: 'aiff', name: 'AIFF', supportsLossless: true },
    { extension: 'flac', name: 'FLAC', supportsLossless: true },
    { extension: 'mp3', name: 'MP3', supportsLossless: false },
    { extension: 'ogg', name: 'OGG Vorbis', supportsLossless: false },
    { extension: 'm4a', name: 'AAC', supportsLossless: false },
  ];
}

/**
 * Validate file preferences
 */
export function validateFilePreferences(prefs: FilePreferences): string[] {
  const errors: string[] = [];
  
  if (prefs.autoSaveInterval < 30) {
    errors.push('Auto-save interval must be at least 30 seconds');
  }
  
  if (prefs.autoSaveInterval > 3600) {
    errors.push('Auto-save interval cannot exceed 3600 seconds (1 hour)');
  }
  
  return errors;
}
