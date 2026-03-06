/**
 * CodeEditor Component
 * 
 * Monaco Editor integration for the music scripting system.
 * 
 * Features:
 * - TypeScript syntax highlighting and IntelliSense
 * - Error diagnostics display
 * - Run/preview controls
 * - Auto-save with debouncing
 * - Theme support
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

// TypeScript types for Monaco (these would come from @monaco-editor/loader in a real app)
interface MonacoEditor {
  editor: {
    create: (container: HTMLElement, options: EditorOptions) => MonacoEditorInstance;
    setTheme: (theme: string) => void;
    defineTheme: (name: string, theme: EditorTheme) => void;
  };
  languages: {
    typescript: {
      typescriptDefaults: {
        setCompilerOptions: (options: unknown) => void;
        addExtraLib: (content: string, filePath?: string) => void;
      };
      ScriptTarget: Record<string, number>;
      ModuleKind: Record<string, number>;
    };
  };
}

interface MonacoEditorInstance {
  getValue: () => string;
  setValue: (value: string) => void;
  onDidChangeModelContent: (callback: () => void) => { dispose: () => void };
  onDidChangeCursorPosition: (callback: (e: unknown) => void) => { dispose: () => void };
  setModelMarkers: (model: unknown, owner: string, markers: EditorMarker[]) => void;
  getModel: () => unknown;
  dispose: () => void;
  focus: () => void;
  layout: () => void;
  trigger: (source: string | null, handler: string, payload?: unknown) => void;
  addAction: (action: EditorAction) => void;
  addCommand: (keybinding: number, handler: () => void, context?: string) => void;
}

interface EditorOptions {
  value?: string;
  language?: string;
  theme?: string;
  automaticLayout?: boolean;
  minimap?: { enabled: boolean };
  scrollBeyondLastLine?: boolean;
  fontSize?: number;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  folding?: boolean;
  renderWhitespace?: 'none' | 'boundary' | 'selection' | 'all';
  tabSize?: number;
  insertSpaces?: boolean;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  quickSuggestions?: boolean;
  suggestOnTriggerCharacters?: boolean;
}

interface EditorTheme {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

interface EditorMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: 1 | 4 | 8; // Error = 8, Warning = 4, Info = 2, Hint = 1
  code?: string;
  source?: string;
}

interface EditorAction {
  id: string;
  label: string;
  keybindings?: number[];
  precondition?: string;
  keybindingContext?: string;
  contextMenuGroupId?: string;
  contextMenuOrder?: number;
  run: (editor: MonacoEditorInstance) => void | Promise<void>;
}

// Scripting API type definitions for IntelliSense
const SCRIPTING_API_TYPES = `
declare module '@daw/scripting-api' {
  export interface MusicScriptContext {
    readonly projectId: string;
    readonly seed: string;
    readonly ppq: number;
    readonly sampleRate: number;
    tempoMap(): TempoEvent[];
    scale(root: string, mode: string): Scale;
    chord(symbol: string): number[];
    pattern(): PatternBuilder;
    clip(name: string): ClipBuilder;
    automation(target: AutomationTarget): AutomationBuilder;
    rand(seed?: string): PRNG;
    euclidean(steps: number, pulses: number, rotation?: number): number[];
    humanize<T extends NoteEvent>(events: T[], opts: HumanizeOptions): T[];
    velCurve(kind: "linear" | "exp" | "log", amount: number): VelocityFn;
    instrument(ref: string): InstrumentRef;
    sample(ref: string): SampleRef;
    scene(name: string): SceneBuilder;
    section(name: string, bars: number): SectionBuilder;
    barsToTicks(bars: number): number;
    beatsToTicks(beats: number): number;
    ticksToSeconds(ticks: number, tempo?: number): number;
    secondsToTicks(seconds: number, tempo?: number): number;
  }

  export interface PRNG {
    next(): number;
    range(min: number, max: number): number;
    int(min: number, max: number): number;
    bool(probability?: number): boolean;
    pick<T>(array: readonly T[]): T;
    shuffle<T>(array: readonly T[]): T[];
    normal(mean?: number, stdDev?: number): number;
    fork(seed?: string): PRNG;
    getState(): number;
    setState(state: number): void;
  }

  export interface Scale {
    root: string;
    mode: string;
    notes: number[];
    intervals: number[];
  }

  export interface PatternBuilder {
    length(steps: number): this;
    steps(count: number): this;
    subdiv(division: number): this;
    euclidean(pulses: number, rotation?: number): this;
    fromArray(pattern: number[]): this;
    preset(name: 'tresillo' | 'cinquillo' | 'bossaNova' | 'gahu' | 'sonClave' | 'rumbaClave' | 'rockKick' | 'rockSnare' | 'fourOnFloor' | 'offbeatHihat'): this;
    fill(): this;
    clear(): this;
    every(n: number, offset?: number): this;
    velocity(base: number, variance?: number): this;
    accent(stepIndices: number[], accentVelocity: number, normalVelocity?: number): this;
    probability(prob: number): this;
    humanize(amount: number): this;
    swing(amount: number, every?: number): this;
    rotate(amount: number): this;
    reverse(): this;
    invert(): this;
    and(other: PatternBuilder | number[]): this;
    or(other: PatternBuilder | number[]): this;
    build(): Pattern;
    buildPattern(): number[];
    toNotes(noteNumber: number, startTick: number, stepDuration: number, durationTicks?: number): NoteEvent[];
    getOnsets(startTick: number, stepDuration: number): number[];
  }

  export interface ClipBuilder {
    midi(): this;
    audio(sample: SampleRef): this;
    hybrid(instrument: InstrumentRef): this;
    note(note: string | number, startTick: number, duration: number, velocity?: number): this;
    notes(noteEvents: NoteEvent[]): this;
    fromPattern(pattern: PatternBuilder, noteOrNotes: string | number | (string | number)[], startTick: number, stepDuration: number, noteDuration?: number): this;
    chord(root: string | number, intervals: number[], startTick: number, duration: number, velocity?: number): this;
    arpeggio(notes: number[], startTick: number, stepDuration: number, pattern?: 'up' | 'down' | 'updown' | 'random', velocity?: number): this;
    quantize(scale: Scale): this;
    transpose(semitones: number): this;
    velocityCurve(curve: VelocityFn): this;
    setVelocity(velocity: number): this;
    humanize(timing?: number, velocity?: number, duration?: number): this;
    reverse(): this;
    invert(centerNote: number): this;
    duration(ticks: number): this;
    bars(count: number, ppq?: number): this;
    loop(enabled: boolean, startTick?: number, endTick?: number): this;
    cc(controller: number, value: number, tick: number, channel?: number): this;
    ccRamp(controller: number, fromValue: number, toValue: number, startTick: number, endTick: number, steps?: number): this;
    pitchBend(value: number, tick: number, channel?: number): this;
    pressure(pressure: number, tick: number, channel?: number): this;
    build(): MidiClip | AudioClip | HybridGeneratedClip;
    buildMidi(): MidiClip;
  }

  export interface AutomationBuilder {
    point(tick: number, value: number, curve?: 'step' | 'linear' | 'bezier'): this;
    ramp(fromTick: number, fromValue: number, toTick: number, toValue: number): this;
    step(tick: number, value: number): this;
    lfo(startTick: number, duration: number, minValue: number, maxValue: number, cycles: number, shape?: 'sine' | 'triangle' | 'saw' | 'square', pointsPerCycle?: number): this;
    randomWalk(startTick: number, duration: number, minValue: number, maxValue: number, steps: number, smooth?: boolean): this;
    build(): { target: AutomationTarget; points: AutomationPoint[] };
  }

  export interface SceneBuilder {
    addClip(trackId: string, clipId: string, launchQuantization?: number): this;
    setTempo(tempo: number): this;
    setTimeSignature(numerator: number, denominator: number): this;
    build(row: number): GeneratedScene;
  }

  export interface SectionBuilder {
    at(tick: number): this;
    addClip(clipBuilder: ClipBuilder): this;
    addAutomation(automationBuilder: AutomationBuilder): this;
    build(): GeneratedSection;
  }

  export interface NoteEvent {
    note: number;
    velocity: number;
    startTick: number;
    duration: number;
    channel?: number;
  }

  export interface Pattern {
    length: number;
    steps: Array<{ active: boolean; velocity: number; probability: number; timingOffset: number }>;
    division: number;
  }

  export interface MidiClip {
    type: 'midi';
    id: string;
    name: string;
    startTick: number;
    endTick: number;
    notes: NoteEvent[];
    cc: CCEvent[];
    pitchBend: PitchBendEvent[];
    channelPressure: ChannelPressureEvent[];
    loop?: { startTick: number; endTick: number };
  }

  export interface AudioClip {
    type: 'audio';
    id: string;
    name: string;
    startTick: number;
    endTick: number;
    assetId: string;
    sourceStartSample: number;
    sourceEndSample: number;
    gainDb: number;
    transposeSemitones: number;
  }

  export interface HybridGeneratedClip {
    type: 'hybrid';
    id: string;
    name: string;
    startTick: number;
    endTick: number;
    midiData: Omit<MidiClip, 'type'>;
    audioData?: Partial<AudioClip>;
  }

  export interface CCEvent {
    controller: number;
    value: number;
    tick: number;
    channel?: number;
  }

  export interface PitchBendEvent {
    value: number;
    tick: number;
    channel?: number;
  }

  export interface ChannelPressureEvent {
    pressure: number;
    tick: number;
    channel?: number;
  }

  export interface AutomationTarget {
    scope: 'track' | 'plugin' | 'send' | 'instrument' | 'macro';
    ownerId: string;
    paramId: string;
  }

  export interface AutomationPoint {
    tick: number;
    value: number;
    curve: 'step' | 'linear' | 'bezier';
  }

  export interface GeneratedScene {
    name: string;
    row: number;
    clips: Array<{ trackId: string; clipId: string; launchQuantization?: number }>;
    tempo?: number;
    timeSignature?: [number, number];
  }

  export interface GeneratedSection {
    name: string;
    startTick: number;
    durationTicks: number;
    clips: GeneratedClip[];
    automation: GeneratedAutomation[];
  }

  export interface GeneratedClip {
    trackId: string;
    clip: MidiClip | AudioClip | HybridGeneratedClip;
    provenance: {
      scriptId: string;
      hash: string;
      seed: string;
      generatedAt: number;
    };
  }

  export interface GeneratedAutomation {
    target: AutomationTarget;
    points: AutomationPoint[];
    provenance: {
      scriptId: string;
      hash: string;
      seed: string;
      generatedAt: number;
    };
  }

  export interface InstrumentRef {
    id: string;
    type: 'builtin' | 'plugin' | 'sample';
    name: string;
  }

  export interface SampleRef {
    id: string;
    path: string;
    name: string;
  }

  export interface HumanizeOptions {
    timing?: number;
    velocity?: number;
    duration?: number;
    preserveAccents?: boolean;
  }

  export type VelocityFn = (input: number, position: number) => number;

  export interface TempoEvent {
    tick: number;
    bpm: number;
    curve: 'jump' | 'ramp';
  }

  export interface ScriptModuleResult {
    clips: GeneratedClip[];
    automation: GeneratedAutomation[];
    scenes?: GeneratedScene[];
    diagnostics?: ScriptDiagnostic[];
  }

  export interface ScriptDiagnostic {
    level: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    line?: number;
    column?: number;
    code?: string;
    source?: string;
  }

  // Factory functions
  export function createContext(options: {
    projectId: string;
    seed: string;
    ppq?: number;
    sampleRate?: number;
    tempoMap?: TempoEvent[];
  }): MusicScriptContext;

  export function createPRNG(seed: string): PRNG;
  export function pattern(options?: { steps?: number; division?: number; seed?: PRNG }): PatternBuilder;
  export function clip(name: string, options?: { type?: 'midi' | 'audio' | 'hybrid'; seed?: PRNG }): ClipBuilder;
  export function scale(root: string, mode: string): Scale;
  export function chord(symbol: string): number[];
  export function euclidean(steps: number, pulses: number, rotation?: number): number[];
}

declare const ctx: import('@daw/scripting-api').MusicScriptContext;
`;

// Editor props
export interface CodeEditorProps {
  /** Initial code value */
  value?: string;
  /** Called when code changes */
  onChange?: (value: string) => void;
  /** Called when user runs the script */
  onRun?: (value: string) => void;
  /** Called when user wants to preview */
  onPreview?: (value: string) => void;
  /** Editor theme */
  theme?: 'vs' | 'vs-dark' | 'hc-black';
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Editor height */
  height?: string | number;
  /** Read only mode */
  readOnly?: boolean;
  /** Auto-save delay in ms */
  autoSaveDelay?: number;
  /** Markers to display (errors/warnings) */
  markers?: Array<{
    line: number;
    column: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    code?: string;
  }>;
  /** Loading state */
  loading?: boolean;
  /** Additional class name */
  className?: string;
}

