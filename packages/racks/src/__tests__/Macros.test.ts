import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MacroMappingManager,
  MacroController,
  MacroBank,
  createMacroMapping,
  isValidMacroValue,
  isValidMidiCC,
  DEFAULT_MACRO_COLORS,
} from "../Macros.js";
import type { Macro, MacroMapping } from "../types.js";

describe("MacroMappingManager", () => {
  const baseMapping: MacroMapping = {
    id: "test-mapping",
    deviceId: "device1",
    paramId: "param1",
    minValue: 0,
    maxValue: 1,
    inverted: false,
    curve: 0,
  };

  it("should map value linearly", () => {
    const manager = new MacroMappingManager(baseMapping);
    
    expect(manager.mapValue(0)).toBe(0);
    expect(manager.mapValue(0.5)).toBe(0.5);
    expect(manager.mapValue(1)).toBe(1);
  });

  it("should map to target range", () => {
    const manager = new MacroMappingManager({
      ...baseMapping,
      minValue: 0.2,
      maxValue: 0.8,
    });
    
    expect(manager.mapValue(0)).toBe(0.2);
    expect(manager.mapValue(1)).toBe(0.8);
  });

  it("should invert mapping", () => {
    const manager = new MacroMappingManager({
      ...baseMapping,
      inverted: true,
    });
    
    expect(manager.mapValue(0)).toBe(1);
    expect(manager.mapValue(1)).toBe(0);
  });

  it("should apply curve", () => {
    const manager = new MacroMappingManager({
      ...baseMapping,
      curve: -0.5, // Exponential
    });
    
    // Exponential curve should give smaller values at the start
    expect(manager.mapValue(0.5)).toBeLessThan(0.5);
  });

  it("should reverse map value", () => {
    const manager = new MacroMappingManager({
      ...baseMapping,
      minValue: 0,
      maxValue: 100,
    });
    
    const macroValue = manager.reverseMapValue(50);
    expect(macroValue).toBeCloseTo(0.5, 1);
  });

  it("should track when to update", () => {
    const manager = new MacroMappingManager(baseMapping);
    
    expect(manager.shouldUpdate(0.5)).toBe(true);
    manager.markSent(0.5);
    expect(manager.shouldUpdate(0.5001)).toBe(false);
    expect(manager.shouldUpdate(0.51)).toBe(true);
  });
});

describe("MacroController", () => {
  const createBaseMacro = (): Macro => ({
    id: 1,
    name: "Test Macro",
    value: 0.5,
    defaultValue: 0,
    mappings: [],
    midiCC: null,
    color: DEFAULT_MACRO_COLORS[0],
  });

  let controller: MacroController;

  beforeEach(() => {
    controller = new MacroController(createBaseMacro());
  });

  it("should get and set value", () => {
    expect(controller.value).toBe(0.5);
    
    controller.value = 0.8;
    expect(controller.value).toBe(0.8);
  });

  it("should clamp value to 0-1", () => {
    controller.value = 1.5;
    expect(controller.value).toBe(1);
    
    controller.value = -0.5;
    expect(controller.value).toBe(0);
  });

  it("should reset to default", () => {
    controller.value = 0.8;
    controller.resetToDefault();
    expect(controller.value).toBe(0);
  });

  it("should convert to/from MIDI value", () => {
    controller.setMidiValue(64);
    expect(controller.value).toBeCloseTo(0.5, 2);
    expect(controller.getMidiValue()).toBe(64);
  });

  it("should add and remove mappings", () => {
    const mapping = controller.addMapping({
      deviceId: "device1",
      paramId: "param1",
      minValue: 0,
      maxValue: 1,
      inverted: false,
      curve: 0,
    });

    expect(controller.mappingCount).toBe(1);
    expect(mapping.deviceId).toBe("device1");

    const removed = controller.removeMapping(mapping.id);
    expect(removed).toBe(true);
    expect(controller.mappingCount).toBe(0);
  });

  it("should get mappings for device", () => {
    controller.addMapping({
      deviceId: "device1",
      paramId: "param1",
      minValue: 0,
      maxValue: 1,
      inverted: false,
      curve: 0,
    });
    
    controller.addMapping({
      deviceId: "device2",
      paramId: "param1",
      minValue: 0,
      maxValue: 1,
      inverted: false,
      curve: 0,
    });

    const device1Mappings = controller.getMappingsForDevice("device1");
    expect(device1Mappings.length).toBeGreaterThanOrEqual(1);
  });

  it("should emit value change events", () => {
    const callback = vi.fn();
    const unsubscribe = controller.onValueChanged(callback);

    controller.value = 0.8;
    expect(callback).toHaveBeenCalledWith(0.8);

    unsubscribe();
    controller.value = 0.9;
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should process mappings and return updates", () => {
    controller.addMapping({
      deviceId: "device1",
      paramId: "param1",
      minValue: 0,
      maxValue: 100,
      inverted: false,
      curve: 0,
    });

    controller.value = 0.5;
    const updates = controller.processMappings();

    expect(updates.length).toBeGreaterThanOrEqual(1);
    expect(updates[0]!.value).toBe(50);
  });
});

