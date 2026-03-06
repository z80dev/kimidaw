/**
 * Project Template Management
 * 
 * Manages project templates, default sets, and recent projects.
 */

// ============================================================================
// Types
// ============================================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  tags: string[];
  thumbnail?: string; // Data URL or reference
  data: ProjectTemplateData;
  createdAt: Date;
  modifiedAt: Date;
  isDefault: boolean;
  isBuiltIn: boolean;
}

export type TemplateCategory = 
  | 'empty'
  | 'electronic'
  | 'rock'
  | 'hip-hop'
  | 'jazz'
  | 'classical'
  | 'sound-design'
  | 'custom';

export interface ProjectTemplateData {
  tempo: number;
  timeSignature: { numerator: number; denominator: number };
  tracks: TemplateTrack[];
  returnTracks: TemplateReturnTrack[];
  masterTrack: TemplateMasterTrack;
  scenes?: TemplateScene[];
  devicePresets?: Record<string, unknown>;
}

export interface TemplateTrack {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'instrument' | 'group';
  color?: string;
  volume?: number;
  pan?: number;
  devices?: TemplateDevice[];
  input?: string;
  output?: string;
  sends?: Array<{ returnId: string; amount: number }>;
}

export interface TemplateReturnTrack {
  id: string;
  name: string;
  color?: string;
  devices?: TemplateDevice[];
}

export interface TemplateMasterTrack {
  devices?: TemplateDevice[];
}

export interface TemplateDevice {
  type: string;
  preset?: string;
  parameters?: Record<string, number>;
}

export interface TemplateScene {
  id: string;
  name: string;
  color?: string;
  tempo?: number;
  timeSignature?: { numerator: number; denominator: number };
}

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: Date;
  thumbnail?: string;
  duration?: number;
  trackCount: number;
  tempo: number;
  fileSize: number;
}

export interface TemplateManagerOptions {
  storage: TemplateStorage;
  maxRecentProjects: number;
  builtInTemplates: ProjectTemplate[];
}

export interface TemplateStorage {
  loadTemplates(): Promise<ProjectTemplate[]>;
  saveTemplates(templates: ProjectTemplate[]): Promise<void>;
  loadRecentProjects(): Promise<RecentProject[]>;
  saveRecentProjects(projects: RecentProject[]): Promise<void>;
  loadDefaultTemplateId(): Promise<string | null>;
  saveDefaultTemplateId(id: string): Promise<void>;
}

// ============================================================================
// Template Manager
// ============================================================================

export interface TemplateManager {
  // Template CRUD
  getAllTemplates(): Promise<ProjectTemplate[]>;
  getTemplatesByCategory(category: TemplateCategory): Promise<ProjectTemplate[]>;
  getTemplate(id: string): Promise<ProjectTemplate | null>;
  createTemplate(
    name: string,
    data: ProjectTemplateData,
    options?: Partial<{
      description: string;
      category: TemplateCategory;
      tags: string[];
    }>
  ): Promise<ProjectTemplate>;
  updateTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate>;
  deleteTemplate(id: string): Promise<boolean>;
  
  // Default template
  getDefaultTemplate(): Promise<ProjectTemplate>;
  setDefaultTemplate(templateId: string): Promise<void>;
  
  // Recent projects
  getRecentProjects(limit?: number): Promise<RecentProject[]>;
  addRecentProject(project: Omit<RecentProject, 'lastOpened'>): Promise<void>;
  removeRecentProject(projectId: string): Promise<void>;
  clearRecentProjects(): Promise<void>;
  pinRecentProject(projectId: string): Promise<void>;
  unpinRecentProject(projectId: string): Promise<void>;
  
  // Built-in templates
  getBuiltInTemplates(): ProjectTemplate[];
  resetToBuiltIn(templateId: string): Promise<void>;
}

