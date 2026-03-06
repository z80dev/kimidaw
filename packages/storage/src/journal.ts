/**
 * Command Journal for Event Sourcing
 * 
 * Implements the command journal from section 7.6 of the engineering spec.
 * 
 * The journal provides:
 * - Append-only log of all commands
 * - Deterministic undo/redo
 * - Crash recovery via journal replay
 * - Audit trail of all changes
 */

import type { Command, CommandJournalEntry, ProjectSnapshot } from '@daw/project-schema';

// Error types
export class JournalError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'JournalError';
  }
}

// Journal configuration
export interface JournalConfig {
  maxEntriesPerFile: number;
  maxUndoStackSize: number;
  snapshotInterval: number; // Number of commands between snapshots
  compressionEnabled: boolean;
}

// Default configuration
export const DEFAULT_JOURNAL_CONFIG: JournalConfig = {
  maxEntriesPerFile: 1000,
  maxUndoStackSize: 100,
  snapshotInterval: 100,
  compressionEnabled: false,
};

// In-memory journal state
export interface JournalState {
  entries: CommandJournalEntry[];
  sequence: number;
  lastSnapshotSequence: number;
  undoStack: Command[];
  redoStack: Command[];
  isDirty: boolean;
}

// Snapshot info
export interface SnapshotInfo {
  id: string;
  sequence: number;
  timestamp: number;
  commandCount: number;
}

/**
 * Command Journal
 * 
 * Manages an append-only log of commands for event sourcing.
 */
export class CommandJournal {
  private state: JournalState;
  private config: JournalConfig;
  private listeners: Set<(entry: CommandJournalEntry) => void>;

  constructor(config: Partial<JournalConfig> = {}) {
    this.config = { ...DEFAULT_JOURNAL_CONFIG, ...config };
    this.state = {
      entries: [],
      sequence: 0,
      lastSnapshotSequence: 0,
      undoStack: [],
      redoStack: [],
      isDirty: false,
    };
    this.listeners = new Set();
  }

  /**
   * Get current sequence number
   */
  getSequence(): number {
    return this.state.sequence;
  }

  /**
   * Get last snapshot sequence
   */
  getLastSnapshotSequence(): number {
    return this.state.lastSnapshotSequence;
  }

  /**
   * Check if journal needs a snapshot
   */
  needsSnapshot(): boolean {
    return this.state.sequence - this.state.lastSnapshotSequence >= this.config.snapshotInterval;
  }

  /**
   * Append a command to the journal
   */
  append(command: Command, projectId: string, schemaVersion: number): CommandJournalEntry {
    this.state.sequence++;

    const entry: CommandJournalEntry = {
      sequence: this.state.sequence,
      timestamp: Date.now(),
      envelope: {
        command,
        projectId,
        schemaVersion,
      },
      checksum: this.computeChecksum(command),
    };

    this.state.entries.push(entry);
    this.state.isDirty = true;

    // Clear redo stack on new command
    this.state.redoStack = [];

    // Add to undo stack (for in-memory undo)
    this.state.undoStack.push(command);
    if (this.state.undoStack.length > this.config.maxUndoStackSize) {
      this.state.undoStack.shift();
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(entry);
    }

    return entry;
  }

  /**
   * Append multiple commands as a batch
   */
  appendBatch(
    commands: Command[],
    projectId: string,
    schemaVersion: number
  ): CommandJournalEntry[] {
    return commands.map(cmd => this.append(cmd, projectId, schemaVersion));
  }

  /**
   * Get entries since a sequence number
   */
  getEntriesSince(sequence: number): CommandJournalEntry[] {
    return this.state.entries.filter(e => e.sequence > sequence);
  }

  /**
   * Get entries in a range
   */
  getEntriesInRange(startSequence: number, endSequence: number): CommandJournalEntry[] {
    return this.state.entries.filter(
      e => e.sequence >= startSequence && e.sequence <= endSequence
    );
  }

  /**
   * Get all entries
   */
  getAllEntries(): CommandJournalEntry[] {
    return [...this.state.entries];
  }

  /**
   * Get entry by sequence
   */
  getEntry(sequence: number): CommandJournalEntry | undefined {
    return this.state.entries.find(e => e.sequence === sequence);
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.state.undoStack.length > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.state.redoStack.length > 0;
  }

  /**
   * Pop the last command for undo
   */
  popUndo(): Command | undefined {
    const command = this.state.undoStack.pop();
    if (command) {
      this.state.redoStack.push(command);
    }
    return command;
  }

  /**
   * Pop from redo stack
   */
  popRedo(): Command | undefined {
    const command = this.state.redoStack.pop();
    if (command) {
      this.state.undoStack.push(command);
    }
    return command;
  }

  /**
   * Record a snapshot
   */
  recordSnapshot(snapshot: ProjectSnapshot): void {
    this.state.lastSnapshotSequence = snapshot.sequence;
  }

  /**
   * Clear the journal
   */
  clear(): void {
    this.state.entries = [];
    this.state.sequence = 0;
    this.state.lastSnapshotSequence = 0;
    this.state.undoStack = [];
    this.state.redoStack = [];
    this.state.isDirty = false;
  }

