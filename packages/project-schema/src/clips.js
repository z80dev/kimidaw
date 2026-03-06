/**
 * Clip type definitions for the DAW
 *
 * Implements sections 7.3 and 7.4 of the engineering spec
 */
/** Scale definitions (intervals in semitones) */
export const SCALE_INTERVALS = {
    'major': [0, 2, 4, 5, 7, 9, 11],
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'locrian': [0, 1, 3, 5, 6, 8, 10],
    'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
    'melodic-minor': [0, 2, 3, 5, 7, 9, 11],
    'pentatonic-major': [0, 2, 4, 7, 9],
    'pentatonic-minor': [0, 3, 5, 7, 10],
    'blues': [0, 3, 5, 6, 7, 10],
    'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
// ==================== Clip Operations ====================
/** Calculate clip duration in ticks */
export function getClipDuration(clip) {
    return clip.endTick - clip.startTick;
}
/** Get the looped duration accounting for loop settings */
export function getLoopedDuration(clip) {
    if (!clip.loop?.enabled) {
        return getClipDuration(clip);
    }
    const loopDuration = clip.loop.endTick - clip.loop.startTick;
    return Math.max(loopDuration, getClipDuration(clip));
}
/** Check if a MIDI note is within a given time range */
export function noteOverlapsRange(note, startTick, endTick) {
    const noteStart = note.startTick;
    const noteEnd = note.startTick + note.durationTicks;
    return noteStart < endTick && noteEnd > startTick;
}
/** Quantize a note to a grid */
export function quantizeNote(note, gridTicks, strength = 1.0, swing = 0.0) {
    const originalStart = note.startTick;
    // Base quantization
    const gridPosition = Math.round(originalStart / gridTicks);
    let quantizedStart = gridPosition * gridTicks;
    // Apply swing to off-beats
    if (swing > 0 && gridPosition % 2 === 1) {
        quantizedStart += Math.floor(gridTicks * swing);
    }
    // Apply strength (blend between original and quantized)
    const finalStart = Math.round(originalStart * (1 - strength) + quantizedStart * strength);
    return {
        ...note,
        startTick: finalStart,
    };
}
/** Split a MIDI note at a given tick position */
export function splitNote(note, splitTick) {
    const noteEnd = note.startTick + note.durationTicks;
    // Check if split point is within the note
    if (splitTick <= note.startTick || splitTick >= noteEnd) {
        return null;
    }
    const firstDuration = splitTick - note.startTick;
    const secondDuration = noteEnd - splitTick;
    const first = {
        ...note,
        id: `${note.id}-a`,
        durationTicks: firstDuration,
    };
    const second = {
        ...note,
        id: `${note.id}-b`,
        startTick: splitTick,
        durationTicks: secondDuration,
    };
    return [first, second];
}
/** Transpose a MIDI note */
export function transposeNote(note, semitones) {
    return {
        ...note,
        note: Math.max(0, Math.min(127, note.note + semitones)),
    };
}
/** Get notes within a time range */
export function getNotesInRange(clip, startTick, endTick) {
    return clip.notes.filter((note) => noteOverlapsRange(note, startTick, endTick));
}
/** Create a new empty MIDI clip */
export function createMidiClip(id, startTick, durationTicks, options) {
    return {
        id,
        name: options?.name,
        color: options?.color,
        startTick,
        endTick: startTick + durationTicks,
        loop: options?.loop ?? null,
        notes: [],
        cc: [],
        pitchBend: [],
        channelPressure: [],
        polyAftertouch: [],
        programChanges: [],
        mpe: [],
    };
}
/** Create a new empty audio clip */
export function createAudioClip(id, assetId, startTick, durationTicks, options) {
    return {
        id,
        name: options?.name,
        color: options?.color,
        assetId,
        lane: options?.lane ?? 0,
        startTick,
        endTick: startTick + durationTicks,
        sourceStartSample: 0,
        sourceEndSample: 0,
        gainDb: options?.gainDb ?? 0,
        transposeSemitones: 0,
        fineTuneCents: 0,
        reverse: false,
        fades: {
            inCurve: 'linear',
            outCurve: 'linear',
            inSamples: 0,
            outSamples: 0,
        },
        stretchQuality: 'good',
        isComped: false,
    };
}
/** Check if note is in scale */
export function isNoteInScale(note, scale) {
    const intervals = SCALE_INTERVALS[scale.mode];
    const noteInOctave = note % 12;
    const rootInOctave = scale.root % 12;
    // Check if the note's offset from root is in the scale
    const offset = (noteInOctave - rootInOctave + 12) % 12;
    return intervals.includes(offset);
}
/** Snap note to nearest scale note */
export function snapToScale(note, scale) {
    if (isNoteInScale(note, scale)) {
        return note;
    }
    const intervals = SCALE_INTERVALS[scale.mode];
    const octave = Math.floor(note / 12);
    const noteInOctave = note % 12;
    const rootInOctave = scale.root % 12;
    // Find closest scale note
    let closestNote = note;
    let closestDistance = Infinity;
    for (const interval of intervals) {
        const scaleNoteInOctave = (rootInOctave + interval) % 12;
        const distance = Math.abs(noteInOctave - scaleNoteInOctave);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestNote = octave * 12 + scaleNoteInOctave;
        }
        else if (distance === closestDistance && scaleNoteInOctave < (closestNote % 12)) {
            // Prefer lower note on tie
            closestNote = octave * 12 + scaleNoteInOctave;
        }
    }
    return closestNote;
}
