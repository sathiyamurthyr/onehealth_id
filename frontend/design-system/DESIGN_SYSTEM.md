# OneHealth OS (OH-ID) — Unified Healthcare Design System (OHDS)

> **CRITICAL ARCHITECTURAL DIRECTIVE & SINGLE SOURCE OF TRUTH**  
> This design system is the **single source of truth** across the entire OneHealth OS application. Every page, component, and workflow must consume the existing design tokens and components defined here. **Do not introduce new colors, arbitrary spacing values, unapproved typography sizes, mismatched icons, or inconsistent animation patterns without first verifying against this design system.**

---

## 1. Design Reference Stack

Our visual language is modeled on modern enterprise healthcare benchmarks inspired by leading clinical UI patterns (Mobbin, Dribbble, Awwwards, and Godly):

| Layer | Technology / Source | Purpose |
| :--- | :--- | :--- |
| **Component Primitives** | **shadcn/ui & Radix UI** | Accessible, keyboard-navigable UI components |
| **Iconography** | **Lucide Icons** | Clean, medical and UI stroke icons (2px stroke width) |
| **Styling & Tokens** | **Tailwind CSS** | Strictly centralized design tokens (colors, spacing, typography) |
| **Motion & Micro-interactions** | **CSS Keyframes & Spring Curves** | Clinically safe pulse, scanline, and state transitions |
| **Framework** | **Next.js & TypeScript** | Production-ready, type-safe, SSR & client-optimized components |

---

## 2. Directory Architecture (`/design-system`)

The design system is structured into 10 modular token domains:

```text
frontend/design-system/
├── colors.ts            # Primary, clinical semantic, status, and role theme tokens
├── typography.ts        # Font scales, weights, line heights, and text utilities
├── spacing.ts           # 4px geometric scale, component padding, and touch presets
├── radius.ts            # Geometric curve tokens (rounded-xl, rounded-3xl)
├── shadows.ts           # Elevation hierarchy and colored diagnostic glows
├── icons.ts             # Canonical Lucide icon mapping and size standards
├── animations.ts        # Micro-interactions, scanbeams, pulse alerts, and easings
├── components.ts        # Standardized classes for Buttons, Inputs, Cards, Tables, Modals
├── layouts.ts           # Application shells, split-pane consultation, 8K grid
├── responsive-rules.ts  # Breakpoints, fluid scaling (Mobile to 8K), zero-scroll rules
├── index.ts             # Unified barrel export entry point
└── DESIGN_SYSTEM.md     # Governance documentation and scope reference guidelines
```

---

## 3. Four Core Application Scopes

Every screen in OneHealth OS strictly aligns with one of four application scopes:

### A. Public Scope
* **Key Surfaces**: Landing Page, About, Services, Pricing, Contact, Login, Registration.
* **Aesthetic**: Pure white background (`#ffffff`), subtle ambient diagnostic glows, high-contrast slate text (`text-slate-900`), and zero-scroll viewports for authentication.
* **Identity Rule**: Single unified login portal with automatic backend role detection. Never ask the user which hospital or branch they belong to before login.

### B. Patient Scope (Citizen Portal)
* **Key Surfaces**: Patient Dashboard, Appointments, Prescriptions, Medical Records, Lab Reports, Bills & Payments, Doctors, Hospitals, Profile.
* **Ergonomics**: Mobile-first touch ergonomics (`min-h-[44px]`).
* **Visual Anchor**: Digital OneHealth ID card with high-resolution QR token, verified demographics pill, and one-tap OPD check-in.

### C. Doctor / Clinician Scope
* **Key Surfaces**: Doctor Dashboard, Active OPD Queue, Patient History, Consultation Room, Prescription Builder, Follow-up Scheduler, Diagnostic Reports, Referral.
* **Visual Anchor**: Split-pane Consultation Room:
  - **Left Pane (40%)**: Patient Demographics Banner, Live Vitals Grid, Historical Clinical Timeline.
  - **Right Pane (60%)**: Diagnosis, Rx Drug Builder, Lab Test Orders, Digital Signature, Issue & Token Confirmation.
