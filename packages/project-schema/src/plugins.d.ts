/**
 * Plugin/Instrument type definitions
 *
 * Supports the plugin architecture defined in section 16
 */
/** Plugin parameter specification */
export interface PluginParameterSpec {
    id: string;
    name: string;
    kind: 'float' | 'int' | 'bool' | 'enum';
    min: number;
    max: number;
    defaultValue: number;
    step?: number;
    automationRate?: 'a-rate' | 'k-rate';
    unit?: string;
    labels?: string[];
}
/** Plugin UI descriptor */
export interface PluginUiDescriptor {
    type: 'native' | 'custom' | 'wam';
    width?: number;
    height?: number;
    resizeable?: boolean;
}
/** Plugin definition (type information) */
export interface PluginDefinition {
    id: string;
    name: string;
    category: 'instrument' | 'audioFx' | 'midiFx' | 'utility' | 'analysis';
    version: string;
    vendor?: string;
    description?: string;
    parameters: PluginParameterSpec[];
    ui: PluginUiDescriptor;
    hasCustomUi: boolean;
    latencySamples: number;
}
/** Plugin instance (in project) */
export interface PluginInstance {
    id: string;
    definitionId: string;
    name?: string;
    parameterValues: Record<string, number>;
    state?: unknown;
    bypass: boolean;
    presetId?: string;
    enabled: boolean;
    sidechainSource?: string;
}
/** Plugin target reference */
export interface PluginTarget {
    type: 'plugin';
    pluginId: string;
}
/** Built-in instrument definitions */
export declare const BUILTIN_INSTRUMENTS: {
    readonly DRUM_RACK: "builtin:drum-rack";
    readonly SAMPLER: "builtin:sampler";
    readonly SUBTRACTIVE_SYNTH: "builtin:subtractive-synth";
    readonly WAVETABLE_SYNTH: "builtin:wavetable-synth";
    readonly FM_SYNTH: "builtin:fm-synth";
    readonly GRANULAR: "builtin:granular";
};
/** Built-in effect definitions */
export declare const BUILTIN_EFFECTS: {
    readonly EQ: "builtin:eq";
    readonly COMPRESSOR: "builtin:compressor";
    readonly LIMITER: "builtin:limiter";
    readonly GATE: "builtin:gate";
    readonly DELAY: "builtin:delay";
    readonly REVERB: "builtin:reverb";
    readonly CHORUS: "builtin:chorus";
    readonly FLANGER: "builtin:flanger";
    readonly PHASER: "builtin:phaser";
    readonly SATURATOR: "builtin:saturator";
    readonly BITCRUSHER: "builtin:bitcrusher";
    readonly UTILITY: "builtin:utility";
    readonly FILTER: "builtin:filter";
    readonly TRANSIENT_SHAPER: "builtin:transient-shaper";
    readonly CONVOLUTION_REVERB: "builtin:convolution-reverb";
    readonly TUNER: "builtin:tuner";
    readonly SPECTRUM_ANALYZER: "builtin:spectrum-analyzer";
    readonly OSCILLOSCOPE: "builtin:oscilloscope";
};
/** Drum pad state for drum rack */
export interface DrumPadState {
    note: number;
    chokeGroup: number | null;
    layers: SampleLayer[];
    gainDb: number;
    pan: number;
    inserts: PluginInstance[];
    sends: SendSlot[];
    color?: string;
    name?: string;
}
/** Sample layer for multi-sampling */
export interface SampleLayer {
    id: string;
    assetId: string;
    rootNote: number;
    minNote?: number;
    maxNote?: number;
    minVelocity: number;
    maxVelocity: number;
    roundRobinGroup?: number;
    startSample: number;
    endSample: number;
    loopStart?: number;
    loopEnd?: number;
    loopEnabled: boolean;
    gainDb: number;
    pan: number;
    tuneCents: number;
    reverse: boolean;
    attackMs: number;
    decayMs: number;
    sustain: number;
    releaseMs: number;
    filterEnabled: boolean;
    filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
    filterFreq: number;
    filterResonance: number;
}
/** Send slot (re-export for drum pad) */
export interface SendSlot {
    id: string;
    targetBusId: string;
    levelDb: number;
    preFader: boolean;
    active: boolean;
}
/** Drum rack specific state */
export interface DrumRackState {
    pads: DrumPadState[];
    globalInsert: PluginInstance[];
    globalSends: SendSlot[];
    chokeGroups: number;
}
/** Sampler state */
export interface SamplerState {
    zones: SampleLayer[];
    globalTune: number;
    globalGainDb: number;
    glide: number;
    glideMode: 'off' | 'portamento' | 'constant-rate';
    legato: boolean;
    polyphony: number;
    voiceStealing: 'oldest' | 'newest' | 'quietest';
    filterEnabled: boolean;
    filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
    filterFreq: number;
    filterResonance: number;
    filterEnvelopeAmount: number;
    lfo1: LfoSettings;
    lfo2: LfoSettings;
    modMatrix: ModMatrixEntry[];
}
/** LFO settings */
export interface LfoSettings {
    rate: number;
    sync: boolean;
    waveform: 'sine' | 'triangle' | 'saw' | 'square' | 'random';
    phase: number;
    depth: number;
}
/** Mod matrix entry */
export interface ModMatrixEntry {
    source: ModSource;
    target: ModTarget;
    amount: number;
}
/** Modulation sources */
export type ModSource = {
    type: 'velocity';
} | {
    type: 'keytrack';
} | {
    type: 'modwheel';
} | {
    type: 'aftertouch';
} | {
    type: 'pitchbend';
} | {
    type: 'lfo';
    lfo: number;
} | {
    type: 'envelope';
    env: number;
} | {
    type: 'random';
};
/** Modulation targets */
export type ModTarget = {
    type: 'pitch';
    rangeSemitones?: number;
} | {
    type: 'filter';
    param: 'freq' | 'resonance';
} | {
    type: 'amp';
} | {
    type: 'pan';
} | {
    type: 'lfo';
    lfo: number;
    param: 'rate' | 'depth';
} | {
    type: 'oscillator';
    param: string;
};
/** Synth oscillator settings */
export interface OscillatorSettings {
    type: 'sine' | 'triangle' | 'saw' | 'square' | 'pulse' | 'supersaw' | 'noise';
    gainDb: number;
    pan: number;
    transpose: number;
    fineTune: number;
    pulseWidth?: number;
    pulseWidthMod?: number;
    hardSync: boolean;
    syncSource?: number;
    supersawDetune?: number;
    supersawMix?: number;
}
/** Subtractive synth state */
export interface SubtractiveSynthState {
    oscillators: OscillatorSettings[];
    subOscillator: {
        enabled: boolean;
        octave: -1 | -2;
        gainDb: number;
    };
    noiseOscillator: {
        enabled: boolean;
        type: 'white' | 'pink' | 'brown';
        gainDb: number;
    };
    filter: {
        type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'ladder';
        cutoff: number;
        resonance: number;
        drive: number;
        keyTracking: number;
    };
    filterEnvelope: AdsrEnvelope;
    ampEnvelope: AdsrEnvelope;
    modEnvelope: AdsrEnvelope;
    lfo1: LfoSettings;
    lfo2: LfoSettings;
    unison: {
        enabled: boolean;
        voices: number;
        detune: number;
        spread: number;
    };
    playMode: 'poly' | 'mono' | 'legato';
    portamento: number;
    portamentoMode: 'rate' | 'time';
}
/** ADSR Envelope */
export interface AdsrEnvelope {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    attackCurve: number;
    decayCurve: number;
    releaseCurve: number;
}
/** Wavetable synth state */
export interface WavetableSynthState {
    oscillators: WavetableOscillator[];
    filter: {
        type: 'lowpass' | 'highpass' | 'bandpass';
        cutoff: number;
        resonance: number;
    };
    ampEnvelope: AdsrEnvelope;
    modEnvelope: AdsrEnvelope;
    lfo1: LfoSettings;
    lfo2: LfoSettings;
    macros: Record<string, number>;
}
/** Wavetable oscillator */
export interface WavetableOscillator {
    wavetableId: string;
    position: number;
    gainDb: number;
    pan: number;
    transpose: number;
    fineTune: number;
    unison: {
        voices: number;
        detune: number;
        spread: number;
    };
    phaseModulation?: {
        source: number;
        amount: number;
    };
}
/** FM Synth operator */
export interface FmOperator {
    ratio: number;
    fixedFreq?: number;
    useFixedFreq: boolean;
    level: number;
    feedback: number;
    envelope: AdsrEnvelope;
}
/** FM Synth algorithm */
export interface FmAlgorithm {
    id: number;
    connections: FmConnection[];
}
/** FM connection between operators */
export interface FmConnection {
    from: number;
    to: number;
    amount: number;
}
/** FM Synth state */
export interface FmSynthState {
    operators: FmOperator[];
    algorithm: number;
    feedback: number[];
    macros: Record<string, number>;
}
/** Granular synth state */
export interface GranularSynthState {
    assetId: string;
    position: number;
    positionSpray: number;
    sizeMs: number;
    sizeSpray: number;
    density: number;
    densitySpray: number;
    pitch: number;
    pitchSpray: number;
    pitchQuantize: boolean;
    grainEnvelope: 'gaussian' | 'triangle' | 'sine' | 'exp';
    grainAttack: number;
    grainDecay: number;
    formant: number;
    reverse: boolean;
    freeze: boolean;
    mode: 'retrigger' | 'cloud';
}
//# sourceMappingURL=plugins.d.ts.map