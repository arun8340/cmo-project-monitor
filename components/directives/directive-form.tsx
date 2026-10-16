"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { LoaderCircleIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { issueDirective, type DirectiveFormState } from "@/app/actions/directives";
import { submitKeepingValues } from "@/lib/forms";

type Options = {
  districts: { slug: string; name: string }[];
  departments: { code: string; name: string }[];
  projects: { id: string; name: string; district: string; dept: string }[];
  officers: { id: string; name: string; role: string; district: string | null; dept: string | null }[];
};

type Props = { stateSlug: string; options: Options; initial: { district?: string; department?: string; project?: string }; today: string; cancelHref: string };

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function DirectiveForm({ stateSlug, options, initial, today, cancelHref }: Props) {
  const [state, action, pending] = useActionState<DirectiveFormState, FormData>(issueDirective, {});
  const err = state.fieldErrors ?? {};
  const [district, setDistrict] = useState(initial.district ?? "");
  const [dept, setDept] = useState(initial.department ?? "");
  const [project, setProject] = useState(initial.project ?? "");
  const [owner, setOwner] = useState("");

  // Projects narrow to the chosen district / department.
  const projects = useMemo(
    () => options.projects.filter((p) => (!district || p.district === district) && (!dept || p.dept === dept)),
    [options.projects, district, dept],
  );
  const chosenProject = options.projects.find((p) => p.id === project);
  const targetDistrict = district || chosenProject?.district || "";
  const targetDept = dept || chosenProject?.dept || "";

  // Only officers responsible for the target can own it.
  const owners = useMemo(
    () =>
      options.officers.filter(
        (o) => (targetDistrict && o.district === targetDistrict) || (targetDept && o.dept === targetDept),
      ),
    [options.officers, targetDistrict, targetDept],
  );
  const ownerValid = owners.some((o) => o.id === owner);

  return (
    <form onSubmit={submitKeepingValues(action)} className="grid gap-6">
      <input type="hidden" name="state" value={stateSlug} />
      {state.message && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <FieldSet>
        <FieldLegend>Directed to</FieldLegend>
        <FieldDescription>Choose a district, a department, a specific project — or a combination.</FieldDescription>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="d-district">District</FieldLabel>
            <select
              id="d-district"
              name="district"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setProject("");
              }}
              className={selectClass}
            >
              <option value="">Any / not specific</option>
              {options.districts.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="d-dept">Department</FieldLabel>
            <select
              id="d-dept"
              name="department"
              value={dept}
              onChange={(e) => {
                setDept(e.target.value);
                setProject("");
              }}
              className={selectClass}
            >
              <option value="">Any / not specific</option>
              {options.departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="d-project">Project (optional)</FieldLabel>
          <select id="d-project" name="project" value={project} onChange={(e) => setProject(e.target.value)} className={selectClass}>
            <option value="">{projects.length ? "Not a specific project" : "No projects match"}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        {err.target && <FieldError>{err.target}</FieldError>}
      </FieldSet>

      <FieldSet>
        <FieldLegend>Directive</FieldLegend>
        <FieldGroup>
          <Field data-invalid={!!err.text || undefined}>
            <FieldLabel htmlFor="d-text">Instruction</FieldLabel>
            <Textarea
              id="d-text"
              name="text"
              rows={4}
              maxLength={2000}
              defaultValue={state.values?.text}
              placeholder="e.g. Submit a recovery plan with weekly milestones and restart work within 15 days."
              aria-invalid={!!err.text || undefined}
            />
            {err.text && <FieldError>{err.text}</FieldError>}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field data-invalid={!!err.owner || undefined}>
              <FieldLabel htmlFor="d-owner">Responsible officer</FieldLabel>
              <select
                id="d-owner"
                name="owner"
                value={ownerValid ? owner : ""}
                onChange={(e) => setOwner(e.target.value)}
                className={selectClass}
                aria-invalid={!!err.owner || undefined}
                disabled={owners.length === 0}
              >
                <option value="">{owners.length ? "Choose an officer" : "Choose a district or department first"}</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} — {o.role}
                  </option>
                ))}
              </select>
              {err.owner && <FieldError>{err.owner}</FieldError>}
            </Field>
            <Field data-invalid={!!err.dueDate || undefined}>
              <FieldLabel htmlFor="d-due">Due date</FieldLabel>
              <Input id="d-due" name="dueDate" type="date" min={today} defaultValue={state.values?.dueDate} aria-invalid={!!err.dueDate || undefined} />
              {err.dueDate && <FieldError>{err.dueDate}</FieldError>}
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
          Issue directive
        </Button>
      </div>
    </form>
  );
}
