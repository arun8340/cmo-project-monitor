# CMO Project Monitoring & Review — based on On-Demand Instant Satellite Imagery (POC)

Verification layer for government infrastructure projects in **Rajasthan** and **Maharashtra**:
every project has a site, dated satellite / drone / field imagery, progress history, issues and directives.
See [PROJECT_BRIEF.md](PROJECT_BRIEF.md) for the full scope.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · Prisma 7 + SQLite (`better-sqlite3` adapter) · next-intl (English / हिन्दी / मराठी)

## Getting started

```bash
npm install            # also runs `prisma generate`
cp .env.example .env   # then set AUTH_SECRET (see below)
npm run db:migrate     # create / update the SQLite database
npm run db:seed        # demo data + real site imagery
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
| Department Head | `rnb.rj@demo.gov.in` (Roads & Buildings) | `rnb.mh@demo.gov.in` (Roads & Buildings) |
| DoIT – Imagery desk | `doit.rj@demo.gov.in` | `doit.mh@demo.gov.in` |
| District Collector | `collector.jaipur@demo.gov.in` | `collector.mumbai-suburban@demo.gov.in` |
| Field Officer | `field.jaipur@demo.gov.in` | `field.mumbai-suburban@demo.gov.in` |

## Demo data

- **Districts:** Rajasthan 41 (post Dec-2024 reorganisation), Maharashtra 36 — all seeded with English + local names.
- **Departments (per state):** PWD, Metro, Drainage & Sewer, Urban, Roads & Buildings, Rural, MGNREGA.
- **Projects:** for the demo, **eight per state**: six with real satellite imagery and two still awaiting imagery
  (Udaipur in Rajasthan, Pune in Maharashtra; listed in `WITHOUT_IMAGERY` in `prisma/seed.ts`). The six real before/after image sets (four from Jaipur, two from Mumbai) are each
  used once in Rajasthan (Jaipur, Jodhpur) and once in Maharashtra (Mumbai Suburban, Mumbai City, Pune, Nagpur);
  the copies carry local project names and locations, but the screenshots show the original site. `prisma/seed-data/projects.ts`
  holds 65 projects; set `ONLY_IMAGED_PROJECTS = false` in `prisma/seed.ts` to seed them all.
- Each project has monthly progress updates and issues (open ones tagged to the last review meeting). CMO
  directives exist per state, some overdue.
- **Meetings (per state):** CMO review meetings are held on the **15th and 30th of every month** (the last day
  in February), 11:00 am. The demo has the two most recent (with the issues tagged to them), the next one with a
  published agenda, and a draft for the one after. In demo mode these move with the calendar, so the next meeting
  is always the coming 15th or 30th. New meetings default to the next free 15th / 30th.
- **Imagery:** each seeded project has real before/after satellite imagery (see [Imagery](#2-imagery)).
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

## Issues, directives and review meetings

**Projects**, **Districts** and **Departments** in the menu open a list of every project, district or department
in your view (hover or click). The header of every state page links to **Overview**, **CMO Meetings**, **Live Imagery**, **Projects**,
**Districts**, **Issues** (with the open count), **Directives** (with the overdue count in red), **Activity log**
(CMO) and **Departments**. Districts and Departments show a card for each, with its latest satellite image and project counts.

- **Issues** are raised from a project's page (*Raise issue*) by Collectors, Department Heads, Field Officers (on
  their assigned projects) and Admin, with a priority and an optional review-meeting date. The Issues page filters by
  status, priority, district, department and review meeting. Collectors, Department Heads, the CMO and Admin change
  status (Pending → In progress → Resolved → Archived, or reopen); resolving or reopening needs a note.
- **Directives** are issued by the CMO / Chief Secretary or Admin to a district, department and/or project, with a
  **responsible officer** (the Collector of that district or Head of that department) and a due date. The owner (or a
  Collector / Department Head in scope) marks it *In progress* or *Complied* (compliance note required); the CMO then
  *accepts and closes* it or *reopens* it. Open directives past their due date show as **Overdue**.
- Every status change is kept in a **history timeline** on the issue / directive page, and in the audit log.
- **CMO meetings** (*CMO Meetings*, right after Overview in the menu; its dropdown lists upcoming and recent past
  meetings, and the page has *Upcoming* / *Past* tabs with each meeting's agenda): the CMO / Chief Secretary and Admin schedule a meeting (date, time, venue,
  chair, notes) and build a numbered **agenda**. Each point can be linked to a project, issue or directive, and
  then shows that item's current status. Delayed/stalled projects, high-priority issues and overdue directives are
  suggested as one-click points. A meeting is saved as a **draft** (seen only by those who manage meetings) and
  **published** for everyone in the state; it can be cancelled or printed (*Print agenda*). The home page shows
  the **next CMO review meeting** with the start of its agenda. Issues keep their own optional review-meeting date,
  which the "pending/resolved at last meeting" counts use.

## Imagery requests (DoIT)

**DoIT (Department of IT)** is each state's imagery desk (role *DoIT – Imagery desk*, whole-state view;
`doit.rj@demo.gov.in`, `doit.mh@demo.gov.in`).

- **Anyone** can ask for imagery of a project they can see: *Request imagery* on the project page, in Live
  tracking, on "awaiting imagery" project cards, or *Imagery Requests → Request imagery*. They choose the type
  (Satellite / Drone / Field photo), say what it is for, and when it is needed (defaults to the next CMO meeting
  at least 3 days away). **CMO requests are always Critical.**
- **DoIT's home page is its imagery desk dashboard:** figures (to review, approved and waiting to be ordered, on order,
  overdue, delivered this month, average turnaround), the requests that need attention (overdue first, then by
  priority), requests by department, orders by supplier (average delivery time, on time), and recent deliveries.
  Each figure opens the matching tab of the queue.
- **DoIT** works from *Imagery Requests* (its queue: New, Under review, Open, Approved, Closed): start review,
  **approve**, or **reject** (reason required), and add notes. The requester can cancel until it is ordered.
  Requests past their needed-by date are flagged **Overdue**. The menu badge shows DoIT how many are waiting,
  and everyone else how many of their own requests are still open.
- Every step is kept in the request's history and the activity log. Departments can still upload their own
  field photos directly.
- **Ordering:** on an approved request DoIT chooses a **supplier** (BlackSky, Maxar via Globe Imagery, the state's
  drone operator or the field survey team — managed under *Imagery Requests → Suppliers*), notes the order
  reference and expected date (from the supplier's usual turnaround). Orders are recorded in the app only; there is
  no live connection to BlackSky in the POC. An order past its expected date is flagged Overdue; DoIT can withdraw
  it (reason required).
- **Delivery:** *Upload delivered imagery* on the request opens the normal upload page; the images are added to
  the project (so they appear in Live tracking and Compare), linked to the request, and the request becomes
  **Delivered**. The requester (or DoIT) then confirms and closes it.

## Users, roles and the audit log

The **admin portal** header has **States**, **Users**, **Roles** and **Audit log**.

- **Users** (`/admin/users`): search and filter by state, role and active/deactivated. *Add user* asks for the role
  and the scope it needs — CMO: state; Department Head: state + department; Collector and Field Officer: state +
  district; Admin: none — plus a **temporary password** (*Generate* makes one). On first sign-in the person must
  choose their own password before they can do anything else.
- A user's page lets the Admin edit details, role and scope, **set a new temporary password**, **deactivate /
  reactivate** (takes effect on the person's next click — they are signed out), and for Field Officers **assign
  projects** from their district. Changing someone's role or state also signs them out. You can't deactivate
  yourself, remove your own Admin role, or leave the system without an active Admin.
- **Roles** (`/admin/roles`): a table of what each role may do; tick and *Save permissions*. The Admin role always
  has everything; managing users, master data and switching states stay Admin-only; *View projects* is always on.
  Which **data** a person sees is set by their scope, not by these permissions.
- **Audit log** (`/admin/audit`): every sign-in (and failed attempt), project edit, progress update, upload,
  verification, issue, directive and user/role change, in plain language with links. Filter by date, person,
  category and state, or show failed sign-ins only; *Download CSV* exports the current filter.
- **Activity log** (state portals): the CMO / Chief Secretary sees the same log limited to their state, from
  *Activity log* in the header. Give or remove this with the *View activity log* permission on the Roles page.
- **Everyone** can change their own password from the user menu (top right). Passwords need at least 10
  characters with a letter and a number. (The seeded demo users keep `Demo@123` and aren't asked to change it.)

## Languages (English, हिन्दी, मराठी)

Each state portal can be used in English or the state's language — **Hindi on the Rajasthan portal, Marathi on
the Maharashtra portal** — using the **English | हिन्दी** (or **मराठी**) switch in the header, on the login page, or in
the user menu on phones. The choice is remembered per portal in the browser. The admin portal is English only.

- Everything on the state portals is translated: navigation, the map, dashboards, project pages, imagery, comparison,
  issues, directives, the activity log (and its CSV), form errors and confirmations. Dates use Hindi / Marathi month
  names; budgets read ₹25 करोड़ / ₹25 कोटी. Figures stay in Latin digits so they match reports.
- District, department and project names show the local-language name first (with English alongside) when one exists.
  Data typed by users — descriptions, notes, issue titles — is shown as entered.
- Translations live in `messages/en.json`, `messages/hi.json` and `messages/mr.json`. `npm run check:messages` checks
  that Hindi and Marathi have every English message with the same `{placeholders}`; a missing message falls back to
  English rather than breaking the page.
- How it works: Proxy reads the `NEXT_LOCALE` cookie and serves each page under a hidden language segment
  (`app/[locale]/…`), so URLs stay the same in every language. Server actions and the CSV export read the cookie.
- Adding a language for a new state: set `locale` in `config/states.ts`, add it to `LOCALES` in `lib/i18n/config.ts`,
  and add `messages/<locale>.json`.

## Deploying the demo to Vercel (no database needed)

For demos the app can run in **demo mode**: the repo ships a ready-made demo database and its imagery in
`demo/`, so there is no database or storage service to set up.

- With `DEMO_MODE=true` the app copies `demo/` into a temporary folder on the server and works from that
  copy. Everything works — signing in, editing, raising issues, uploading photos — but **changes are
  temporary**: when the host recycles the server (after some idle time, or when it starts another
  copy) the original demo data comes back. A "Demo · changes reset" badge shows in the header.
- Dates are moved forward by the snapshot's age when the copy is made, so the demo always looks the same
  (due dates, "3 days ago", planned progress don't drift). Capture dates of the real site imagery are
  kept as they are, since they are printed on the images.
- After changing the seed data, rebuild the snapshot with `npm run demo:snapshot` and commit `demo/`.
  (It uses its own files; `dev.db` and `storage/` are not touched.)
- On Vercel each request can carry at most ~4.5 MB, so upload one or two normal photos at a time.

**Steps**

1. vercel.com → Add New → Project → import this repository. Settings → General → Node.js **22.x**.
2. Settings → Domains → add three addresses to the same project, e.g. `cmo-rajasthan.vercel.app`,
   `cmo-maharashtra.vercel.app`, `cmo-admin.vercel.app` (or `rj.` / `mh.` / `admin.` on your own domain).
3. Settings → Environment Variables:

   | Variable | Value |
   |---|---|
   | `DEMO_MODE` | `true` |
   | `AUTH_SECRET` | a new secret — run `npx auth secret` and paste it |
   | `PORTAL_HOST_RJ` / `PORTAL_HOST_MH` / `PORTAL_HOST_ADMIN` | the three addresses (no `https://`) |
   | `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` | `true` |

