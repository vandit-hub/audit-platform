## UI Migration Mapping

This document inventories the current Next.js UI surface, the components provided by the new Figma-driven prototype in `new-figma-ui`, and highlights functional gaps or backend dependencies that must remain intact during the migration.

### 1. Layout & Global Structure

| Area | Current Implementation (`src/`) | Figma Prototype (`new-figma-ui/`) | Notes / Actions |
| --- | --- | --- | --- |
| Root layout | `app/layout.tsx` with `SessionWrapper`, `ToastProvider`, `SessionTimeout` | `App.tsx` → `SidebarProvider`, top-level `AuthProvider` | Keep existing auth/session providers; we only adopt layout primitives. |
| Dashboard shell | `app/(dashboard)/layout.tsx` + `components/NavBar.tsx` | `components/AppSidebar.tsx`, `components/AppHeader.tsx`, `components/PageContainer.tsx` | New shell uses sidebar + inset pattern. Must integrate NextAuth session, RBAC checks, websocket context. |
| Styling baseline | `app/globals.css`, Tailwind 3 config | `styles/globals.css`, `index.css` (Tailwind v4-style tokens) | Need to merge design tokens without breaking Tailwind 3 build. Some utilities (e.g. `@custom-variant`, `@theme inline`) need scoping or polyfills. |
| Notification/toast | `contexts/ToastContext`, bespoke | `components/ui/sonner` (Radix-based) | We can wrap sonner under existing toast context for consistency. |

### 2. Page Surface Mapping

| Route | Current File(s) | Prototype Reference | Functional Hooks |
| --- | --- | --- | --- |
| `/dashboard` | `app/dashboard/page.tsx`, `components/DashboardContent.tsx` | `pages/Dashboard.tsx` | Existing page fetches `/api/v1/audits`, `/api/v1/reports/overview`. Prototype adds richer cards, risk charts, action list—needs real data or deferred notes for charts like process areas. |
| `/audits` | `app/(dashboard)/audits/page.tsx` | `pages/Audits.tsx` | Current page creates audits via API and enforces RBAC. Prototype introduces dialog, multi-select, mock progress; must retain POST `/api/v1/audits`, GET `/api/v1/audits`, `/api/v1/plants`. Features like multi-select suggestions currently mock-only → mark as future backend work. |
| `/audits/[id]` | `app/(dashboard)/audits/[auditId]/page.tsx` | `pages/AuditDetails.tsx` | Detail view interacts with assignment, locking endpoints. Prototype shows timeline cards, audit head widgets, tabbed content. Ensure actions map to existing API: `/assign`, `/lock`, `/complete`, `/visibility`. |
| `/observations` | `app/(dashboard)/observations/page.tsx` | `pages/Observations.tsx` | Current page has extensive filters tied to query params. Prototype features segmented filters, Kanban summary. Need to keep query building and creation POST `/api/v1/observations`. |
| `/observations/[id]` | `app/(dashboard)/observations/[id]/page.tsx` | `pages/ObservationDetails.tsx` | Maintains WebSocket locking, role checks, attachments. Prototype adds timeline, tabs, change request history. Many visual sections need to defer to existing data structures. |
| `/plants` | `app/(dashboard)/plants/page.tsx` | `pages/Plants.tsx` | Currently list plants via `/api/v1/plants`. Prototype adds stats, filters, map placeholder → document as backend gap (no geo data). |
| `/checklists` | `app/(dashboard)/checklists/page.tsx` | `pages/Checklists.tsx` | Presently fetches via `/api/v1/checklists`. Prototype includes board view, quick filters, progress pills—some require extra API fields (assignment counts). |
| `/reports` | `app/(dashboard)/reports/page.tsx` | `pages/Reports.tsx` | Current implementation calls `/api/v1/reports/*`. Prototype adds charts, trend cards (Recharts). Need to confirm data availability; highlight metrics lacking API (e.g. heatmaps). |
| `/admin/users` | `app/(dashboard)/admin/users/page.tsx` | `pages/Admin.tsx` (Settings) | Must preserve user management flows. Prototype includes role management drawer, permission matrix—requires extending current API or deferring. |
| `/admin/import` | `app/(dashboard)/admin/import/page.tsx` | `pages/ImportSpec.tsx` | Current page handles file upload & templates. Prototype emphasises stepper UI; functionality matches existing endpoints. |
| `/ai` | `app/(dashboard)/ai/page.tsx` | `pages/AIAssistant.tsx` | Current page already wires to `/api/v1/ai/chat`. Prototype offers richer conversation list & quick prompts; ensure new UI consumes real chat sessions. |
| Auth (`/login`, `/accept-invite`) | `app/(auth)/login/page.tsx`, `app/(auth)/accept-invite/page.tsx` | `pages/Login.tsx`, `pages/Admin.tsx` invite section | Need to restyle forms but keep NextAuth credentials POST and invite token handling. |

