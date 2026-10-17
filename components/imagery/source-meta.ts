import { CameraIcon, DroneIcon, SatelliteIcon } from "lucide-react";
import type { ImagerySource } from "@/lib/constants";

/**
 * Categorical identity per imagery source (validated palette slots 1–3) plus a
 * distinct shape, so source is never told apart by colour alone. Labels come
 * from the translations (enums.source).
 */
export const SOURCE_META: Record<ImagerySource, { color: string; shape: "circle" | "square" | "triangle"; icon: typeof SatelliteIcon }> = {
  SATELLITE: { color: "#2a78d6", shape: "circle", icon: SatelliteIcon },
  DRONE: { color: "#eb6834", shape: "square", icon: DroneIcon },
  FIELD_PHOTO: { color: "#1baf7a", shape: "triangle", icon: CameraIcon },
};
