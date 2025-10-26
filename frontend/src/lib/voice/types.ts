export type VoiceEvent =
  | { type: 'assistant_text_delta'; text: string; timestamp: number }
  | { type: 'assistant_text_complete'; text: string; timestamp: number }
  | { type: 'user_text_delta'; text: string; timestamp: number }
  | { type: 'user_text_complete'; text: string; timestamp: number }
  | { type: 'assistant_audio_chunk'; audioBase64: string; timestamp: number }
  | { type: 'assistant_audio_complete'; timestamp: number }
  | { type: 'error'; message: string; timestamp: number };
