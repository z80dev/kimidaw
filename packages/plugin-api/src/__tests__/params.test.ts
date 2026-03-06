import { describe, it, expect } from "vitest";
import {
  createLinearConverter,
  createLogConverter,
  createExpConverter,
  createFrequencyConverter,
  createDbConverter,
  createParameter,
  createParameterMap,
  ParameterChangeQueueImpl,
  ModulationMatrixImpl,
  snapToStep,
  formatParameterValue,
  clampNormalized,
  mapRange,
  midiToFrequency,
  frequencyToMidi,
  dbToGain,
  gainToDb,
} from "../params.js";
import type { PluginParameterSpec } from "../types.js";

describe("Parameter Converters", () => {
  describe("createLinearConverter", () => {
    it("should convert linear values correctly", () => {
      const converter = createLinearConverter(0, 100);
      
      expect(converter.toNormalized(0)).toBe(0);
      expect(converter.toNormalized(50)).toBe(0.5);
      expect(converter.toNormalized(100)).toBe(1);
      
      expect(converter.fromNormalized(0)).toBe(0);
      expect(converter.fromNormalized(0.5)).toBe(50);
      expect(converter.fromNormalized(1)).toBe(100);
    });

    it("should handle negative ranges", () => {
      const converter = createLinearConverter(-50, 50);
      
      expect(converter.toNormalized(0)).toBe(0.5);
      expect(converter.fromNormalized(0.5)).toBe(0);
    });
  });

  describe("createLogConverter", () => {
    it("should convert frequency values correctly", () => {
      const converter = createLogConverter(20, 20000);
      
      // At normalized 0.5, we should be around sqrt(20 * 20000) ≈ 632
      const midFreq = converter.fromNormalized(0.5);
      expect(midFreq).toBeGreaterThan(600);
      expect(midFreq).toBeLessThan(700);
      
      // Check roundtrip
      const freq = 1000;
      expect(converter.fromNormalized(converter.toNormalized(freq))).toBeCloseTo(freq, 0);
    });
  });

  describe("createExpConverter", () => {
    it("should convert time values with exponential curve", () => {
      const converter = createExpConverter(0, 1000);
      
      // At 0.5 normalized, value should be less than 500 due to exponential curve
      const midVal = converter.fromNormalized(0.5);
      expect(midVal).toBeLessThan(500);
    });
  });

  describe("createFrequencyConverter", () => {
    it("should use logarithmic scale for frequencies", () => {
      const converter = createFrequencyConverter();
      
      expect(converter.fromNormalized(0)).toBe(20);
      expect(converter.fromNormalized(1)).toBe(20000);
    });
  });

  describe("createDbConverter", () => {
    it("should convert dB values correctly", () => {
      const converter = createDbConverter(-96, 24);
      
      expect(converter.fromNormalized(0)).toBe(-96);
      expect(converter.fromNormalized(1)).toBe(24);
      expect(converter.fromNormalized(0.8)).toBeCloseTo(0, 0);
    });
  });
});

