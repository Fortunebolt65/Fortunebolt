# HR Digitization Platform — Design Reference

Status: **Draft for review** — build has not started. This document is the
reference we align on before any code is written.

---

## 1. What I understood from the brief

You handed me `HR_digitization_1_1.docx` — a Dynamics NAV *Requirements
Definition Document* for **Fidson Healthcare Plc's** HR & Admin department,
owned by Edidiong Udoh (Responsible) and Alli Adejoke (Accountable). It
enumerates, unit by unit, every HR business process the company wants an ERP
to cover, with each requirement tagged `Available` / `Not available` against
their current NAV setup.

Your ask, restated so you can correct anything I got wrong:

1. **Build a front-end-only HR system** that covers every module in that
   document — no real backend, but every screen should behave as if it were
   wired to one (data created in one module shows up, correctly, in every
   other module that should see it).
2. **Sequence the build by point of view (POV):** ship the **HR Admin POV**
   completely first. Once we've walked through it together and revised
   anything that's off, extend the same data/system to the other POVs
   (employees, line managers/HODs, HRBP officers, L&D staff, the clinic
   nurse, Finance approvers, etc.) as *views into the same underlying data*,
   not separate apps.
3. **Research first.** Look broadly at how real HR/HCM systems (Workday,
   SAP SuccessFactors, BambooHR, Darwinbox, etc.) structure this kind of
   work, and specifically research **Fidson** so the build reflects a real
   pharma-manufacturing HR department rather than a generic template.
4. **Prove it end-to-end myself before handing it back**, via UAT and
   exploratory testing across the whole build — every module reachable,
   every cross-module handoff actually firing, no dead links or orphaned
   forms.
5. **Set up whatever scaffolding is needed** (navigation, auth/role
   switching, seed data, notification system, design tokens) so the whole
   thing feels like one coherent platform rather than a stack of disconnected
   HTML pages.

If that's not quite right, tell me before I start Phase 1 (Section 8).

---

## 2. Research summary

### 2.1 Fidson Healthcare Plc (the reference company)

- Nigerian pharmaceutical manufacturer, founded **1995**, HQ at 268 Ikorodu
  Road, Obanikoro, Lagos. Listed on the Nigerian Exchange (NGX: FIDSON).
- **~674 employees** (2024), including 200+ pharmacists — the largest
  private-sector employer of pharmacists in Nigeria.
- CGMP-compliant manufacturing facility, WHO-GMP certification candidate;
  200+ products across anti-infectives, cardiovascular, antiretroviral,
  anti-malarial, analgesics, haematinics, GI, and supplements. Also does
  contract manufacturing for other healthcare companies.
- **The HR & Admin department has 5 units** (this is the real org chart
  behind the document you gave me — it explains the section headers):
  | Unit | Real remit at Fidson |
  |---|---|
  | **HR Business Partnering (HRBP)** | Talent sourcing, employer branding, employee engagement, employee relations |
  | **Learning & Development (L&D)** | Career development, curriculum design, performance management, talent management, training design/delivery/evaluation |
  | **Rewards & Benefits** | Pay-for-performance, welfare benefits, staff recognition (mentioned in org chart, *not* detailed in your doc — flagged as a gap in §6) |
  | **Clinic** | Staff health issues, health-awareness programmes, HMO administration, safety — this is the "Health & Wellness Unit" in your doc |
  | **Admin** | Facilities, assets, fleet, projects (not covered by your doc) |
- Wider company departments referenced around HR (for realistic mock data):
  Manufacturing, Research & Development, Business Development/Product
  Development, Sales & Marketing, Customer Relations, Operations, plus the
  usual Finance, IT, Supply Chain, QA/QC, Regulatory Affairs a CGMP pharma
  manufacturer needs.

**Design implication:** your document's three sections — L&D Unit, HRBP
Unit, Health & Wellness Unit — map directly onto three of Fidson's five real
HR units. I'll build those three at full depth. Rewards & Benefits and Admin
aren't specified in the requirements doc, so I will *not* invent detailed
modules for them — I'll leave clearly-labeled placeholders in the nav so the
IA is honest about what's in scope (see §6.4).

### 2.2 HRIS/HCM platform patterns (Workday, SuccessFactors, BambooHR, Darwinbox, HiBob)

