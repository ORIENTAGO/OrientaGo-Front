import * as Haptics from "expo-haptics";
import { IHapticService } from "../../domain/services/IHapticService";

export class HapticServiceImpl implements IHapticService {
  async triggerWarning(): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  async triggerSuccess(): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
