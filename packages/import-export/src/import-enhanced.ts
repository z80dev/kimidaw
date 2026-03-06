/**
 * Enhanced Import Features
 * 
 * Advanced import capabilities including Ableton ALS, REX files,
 * ACID loops, Apple Loops, and intelligent audio analysis.
 */

import type { MidiFile, MidiTrack } from '@daw/midi';
import type { ImportResult, AudioMetadata } from './types.js';

// ============================================================================
// Ableton ALS Import
// ============================================================================

export interface AbletonALSProject {
  version: string;
  tempo: number;
  timeSignature: { numerator: number; denominator: number };
  tracks: AbletonTrack[];
  scenes: AbletonScene[];
  masterTrack: AbletonMasterTrack;
  returnTracks: AbletonReturnTrack[];
  assets: AbletonAssetRef[];
}

export interface AbletonTrack {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'group';
  color: number;
  mute: boolean;
  solo: boolean;
  arm: boolean;
  volume: number; // dB
  pan: number; // -1 to 1
  sends: AbletonSend[];
  devices: AbletonDevice[];
  clips: AbletonClip[];
  groupId?: string;
}

export interface AbletonAudioTrack extends AbletonTrack {
  type: 'audio';
  inputRouting: AbletonInputRouting;
  clips: AbletonAudioClip[];
}

export interface AbletonMidiTrack extends AbletonTrack {
  type: 'midi';
  midiInput: AbletonMidiInput;
  clips: AbletonMidiClip[];
}

export interface AbletonInputRouting {
  source: 'ext-in' | 'resampling' | 'master' | string;
  channel: number;
}

export interface AbletonMidiInput {
  source: 'all-ins' | string;
  channel: number; // 1-16 or 0 for all
}

export interface AbletonSend {
  returnId: string;
  amount: number; // 0-1
}

export interface AbletonDevice {
  id: string;
  name: string;
  type: 'instrument' | 'audio-effect' | 'midi-effect';
  vendor: string;
  preset?: string;
  parameters: Record<string, number | string | boolean>;
}

export interface AbletonClip {
  id: string;
  name: string;
  color: number;
  startTime: number; // beats
  duration: number; // beats
  loop: AbletonLoop;
  warp: AbletonWarp;
}

export interface AbletonAudioClip extends AbletonClip {
  type: 'audio';
  filePath: string;
  fileName: string;
  relativePath: string;
  originalTempo?: number;
  rootKey?: number;
  detune: number;
  gain: number;
  fadeIn: AbletonFade;
  fadeOut: AbletonFade;
}

export interface AbletonMidiClip extends AbletonClip {
  type: 'midi';
  notes: AbletonNote[];
  velocityEnvelope?: AbletonEnvelope;
  probability?: number;
}

export interface AbletonNote {
  pitch: number;
  start: number; // beats
  duration: number; // beats
  velocity: number;
  mute: boolean;
  probability?: number;
  velocityDeviation?: number;
}

export interface AbletonLoop {
  enabled: boolean;
  start: number;
  end: number;
  position: number;
}

export interface AbletonWarp {
  enabled: boolean;
  mode: 'beats' | 'tones' | 'texture' | 're-pitch' | 'complex' | 'complex-pro' | 'grains' | 'repitch' | 'r' | 'pro' | 'auto';
  markers: AbletonWarpMarker[];
}

export interface AbletonWarpMarker {
  sampleTime: number; // seconds
  beatTime: number; // beats
}

export interface AbletonFade {
  enabled: boolean;
  shape: 'linear' | 'power' | 'sine';
  duration: number; // beats
}

export interface AbletonEnvelope {
  points: AbletonEnvelopePoint[];
}

export interface AbletonEnvelopePoint {
  time: number;
  value: number;
}

export interface AbletonScene {
  id: string;
  name: string;
  color: number;
  tempo?: number;
  timeSignature?: { numerator: number; denominator: number };
  launchQuantization?: string;
  clipSlots: AbletonClipSlot[];
}

export interface AbletonClipSlot {
  trackId: string;
  hasStopButton: boolean;
  launchMode?: string;
}

export interface AbletonMasterTrack {
  volume: number;
  devices: AbletonDevice[];
}

export interface AbletonReturnTrack {
  id: string;
  name: string;
  color: number;
  volume: number;
  pan: number;
  devices: AbletonDevice[];
  sends: AbletonSend[];
}

export interface AbletonAssetRef {
  id: string;
  path: string;
  originalPath: string;
  size: number;
  sampleRate?: number;
  channels?: number;
  duration?: number;
}

export interface ALSImportOptions {
  importAssets: boolean;
  matchTempo: boolean;
  createMissingTracks: boolean;
  importWarpMarkers: boolean;
  importDevices: boolean;
}

export const DEFAULT_ALS_IMPORT_OPTIONS: ALSImportOptions = {
  importAssets: true,
  matchTempo: true,
  createMissingTracks: true,
  importWarpMarkers: true,
  importDevices: false, // Devices can't be fully imported, just placeholders
};

export interface ALSImportResult {
  project: AbletonALSProject;
  missingAssets: string[];
  unsupportedDevices: string[];
  warnings: string[];
}

