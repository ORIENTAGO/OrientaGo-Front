import * as Speech from "expo-speech";
import { ISpeechService } from "../../domain/services/ISpeechService";

export class SpeechServiceImpl implements ISpeechService {
  speak(text: string): void {
    Speech.speak(text, { language: "es-EC" });
  }

  stop(): void {
    Speech.stop();
  }
}
