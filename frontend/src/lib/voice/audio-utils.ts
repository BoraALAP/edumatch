/**
 * Audio Utility Functions
 *
 * Purpose: Helper functions for audio processing in voice practice
 * Features:
 * - Audio buffer encoding/decoding
 * - PCM format conversion
 * - Audio buffer merging
 */

export const PCM_SAMPLE_RATE = 24000;

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Float32Array for audio playback
 */
export function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const byteLength = binary.length;
  const buffer = new ArrayBuffer(byteLength);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < byteLength; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const view = new DataView(buffer);
  const frameCount = byteLength / 2;
  const float32 = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i += 1) {
    const int16 = view.getInt16(i * 2, true);
    float32[i] = int16 / 32768;
  }
  return float32;
}

/**
 * Merge multiple audio buffers into a single buffer
 */
export function mergeAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  buffers.forEach((buf) => {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  });
  return merged.buffer;
}

/**
 * Check if browser supports audio capture
 */
export function isAudioCaptureSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const mediaDevices = navigator.mediaDevices;
  const audioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  return Boolean(mediaDevices && typeof mediaDevices.getUserMedia === 'function' && audioContextCtor);
}
