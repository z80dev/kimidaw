/**
 * Code Panel
 * 
 * Script editor container for the code-to-music workflow.
 * Integrates Monaco Editor (or a fallback) for TypeScript-based
 * music generation scripts.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DAW_COLORS, DAW_TYPOGRAPHY, DAW_SPACING } from '../theme.js';
import { Panel } from '../layout/Panel.js';

/**
 * Script tab definition
 */
export interface ScriptTab {
  id: string;
  name: string;
  content: string;
  language?: string;
  modified?: boolean;
  readOnly?: boolean;
}

/**
 * Script execution result
 */
export interface ScriptResult {
  success: boolean;
  clips?: unknown[];
  automation?: unknown[];
  diagnostics?: ScriptDiagnostic[];
  error?: string;
}

/**
 * Script diagnostic (error/warning)
 */
export interface ScriptDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

/**
 * Props for CodePanel
 */
export interface CodePanelProps {
  /** Initial scripts/tabs */
  initialScripts?: ScriptTab[];
  
  /** Currently active script ID */
  activeScriptId?: string;
  
  /** Callback when script content changes */
  onScriptChange?: (id: string, content: string) => void;
  
  /** Callback when script is executed */
  onExecute?: (id: string, content: string) => Promise<ScriptResult>;
  
  /** Callback when a new script is created */
  onCreateScript?: () => void;
  
  /** Callback when a script is closed */
  onCloseScript?: (id: string) => void;
  
  /** Callback when active script changes */
  onActiveScriptChange?: (id: string) => void;
  
  /** Whether editor is ready */
  isReady?: boolean;
  
  /** Monaco editor instance (if available) */
  editor?: unknown;
  
  /** Custom class name */
  className?: string;
}

/**
 * Default starter script template
 */
const defaultScript = `// Welcome to the Code-to-Music Editor
// Generate clips from code with deterministic results

export function generate(ctx: MusicScriptContext): ScriptModuleResult {
  const { clip, pattern, scale, chord } = ctx;
  
  // Create a 4-bar clip
  const myClip = clip('bassline')
    .duration(4)
    .notes(pattern()
      .every(1/4)
      .pitches(chord('C3', 'minor'))
      .velocity(100)
    );
  
  return {
    clips: [myClip],
    automation: [],
  };
}
`;

/**
 * Code panel component
 * 
 * @example
 * ```tsx
 * <CodePanel
 *   initialScripts={[{ id: '1', name: 'script.ts', content: defaultScript }]}
 *   onExecute={async (id, content) => {
 *     const result = await compileAndRun(content);
 *     return result;
 *   }}
 * />
 * ```
 */
