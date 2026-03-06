/**
 * Track type definitions for the DAW
 *
 * Implements section 7.2 of the engineering spec
 */
/** Type guard functions */
export function isAudioTrack(track) {
    return track.type === 'audio';
}
export function isMidiTrack(track) {
    return track.type === 'midi';
}
export function isInstrumentTrack(track) {
    return track.type === 'instrument';
}
export function isGroupTrack(track) {
    return track.type === 'group';
}
export function isReturnTrack(track) {
    return track.type === 'return';
}
export function isAuxTrack(track) {
    return track.type === 'aux';
}
export function isExternalMidiTrack(track) {
    return track.type === 'external-midi';
}
export function isHybridTrack(track) {
    return track.type === 'hybrid';
}
/** Check if track can contain audio clips */
export function canContainAudio(track) {
    return track.type === 'audio' || track.type === 'hybrid';
}
/** Check if track can contain MIDI clips */
export function canContainMidi(track) {
    return track.type === 'midi' ||
        track.type === 'instrument' ||
        track.type === 'hybrid' ||
        track.type === 'external-midi';
}
/** Check if track is a container (has children) */
export function isContainerTrack(track) {
    return track.type === 'group';
}
