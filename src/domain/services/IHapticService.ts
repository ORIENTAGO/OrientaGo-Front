export interface IHapticService {
  triggerWarning(): Promise<void>;
  triggerSuccess(): Promise<void>;
}
