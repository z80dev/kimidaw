/**
 * Help System
 * 
 * Integrated help browser, context-sensitive info, tutorials,
 * keyboard shortcuts reference, and onboarding flow.
 */

// ============================================================================
// Types
// ============================================================================

export interface HelpTopic {
  id: string;
  title: string;
  category: HelpCategory;
  content: string;
  relatedTopics: string[];
  shortcuts?: KeyboardShortcut[];
  lastUpdated: Date;
}

export type HelpCategory = 
  | 'getting-started'
  | 'arrangement'
  | 'session'
  | 'mixing'
  | 'instruments'
  | 'effects'
  | 'midi'
  | 'audio'
  | 'export'
  | 'preferences'
  | 'troubleshooting';

export interface HelpCategoryInfo {
  id: HelpCategory;
  name: string;
  description: string;
  icon?: string;
  topicCount: number;
}

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];
  context: ShortcutContext;
  category: ShortcutCategory;
}

export type ShortcutContext = 
  | 'global'
  | 'arrangement'
  | 'session'
  | 'piano-roll'
  | 'mixer'
  | 'browser'
  | 'detail-view';

export type ShortcutCategory = 
  | 'transport'
  | 'editing'
  | 'navigation'
  | 'view'
  | 'clip'
  | 'track'
  | 'device';

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  steps: TutorialStep[];
  completed: boolean;
  progress: number; // 0-100
}

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetElement?: string; // CSS selector for element to highlight
  action?: string; // Action user needs to take
  completed: boolean;
}

export interface InfoText {
  elementId: string;
  title: string;
  description: string;
  shortcut?: KeyboardShortcut;
  relatedTopics: string[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  image?: string;
  action?: string;
  skippable: boolean;
}

export interface HelpSearchResult {
  topic: HelpTopic;
  relevance: number;
  matchedText: string;
}

// ============================================================================
// Help System
// ============================================================================

export interface HelpSystem {
  // Help topics
  getTopics(category?: HelpCategory): HelpTopic[];
  getTopic(id: string): HelpTopic | null;
  search(query: string): HelpSearchResult[];
  getCategories(): HelpCategoryInfo[];
  
  // Info text (context-sensitive help)
  getInfoText(elementId: string): InfoText | null;
  registerInfoText(infoText: InfoText): void;
  unregisterInfoText(elementId: string): void;
  
  // Keyboard shortcuts
  getShortcuts(context?: ShortcutContext): KeyboardShortcut[];
  getShortcut(id: string): KeyboardShortcut | null;
  searchShortcuts(query: string): KeyboardShortcut[];
  getShortcutDisplay(keys: string[]): string;
  
  // Tutorials
  getTutorials(): Tutorial[];
  getTutorial(id: string): Tutorial | null;
  startTutorial(id: string): void;
  completeTutorialStep(tutorialId: string, stepId: string): void;
  resetTutorial(tutorialId: string): void;
  getTutorialProgress(tutorialId: string): number;
  
  // Onboarding
  shouldShowOnboarding(): boolean;
  getOnboardingSteps(): OnboardingStep[];
  completeOnboardingStep(stepId: string): void;
  skipOnboarding(): void;
  resetOnboarding(): void;
  