### 3. Component Parity

| Current Component | Prototype Equivalent | Migration Notes |
| --- | --- | --- |
| `components/NavBar.tsx` | `components/AppSidebar.tsx` + `AppHeader` | Sidebar handles role-based menu via `useAuth`; we must adapt to NextAuth session (roles, sign-out). |
| `components/ui/*.tsx` (Button, Card, Badge, Input, Select, Spinner, etc.) | `components/ui/*` (Radix + CVA) | New set depends on Radix & class-variance-authority. Plan to add `components/ui/v2/` namespace to migrate gradually. |
| `contexts/ToastContext.tsx` | `components/ui/sonner` | Wrap `sonner` into toast context to maintain existing API. |
| `lib/websocket/provider.tsx` | n/a | Must keep as-is; new layout should still wrap children with provider. |
| `components/RoleBadge.tsx` | Prototype uses badges with icons | Either restyle existing `RoleBadge` using new `Badge` variant or replace with new component ensuring RBAC logic persists. |

### 4. Design Tokens & Utilities

- Prototype defines extensive CSS variables in `styles/globals.css` and raw Tailwind v4 utility output in `index.css`. Many directives (`@custom-variant`, `@theme inline`, CSS `@layer` utilities) are not recognised by Tailwind 3 by default.
- Required actions:
  - Extract colour palette, typography, spacing tokens into `app/globals.css` under guarded scopes (e.g. `.figma-theme` or root variables).
  - Evaluate which utilities are needed versus existing Tailwind classes; consider porting only necessary classes (badges, status tags) to custom CSS modules to avoid Tailwind compiler conflicts.
  - Keep Tailwind 3 in place and polyfill the required token-driven utilities with CSS variables and handcrafted classes rather than attempting a tooling upgrade during migration.
  - Add dependencies: `clsx`, `tailwind-merge`, `class-variance-authority`, Radix primitives (some already present).

### 5. Backend Gap Tracking (Prototype vs Reality)

| Prototype Element | Backend Support Today | Action |
| --- | --- | --- |
| Dashboard process area card | No process taxonomy in current API | Temporarily show a placeholder message; track requirement for future `/reports/process` endpoint. |
| Dashboard action item callouts | No endpoint returning high-priority observation list | Placeholder messaging in UI; requires enriched observations API with prioritisation metadata. |
| Dashboard charts (process area breakdown, overdue critical counts) | Partial via `/reports/overview`, missing process taxonomy | Mark as enhancement; show placeholders with existing metrics. |
| Audits creation dialog multi-select suggestions | No API for auto-complete of users/plants beyond manual fetch | Replace suggestions with real `/api/v1/users` query, or degrade to simple select; note for follow-up. |
| Observations kanban/status grouping & analytics | Current API returns flat list | Need additional endpoints or client-side grouping; treat as iterative enhancement. |
| Plants map & sustainability data | No geo/sustainability fields | Display simplified card set; log as future work. |
| Reports heatmap & trend charts | API returns summary counts, not historical trend arrays | Implement fallback using existing arrays; track need for trend endpoint. |
| Admin role matrix & scope toggles | Current UI limited to table view, API limited to invite management | Additional endpoints required; plan staged rollout. |

### 6. Page Migration Progress

- `dashboard/page.tsx` now renders through `PageContainer` with the new v2 cards/badges (real metrics wired in).
- `audits/page.tsx` adopts the new form styling, radial select, and results table using v2 primitives.
- `plants/page.tsx` now renders via PageContainer with metric cards, creation form, and refined table; regional coverage card remains a placeholder until geo data is available.
- `observations/page.tsx` consumes the new shell and styling tokens; filters/table still rely on legacy inputs and will be upgraded in a later pass.
- Remaining feature areas (`/reports`, `/plants`, `/admin`) still use legacy components and are queued for iteration once core flows stabilise.
- `reports/page.tsx` rebuilt with PageContainer, new summary strip, updated filters, and placeholder analytics cards pending trend/heatmap APIs.