- **Modular shell, single nav.** Every serious HCM product is one shell
  (top bar + module switcher/sidebar) around many modules, not separate
  mini-apps — permissions decide what a given user sees in the same shell,
  not a different shell per role. This directly informed the "one system,
  many POVs" instruction in your brief.
- **Task-first language for end users, process-first for admins.** Employee
  self-service screens are named after the action ("Apply for Leave",
  "View Payslip"); admin/HRBP screens are named after the business process
  ("Recruitment & Selection", "Disciplinary Management") — matching your
  source document's own naming.
- **Everything is a record with a workflow state.** Requisitions,
  appraisals, disciplinary cases, exit cases — each is an entity with a
  status (`Draft → Pending Approval → Approved/Rejected → Closed`), an
  owner, an approval chain, and an audit trail. This is the pattern that
  makes cross-module "communication" believable without a real backend: one
  shared data store, many views onto the same records.
- **A visible notification/approval-inbox layer** is what makes a system
  feel "alive." Every platform surfaces a bell/inbox of pending approvals
  and status changes — this is how I'll simulate the doc's repeated
  requirement for "email/SMS notifications" without real email/SMS.
- **Dashboards aggregate, they don't originate data.** HR Analytics /
  reporting screens read from the same records other modules write —
  reinforcing a single source of truth rather than per-module mock data.

