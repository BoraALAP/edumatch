/**
 * Audio Utilities
 *
 * Purpose: Utility functions for audio processing and format conversion
 * Features:
 * - PCM16 to Base64 conversion for OpenAI Realtime API
 * - Base64 to PCM16 conversion for audio playback
 * - Audio buffer manipulation
 * - Format validation
 */

/**
 * Convert PCM16 audio data to Base64 string
 * Used for sending audio to OpenAI Realtime API
 */
export function pcm16ToBase64(pcm16: ArrayBufferLike): string {
  const uint8Array = new Uint8Array(pcm16);
  let binary = '';

  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }

  return btoa(binary);
}

/**
 * Convert Base64 string to PCM16 audio data
 * Used for playing audio received from OpenAI Realtime API
 */
export function base64ToPcm16(base64: string): Int16Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Int16Array(bytes.buffer);
}

/**
 * Convert PCM16 to Float32Array for audio playback
 */
export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);

  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
  }

  return float32;
}

/**
 * Play PCM16 audio data
 */
export async function playPcm16Audio(
  pcm16: Int16Array,
  sampleRate = 24000
): Promise<void> {
  const audioContext = new AudioContext({ sampleRate });
  const audioBuffer = audioContext.createBuffer(1, pcm16.length, sampleRate);

  const channelData = audioBuffer.getChannelData(0);
  const float32Data = pcm16ToFloat32(pcm16);

  channelData.set(float32Data);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);

  return new Promise((resolve) => {
    source.onended = () => {
      audioContext.close();
      resolve();
    };

    source.start();
  });
}

/**
 * Calculate audio duration from PCM16 data
 */
export function calculateAudioDuration(
  pcm16Length: number,
  sampleRate = 24000
): number {
  return pcm16Length / sampleRate;
}

/**
 * Merge multiple PCM16 buffers into one
 */
export function mergePcm16Buffers(buffers: Int16Array[]): Int16Array {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const merged = new Int16Array(totalLength);

  let offset = 0;
  for (const buffer of buffers) {
    merged.set(buffer, offset);
    offset += buffer.length;
  }

  return merged;
}

/**
 * Detect silence in PCM16 audio
 * Returns true if the audio is mostly silent
 */
export function detectSilence(
  pcm16: Int16Array,
  threshold = 500, // Amplitude threshold
  minSilenceRatio = 0.95 // 95% of samples must be below threshold
): boolean {
  let silentSamples = 0;

  for (let i = 0; i < pcm16.length; i++) {
    if (Math.abs(pcm16[i]) < threshold) {
      silentSamples++;
    }
  }

  return silentSamples / pcm16.length >= minSilenceRatio;
}

/**
 * Normalize audio volume
 */
export function normalizePcm16(pcm16: Int16Array, targetPeak = 0.9): Int16Array {
  // Find peak value
  let peak = 0;
  for (let i = 0; i < pcm16.length; i++) {
    const abs = Math.abs(pcm16[i]);
    if (abs > peak) peak = abs;
  }

  if (peak === 0) return pcm16;

  // Calculate scale factor
  const maxValue = 0x7fff;
  const scaleFactor = (targetPeak * maxValue) / peak;

  // Apply normalization
  const normalized = new Int16Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    normalized[i] = Math.round(pcm16[i] * scaleFactor);
  }

  return normalized;
}

/**
 * Convert Blob to ArrayBuffer
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Create audio blob from PCM16 data
 */
export function createAudioBlob(
  pcm16: Int16Array,
  sampleRate = 24000
): Blob {
  // Create WAV header
  const wavHeader = createWavHeader(pcm16.length * 2, sampleRate, 1, 16);

  // Combine header and data
  const wavData = new Uint8Array(wavHeader.byteLength + pcm16.byteLength);
  wavData.set(new Uint8Array(wavHeader), 0);
  wavData.set(new Uint8Array(pcm16.buffer), wavHeader.byteLength);

  return new Blob([wavData], { type: 'audio/wav' });
}

/**
 * Create WAV file header
 */
function createWavHeader(
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): ArrayBuffer {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk size
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true); // Byte rate
  view.setUint16(32, channels * (bitsPerSample / 8), true); // Block align
  view.setUint16(34, bitsPerSample, true);

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  return header;
}

/**
 * Write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
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

/**
 * Get audio input devices
 */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'audioinput');
  } catch (error) {
    console.error('Error enumerating audio devices:', error);
    return [];
  }
}
