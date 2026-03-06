/**
 * Effects Complete - Ableton-style Audio Effects Suite
 * 
 * A comprehensive collection of professional audio effects for the In-Browser DAW.
 * All effects implement the PluginDefinition interface for seamless integration.
 * 
 * ## Categories
 * 
 * ### EQ & Filtering
 * - **EQ Eight**: 8-band parametric EQ with M/S and L/R modes
 * - **Auto Filter**: Envelope/LFO controlled filter with sidechain
 * 
 * ### Dynamics
 * - **Glue Compressor**: SSL-style bus compressor
 * - **Multiband Dynamics**: 3-band compressor/expander
 * - **Limiter**: Brickwall limiter with true peak detection
 * - **Gate**: Noise gate with hysteresis and key filter
 * 
 * ### Delay & Reverb
 * - **Grain Delay**: Granular delay with pitch shifting
 * - **Beat Repeat**: Glitch/stutter effect
 * - **Echo**: Stereo delay with modulation and reverb
 * 
 * ### Distortion & Saturation
 * - **Saturator**: Multi-mode waveshaping distortion
 * - **Overdrive**: Guitar-style overdrive
 * - **Erosion**: Degradation and digital artifact generator
 * - **Redux**: Bitcrusher and sample rate reducer
 * - **Vinyl Distortion**: Turntable and record emulation
 * - **Dynamic Tube**: Tube saturation emulation
 * 
 * ### Modulation
 * - **Chorus-Ensemble**: Advanced chorus with ensemble and vibrato modes
 * - **Flanger**: Tape-style flanging effect
 * - **Phaser-Flanger**: Combined phaser/flanger effect
 * 
 * ### Special
 * - **Spectrum**: FFT spectrum analyzer for visualization
 * - **Tuner**: Real-time pitch detection
 * - **Utility**: Essential audio utilities (gain, pan, width, etc.)
 * - **Resonators**: 5 parallel modal resonators
 * - **Corpus**: Physical modeling resonator effect
 * - **Cabinet**: Guitar cabinet and microphone emulation
 * */

// =============================================================================
// Core DSP Utilities
// =============================================================================

export {
  // Math utilities
  PI,
  TWO_PI,
  HALF_PI,
  lerp,
  cubicInterp,
  hermiteInterp,
  clamp,
  sign,
  tanh,
  tanhApprox,
  sinc,
  
  // Conversions
  dbToLinear,
  linearToDb,
  dbToPower,
  powerToDb,
  midiToFreq,
  freqToMidi,
  centsToRatio,
  ratioToCents,
  normToFreq,
  freqToNorm,
  
  // Parameter smoothing
  SmoothedParameter,
  
  // Detection
  RMSDetector,
  EnvelopeFollower,
  
  // Delay
  DelayLine,
  AllpassFilter,
  
  // LFO
  LFO,
  type LFOWaveform,
  
  // Filters
  DCFilter,
  
  // Windows
  hannWindow,
  hammingWindow,
  blackmanWindow,
  
  // Noise
  whiteNoise,
  PinkNoise,
  BrownNoise,
} from "./core/DspUtils.js";

// =============================================================================
// Advanced Filters
// =============================================================================

export {
  // Filter types
  type FilterType,
  type FilterSlope,
  
  // Filters
  StateVariableFilter,
  CascadedSVF,
  BiquadFilter,
  LinkwitzRileyCrossover,
  MorphingFilter,
  EQBand,
  HighOrderFilter,
} from "./core/AdvancedFilters.js";

// =============================================================================
// EQ & Filtering
// =============================================================================

export { 
  EQEightInstance, 
  createEQEightDefinition,
} from "./eq-filter/EQEight.js";

export { 
  AutoFilterInstance, 
  createAutoFilterDefinition,
} from "./eq-filter/AutoFilter.js";

// =============================================================================
// Dynamics
// =============================================================================

export { 
  GlueCompressorInstance, 
  createGlueCompressorDefinition,
} from "./dynamics/GlueCompressor.js";

export { 
  MultibandDynamicsInstance, 
  createMultibandDynamicsDefinition,
} from "./dynamics/MultibandDynamics.js";

