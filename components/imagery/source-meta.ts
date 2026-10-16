import { CameraIcon, DroneIcon, SatelliteIcon } from "lucide-react";
import type { ImagerySource } from "@/lib/constants";

/**
 * Categorical identity per imagery source (validated palette slots 1–3) plus a
 * distinct shape, so source is never told apart by colour alone.
 */
export const SOURCE_META: Record<ImagerySource, { label: string; color: string; shape: "circle" | "square" | "triangle"; icon: typeof SatelliteIcon }> = {
  SATELLITE: { label: "Satellite", color: "#2a78d6", shape: "circle", icon: SatelliteIcon },
  DRONE: { label: "Drone", color: "#eb6834", shape: "square", icon: DroneIcon },
  FIELD_PHOTO: { label: "Field photo", color: "#1baf7a", shape: "triangle", icon: CameraIcon },
};
