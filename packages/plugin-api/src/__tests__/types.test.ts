import { describe, it, expect } from "vitest";
import type { 
  PluginDefinition, 
  PluginParameterSpec, 
  PluginInstanceRuntime,
  MidiEvent,
  AudioBuffer 
} from "../types.js";

describe("Plugin Types", () => {
  describe("PluginDefinition", () => {
    it("should accept a valid instrument definition", () => {
      const def: PluginDefinition = {
        id: "com.test.synth",
        name: "Test Synth",
        category: "instrument",
        version: "1.0.0",
        vendor: "Test Corp",
        description: "A test synthesizer",
        parameters: [],
        ui: { type: "generic" },
        audioInputs: 0,
        audioOutputs: 2,
        midiInputs: 1,
        midiOutputs: 0,
        supportsMpe: false,
        hasSidechain: false,
        async createInstance(ctx) {
          return {
            connect: () => {},
            disconnect: () => {},
            setParam: () => {},
            getParam: () => 0,
            saveState: async () => ({}),
            loadState: async () => {},
            getLatencySamples: () => 0,
            getTailSamples: () => 0,
            reset: () => {},
            prepare: () => {},
            process: () => {},
            dispose: async () => {},
          };
        },
      };

      expect(def.id).toBe("com.test.synth");
      expect(def.category).toBe("instrument");
      expect(def.audioInputs).toBe(0);
      expect(def.audioOutputs).toBe(2);
    });

    it("should accept a valid effect definition", () => {
      const def: PluginDefinition = {
        id: "com.test.reverb",
        name: "Test Reverb",
        category: "audioFx",
        version: "1.0.0",
        parameters: [],
        ui: { type: "generic" },
        audioInputs: 2,
        audioOutputs: 2,
        midiInputs: 0,
        midiOutputs: 0,
        async createInstance() {
          return null as unknown as PluginInstanceRuntime;
        },
      };

      expect(def.category).toBe("audioFx");
      expect(def.audioInputs).toBe(2);
    });
  });

  describe("PluginParameterSpec", () => {
    it("should accept a complete float parameter", () => {
      const param: PluginParameterSpec = {
        id: "cutoff",
        name: "Cutoff Frequency",
        kind: "float",
        min: 20,
        max: 20000,
        defaultValue: 1000,
        unit: "Hz",
        automationRate: "a-rate",
        group: "Filter",
        automatable: true,
        visible: true,
        description: "Filter cutoff frequency",
      };

      expect(param.kind).toBe("float");
      expect(param.automationRate).toBe("a-rate");
    });

    it("should accept an enum parameter with labels", () => {
      const param: PluginParameterSpec = {
        id: "filterType",
        name: "Filter Type",
        kind: "enum",
        min: 0,
        max: 3,
        defaultValue: 0,
        labels: ["Lowpass", "Highpass", "Bandpass", "Notch"],
      };

      expect(param.kind).toBe("enum");
      expect(param.labels).toHaveLength(4);
    });

    it("should accept a boolean parameter", () => {
      const param: PluginParameterSpec = {
        id: "bypass",
        name: "Bypass",
        kind: "bool",
        min: 0,
        max: 1,
        defaultValue: 0,
      };

      expect(param.kind).toBe("bool");
    });

    it("should accept an integer parameter with step", () => {
      const param: PluginParameterSpec = {
        id: "voices",
        name: "Voice Count",
        kind: "int",
        min: 1,
        max: 16,
        defaultValue: 8,
        step: 1,
      };

      expect(param.kind).toBe("int");
      expect(param.step).toBe(1);
    });
  });

  describe("MidiEvent", () => {
    it("should create a note on event", () => {
      const event: MidiEvent = {
        type: "noteOn",
        sampleOffset: 32,
        channel: 0,
        data: { note: 60, velocity: 100 },
      };

      expect(event.type).toBe("noteOn");
      expect(event.data.note).toBe(60);
      expect(event.data.velocity).toBe(100);
    });

    it("should create a CC event", () => {
      const event: MidiEvent = {
        type: "cc",
        sampleOffset: 0,
        channel: 0,
        data: { controller: 7, value: 100 },
      };

      expect(event.type).toBe("cc");
      expect(event.data.controller).toBe(7);
    });

    it("should create a pitch bend event", () => {
      const event: MidiEvent = {
        type: "pitchBend",
        sampleOffset: 64,
        channel: 0,
        data: { value: 0 },
      };

      expect(event.data.value).toBe(0);
    });
  });

  describe("AudioBuffer", () => {
    it("should provide correct buffer interface", () => {
      // Create a mock AudioBuffer-like object
      const buffer: AudioBuffer = {
        numberOfChannels: 2,
        length: 128,
        sampleRate: 48000,
        duration: 128 / 48000,
        getChannelData: (channel: number) => new Float32Array(128),
        copyFrom: () => {},
        clear: () => {},
      };

      expect(buffer.numberOfChannels).toBe(2);
      expect(buffer.length).toBe(128);
      expect(buffer.sampleRate).toBe(48000);
      expect(buffer.getChannelData(0)).toHaveLength(128);
    });
  });
});
