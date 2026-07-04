export interface ISpeechService {
  speak(text: string): void;
  stop(): void;
}
