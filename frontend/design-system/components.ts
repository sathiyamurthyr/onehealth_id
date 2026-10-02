/**
 * OneHealth OS (OH-ID) Design System — Component Standards & Class Tokens
 * Single Source of Truth for button styles, card styles, input styles,
 * tables, modals, and feedback states.
 */

export const COMPONENT_STYLES = {
  // Button Styles
  button: {
    base: "inline-flex items-center justify-center font-semibold transition-all duration-150 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]",
    sizes: {
      sm: "px-3 py-1.5 text-xs min-h-[36px] gap-1.5",
      md: "px-4 py-2 text-xs min-h-[40px] gap-2",
      lg: "px-5 py-2.5 text-sm min-h-[44px] gap-2.5",
      icon: "p-2 min-h-[36px] min-w-[36px] flex items-center justify-center",
      touch: "px-4 py-2.5 text-xs min-h-[44px] min-w-[44px] gap-2",
    },
    variants: {
      primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/25",
      secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200",
      outline: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300",
      ghost: "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900",
      danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20",
      success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20",
    },
  },

  // Input & Select Field Styles
  input: {
    base: "w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400 min-h-[42px] px-3.5 py-2",
    error: "border-rose-400 focus:ring-rose-500/20 focus:border-rose-600 bg-rose-50/40 text-rose-900",
    label: "block text-xs font-semibold text-slate-700 mb-1",
    helperText: "text-[11px] text-slate-500 mt-1",
    errorText: "text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1",
  },

  // Card Styles
  card: {
    base: "bg-white border border-slate-200 rounded-3xl shadow-sm transition-shadow",
    hoverable: "bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200",
    header: "p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between",
    body: "p-5 sm:p-6",
    footer: "p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex items-center justify-between",
  },

  // Table Styles
  table: {
    wrapper: "bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm",
    table: "w-full text-left text-xs",
    head: "bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold",
    headCell: "py-3.5 px-4 sm:px-6 text-[11px]",
    row: "border-b border-slate-100 hover:bg-blue-50/30 transition-colors",
    cell: "py-3.5 px-4 sm:px-6 text-slate-700",
    cellPrimary: "py-3.5 px-4 sm:px-6 font-semibold text-slate-900",
  },

  // Modal & Dialog Styles
  modal: {
    overlay: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn",
    container: "bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-4 relative",
    header: "flex items-center justify-between border-b border-slate-100 pb-3",
    title: "text-base font-bold text-slate-900 flex items-center gap-2",
    closeBtn: "text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors",
  },

  // Badge Styles
  badge: {
    base: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
    pill: "rounded-full",
    square: "rounded-lg",
  },
} as const;
