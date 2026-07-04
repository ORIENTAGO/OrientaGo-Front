import { Detection } from "../entities/Detection";

export interface IDetectionRepository {
  detectFrame(photoUri: string): Promise<Detection[]>;
}