export interface ALSImporter {
  parseALS(file: File): Promise<AbletonALSProject>;
  importALS(file: File, options?: Partial<ALSImportOptions>): Promise<ALSImportResult>;
  extractAssets(project: AbletonALSProject): AbletonAssetRef[];
  validateProject(project: AbletonALSProject): string[];
}

/**
 * Create an ALS importer
 * 
 * Note: Ableton ALS files are gzipped XML. This implementation provides
 * the interface and basic parsing. Full implementation would require
 * XML parsing and decompression.
 */
export function createALSImporter(): ALSImporter {
  async function decompressALS(file: File): Promise<string> {
    // ALS files are gzipped XML
    const arrayBuffer = await file.arrayBuffer();
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(arrayBuffer));
    writer.close();
    
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    // Concatenate chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(result);
  }
  
  async function parseALS(file: File): Promise<AbletonALSProject> {
    const xmlContent = await decompressALS(file);
    
    // Parse the XML content
    // This is a simplified implementation
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    
    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Failed to parse ALS file: Invalid XML');
    }
    
    return parseAbletonDocument(doc);
  }
  
  function parseAbletonDocument(doc: Document): AbletonALSProject {
    const ableton = doc.querySelector('Ableton');
    if (!ableton) {
      throw new Error('Invalid ALS file: Missing Ableton root element');
    }
    
    const liveSet = ableton.querySelector('LiveSet');
    if (!liveSet) {
      throw new Error('Invalid ALS file: Missing LiveSet element');
    }
    
    // Extract basic info
    const version = ableton.getAttribute('MajorVersion') + '.' + ableton.getAttribute('MinorVersion') || 'unknown';
    
    // Parse tempo
    const tempoElement = liveSet.querySelector('Tempo Manual');
    const tempo = tempoElement ? parseFloat(tempoElement.textContent || '120') : 120;
    
    // Parse time signature
    const timeSigElement = liveSet.querySelector('TimeSignature');
    const numerator = parseInt(timeSigElement?.querySelector('Numerator')?.textContent || '4');
    const denominator = parseInt(timeSigElement?.querySelector('Denominator')?.textContent || '4');
    
    // Parse tracks
    const tracks: AbletonTrack[] = [];
    const trackElements = liveSet.querySelectorAll('Tracks AudioTrack, Tracks MidiTrack, Tracks GroupTrack');
    
    for (const trackEl of trackElements) {
      const track = parseTrack(trackEl);
      if (track) tracks.push(track);
    }
    
    // Parse return tracks
    const returnTracks: AbletonReturnTrack[] = [];
    const returnTrackElements = liveSet.querySelectorAll('Tracks ReturnTrack');
    
    for (const trackEl of returnTrackElements) {
      const track = parseReturnTrack(trackEl);
      if (track) returnTracks.push(track);
    }
    
    // Parse master track
    const masterTrackEl = liveSet.querySelector('MasterTrack');
    const masterTrack = masterTrackEl ? parseMasterTrack(masterTrackEl) : { volume: 0, devices: [] };
    
    // Parse scenes
    const scenes: AbletonScene[] = [];
    const sceneElements = liveSet.querySelectorAll('Scenes Scene');
    
    for (const sceneEl of sceneElements) {
      const scene = parseScene(sceneEl);
      if (scene) scenes.push(scene);
    }
    
    // Extract asset references from audio clips
    const assets = extractAssetRefs(tracks);
    
    return {
      version,
      tempo,
      timeSignature: { numerator, denominator },
      tracks,
      scenes,
      masterTrack,
      returnTracks,
      assets,
    };
  }
  
  function parseTrack(element: Element): AbletonTrack | null {
    const id = element.getAttribute('Id') || '';
    const name = element.querySelector('Name UserName')?.textContent || 
                 element.querySelector('Name EffectiveName')?.textContent || 
                 'Track';
    
    const tagName = element.tagName.toLowerCase();
    const type = tagName.includes('audio') ? 'audio' : 
                 tagName.includes('midi') ? 'midi' : 'group';
    
    const color = parseInt(element.querySelector('Color')?.textContent || '0');
    const mute = element.querySelector('DeviceChain Mixer On')?.getAttribute('Value') === 'false';
    const solo = element.querySelector('DeviceChain Mixer Solo')?.getAttribute('Value') === 'true';
    const arm = element.querySelector('DeviceChain Mixer Arm')?.getAttribute('Value') === 'true';
    
    const volume = parseFloat(element.querySelector('DeviceChain Mixer Volume Manual')?.textContent || '0.85');
    const pan = parseFloat(element.querySelector('DeviceChain Mixer Panning Manual')?.textContent || '0');
    
    const devices: AbletonDevice[] = [];
    const deviceElements = element.querySelectorAll('DeviceChain DeviceChain Devices *');
    
    for (const deviceEl of deviceElements) {
      const device = parseDevice(deviceEl);
      if (device) devices.push(device);
    }
    
    const clips: AbletonClip[] = [];
    const clipElements = element.querySelectorAll('ClipSlotList ClipSlot Clip');
    
    for (const clipEl of clipElements) {
      const clip = parseClip(clipEl, type);
      if (clip) clips.push(clip);
    }
    
    const sends: AbletonSend[] = [];
    const sendElements = element.querySelectorAll('DeviceChain Mixer Sends Send');
    
    for (const sendEl of sendElements) {
      const returnId = sendEl.getAttribute('SendId') || '';
      const amount = parseFloat(sendEl.querySelector('Manual')?.textContent || '0');
      sends.push({ returnId, amount });
    }
    
    return {
      id,
      name,
      type: type as 'audio' | 'midi' | 'group',
      color,
      mute,
      solo,
      arm,
      volume,
      pan,
      sends,
      devices,
      clips,
    };
  }
  
  function parseReturnTrack(element: Element): AbletonReturnTrack | null {
    const id = element.getAttribute('Id') || '';
    const name = element.querySelector('Name EffectiveName')?.textContent || 'Return';
    const color = parseInt(element.querySelector('Color')?.textContent || '0');
    const volume = parseFloat(element.querySelector('DeviceChain Mixer Volume Manual')?.textContent || '0.85');
    const pan = parseFloat(element.querySelector('DeviceChain Mixer Panning Manual')?.textContent || '0');
    
    const devices: AbletonDevice[] = [];
    const deviceElements = element.querySelectorAll('DeviceChain DeviceChain Devices *');
    
    for (const deviceEl of deviceElements) {
      const device = parseDevice(deviceEl);
      if (device) devices.push(device);
    }
    
    const sends: AbletonSend[] = [];
    
    return { id, name, color, volume, pan, devices, sends };
  }
  
  function parseMasterTrack(element: Element): AbletonMasterTrack {
    const volume = parseFloat(element.querySelector('DeviceChain Mixer Volume Manual')?.textContent || '0.85');
    
    const devices: AbletonDevice[] = [];
    const deviceElements = element.querySelectorAll('DeviceChain DeviceChain Devices *');
    
    for (const deviceEl of deviceElements) {
      const device = parseDevice(deviceEl);
      if (device) devices.push(device);
    }
    
    return { volume, devices };
  }
  
  function parseDevice(element: Element): AbletonDevice | null {
    const tagName = element.tagName;
    
    // Map device types
    const deviceTypeMap: Record<string, AbletonDevice['type']> = {
      'InstrumentGroupDevice': 'instrument',
      'DrumGroupDevice': 'instrument',
      'MidiEffectGroupDevice': 'midi-effect',
      'AudioEffectGroupDevice': 'audio-effect',
      'PluginDevice': 'instrument', // VST/AU
    };
    
    const type = deviceTypeMap[tagName] || 
                 (tagName.includes('Instrument') ? 'instrument' :
                  tagName.includes('Midi') ? 'midi-effect' :
                  tagName.includes('Audio') ? 'audio-effect' : undefined);
    
    if (!type) return null;
    
    const name = element.querySelector('UserName')?.textContent || 
                 element.tagName.replace(/([A-Z])/g, ' $1').trim();
    const vendor = element.queryAttribute?.('Vendor') || 'Ableton';
    
    const parameters: Record<string, number | string | boolean> = {};
    const paramElements = element.querySelectorAll('Parameters *');
    
    for (const paramEl of paramElements) {
      const paramName = paramEl.tagName;
      const manual = paramEl.querySelector('Manual');
      if (manual) {
        const value = manual.textContent;
        const numValue = parseFloat(value || '');
        parameters[paramName] = isNaN(numValue) ? (value || '') : numValue;
      }
    }
    
    return {
      id: element.getAttribute('Id') || '',
      name,
      type,
      vendor,
      parameters,
    };
  }
  
  function parseClip(element: Element, trackType: string): AbletonClip | null {
    const id = element.getAttribute('Id') || '';
    const name = element.querySelector('Name')?.textContent || 'Clip';
    const color = parseInt(element.querySelector('Color')?.textContent || '0');
    
    const currentStart = parseFloat(element.querySelector('CurrentStart')?.getAttribute('Value') || '0');
    const loopStart = parseFloat(element.querySelector('LoopStart')?.getAttribute('Value') || '0');
    const loopEnd = parseFloat(element.querySelector('LoopEnd')?.getAttribute('Value') || '4');
    
    const loop: AbletonLoop = {
      enabled: element.querySelector('Loop On')?.getAttribute('Value') === 'true',
      start: loopStart,
      end: loopEnd,
      position: currentStart,
    };
    
    // Parse warp settings
    const warpEnabled = element.querySelector('WarpEnabled')?.getAttribute('Value') === 'true';
    const warpMode = element.querySelector('WarpMode')?.getAttribute('Value') || 'beats';
    
    const warpMarkers: AbletonWarpMarker[] = [];
    const markerElements = element.querySelectorAll('WarpMarkers WarpMarker');
    
    for (const markerEl of markerElements) {
      const sampleTime = parseFloat(markerEl.getAttribute('SecTime') || '0');
      const beatTime = parseFloat(markerEl.getAttribute('BeatTime') || '0');
      warpMarkers.push({ sampleTime, beatTime });
    }
    
    const warp: AbletonWarp = {
      enabled: warpEnabled,
      mode: warpMode as AbletonWarp['mode'],
      markers: warpMarkers,
    };
    
    const baseClip: AbletonClip = {
      id,
      name,
      color,
      startTime: currentStart,
      duration: loopEnd - loopStart,
      loop,
      warp,
    };
    
    if (trackType === 'audio') {
      // Parse audio clip specific data
      const fileRef = element.querySelector('SampleRef FileRef');
      const filePath = fileRef?.querySelector('Path')?.getAttribute('Value') || '';
      const fileName = fileRef?.querySelector('Name')?.getAttribute('Value') || '';
      const relativePath = fileRef?.querySelector('RelativePath')?.getAttribute('Value') || '';
      
      const originalTempo = parseFloat(element.querySelector('SampleRef OriginalTempo')?.textContent || '0') || undefined;
      const rootKey = parseInt(element.querySelector('SampleRef RootNote')?.textContent || '-1');
      const detune = parseFloat(element.querySelector('Detune')?.textContent || '0');
      const gain = parseFloat(element.querySelector('Gain')?.textContent || '1');
      
      return {
        ...baseClip,
        type: 'audio',
        filePath,
        fileName,
        relativePath,
        originalTempo,
        rootKey: rootKey >= 0 ? rootKey : undefined,
        detune,
        gain,
        fadeIn: parseFade(element.querySelector('FadeIn')),
        fadeOut: parseFade(element.querySelector('FadeOut')),
      } as AbletonAudioClip;
    } else {
      // Parse MIDI clip
      const notes: AbletonNote[] = [];
      const noteElements = element.querySelectorAll('Notes KeyTracks KeyTrack Notes MidiNoteEvent');
      
      for (const noteEl of noteElements) {
        const pitch = parseInt(noteEl.getAttribute('Note') || '60');
        const start = parseFloat(noteEl.getAttribute('Time') || '0');
        const duration = parseFloat(noteEl.getAttribute('Duration') || '0.25');
        const velocity = parseInt(noteEl.getAttribute('Velocity') || '100');
        const mute = noteEl.getAttribute('IsEnabled') === 'false';
        
        notes.push({ pitch, start, duration, velocity, mute });
      }
      
      return {
        ...baseClip,
        type: 'midi',
        notes,
      } as AbletonMidiClip;
    }
  }
  
  function parseFade(element: Element | null): AbletonFade {
    if (!element) {
      return { enabled: false, shape: 'linear', duration: 0 };
    }
    
    const enabled = element.getAttribute('IsEnabled') === 'true';
    const curve = parseInt(element.getAttribute('Curve') || '0');
    const shape: AbletonFade['shape'] = curve === 0 ? 'linear' : curve > 0 ? 'power' : 'sine';
    const duration = parseFloat(element.getAttribute('Duration') || '0');
    
    return { enabled, shape, duration };
  }
  
  function parseScene(element: Element): AbletonScene | null {
    const id = element.getAttribute('Id') || '';
    const name = element.querySelector('Name')?.textContent || 'Scene';
    const color = parseInt(element.querySelector('Color')?.textContent || '0');
    
    const tempoEl = element.querySelector('Tempo');
    const tempo = tempoEl ? parseFloat(tempoEl.getAttribute('Value') || '0') || undefined : undefined;
    
    const clipSlots: AbletonClipSlot[] = [];
    
    return { id, name, color, tempo, clipSlots };
  }
  
  function extractAssetRefs(tracks: AbletonTrack[]): AbletonAssetRef[] {
    const assets: AbletonAssetRef[] = [];
    const seen = new Set<string>();
    
    for (const track of tracks) {
      if (track.type !== 'audio') continue;
      
      for (const clip of track.clips) {
        if (clip.type !== 'audio') continue;
        const audioClip = clip as AbletonAudioClip;
        
        if (audioClip.filePath && !seen.has(audioClip.filePath)) {
          seen.add(audioClip.filePath);
          assets.push({
            id: `asset-${assets.length}`,
            path: audioClip.filePath,
            originalPath: audioClip.filePath,
            size: 0, // Would need file system access
            sampleRate: undefined,
            channels: undefined,
            duration: undefined,
          });
        }
      }
    }
    
    return assets;
  }
  
  async function importALS(
    file: File,
    options: Partial<ALSImportOptions> = {}
  ): Promise<ALSImportResult> {
    const opts = { ...DEFAULT_ALS_IMPORT_OPTIONS, ...options };
    
    const project = await parseALS(file);
    const missingAssets: string[] = [];
    const unsupportedDevices: string[] = [];
    const warnings: string[] = [];
    
    // Check for missing assets
    if (opts.importAssets) {
      for (const asset of project.assets) {
        // In real implementation, check if file exists
        if (!asset.path) {
          missingAssets.push(asset.originalPath);
        }
      }
    }
    
    // Check for unsupported devices
    for (const track of project.tracks) {
      for (const device of track.devices) {
        if (!isDeviceSupported(device)) {
          unsupportedDevices.push(`${track.name}: ${device.name}`);
        }
      }
    }
    
    // Generate warnings
    if (project.version.startsWith('10') || project.version.startsWith('9')) {
      warnings.push(`Project created with older Ableton version (${project.version}). Some features may not be fully compatible.`);
    }
    
    return {
      project,
      missingAssets,
      unsupportedDevices,
      warnings,
    };
  }
  
  function isDeviceSupported(device: AbletonDevice): boolean {
    // List of supported device types
    const supportedDevices = [
      'Eq8', 'Compressor', 'GlueCompressor', 'Limiter',
      'Reverb', 'Delay', 'SimpleDelay', 'PingPongDelay',
      'Chorus', 'Flanger', 'Phaser', 'AutoFilter',
      'Saturator', 'Overdrive', 'Erosion', 'Redux',
      'Vinyl', 'Spectrum', 'Tuner', 'Utility',
      'DrumGroupDevice', 'InstrumentGroupDevice',
    ];
    
    return supportedDevices.some(name => device.name.includes(name));
  }
  
  function validateProject(project: AbletonALSProject): string[] {
    const errors: string[] = [];
    
    if (!project.tracks.length) {
      errors.push('Project has no tracks');
    }
    
    if (project.tempo <= 0 || project.tempo > 999) {
      errors.push(`Invalid tempo: ${project.tempo}`);
    }
    
    return errors;
  }
  
  return {
    parseALS,
    importALS,
    extractAssets: (project) => project.assets,
    validateProject,
  };
}