4. Deploy, then open each address and sign in with the demo accounts (`Demo@123`).
5. Map tiles: create a free Stadia Maps account and register the three addresses (see `config/map.ts`).

## Where things live

| Path | Purpose |
|---|---|
| `config/states.ts` | Per-state config (names, interface language, GeoJSON path, map centre/zoom, colour) |
| `lib/constants.ts` | Status / priority / source enums, roles and permissions |
| `lib/db.ts` | Shared Prisma client (server only) |
| `lib/auth/` | Data access layer (`dal.ts`) and role scoping (`scope.ts`) |
| `auth.ts`, `auth.config.ts`, `proxy.ts` | Auth.js setup and per-portal routing |
| `config/portals.ts` | Portal addresses (state and admin) |
| `prisma/schema.prisma` | Data model |
| `prisma/seed.ts` | Seed script; `prisma/site-imagery.ts` loads the real site images from `prisma/seed-data/imagery/` |
| `public/geo/` | District boundary GeoJSON (generated by `npm run geo:build`) |
| `storage/` | Uploaded imagery — **private**, git-ignored; `storage/sites/` is regenerated by the seed |
| `lib/storage/` | Storage interface (local disk now; swap in S3 by implementing it) |
| `app/api/imagery/[id]` | Serves imagery only after the same access checks as project pages |
| `app/[locale]/admin/`, `app/actions/admin.ts` | Admin portal: users, roles, audit log (and their server actions) |
| `demo/`, `lib/demo.ts` | Demo-mode data snapshot and loader (`npm run demo:snapshot`) |
| `lib/audit.ts` | Audit-log descriptions, filters and state scoping (pages and CSV export) |
| `messages/`, `i18n/request.ts`, `lib/i18n/` | Translations, next-intl setup, language helpers (names, labels, switcher config) |

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

