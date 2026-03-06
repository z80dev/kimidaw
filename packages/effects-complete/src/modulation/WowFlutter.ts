/**
 * Wow & Flutter
 * 
 * Separate pitch modulation effect:
 * - Wow: Slow pitch variation (0.5-3 Hz)
 * - Flutter: Fast pitch variation (4-8 Hz)
 * - Delay-based implementation for true pitch shifting
 * - Adjustable depth and rate for each
 * 
 * Simulates tape speed variations and mechanical wow/flutter.
 */

import type { 
  PluginDefinition, 
  PluginInstanceRuntime,
  PluginHostContext,
  PluginConnectionGraph,
  PluginParameterSpec,
  AudioBuffer,
} from "@daw/plugin-api";
import { createParameterMap } from "@daw/plugin-api";
import { DelayLine, lerp, clamp } from "../core/DspUtils.js";
import { LFO } from "../core/DspUtils.js";

const PARAMETERS: PluginParameterSpec[] = [
  // Wow (slow)
  { id: "wowDepth", name: "Wow Depth", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "wowRate", name: "Wow Rate", kind: "float", min: 0.1, max: 5, defaultValue: 0.2, unit: "Hz" },
  { id: "wowDrift", name: "Wow Drift", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  
  // Flutter (fast)
  { id: "flutterDepth", name: "Flutter Depth", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "flutterRate", name: "Flutter Rate", kind: "float", min: 2, max: 15, defaultValue: 0.4, unit: "Hz" },
  
  // Scrape/flutter (very fast)
  { id: "scrapeDepth", name: "Scrape Depth", kind: "float", min: 0, max: 100, defaultValue: 0, unit: "%" },
  { id: "scrapeRate", name: "Scrape Rate", kind: "float", min: 10, max: 50, defaultValue: 0.3, unit: "Hz" },
  
  // Character
  { id: "randomness", name: "Random", kind: "float", min: 0, max: 100, defaultValue: 0.3, unit: "%" },
  { id: "stereo", name: "Stereo", kind: "float", min: 0, max: 100, defaultValue: 0.5, unit: "%" },
  
  // Mix
  { id: "dryWet", name: "Dry/Wet", kind: "float", min: 0, max: 100, defaultValue: 1, unit: "%" },
  { id: "output", name: "Output", kind: "float", min: -24, max: 24, defaultValue: 0.5, unit: "dB" },
  { id: "bypass", name: "Bypass", kind: "bool", min: 0, max: 1, defaultValue: 0 },
];

export class WowFlutterInstance implements PluginInstanceRuntime {
  private _params = createParameterMap(PARAMETERS);
  private _sampleRate = 48000;
  private _connected = false;
  
  // Delay lines for pitch modulation
  private _delayL: DelayLine;
  private _delayR: DelayLine;
  
  // LFOs for modulation
  private _wowLFO = new LFO();
  private _flutterLFO = new LFO();
  private _scrapeLFO = new LFO();
  private _driftLFO = new LFO();
  
  // Drift state (slow random walk)
  private _driftValue = 0;
  private _driftTarget = 0;
  private _driftSpeed = 0.001;

  constructor() {
    // Max delay of 50ms for modulation
    this._delayL = new DelayLine(0.05, 48000);
    this._delayR = new DelayLine(0.05, 48000);
  }

  prepare(config: { sampleRate: number; blockSize: number }): void {
    this._sampleRate = config.sampleRate;
    
    this._delayL.setSampleRate(this._sampleRate);
    this._delayR.setSampleRate(this._sampleRate);
    
    this._wowLFO.setSampleRate(this._sampleRate);
    this._flutterLFO.setSampleRate(this._sampleRate);
    this._scrapeLFO.setSampleRate(this._sampleRate);
    this._driftLFO.setSampleRate(this._sampleRate);
    
    this._wowLFO.setWaveform("sine");
    this._flutterLFO.setWaveform("triangle");
    this._scrapeLFO.setWaveform("sine");
    this._driftLFO.setWaveform("s&h");
  }

  connect(graph: PluginConnectionGraph): void {
    this._connected = true;
  }

  disconnect(): void {
    this._connected = false;
  }

  setParam(id: string, value: number): void {
    this._params.get(id)?.setNormalized(value);
  }

  getParam(id: string): number {
    return this._params.get(id)?.normalizedValue ?? 0;
  }

  async saveState(): Promise<unknown> {
    return this._params.getNormalizedValues();
  }

  async loadState(state: unknown): Promise<void> {
    if (state && typeof state === "object") {
      this._params.setNormalizedValues(state as Record<string, number>);
    }
  }

  getLatencySamples(): number { 
    // Latency from delay line center
    return Math.round(0.025 * this._sampleRate);
  }
  
  getTailSamples(): number { return 0; }

  reset(): void {
    this._delayL.reset();
    this._delayR.reset();
    this._wowLFO.reset();
    this._flutterLFO.reset();
    this._scrapeLFO.reset();
    this._driftLFO.reset();
    this._driftValue = 0;
    this._driftTarget = 0;
  }

  process(inputs: AudioBuffer[], outputs: AudioBuffer[], _midi: unknown[], blockSize: number): void {
    if (!this._connected || outputs.length < 1) return;

    const bypass = this._params.get("bypass")?.value >= 0.5;
    const wowDepth = (this._params.get("wowDepth")?.value ?? 0) / 100;
    const wowRate = this._params.get("wowRate")?.value ?? 0.5;
    const wowDrift = (this._params.get("wowDrift")?.value ?? 30) / 100;
    const flutterDepth = (this._params.get("flutterDepth")?.value ?? 0) / 100;
    const flutterRate = this._params.get("flutterRate")?.value ?? 4;
    const scrapeDepth = (this._params.get("scrapeDepth")?.value ?? 0) / 100;
    const scrapeRate = this._params.get("scrapeRate")?.value ?? 20;
    const randomness = (this._params.get("randomness")?.value ?? 30) / 100;
    const stereo = (this._params.get("stereo")?.value ?? 50) / 100;
    const dryWet = (this._params.get("dryWet")?.value ?? 100) / 100;
    const outputGain = Math.pow(10, (this._params.get("output")?.value ?? 0) / 20);

    const inputL = inputs[0]?.getChannelData(0) ?? new Float32Array(blockSize);
    const inputR = inputs[0]?.numberOfChannels > 1 
      ? inputs[0].getChannelData(1) 
      : inputL;
    const outputL = outputs[0].getChannelData(0);
    const outputR = outputs[0].numberOfChannels > 1 
      ? outputs[0].getChannelData(1) 
      : outputL;

    this._params.processSmoothing();

    // Set LFO rates
    this._wowLFO.setRate(wowRate * (0.8 + randomness * 0.4 * (Math.random() - 0.5)));
    this._flutterLFO.setRate(flutterRate);
    this._scrapeLFO.setRate(scrapeRate);
    this._driftLFO.setRate(0.1); // Very slow drift

    // Center delay (25ms)
    const centerDelayMs = 25;
    const centerDelaySamples = centerDelayMs * this._sampleRate / 1000;
    
    // Max modulation depths (in samples)
    const maxWowSamples = 5 * this._sampleRate / 1000; // 5ms max wow
    const maxFlutterSamples = 1 * this._sampleRate / 1000; // 1ms max flutter
    const maxScrapeSamples = 0.5 * this._sampleRate / 1000; // 0.5ms max scrape

    for (let i = 0; i < blockSize; i++) {
      const dryL = inputL[i];
      const dryR = inputR[i];

      if (bypass) {
        outputL[i] = dryL * outputGain;
        outputR[i] = dryR * outputGain;
        
        // Still write to delay line for seamless transitions
        this._delayL.write(dryL);
        this._delayR.write(dryR);
        continue;
      }

      // Write to delay lines
      this._delayL.write(dryL);
      this._delayR.write(dryR);

      // Update drift (slow random walk)
      this._driftValue += (this._driftTarget - this._driftValue) * this._driftSpeed;
      if (Math.random() < 0.001) {
        this._driftTarget = this._driftLFO.process() * wowDrift;
      }

      // Calculate modulation for left channel
      const wowL = this._wowLFO.process() * wowDepth;
      const flutterL = this._flutterLFO.process() * flutterDepth;
      const scrapeL = this._scrapeLFO.process() * scrapeDepth;
      
      // Modulation for right channel (with stereo offset)
      const wowR = wowL * (1 - stereo) + this._wowLFO.process() * wowDepth * stereo;
      const flutterR = flutterL * (1 - stereo) + this._flutterLFO.process() * flutterDepth * stereo;
      const scrapeR = scrapeL * (1 - stereo) + this._scrapeLFO.process() * scrapeDepth * stereo;

      // Calculate total delay for each channel
      const delayModL = wowL * maxWowSamples + flutterL * maxFlutterSamples + 
                       scrapeL * maxScrapeSamples + this._driftValue * maxWowSamples;
      const delayModR = wowR * maxWowSamples + flutterR * maxFlutterSamples + 
                       scrapeR * maxScrapeSamples + this._driftValue * maxWowSamples;

      const delaySamplesL = centerDelaySamples + delayModL;
      const delaySamplesR = centerDelaySamples + delayModR;

      // Read from delay line with interpolation
      const wetL = this._delayL.read(delaySamplesL);
      const wetR = this._delayR.read(delaySamplesR);

      // Mix dry/wet
      outputL[i] = (dryL * (1 - dryWet) + wetL * dryWet) * outputGain;
      outputR[i] = (dryR * (1 - dryWet) + wetR * dryWet) * outputGain;
    }
  }

  async dispose(): Promise<void> {}
}

export function createWowFlutterDefinition(): PluginDefinition {
  return {
    id: "com.daw.wow-flutter",
    name: "Wow & Flutter",
    category: "audioFx",
    version: "1.0.0",
    vendor: "DAW",
    description: "Pitch modulation simulating tape speed variations",
    parameters: PARAMETERS,
    ui: { type: "generic" },
    audioInputs: 2,
    audioOutputs: 2,
    midiInputs: 0,
    midiOutputs: 0,
    async createInstance(ctx: PluginHostContext): Promise<PluginInstanceRuntime> {
      const wf = new WowFlutterInstance();
      wf.prepare({ sampleRate: ctx.sampleRate, blockSize: ctx.maxBlockSize });
      return wf;
    },
  };
}
