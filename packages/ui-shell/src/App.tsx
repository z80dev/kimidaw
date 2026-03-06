/**
 * Main Application Component
 * 
 * The root component for the In-Browser DAW. Handles:
 * - App initialization and capability detection
 * - Panel layout management
 * - Theme provider setup
 * - Global shortcut registration
 * - Command palette integration
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Project } from '@daw/project-schema';
import { ThemeProvider, defaultTheme } from './theme.js';
import { PanelLayout } from './layout/PanelLayout.js';
import { ShortcutProvider } from './shortcuts/index.js';
import { CommandPalette, CommandRegistry } from './commands/index.js';
import { BrowserPanel } from './panels/BrowserPanel.js';
import { InspectorPanel } from './panels/InspectorPanel.js';
import { CodePanel } from './panels/CodePanel.js';

/**
 * Props for the App component
 */
export interface AppProps {
  /** Initial project to load (optional) */
  initialProject?: Project;
  
  /** Callback when project changes */
  onProjectChange?: (project: Project) => void;
  
  /** Callback when app requests to open a file */
  onOpenFile?: () => void;
  
  /** Callback when app requests to save */
  onSave?: () => void;
  
  /** Callback when app requests export */
  onExport?: () => void;
  
  /** Additional panels to render in the layout */
  additionalPanels?: Record<string, React.ReactNode>;
  
  /** Custom arrange view component */
  arrangeView?: React.ReactNode;
  
  /** Custom mixer view component */
  mixerView?: React.ReactNode;
  
  /** Custom piano roll view component */
  pianoRollView?: React.ReactNode;
  
  /** Enable/disable features */
  features?: {
    browser?: boolean;
    inspector?: boolean;
    codeEditor?: boolean;
    commandPalette?: boolean;
  };
}

/**
 * App initialization state
 */
interface AppInitState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  capabilities?: {
    audioWorklet: boolean;
    sharedArrayBuffer: boolean;
    crossOriginIsolated: boolean;
    webMidi: boolean;
    opfs: boolean;
  };
}

/**
 * Main App component
 * 
 * @example
 * ```tsx
 * <App 
 *   initialProject={project}
 *   onProjectChange={handleSave}
 *   arrangeView={<ArrangeView />}
 *   mixerView={<MixerView />}
 * />
 * ```
 */
