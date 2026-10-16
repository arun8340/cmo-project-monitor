# CM Infrastructure Project Monitor (POC)

Verification layer for government infrastructure projects in **Rajasthan** and **Maharashtra**:
every project has a site, dated satellite / drone / field imagery, progress history, issues and directives.
See [PROJECT_BRIEF.md](PROJECT_BRIEF.md) for the full scope.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · Prisma 7 + SQLite (`better-sqlite3` adapter)

## Getting started

```bash
npm install            # also runs `prisma generate`
cp .env.example .env   # then set AUTH_SECRET (see below)
npm run db:migrate     # create / update the SQLite database
npm run db:seed        # demo data + placeholder imagery
npm run dev            # then open a portal (below)
```

### Portals: one address per state

| Portal | Local address | Who signs in |
|---|---|---|
| Rajasthan | <http://rj.localhost:3000> | Rajasthan users only |
| Maharashtra | <http://mh.localhost:3000> | Maharashtra users only |
| Admin | <http://admin.localhost:3000> | Admin only — the one place both states are visible |

Plain <http://localhost:3000> lists these links (development only). `*.localhost` addresses work in any
browser with no setup. A state portal never shows or links to the other state; a user of one state can't
sign in on the other's portal, and sessions only work on the portal that issued them.

For production, point each address at the same deployment and set them in `.env`:

```bash
PORTAL_HOST_RJ="rajasthan.cmo-monitor.in"
PORTAL_HOST_MH="maharashtra.cmo-monitor.in"
PORTAL_HOST_ADMIN="admin.cmo-monitor.in"
```

Unknown addresses get "Not found". Behind a reverse proxy, forward the public host (`X-Forwarded-Host`).

> npm 11 blocks dependency install scripts unless approved. The ones this project needs
> (`better-sqlite3`, `prisma`, `@prisma/engines`, `esbuild`, `unrs-resolver`) are already listed
> under `allowScripts` in `package.json`.

`AUTH_SECRET` encrypts the login session cookie. Generate one with `openssl rand -base64 33` and paste it
into `.env`. Changing it signs everyone out.

Useful scripts:

| Script | What it does |
|---|---|
| `npm run db:seed` | Wipes and re-seeds all data (safe to re-run) |
| `npm run db:reset` | Drops the DB, re-applies migrations and re-seeds |
| `npm run db:studio` | Opens Prisma Studio to browse the data |
| `npm run check:scopes` | Verifies each demo user sees only the data in their scope |
| `npm run geo:build` | Regenerates the district boundary files in `public/geo/` |
| `npm run imagery:migrate` | One-off: moves imagery from the old public `public/uploads/` into private storage (keeps all data) |

## Demo users

All demo users have the password **`Demo@123`**. Each portal's login page has a clickable "Demo accounts"
list with only that portal's accounts; hide it with `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="false"` in `.env`.

Admin: `admin@demo.gov.in` on the **admin portal**.

| Role | Rajasthan portal | Maharashtra portal |
|---|---|---|
| CM / CMO / Chief Secretary | `cmo.rj@demo.gov.in` | `cmo.mh@demo.gov.in` |
| Department Head (PWD) | `pwd.rj@demo.gov.in` | `pwd.mh@demo.gov.in` |
| District Collector | `collector.jaipur@demo.gov.in` | `collector.pune@demo.gov.in` |
| Field Officer | `field.jaipur@demo.gov.in` | `field.pune@demo.gov.in` |

## Demo data

- **Districts:** Rajasthan 41 (post Dec-2024 reorganisation), Maharashtra 36 — all seeded with English + local names.
- **Departments (per state):** PWD, Metro, Drainage & Sewer, Urban, Roads & Buildings, Rural, MGNREGA.
- **Projects:** 64 across Jaipur, Jodhpur, Udaipur, Kota, Mumbai Suburban, Pune, Nagpur and Nashik,
  with a mix of On-Going / Completed / Delayed / Stalled / Not Started.
- Each project has monthly progress updates, 2–4 dated imagery captures, and (for delayed/stalled ones)
  pending issues tagged to the last review meeting. CMO directives exist per state, some overdue.
- Seed data lives in `prisma/seed-data/` — edit those files to change names, budgets or statuses.

## Authentication and access control

- **Login:** Auth.js v5 (credentials, JWT cookie, 8-hour session). Config in `auth.config.ts` / `auth.ts`.
- **Portals** (`config/portals.ts`): the request's address decides the portal. Logins are only accepted from
  that portal's users, and each session records its portal and is rejected anywhere else.
- **`proxy.ts`** routes per portal with cookie-only checks: logged out → `/login`; on a state portal, clean URLs
  (`/district/jaipur`) are rewritten to the internal `/rj/...` routes, and other states' or admin paths are "not
  found". It is *not* the security boundary.
- **`lib/auth/dal.ts`** is: every page and server action gets the user via `requireUser()` /
  `requirePermission()` / `requireStateAccess()`, which re-load the user from the database on each request.
- **`lib/auth/scope.ts`** turns the user's role into database filters. Every query for projects, issues,
  directives, districts or departments must include the matching scope:

| Role | Sees |
|---|---|
| Admin (admin portal) | Everything in the selected state; can switch states |
| CMO / CS | Whole state |
| Department Head | Own department, all districts in the state |
| District Collector | Own district, all departments |
| Field Officer | Only projects assigned to them |

Out-of-scope URLs show "Page not found", so users can't probe for what exists. Logins, failed logins (including
attempts on the wrong portal) and sign-outs are recorded in `AuditLog`.

## Issues and directives

The header of every state page links to **Overview**, **Issues** (with the open count) and **Directives** (with the
overdue count in red).

