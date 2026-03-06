/**
 * Arpeggiator MIDI Effect
 * 
 * An Ableton-style arpeggiator that transforms held notes into rhythmic patterns.
 * 
 * @example
 * ```typescript
 * import { Arpeggiator } from "@daw/midi-effects/arpeggiator";
 * 
 * const arp = new Arpeggiator();
 * arp.setParameter("style", "up-down");
 * arp.setParameter("rate", "1/16");
 * arp.setParameter("gate", 75);
 * 
 * // In your processing loop
 * const outputEvents = arp.process(inputEvents, currentSampleTime);
 * ```
 */

export { Arpeggiator } from "./arpeggiator.js";
export type {
  ArpeggiatorParams,
  ArpeggiatorState,
  ArpStep,
  ArpStyle,
  VelocityMode,
  RetriggerMode,
  DistanceStyle,
} from "./types.js";
export { DEFAULT_ARPEGGIATOR_PARAMS } from "./types.js";