* **Identity Rule**: Strictly scoped to the logged-in doctor's personal identity. Other doctors are never mixed into the personal consultation dashboard.

### D. Hospital Admin Scope
* **Key Surfaces**: Hospital Executive Dashboard, Doctor Roster, Nursing Staff, Patient Master Index, Departments, Appointments Roster, Billing & Invoices, Reports, RBAC, Audit Logs.
* **Visual Anchor**: Multi-hospital / multi-branch facility switcher, live census and OPD/IPD KPI metric widgets, role assignment matrix, and immutable audit logs.

---

## 4. Design Token Reference Cheat Sheet

### Colors & Triage
```typescript
import { COLORS, ROLE_THEMES, CLINICAL_PRIORITY_THEMES, CLINICAL_STATUS_THEMES } from "@/design-system";

// Priority Triage Colors
CLINICAL_PRIORITY_THEMES.EMERGENCY  // Red-50 / Red-700 (Fast-Track)
CLINICAL_PRIORITY_THEMES.URGENT     // Amber-50 / Amber-700 (Urgent)
CLINICAL_PRIORITY_THEMES.NORMAL     // Blue-50 / Blue-700 (Routine)

// Role Context Themes
ROLE_THEMES.DOCTOR        // Emerald (Clinician)
ROLE_THEMES.NURSE_STAFF   // Blue (Triage & Front Desk)
ROLE_THEMES.HOSPITAL_ADMIN// Sky (Operations)
ROLE_THEMES.SUPER_ADMIN   // Indigo (Governance)
ROLE_THEMES.PATIENT       // Purple (Citizen)
```

### Typography Scale
```typescript
import { TYPOGRAPHY } from "@/design-system";

TYPOGRAPHY.scale.display    // 40px/48px — Hero banners
TYPOGRAPHY.scale.h1         // 30px/36px — Page titles
TYPOGRAPHY.scale.h2         // 24px/32px — Section headers
TYPOGRAPHY.scale.h3         // 20px/28px — Card headers
TYPOGRAPHY.scale.body       // 14px/20px — Standard content
TYPOGRAPHY.scale.bodySmall  // 12px/16px — Table data & metadata
TYPOGRAPHY.scale.identifier // Monospace badge for OneHealth ID
```

### Spacing & Touch Ergonomics
```typescript
import { SPACING } from "@/design-system";

SPACING.component.button.touch  // min-h-[44px] min-w-[44px] (Touch safe)
SPACING.component.card.standard // p-4 sm:p-6
SPACING.component.modal.body    // p-5 sm:p-6 space-y-4
```

### Corner Radius Standards
```typescript
import { RADIUS } from "@/design-system";

RADIUS.component.button        // rounded-xl (12px)
RADIUS.component.input         // rounded-xl (12px)
RADIUS.component.cardStandard  // rounded-3xl (24px)
RADIUS.component.badge         // rounded-full (Pill)
```

### Elevation & Shadows
```typescript
import { SHADOWS } from "@/design-system";

SHADOWS.component.card         // shadow-sm hover:shadow-md
SHADOWS.component.modal        // shadow-2xl
SHADOWS.glow.blue              // shadow-lg shadow-blue-500/20
SHADOWS.glow.emerald           // shadow-lg shadow-emerald-500/20
```

---

## 5. Developer & Antigravity Implementation Rules

1. **No Ad-Hoc Colors**: Never use raw hex codes (e.g. `#123456`) or arbitrary utility colors in page templates. Always use the semantic tokens or predefined palette classes.
2. **Standardized Card Wrappers**: Every content container must use `bg-white border border-slate-200 rounded-3xl shadow-sm`.
3. **Responsive Table Paradigm**: All data tables must render as clean responsive tables on `>= 1024px` and stacked touch cards on `< 1024px`.
4. **Touch Target Enforcement**: Interactive elements must maintain at least `44px` touch height (`min-h-[44px]`) on mobile surfaces.
5. **No Window Scrollbars on Dialogs/Modals**: Modals must be capped at `max-h-[90vh]` with inner content scrolling (`overflow-y-auto`) to preserve clean window viewports.