### 7. Next Steps

1. Finalise token merge strategy (Tailwind 3 compatible).
2. Port base components into `components/ui/v2`.
3. Rebuild dashboard shell using `AppSidebar` + `AppHeader` tied to real session data.
4. Begin page migrations following priority: Dashboard → Audits → Observations → remainder.

**Note:** Core primitives now live under `src/components/ui/v2/**` (button, badge, card, input, textarea, avatar, dropdown, sheet, tooltip, sidebar, skeleton). Layout helpers `PageContainer` and `AppHeader` reside in `src/components/v2/` for easy adoption during page rewrites.

_Document updated: 2025-11-09_
# UI Migration Mapping

## 1. Baseline Application Structure
- **Root layout (`src/app/layout.tsx`)** wraps the App Router tree with `SessionWrapper`, `ToastProvider`, and `SessionTimeout`. It expects Tailwind utility classes defined in `src/app/globals.css` and relies on the authenticated session inferred from NextAuth v5 (`auth()` call).
- **Dashboard layout shell (`src/app/(dashboard)/layout.tsx`)** enforces authentication, injects the `WebSocketProvider`, renders `NavBar`, and applies a neutral background. All dashboard pages render within `main` and inherit padding/breakpoints from the layout.
- **Shared UI library (`src/components/ui/*.tsx`)** contains light-weight primitives (buttons, inputs, cards) styled with Tailwind 3 tokens declared in `tailwind.config.ts`. Many pages import these directly.
- **Feature pages** live under `src/app/(dashboard)/**`. They are client components powered by fetches to `/api/v1/**` endpoints (Prisma-backed) and RBAC helpers from `@/lib/rbac`. State management is local to each page.
- **Support contexts and hooks**: `ToastContext` (Sonner-like wrapper), `SessionTimeout`, and websocket utilities from `src/lib/websocket` coordinate realtime behaviour already used by observations detail pages.

## 2. New Figma Kit Overview (`new-figma-ui`)
- **Design tokens** live in `src/styles/globals.css` (CSS variables) and `src/index.css` (Tailwind v4 generated utilities). They introduce Notion-inspired colour, spacing, and typography scales that differ from our current Tailwind theme.
- **Layout primitives**: `AppSidebar`, `AppHeader`, `PageContainer`, `PageTitle`, `StatusBadge`, and supporting wrappers (`SidebarProvider`, `SidebarInset`) orchestrate navigation, top bar actions, and responsive shell behaviour. They expect local auth state and Radix UI based components from `src/components/ui/**`.
- **State & auth assumptions**: `contexts/AuthContext.tsx` mocks credential handling; page components call `useAuth()` for role-gated UI, log out, and invite acceptance. In production we must swap these for NextAuth hooks and ensure sidebar/footer avatars render real user data (email, role badge).
- **Per-page mock implementations** under `src/pages/**` cover Dashboard, Audits, AuditDetails, Observations, ObservationDetails, Checklists, Plants, Reports, Admin (users & invites), AI Assistant, Import Spec, and Login. Each page consumes mock data from `src/data/mockData.ts` and expects additional UI pieces (dialogs, tables, charts, progress bars) backed by the Radix & lucide ecosystem.
- **UI component library** relies on Tailwind v4 syntax (e.g. CSS variables, `@theme inline`, container queries) and the latest Radix primitives (`@radix-ui/react-*`), plus `sonner` for toasts and `vaul` for drawers.