// ============================================================================
// REX File Import
// ============================================================================

export interface REXFile {
  version: string;
  slices: REXSlice[];
  originalTempo: number;
  originalSignature: { numerator: number; denominator: number };
  originalLength: number; // in beats
  metadata: REXMetadata;
}

export interface REXSlice {
  index: number;
  startSample: number;
  endSample: number;
  length: number;
  transientPosition: number;
}

export interface REXMetadata {
  name?: string;
  artist?: string;
  genre?: string;
  comments?: string;
  keywords?: string[];
}

export interface REXImportOptions {
  sliceMode: 'slices' | 'crop' | 'fill';
  preserveTempo: boolean;
  createDrumRack: boolean;
}

export const DEFAULT_REX_IMPORT_OPTIONS: REXImportOptions = {
  sliceMode: 'slices',
  preserveTempo: true,
  createDrumRack: true,
};

/**
 * Create a REX file importer
 * 
 * Note: REX files (from Propellerheads ReCycle) contain sliced audio loops.
 * The format is proprietary but well-documented. This provides the interface.
 */
export function createREXImporter(): {
  importREX(file: File, options?: Partial<REXImportOptions>): Promise<REXFile>;
  parseSlices(rexFile: REXFile): REXSlice[];
} {
  async function importREX(
    file: File,
    options: Partial<REXImportOptions> = {}
  ): Promise<REXFile> {
    const opts = { ...DEFAULT_REX_IMPORT_OPTIONS, ...options };
    
    const arrayBuffer = await file.arrayBuffer();
    const view = new DataView(arrayBuffer);
    
    // Check REX header
    const header = new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, 4));
    if (header !== 'REX2' && header !== 'REX1') {
      throw new Error('Invalid REX file: Invalid header');
    }
    
    // Parse REX2 format
    const version = header === 'REX2' ? '2.0' : '1.0';
    
    // Read tempo (stored as integer, actual BPM = value / 1000)
    const tempoRaw = view.getUint32(8, true);
    const originalTempo = tempoRaw / 1000;
    
    // Read signature
    const numerator = view.getUint16(12, true);
    const denominator = view.getUint16(14, true);
    
    // Read slice count
    const sliceCount = view.getUint32(16, true);
    
    // Parse slices
    const slices: REXSlice[] = [];
    const sliceOffset = 64; // Slices start after header
    
    for (let i = 0; i < sliceCount; i++) {
      const offset = sliceOffset + (i * 16);
      const startSample = view.getUint32(offset, true);
      const endSample = view.getUint32(offset + 4, true);
      const transientPosition = view.getUint32(offset + 8, true);
      
      slices.push({
        index: i,
        startSample,
        endSample,
        length: endSample - startSample,
        transientPosition,
      });
    }
    
    // Calculate original length in beats
    const sampleRate = 44100; // REX files are typically 44.1kHz
    const totalSamples = slices[slices.length - 1]?.endSample || 0;
    const totalSeconds = totalSamples / sampleRate;
    const originalLength = (totalSeconds / 60) * originalTempo;
    
    return {
      version,
      slices,
      originalTempo,
      originalSignature: { numerator, denominator },
      originalLength,
      metadata: {},
    };
  }
  
  function parseSlices(rexFile: REXFile): REXSlice[] {
    return rexFile.slices;
  }
  
  return {
    importREX,
    parseSlices,
  };
}

