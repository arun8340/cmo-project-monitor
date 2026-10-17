"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { CameraIcon, ImagePlusIcon, LoaderCircleIcon, MapPinIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadImagery, type UploadState } from "@/app/actions/imagery";
import { IMAGERY_SOURCES, type ImagerySource } from "@/lib/constants";
import { distanceKm, FAR_FROM_SITE_KM, formatDistance } from "@/lib/geo";
import { formatBytes } from "@/lib/format";
import { SOURCE_META } from "./source-meta";
import { useTranslations } from "next-intl";
import { useLabels } from "@/lib/i18n/client";

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

type FileProblem = { code: "heic" | "type" | "size"; mb?: string };

type Picked = {
  id: string;
  file: File;
  url: string;
  error: FileProblem | null;
  exifDate: string | null;
  gps: [number, number] | null;
};

type Props = {
  projectId: string;
  stateSlug: string;
  site: [number, number];
  today: string;
  defaultSource: ImagerySource;
  cancelHref: string;
};

/** Raw GPS tags must be picked too: exifr computes `latitude`/`longitude` from them. */
const EXIF_TAGS = ["DateTimeOriginal", "CreateDate", "GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef"];

const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

function checkFile(file: File): FileProblem | null {
  const name = file.name.toLowerCase();
  if (file.type === "image/heic" || file.type === "image/heif" || /\.(heic|heif)$/.test(name)) return { code: "heic" };
  if (!ACCEPT.split(",").includes(file.type)) return { code: "type" };
  if (file.size > MAX_BYTES) return { code: "size", mb: (file.size / 1024 / 1024).toFixed(1) };
  return null;
}

async function readExif(file: File): Promise<Pick<Picked, "exifDate" | "gps">> {
  try {
    const exifr = (await import("exifr")).default;
    const tags = await exifr.parse(file, { gps: true, pick: EXIF_TAGS });
    const taken: unknown = tags?.DateTimeOriginal ?? tags?.CreateDate;
    return {
      exifDate: taken instanceof Date && !Number.isNaN(taken.getTime()) ? ymd(taken) : null,
      gps: typeof tags?.latitude === "number" && typeof tags?.longitude === "number" ? [tags.latitude, tags.longitude] : null,
    };
  } catch {
    return { exifDate: null, gps: null };
  }
}