  /**
   * Check if journal has unsaved changes
   */
  isDirty(): boolean {
    return this.state.isDirty;
  }

  /**
   * Mark as saved
   */
  markSaved(): void {
    this.state.isDirty = false;
  }

  /**
   * Subscribe to new entries
   */
  subscribe(listener: (entry: CommandJournalEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Serialize journal to a format suitable for storage
   */
  serialize(): string {
    const data = {
      version: 1,
      sequence: this.state.sequence,
      lastSnapshotSequence: this.state.lastSnapshotSequence,
      entries: this.state.entries,
    };
    return JSON.stringify(data);
  }

  /**
   * Deserialize journal from storage
   */
  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    
    if (parsed.version !== 1) {
      throw new JournalError(`Unsupported journal version: ${parsed.version}`, 'VERSION_ERROR');
    }

    this.state.sequence = parsed.sequence ?? 0;
    this.state.lastSnapshotSequence = parsed.lastSnapshotSequence ?? 0;
    this.state.entries = parsed.entries ?? [];
    this.state.isDirty = false;
  }

  /**
   * Load entries from storage (append mode)
   */
  loadEntries(entries: CommandJournalEntry[]): void {
    for (const entry of entries) {
      if (entry.sequence > this.state.sequence) {
        this.state.sequence = entry.sequence;
      }
      this.state.entries.push(entry);
    }
  }

  /**
   * Get journal statistics
   */
  getStats(): {
    entryCount: number;
    sequence: number;
    undoStackSize: number;
    redoStackSize: number;
    isDirty: boolean;
  } {
    return {
      entryCount: this.state.entries.length,
      sequence: this.state.sequence,
      undoStackSize: this.state.undoStack.length,
      redoStackSize: this.state.redoStack.length,
      isDirty: this.state.isDirty,
    };
  }

  /**
   * Trim entries to reduce memory usage
   */
  trim(maxEntries: number): void {
    if (this.state.entries.length > maxEntries) {
      // Keep the most recent entries
      this.state.entries = this.state.entries.slice(-maxEntries);
    }
  }

  /**
   * Compute a simple checksum for integrity
   */
  private computeChecksum(command: Command): string {
    const data = `${command.id}:${command.timestamp}:${command.type}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16).padStart(8, '0');
  }
}

// Singleton instance
let defaultJournal: CommandJournal | null = null;

export function getCommandJournal(config?: Partial<JournalConfig>): CommandJournal {
  if (!defaultJournal) {
    defaultJournal = new CommandJournal(config);
  }
  return defaultJournal;
}

/**
 * Format journal entries for display
 */
export function formatJournalEntry(entry: CommandJournalEntry): string {
  const { command, projectId } = entry.envelope;
  const time = new Date(entry.timestamp).toLocaleTimeString();
  return `[${entry.sequence}] ${time} - ${command.actor}: ${command.type} (${projectId})`;
}

/**
 * Group journal entries by batch
 */
export function groupByBatch(entries: CommandJournalEntry[]): Map<string, CommandJournalEntry[]> {
  const batches = new Map<string, CommandJournalEntry[]>();
  
  for (const entry of entries) {
    const batchId = entry.envelope.command.batchId;
    if (batchId) {
      const group = batches.get(batchId) ?? [];
      group.push(entry);
      batches.set(batchId, group);
    }
  }

  return batches;
}

/**
 * Validate journal integrity
 */
export function validateJournal(entries: CommandJournalEntry[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const sequences = new Set<number>();

  for (const entry of entries) {
    // Check for duplicate sequences
    if (sequences.has(entry.sequence)) {
      errors.push(`Duplicate sequence number: ${entry.sequence}`);
    }
    sequences.add(entry.sequence);

    // Validate required fields
    if (!entry.envelope?.command?.id) {
      errors.push(`Entry ${entry.sequence}: missing command ID`);
    }
    if (!entry.envelope?.command?.type) {
      errors.push(`Entry ${entry.sequence}: missing command type`);
    }
    if (!entry.envelope?.projectId) {
      errors.push(`Entry ${entry.sequence}: missing project ID`);
    }

    // Check checksum (basic)
    if (!entry.checksum) {
      errors.push(`Entry ${entry.sequence}: missing checksum`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Reconstruct state by replaying journal entries
 * 
 * This is a placeholder - actual state reconstruction requires
 * the full reducer logic from the project state manager.
 */
export function replayJournal<TState>(
  initialState: TState,
  entries: CommandJournalEntry[],
  reducer: (state: TState, command: Command) => TState
): TState {
  // Sort by sequence
  const sorted = [...entries].sort((a, b) => a.sequence - b.sequence);

  // Replay each command
  let state = initialState;
  for (const entry of sorted) {
    try {
      state = reducer(state, entry.envelope.command);
    } catch (error) {
      console.error(`Error replaying command ${entry.sequence}:`, error);
      // Continue with next command or throw based on requirements
    }
  }

  return state;
}
