/**
 * @daw/ui-shell
 * 
 * Application shell for the In-Browser DAW.
 * Provides panel layout system, command palette, keyboard shortcuts,
 * and the main application chrome.
 * 
 * @module @daw/ui-shell
 */

// Main app component
export { App, type AppProps } from './App.js';

// Layout system
export {
  PanelLayout,
  Panel,
  PanelGroup,
  type PanelLayoutProps,
  type PanelProps,
  type PanelGroupProps,
  type PanelOrientation,
  type PanelSize,
} from './layout/index.js';

// Panel components
export {
  BrowserPanel,
  InspectorPanel,
  CodePanel,
  type BrowserPanelProps,
  type InspectorPanelProps,
  type CodePanelProps,
  type BrowserCategory,
  type BrowserItem,
} from './panels/index.js';

// Command palette
export {
  CommandPalette,
  CommandRegistry,
  useCommands,
  type Command,
  type CommandPaletteProps,
  type CommandRegistryOptions,
  type CommandContext,
} from './commands/index.js';

// Keyboard shortcuts
export {
  ShortcutManager,
  ShortcutProvider,
  useShortcuts,
  useShortcut,
  type Shortcut,
  type ShortcutBinding,
  type ShortcutManagerOptions,
  type ShortcutContext,
} from './shortcuts/index.js';

// Theme and styling
export {
  ThemeProvider,
  useTheme,
  DAW_COLORS,
  DAW_TYPOGRAPHY,
  DAW_SPACING,
  type Theme,
  type ThemeColors,
} from './theme.js';

// Help system
export {
  createHelpSystem,
} from './help/index.js';

export type {
  HelpTopic,
  HelpCategory,
  HelpCategoryInfo,
  KeyboardShortcut,
  ShortcutContext,
  ShortcutCategory,
  Tutorial,
  TutorialStep,
  InfoText,
  OnboardingStep,
  HelpSearchResult,
  HelpSystem,
} from './help/index.js';
