# @daw/ui-shell

Application shell for the In-Browser DAW. Provides panel layout system, command palette, keyboard shortcuts, and the main application chrome.

## Installation

```bash
pnpm add @daw/ui-shell
```

## Usage

### App Component

The main application component that initializes the DAW:

```tsx
import { App } from '@daw/ui-shell';
import { ArrangeView } from '@daw/ui-arrange';
import { Mixer } from '@daw/ui-mixer';

function MyApp() {
  return (
    <App
      initialProject={project}
      onProjectChange={handleSave}
      arrangeView={<ArrangeView />}
      mixerView={<Mixer />}
      features={{
        browser: true,
        inspector: true,
        codeEditor: true,
        commandPalette: true,
      }}
    />
  );
}
```

### Panel Layout

Flexible panel layout with resizable sidebars:

```tsx
import { PanelLayout } from '@daw/ui-shell';

<PanelLayout
  left={<BrowserPanel />}
  right={<InspectorPanel />}
  bottom={<CodePanel />}
  center={<ArrangeView />}
  initialLeftWidth={240}
  initialRightWidth={280}
/>
```

### Command Palette

Searchable command interface:

```tsx
import { CommandPalette, CommandRegistry } from '@daw/ui-shell';

const registry = new CommandRegistry();

registry.register({
  id: 'file.save',
  name: 'Save Project',
  shortcut: 'mod+s',
  category: 'File',
  handler: () => saveProject(),
});

<CommandPalette
  isOpen={showPalette}
  onClose={() => setShowPalette(false)}
  registry={registry}
/>
```

### Keyboard Shortcuts

Global shortcut management:

```tsx
import { ShortcutProvider, useShortcut, useShortcuts } from '@daw/ui-shell';

// Single shortcut
useShortcut({
  id: 'play',
  key: 'space',
  handler: () => transport.play(),
});

// Multiple shortcuts
useShortcuts({
  shortcuts: [
    { id: 'play', key: 'space', handler: () => transport.play() },
    { id: 'stop', key: 'esc', handler: () => transport.stop() },
  ],
});
```

### Browser Panel

Sample and preset browser:

```tsx
import { BrowserPanel } from '@daw/ui-shell';

<BrowserPanel
  categories={[
    {
      id: 'samples',
      name: 'Samples',
      icon: '🎵',
      items: [
        { id: 'kick', name: 'Kick.wav', type: 'sample' },
        { id: 'snare', name: 'Snare.wav', type: 'sample' },
      ],
    },
  ]}
  onSelect={(item) => loadSample(item.id)}
  onDragStart={(item) => setDraggedItem(item)}
/>
```

### Inspector Panel

Properties inspector for selections:

```tsx
import { InspectorPanel } from '@daw/ui-shell';

<InspectorPanel
  selection={{
    type: 'track',
    track: selectedTrack,
  }}
  onPropertyChange={(prop, value) => updateTrack(prop, value)}
/>
```

### Code Panel

Script editor for code-to-music workflow:

```tsx
import { CodePanel } from '@daw/ui-shell';

<CodePanel
  initialScripts={[{ id: 'main', name: 'main.ts', content: script }]}
  onExecute={async (id, content) => {
    const result = await compileAndRun(content);
    return result;
  }}
/>
```

## API Reference

### Components

- `App` - Main application component
- `PanelLayout` - Resizable panel layout
- `Panel` - Individual panel container
- `PanelGroup` - Group of resizable panels
- `BrowserPanel` - Sample/preset browser
- `InspectorPanel` - Properties inspector
- `CodePanel` - Script editor
- `CommandPalette` - Searchable command interface
- `ShortcutProvider` - Shortcut context provider

### Hooks

- `useTheme()` - Access current theme
- `usePanelLayout()` - Manage panel layout state
- `useCommands()` - Work with command registry
- `useShortcuts()` - Register multiple shortcuts
- `useShortcut()` - Register single shortcut
- `useShortcutContext()` - Access shortcut manager

### Classes

- `CommandRegistry` - Central command registry
- `ShortcutManager` - Keyboard shortcut manager

### Theme

- `DAW_COLORS` - Color palette
- `DAW_TYPOGRAPHY` - Typography scale
- `DAW_SPACING` - Spacing scale
- `defaultTheme` - Complete default theme
- `generateCSSVariables()` - Generate CSS custom properties

## Theme Customization

```tsx
import { ThemeProvider, DAW_COLORS } from '@daw/ui-shell';

const customTheme = {
  ...defaultTheme,
  colors: {
    ...DAW_COLORS,
    accentBlue: '#60a5fa',
  },
};

<ThemeProvider value={customTheme}>
  <App />
</ThemeProvider>
```

## License

MIT
