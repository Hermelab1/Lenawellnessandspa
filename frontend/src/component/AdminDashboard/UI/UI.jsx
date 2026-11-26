import React, { useCallback, useEffect, useState } from "react";

/* ==========================================================================
   Helpers
   ========================================================================== */
export const errMsg = (e) =>
  e?.response?.data?.message || e?.message || "Something went wrong";

export const toList = (d) => (Array.isArray(d) ? d : d?.items || d?.data || []);

export const useDebounce = (value, delay = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

/* ==========================================================================
   Style tokens
   ========================================================================== */
export const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:bg-stone-100";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 disabled:cursor-not-allowed disabled:opacity-50";

export const btn = {
  primary: `${btnBase} bg-emerald-800 text-white hover:bg-emerald-900`,
  secondary: `${btnBase} border border-stone-300 bg-white text-stone-800 hover:bg-stone-50`,
  danger: `${btnBase} bg-red-700 text-white hover:bg-red-800`,
  ghost: `${btnBase} px-2.5 py-1.5 text-stone-700 hover:bg-stone-100`,
  link: "rounded text-sm font-medium text-emerald-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline",
  linkDanger:
    "rounded text-sm font-medium text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/40 disabled:cursor-not-allowed disabled:opacity-50",
};

const STATUS_STYLES = {
  Active: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  Expired: "bg-stone-100 text-stone-700 ring-stone-500/20",
  Frozen: "bg-sky-50 text-sky-800 ring-sky-600/20",
  Inactive: "bg-stone-100 text-stone-600 ring-stone-500/20",
  "Not synced": "bg-amber-50 text-amber-800 ring-amber-600/20",
};

/* ==========================================================================
   Components
   ========================================================================== */
export const Badge = ({ label }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
      STATUS_STYLES[label] || STATUS_STYLES.Inactive
    }`}
  >
    {label}
  </span>
);

export const Spinner = ({ className = "h-4 w-4" }) => (
  <svg
    className={`animate-spin ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      className="opacity-25"
    />
    <path
      d="M4 12a8 8 0 018-8"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      className="opacity-75"
    />
  </svg>
);

export const Switch = ({ checked, onChange, disabled, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? "bg-emerald-700" : "bg-stone-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-[18px]" : "translate-x-0.5"
      }`}
    />
  </button>
);

export const Field = ({ label, error, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-stone-800">
      {label}
    </span>
    {children}
    {hint && !error && (
      <span className="mt-1 block text-xs text-stone-500">{hint}</span>
    )}
    {error && (
      <span className="mt-1 block text-xs text-red-700" role="alert">
        {error}
      </span>
    )}
  </label>
);

export const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  drawer = false,
  escape = true,
}) => {
  useEffect(() => {
    if (!escape) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, escape]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-40 flex bg-stone-900/40 ${
        drawer ? "justify-end" : "items-center justify-center p-4"
      }`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-full flex-col bg-white shadow-xl ${
          drawer ? "h-full w-full max-w-xl" : "w-full max-w-md rounded-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-stone-900">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-sm text-stone-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
    >
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm text-stone-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          className={btn.secondary}
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className={danger ? btn.danger : btn.primary}
          onClick={onConfirm}
          disabled={busy}
          autoFocus
        >
          {busy && <Spinner />}
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export const Toasts = ({ toasts, dismiss }) => (
  <div
    className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    aria-live="polite"
  >
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-start justify-between gap-3 rounded-md px-4 py-3 text-sm shadow-lg ${
          t.type === "error"
            ? "bg-red-700 text-white"
            : "bg-stone-900 text-white"
        }`}
      >
        <span>{t.message}</span>
        <button
          type="button"
          onClick={() => dismiss(t.id)}
          className="text-white/70 hover:text-white"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    ))}
  </div>
);

export const useToasts = () => {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback(
    (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );
  const push = useCallback(
    (message, type = "success") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );
  return { toasts, push, dismiss };
};