describe("Parameter Instance", () => {
  const floatSpec: PluginParameterSpec = {
    id: "gain",
    name: "Gain",
    kind: "float",
    min: 0,
    max: 100,
    defaultValue: 0.5,
    unit: "%",
  };

  const enumSpec: PluginParameterSpec = {
    id: "mode",
    name: "Mode",
    kind: "enum",
    min: 0,
    max: 2,
    defaultValue: 0,
    labels: ["Off", "On", "Auto"],
  };

  const boolSpec: PluginParameterSpec = {
    id: "bypass",
    name: "Bypass",
    kind: "bool",
    min: 0,
    max: 1,
    defaultValue: 0,
  };

  describe("createParameter", () => {
    it("should create a float parameter with correct defaults", () => {
      const param = createParameter(floatSpec);
      
      expect(param.spec.id).toBe("gain");
      expect(param.normalizedValue).toBe(0.5);
      expect(param.value).toBe(50); // 0.5 * 100
    });

    it("should create an enum parameter", () => {
      const param = createParameter(enumSpec);
      
      expect(param.spec.kind).toBe("enum");
      expect(param.toString()).toBe("Off");
    });

    it("should create a bool parameter", () => {
      const param = createParameter(boolSpec);
      
      expect(param.spec.kind).toBe("bool");
      expect(param.toString()).toBe("Off");
    });
  });

  describe("setValue", () => {
    it("should set denormalized value correctly", () => {
      const param = createParameter(floatSpec);
      
      param.setValue(75);
      expect(param.value).toBe(75);
      expect(param.normalizedValue).toBe(0.75);
    });

    it("should clamp values to valid range", () => {
      const param = createParameter(floatSpec);
      
      param.setValue(150); // Above max
      expect(param.normalizedValue).toBe(1);
      
      param.setValue(-50); // Below min
      expect(param.normalizedValue).toBe(0);
    });
  });

  describe("setNormalized", () => {
    it("should clamp normalized values to [0, 1]", () => {
      const param = createParameter(floatSpec);
      
      param.setNormalized(1.5);
      expect(param.normalizedValue).toBe(1);
      
      param.setNormalized(-0.5);
      expect(param.normalizedValue).toBe(0);
    });
  });

  describe("toString", () => {
    it("should format float values correctly", () => {
      const param = createParameter(floatSpec);
      param.setValue(42.5);
      
      expect(param.toString()).toContain("42.5");
      expect(param.toString()).toContain("%");
    });

    it("should format enum values correctly", () => {
      const param = createParameter(enumSpec);
      
      expect(param.toString()).toBe("Off");
      
      param.setNormalized(1);
      expect(param.toString()).toBe("On");
      
      param.setNormalized(2);
      expect(param.toString()).toBe("Auto");
    });

    it("should format bool values correctly", () => {
      const param = createParameter(boolSpec);
      
      expect(param.toString()).toBe("Off");
      
      param.setNormalized(1);
      expect(param.toString()).toBe("On");
    });
  });

  describe("reset", () => {
    it("should reset to default value", () => {
      const param = createParameter(floatSpec);
      
      param.setValue(90);
      expect(param.value).toBe(90);
      
      param.reset();
      expect(param.value).toBe(50); // default
    });
  });

  describe("smoothing", () => {
    it("should smooth parameter changes over time", () => {
      const param = createParameter(floatSpec);
      param.setTarget(100, 10, 48000); // 10ms time constant
      
      // After first sample, should not yet be at target
      param.processSmoothing();
      expect(param.value).toBeLessThan(100);
      expect(param.value).toBeGreaterThan(50);
    });
  });
});

describe("ParameterMap", () => {
  const specs: PluginParameterSpec[] = [
    { id: "p1", name: "Param 1", kind: "float", min: 0, max: 100, defaultValue: 0 },
    { id: "p2", name: "Param 2", kind: "float", min: 0, max: 100, defaultValue: 0.5 },
    { id: "p3", name: "Param 3", kind: "float", min: 0, max: 100, defaultValue: 1 },
  ];

  it("should create map from specs", () => {
    const map = createParameterMap(specs);
    
    expect(map.keys()).toHaveLength(3);
    expect(map.has("p1")).toBe(true);
    expect(map.has("p2")).toBe(true);
    expect(map.has("p3")).toBe(true);
  });

  it("should get parameter by id", () => {
    const map = createParameterMap(specs);
    const param = map.get("p2");
    
    expect(param).toBeDefined();
    expect(param!.spec.id).toBe("p2");
  });

  it("should return undefined for unknown parameter", () => {
    const map = createParameterMap(specs);
    
    expect(map.get("unknown")).toBeUndefined();
  });

  it("should get all values", () => {
    const map = createParameterMap(specs);
    const values = map.getValues();
    
    expect(values.p1).toBe(0);
    expect(values.p2).toBe(50);
    expect(values.p3).toBe(100);
  });

  it("should set normalized values", () => {
    const map = createParameterMap(specs);
    
    map.setNormalizedValues({ p1: 0.5, p2: 0.75 });
    
    expect(map.get("p1")!.normalizedValue).toBe(0.5);
    expect(map.get("p2")!.normalizedValue).toBe(0.75);
  });

  it("should reset all parameters", () => {
    const map = createParameterMap(specs);
    
    map.setNormalizedValues({ p1: 1, p2: 0, p3: 0.5 });
    map.resetAll();
    
    expect(map.get("p1")!.normalizedValue).toBe(0);
    expect(map.get("p2")!.normalizedValue).toBe(0.5);
    expect(map.get("p3")!.normalizedValue).toBe(1);
  });

  it("should process smoothing for all parameters", () => {
    const map = createParameterMap(specs);
    const param = map.get("p1")!;
    
    param.setTarget(100, 10, 48000);
    expect(param.value).toBe(0); // Not yet smoothed
    
    map.processSmoothing();
    expect(param.value).toBeGreaterThan(0);
  });
});

