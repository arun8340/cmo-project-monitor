# Project Brief: CM Infrastructure Project Monitoring POC (Rajasthan + Maharashtra)

Read this whole file before writing any code. It is the full context for what we are building.

## 1. What this is

A proof-of-concept (POC) web app in **Next.js** for the **Chief Minister's offices of Rajasthan and Maharashtra**.

**The problem:** District Collectors log/create government projects (e.g. "new construction started in this area"). The CM / CM's office cannot physically go and verify that each project is actually happening.

**The solution:** Every project has a geographic site, and dated **satellite imagery / drone imagery / field photos** are attached to it. The CM office can open any project, see the site, and **compare images across dates** (e.g. last month: empty land; this month: building construction started). It is a *verification layer* on top of project reporting.

For the POC, satellite images are **dummy images uploaded manually**. Later (not in POC) they will be fetched automatically.

**One POC covers both states** (Rajasthan and Maharashtra) in a single app. NOT a separate Central Govt version.

Reference the PM shared (a basic tracker, no maps/imagery — ours should go beyond it):
https://dashboard.mumbaisuburban.co.in/cm-warroom.html
It shows: Total Projects, Total Issues, Pending Issues, Resolved Issues; Projects by Category; project list filterable by category & status; Add Project / Add Issue / Update Status forms with status (Pending, In Progress, Resolved, Archived) and priority (Low, Medium, High, Critical). Bilingual labels (English + Marathi).

## 2. Requirements from the project manager (verbatim list)

- State and department and projects management screens
- Satellite imagery uploads for each work site for each project
- Imagery availability by date
- Comparison screen for satellite imagery
- Provision for manual entry for progress of the project
- User and Role Manager
- Authentication and authorization
- Home screen: state map (e.g. Rajasthan map) as background
- State to district level screen flow
- Show departments
- Show projects in the district for that department
- Prototypes for 2 states: Maharashtra and Rajasthan

## 3. Requirements from the PM's spreadsheet

**Home Screen (Dashboard)**
- Interactive state map showing all districts
- Select district
- Departments: PWD, Metro, Drainage & Sewer, Urban, Roads & Buildings, Rural, MGNREGA
- Total Projects, Completed, On-Going
- Add Project, Edit Project Details
- Pending issues of last meeting, Resolved issues of last meeting

**Edit Project Details**
- Update project status
- Update Satellite Imagery / Field Photos / Drone Imagery

**Change Detection**
- View change detection & analysis

**Directives by CMO / CS / Higher Authorities**

## 4. Users and roles

| Role | Scope | Can do |
|---|---|---|
| Admin | Everything, both states | Manage users, roles, departments, districts; switch states |
| CM / CMO / Chief Secretary | Whole state | View everything; issue directives. Mostly read-only |
| Department Head | One department, whole state | View dept projects across districts; update |
| District Collector | One district, all departments | Create/edit projects, update progress, upload imagery, add issues |
| Field Officer (optional) | Assigned projects | Upload field photos, progress updates |

A user belongs to one state (except Admin). Users only ever see data within their scope — enforce this server-side, not just in the UI.

## 5. Screen flow

1. **Login**
2. **State picker** — only for Admin; other users go straight to their state
3. **State home** — state map as background, districts clickable (hover shows name + counts). KPI cards: Total, Completed, On-Going projects; Pending & Resolved issues. District coloring by status (see improvements).
4. **District view** — department cards (PWD, Metro, Drainage & Sewer, Urban, Roads & Buildings, Rural, MGNREGA), each with total/completed/ongoing counts
5. **Department → project list** — projects of that dept in that district; filter by status; search
6. **Project detail** — info (name, dept, district, location, budget, start/end dates, status, % progress), site map, progress timeline, manual progress entry, imagery gallery grouped by date, issues, directives
7. **Imagery comparison** — choose project + two dates; side-by-side view AND a swipe slider. This is the key demo screen — make it polished.
8. **Upload imagery** — project, capture date, source (Satellite / Drone / Field Photo), file, notes
9. **Add / Edit project**
10. **Issues** — pending / resolved list
11. **Directives** — from CMO/CS/higher authorities to a district or department, with status and due date
12. **Users & roles** (admin)

