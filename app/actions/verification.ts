"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { findAccessibleProject, getCurrentUser } from "@/lib/auth/dal";
import { canRecordVerification } from "@/lib/auth/project-permissions";
import { getStateConfig } from "@/config/states";
import { VERIFICATION_OUTCOME_LABELS, VERIFICATION_OUTCOMES, type VerificationOutcome } from "@/lib/constants";

export type VerificationState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

const NO_ACCESS = "You don't have permission to do this.";

/** Records the outcome of comparing 2–4 dated images of a project. */
export async function recordVerification(_prev: VerificationState, formData: FormData): Promise<VerificationState> {
  const user = await getCurrentUser();
  const state = getStateConfig(String(formData.get("state") ?? "").toUpperCase());
  const projectId = String(formData.get("id") ?? "");
  if (!user || !state || !canRecordVerification(user)) return { message: NO_ACCESS };
  const access = await findAccessibleProject(user, projectId);
  if (!access || access.stateCode !== state.code) return { message: NO_ACCESS };

  const outcome = String(formData.get("outcome") ?? "") as VerificationOutcome;
  const notes = String(formData.get("notes") ?? "").trim();
  const imageIds = String(formData.get("imageIds") ?? "").split(",").filter(Boolean);

  const errors: Record<string, string> = {};
  if (!VERIFICATION_OUTCOMES.includes(outcome)) errors.outcome = "Choose an outcome";
  if (outcome === "DISCREPANCY" && notes.length < 5) errors.notes = "Describe the discrepancy";
  if (notes.length > 1000) errors.notes = "Keep the note under 1000 characters";

  // The compared images must belong to this project.
  const images = await db.imageryCapture.findMany({
    where: { projectId, id: { in: imageIds } },
    select: { id: true, captureDate: true },
    orderBy: { captureDate: "asc" },
  });
  if (imageIds.length < 2 || images.length !== new Set(imageIds).size) errors.form = "Select at least two images of this project to compare";
  if (Object.keys(errors).length) return { message: errors.form ?? "Please correct the highlighted fields.", fieldErrors: errors };

  await db.$transaction(async (tx) => {
    const v = await tx.verification.create({
      data: {
        projectId,
        outcome,
        notes: notes || null,
        imageIds: JSON.stringify(images.map((i) => i.id)),
        fromDate: images[0].captureDate,
        toDate: images.at(-1)!.captureDate,
        createdById: user.id,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "verification.record",
        entityType: "Project",
        entityId: projectId,
        details: JSON.stringify({ verificationId: v.id, outcome, images: images.length }),
      },
    });
  });

  refresh();
  return { ok: true, message: `Verification recorded: ${VERIFICATION_OUTCOME_LABELS[outcome]}` };
}