Sources: [Fidson HR & Admin careers page](https://fidson.com/careers/hr/) ·
[Fidson company profile — Devex](https://www.devex.com/organizations/fidson-healthcare-plc-195534) ·
[Fidson — AfricanFinancials](https://africanfinancials.com/company/ng-fidson/) ·
[HiBob — HR dashboard examples & best practices](https://www.hibob.com/blog/hr-dashboard-examples/) ·
[PeopleBox — Complete guide to HR dashboards](https://www.peoplebox.ai/blog/hr-dashboard/) ·
[The MindLinks — SAP SuccessFactors navigation basics](https://www.themindlinks.com/sap-successfactors-navigation-provisioning-basics/)

---

## 3. Naming & branding assumption (flag this if wrong)

I'm modeling org structure, units, departments, and process realism on the
real Fidson, but I will **not** brand the actual product "Fidson" or use
Fidson's logo/trademark — I don't have your confirmation that's wanted, and
publishing something that visually impersonates a real public company isn't
something I'll do by default.

**Working name: `Fortunebolt Pharmaceuticals Plc`** — a fictional Nigerian
pharma manufacturer, same shape as Fidson (manufacturing, Lagos HQ, NGX-style
plc, ~700 staff, five-unit HR & Admin department), named after this repo. All
mock data (employees, departments, letterheads, email domain
`@fortunebolt-pharma.com`) will use this fictional company.

If you actually want this explicitly Fidson-branded (internal tool, pitch
deck, portfolio piece naming Fidson directly), tell me and I'll rebrand —
it's a find-and-replace at this stage, expensive to redo after 40 pages
exist.

---

## 4. Scope: what's in the source document

Full inventory extracted from the doc, by unit. "Depth" is my read of how
much interactive behavior each needs to feel real (not a promise every
sub-bullet becomes its own screen).

### 4.1 Learning & Development Unit

| # | Module | Depth |
|---|---|---|
| 1 | Performance Management / Performance Improvement Plan (PIP) | High — appraisal templates (IPI/KPI/PIP), weighted scoring, workflow, dashboard, history, PIP auto-trigger <70% |
| 2 | Talent Management | Medium — career management form, career-progression tracker, evaluation/feedback forms |
| 3 | Training Needs Analysis (TNA) & Training Plan | Medium — TNA form, HOD accept/reject, justification, promotion to Training Plan |
| 4 | LMS | High — course catalog, enrollment, SCORM-style course shell, leaderboard/gamification, learning paths, e-library, quiz |
| 5 | Correspondence | Low — training memo templates, reminders |
| 6 | Evaluation (pre-evaluation, training evaluation, post-learning evaluation, course/presentation feedback) | Medium — 4 linked online forms tied to a training record's lifecycle |
| 7 | Reporting (L&D) | Medium — external/internal/departmental/pre-post training reports |
| 8 | Curriculum Design & Training Schedules | Low — schedule builder |
| 9 | Budgeting | Low — training budget usage (daily/monthly/yearly) |

### 4.2 HRBP Unit

| # | Module | Depth |
|---|---|---|
| 1 | Recruitment & Selection | **Highest** — requisition → approval → JD → careers page → application → candidate profile → screening → shortlist → test → interview → feedback → medical → docs/guarantor → offer/e-sign → onboarding checklist → certificate of resumption → convert to employee → payroll handoff → welcome email. This is the flagship module. |
| 2 | Employee Relations / Self-Service | High — ESS portal (profile, docs, leave), Staff Welfare requests, Employee Opinion Survey |
| 3 | Disciplinary Management | High — query/suspension/warning templates, workflow, counter-recommendation, employee record linkage, payroll deduction flag |
| 4 | Organizational Structure | Medium — org chart / headcount view |
| 5 | Exit Management | High — resignation upload, clearance, exit questionnaire, handover, asset checklist, final settlement |
| 6 | Performance Management (Interim / Pre-confirmation / Acting-confirmation appraisals) | High — separate lifecycle triggers (3mo interim, 9mo confirmation, acting-role confirmation) distinct from module 4.1-1 |
| 7 | Guarantor Verification Report | Low |
| 8 | Reporting (HRBP) | Medium |
| 9 | HR Analytics | High — cross-module dashboard: turnover, absenteeism, retention drivers, hiring funnel, training effectiveness, D&I metrics |

### 4.3 Health & Wellness Unit (Clinic)

| # | Module | Depth |
|---|---|---|
| 1 | Medical Bills | Medium — upload, multi-level approval, payment/outstanding tracking |
| 2 | Vaccinations | Low — schedule + reminders |
| 3 | Medical Records | Medium — per-staff master health file, linked documents, incident reporting to MRB/HHR/FM/OD/SMD |
| 4 | Drug Requisition | Medium — online requisition, approval, procurement notification |
| 5 | Sick Leave / Excuse Duty | Medium — application + medical report attach + approval, links to employee profile |
| 6 | Reporting (Health) | Low |

### 4.4 Explicitly noted access restrictions (from the doc)

- Recruitment module: restricted to authorized personnel only.
- Exit Management: parts restricted to a select few.
- Clinic/medical data: nurse-only access at the point of care.

These become the seed of the **role/permission model** in §6.5, even though
full role-switching ships in Phase 2.

---

## 5. POV sequencing

**Phase 1 — HR Admin POV (this build).** The HR Admin sees and can operate
every module above: create/approve/reject records, run every workflow to
completion, view every dashboard. This is the "God view" — it exists so we
can pressure-test that every module and every cross-module handoff actually
works before we start carving out restricted views.

**Phase 2 — other POVs (after your review), reusing the same data:**

| POV | Sees |
|---|---|
| Employee (ESS) | Own profile, payslip stub, leave, welfare requests, survey participation, own appraisals/training history, disciplinary records (own), exit initiation |
| Line Manager / HOD | Team roster, requisition initiation, TNA accept/reject, appraisal input for direct reports, leave approval, disciplinary initiation |
| HRBP Officer | Recruitment pipeline, employee relations, disciplinary, exit, guarantor verification — scoped to their assigned department(s) |
| L&D Specialist (HHR) | Performance/PIP admin, talent management, TNA justification, LMS admin, evaluation, curriculum, budget |
| Clinic Nurse | Medical bills, vaccinations, medical records, drug requisition, sick leave — nothing outside Health & Wellness |
| Finance Approver | Welfare payment approval, medical bill payment, final settlement approval (notification-only touchpoints, not a full module) |
| Recruiter / Hiring Manager | Their own open requisitions, candidate pipeline for their roles |

I won't build these screens yet — flagging them now so the Phase 1 data
model already has the fields (owner, department, approver chain) Phase 2
will need, instead of retrofitting.

---

## 6. How the system stays "connected" without a backend

### 6.1 Architecture

Plain **multi-page HTML/CSS/JS**, no build step, no framework — consistent
with what's already in this repo, and it means you can open any page
directly in a browser with zero setup. "Connectedness" comes from a shared
client-side data layer every page loads, not from a server:

```
/design.md                     ← this file
/assets/
  css/tokens.css                ← design tokens (color, type, spacing) — light/dark
  css/shell.css                 ← app shell (topbar, sidebar, cards, tables, forms, badges, kanban, modals)
  js/db.seed.js                 ← seed dataset (Fortunebolt Pharma org: depts, employees, cadres...)
  js/store.js                   ← localStorage-backed "database": CRUD + query + relational lookups
  js/events.js                  ← pub/sub bus: modules publish domain events, other modules subscribe
  js/notifications.js           ← notification center (bell/inbox) simulating email/SMS
  js/auth.js                    ← mock session: current user/role, used for future POV gating
  js/shell.js                   ← injects topbar + sidebar nav + notification center into every page
  js/components.js              ← reusable render helpers: data table, kanban board, status badge, workflow tracker, modal, toast
/admin/
  dashboard.html
  hrbp/
    recruitment.html  employee-relations.html  disciplinary.html
    org-structure.html  exit-management.html  performance-confirmation.html
    guarantor-verification.html  reporting.html  hr-analytics.html
  ld/
    performance-pip.html  talent-management.html  tna.html  lms.html
    correspondence.html  evaluation.html  reporting.html
    curriculum-schedule.html  budgeting.html
  health/
    medical-bills.html  vaccinations.html  medical-records.html
    drug-requisition.html  sick-leave.html  reporting.html
```

Every `/admin/**/*.html` page is a thin shell: shared head/scripts +
a `<div id="page-root">` that page's own small inline script fills in by
reading/writing through `store.js`. Editing the sidebar or notification
center once updates all ~25 pages, since they all load `shell.js`.

### 6.2 Single source of truth = the connective tissue

One JSON-shaped dataset in `store.js`, persisted to `localStorage` so state
survives a refresh, with entities such as:

`departments`, `employees`, `requisitions`, `candidates`, `interviews`,
`offers`, `onboardingTasks`, `appraisals` (typed: annual/PIP/interim/
confirmation/acting), `careerPlans`, `trainingNeeds`, `trainingPlans`,
`courses`, `enrollments`, `evaluations`, `disciplinaryCases`, `exitCases`,
`welfareRequests`, `surveys`, `medicalRecords`, `medicalBills`,
`vaccinationSchedules`, `drugRequisitions`, `sickLeaveRequests`,
`notifications`, `auditLog`.

Every record carries `employeeId` / `departmentId` / `requisitionId`-style
foreign keys, so a module never keeps its own private copy of "the
employee" — it looks the employee up.

### 6.3 Concrete cross-module handoffs I will implement and test

These are the specific "modules should communicate" behaviors from your
brief, translated into testable flows:

1. **Requisition → Candidate → Offer → Onboarding → Employee record.**
   Accepting an offer auto-creates the employee record (status
   `Onboarding`) and an onboarding checklist; completing the checklist +
   certificate of resumption flips status to `Active` and fires a
   company-wide welcome notification.
2. **Performance appraisal <70% → PIP auto-generated**, visible on the L&D
   dashboard, and a notification is sent to L&D per the doc's requirement.
3. **Interim/confirmation appraisal outcome → employee record.** Confirming
   staff updates their employment status; placing on PIP cross-links to
   module 1 and notifies L&D, exactly as specified.
4. **TNA approved by HOD → Training Plan → LMS enrollment → Evaluation
   chain (pre → training → post, at the doc's 3-month mark) → Reporting.**
   One training need flows through every L&D module as a single record.
5. **Disciplinary case → employee profile** (sanction history) **→ payroll
   deduction flag** (surfaced as a flag/badge, since there's no real
   payroll system to post to).
6. **Exit Management → org structure headcount, active-employee list,
   payroll final-settlement flag, asset-return checklist.** An exit case
   moves an employee out of every "active" view across the system.
7. **Sick leave with medical report → Clinic medical record → HRBP leave
   record**, so a leave taken for health reasons is visible (with
   appropriate access framing) in both units.
8. **Welfare request → Finance approval notification → HRBP payment
   notification**, modeling the doc's multi-party notification chain even
   though there's no real Finance module.
9. **HR Analytics reads only** from the above — turnover, absenteeism,
   hiring-funnel, training-effectiveness, D&I widgets are computed live
   from the same store, so the dashboard numbers move when you act
   elsewhere in the system. This is the strongest proof point that it's one
   system, not 25 static pages.

### 6.4 Honest gaps

Two things in the real Fidson org chart (Rewards & Benefits, Admin/
Facilities units) aren't in your source document, so Phase 1 will show them
in the unit switcher as **visibly out-of-scope** (e.g., disabled nav item,
tooltip "not in current requirements") rather than silently omitted or
half-built. Two doc line items have no described fields at all
(`Guarantor Verification Report`, `Reporting` under HRBP §7–8, `Organizational
structure`) — I'll build a reasonable minimum-viable version of each rather
than skip them, and call that out explicitly when Phase 1 is reviewed.

### 6.5 Role model (data-model only in Phase 1)

Every user record gets a `role` and `department`. Phase 1 ships with a role
switcher restricted to **HR Admin** (sees everything, all approvals
auto-available to them) so we can UAT the full system; the enum already
includes the Phase-2 roles from §5 so adding real gating later is
config, not re-architecture.

---

## 7. Visual direction

- **Layout:** fixed left sidebar grouped by unit (L&D / HRBP / Health &
  Wellness) + collapsible module list, top bar with global search,
  notification bell, and user/role switcher.
- **Palette:** professional healthcare/pharma feel — deep teal/blue primary,
  a warm accent for alerts/PIP/disciplinary states, semantic status colors
  for workflow badges (Draft/grey, Pending/amber, Approved/green,
  Rejected/red, Escalated/orange). Full token set with light/dark support
  goes in `assets/css/tokens.css`.
- **Core components (built once, reused everywhere):** data table with
  filter/search, kanban board (for pipelines: recruitment stages,
  disciplinary stages, exit stages), workflow/stepper tracker, status
  badge, record detail drawer/modal, notification toast + inbox panel,
  stat/KPI card, simple bar/line chart (inline SVG, no chart library
  dependency).
- **Mock data realism:** Nigerian names, Naira (₦) figures, Fortunebolt
  Pharmaceuticals departments (Manufacturing, QA/QC, R&D, Sales &
  Marketing, Business Development, Supply Chain, Finance, IT, Regulatory
  Affairs, HR & Admin) and cadre/grade levels typical of a pharma
  manufacturer (Officer → Senior Officer → Assistant Manager → Manager →
  Senior Manager → Head of Department → Executive).

---

## 8. Build plan & milestones

1. **Foundation** — folder structure, design tokens, app shell (sidebar/
   topbar/notifications), seed dataset, store/event bus, admin dashboard
   landing page with live KPI cards.
2. **HRBP Unit** — Recruitment & Selection (flagship, full pipeline),
   Employee Relations/Self-Service (admin side), Disciplinary Management,
   Exit Management, Org Structure, Performance (interim/confirmation),
   Guarantor Verification, HRBP Reporting.
3. **L&D Unit** — Performance/PIP, Talent Management, TNA, LMS, Evaluation
   chain, Correspondence, Curriculum & Schedules, Budgeting, L&D Reporting.
4. **Health & Wellness Unit** — Medical Bills, Vaccinations, Medical
   Records, Drug Requisition, Sick Leave, Health Reporting.
5. **HR Analytics** — cross-module dashboard, built last on purpose so
   every feeding module already exists.
6. **UAT / exploratory pass** — scripted UAT checklist per module +
   exploratory testing of the cross-module flows in §6.3 (click every nav
   item, run each workflow to completion, verify the downstream module
   updates, check empty states, check refresh-persistence via
   localStorage, basic responsive check). I'll fix what I find and give you
   a short test report, not just a "looks done."
7. **Your review** → agreed changes → **Phase 2**: additional POVs.

---

## 9. Open questions

1. **Branding:** OK with the fictional "Fortunebolt Pharmaceuticals Plc"
   framing (§3), or do you want this explicitly Fidson-branded?
2. **Hosting/usage:** should this stay a static site you open locally /
   host on something like GitHub Pages, or do you want it structured for a
   later real backend (i.e., should I keep the data layer swap-friendly
   toward a real API, even though nothing calls one now)? My default plan
   already keeps `store.js` as an isolated data-access layer for exactly
   this reason — flag if you want that emphasized differently.
3. Anything in §4/§6.4 (scope table, the two out-of-scope units, the two
   thin doc line items) you want handled differently before I start?

Reply with corrections, or just say "go" and I'll start Phase 1, Step 1
(Foundation) from §8.