## 6. Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Maps: react-leaflet (or MapLibre) with district boundaries as GeoJSON
- Image comparison: `react-compare-slider`
- Auth: Auth.js (NextAuth) with credentials login; role checks in middleware and server actions
- DB: Prisma + SQLite for the POC (easy to switch to PostgreSQL later)
- Image storage: local `/public/uploads` for POC (structure code so S3 can replace it later)
- i18n: next-intl — English + Hindi (Rajasthan) / Marathi (Maharashtra)

## 7. Multi-state design (important)

Do NOT build two apps. The state is configuration:

```ts
// config/states.ts (shape idea)
{
  code: "RJ" | "MH",
  name, nameLocal,
  locale: "hi" | "mr",
  geojson: "/geo/rajasthan-districts.geojson",
  mapCenter, mapZoom,
  theme colors (optional)
}
```

Districts and departments live in the DB, seeded per state. Adding a third state later should only need config + seed data. Use current official district boundaries (Rajasthan's district count changed recently).

## 8. Data model (starting point)

- **State** — code, name, nameLocal
- **District** — stateId, name, nameLocal, geo code matching the GeoJSON feature
- **Department** — name, nameLocal (PWD, Metro, Drainage & Sewer, Urban, Roads & Buildings, Rural, MGNREGA)
- **Project** — districtId, departmentId, name, description, lat/lng (+ optional site polygon), budget, startDate, plannedEndDate, status (Not Started / On-Going / Completed / Delayed / Stalled), progressPercent, createdBy
- **ImageryCapture** — projectId, captureDate, source (SATELLITE / DRONE / FIELD_PHOTO), filePath, notes, uploadedBy
- **ProgressUpdate** — projectId, date, progressPercent, notes, updatedBy
- **Issue** — projectId, description, status (Pending / In Progress / Resolved / Archived), priority (Low / Medium / High / Critical), **meetingDate (optional)**, createdBy
- **Directive** — fromUserId, target (district and/or department and/or project), text, dueDate, status
- **User** — name, email, passwordHash, roleId, stateId, districtId?, departmentId?
- **Role** — name, permissions
- **AuditLog** — who changed what, when

**Open decision:** whether issues are tied to review meetings ("pending/resolved issues of last meeting") or standalone is NOT decided yet. For now: issue belongs to a project, with an optional `meetingDate`. Design so a `Meeting` model can be added later without rework.

## 9. Imagery and change detection — POC scope

- Images are dummy, uploaded manually, each tagged with a capture date.
- For realistic before/after pairs, use screenshots of the same real construction site on two dates (Google Earth historical imagery / Esri Wayback). Internal demo only.
- Seed every demo project with at least 2–3 dated images so the comparison screen always has something to show.
- "Change detection" in the POC = manual comparison (side-by-side + swipe) plus a simple pixel-difference highlight overlay. NO AI/ML in the POC.
- Production caveat (for documentation, not code): free imagery (Sentinel-2, ISRO Bhuvan) is ~10 m resolution — not enough to see small buildings. Building-level detail needs paid high-res imagery or drone uploads.

## 10. Dummy data

- Both states, all districts present on the map
- 5–10 believable projects per department in a handful of districts (enough for a lively dashboard), with names in English + local language where easy
- Demo users, one per role, for both states, with known passwords listed in README
- Some issues pending, some resolved; a few directives; some projects delayed

## 11. Improvements to include (nice-to-have, after the core)

- District map color-coded red/amber/green by delayed/stalled projects
- Planned vs actual progress; flag projects behind schedule
- Geotagged field photos — read EXIF GPS + timestamp on upload and show it
- Directive tracking with owner, deadline, overdue highlighting
- Audit log viewer
- Mobile-friendly upload screens for field use

## 12. Suggested build order

1. Project setup (Next.js, Tailwind, shadcn/ui, Prisma, SQLite), state config, seed script with dummy data
2. Auth + roles + scoped data access
3. State home with interactive district map + KPI cards
4. District → department → project list flow
5. Project detail + add/edit project + manual progress entry
6. Imagery upload + gallery by date
7. Imagery comparison screen (side-by-side + swipe + diff highlight)
8. Issues and directives
9. User & role manager
10. i18n (Hindi/Marathi) and the improvements list

## 13. Notes about me (the developer)

- I'm Arun; I'll run this locally with `npm run dev` and demo it to my project manager.
- Keep the UI clean and professional — it will be shown to government stakeholders.
- Explain any setup steps I need to do (e.g. where to put GeoJSON or images).