describe("ParameterChangeQueue", () => {
  it("should enqueue and process parameter changes", () => {
    const queue = new ParameterChangeQueueImpl();
    const changes: Array<{ paramId: string; value: number; offset: number }> = [];
    
    queue.enqueue("cutoff", 0.5, 10);
    queue.enqueue("resonance", 0.7, 20);
    
    queue.processBlock(128, (paramId, value, sampleOffset) => {
      changes.push({ paramId, value, offset: sampleOffset });
    });
    
    expect(changes).toHaveLength(2);
    expect(changes[0]).toEqual({ paramId: "cutoff", value: 0.5, offset: 10 });
    expect(changes[1]).toEqual({ paramId: "resonance", value: 0.7, offset: 20 });
  });

  it("should not process changes beyond block size", () => {
    const queue = new ParameterChangeQueueImpl();
    const changes: Array<{ paramId: string; value: number; offset: number }> = [];
    
    queue.enqueue("p1", 0.5, 200); // Beyond 128-sample block
    
    queue.processBlock(128, (paramId, value, sampleOffset) => {
      changes.push({ paramId, value, offset: sampleOffset });
    });
    
    expect(changes).toHaveLength(0);
  });

  it("should adjust offset for next block", () => {
    const queue = new ParameterChangeQueueImpl();
    const changes: Array<{ paramId: string; value: number; offset: number }> = [];
    
    queue.enqueue("p1", 0.5, 200);
    
    // First block - shouldn't get the change
    queue.processBlock(128, (paramId, value, sampleOffset) => {
      changes.push({ paramId, value, offset: sampleOffset });
    });
    expect(changes).toHaveLength(0);
    
    // Second block - should get it with adjusted offset
    queue.processBlock(128, (paramId, value, sampleOffset) => {
      changes.push({ paramId, value, offset: sampleOffset });
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].offset).toBe(72); // 200 - 128
  });

  it("should handle queue overflow by dropping oldest", () => {
    const queue = new ParameterChangeQueueImpl(4); // Small capacity
    const changes: Array<{ paramId: string; value: number; offset: number }> = [];
    
    // Fill beyond capacity
    queue.enqueue("p1", 0.1, 0);
    queue.enqueue("p2", 0.2, 1);
    queue.enqueue("p3", 0.3, 2);
    queue.enqueue("p4", 0.4, 3);
    queue.enqueue("p5", 0.5, 4); // Should drop p1
    
    queue.processBlock(128, (paramId, value, sampleOffset) => {
      changes.push({ paramId, value, offset: sampleOffset });
    });
    
    // p1 should have been dropped
    const ids = changes.map(c => c.paramId);
    expect(ids).not.toContain("p1");
    expect(ids).toContain("p5");
  });

  it("should clear all pending changes", () => {
    const queue = new ParameterChangeQueueImpl();
    const changes: Array<{ paramId: string; value: number; offset: number }> = [];
    
    queue.enqueue("p1", 0.5, 10);
    queue.clear();
    
    queue.processBlock(128, (paramId, value, sampleOffset) => {
      changes.push({ paramId, value, offset: sampleOffset });
    });
    
    expect(changes).toHaveLength(0);
  });
});

