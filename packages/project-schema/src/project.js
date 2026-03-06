/**
 * Main Project schema definitions for the DAW
 *
 * Implements section 7.2 of the engineering spec
 */
/** Current schema version */
export const CURRENT_SCHEMA_VERSION = 1;
// ==================== Project Factory Functions ====================
/** Create a new empty project */
export function createProject(id, name, options) {
    const now = new Date().toISOString();
    const tempo = options?.tempo ?? 120;
    const timeSignature = options?.timeSignature ?? { numerator: 4, denominator: 4 };
    const sampleRate = options?.sampleRate ?? 48000;
    return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id,
        name,
        createdAt: now,
        updatedAt: now,
        sampleRatePreference: options?.sampleRate ?? 48000,
        tempoMap: [
            { tick: 0, bpm: tempo, curve: 'jump' },
        ],
        timeSignatureMap: [
            { tick: 0, numerator: timeSignature.numerator, denominator: timeSignature.denominator },
        ],
        markers: [],
        tracks: [],
        buses: [],
        master: createMasterTrack(),
        scenes: [],
        assets: [],
        presets: [],
        scripting: [],
        settings: createDefaultSettings(sampleRate),
        clips: {
            audio: [],
            midi: [],
        },
    };
}
/** Create default master track */
function createMasterTrack() {
    return {
        id: 'master',
        name: 'Master',
        color: '#808080',
        mute: false,
        inserts: [],
        automationLanes: [],
        macros: [],
        collapsed: false,
        dither: 'noise-shaped',
        truePeak: true,
    };
}
/** Create default project settings */
function createDefaultSettings(sampleRate) {
    return {
        defaultSampleRate: sampleRate,
        defaultBitDepth: 24,
        recordingSettings: {
            defaultCountInBars: 1,
            defaultPreRollMs: 0,
            metronomeDuringRecording: true,
            metronomeDuringCountIn: true,
            createTakes: true,
            autoPunchIn: false,
            autoPunchOut: false,
            inputMonitoring: 'auto',
            fileFormat: 'wav',
            bitDepth: 24,
        },
        editingSettings: {
            defaultSnapGrid: 240, // 1/16th at PPQ=960
            snapEnabled: true,
            defaultQuantizeGrid: 240,
            quantizeStrength: 1.0,
            quantizeSwing: 0,
            fadeDefaultLength: 441, // 10ms at 44.1k
            crossfadeDefaultLength: 882,
            autoCrossfade: true,
            defaultWarpMode: 'beats',
            stretchQuality: 'good',
        },
        exportSettings: {
            defaultFormat: 'wav',
            defaultSampleRate: sampleRate,
            defaultBitDepth: 24,
            normalize: false,
            dither: 'noise-shaped',
            includeTailMs: 1000,
            defaultLocation: 'ask',
        },
        schedulerConfig: {
            prepareHorizonMs: 120,
            refillThresholdMs: 60,
            maxChunkMs: 20,
        },
        uiSettings: {
            theme: 'dark',
            highContrast: false,
            reducedMotion: false,
            defaultTrackHeight: 80,
            zoomLevel: 1,
            showWaveformOverview: true,
            showMeterBridge: true,
            followPlayback: false,
            smoothScrolling: true,
            showGrid: true,
            gridLineSpacing: 'beat',
            keyboardMidiEnabled: false,
            keyboardMidiOctave: 4,
            keyboardMidiVelocity: 100,
        },
    };
}
/** Update project timestamp */
export function touchProject(project) {
    return {
        ...project,
        updatedAt: new Date().toISOString(),
    };
}
/** Get track by ID */
export function getTrackById(project, trackId) {
    return project.tracks.find((t) => t.id === trackId);
}
/** Get bus by ID */
export function getBusById(project, busId) {
    return project.buses.find((b) => b.id === busId);
}
/** Get clip by ID */
export function getClipById(project, clipId) {
    return (project.clips.audio.find((c) => c.id === clipId) ??
        project.clips.midi.find((c) => c.id === clipId));
}
/** Get tempo at a specific tick */
export function getTempoAtTick(project, tick) {
    let tempo = 120;
    for (const event of project.tempoMap) {
        if (event.tick <= tick) {
            tempo = event.bpm;
        }
        else {
            break;
        }
    }
    return tempo;
}
/** Get time signature at a specific tick */
export function getTimeSignatureAtTick(project, tick) {
    let ts = { numerator: 4, denominator: 4 };
    for (const event of project.timeSignatureMap) {
        if (event.tick <= tick) {
            ts = { numerator: event.numerator, denominator: event.denominator };
        }
        else {
            break;
        }
    }
    return ts;
}