  // History
  navigateBack(): HelpTopic | null;
  navigateForward(): HelpTopic | null;
  getHistory(): string[]; // topic IDs
}

export function createHelpSystem(): HelpSystem {
  const topics = new Map<string, HelpTopic>(HELP_TOPICS.map(t => [t.id, t]));
  const infoTexts = new Map<string, InfoText>();
  const tutorials = new Map<string, Tutorial>(TUTORIALS.map(t => [t.id, t]));
  const history: string[] = [];
  let historyIndex = -1;
  
  // Load onboarding state
  let onboardingCompleted = loadOnboardingState();
  let completedOnboardingSteps = new Set<string>(loadCompletedOnboardingSteps());
  
  function getTopics(category?: HelpCategory): HelpTopic[] {
    const allTopics = Array.from(topics.values());
    if (!category) return allTopics;
    return allTopics.filter(t => t.category === category);
  }
  
  function getTopic(id: string): HelpTopic | null {
    return topics.get(id) || null;
  }
  
  function search(query: string): HelpSearchResult[] {
    const lowerQuery = query.toLowerCase();
    const results: HelpSearchResult[] = [];
    
    for (const topic of topics.values()) {
      let relevance = 0;
      let matchedText = '';
      
      // Title match (highest relevance)
      if (topic.title.toLowerCase().includes(lowerQuery)) {
        relevance += 10;
        matchedText = topic.title;
      }
      
      // Content match
      const contentIndex = topic.content.toLowerCase().indexOf(lowerQuery);
      if (contentIndex !== -1) {
        relevance += 5;
        // Extract surrounding text
        const start = Math.max(0, contentIndex - 50);
        const end = Math.min(topic.content.length, contentIndex + query.length + 50);
        matchedText = topic.content.slice(start, end);
      }
      
      if (relevance > 0) {
        results.push({ topic, relevance, matchedText });
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    return results;
  }
  
  function getCategories(): HelpCategoryInfo[] {
    const categoryMap = new Map<HelpCategory, HelpCategoryInfo>();
    
    for (const topic of topics.values()) {
      const existing = categoryMap.get(topic.category);
      if (existing) {
        existing.topicCount++;
      } else {
        categoryMap.set(topic.category, {
          id: topic.category,
          name: formatCategoryName(topic.category),
          description: getCategoryDescription(topic.category),
          topicCount: 1,
        });
      }
    }
    
    return Array.from(categoryMap.values());
  }
  
  function getInfoText(elementId: string): InfoText | null {
    return infoTexts.get(elementId) || null;
  }
  
  function registerInfoText(infoText: InfoText): void {
    infoTexts.set(infoText.elementId, infoText);
  }
  
  function unregisterInfoText(elementId: string): void {
    infoTexts.delete(elementId);
  }
  
  function getShortcuts(context?: ShortcutContext): KeyboardShortcut[] {
    let shortcuts = KEYBOARD_SHORTCUTS;
    if (context) {
      shortcuts = shortcuts.filter(s => s.context === context || s.context === 'global');
    }
    return shortcuts;
  }
  
  function getShortcut(id: string): KeyboardShortcut | null {
    return KEYBOARD_SHORTCUTS.find(s => s.id === id) || null;
  }
  
  function searchShortcuts(query: string): KeyboardShortcut[] {
    const lowerQuery = query.toLowerCase();
    return KEYBOARD_SHORTCUTS.filter(s =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.description.toLowerCase().includes(lowerQuery) ||
      s.keys.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }
  
  function getShortcutDisplay(keys: string[]): string {
    return keys.map(k => {
      // Format special keys
      if (k === 'mod') return isMac() ? '⌘' : 'Ctrl';
      if (k === 'alt') return isMac() ? '⌥' : 'Alt';
      if (k === 'shift') return '⇧';
      if (k === 'ctrl') return 'Ctrl';
      if (k.startsWith('arrow')) return k.replace('arrow', '↑').replace('up', '↑').replace('down', '↓').replace('left', '←').replace('right', '→');
      return k.charAt(0).toUpperCase() + k.slice(1);
    }).join(' + ');
  }
  
  function getTutorials(): Tutorial[] {
    return Array.from(tutorials.values());
  }
  
  function getTutorial(id: string): Tutorial | null {
    return tutorials.get(id) || null;
  }
  
  function startTutorial(id: string): void {
    const tutorial = tutorials.get(id);
    if (tutorial) {
      tutorial.progress = 0;
      for (const step of tutorial.steps) {
        step.completed = false;
      }
    }
  }
  
  function completeTutorialStep(tutorialId: string, stepId: string): void {
    const tutorial = tutorials.get(tutorialId);
    if (!tutorial) return;
    
    const step = tutorial.steps.find(s => s.id === stepId);
    if (step) {
      step.completed = true;
      updateTutorialProgress(tutorial);
    }
  }
  
  function resetTutorial(tutorialId: string): void {
    startTutorial(tutorialId);
  }
  
  function getTutorialProgress(tutorialId: string): number {
    const tutorial = tutorials.get(tutorialId);
    return tutorial?.progress || 0;
  }
  
  function updateTutorialProgress(tutorial: Tutorial): void {
    const completedSteps = tutorial.steps.filter(s => s.completed).length;
    tutorial.progress = Math.round((completedSteps / tutorial.steps.length) * 100);
    tutorial.completed = tutorial.progress === 100;
  }
  
  function shouldShowOnboarding(): boolean {
    return !onboardingCompleted;
  }
  
  function getOnboardingSteps(): OnboardingStep[] {
    return ONBOARDING_STEPS;
  }
  
  function completeOnboardingStep(stepId: string): void {
    completedOnboardingSteps.add(stepId);
    saveCompletedOnboardingSteps(Array.from(completedOnboardingSteps));
    
    // Check if all steps completed
    if (completedOnboardingSteps.size === ONBOARDING_STEPS.length) {
      onboardingCompleted = true;
      saveOnboardingState(true);
    }
  }
  
  function skipOnboarding(): void {
    onboardingCompleted = true;
    saveOnboardingState(true);
  }
  
  function resetOnboarding(): void {
    onboardingCompleted = false;
    completedOnboardingSteps.clear();
    saveOnboardingState(false);
    saveCompletedOnboardingSteps([]);
  }
  
  function navigateBack(): HelpTopic | null {
    if (historyIndex > 0) {
      historyIndex--;
      return topics.get(history[historyIndex]) || null;
    }
    return null;
  }
  
  function navigateForward(): HelpTopic | null {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      return topics.get(history[historyIndex]) || null;
    }
    return null;
  }
  
  function getHistory(): string[] {
    return [...history];
  }
  
  // Helper functions
  function isMac(): boolean {
    return typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  }
  
  function formatCategoryName(category: HelpCategory): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  function getCategoryDescription(category: HelpCategory): string {
    const descriptions: Record<HelpCategory, string> = {
      'getting-started': 'Learn the basics of using the DAW',
      'arrangement': 'Working with the arrangement view',
      'session': 'Working with the session view',
      'mixing': 'Mixing and audio routing',
      'instruments': 'Using instruments and samplers',
      'effects': 'Using audio and MIDI effects',
      'midi': 'MIDI editing and manipulation',
      'audio': 'Audio editing and processing',
      'export': 'Exporting and rendering',
      'preferences': 'Configuration and settings',
      'troubleshooting': 'Solving common problems',
    };
    return descriptions[category];
  }
  
  // Persistence helpers (would use real storage in production)
  function loadOnboardingState(): boolean {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('daw_onboarding_completed') === 'true';
    }
    return false;
  }
  
  function saveOnboardingState(completed: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('daw_onboarding_completed', String(completed));
    }
  }
  
  function loadCompletedOnboardingSteps(): string[] {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem('daw_onboarding_steps');
      return data ? JSON.parse(data) : [];
    }
    return [];
  }
  