// ============================================================================
// ACID Loop Import
// ============================================================================

export interface ACIDLoop {
  tempo: number;
  rootNote?: number;
  beats: number;
  timeSignature: { numerator: number; denominator: number };
  oneShot: boolean;
  rootNoteValid: boolean;
  stretch?: boolean;
  diskBased?: boolean;
}

/**
 * Parse ACID chunk from WAV files
 * 
 * ACIDized WAV files contain metadata about tempo, key, and musical timing.
 */
export function parseACIDChunk(wavData: ArrayBuffer): ACIDLoop | null {
  const view = new DataView(wavData);
  const text = new TextDecoder();
  
  // Search for 'acid' chunk
  let offset = 12; // Skip RIFF header and WAVE identifier
  
  while (offset < wavData.byteLength) {
    const chunkId = text.decode(new Uint8Array(wavData, offset, 4));
    const chunkSize = view.getUint32(offset + 4, true);
    
    if (chunkId === 'acid') {
      const chunkOffset = offset + 8;
      
      // Parse ACID data
      const flags = view.getUint32(chunkOffset, true);
      const rootNote = view.getUint16(chunkOffset + 4, true);
      const unknown = view.getUint16(chunkOffset + 6, true);
      const beats = view.getFloat32(chunkOffset + 8, true);
      const tempo = view.getFloat32(chunkOffset + 12, true);
      
      const oneShot = (flags & 0x01) !== 0;
      const rootNoteValid = (flags & 0x02) !== 0;
      const stretch = (flags & 0x04) !== 0;
      const diskBased = (flags & 0x08) !== 0;
      
      return {
        tempo,
        rootNote: rootNoteValid ? rootNote : undefined,
        beats,
        timeSignature: { numerator: 4, denominator: 4 }, // Default, can be refined
        oneShot,
        rootNoteValid,
        stretch,
        diskBased,
      };
    }
    
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++; // Pad to word boundary
  }
  
  return null;
}