export { 
  LimiterInstance, 
  createLimiterDefinition,
} from "./dynamics/Limiter.js";

export { 
  GateInstance, 
  createGateDefinition,
} from "./dynamics/Gate.js";

// =============================================================================
// Delay & Reverb
// =============================================================================

export { 
  GrainDelayInstance, 
  createGrainDelayDefinition,
} from "./delay-reverb/GrainDelay.js";

export { 
  BeatRepeatInstance, 
  createBeatRepeatDefinition,
} from "./delay-reverb/BeatRepeat.js";

export { 
  EchoInstance, 
  createEchoDefinition,
} from "./delay-reverb/Echo.js";

// =============================================================================
// Distortion & Saturation
// =============================================================================

export { 
  SaturatorInstance, 
  createSaturatorDefinition,
} from "./distortion/Saturator.js";

export { 
  OverdriveInstance, 
  createOverdriveDefinition,
} from "./distortion/Overdrive.js";

export { 
  ErosionInstance, 
  createErosionDefinition,
} from "./distortion/Erosion.js";

export { 
  ReduxInstance, 
  createReduxDefinition,
} from "./distortion/Redux.js";

export { 
  VinylDistortionInstance, 
  createVinylDistortionDefinition,
} from "./distortion/VinylDistortion.js";

export { 
  DynamicTubeInstance, 
  createDynamicTubeDefinition,
} from "./distortion/DynamicTube.js";

// =============================================================================
// Modulation
// =============================================================================

export { 
  ChorusEnsembleInstance, 
  createChorusEnsembleDefinition,
} from "./modulation/ChorusEnsemble.js";

export { 
  FlangerInstance, 
  createFlangerDefinition,
} from "./modulation/Flanger.js";

export { 
  PhaserFlangerInstance, 
  createPhaserFlangerDefinition,
} from "./modulation/PhaserFlanger.js";

export {
  FrequencyShifterInstance,
  createFrequencyShifterDefinition,
} from "./modulation/FrequencyShifter.js";

export {
  RingModulatorInstance,
  createRingModulatorDefinition,
} from "./modulation/RingModulator.js";

export {
  VocoderInstance,
  createVocoderDefinition,
} from "./modulation/Vocoder.js";

export {
  WowFlutterInstance,
  createWowFlutterDefinition,
} from "./modulation/WowFlutter.js";

// =============================================================================
// Special
// =============================================================================

export { 
  SpectrumInstance, 
  createSpectrumDefinition,
} from "./special/Spectrum.js";

export { 
  TunerInstance, 
  createTunerDefinition,
} from "./special/Tuner.js";

export { 
  UtilityInstance, 
  createUtilityDefinition,
} from "./special/Utility.js";

export { 
  ResonatorsInstance, 
  createResonatorsDefinition,
} from "./special/Resonators.js";

export { 
  CorpusInstance, 
  createCorpusDefinition,
} from "./special/Corpus.js";

export { 
  CabinetInstance, 
  createCabinetDefinition,
} from "./special/Cabinet.js";

export {
  LooperInstance,
  createLooperDefinition,
} from "./delay-reverb/Looper.js";

export {
  PedalInstance,
  createPedalDefinition,
} from "./distortion/Pedal.js";

export {
  AmpInstance,
  createAmpDefinition,
} from "./distortion/Amp.js";

// =============================================================================
// Plugin Registry Helper
// =============================================================================

