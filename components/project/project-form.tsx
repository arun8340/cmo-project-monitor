"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LoaderCircleIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject, updateProject } from "@/app/actions/project";
import type { FormState, ProjectFormValues } from "@/lib/validation/project";
import { LocationMap } from "./site-map";

export type ProjectFormInitial = Partial<Record<keyof ProjectFormValues | "status", string>>;

type Props = {
  mode: "create" | "edit";
  stateSlug: string;
  projectId?: string;
  initial: ProjectFormInitial;
  departments: { code: string; name: string; nameLocal: string }[];
  districts: { slug: string; name: string; center: [number, number] }[];
  cancelHref: string;
  accent: string;
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function ProjectForm({ mode, stateSlug, projectId, initial, departments, districts, cancelHref, accent }: Props) {
  const [state, action, pending] = useActionState<FormState<ProjectFormInitial>, FormData>(
    mode === "create" ? createProject : updateProject,
    {},
  );
  const v = { ...initial, ...state.values };
  const err = state.fieldErrors ?? {};

  const [district, setDistrict] = useState(v.district ?? districts[0]?.slug ?? "");
  const [lat, setLat] = useState(v.latitude ?? "");
  const [lng, setLng] = useState(v.longitude ?? "");
  const center = districts.find((d) => d.slug === district)?.center ?? districts[0]?.center ?? [23, 78];
  const point: [number, number] | null = lat !== "" && lng !== "" && Number.isFinite(+lat) && Number.isFinite(+lng) ? [+lat, +lng] : null;

  const field = (name: keyof ProjectFormInitial) => ({ "data-invalid": !!err[name] || undefined });
  const invalid = (name: keyof ProjectFormInitial) => ({ "aria-invalid": !!err[name] || undefined });

  return (
    <form action={action} className="grid gap-6" noValidate>
      <input type="hidden" name="state" value={stateSlug} />
      {projectId && <input type="hidden" name="id" value={projectId} />}

      {state.message && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <FieldSet>
        <FieldLegend>Project</FieldLegend>
        <FieldGroup>
          <Field {...field("name")}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" defaultValue={v.name} maxLength={200} required {...invalid("name")} />
            {err.name && <FieldError>{err.name}</FieldError>}
          </Field>
          <Field {...field("nameLocal")}>
            <FieldLabel htmlFor="nameLocal">Name in local language (optional)</FieldLabel>
            <Input id="nameLocal" name="nameLocal" defaultValue={v.nameLocal} maxLength={200} {...invalid("nameLocal")} />
            {err.nameLocal && <FieldError>{err.nameLocal}</FieldError>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field {...field("department")}>
              <FieldLabel htmlFor="department">Department</FieldLabel>
              <select id="department" name="department" defaultValue={v.department} className={selectClass} {...invalid("department")}>
                {departments.map((d) => (
                  <option key={d.code} value={d.code.toLowerCase()}>
                    {d.name} — {d.nameLocal}
                  </option>
                ))}
              </select>
              {err.department && <FieldError>{err.department}</FieldError>}
            </Field>
            <Field {...field("district")}>
              <FieldLabel htmlFor="district">District</FieldLabel>
              <select
                id="district"
                name="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={selectClass}
                disabled={districts.length === 1}
                {...invalid("district")}
              >
                {districts.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
              {/* A disabled select isn't submitted */}
              {districts.length === 1 && <input type="hidden" name="district" value={district} />}
              {err.district && <FieldError>{err.district}</FieldError>}
            </Field>
          </div>
          <Field {...field("description")}>
            <FieldLabel htmlFor="description">Description (optional)</FieldLabel>
            <Textarea id="description" name="description" defaultValue={v.description} maxLength={2000} rows={3} {...invalid("description")} />
            {err.description && <FieldError>{err.description}</FieldError>}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Site location</FieldLegend>
        <FieldDescription>Click the map to place the project site, or type the coordinates.</FieldDescription>
        <div className="relative isolate h-72 overflow-hidden rounded-lg border sm:h-80">
          <LocationMap
            value={point}
            fallbackCenter={center}
            color={accent}
            onPick={([la, ln]) => {
              setLat(la.toFixed(5));
              setLng(ln.toFixed(5));
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field {...field("latitude")}>
            <FieldLabel htmlFor="latitude">Latitude</FieldLabel>
            <Input id="latitude" name="latitude" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} {...invalid("latitude")} />
            {err.latitude && <FieldError>{err.latitude}</FieldError>}
          </Field>
          <Field {...field("longitude")}>
            <FieldLabel htmlFor="longitude">Longitude</FieldLabel>
            <Input id="longitude" name="longitude" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} {...invalid("longitude")} />
            {err.longitude && <FieldError>{err.longitude}</FieldError>}
          </Field>
        </div>
        {!point && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPinIcon className="size-3.5" />
            No site chosen yet
          </p>
        )}
      </FieldSet>

      <FieldSet>
        <FieldLegend>Budget and schedule</FieldLegend>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field {...field("budgetLakhs")}>
              <FieldLabel htmlFor="budgetLakhs">Budget (₹ lakh)</FieldLabel>
              <Input id="budgetLakhs" name="budgetLakhs" inputMode="decimal" defaultValue={v.budgetLakhs} placeholder="e.g. 250" {...invalid("budgetLakhs")} />
              {err.budgetLakhs && <FieldError>{err.budgetLakhs}</FieldError>}
            </Field>
            <Field {...field("startDate")}>
              <FieldLabel htmlFor="startDate">Start date</FieldLabel>
              <Input id="startDate" name="startDate" type="date" defaultValue={v.startDate} {...invalid("startDate")} />
              {err.startDate && <FieldError>{err.startDate}</FieldError>}
            </Field>
            <Field {...field("plannedEndDate")}>
              <FieldLabel htmlFor="plannedEndDate">Planned end date</FieldLabel>
              <Input id="plannedEndDate" name="plannedEndDate" type="date" defaultValue={v.plannedEndDate} {...invalid("plannedEndDate")} />
              {err.plannedEndDate && <FieldError>{err.plannedEndDate}</FieldError>}
            </Field>
          </div>
          {mode === "create" && (
            <Field {...field("status")} className="sm:max-w-xs">
              <FieldLabel htmlFor="status">Starting status</FieldLabel>
              <select id="status" name="status" defaultValue={v.status ?? "NOT_STARTED"} className={selectClass} {...invalid("status")}>
                <option value="NOT_STARTED">Not started</option>
                <option value="ONGOING">On-going</option>
              </select>
              <FieldDescription>Later changes to status and progress are made with “Update progress”.</FieldDescription>
              {err.status && <FieldError>{err.status}</FieldError>}
            </Field>
          )}
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" />}
          {mode === "create" ? "Create project" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
