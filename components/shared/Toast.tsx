"use client";

import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  description?: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────────

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────────

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${++nextId}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Above mobile bottom nav on small screens; normal corner on lg+ */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)] left-4 right-4 z-[45] flex flex-col items-center gap-2 lg:bottom-4 sm:left-auto sm:right-6 sm:items-end lg:z-50">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Toast item ─────────────────────────────────────────────────────────────────

const typeStyles: Record<
  Toast["type"],
  { bg: string; border: string; icon: string }
> = {
  info: { bg: "bg-[#E6EFE9]", border: "border-[#0F5132]/20", icon: "ℹ" },
  success: { bg: "bg-[#E6EFE9]", border: "border-[#22B07D]/30", icon: "✓" },
  warning: { bg: "bg-[#FDF3D8]", border: "border-[#D8A72A]/30", icon: "⚠" },
  error: { bg: "bg-[#FDE8E8]", border: "border-[#B3261E]/20", icon: "✕" },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const style = typeStyles[toast.type];

  return (
    <div
      className={`flex max-w-sm items-start gap-3 rounded-xl border ${style.border} ${style.bg} px-4 py-3 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200`}
      role="alert"
    >
      <span className="mt-0.5 text-[16px] leading-none">{style.icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-[#14231B]">
          {toast.title}
        </span>
        {toast.description && (
          <span className="text-[13px] leading-[1.7] text-[#4C5A52]">
            {toast.description}
          </span>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="mt-0.5 text-[14px] text-[#8A9690] hover:text-[#4C5A52]"
      >
        ✕
      </button>
    </div>
  );
}
