/**
 * OneHealth OS (OH-ID) Design System — Layout Standards
 * Single Source of Truth for application shells, sidebar grids,
 * clinical split-panes, and section hierarchies.
 */

export const LAYOUTS = {
  // Global Shell Dimensions
  shell: {
    sidebarWidth: "w-64",           // 256px
    sidebarCollapsedWidth: "w-20",   // 80px
    headerHeight: "h-16",           // 64px
    maxContentWidth: "max-w-7xl mx-auto",
    wideContentWidth: "max-w-[1680px] mx-auto",
    containerPadding: "p-4 sm:p-6 lg:p-8",
  },

  // Role-Specific Screen Paradigms
  scopes: {
    /**
     * 1. Public Scope (Landing, Login, Register, Services)
     * - Clean pure white backdrop with subtle ambient glow
     * - Zero-scroll login architecture fitting viewport naturally
     * - Cinematic clinical hero with high-contrast typography
     */
    public: {
      bodyClass: "bg-white text-slate-900 min-h-screen",
      heroContainer: "max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-20",
      loginCard: "max-w-5xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden",
    },

    /**
     * 2. Patient Scope (Citizen Portal, Medical Records, Appointments, QR ID)
     * - Mobile-first ergonomics with touch targets >= 44px
     * - High-contrast OneHealth ID badge with instant QR sharing
     * - Intuitive card-based appointments, reports, and payments
     */
    patient: {
      container: "max-w-4xl mx-auto px-4 py-6 space-y-6",
      idCardWrapper: "bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white rounded-3xl p-6 shadow-xl",
      navClass: "fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden",
    },

    /**
     * 3. Doctor Scope (OPD Queue, Consultation Room, Rx Generator)
     * - Scoped strictly to logged-in doctor identity
     * - Split-pane Consultation Room:
     *   Left (40%): Patient Banner, Live Vitals Grid, Clinical Timeline
     *   Right (60%): Diagnosis, Rx Drug Builder, Lab Orders, Digital Sign & Issue
     * - High-efficiency keyboard shortcuts and instant patient switching
     */
    doctor: {
      splitPane: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",
      leftPane: "lg:col-span-5 space-y-5",
      rightPane: "lg:col-span-7 space-y-5",
      rxWorkflow: "bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-sm",
    },

    /**
     * 4. Hospital Admin Scope (Multi-Branch Operations, Doctors, RBAC, Billing)
     * - Multi-Hospital / Branch switcher in header
     * - Operations dashboard with real-time OPD / IPD metric widgets
     * - Strict audit logging, role assignment matrix, and facility settings
     */
    hospitalAdmin: {
      container: "space-y-6 pb-12",
      metricsGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
      tableCard: "bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm",
    },
  },
} as const;