describe("MacroBank", () => {
  let bank: MacroBank;

  beforeEach(() => {
    bank = new MacroBank();
  });

  it("should create 8 default macros", () => {
    const macros = bank.getAllMacros();
    expect(macros).toHaveLength(8);
    expect(macros[0]!.name).toBe("Macro 1");
  });

  it("should get macro by ID", () => {
    const macro = bank.getMacro(1);
    expect(macro).toBeDefined();
    expect(macro!.id).toBe(1);
  });

  it("should set and get macro value", () => {
    bank.setMacroValue(1, 0.75);
    expect(bank.getMacroValue(1)).toBe(0.75);
  });

  it("should assign MIDI CC", () => {
    bank.assignMidiCC(1, 16);
    expect(bank.getMacro(1)!.midiCC).toBe(16);
  });

  it("should handle MIDI CC input", () => {
    bank.assignMidiCC(1, 16);
    const handled = bank.handleMidiCC(16, 64);
    
    expect(handled).toBe(true);
    expect(bank.getMacroValue(1)).toBeCloseTo(0.5, 2);
  });

  it("should clear all MIDI assignments", () => {
    bank.assignMidiCC(1, 16);
    bank.assignMidiCC(2, 17);
    
    bank.clearAllMidiAssignments();
    
    expect(bank.getMacro(1)!.midiCC).toBeNull();
    expect(bank.getMacro(2)!.midiCC).toBeNull();
  });

  it("should reset all to default", () => {
    bank.setMacroValue(1, 0.5);
    bank.setMacroValue(2, 0.8);
    
    bank.resetAllToDefault();
    
    expect(bank.getMacroValue(1)).toBe(0);
    expect(bank.getMacroValue(2)).toBe(0);
  });

  it("should emit any macro changed events", () => {
    const callback = vi.fn();
    const unsubscribe = bank.onAnyMacroChanged(callback);

    bank.setMacroValue(3, 0.6);
    expect(callback).toHaveBeenCalledWith(3, 0.6);

    unsubscribe();
  });

  it("should count total mappings", () => {
    const macro1 = bank.getMacro(1)!;
    macro1.addMapping({
      deviceId: "device1",
      paramId: "param1",
      minValue: 0,
      maxValue: 1,
      inverted: false,
      curve: 0,
    });

    expect(bank.getTotalMappingCount()).toBe(1);
  });
});

describe("Utility Functions", () => {
  it("should create macro mapping", () => {
    const mapping = createMacroMapping("device1", "param1", {
      minValue: 0.2,
      maxValue: 0.8,
    });

    expect(mapping.deviceId).toBe("device1");
    expect(mapping.paramId).toBe("param1");
    expect(mapping.minValue).toBe(0.2);
    expect(mapping.maxValue).toBe(0.8);
  });

  it("should validate macro value", () => {
    expect(isValidMacroValue(0.5)).toBe(true);
    expect(isValidMacroValue(0)).toBe(true);
    expect(isValidMacroValue(1)).toBe(true);
    expect(isValidMacroValue(-0.1)).toBe(false);
    expect(isValidMacroValue(1.1)).toBe(false);
  });

  it("should validate MIDI CC", () => {
    expect(isValidMidiCC(0)).toBe(true);
    expect(isValidMidiCC(127)).toBe(true);
    expect(isValidMidiCC(64)).toBe(true);
    expect(isValidMidiCC(-1)).toBe(false);
    expect(isValidMidiCC(128)).toBe(false);
    expect(isValidMidiCC(0.5)).toBe(false);
  });
});