A project's page opens with its **latest satellite image**, the list of available image dates and a two-date
*Compare*. **Live tracking** (button at the top of the project page, and on the Imagery page) shows the latest
image full-screen; step through earlier dates or pick two to compare. "Live" means the latest image uploaded —
in the POC images are added by hand.

Imagery is added with **Add images** (on the project page, project lists, the Imagery page and Live tracking) by
Collectors, Department Heads, Field Officers, the CMO and Admin: Satellite, Drone or Field photo, up to 10
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

The seed attaches real before/after satellite imagery (Google Earth historical imagery, unaltered with
its "© Airbus / Google Earth" credit — internal demo use only) to six projects, placed at the real sites:

| Project | District | Captures |
|---|---|---|
| Affordable Housing Block (PMAY-U), Vidhyadhar Nagar | Jaipur | 2 Jan 2025 → 18 Jul 2026 |
| Flyover at Ajmer Road – Ring Road Junction | Jaipur | 27 Sep 2025 → 18 Jul 2026 |
| Government Girls College Building, Chomu | Jaipur | 26 Mar 2025 → 18 Jul 2026 |
| PMGSY Rural Road, Phagi–Renwal | Jaipur | 9 Feb 2026 → 18 Jul 2026 |
| Family Court Building Extension, Andheri West | Mumbai Suburban | 10 Oct 2025 → 4 Jun 2026 |
| Municipal Staff Housing, Arthur Road | Mumbai City | 2 Jan 2025 → 10 Oct 2025 |

Each project's work starts two weeks after its first (baseline) image. The images live in
`prisma/seed-data/imagery/`; to add a site, put the screenshots there and add a `site` entry (coordinates
and dated files) to the project in `prisma/seed-data/projects.ts`. Other projects have no imagery until it
is uploaded — take screenshots of the same site on two dates from Google Earth Pro (historical imagery
slider) or Esri Wayback and upload them as *Satellite* imagery with the correct capture dates.

> Free imagery (Sentinel-2, ISRO Bhuvan) is ~10 m resolution — not enough to see individual buildings.
> Building-level verification in production needs paid high-resolution imagery or drone uploads.