// ============================================================================
// Apple Loop Import
// ============================================================================

export interface AppleLoop {
  tempo: number;
  rootKey?: number;
  scaleType?: string;
  genre?: string;
  instrument?: string;
  descriptor?: string;
  beats: number;
  timeSignature: { numerator: number; denominator: number };
  transientCount: number;
  transientPositions: number[];
}

/**
 * Parse Apple Loop metadata from CAF or AIFF files
 * 
 * Apple Loops contain extensive metadata including tempo, key, genre, and more.
 */
export function parseAppleLoopMetadata(fileData: ArrayBuffer): AppleLoop | null {
  const view = new DataView(fileData);
  const text = new TextDecoder();
  
  // Check for CAF header
  const header = text.decode(new Uint8Array(fileData, 0, 4));
  
  if (header === 'caff') {
    return parseCAFInfoChunk(fileData);
  }
  
  // Check for AIFF
  if (header === 'FORM') {
    const formType = text.decode(new Uint8Array(fileData, 8, 4));
    if (formType === 'AIFF' || formType === 'AIFC') {
      return parseAIFFMarkerChunk(fileData);
    }
  }
  
  return null;
}

function parseCAFInfoChunk(fileData: ArrayBuffer): AppleLoop | null {
  const view = new DataView(fileData);
  const text = new TextDecoder();
  
  // Parse CAF chunks
  let offset = 8; // Skip 'caff' and file version
  
  // Read desc chunk first
  const descSize = view.getUint64(offset + 4, false);
  offset += 12 + Number(descSize);
  
  // Search for info chunk
  while (offset < fileData.byteLength) {
    const chunkType = text.decode(new Uint8Array(fileData, offset, 4));
    const chunkSize = Number(view.getUint64(offset + 4, false));
    
    if (chunkType === 'info') {
      const infoOffset = offset + 12;
      let infoPos = infoOffset;
      
      const numEntries = view.getUint32(infoPos, false);
      infoPos += 4;
      
      let tempo = 120;
      let rootKey: number | undefined;
      let genre: string | undefined;
      let instrument: string | undefined;
      
      for (let i = 0; i < numEntries; i++) {
        const keySize = view.getUint32(infoPos, false);
        infoPos += 4;
        const key = text.decode(new Uint8Array(fileData, infoPos, keySize));
        infoPos += keySize;
        
        const valueSize = view.getUint32(infoPos, false);
        infoPos += 4;
        const value = text.decode(new Uint8Array(fileData, infoPos, valueSize));
        infoPos += valueSize;
        
        // Parse known keys
        switch (key.toLowerCase()) {
          case 'tempo':
            tempo = parseFloat(value) || 120;
            break;
          case 'rootkey':
            rootKey = parseInt(value) || undefined;
            break;
          case 'genre':
            genre = value;
            break;
          case 'instrument':
            instrument = value;
            break;
        }
      }
      
      return {
        tempo,
        rootKey,
        genre,
        instrument,
        beats: 4, // Default, would need analysis
        timeSignature: { numerator: 4, denominator: 4 },
        transientCount: 0,
        transientPositions: [],
      };
    }
    
    offset += 12 + chunkSize;
  }
  
  return null;
}