## 3. Mapping: Layout & Navigation
| Concern | Current Implementation | Figma Equivalent | Data/Behaviour Notes |
| --- | --- | --- | --- |
| Global layout wrapper | `src/app/layout.tsx` + `SessionWrapper` | Keep structure, extend body styles with new tokens | Must preserve NextAuth session hydration, idle timeout overlay, and ToastProvider. |
| Dashboard navigation | `NavBar` top bar with role-based links | `AppSidebar` + `AppHeader` (collapsible sidebar, header actions) | Sidebar needs to read NextAuth role (no local AuthContext). Sign-out must still call `signOut`. Ensure links respect RBAC (`isCFO`, `isAuditHead`, etc.). |
| Page container & title | Manual padding + `<h1>` per page | `PageContainer`, `PageTitle`, `StatusBadge`, `PageHeader.actions` | `PageContainer` should wrap existing child content but keep Next.js streaming boundaries; we can gradually migrate pages. |
| Toasts | `ToastContext` custom provider | Figma kit uses `sonner` directly | Continue exposing existing toast API but internally migrate to new `Toaster` once components are ported. |

## 4. Mapping: Feature Pages
| Route | Current File(s) | Key Behaviours / APIs | Figma Page | Additional UI Elements & Backend Gaps |
| --- | --- | --- | --- | --- |
| `/dashboard` | `src/components/DashboardContent.tsx` (fetches `/api/v1/audits`, `/api/v1/reports/overview`) | Summary metrics, audit status counts, observation risk breakdown, due counts | `new-figma-ui/src/pages/Dashboard.tsx` | Adds KPI tiles, risk distribution progress bars, process area rankings, recent audits cards, action item lists. Requires richer metrics: per-risk percentages, action plan statuses, MR pipeline counts, process classification. Some data (action plans, process areas) not yet exposed by API — flag as gaps. |
| `/plants` | `src/app/(dashboard)/plants/page.tsx` | Lists plants, supports create/edit via modal, fetches `/api/v1/plants` | `src/pages/Plants.tsx` | Adds metrics summary (total plants, new this month), timeline, quick filters. Needs backend for createdAt stats; ensure CRUD modals integrate with API. |
| `/audits` | `src/app/(dashboard)/audits/page.tsx` | Fetches plants & audits, allows create via POST `/api/v1/audits`, respects RBAC for CFO/CXO | `src/pages/Audits.tsx` | Incorporates progress bars, lock/unlock toggles, dialog with multi-select auditors, lucide icons. Requires API for audit progress %, visibility toggles, auditor suggestions, lock mutation endpoint (already exists?). Multi-select invites watchers — note that backend currently expects assignment IDs, not names. |
| `/audits/[id]` | `src/app/(dashboard)/audits/[auditId]/page.tsx` | Loads audit details, checklists, assignments, locks; triggers websocket updates | `src/pages/AuditDetails.tsx` | Figma adds segmented tabs (Overview, Observations, Checklists), timeline cards, documents, visibility controls, and quick actions. Need to ensure data for timeline, open observation counts, visibility labels; identify missing APIs for documents summary. |
| `/observations` | `src/app/(dashboard)/observations/page.tsx` | Filterable table, create observation (POST `/api/v1/observations`), RBAC for auditors, bulk actions limited | `src/pages/Observations.tsx` | Introduces bulk approve/publish toggles, column-level filters, selection checkboxes, status/risk badges, toasts via `sonner`. Bulk operations require backend endpoints (approve, publish) for many IDs — currently not implemented. |
| `/observations/[id]` | `src/app/(dashboard)/observations/[id]/page.tsx` | Observation detail, editing fields, stage actions, notes, attachments, websocket locking | `src/pages/ObservationDetails.tsx` | Adds structured sections (Summary, Root Cause, Action Plans, Attachments), timeline chips, change history, assignment tags. Needs mapping to existing API shape; highlight features lacking backend (action plan progress bars, inline status toggles). |
| `/checklists` | `src/app/(dashboard)/checklists/page.tsx` | List + manage checklists, interacts with `/api/v1/checklists` and `/api/v1/audits` | `src/pages/Checklists.tsx` | Adds heatmap cards, quick stats, inline editing drawers. Requires endpoints for completion %, grouping by plant, etc. |
| `/reports` | `src/app/(dashboard)/reports/page.tsx` + API `/api/v1/reports/*` | Generates overview, exports (CSV/PDF), target tracking | `src/pages/Reports.tsx` | Figma includes trend charts, export cards, quick filters, success metrics. Some charts rely on time-series data currently not exposed. |
| `/ai` | `src/app/(dashboard)/ai/page.tsx` | Uses AI SDK to chat (OpenAI-like) via `/api/v1/ai/*` | `src/pages/AIAssistant.tsx` | Adds conversation list, quick prompts, recommended templates. Need to align with actual chat session storage (`/api/v1/ai/sessions`). |
| `/admin/users` | `src/app/(dashboard)/admin/users/page.tsx` | Manage users, invites via `/api/v1/users` and `/api/v1/auth/invite` | `src/pages/Admin.tsx` (Settings) | Introduces tabs for Users, Invitations, Roles, toggles for SSO, limits. Need to ensure forms map to existing endpoints; some toggles (SSO switch, RBAC matrix) currently lack backend support. |
| `/admin/import` | `src/app/(dashboard)/admin/import/page.tsx` | Handles Excel upload to `/api/v1/import/excel` | `Admin` + `ImportSpec.tsx` | Figma splits into Import dashboard + specification viewer; we must keep upload pipeline intact, add new spec page under `/docs/import-spec`. |
| `/docs/import-spec` | `src/app/docs/import-spec/page.tsx` | Static documentation page | `src/pages/ImportSpec.tsx` | Already similar; can reuse content structure with new typography. |
| `/(auth)/login` | `src/app/(auth)/login/page.tsx` | NextAuth credentials form, error display | `src/pages/Login.tsx` | Figma uses split layout, gradient card, remembers email. Ensure we keep `signIn` call and error handling. |
| Invitation acceptance | `src/app/(auth)/accept-invite/page.tsx` | Accepts token, collects name/password | Figma has modal-like flow (not a dedicated page) | Need to adapt styling only; functionality is handled server-side. |