export function CodePanel({
  initialScripts = [{ id: 'default', name: 'main.ts', content: defaultScript }],
  activeScriptId: controlledActiveId,
  onScriptChange,
  onExecute,
  onCreateScript,
  onCloseScript,
  onActiveScriptChange,
  isReady = true,
  className,
}: CodePanelProps): React.ReactElement {
  const [scripts, setScripts] = useState<ScriptTab[]>(initialScripts);
  const [internalActiveId, setInternalActiveId] = useState(initialScripts[0]?.id ?? '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  const activeId = controlledActiveId ?? internalActiveId;
  const activeScript = scripts.find(s => s.id === activeId);
  
  // Sync active script change
  const setActiveId = useCallback((id: string) => {
    if (!controlledActiveId) {
      setInternalActiveId(id);
    }
    onActiveScriptChange?.(id);
  }, [controlledActiveId, onActiveScriptChange]);
  
  // Handle content change
  const handleContentChange = useCallback((content: string) => {
    if (!activeScript) return;
    
    setScripts(prev => prev.map(s => 
      s.id === activeId ? { ...s, content, modified: true } : s
    ));
    
    onScriptChange?.(activeId, content);
  }, [activeId, activeScript, onScriptChange]);
  
  // Handle script execution
  const handleExecute = useCallback(async () => {
    if (!activeScript || !onExecute || isExecuting) return;
    
    setIsExecuting(true);
    setShowConsole(true);
    
    try {
      const execResult = await onExecute(activeId, activeScript.content);
      setResult(execResult);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [activeId, activeScript, onExecute, isExecuting]);
  
  // Create new script
  const handleCreateScript = useCallback(() => {
    if (onCreateScript) {
      onCreateScript();
      return;
    }
    
    const newScript: ScriptTab = {
      id: `script-${Date.now()}`,
      name: `script${scripts.length + 1}.ts`,
      content: defaultScript,
    };
    
    setScripts(prev => [...prev, newScript]);
    setActiveId(newScript.id);
  }, [onCreateScript, scripts.length, setActiveId]);
  
  // Close script
  const handleCloseScript = useCallback((id: string) => {
    if (onCloseScript) {
      onCloseScript(id);
      return;
    }
    
    setScripts(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (id === activeId && filtered.length > 0) {
        setActiveId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeId, onCloseScript, setActiveId]);
  
  // Format script
  const handleFormat = useCallback(() => {
    // Placeholder for formatting
    console.log('Format script');
  }, []);
  
  return (
    <Panel 
      title="Script Editor" 
      className={className}
      hasHeader={false}
    >
      <div style={styles.container}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <button
              style={{
                ...styles.toolbarButton,
                ...(isExecuting ? styles.toolbarButtonDisabled : {}),
              }}
              onClick={handleExecute}
              disabled={isExecuting || !isReady}
            >
              {isExecuting ? '⏳' : '▶️'} Run
            </button>
            <button style={styles.toolbarButton} onClick={handleFormat}>
              ✨ Format
            </button>
            <button
              style={{
                ...styles.toolbarButton,
                ...(showConsole ? styles.toolbarButtonActive : {}),
              }}
              onClick={() => setShowConsole(!showConsole)}
            >
              📝 Console
            </button>
          </div>
          <div style={styles.toolbarRight}>
            <button style={styles.toolbarButton} onClick={handleCreateScript}>
              + New
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div style={styles.tabs}>
          {scripts.map(script => (
            <button
              key={script.id}
              style={{
                ...styles.tab,
                ...(script.id === activeId ? styles.tabActive : {}),
              }}
              onClick={() => setActiveId(script.id)}
            >
              <span style={styles.tabName}>
                {script.modified && <span style={styles.modifiedIndicator}>● </span>}
                {script.name}
              </span>
              <span
                style={styles.tabClose}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseScript(script.id);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
        
        {/* Editor Area */}
        <div style={styles.editorContainer}>
          {!isReady ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <span>Loading editor...</span>
            </div>
          ) : activeScript ? (
            <textarea
              ref={editorRef}
              style={styles.textarea}
              value={activeScript.content}
              onChange={(e) => handleContentChange(e.target.value)}
              spellCheck={false}
              readOnly={activeScript.readOnly}
            />
          ) : (
            <div style={styles.emptyState}>No script selected</div>
          )}
        </div>
        
        {/* Console Panel */}
        {showConsole && (
          <div style={styles.console}>
            <div style={styles.consoleHeader}>
              <span style={styles.consoleTitle}>Console</span>
              <button
                style={styles.consoleClear}
                onClick={() => setResult(null)}
              >
                Clear
              </button>
            </div>
            <div style={styles.consoleContent}>
              {result ? (
                <>
                  {result.success ? (
                    <div style={styles.consoleSuccess}>
                      ✓ Script executed successfully
                      {result.clips && (
                        <div style={styles.consoleDetail}>
                          Generated {result.clips.length} clip(s)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={styles.consoleError}>
                      ✗ {result.error ?? 'Execution failed'}
                    </div>
                  )}
                  {result.diagnostics?.map((diag, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.diagnostic,
                        ...(diag.severity === 'error' ? styles.diagnosticError :
                            diag.severity === 'warning' ? styles.diagnosticWarning :
                            styles.diagnosticInfo),
                      }}
                    >
                      {diag.line && <span style={styles.diagnosticLocation}>
                        Line {diag.line}:{diag.column ?? 0}
                      </span>}
                      {diag.message}
                    </div>
                  ))}
                </>
              ) : (
                <div style={styles.consolePlaceholder}>
                  Run a script to see output
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: DAW_COLORS.bgMedium,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgLight,
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[1],
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[1],
  },
  toolbarButton: {
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgDark,
    border: `1px solid ${DAW_COLORS.borderDefault}`,
    borderRadius: '3px',
    color: DAW_COLORS.textPrimary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: DAW_COLORS.bgMedium,
    },
  },
  toolbarButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  toolbarButtonActive: {
    backgroundColor: DAW_COLORS.accentBlue,
    borderColor: DAW_COLORS.accentBlue,
  },
  tabs: {
    display: 'flex',
    backgroundColor: DAW_COLORS.bgDark,
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[2],
    padding: `${DAW_SPACING[1.5]} ${DAW_SPACING[3]}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: DAW_COLORS.textTertiary,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: DAW_COLORS.bgMedium,
    borderBottomColor: DAW_COLORS.accentBlue,
    color: DAW_COLORS.textPrimary,
  },
  tabName: {
    display: 'flex',
    alignItems: 'center',
    gap: DAW_SPACING[1],
  },
  modifiedIndicator: {
    color: DAW_COLORS.accentBlue,
    fontSize: '8px',
  },
  tabClose: {
    marginLeft: DAW_SPACING[1],
    padding: '0 2px',
    fontSize: '16px',
    lineHeight: 1,
    opacity: 0.7,
    ':hover': {
      opacity: 1,
      color: DAW_COLORS.error,
    },
  },
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  textarea: {
    width: '100%',
    height: '100%',
    padding: DAW_SPACING[3],
    backgroundColor: DAW_COLORS.bgDark,
    border: 'none',
    color: DAW_COLORS.textPrimary,
    fontFamily: DAW_TYPOGRAPHY.fontFamilyMono,
    fontSize: DAW_TYPOGRAPHY.sizeMd,
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none',
    tabSize: 2,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: DAW_SPACING[2],
    color: DAW_COLORS.textSecondary,
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: `2px solid ${DAW_COLORS.borderDefault}`,
    borderTopColor: DAW_COLORS.accentBlue,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: DAW_COLORS.textTertiary,
  },
  console: {
    height: '120px',
    backgroundColor: DAW_COLORS.bgDarkest,
    borderTop: `1px solid ${DAW_COLORS.borderDefault}`,
    display: 'flex',
    flexDirection: 'column',
  },
  consoleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${DAW_SPACING[1]} ${DAW_SPACING[2]}`,
    backgroundColor: DAW_COLORS.bgDark,
    borderBottom: `1px solid ${DAW_COLORS.borderDefault}`,
  },
  consoleTitle: {
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    fontWeight: DAW_TYPOGRAPHY.weightSemibold,
    color: DAW_COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  consoleClear: {
    background: 'none',
    border: 'none',
    color: DAW_COLORS.textTertiary,
    fontSize: DAW_TYPOGRAPHY.sizeXs,
    cursor: 'pointer',
    ':hover': {
      color: DAW_COLORS.textPrimary,
    },
  },
  consoleContent: {
    flex: 1,
    overflow: 'auto',
    padding: DAW_SPACING[2],
    fontFamily: DAW_TYPOGRAPHY.fontFamilyMono,
    fontSize: DAW_TYPOGRAPHY.sizeSm,
  },
  consoleSuccess: {
    color: DAW_COLORS.success,
  },
  consoleError: {
    color: DAW_COLORS.error,
  },
  consoleDetail: {
    marginTop: DAW_SPACING[1],
    color: DAW_COLORS.textSecondary,
  },
  consolePlaceholder: {
    color: DAW_COLORS.textTertiary,
    fontStyle: 'italic',
  },
  diagnostic: {
    padding: `${DAW_SPACING[0.5]} 0`,
    borderLeft: '2px solid transparent',
    paddingLeft: DAW_SPACING[2],
    marginTop: DAW_SPACING[1],
  },
  diagnosticError: {
    borderLeftColor: DAW_COLORS.error,
    color: DAW_COLORS.error,
  },
  diagnosticWarning: {
    borderLeftColor: DAW_COLORS.warning,
    color: DAW_COLORS.warning,
  },
  diagnosticInfo: {
    borderLeftColor: DAW_COLORS.info,
    color: DAW_COLORS.info,
  },
  diagnosticLocation: {
    color: DAW_COLORS.textTertiary,
    marginRight: DAW_SPACING[2],
  },
};