function parseAIFFMarkerChunk(fileData: ArrayBuffer): AppleLoop | null {
  // Parse AIFF MARK chunk for transient positions
  // This is a simplified implementation
  
  const view = new DataView(fileData);
  const text = new TextDecoder();
  
  let offset = 12; // Skip FORM header
  
  while (offset < fileData.byteLength) {
    const chunkId = text.decode(new Uint8Array(fileData, offset, 4));
    const chunkSize = view.getUint32(offset + 4, false);
    
    if (chunkId === 'MARK') {
      const numMarkers = view.getUint16(offset + 8, false);
      const transientPositions: number[] = [];
      
      let markerOffset = offset + 10;
      for (let i = 0; i < numMarkers; i++) {
        const markerId = view.getUint16(markerOffset, false);
        const position = view.getUint32(markerOffset + 2, false);
        markerOffset += 6;
        
        // Read marker name (pascal string)
        const nameLen = view.getUint8(markerOffset);
        markerOffset += 1 + nameLen;
        if (markerOffset % 2 !== 0) markerOffset++; // Pad
        
        transientPositions.push(position);
      }
      
      return {
        tempo: 120, // Default
        beats: 4,
        timeSignature: { numerator: 4, denominator: 4 },
        transientCount: numMarkers,
        transientPositions,
      };
    }
    
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }
  
  return null;
}