## 5. Shared Component Mapping
| Component Type | Current Source | Figma Source | Migration Notes |
| --- | --- | --- | --- |
| Button / Input / Select / Badge | `src/components/ui` (Tailwind 3 classes) | `new-figma-ui/src/components/ui` (Radix + Tailwind 4 tokens) | Need compatibility layer: wrap new components in `src/components/ui/v2` and gradually migrate imports. Consider re-exporting with same prop signatures to limit churn. |
| Card & layout utilities | Manual `div` wrappers with Tailwind classes | `Card`, `PageContainer`, `PageTitle`, `StatusBadge` | Introduce new components but keep existing className overrides; ensure SSR safe. |
| Icons | Heroicons / inline SVG | `lucide-react` | Add `lucide-react` dependency and map icons; ensure tree-shaking works with Next.js 15. |
| Modals/dialogs | HTML + CSS or small libs | Radix Dialog, Select, Dropdown, Tooltip | Ensure we wrap Radix components to manage SSR hydration warnings. |
| Toasts | Custom `ToastContext` | `sonner` | Evaluate migrating context to call `toast.*` while preserving API consumed by pages. |

## 6. Backend/Data Gaps Identified
- **Action plan metrics** (Dashboard + Observation detail) — no dedicated API for counts/status; requires extending `/api/v1/reports/overview` or adding new endpoints.
- **Process area aggregation** (Dashboard) — needs taxonomy stored per observation; confirm Prisma schema holds `concernedProcess` values.
- **Audit progress %** — currently computed per checklist item; ensure we expose aggregated percentage so progress bars stay accurate.
- **Bulk observation actions** (approve/publish) — backend has single-item endpoints; need batched versions or sequential client loops (performance?).
- **User suggestions for auditor assignment** — requires search endpoint or reuse `/api/v1/users` with query.
- **Admin toggles (SSO, restrictions)** — purely visual today; mark as future enhancements before wiring to backend.
- **Charts and timelines** (reports, audit details) — verify existing endpoints provide historical data; otherwise document as stretch goals.

## 7. Next Steps Snapshot
1. CSS-variable bridge for Figma tokens is now in place (Tailwind 3 + globals). We’re standardising colour usage via `withOpacityValue` helpers so existing `bg-primary-600` classes keep working while new `bg-primary` / `bg-background` tokens resolve through CSS variables.
2. Port shared primitives into `src/components/ui/v2` and wrap Radix dependencies to avoid breaking SSR.
3. Rebuild dashboard shell with new sidebar/header once primitives are ready, then migrate pages one by one while tracking the backend gaps above.

_All items above feed into the to-do list tracked in `/f.plan.md`. Update that list as milestones complete, and keep this mapping file current with any newly discovered gaps._