export function UploadForm({ projectId, stateSlug, site, today, defaultSource, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(uploadImagery, {});
  const [source, setSource] = useState<ImagerySource>(defaultSource);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [captureDate, setCaptureDate] = useState("");
  const [useExifDate, setUseExifDate] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const err = state.fieldErrors ?? {};
  const t = useTranslations("upload");
  const tc = useTranslations("common");
  const labels = useLabels();

  // Release preview object URLs.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_FILES - picked.length;
    const files = Array.from(list).slice(0, Math.max(room, 0));
    const next = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        const error = checkFile(file);
        const exif = error ? { exifDate: null, gps: null } : await readExif(file);
        return { id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, url, error, ...exif };
      }),
    );
    setPicked((p) => [...p, ...next]);
    // Pre-fill the capture date from the first photo that has one.
    const firstDate = next.find((n) => n.exifDate && n.exifDate <= today)?.exifDate;
    if (!captureDate && firstDate) setCaptureDate(firstDate);
  }

  function remove(id: string) {
    setPicked((p) => p.filter((x) => x.id !== id));
  }

  const valid = picked.filter((p) => !p.error);
  const hasInvalid = picked.some((p) => p.error);
  const canSubmit = valid.length > 0 && !hasInvalid && !!captureDate && !pending;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", projectId);
    fd.set("state", stateSlug);
    fd.set("source", source);
    fd.set("captureDate", captureDate);
    if (useExifDate) fd.set("useExifDate", "on");
    fd.set("notes", (e.currentTarget.elements.namedItem("notes") as HTMLTextAreaElement).value);
    valid.forEach((p) => fd.append("files", p.file));
    startTransition(() => formAction(fd));
  }

  const totalBytes = valid.reduce((s, p) => s + p.file.size, 0);

  return (
    <form onSubmit={submit} className="grid gap-6">
      {state.message && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <FieldSet>
        <FieldLegend>{t("source")}</FieldLegend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("sourceLabel")}>
          {IMAGERY_SOURCES.map((s) => {
            const { icon: Icon, color } = SOURCE_META[s];
            const label = labels.source[s];
            const active = source === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSource(s)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition ${
                  active ? "border-foreground bg-muted/60 font-medium shadow-xs" : "hover:bg-muted/40"
                }`}
              >
                <Icon className="size-5" style={{ color }} />
                {label}
              </button>
            );
          })}
        </div>
        {err.source && <FieldError>{err.source}</FieldError>}
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("images")}</FieldLegend>
        <FieldDescription>{t("imagesHint", { max: MAX_FILES })}</FieldDescription>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()} disabled={picked.length >= MAX_FILES}>
            <ImagePlusIcon />
            {t("choose")}
          </Button>
          {source === "FIELD_PHOTO" && (
            <Button type="button" variant="outline" onClick={() => cameraInput.current?.click()} disabled={picked.length >= MAX_FILES}>
              <CameraIcon />
              {t("takePhoto")}
            </Button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            data-testid="file-input"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {picked.length > 0 && (
          <ul className="grid gap-2">
            {picked.map((p) => {
              const km = p.gps ? distanceKm(p.gps, site) : null;
              return (
                <li key={p.id} className={`flex items-center gap-3 rounded-lg border p-2 ${p.error ? "border-destructive/40 bg-destructive/5" : ""}`}>
                  {/* Local preview of a file the user picked; not a remote image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="size-14 shrink-0 rounded-md bg-muted object-cover" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="truncate font-medium">{p.file.name}</div>
                    {p.error ? (
                      <div className="text-xs text-destructive">{t(`problem.${p.error.code}`, { mb: p.error.mb ?? "" })}</div>
                    ) : (
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span>{formatBytes(p.file.size)}</span>
                        {p.exifDate && <span>{t("taken", { date: p.exifDate })}</span>}
                        {km != null && (
                          <span className={`flex items-center gap-1 ${km > FAR_FROM_SITE_KM ? "font-medium text-amber-700" : ""}`}>
                            {km > FAR_FROM_SITE_KM ? <TriangleAlertIcon className="size-3" /> : <MapPinIcon className="size-3" />}
                            {t("fromSite", { distance: formatDistance(km) })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(p.id)} aria-label={t("remove", { name: p.file.name })}>
                    <XIcon />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {hasInvalid && <FieldError>{t("removeInvalid")}</FieldError>}
        {err.files && <FieldError className="whitespace-pre-line">{err.files}</FieldError>}
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("details")}</FieldLegend>
        <Field data-invalid={!!err.captureDate || undefined} className="sm:max-w-xs">
          <FieldLabel htmlFor="captureDate">{t("captureDate")}</FieldLabel>
          <Input
            id="captureDate"
            type="date"
            value={captureDate}
            max={today}
            onChange={(e) => setCaptureDate(e.target.value)}
            aria-invalid={!!err.captureDate || undefined}
            required
          />
          <FieldDescription>
            {source === "SATELLITE" ? t("captureHintSatellite") : t("captureHintPhoto")}
          </FieldDescription>
          {err.captureDate && <FieldError>{err.captureDate}</FieldError>}
        </Field>
        {source !== "SATELLITE" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useExifDate} onChange={(e) => setUseExifDate(e.target.checked)} className="size-4" />
            {t("useExifDate")}
          </label>
        )}
        <Field>
          <FieldLabel htmlFor="notes">{t("notes")}</FieldLabel>
          <Textarea id="notes" name="notes" maxLength={1000} placeholder={t("notesPlaceholder")} />
        </Field>
      </FieldSet>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          {pending
            ? t("uploading", { count: valid.length })
            : valid.length
              ? `${t("uploadCount", { count: valid.length })}${totalBytes ? ` (${formatBytes(totalBytes)})` : ""}`
              : t("uploadNone")}
        </Button>
      </div>
    </form>
  );
}