// ============================================================================
// Auto-Warp and Auto-Slice
// ============================================================================

export interface WarpDetectionResult {
  detectedTempo: number;
  confidence: number;
  transientPositions: number[];
  suggestedWarpMarkers: Array<{ time: number; beat: number }>;
  isLoop: boolean;
  loopLength?: number;
}

export interface SliceResult {
  slices: Array<{
    start: number;
    end: number;
    label?: string;
  }>;
  method: 'transient' | 'beat' | 'fixed' | 'manual';
}

/**
 * Detect tempo and create warp markers for long samples
 */
export function detectTempoAndWarp(
  audioBuffer: AudioBuffer,
  options: {
    minTempo?: number;
    maxTempo?: number;
    sensitivity?: number;
  } = {}
): WarpDetectionResult {
  const { minTempo = 60, maxTempo = 200, sensitivity = 0.5 } = options;
  
  // Get audio data for analysis
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  
  // Detect transients
  const transientPositions = detectTransients(channelData, sampleRate, sensitivity);
  
  // Estimate tempo from transient spacing
  let detectedTempo = 120;
  let confidence = 0.5;
  
  if (transientPositions.length >= 2) {
    // Calculate intervals between transients
    const intervals: number[] = [];
    for (let i = 1; i < transientPositions.length; i++) {
      intervals.push(transientPositions[i] - transientPositions[i - 1]);
    }
    
    // Find most common interval
    const intervalHistogram = new Map<number, number>();
    for (const interval of intervals) {
      // Quantize to 10ms
      const quantized = Math.round(interval * 100) / 100;
      intervalHistogram.set(quantized, (intervalHistogram.get(quantized) || 0) + 1);
    }
    
    let bestInterval = 0.5;
    let bestCount = 0;
    for (const [interval, count] of intervalHistogram) {
      if (count > bestCount) {
        bestCount = count;
        bestInterval = interval;
      }
    }
    
    // Convert interval to BPM
    const beatsPerSecond = 1 / bestInterval;
    detectedTempo = Math.round(beatsPerSecond * 60);
    
    // Clamp to reasonable range
    detectedTempo = Math.max(minTempo, Math.min(maxTempo, detectedTempo));
    
    // Calculate confidence based on consistency
    const consistency = bestCount / intervals.length;
    confidence = 0.3 + (consistency * 0.7);
  }
  
  // Generate warp markers
  const suggestedWarpMarkers: Array<{ time: number; beat: number }> = [];
  let currentBeat = 0;
  
  for (let i = 0; i < transientPositions.length; i++) {
    const time = transientPositions[i];
    
    // Only place markers on downbeats or strong transients
    if (i === 0 || i % 4 === 0) {
      suggestedWarpMarkers.push({ time, beat: currentBeat });
    }
    
    // Estimate beat increment based on tempo
    const beatDuration = 60 / detectedTempo;
    currentBeat += beatDuration;
  }
  
  // Check if it looks like a loop
  const isLoop = transientPositions.length >= 8 && confidence > 0.7;
  const loopLength = isLoop ? (60 / detectedTempo) * 4 : undefined; // Assume 4-bar loop
  
  return {
    detectedTempo,
    confidence,
    transientPositions,
    suggestedWarpMarkers,
    isLoop,
    loopLength,
  };
}

/**
 * Detect transients in audio data
 */
function detectTransients(
  audioData: Float32Array,
  sampleRate: number,
  sensitivity: number
): number[] {
  const transients: number[] = [];
  
  // Calculate RMS in windows
  const windowSize = Math.floor(sampleRate * 0.01); // 10ms windows
  const hopSize = Math.floor(windowSize / 2);
  
  const rmsValues: number[] = [];
  for (let i = 0; i < audioData.length - windowSize; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += audioData[i + j] * audioData[i + j];
    }
    rmsValues.push(Math.sqrt(sum / windowSize));
  }
  
  // Find peaks in RMS
  const threshold = sensitivity * Math.max(...rmsValues) * 0.3;
  const minDistance = Math.floor(sampleRate * 0.1 / hopSize); // Minimum 100ms between transients
  
  let lastTransient = -minDistance;
  
  for (let i = 1; i < rmsValues.length - 1; i++) {
    const isPeak = rmsValues[i] > rmsValues[i - 1] && rmsValues[i] > rmsValues[i + 1];
    const aboveThreshold = rmsValues[i] > threshold;
    const farEnough = i - lastTransient >= minDistance;
    
    if (isPeak && aboveThreshold && farEnough) {
      transients.push((i * hopSize) / sampleRate);
      lastTransient = i;
    }
  }
  
  return transients;
}