export function createTemplateManager(options: TemplateManagerOptions): TemplateManager {
  const { storage, maxRecentProjects, builtInTemplates } = options;
  
  let templates: ProjectTemplate[] = [];
  let recentProjects: RecentProject[] = [];
  let initialized = false;
  
  async function initialize(): Promise<void> {
    if (initialized) return;
    
    // Load user templates
    templates = await storage.loadTemplates();
    
    // Load recent projects
    recentProjects = await storage.loadRecentProjects();
    
    initialized = true;
  }
  
  async function getAllTemplates(): Promise<ProjectTemplate[]> {
    await initialize();
    return [...builtInTemplates, ...templates];
  }
  
  async function getTemplatesByCategory(category: TemplateCategory): Promise<ProjectTemplate[]> {
    await initialize();
    const all = await getAllTemplates();
    return all.filter(t => t.category === category);
  }
  
  async function getTemplate(id: string): Promise<ProjectTemplate | null> {
    await initialize();
    
    // Check built-in first
    const builtIn = builtInTemplates.find(t => t.id === id);
    if (builtIn) return builtIn;
    
    return templates.find(t => t.id === id) || null;
  }
  
  async function createTemplate(
    name: string,
    data: ProjectTemplateData,
    opts: Partial<{
      description: string;
      category: TemplateCategory;
      tags: string[];
    }> = {}
  ): Promise<ProjectTemplate> {
    await initialize();
    
    const template: ProjectTemplate = {
      id: `template-${Date.now()}`,
      name,
      description: opts.description || '',
      category: opts.category || 'custom',
      tags: opts.tags || [],
      data,
      createdAt: new Date(),
      modifiedAt: new Date(),
      isDefault: false,
      isBuiltIn: false,
    };
    
    templates.push(template);
    await storage.saveTemplates(templates);
    
    return template;
  }
  
  async function updateTemplate(
    id: string,
    updates: Partial<ProjectTemplate>
  ): Promise<ProjectTemplate> {
    await initialize();
    
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Template not found: ${id}`);
    }
    
    templates[index] = {
      ...templates[index],
      ...updates,
      modifiedAt: new Date(),
    };
    
    await storage.saveTemplates(templates);
    return templates[index];
  }
  
  async function deleteTemplate(id: string): Promise<boolean> {
    await initialize();
    
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    templates.splice(index, 1);
    await storage.saveTemplates(templates);
    
    return true;
  }
  
  async function getDefaultTemplate(): Promise<ProjectTemplate> {
    await initialize();
    
    const defaultId = await storage.loadDefaultTemplateId();
    
    if (defaultId) {
      const template = await getTemplate(defaultId);
      if (template) return template;
    }
    
    // Return empty template as fallback
    return getEmptyTemplate();
  }
  
  async function setDefaultTemplate(templateId: string): Promise<void> {
    await initialize();
    
    // Clear isDefault flag from all templates
    for (const t of templates) {
      t.isDefault = t.id === templateId;
    }
    
    await storage.saveDefaultTemplateId(templateId);
    await storage.saveTemplates(templates);
  }
  
  async function getRecentProjects(limit = maxRecentProjects): Promise<RecentProject[]> {
    await initialize();
    return recentProjects.slice(0, limit);
  }
  
  async function addRecentProject(
    project: Omit<RecentProject, 'lastOpened'>
  ): Promise<void> {
    await initialize();
    
    // Remove if already exists
    const existingIndex = recentProjects.findIndex(p => p.id === project.id);
    if (existingIndex !== -1) {
      recentProjects.splice(existingIndex, 1);
    }
    
    // Add to front
    recentProjects.unshift({
      ...project,
      lastOpened: new Date(),
    });
    
    // Trim to max
    if (recentProjects.length > maxRecentProjects) {
      recentProjects = recentProjects.slice(0, maxRecentProjects);
    }
    
    await storage.saveRecentProjects(recentProjects);
  }
  
  async function removeRecentProject(projectId: string): Promise<void> {
    await initialize();
    
    recentProjects = recentProjects.filter(p => p.id !== projectId);
    await storage.saveRecentProjects(recentProjects);
  }
  
  async function clearRecentProjects(): Promise<void> {
    await initialize();
    
    recentProjects = [];
    await storage.saveRecentProjects(recentProjects);
  }
  
  async function pinRecentProject(projectId: string): Promise<void> {
    await initialize();
    
    const project = recentProjects.find(p => p.id === projectId);
    if (project) {
      // Move to front and mark as pinned (could add pinned flag)
      recentProjects = [
        project,
        ...recentProjects.filter(p => p.id !== projectId),
      ];
      await storage.saveRecentProjects(recentProjects);
    }
  }
  
  async function unpinRecentProject(projectId: string): Promise<void> {
    // In a full implementation, this would remove the pinned status
    // For now, it's a no-op
  }
  
  function getBuiltInTemplates(): ProjectTemplate[] {
    return [...builtInTemplates];
  }
  
  async function resetToBuiltIn(templateId: string): Promise<void> {
    const builtIn = builtInTemplates.find(t => t.id === templateId);
    if (!builtIn) {
      throw new Error(`Built-in template not found: ${templateId}`);
    }
    
    // Remove user version if exists
    const userIndex = templates.findIndex(t => t.id === templateId);
    if (userIndex !== -1) {
      templates.splice(userIndex, 1);
      await storage.saveTemplates(templates);
    }
  }
  
  function getEmptyTemplate(): ProjectTemplate {
    return {
      id: 'empty',
      name: 'Empty Project',
      category: 'empty',
      tags: ['empty', 'minimal'],
      data: {
        tempo: 120,
        timeSignature: { numerator: 4, denominator: 4 },
        tracks: [],
        returnTracks: [
          { id: 'return-a', name: 'A-Reverb' },
          { id: 'return-b', name: 'B-Delay' },
        ],
        masterTrack: {},
      },
      createdAt: new Date(),
      modifiedAt: new Date(),
      isDefault: false,
      isBuiltIn: true,
    };
  }
  
  return {
    getAllTemplates,
    getTemplatesByCategory,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getDefaultTemplate,
    setDefaultTemplate,
    getRecentProjects,
    addRecentProject,
    removeRecentProject,
    clearRecentProjects,
    pinRecentProject,
    unpinRecentProject,
    getBuiltInTemplates,
    resetToBuiltIn,
  };
}

// ============================================================================
// Built-in Templates
// ============================================================================

export const BUILT_IN_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'empty',
    name: 'Empty Project',
    category: 'empty',
    tags: ['empty', 'minimal'],
    data: {
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [],
      returnTracks: [
        { id: 'return-a', name: 'A-Reverb' },
        { id: 'return-b', name: 'B-Delay' },
      ],
      masterTrack: {},
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isDefault: false,
    isBuiltIn: true,
  },
  {
    id: 'electronic-basic',
    name: 'Electronic - Basic',
    description: 'Basic setup for electronic music production',
    category: 'electronic',
    tags: ['electronic', 'edm', 'house', 'techno'],
    data: {
      tempo: 128,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        { id: 'kick', name: 'Kick', type: 'audio', color: '#FF4444' },
        { id: 'snare', name: 'Snare', type: 'audio', color: '#FF8844' },
        { id: 'hihat', name: 'Hi-Hat', type: 'audio', color: '#FFAA44' },
        { id: 'bass', name: 'Bass', type: 'instrument', color: '#44FF44' },
        { id: 'synth', name: 'Synth', type: 'instrument', color: '#4444FF' },
        { id: 'pad', name: 'Pad', type: 'instrument', color: '#8844FF' },
      ],
      returnTracks: [
        { id: 'return-a', name: 'A-Reverb', devices: [{ type: 'Reverb' }] },
        { id: 'return-b', name: 'B-Delay', devices: [{ type: 'Delay' }] },
      ],
      masterTrack: {
        devices: [{ type: 'Limiter' }],
      },
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isDefault: false,
    isBuiltIn: true,
  },
  {
    id: 'hiphop-basic',
    name: 'Hip-Hop - Basic',
    description: 'Basic setup for hip-hop production',
    category: 'hip-hop',
    tags: ['hip-hop', 'rap', 'boom-bap', 'trap'],
    data: {
      tempo: 90,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        { id: 'drums', name: 'Drum Rack', type: 'instrument', color: '#FF4444' },
        { id: 'bass', name: 'Bass', type: 'instrument', color: '#44FF44' },
        { id: 'sample', name: 'Sample', type: 'audio', color: '#FFAA44' },
        { id: 'melody', name: 'Melody', type: 'instrument', color: '#4444FF' },
      ],
      returnTracks: [
        { id: 'return-a', name: 'A-Reverb' },
        { id: 'return-b', name: 'B-Delay' },
      ],
      masterTrack: {
        devices: [{ type: 'GlueCompressor' }, { type: 'Limiter' }],
      },
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isDefault: false,
    isBuiltIn: true,
  },
  {
    id: 'rock-basic',
    name: 'Rock - Basic',
    description: 'Basic setup for rock band recording',
    category: 'rock',
    tags: ['rock', 'band', 'live'],
    data: {
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        { id: 'drums', name: 'Drums', type: 'audio', color: '#FF4444' },
        { id: 'bass', name: 'Bass', type: 'audio', color: '#44FF44' },
        { id: 'guitar-r', name: 'Guitar (R)', type: 'audio', color: '#FFAA44' },
        { id: 'guitar-l', name: 'Guitar (L)', type: 'audio', color: '#FFAA44' },
        { id: 'vox', name: 'Vocals', type: 'audio', color: '#4444FF' },
      ],
      returnTracks: [
        { id: 'return-a', name: 'A-Reverb' },
        { id: 'return-b', name: 'B-Delay' },
      ],
      masterTrack: {},
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isDefault: false,
    isBuiltIn: true,
  },
  {
    id: 'sound-design',
    name: 'Sound Design',
    description: 'Setup for sound design and FX creation',
    category: 'sound-design',
    tags: ['sound-design', 'fx', 'sfx', 'audio-post'],
    data: {
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      tracks: [
        { id: 'sampler', name: 'Sampler', type: 'instrument' },
        { id: 'collision', name: 'Collision', type: 'instrument' },
        { id: 'granular', name: 'Granular', type: 'instrument' },
        { id: 'resampling', name: 'Resampling', type: 'audio' },
      ],
      returnTracks: [
        { id: 'return-a', name: 'A-Reverb' },
        { id: 'return-b', name: 'B-Delay' },
        { id: 'return-c', name: 'C-Resample' },
      ],
      masterTrack: {
        devices: [{ type: 'Utility' }, { type: 'Spectrum' }],
      },
    },
    createdAt: new Date(),
    modifiedAt: new Date(),
    isDefault: false,
    isBuiltIn: true,
  },
];
