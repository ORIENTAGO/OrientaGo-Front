import { IDetectionRepository } from "../../domain/repositories/IDetectionRepository";
import { Detection } from "../../domain/entities/Detection";
import { BACKEND_URL } from "../config/env";

export class DetectionRepositoryImpl implements IDetectionRepository {
  async detectFrame(photoUri: string): Promise<Detection[]> {
    const formData = new FormData();
    // @ts-expect-error - React Native FormData acepta este shape para archivos
    formData.append("frame", {
      uri: photoUri,
      name: "frame.jpg",
      type: "image/jpeg",
    });

    const response = await fetch(`${BACKEND_URL}/detect`, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const data = await response.json();
    return data.detections;
  }
}