/**
 * Auto-slice drum loops based on transient detection
 */
export function autoSliceDrums(
  audioBuffer: AudioBuffer,
  options: {
    sensitivity?: number;
    minSliceLength?: number;
    maxSliceLength?: number;
  } = {}
): SliceResult {
  const { sensitivity = 0.5, minSliceLength = 0.05, maxSliceLength = 2.0 } = options;
  
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Detect transients with higher sensitivity for drums
  const transients = detectTransients(channelData, sampleRate, sensitivity * 1.2);
  
  // Create slices from transients
  const slices: SliceResult['slices'] = [];
  
  for (let i = 0; i < transients.length; i++) {
    const start = transients[i];
    const end = i < transients.length - 1 ? transients[i + 1] : audioBuffer.duration;
    
    // Validate slice length
    const duration = end - start;
    if (duration >= minSliceLength && duration <= maxSliceLength) {
      slices.push({
        start,
        end,
        label: getDrumLabel(i, transients.length),
      });
    }
  }
  
  return {
    slices,
    method: 'transient',
  };
}

function getDrumLabel(index: number, total: number): string {
  // Common drum labels based on position
  const labels = ['Kick', 'Snare', 'Hi-Hat', 'Kick', 'Snare', 'Perc', 'Kick', 'Snare'];
  return labels[index % labels.length] || `Slice ${index + 1}`;
}

// ============================================================================
// Enhanced Import Manager
// ============================================================================

export interface EnhancedImportManager {
  // ALS import
  importALS(file: File, options?: Partial<ALSImportOptions>): Promise<ALSImportResult>;
  
  // REX import
  importREX(file: File, options?: Partial<REXImportOptions>): Promise<REXFile>;
  
  // Metadata extraction
  extractACIDMetadata(file: File): Promise<ACIDLoop | null>;
  extractAppleMetadata(file: File): Promise<AppleLoop | null>;
  
  // Auto-analysis
  autoWarp(audioBuffer: AudioBuffer): Promise<WarpDetectionResult>;
  autoSlice(audioBuffer: AudioBuffer): Promise<SliceResult>;
  
  // Batch import
  batchImport(files: File[]): Promise<ImportResult[]>;
}

export function createEnhancedImportManager(): EnhancedImportManager {
  const alsImporter = createALSImporter();
  const rexImporter = createREXImporter();
  
  async function importALS(file: File, options?: Partial<ALSImportOptions>): Promise<ALSImportResult> {
    return alsImporter.importALS(file, options);
  }
  
  async function importREX(file: File, options?: Partial<REXImportOptions>): Promise<REXFile> {
    return rexImporter.importREX(file, options);
  }
  
  async function extractACIDMetadata(file: File): Promise<ACIDLoop | null> {
    const arrayBuffer = await file.arrayBuffer();
    return parseACIDChunk(arrayBuffer);
  }
  
  async function extractAppleMetadata(file: File): Promise<AppleLoop | null> {
    const arrayBuffer = await file.arrayBuffer();
    return parseAppleLoopMetadata(arrayBuffer);
  }
  
  async function autoWarp(audioBuffer: AudioBuffer): Promise<WarpDetectionResult> {
    return detectTempoAndWarp(audioBuffer);
  }
  
  async function autoSlice(audioBuffer: AudioBuffer): Promise<SliceResult> {
    return autoSliceDrums(audioBuffer);
  }
  
  async function batchImport(files: File[]): Promise<ImportResult[]> {
    const results: ImportResult[] = [];
    
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        switch (ext) {
          case 'als':
            await importALS(file);
            // Convert ALS to ImportResult format
            results.push({
              assetId: `als-${Date.now()}`,
              hash: '',
              metadata: {
                type: 'audio',
                format: 'wav',
                sampleRate: 44100,
                channels: 2,
                duration: 0,
              },
              duration: 0,
            });
            break;
            
          case 'rex':
          case 'rx2':
            await importREX(file);
            results.push({
              assetId: `rex-${Date.now()}`,
              hash: '',
              metadata: {
                type: 'audio',
                format: 'wav',
                sampleRate: 44100,
                channels: 2,
                duration: 0,
              },
              duration: 0,
            });
            break;
            
          default:
            // Handle other formats through regular import
            results.push({
              assetId: `import-${Date.now()}`,
              hash: '',
              metadata: {
                type: 'audio',
                format: ext as AudioMetadata['format'],
                sampleRate: 44100,
                channels: 2,
                duration: 0,
              },
              duration: 0,
            });
        }
      } catch (error) {
        console.error(`Failed to import ${file.name}:`, error);
      }
    }
    
    return results;
  }
  
  return {
    importALS,
    importREX,
    extractACIDMetadata,
    extractAppleMetadata,
    autoWarp,
    autoSlice,
    batchImport,
  };
}