- **Issues** are raised from a project's page (*Raise issue*) by Collectors, Department Heads, Field Officers (on
  their assigned projects) and Admin, with a priority and an optional review-meeting date. The Issues page filters by
  status, priority, district, department and review meeting. Collectors, Department Heads, the CMO and Admin change
  status (Pending → In progress → Resolved → Archived, or reopen); resolving or reopening needs a note.
- **Directives** are issued by the CMO / Chief Secretary or Admin to a district, department and/or project, with a
  **responsible officer** (the Collector of that district or Head of that department) and a due date. The owner (or a
  Collector / Department Head in scope) marks it *In progress* or *Complied* (compliance note required); the CMO then
  *accepts and closes* it or *reopens* it. Open directives past their due date show as **Overdue**.
- Every status change is kept in a **history timeline** on the issue / directive page, and in the audit log.
- Review meetings are an optional date on each issue for now; a separate Meeting record can be added later.

## Where things live

| Path | Purpose |
|---|---|
| `config/states.ts` | Per-state config (names, locale, GeoJSON path, map centre/zoom, colour) |
| `lib/constants.ts` | Status / priority / source enums, roles and permissions |
| `lib/db.ts` | Shared Prisma client (server only) |
| `lib/auth/` | Data access layer (`dal.ts`) and role scoping (`scope.ts`) |
| `auth.ts`, `auth.config.ts`, `proxy.ts` | Auth.js setup and per-portal routing |
| `config/portals.ts` | Portal addresses (state and admin) |
| `prisma/schema.prisma` | Data model |
| `prisma/seed.ts` | Seed script; `prisma/demo-imagery.ts` draws the placeholder images |
| `public/geo/` | District boundary GeoJSON (generated by `npm run geo:build`) |
| `storage/` | Uploaded imagery — **private**, git-ignored; `storage/demo/` is regenerated by the seed |
| `lib/storage/` | Storage interface (local disk now; swap in S3 by implementing it) |
| `app/api/imagery/[id]` | Serves imagery only after the same access checks as project pages |

## Manual setup

### 1. District boundaries (already included)

`public/geo/rajasthan-districts.geojson` and `public/geo/maharashtra-districts.geojson` are generated by
`npm run geo:build` from [guneetnarula/indian-district-boundaries](https://github.com/guneetnarula/indian-district-boundaries)
(MIT License, 2019 districts) and committed — you don't need to do anything. They are for visualisation, not official boundaries.

- **Maharashtra:** all 36 districts.
- **Rajasthan:** 33 shapes. The 8 districts created since (Balotra, Beawar, Deeg, Didwana-Kuchaman, Khairthal-Tijara,
  Kotputli-Behror, Phalodi, Salumbar) appear in a "Not yet on map" list under the map.

To use official boundaries later (e.g. Rajasthan's 41 districts from the state GIS cell or Bhuvan), replace the
file. Each district feature only needs a **`geo_code`** property equal to its code in
`prisma/seed-data/districts.ts` (e.g. `RJ-JAIPUR`); the property name is set per state by `geoCodeProperty`
in `config/states.ts`. <https://mapshaper.org> can add the property, e.g.
`-each 'geo_code = "RJ-" + district.toUpperCase().replace(/ /g, "-")'`.

**Background map tiles** come from Stadia Maps (`config/map.ts`) and need internet. They work without an API key
on `localhost`; a hosted deployment needs a free Stadia account with the domain registered.

### 2. Imagery

Imagery is uploaded from a project's page (**Upload imagery**): Satellite, Drone or Field photo, up to 10
JPEG/PNG/WebP images of 20 MB each. On phones, *Field photo* can open the camera directly. Photos carrying GPS
show their distance from the project site and are flagged when more than 2 km away; the capture date is taken
from the photo when available. iPhone HEIC photos are not supported — set *Settings › Camera › Formats › Most
Compatible* or upload a JPEG.

Uploaded imagery is a permanent record: it **cannot be edited or deleted** by anyone.

**Comparing imagery** (*Compare imagery* on a project or its gallery) opens a full-screen view of 2–4 dated
images side by side. Zooming or panning any image (scroll/pinch, drag, double-click, `+` `−` `0`, arrow keys)
moves all of them together, so the same spot stays aligned across dates. *Show changes* highlights in red the
pixels that differ from the earliest selected image, with an approximate "% changed" — a simple pixel
comparison (no AI), so captures with different framing, zoom or season also show as change. *Download* saves the
current view as one PNG with dates and project name. The selection is kept in the URL so a comparison can be shared.

**Verifications:** the CMO, Admin, Department Heads and Collectors can *Record verification* from the comparison
— *Progress visible*, *No visible change* or *Discrepancy with reported progress* (note required) — which is saved
with the compared images, listed on the project page with a link back to that comparison, and audit-logged.
Field Officers collect imagery but don't record verifications.

Files are stored privately under `storage/` (set `STORAGE_DIR` to move it) in three sizes (original,
display ≤2400 px, thumbnail 480 px) and are served only through `/api/imagery/<id>` after a login, portal and
scope check — there are no public image URLs. If you set up the project before this change, run
`npm run imagery:migrate` once to move the old public demo images into private storage.

The seed generates stylised placeholder images (marked "DEMO IMAGERY"). For a convincing demo, take
screenshots of the same real construction site on two dates from Google Earth Pro (historical imagery slider)
or Esri Wayback and upload them as *Satellite* imagery with the correct capture dates.

> Free imagery (Sentinel-2, ISRO Bhuvan) is ~10 m resolution — not enough to see individual buildings.
> Building-level verification in production needs paid high-resolution imagery or drone uploads.