  function saveCompletedOnboardingSteps(steps: string[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('daw_onboarding_steps', JSON.stringify(steps));
    }
  }
  
  return {
    getTopics,
    getTopic,
    search,
    getCategories,
    getInfoText,
    registerInfoText,
    unregisterInfoText,
    getShortcuts,
    getShortcut,
    searchShortcuts,
    getShortcutDisplay,
    getTutorials,
    getTutorial,
    startTutorial,
    completeTutorialStep,
    resetTutorial,
    getTutorialProgress,
    shouldShowOnboarding,
    getOnboardingSteps,
    completeOnboardingStep,
    skipOnboarding,
    resetOnboarding,
    navigateBack,
    navigateForward,
    getHistory,
  };
}

// ============================================================================
// Static Data
// ============================================================================

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started-intro',
    title: 'Welcome to the DAW',
    category: 'getting-started',
    content: `
Welcome to your new Digital Audio Workstation! This guide will help you get started.

## Quick Start

1. **Create a new project** - Go to File > New or press Ctrl+N
2. **Add tracks** - Click the + button in the track header
3. **Add instruments** - Drag instruments from the browser to a track
4. **Record or program** - Use MIDI input or the computer keyboard
5. **Arrange** - Build your song in the arrangement view
6. **Mix** - Adjust levels, panning, and add effects
7. **Export** - Render your finished track

## Interface Overview

The interface is divided into several main areas:
- **Arrangement View** - Timeline-based editing
- **Session View** - Clip-based performance
- **Browser** - Instruments, effects, samples, and files
- **Detail View** - Device parameters and editing
- **Mixer** - Channel strips and routing
    `.trim(),
    relatedTopics: ['arrangement-view', 'session-view', 'browser'],
    shortcuts: [
      { id: 'new-project', name: 'New Project', description: 'Create new project', keys: ['mod', 'n'], context: 'global', category: 'view' },
    ],
    lastUpdated: new Date(),
  },
  {
    id: 'arrangement-view',
    title: 'Arrangement View',
    category: 'arrangement',
    content: `
The Arrangement View is where you arrange your song along a timeline.

## Navigation

- **Scroll horizontally** - Horizontal scroll or Shift+scroll
- **Zoom** - Ctrl/Cmd + scroll or use zoom controls
- **Jump to position** - Click on the time ruler

## Editing Clips

- **Select** - Click a clip
- **Multi-select** - Ctrl/Cmd + click or drag a selection box
- **Move** - Drag a clip
- **Resize** - Drag the clip edges
- **Duplicate** - Alt/Option + drag
- **Split** - Press Cmd/Ctrl + E at playhead

## Grid and Snap

Enable snapping to align clips precisely:
- Press Cmd/Ctrl + 4 to toggle grid
- Right-click the grid menu to change grid size
    `.trim(),
    relatedTopics: ['getting-started-intro', 'editing-clips', 'grid-snap'],
    shortcuts: [
      { id: 'split-clip', name: 'Split Clip', description: 'Split clip at playhead', keys: ['mod', 'e'], context: 'arrangement', category: 'editing' },
      { id: 'toggle-grid', name: 'Toggle Grid', description: 'Toggle grid snap', keys: ['mod', '4'], context: 'arrangement', category: 'view' },
    ],
    lastUpdated: new Date(),
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'getting-started',
    content: `
Master keyboard shortcuts to work faster.

## Essential Shortcuts

### Transport
- **Space** - Play/Stop
- **Return** - Stop and return to start
- **Shift + Space** - Continue play from stop point

### Navigation
- **Tab** - Switch between Arrangement and Session
- **Ctrl/Cmd + 1/2/3** - Toggle Browser, Detail View, Mixer

### Editing
- **Ctrl/Cmd + Z** - Undo
- **Ctrl/Cmd + Shift + Z** - Redo
- **Ctrl/Cmd + X/C/V** - Cut/Copy/Paste
- **Delete** - Delete selection
- **Ctrl/Cmd + D** - Duplicate

### Recording
- **F9** - Enable record
- **F10** - Enable arrangement record
- **F12** - Enable session record
    `.trim(),
    relatedTopics: ['getting-started-intro', 'customizing-shortcuts'],
    shortcuts: [],
    lastUpdated: new Date(),
  },
];

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Transport
  { id: 'play', name: 'Play/Stop', description: 'Start or stop playback', keys: ['space'], context: 'global', category: 'transport' },
  { id: 'stop', name: 'Stop', description: 'Stop playback', keys: ['return'], context: 'global', category: 'transport' },
  { id: 'continue', name: 'Continue', description: 'Continue playback from stop point', keys: ['shift', 'space'], context: 'global', category: 'transport' },
  { id: 'record', name: 'Record', description: 'Toggle recording', keys: ['f9'], context: 'global', category: 'transport' },
  { id: 'back-to-arrangement', name: 'Back to Arrangement', description: 'Return to arrangement recording', keys: ['f10'], context: 'global', category: 'transport' },
  
  // Editing
  { id: 'undo', name: 'Undo', description: 'Undo last action', keys: ['mod', 'z'], context: 'global', category: 'editing' },
  { id: 'redo', name: 'Redo', description: 'Redo last undone action', keys: ['mod', 'shift', 'z'], context: 'global', category: 'editing' },
  { id: 'cut', name: 'Cut', description: 'Cut selection', keys: ['mod', 'x'], context: 'global', category: 'editing' },
  { id: 'copy', name: 'Copy', description: 'Copy selection', keys: ['mod', 'c'], context: 'global', category: 'editing' },
  { id: 'paste', name: 'Paste', description: 'Paste clipboard', keys: ['mod', 'v'], context: 'global', category: 'editing' },
  { id: 'duplicate', name: 'Duplicate', description: 'Duplicate selection', keys: ['mod', 'd'], context: 'global', category: 'editing' },
  { id: 'delete', name: 'Delete', description: 'Delete selection', keys: ['delete'], context: 'global', category: 'editing' },
  { id: 'select-all', name: 'Select All', description: 'Select all', keys: ['mod', 'a'], context: 'global', category: 'editing' },
  
  // Navigation
  { id: 'toggle-view', name: 'Toggle View', description: 'Switch Arrangement/Session', keys: ['tab'], context: 'global', category: 'navigation' },
  { id: 'toggle-browser', name: 'Toggle Browser', description: 'Show/hide browser', keys: ['mod', 'alt', 'b'], context: 'global', category: 'navigation' },
  { id: 'toggle-mixer', name: 'Toggle Mixer', description: 'Show/hide mixer', keys: ['mod', 'alt', 'm'], context: 'global', category: 'navigation' },
  { id: 'toggle-detail', name: 'Toggle Detail', description: 'Show/hide detail view', keys: ['mod', 'alt', 'l'], context: 'global', category: 'navigation' },
  
  // View
  { id: 'zoom-in', name: 'Zoom In', description: 'Zoom in horizontally', keys: ['mod', '+'], context: 'global', category: 'view' },
  { id: 'zoom-out', name: 'Zoom Out', description: 'Zoom out horizontally', keys: ['mod', '-'], context: 'global', category: 'view' },
  { id: 'zoom-to-selection', name: 'Zoom to Selection', description: 'Zoom to fit selection', keys: ['mod', '0'], context: 'global', category: 'view' },
  { id: 'toggle-grid', name: 'Toggle Grid', description: 'Toggle grid snap', keys: ['mod', '4'], context: 'arrangement', category: 'view' },
  
  // Clip
  { id: 'split-clip', name: 'Split', description: 'Split clip at playhead', keys: ['mod', 'e'], context: 'arrangement', category: 'clip' },
  { id: 'consolidate', name: 'Consolidate', description: 'Consolidate selection', keys: ['mod', 'j'], context: 'arrangement', category: 'clip' },
  { id: 'crop-clip', name: 'Crop', description: 'Crop clip to loop', keys: ['mod', 'shift', 'j'], context: 'arrangement', category: 'clip' },
  { id: 'freeze-track', name: 'Freeze', description: 'Freeze track', keys: ['mod', 'alt', 'f'], context: 'global', category: 'clip' },
  
  // Track
  { id: 'insert-track', name: 'Insert Track', description: 'Insert new track', keys: ['mod', 't'], context: 'global', category: 'track' },
  { id: 'insert-group', name: 'Insert Group', description: 'Insert group track', keys: ['mod', 'g'], context: 'global', category: 'track' },
  { id: 'rename', name: 'Rename', description: 'Rename selected track/clip', keys: ['mod', 'r'], context: 'global', category: 'track' },
  { id: 'arm-track', name: 'Arm', description: 'Arm selected track', keys: ['c'], context: 'arrangement', category: 'track' },
  { id: 'solo-track', name: 'Solo', description: 'Solo selected track', keys: ['s'], context: 'arrangement', category: 'track' },
  { id: 'mute-track', name: 'Mute', description: 'Mute selected track', keys: ['m'], context: 'arrangement', category: 'track' },
];

