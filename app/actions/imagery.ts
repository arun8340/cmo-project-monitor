"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { findAccessibleProject, getCurrentUser } from "@/lib/auth/dal";
import { canUploadImagery } from "@/lib/auth/project-permissions";
import { getStateConfig } from "@/config/states";
import { stateBasePath } from "@/config/portals";
import { IMAGERY_SOURCES, type ImagerySource } from "@/lib/constants";
import { parseDateInput, toDateInput, todayIST } from "@/lib/dates";
import { storage, variantKeys } from "@/lib/storage";
import { ImageError, MAX_FILES, processImage, type ProcessedImage } from "@/lib/imagery/process";
import { getActionT } from "@/lib/i18n/server";

export type UploadState = { message?: string; fieldErrors?: Record<string, string> };

/**
 * Uploads 1–10 images to a project. Imagery is an evidence trail: there is
 * deliberately no update or delete action.
 */
export async function uploadImagery(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const [user, t] = await Promise.all([getCurrentUser(), getActionT()]);
  const NO_ACCESS = t("noAccess");
  const state = getStateConfig(String(formData.get("state") ?? "").toUpperCase());
  const projectId = String(formData.get("id") ?? "");
  if (!user || !state || !canUploadImagery(user)) return { message: NO_ACCESS };
  const access = await findAccessibleProject(user, projectId);
  if (!access || access.stateCode !== state.code) return { message: NO_ACCESS };

  // --- fields
  const errors: Record<string, string> = {};
  const source = String(formData.get("source") ?? "") as ImagerySource;
  if (!IMAGERY_SOURCES.includes(source)) errors.source = t("v.chooseSource");

  const dateStr = String(formData.get("captureDate") ?? "");
  const captureDate = parseDateInput(dateStr);
  if (!captureDate) errors.captureDate = t("v.captureDate");
  else if (dateStr > todayIST()) errors.captureDate = t("v.captureFuture");

  const useExifDate = formData.get("useExifDate") === "on";
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000) || null;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) errors.files = t("v.chooseImage");
  else if (files.length > MAX_FILES) errors.files = t("v.tooManyFiles", { max: MAX_FILES });
  if (Object.keys(errors).length) return { message: t("fixErrors"), fieldErrors: errors };

  // --- validate & process every file before storing anything
  const processed: { file: File; img: ProcessedImage }[] = [];
  const fileErrors: string[] = [];
  for (const file of files) {
    try {
      processed.push({ file, img: await processImage(Buffer.from(await file.arrayBuffer()), file.name) });
    } catch (e) {
      fileErrors.push(`${file.name}: ${t(`image.${e instanceof ImageError ? e.code : "failed"}`)}`);
    }
  }
  if (fileErrors.length) return { message: t("filesRejected"), fieldErrors: { files: fileErrors.join("\n") } };

  // --- store files, then records (all or nothing)
  const written: string[] = [];
  try {
    const rows: Prisma.ImageryCaptureUncheckedCreateInput[] = [];
    for (const { img } of processed) {
      const dir = `imagery/${projectId}/${randomUUID()}`;
      const key = `${dir}/original.${img.ext}`;
      const v = variantKeys(key);
      written.push(dir);
      await Promise.all([storage.put(v.original, img.original), storage.put(v.display, img.display), storage.put(v.thumb, img.thumb)]);

      // Field / drone photos can use their own EXIF date; satellite screenshots use the form date.
      const exifDay = img.exif.takenAt ? toDateInput(img.exif.takenAt) : null;
      const ownDate = useExifDate && source !== "SATELLITE" && exifDay && exifDay <= todayIST() ? parseDateInput(exifDay) : null;
      rows.push({
        projectId,
        captureDate: ownDate ?? captureDate!,
        source,
        filePath: key,
        mimeType: img.mimeType,
        width: img.width,
        height: img.height,
        sizeBytes: img.sizeBytes,
        notes,
        exifLatitude: img.exif.latitude,
        exifLongitude: img.exif.longitude,
        exifTakenAt: img.exif.takenAt,
        uploadedById: user.id,
      });
    }

    await db.$transaction(async (tx) => {
      const created = [];
      for (const data of rows) created.push(await tx.imageryCapture.create({ data, select: { id: true } }));
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "imagery.upload",
          entityType: "Project",
          entityId: projectId,
          details: JSON.stringify({ count: created.length, source, ids: created.map((c) => c.id) }),
        },
      });
    });
  } catch (e) {
    await Promise.all(written.map((dir) => storage.removePrefix(dir).catch(() => {})));
    console.error("Imagery upload failed", e);
    return { message: t("uploadFailed") };
  }

  redirect(`${stateBasePath(user.portal, state.code)}/project/${projectId}/imagery?uploaded=${processed.length}`);
}