describe("ModulationMatrix", () => {
  it("should add and retrieve modulation routes", () => {
    const matrix = new ModulationMatrixImpl();
    
    matrix.addRoute({
      sourceId: "lfo1",
      targetParamId: "cutoff",
      amount: 0.5,
      bipolar: true,
    });
    
    const routes = matrix.getRoutesForParam("cutoff");
    expect(routes).toHaveLength(1);
    expect(routes[0].sourceId).toBe("lfo1");
  });

  it("should remove modulation routes", () => {
    const matrix = new ModulationMatrixImpl();
    
    matrix.addRoute({ sourceId: "lfo1", targetParamId: "cutoff", amount: 0.5, bipolar: false });
    matrix.removeRoute("lfo1", "cutoff");
    
    expect(matrix.getRoutesForParam("cutoff")).toHaveLength(0);
  });

  it("should replace existing route for same source/target", () => {
    const matrix = new ModulationMatrixImpl();
    
    matrix.addRoute({ sourceId: "lfo1", targetParamId: "cutoff", amount: 0.5, bipolar: false });
    matrix.addRoute({ sourceId: "lfo1", targetParamId: "cutoff", amount: 0.8, bipolar: true });
    
    const routes = matrix.getRoutesForParam("cutoff");
    expect(routes).toHaveLength(1);
    expect(routes[0].amount).toBe(0.8);
    expect(routes[0].bipolar).toBe(true);
  });

  it("should clear all routes", () => {
    const matrix = new ModulationMatrixImpl();
    
    matrix.addRoute({ sourceId: "lfo1", targetParamId: "cutoff", amount: 0.5, bipolar: false });
    matrix.addRoute({ sourceId: "env1", targetParamId: "resonance", amount: 0.3, bipolar: false });
    matrix.clear();
    
    expect(matrix.getRoutesForParam("cutoff")).toHaveLength(0);
    expect(matrix.getRoutesForParam("resonance")).toHaveLength(0);
  });
});

describe("Utility Functions", () => {
  describe("snapToStep", () => {
    it("should snap values to step size", () => {
      expect(snapToStep(1.4, 1)).toBe(1);
      expect(snapToStep(1.6, 1)).toBe(2);
      expect(snapToStep(1.5, 0.5)).toBe(1.5);
    });

    it("should return original value if no step", () => {
      expect(snapToStep(1.5, undefined)).toBe(1.5);
    });
  });

  describe("formatParameterValue", () => {
    it("should format bool values", () => {
      expect(formatParameterValue(0, "bool")).toBe("Off");
      expect(formatParameterValue(1, "bool")).toBe("On");
    });

    it("should format enum values", () => {
      expect(formatParameterValue(0, "enum", undefined, ["A", "B", "C"])).toBe("A");
      expect(formatParameterValue(1, "enum", undefined, ["A", "B", "C"])).toBe("B");
    });

    it("should format int values", () => {
      expect(formatParameterValue(42, "int", "ms")).toBe("42ms");
    });

    it("should format float values", () => {
      expect(formatParameterValue(3.14159, "float", "Hz")).toBe("3.14Hz");
    });
  });

  describe("clampNormalized", () => {
    it("should clamp values to [0, 1]", () => {
      expect(clampNormalized(0.5)).toBe(0.5);
      expect(clampNormalized(-0.5)).toBe(0);
      expect(clampNormalized(1.5)).toBe(1);
    });
  });

  describe("mapRange", () => {
    it("should map values between ranges", () => {
      expect(mapRange(0.5, 0, 1, 0, 100)).toBe(50);
      expect(mapRange(0, -1, 1, 0, 100)).toBe(50);
      expect(mapRange(1, 0, 1, -50, 50)).toBe(50);
    });
  });

  describe("midiToFrequency", () => {
    it("should convert MIDI note to frequency", () => {
      expect(midiToFrequency(69)).toBe(440);
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
      expect(midiToFrequency(57)).toBeCloseTo(220, 1);
    });
  });

  describe("frequencyToMidi", () => {
    it("should convert frequency to MIDI note", () => {
      expect(frequencyToMidi(440)).toBe(69);
      expect(frequencyToMidi(261.63)).toBeCloseTo(60, 0);
    });
  });

  describe("dbToGain", () => {
    it("should convert dB to linear gain", () => {
      expect(dbToGain(0)).toBe(1);
      expect(dbToGain(-6)).toBeCloseTo(0.5, 1);
      expect(dbToGain(6)).toBeCloseTo(2, 0);
    });
  });

  describe("gainToDb", () => {
    it("should convert linear gain to dB", () => {
      expect(gainToDb(1)).toBe(0);
      expect(gainToDb(0.5)).toBeCloseTo(-6, 0);
      expect(gainToDb(2)).toBeCloseTo(6, 0);
    });

    it("should return -Infinity for zero gain", () => {
      expect(gainToDb(0)).toBe(-Infinity);
    });
  });
});