import type { PluginDefinition } from "@daw/plugin-api";
import { createEQEightDefinition } from "./eq-filter/EQEight.js";
import { createAutoFilterDefinition } from "./eq-filter/AutoFilter.js";
import { createGlueCompressorDefinition } from "./dynamics/GlueCompressor.js";
import { createMultibandDynamicsDefinition } from "./dynamics/MultibandDynamics.js";
import { createLimiterDefinition } from "./dynamics/Limiter.js";
import { createGateDefinition } from "./dynamics/Gate.js";
import { createGrainDelayDefinition } from "./delay-reverb/GrainDelay.js";
import { createBeatRepeatDefinition } from "./delay-reverb/BeatRepeat.js";
import { createEchoDefinition } from "./delay-reverb/Echo.js";
import { createLooperDefinition } from "./delay-reverb/Looper.js";
import { createSaturatorDefinition } from "./distortion/Saturator.js";
import { createOverdriveDefinition } from "./distortion/Overdrive.js";
import { createErosionDefinition } from "./distortion/Erosion.js";
import { createReduxDefinition } from "./distortion/Redux.js";
import { createVinylDistortionDefinition } from "./distortion/VinylDistortion.js";
import { createDynamicTubeDefinition } from "./distortion/DynamicTube.js";
import { createPedalDefinition } from "./distortion/Pedal.js";
import { createAmpDefinition } from "./distortion/Amp.js";
import { createChorusEnsembleDefinition } from "./modulation/ChorusEnsemble.js";
import { createFlangerDefinition } from "./modulation/Flanger.js";
import { createPhaserFlangerDefinition } from "./modulation/PhaserFlanger.js";
import { createFrequencyShifterDefinition } from "./modulation/FrequencyShifter.js";
import { createRingModulatorDefinition } from "./modulation/RingModulator.js";
import { createVocoderDefinition } from "./modulation/Vocoder.js";
import { createWowFlutterDefinition } from "./modulation/WowFlutter.js";
import { createSpectrumDefinition } from "./special/Spectrum.js";
import { createTunerDefinition } from "./special/Tuner.js";
import { createUtilityDefinition } from "./special/Utility.js";
import { createResonatorsDefinition } from "./special/Resonators.js";
import { createCorpusDefinition } from "./special/Corpus.js";
import { createCabinetDefinition } from "./special/Cabinet.js";

/**
 * Get all effect definitions in the complete suite
 */
export function getAllEffectDefinitions(): PluginDefinition[] {
  return [
    // EQ & Filtering
    createEQEightDefinition(),
    createAutoFilterDefinition(),
    
    // Dynamics
    createGlueCompressorDefinition(),
    createMultibandDynamicsDefinition(),
    createLimiterDefinition(),
    createGateDefinition(),
    
    // Delay & Reverb
    createGrainDelayDefinition(),
    createBeatRepeatDefinition(),
    createEchoDefinition(),
    createLooperDefinition(),
    
    // Distortion & Saturation
    createSaturatorDefinition(),
    createOverdriveDefinition(),
    createErosionDefinition(),
    createReduxDefinition(),
    createVinylDistortionDefinition(),
    createDynamicTubeDefinition(),
    createPedalDefinition(),
    createAmpDefinition(),
    
    // Modulation
    createChorusEnsembleDefinition(),
    createFlangerDefinition(),
    createPhaserFlangerDefinition(),
    createFrequencyShifterDefinition(),
    createRingModulatorDefinition(),
    createVocoderDefinition(),
    createWowFlutterDefinition(),
    
    // Special
    createSpectrumDefinition(),
    createTunerDefinition(),
    createUtilityDefinition(),
    createResonatorsDefinition(),
    createCorpusDefinition(),
    createCabinetDefinition(),
  ];
}

/**
 * Get effect definitions by category
 */
export function getEffectDefinitionsByCategory(category: string): PluginDefinition[] {
  const all = getAllEffectDefinitions();
  return all.filter(def => {
    switch (category) {
      case "eq-filter":
        return ["EQ Eight", "Auto Filter"].includes(def.name);
      case "dynamics":
        return ["Glue Compressor", "Multiband Dynamics", "Limiter", "Gate"].includes(def.name);
      case "delay-reverb":
        return ["Grain Delay", "Beat Repeat", "Echo"].includes(def.name);
      case "distortion":
        return ["Saturator", "Overdrive", "Erosion", "Redux", "Vinyl Distortion", "Dynamic Tube"].includes(def.name);
      case "modulation":
        return ["Chorus-Ensemble", "Flanger", "Phaser-Flanger"].includes(def.name);
      case "special":
        return ["Spectrum", "Tuner", "Utility", "Resonators", "Corpus", "Cabinet"].includes(def.name);
      default:
        return false;
    }
  });
}

export const EFFECTS_COMPLETE_VERSION = "1.0.0";