const TUTORIALS: Tutorial[] = [
  {
    id: 'first-song',
    title: 'Create Your First Song',
    description: 'Learn the basics by creating a simple song',
    difficulty: 'beginner',
    duration: 15,
    steps: [
      { id: 'step-1', title: 'Create a Project', content: 'Create a new project by going to File > New', completed: false },
      { id: 'step-2', title: 'Add a Drum Track', content: 'Add a Drum Rack from the browser and create a beat', completed: false },
      { id: 'step-3', title: 'Add a Bass', content: 'Add a bass instrument and program a bassline', completed: false },
      { id: 'step-4', title: 'Add Chords', content: 'Add a synth and program chord progression', completed: false },
      { id: 'step-5', title: 'Arrange', content: 'Arrange your clips into a song structure', completed: false },
    ],
    completed: false,
    progress: 0,
  },
  {
    id: 'recording-audio',
    title: 'Recording Audio',
    description: 'Learn how to record audio into the DAW',
    difficulty: 'beginner',
    duration: 10,
    steps: [
      { id: 'step-1', title: 'Set Up Input', content: 'Configure your audio input in preferences', completed: false },
      { id: 'step-2', title: 'Arm Track', content: 'Arm an audio track for recording', completed: false },
      { id: 'step-3', title: 'Set Levels', content: 'Adjust input gain for proper levels', completed: false },
      { id: 'step-4', title: 'Record', content: 'Press the record button to start recording', completed: false },
      { id: 'step-5', title: 'Edit', content: 'Edit your recorded audio', completed: false },
    ],
    completed: false,
    progress: 0,
  },
  {
    id: 'using-effects',
    title: 'Using Effects',
    description: 'Learn to use audio and MIDI effects',
    difficulty: 'intermediate',
    duration: 20,
    steps: [
      { id: 'step-1', title: 'Add Reverb', content: 'Add a reverb effect to a track', completed: false },
      { id: 'step-2', title: 'Use EQ', content: 'Shape the sound with EQ', completed: false },
      { id: 'step-3', title: 'Compression', content: 'Control dynamics with compression', completed: false },
      { id: 'step-4', title: 'Sends', content: 'Set up effect sends for efficient mixing', completed: false },
      { id: 'step-5', title: 'Automation', content: 'Automate effect parameters', completed: false },
    ],
    completed: false,
    progress: 0,
  },
];

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome!',
    content: 'Welcome to your new DAW! Let\'s take a quick tour to get you started.',
    skippable: true,
  },
  {
    id: 'interface',
    title: 'Interface Overview',
    content: 'The DAW is organized into views: Arrangement (timeline), Session (clips), Browser (sounds), and Mixer.',
    skippable: true,
  },
  {
    id: 'first-track',
    title: 'Create Your First Track',
    content: 'Click the + button in the track header to add your first track.',
    action: 'Add Track',
    skippable: false,
  },
  {
    id: 'add-instrument',
    title: 'Add an Instrument',
    content: 'Open the browser and drag an instrument onto your track.',
    action: 'Add Instrument',
    skippable: false,
  },
  {
    id: 'make-sound',
    title: 'Make Some Sound',
    content: 'Use your computer keyboard (A-K keys) to play notes. You can also use a MIDI controller.',
    skippable: true,
  },
  {
    id: 'done',
    title: 'You\'re Ready!',
    content: 'That\'s the basics! Check out the Help menu for tutorials and more detailed documentation.',
    skippable: true,
  },
];
