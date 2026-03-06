/**
 * AI Mastering Engine
 * 
 * Professional-grade automatic mastering with genre-aware processing.
 */

import type { 
  MasteringEngine, 
  MasteringConfig, 
  AudioAnalysis, 
  MasteringChain,
  ProcessingStage,
  MasteringPreset,
  MasteringGenre,
  TargetPlatform
} from './types.js';
import { MasteringAnalyzer } from './analyzer.js';
import { 
  PLATFORM_TARGETS, 
  GENRE_CHARACTERISTICS 
} from './types.js';

export class MasteringEngineImpl implements MasteringEngine {
  private config: MasteringConfig;
  private analyzer: MasteringAnalyzer;
  private presets: Map<string, MasteringPreset> = new Map();
  
  constructor(config: Partial<MasteringConfig> = {}) {
    this.config = {
      genre: 'electronic',
      targetLoudness: -14,
      truePeakLimit: -1.0,
      quality: 'crystal',
      platform: 'spotify',
      preserveDynamics: true,
      enhanceStereo: true,
      addAnalogCharacter: false,
      ...config
    };
    
    this.analyzer = new MasteringAnalyzer();
    this.initializePresets();
  }
  
  private initializePresets(): void {
    const genres: MasteringGenre[] = ['electronic', 'hip-hop', 'rock', 'pop', 'jazz', 'classical'];
    
    for (const genre of genres) {
      const chars = GENRE_CHARACTERISTICS[genre];
      
      // Create standard preset
      this.presets.set(`${genre}-standard`, {
        id: `${genre}-standard`,
        name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Standard`,
        genre,
        description: `Optimized for ${genre}`,
        config: {
          genre,
          targetLoudness: chars.targetLoudness,
          quality: 'crystal'
        },
        chain: this.createChainForGenre(genre)
      });
      
      // Create loud preset
      this.presets.set(`${genre}-loud`, {
        id: `${genre}-loud`,
        name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Loud`,
        genre,
        description: `Aggressive limiting for maximum loudness`,
        config: {
          genre,
          targetLoudness: Math.max(-8, chars.targetLoudness + 4),
          quality: 'punchy'
        },
        chain: this.createChainForGenre(genre, true)
      });
      
      // Create warm preset
      this.presets.set(`${genre}-warm`, {
        id: `${genre}-warm`,
        name: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Warm`,
        genre,
        description: `Analog warmth and character`,
        config: {
          genre,
          targetLoudness: chars.targetLoudness,
          quality: 'warm',
          addAnalogCharacter: true
        },
        chain: this.createWarmChain(genre)
      });
    }
  }
  
  private createChainForGenre(genre: MasteringGenre, loud = false): MasteringChain {
    const chars = GENRE_CHARACTERISTICS[genre];
    const stages: ProcessingStage[] = [];
    
    // 1. EQ
    stages.push({
      type: 'eq',
      enabled: true,
      params: {
        lowShelfFreq: 100,
        lowShelfGain: chars.bassBoost,
        highShelfFreq: 10000,
        highShelfGain: chars.trebleBoost,
        bell1Freq: 3000,
        bell1Gain: genre === 'electronic' ? 1 : 0,
        bell1Q: 0.7
      }
    });
    
    // 2. Multiband compression
    stages.push({
      type: 'multiband',
      enabled: true,
      params: {
        lowThreshold: -20,
        lowRatio: 2,
        midThreshold: -18,
        midRatio: 1.5 + chars.compression,
        highThreshold: -22,
        highRatio: 1.5,
        crossover1: 250,
        crossover2: 4000
      }
    });
    
    // 3. Stereo imager
    if (chars.stereoWidth > 0.6) {
      stages.push({
        type: 'imager',
        enabled: true,
        params: {
          width: chars.stereoWidth,
          monoBass: true,
          bassFreq: 150
        }
      });
    }
    
    // 4. Exciter (subtle)
    if (genre === 'electronic' || genre === 'hip-hop') {
      stages.push({
        type: 'exciter',
        enabled: true,
        params: {
          amount: 0.2,
          mix: 0.15
        }
      });
    }
    
    // 5. Limiter
    stages.push({
      type: 'limiter',
      enabled: true,
      params: {
        threshold: loud ? -6 : -8,
        ceiling: this.config.truePeakLimit,
        release: 150
      }
    });
    
    return {
      stages,
      estimatedLoudness: chars.targetLoudness + (loud ? 4 : 0),
      estimatedPeak: this.config.truePeakLimit,
      reasoning: [`Optimized for ${genre}`, 'Genre-appropriate EQ curve', 'Dynamic range preserved']
    };
  }
  
  private createWarmChain(genre: MasteringGenre): MasteringChain {
    const stages: ProcessingStage[] = [];
    
    // Saturation first
    stages.push({
      type: 'compressor',
      enabled: true,
      params: {
        threshold: -18,
        ratio: 2,
        attack: 10,
        release: 100,
        saturation: 0.3
      }
    });
    
    // Gentle EQ
    stages.push({
      type: 'eq',
      enabled: true,
      params: {
        lowShelfFreq: 120,
        lowShelfGain: 1,
        highShelfFreq: 8000,
        highShelfGain: -1
      }
    });
    
    // Gentle compression
    stages.push({
      type: 'compressor',
      enabled: true,
      params: {
        threshold: -20,
        ratio: 1.5,
        attack: 30,
        release: 200
      }
    });
    
    // Soft limiter
    stages.push({
      type: 'limiter',
      enabled: true,
      params: {
        threshold: -10,
        ceiling: -1,
        release: 300
      }
    });
    
    return {
      stages,
      estimatedLoudness: GENRE_CHARACTERISTICS[genre].targetLoudness,
      estimatedPeak: -1,
      reasoning: ['Analog-style saturation', 'Warm EQ curve', 'Gentle dynamics']
    };
  }
  
  async analyze(audioBuffer: AudioBuffer): Promise<AudioAnalysis> {
    return this.analyzer.analyze(audioBuffer);
  }
  
  suggestChain(analysis: AudioAnalysis): MasteringChain {
    const genre = this.config.genre;
    const targetLoudness = PLATFORM_TARGETS[this.config.platform].lufs;
    
    // Adjust based on analysis
    const needsMoreBass = analysis.bassEnergy < 0.25;
    const needsMoreTreble = analysis.trebleEnergy < 0.15;
    const needsDynamics = analysis.dynamicRange < 8;
    
    const chain = this.createChainForGenre(genre);
    
    // Customize based on analysis
    if (needsMoreBass) {
      const eqStage = chain.stages.find(s => s.type === 'eq');
      if (eqStage) {
        eqStage.params.lowShelfGain += 2;
      }
      chain.reasoning.push('Bass boost added for balance');
    }
    
    if (needsMoreTreble) {
      const eqStage = chain.stages.find(s => s.type === 'eq');
      if (eqStage) {
        eqStage.params.highShelfGain += 1.5;
      }
      chain.reasoning.push('Presence boost added');
    }
    
    if (needsDynamics) {
      const mbStage = chain.stages.find(s => s.type === 'multiband');
      if (mbStage) {
        mbStage.params.lowRatio *= 0.7;
        mbStage.params.midRatio *= 0.7;
      }
      chain.reasoning.push('Gentler compression for dynamics');
    }
    
    return chain;
  }
  
  suggestChainForReference(
    trackAnalysis: AudioAnalysis,
    referenceAnalysis: AudioAnalysis
  ): MasteringChain {
    const stages: ProcessingStage[] = [];
    const reasoning: string[] = [];
    
    // Match spectral balance
    const bassDiff = referenceAnalysis.bassEnergy - trackAnalysis.bassEnergy;
    const trebleDiff = referenceAnalysis.trebleEnergy - trackAnalysis.trebleEnergy;
    
    stages.push({
      type: 'eq',
      enabled: true,
      params: {
        lowShelfFreq: 100,
        lowShelfGain: bassDiff * 10,
        highShelfFreq: 10000,
        highShelfGain: trebleDiff * 10
      }
    });
    
    reasoning.push(`Matched bass: ${bassDiff > 0 ? '+' : ''}${(bassDiff * 10).toFixed(1)}dB`);
    reasoning.push(`Matched treble: ${trebleDiff > 0 ? '+' : ''}${(trebleDiff * 10).toFixed(1)}dB`);
    
    // Match dynamics
    const dynamicsDiff = referenceAnalysis.dynamicRange - trackAnalysis.dynamicRange;
    stages.push({
      type: 'multiband',
      enabled: true,
      params: {
        lowThreshold: -20 + dynamicsDiff * 2,
        lowRatio: dynamicsDiff > 0 ? 1.5 : 3,
        midThreshold: -18 + dynamicsDiff * 2,
        midRatio: dynamicsDiff > 0 ? 1.2 : 2.5
      }
    });
    
    // Match loudness
    const loudnessDiff = referenceAnalysis.integratedLoudness - trackAnalysis.integratedLoudness;
    stages.push({
      type: 'limiter',
      enabled: true,
      params: {
        threshold: Math.min(-6, -12 + loudnessDiff),
        ceiling: -1,
        release: 100
      }
    });
    
    reasoning.push(`Matched loudness: ${loudnessDiff > 0 ? '+' : ''}${loudnessDiff.toFixed(1)} LUFS`);
    
    return {
      stages,
      estimatedLoudness: referenceAnalysis.integratedLoudness,
      estimatedPeak: -1,
      reasoning
    };
  }
  
  async process(audioBuffer: AudioBuffer, chain: MasteringChain): Promise<AudioBuffer> {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Build processing chain
    let currentNode: AudioNode = source;
    
    for (const stage of chain.stages) {
      if (!stage.enabled) continue;
      
      switch (stage.type) {
        case 'eq':
          currentNode = this.createEQ(offlineContext, currentNode, stage.params);
          break;
        case 'compressor':
          currentNode = this.createCompressor(offlineContext, currentNode, stage.params);
          break;
        case 'multiband':
          currentNode = await this.createMultiband(offlineContext, currentNode, stage.params);
          break;
        case 'imager':
          currentNode = this.createImager(offlineContext, currentNode, stage.params);
          break;
        case 'exciter':
          currentNode = this.createExciter(offlineContext, currentNode, stage.params);
          break;
        case 'limiter':
          currentNode = this.createLimiter(offlineContext, currentNode, stage.params);
          break;
        case 'dither':
          // Dither applied at output
          break;
      }
    }
    
    currentNode.connect(offlineContext.destination);
    source.start();
    
    return offlineContext.startRendering();
  }
  
  private createEQ(
    context: OfflineAudioContext,
    input: AudioNode,
    params: Record<string, number>
  ): AudioNode {
    // Create 4-band EQ
    const lowShelf = context.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = params.lowShelfFreq;
    lowShelf.gain.value = params.lowShelfGain;
    
    const bell1 = context.createBiquadFilter();
    bell1.type = 'peaking';
    bell1.frequency.value = params.bell1Freq || 3000;
    bell1.gain.value = params.bell1Gain || 0;
    bell1.Q.value = params.bell1Q || 0.7;
    
    const highShelf = context.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = params.highShelfFreq;
    highShelf.gain.value = params.highShelfGain;
    
    input.connect(lowShelf);
    lowShelf.connect(bell1);
    bell1.connect(highShelf);
    
    return highShelf;
  }
  
  private createCompressor(
    context: OfflineAudioContext,
    input: AudioNode,
    params: Record<string, number>
  ): AudioNode {
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = params.threshold;
    compressor.ratio.value = params.ratio;
    compressor.attack.value = params.attack / 1000;
    compressor.release.value = params.release / 1000;
    
    input.connect(compressor);
    return compressor;
  }
  
  private async createMultiband(
    context: OfflineAudioContext,
    input: AudioNode,
    params: Record<string, number>
  ): Promise<AudioNode> {
    // Split into 3 bands using filters
    const lowLowpass = context.createBiquadFilter();
    lowLowpass.type = 'lowpass';
    lowLowpass.frequency.value = params.crossover1;
    lowLowpass.Q.value = 0.7;
    
    const midHighpass = context.createBiquadFilter();
    midHighpass.type = 'highpass';
    midHighpass.frequency.value = params.crossover1;
    midHighpass.Q.value = 0.7;
    
    const midLowpass = context.createBiquadFilter();
    midLowpass.type = 'lowpass';
    midLowpass.frequency.value = params.crossover2;
    midLowpass.Q.value = 0.7;
    
    const highHighpass = context.createBiquadFilter();
    highHighpass.type = 'highpass';
    highHighpass.frequency.value = params.crossover2;
    highHighpass.Q.value = 0.7;
    
    // Compressors for each band
    const lowComp = context.createDynamicsCompressor();
    lowComp.threshold.value = params.lowThreshold;
    lowComp.ratio.value = params.lowRatio;
    
    const midComp = context.createDynamicsCompressor();
    midComp.threshold.value = params.midThreshold;
    midComp.ratio.value = params.midRatio;
    
    const highComp = context.createDynamicsCompressor();
    highComp.threshold.value = params.highThreshold;
    highComp.ratio.value = params.highRatio;
    
    // Connect
    input.connect(lowLowpass);
    lowLowpass.connect(lowComp);
    
    input.connect(midHighpass);
    midHighpass.connect(midLowpass);
    midLowpass.connect(midComp);
    
    input.connect(highHighpass);
    highHighpass.connect(highComp);
    
    // Sum
    const merger = context.createGain();
    lowComp.connect(merger);
    midComp.connect(merger);
    highComp.connect(merger);
    
    return merger;
  }
  
  private createImager(
    context: OfflineAudioContext,
    input: AudioNode,
    params: Record<string, number>
  ): AudioNode {
    // Simple mid-side processing for width control
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const midGain = context.createGain();
    const sideGain = context.createGain();
    
    input.connect(splitter);
    
    // Mid = L + R
    splitter.connect(midGain, 0);
    splitter.connect(midGain, 1);
    midGain.gain.value = 0.5;
    
    // Side = L - R
    splitter.connect(sideGain, 0);
    const sideInvert = context.createGain();
    sideInvert.gain.value = -1;
    splitter.connect(sideInvert, 1);
    sideInvert.connect(sideGain);
    sideGain.gain.value = params.width * 0.5;
    
    // Recombine
    midGain.connect(merger, 0, 0);
    sideGain.connect(merger, 0, 1);
    
    return merger;
  }
  
  private createExciter(
    context: OfflineAudioContext,
    input: AudioNode,
    params: Record<string, number>
  ): AudioNode {
    // Simple harmonic exciter using waveshaping
    const waveshaper = context.createWaveShaper();
    const amount = params.amount;
    
    waveshaper.curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i - 128) / 128;
      const shaped = x + amount * (x * x * x - x);
      waveshaper.curve[i] = Math.max(-1, Math.min(1, shaped));
    }
    
    const mixGain = context.createGain();
    mixGain.gain.value = params.mix;
    
    const dryGain = context.createGain();
    dryGain.gain.value = 1 - params.mix;
    
    const output = context.createGain();
    
    input.connect(waveshaper);
    waveshaper.connect(mixGain);
    mixGain.connect(output);
    
    input.connect(dryGain);
    dryGain.connect(output);
    
    return output;
  }
  
  private createLimiter(
    context: OfflineAudioContext,
    input: AudioNode,
    params: Record<string, number>
  ): AudioNode {
    // Two-stage limiter for transparent limiting
    const limiter1 = context.createDynamicsCompressor();
    limiter1.threshold.value = params.threshold;
    limiter1.ratio.value = 20;
    limiter1.attack.value = 0.001;
    limiter1.release.value = params.release / 1000;
    
    const limiter2 = context.createDynamicsCompressor();
    limiter2.threshold.value = params.ceiling - 0.5;
    limiter2.ratio.value = 20;
    limiter2.attack.value = 0.0001;
    limiter2.release.value = 0.05;
    
    input.connect(limiter1);
    limiter1.connect(limiter2);
    
    return limiter2;
  }
  
  async quickMaster(audioBuffer: AudioBuffer, presetId: string): Promise<AudioBuffer> {
    const preset = this.presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`);
    }
    
    return this.process(audioBuffer, preset.chain);
  }
  
  async matchReference(
    audioBuffer: AudioBuffer,
    referenceBuffer: AudioBuffer
  ): Promise<AudioBuffer> {
    const trackAnalysis = await this.analyze(audioBuffer);
    const referenceAnalysis = await this.analyze(referenceBuffer);
    
    const chain = this.suggestChainForReference(trackAnalysis, referenceAnalysis);
    
    return this.process(audioBuffer, chain);
  }
  
  getPresets(): MasteringPreset[] {
    return Array.from(this.presets.values());
  }
  
  createPreset(name: string, config: Partial<MasteringConfig>): MasteringPreset {
    const id = `custom-${Date.now()}`;
    const chain = this.suggestChain({
      integratedLoudness: -20,
      shortTermLoudness: [],
      momentaryLoudness: [],
      loudnessRange: 10,
      peakLevel: -6,
      truePeakLevel: -4,
      crestFactor: 12,
      dynamicRange: 12,
      spectralBalance: new Float32Array(1024),
      spectralCentroid: 2000,
      spectralSpread: 2000,
      bassEnergy: 0.3,
      midEnergy: 0.5,
      trebleEnergy: 0.2,
      stereoWidth: 0.7,
      stereoBalance: 0,
      correlation: 0.9,
      issues: [],
      duration: 180,
      sampleRate: 44100
    });
    
    const preset: MasteringPreset = {
      id,
      name,
      genre: config.genre || 'custom',
      description: 'Custom preset',
      config,
      chain
    };
    
    this.presets.set(id, preset);
    return preset;
  }
  
  async dispose(): Promise<void> {
    this.presets.clear();
  }
}

export function createMasteringEngine(config?: Partial<MasteringConfig>): MasteringEngine {
  return new MasteringEngineImpl(config);
}
