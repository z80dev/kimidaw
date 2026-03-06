/**
 * Project Information and Statistics
 * 
 * Provides metadata, statistics, and info about projects.
 */

// ============================================================================
// Types
// ============================================================================

export interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  author?: string;
  createdAt: Date;
  modifiedAt: Date;
  version: string;
  
  // Statistics
  stats: ProjectStats;
  
  // Metadata
  tags: string[];
  genre?: string;
  key?: string;
  tempo: number;
  duration: number; // in seconds
  
  // File info
  fileSize: number;
  assetCount: number;
  totalAudioDuration: number;
  
  // Technical
  sampleRate: number;
  bitDepth: number;
}

export interface ProjectStats {
  // Tracks
  trackCount: number;
  audioTrackCount: number;
  midiTrackCount: number;
  returnTrackCount: number;
  groupTrackCount: number;
  
  // Clips
  audioClipCount: number;
  midiClipCount: number;
  sceneCount: number;
  
  // Notes
  totalNoteCount: number;
  totalAutomationPoints: number;
  
  // Devices
  instrumentCount: number;
  audioEffectCount: number;
  midiEffectCount: number;
  
  // Files
  audioFileCount: number;
  midiFileCount: number;
  presetCount: number;
  totalFileSize: number;
}

export interface ProjectHealth {
  overall: 'good' | 'warning' | 'critical';
  issues: ProjectIssue[];
  suggestions: ProjectSuggestion[];
}

export interface ProjectIssue {
  type: 'error' | 'warning' | 'info';
  category: 'missing-files' | 'performance' | 'compatibility' | 'audio' | 'organization';
  message: string;
  details?: string;
  affectedItems?: string[];
}

export interface ProjectSuggestion {
  category: 'performance' | 'organization' | 'audio-quality' | 'workflow';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Project Info Manager
// ============================================================================

export interface ProjectInfoManager {
  // Get project info
  getProjectInfo(projectId: string): Promise<ProjectInfo>;
  getProjectStats(projectId: string): Promise<ProjectStats>;
  
  // Update metadata
  updateMetadata(
    projectId: string,
    updates: Partial<Omit<ProjectInfo, 'id' | 'stats' | 'createdAt'>>
  ): Promise<void>;
  
  // Health check
  checkHealth(projectId: string): Promise<ProjectHealth>;
  
  // Statistics
  calculateStats(projectData: unknown): ProjectStats;
  