export function App({
  initialProject,
  onProjectChange,
  onOpenFile,
  onSave,
  onExport,
  additionalPanels = {},
  arrangeView,
  mixerView,
  pianoRollView,
  features = {
    browser: true,
    inspector: true,
    codeEditor: true,
    commandPalette: true,
  },
}: AppProps): React.ReactElement {
  const [initState, setInitState] = useState<AppInitState>({ status: 'idle' });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string>('arrange');
  const commandRegistry = useRef(new CommandRegistry()).current;
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize app and detect capabilities
  useEffect(() => {
    const initialize = async (): Promise<void> => {
      setInitState({ status: 'loading' });
      
      try {
        // Detect browser capabilities
        const capabilities = {
          audioWorklet: typeof AudioWorklet !== 'undefined',
          sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
          crossOriginIsolated: window.crossOriginIsolated ?? false,
          webMidi: typeof navigator.requestMIDIAccess === 'function',
          opfs: 'storage' in navigator && 'getDirectory' in navigator,
        };

        // Audio context initialization would happen here
        // For now we just detect capabilities
        
        setInitState({ status: 'ready', capabilities });
      } catch (error) {
        setInitState({ 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    };

    initialize();
  }, []);

  // Register global commands
  useEffect(() => {
    // File commands
    commandRegistry.register({
      id: 'file.open',
      name: 'Open Project',
      shortcut: 'mod+o',
      category: 'File',
      handler: () => onOpenFile?.(),
    });

    commandRegistry.register({
      id: 'file.save',
      name: 'Save Project',
      shortcut: 'mod+s',
      category: 'File',
      handler: () => onSave?.(),
    });

    commandRegistry.register({
      id: 'file.export',
      name: 'Export Audio',
      shortcut: 'mod+shift+e',
      category: 'File',
      handler: () => onExport?.(),
    });

    // View commands
    commandRegistry.register({
      id: 'view.arrange',
      name: 'Show Arrange View',
      shortcut: '1',
      category: 'View',
      handler: () => setActivePanel('arrange'),
    });

    commandRegistry.register({
      id: 'view.mixer',
      name: 'Show Mixer',
      shortcut: '2',
      category: 'View',
      handler: () => setActivePanel('mixer'),
    });

    commandRegistry.register({
      id: 'view.piano',
      name: 'Show Piano Roll',
      shortcut: '3',
      category: 'View',
      handler: () => setActivePanel('piano'),
    });

    commandRegistry.register({
      id: 'view.toggleBrowser',
      name: 'Toggle Browser Panel',
      shortcut: 'mod+shift+b',
      category: 'View',
      handler: () => {
        // Toggle browser visibility
      },
    });

    commandRegistry.register({
      id: 'view.toggleInspector',
      name: 'Toggle Inspector Panel',
      shortcut: 'mod+shift+i',
      category: 'View',
      handler: () => {
        // Toggle inspector visibility
      },
    });

    // Command palette
    commandRegistry.register({
      id: 'app.commandPalette',
      name: 'Command Palette',
      shortcut: 'mod+shift+p',
      category: 'App',
      handler: () => setIsCommandPaletteOpen(true),
    });

    return () => {
      commandRegistry.unregister('file.open');
      commandRegistry.unregister('file.save');
      commandRegistry.unregister('file.export');
      commandRegistry.unregister('view.arrange');
      commandRegistry.unregister('view.mixer');
      commandRegistry.unregister('view.piano');
      commandRegistry.unregister('view.toggleBrowser');
      commandRegistry.unregister('view.toggleInspector');
      commandRegistry.unregister('app.commandPalette');
    };
  }, [commandRegistry, onOpenFile, onSave, onExport]);

  // Global keyboard handler for command palette
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isCommandPaletteOpen) {
      setIsCommandPaletteOpen(false);
    }
  }, [isCommandPaletteOpen]);

  // Loading state
  if (initState.status === 'loading') {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner} />
        <div style={loadingStyles.text}>Initializing DAW...</div>
      </div>
    );
  }

  // Error state
  if (initState.status === 'error') {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.errorIcon}>⚠️</div>
        <div style={loadingStyles.text}>Failed to initialize</div>
        <div style={loadingStyles.errorMessage}>{initState.error}</div>
      </div>
    );
  }

  return (
    <ThemeProvider value={defaultTheme}>
      <ShortcutProvider>
        <div
          ref={containerRef}
          style={appStyles.container}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Transport Bar would go here */}
          
          {/* Main Panel Layout */}
          <PanelLayout
            left={features.browser ? <BrowserPanel /> : null}
            right={features.inspector ? <InspectorPanel /> : null}
            bottom={features.codeEditor ? <CodePanel /> : null}
            center={
              <div style={appStyles.centerContent}>
                {activePanel === 'arrange' && arrangeView}
                {activePanel === 'mixer' && mixerView}
                {activePanel === 'piano' && pianoRollView}
              </div>
            }
          />

          {/* Command Palette */}
          {features.commandPalette && (
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={() => setIsCommandPaletteOpen(false)}
              registry={commandRegistry}
            />
          )}

          {/* Capability Warning */}
          {initState.capabilities && !initState.capabilities.audioWorklet && (
            <div style={appStyles.warningBanner}>
              ⚠️ AudioWorklet not available. Audio playback may be limited.
            </div>
          )}
        </div>
      </ShortcutProvider>
    </ThemeProvider>
  );
}

// Styles
const appStyles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: DAW_COLORS.bgDark,
    color: DAW_COLORS.textPrimary,
    fontFamily: DAW_TYPOGRAPHY.fontFamilySans,
    fontSize: DAW_TYPOGRAPHY.sizeBase,
    overflow: 'hidden',
    outline: 'none',
  },
  centerContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  warningBanner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '8px 16px',
    backgroundColor: DAW_COLORS.warning,
    color: DAW_COLORS.bgDark,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    textAlign: 'center',
    zIndex: DAW_Z_INDEX.overlay,
  },
};

const loadingStyles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DAW_COLORS.bgDark,
    color: DAW_COLORS.textPrimary,
    fontFamily: DAW_TYPOGRAPHY.fontFamilySans,
    gap: '16px',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: `3px solid ${DAW_COLORS.borderDefault}`,
    borderTopColor: DAW_COLORS.accentBlue,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  text: {
    fontSize: DAW_TYPOGRAPHY.sizeMd,
    color: DAW_COLORS.textSecondary,
  },
  errorIcon: {
    fontSize: '48px',
  },
  errorMessage: {
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    color: DAW_COLORS.error,
    maxWidth: '400px',
    textAlign: 'center',
  },
};

// Import for styles
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_Z_INDEX } from './theme.js';