// Default starter code
const DEFAULT_CODE = `// Music Script Template
// This script generates musical content using the DAW scripting API

export default function generate(ctx) {
  // Create a drum pattern
  const kickPattern = ctx.pattern()
    .steps(16)
    .euclidean(4)
    .velocity(100, 10)
    .build();
  
  // Create clips
  const kickClip = ctx.clip('kick')
    .midi()
    .fromPattern(kickPattern, 'C1', 0, 240)
    .build();
  
  return {
    clips: [{
      trackId: 'drums',
      clip: kickClip,
      provenance: {
        scriptId: 'template',
        hash: '',
        seed: ctx.seed,
        generatedAt: Date.now(),
      },
    }],
    automation: [],
  };
}
`;

/**
 * CodeEditor Component
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  value = DEFAULT_CODE,
  onChange,
  onRun,
  onPreview,
  theme = 'vs-dark',
  showLineNumbers = true,
  height = '100%',
  readOnly = false,
  autoSaveDelay = 1000,
  markers = [],
  loading = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoEditor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Monaco editor
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;
    if (editorRef.current) return;

    // In a real implementation, this would load Monaco from CDN or npm
    // For this example, we simulate the initialization
    const initEditor = async () => {
      try {
        // Simulate loading Monaco
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create mock Monaco instance
        const mockMonaco: MonacoEditor = {
          editor: {
            create: (container, options) => {
              const mockEditor: MonacoEditorInstance = {
                getValue: () => options.value || '',
                setValue: (v) => { if (options.value !== undefined) options.value = v; },
                onDidChangeModelContent: (cb) => { 
                  // Store callback for later use
                  return { dispose: () => {} };
                },
                onDidChangeCursorPosition: () => ({ dispose: () => {} }),
                setModelMarkers: () => {},
                getModel: () => ({}),
                dispose: () => {},
                focus: () => {},
                layout: () => {},
                trigger: () => {},
                addAction: () => {},
                addCommand: () => {},
              };
              return mockEditor;
            },
            setTheme: () => {},
            defineTheme: () => {},
          },
          languages: {
            typescript: {
              typescriptDefaults: {
                setCompilerOptions: () => {},
                addExtraLib: () => {},
              },
              ScriptTarget: { ES2020: 7, ES2022: 9 },
              ModuleKind: { ESNext: 99, CommonJS: 1 },
            },
          },
        };

        monacoRef.current = mockMonaco;

        // Configure TypeScript
        mockMonaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: mockMonaco.languages.typescript.ScriptTarget.ES2020,
          module: mockMonaco.languages.typescript.ModuleKind.ESNext,
          allowNonTsExtensions: true,
          strict: true,
          noImplicitAny: true,
        });

        // Add scripting API types
        mockMonaco.languages.typescript.typescriptDefaults.addExtraLib(
          SCRIPTING_API_TYPES,
          '@daw/scripting-api.d.ts'
        );

        // Create editor
        if (containerRef.current) {
          const editor = mockMonaco.editor.create(containerRef.current, {
            value,
            language: 'typescript',
            theme,
            automaticLayout: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: showLineNumbers ? 'on' : 'off',
            folding: true,
            renderWhitespace: 'selection',
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
          });

          editorRef.current = editor;
          setIsReady(true);

          // Set up change listener
          const disposable = editor.onDidChangeModelContent(() => {
            setHasChanges(true);
            
            // Auto-save
            if (autoSaveTimerRef.current) {
              clearTimeout(autoSaveTimerRef.current);
            }
            
            autoSaveTimerRef.current = setTimeout(() => {
              const newValue = editor.getValue();
              onChange?.(newValue);
              setHasChanges(false);
            }, autoSaveDelay);
          });

          // Add keyboard shortcuts
          editor.addCommand(2048 | 3, () => { // Ctrl/Cmd + Enter
            const currentValue = editor.getValue();
            onRun?.(currentValue);
          });

          // Add actions
          editor.addAction({
            id: 'run-script',
            label: 'Run Script',
            keybindings: [2048 | 3], // Ctrl/Cmd + Enter
            contextMenuGroupId: '1_modification',
            run: () => {
              const currentValue = editor.getValue();
              onRun?.(currentValue);
            },
          });

          editor.addAction({
            id: 'preview-script',
            label: 'Preview Script',
            keybindings: [2048 | 80], // Ctrl/Cmd + Shift + Enter
            contextMenuGroupId: '1_modification',
            run: () => {
              const currentValue = editor.getValue();
              onPreview?.(currentValue);
            },
          });

          return () => {
            disposable.dispose();
            editor.dispose();
          };
        }
      } catch (error) {
        console.error('Failed to initialize Monaco editor:', error);
      }
    };

    const cleanup = initEditor();

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      editorRef.current?.dispose();
    };
  }, []);

  // Update markers (diagnostics)
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();

    if (!model) return;

    const monacoMarkers: EditorMarker[] = markers.map(m => ({
      startLineNumber: m.line,
      startColumn: m.column || 1,
      endLineNumber: m.line,
      endColumn: m.column ? m.column + 1 : 100,
      message: m.message,
      severity: m.severity === 'error' ? 8 : m.severity === 'warning' ? 4 : 2,
      code: m.code,
    }));

    editor.setModelMarkers(model, 'script-diagnostics', monacoMarkers);
  }, [markers]);

  // Update value from props
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
      setHasChanges(false);
    }
  }, [value]);

  // Handle run action
  const handleRun = useCallback(() => {
    if (editorRef.current) {
      onRun?.(editorRef.current.getValue());
    }
  }, [onRun]);

  // Handle preview action
  const handlePreview = useCallback(() => {
    if (editorRef.current) {
      onPreview?.(editorRef.current.getValue());
    }
  }, [onPreview]);

  return (
    <div className={`code-editor ${className}`} style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div className="code-editor-toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: theme === 'vs' ? '#f0f0f0' : '#1e1e1e',
        borderBottom: `1px solid ${theme === 'vs' ? '#ddd' : '#333'}`,
      }}>
        <button
          onClick={handleRun}
          disabled={loading}
          style={{
            padding: '6px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            marginRight: '8px',
          }}
        >
          {loading ? 'Running...' : '▶ Run'}
        </button>
        
        <button
          onClick={handlePreview}
          disabled={loading}
          style={{
            padding: '6px 16px',
            backgroundColor: theme === 'vs' ? '#e0e0e0' : '#333',
            color: theme === 'vs' ? '#333' : '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            marginRight: '8px',
          }}
        >
          👁 Preview
        </button>

        <div style={{ flex: 1 }} />

        {hasChanges && (
          <span style={{
            fontSize: '12px',
            color: theme === 'vs' ? '#666' : '#999',
            marginRight: '12px',
          }}>
            Unsaved changes
          </span>
        )}

        <span style={{
          fontSize: '12px',
          color: theme === 'vs' ? '#666' : '#999',
        }}>
          Ctrl+Enter to run
        </span>
      </div>

      {/* Editor Container */}
      <div
        ref={containerRef}
        className="code-editor-container"
        style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: theme === 'vs' ? '#fff' : '#1e1e1e',
        }}
      >
        {!isReady && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: theme === 'vs' ? '#666' : '#999',
          }}>
            Loading editor...
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="code-editor-statusbar" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 12px',
        backgroundColor: theme === 'vs' ? '#007acc' : '#007acc',
        color: 'white',
        fontSize: '12px',
      }}>
        <span>TypeScript</span>
        <span style={{ marginLeft: 'auto' }}>
          {markers.filter(m => m.severity === 'error').length} errors,{' '}
          {markers.filter(m => m.severity === 'warning').length} warnings
        </span>
      </div>
    </div>
  );
};

export default CodeEditor;