  // Export info
  exportInfo(projectId: string, format: 'json' | 'text' | 'csv'): Promise<string>;
}

export function createProjectInfoManager(
  storage: {
    loadProject: (projectId: string) => Promise<unknown>;
    saveProjectMetadata: (projectId: string, metadata: Record<string, unknown>) => Promise<void>;
    loadProjectMetadata: (projectId: string) => Promise<Record<string, unknown>>;
  }
): ProjectInfoManager {
  async function getProjectInfo(projectId: string): Promise<ProjectInfo> {
    const project = await storage.loadProject(projectId);
    const metadata = await storage.loadProjectMetadata(projectId);
    const stats = calculateStats(project);
    
    return {
      id: projectId,
      name: (metadata.name as string) || 'Untitled',
      description: metadata.description as string,
      author: metadata.author as string,
      createdAt: new Date(metadata.createdAt as string || Date.now()),
      modifiedAt: new Date(metadata.modifiedAt as string || Date.now()),
      version: (metadata.version as string) || '1.0',
      stats,
      tags: (metadata.tags as string[]) || [],
      genre: metadata.genre as string,
      key: metadata.key as string,
      tempo: (metadata.tempo as number) || 120,
      duration: stats.totalAudioDuration,
      fileSize: stats.totalFileSize,
      assetCount: stats.audioFileCount + stats.midiFileCount,
      totalAudioDuration: stats.totalAudioDuration,
      sampleRate: (metadata.sampleRate as number) || 44100,
      bitDepth: (metadata.bitDepth as number) || 24,
    };
  }
  
  async function getProjectStats(projectId: string): Promise<ProjectStats> {
    const project = await storage.loadProject(projectId);
    return calculateStats(project);
  }
  
  async function updateMetadata(
    projectId: string,
    updates: Partial<Omit<ProjectInfo, 'id' | 'stats' | 'createdAt'>>
  ): Promise<void> {
    const existing = await storage.loadProjectMetadata(projectId);
    
    await storage.saveProjectMetadata(projectId, {
      ...existing,
      ...updates,
      modifiedAt: new Date().toISOString(),
    });
  }
  
  async function checkHealth(projectId: string): Promise<ProjectHealth> {
    const project = await storage.loadProject(projectId);
    const issues: ProjectIssue[] = [];
    const suggestions: ProjectSuggestion[] = [];
    
    // Analyze project for issues
    analyzeProject(project, issues, suggestions);
    
    // Determine overall health
    let overall: ProjectHealth['overall'] = 'good';
    if (issues.some(i => i.type === 'error')) {
      overall = 'critical';
    } else if (issues.some(i => i.type === 'warning') || issues.length > 5) {
      overall = 'warning';
    }
    
    return { overall, issues, suggestions };
  }
  
  function calculateStats(projectData: unknown): ProjectStats {
    const stats: ProjectStats = {
      trackCount: 0,
      audioTrackCount: 0,
      midiTrackCount: 0,
      returnTrackCount: 0,
      groupTrackCount: 0,
      audioClipCount: 0,
      midiClipCount: 0,
      sceneCount: 0,
      totalNoteCount: 0,
      totalAutomationPoints: 0,
      instrumentCount: 0,
      audioEffectCount: 0,
      midiEffectCount: 0,
      audioFileCount: 0,
      midiFileCount: 0,
      presetCount: 0,
      totalFileSize: 0,
    };
    
    if (!projectData || typeof projectData !== 'object') {
      return stats;
    }
    
    const project = projectData as Record<string, unknown>;
    
    // Count tracks
    if (Array.isArray(project.tracks)) {
      stats.trackCount = project.tracks.length;
      for (const track of project.tracks as Array<Record<string, unknown>>) {
        switch (track.type) {
          case 'audio':
            stats.audioTrackCount++;
            break;
          case 'midi':
            stats.midiTrackCount++;
            break;
          case 'group':
            stats.groupTrackCount++;
            break;
        }
        
        // Count clips
        if (Array.isArray(track.clips)) {
          for (const clip of track.clips as Array<Record<string, unknown>>) {
            if (clip.type === 'audio') {
              stats.audioClipCount++;
            } else if (clip.type === 'midi') {
              stats.midiClipCount++;
            }
            
            // Count notes in MIDI clips
            if (clip.type === 'midi' && Array.isArray(clip.notes)) {
              stats.totalNoteCount += (clip.notes as unknown[]).length;
            }
          }
        }
        
        // Count devices
        if (Array.isArray(track.devices)) {
          for (const device of track.devices as Array<Record<string, unknown>>) {
            switch (device.type) {
              case 'instrument':
                stats.instrumentCount++;
                break;
              case 'audio-effect':
                stats.audioEffectCount++;
                break;
              case 'midi-effect':
                stats.midiEffectCount++;
                break;
            }
          }
        }
      }
    }
    
    // Count return tracks
    if (Array.isArray(project.returnTracks)) {
      stats.returnTrackCount = project.returnTracks.length;
    }
    
    // Count scenes
    if (Array.isArray(project.scenes)) {
      stats.sceneCount = project.scenes.length;
    }
    
    // Count automation points
    if (Array.isArray(project.automationLanes)) {
      for (const lane of project.automationLanes as Array<Record<string, unknown>>) {
        if (Array.isArray(lane.points)) {
          stats.totalAutomationPoints += (lane.points as unknown[]).length;
        }
      }
    }
    
    return stats;
  }
  
  function analyzeProject(
    project: unknown,
    issues: ProjectIssue[],
    suggestions: ProjectSuggestion[]
  ): void {
    if (!project || typeof project !== 'object') return;
    
    const p = project as Record<string, unknown>;
    
    // Check for missing files
    if (Array.isArray(p.assets)) {
      const missingAssets = (p.assets as Array<Record<string, unknown>>)
        .filter(a => a.status === 'missing');
      
      if (missingAssets.length > 0) {
        issues.push({
          type: 'error',
          category: 'missing-files',
          message: `${missingAssets.length} file(s) are missing`,
          details: 'Some audio files referenced by this project cannot be found.',
          affectedItems: missingAssets.map(a => a.path as string),
        });
      }
    }
    
    // Check track count
    if (Array.isArray(p.tracks)) {
      const trackCount = p.tracks.length;
      
      if (trackCount === 0) {
        suggestions.push({
          category: 'organization',
          message: 'Project has no tracks. Consider adding some tracks to get started.',
          priority: 'low',
        });
      } else if (trackCount > 50) {
        suggestions.push({
          category: 'performance',
          message: `Project has ${trackCount} tracks. Consider grouping tracks to improve performance.`,
          priority: 'medium',
        });
      }
    }
    
    // Check for CPU-heavy devices
    const heavyDevices = ['Reverb', 'Convolution', 'MultibandDynamics'];
    // Would check device usage here in full implementation
    
    // Check for audio clipping potential
    if (p.masterTrack && typeof p.masterTrack === 'object') {
      const mt = p.masterTrack as Record<string, unknown>;
      const hasLimiter = Array.isArray(mt.devices) && 
        (mt.devices as Array<Record<string, unknown>>)
          .some(d => d.type === 'Limiter');
      
      if (!hasLimiter) {
        suggestions.push({
          category: 'audio-quality',
          message: 'No limiter on master track. Consider adding a limiter to prevent clipping.',
          priority: 'high',
        });
      }
    }
  }
  
  async function exportInfo(
    projectId: string,
    format: 'json' | 'text' | 'csv'
  ): Promise<string> {
    const info = await getProjectInfo(projectId);
    
    switch (format) {
      case 'json':
        return JSON.stringify(info, null, 2);
        
      case 'text':
        return formatAsText(info);
        
      case 'csv':
        return formatAsCsv(info);
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
  
  function formatAsText(info: ProjectInfo): string {
    return `
Project: ${info.name}
ID: ${info.id}
Author: ${info.author || 'Unknown'}
Created: ${info.createdAt.toLocaleDateString()}
Modified: ${info.modifiedAt.toLocaleDateString()}
Version: ${info.version}

Tempo: ${info.tempo} BPM
Key: ${info.key || 'Not set'}
Genre: ${info.genre || 'Not set'}
Duration: ${formatDuration(info.duration)}

Statistics:
- Tracks: ${info.stats.trackCount} (${info.stats.audioTrackCount} audio, ${info.stats.midiTrackCount} MIDI)
- Return Tracks: ${info.stats.returnTrackCount}
- Clips: ${info.stats.audioClipCount} audio, ${info.stats.midiClipCount} MIDI
- Scenes: ${info.stats.sceneCount}
- Notes: ${info.stats.totalNoteCount}
- Automation Points: ${info.stats.totalAutomationPoints}
- Devices: ${info.stats.instrumentCount} instruments, ${info.stats.audioEffectCount} effects

Files:
- Audio Files: ${info.stats.audioFileCount}
- MIDI Files: ${info.stats.midiFileCount}
- Presets: ${info.stats.presetCount}
- Total Size: ${formatBytes(info.stats.totalFileSize)}
`.trim();
  }
  
  function formatAsCsv(info: ProjectInfo): string {
    return `
Property,Value
Name,${info.name}
ID,${info.id}
Author,${info.author || 'Unknown'}
Created,${info.createdAt.toISOString()}
Modified,${info.modifiedAt.toISOString()}
Version,${info.version}
Tempo,${info.tempo}
Key,${info.key || ''}
Genre,${info.genre || ''}
Duration,${info.duration}
Track Count,${info.stats.trackCount}
Audio Tracks,${info.stats.audioTrackCount}
MIDI Tracks,${info.stats.midiTrackCount}
Return Tracks,${info.stats.returnTrackCount}
Audio Clips,${info.stats.audioClipCount}
MIDI Clips,${info.stats.midiClipCount}
Scenes,${info.stats.sceneCount}
Note Count,${info.stats.totalNoteCount}
Automation Points,${info.stats.totalAutomationPoints}
Instruments,${info.stats.instrumentCount}
Audio Effects,${info.stats.audioEffectCount}
MIDI Effects,${info.stats.midiEffectCount}
Total File Size,${info.stats.totalFileSize}
`.trim();
  }
  
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  return {
    getProjectInfo,
    getProjectStats,
    updateMetadata,
    checkHealth,
    calculateStats,
    exportInfo,
  };
}
