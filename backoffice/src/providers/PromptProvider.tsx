import React, { createContext, useContext, useMemo, useState } from "react";

type PromptOptions = {
  title: string;
  message?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  defaultValue?: string;
};

type PromptContextValue = {
  prompt: (opts: PromptOptions) => Promise<string | null>;
};

const PromptContext = createContext<PromptContextValue | null>(null);

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("usePrompt must be used within PromptProvider");
  return ctx;
}

type PendingPrompt = {
  opts: PromptOptions;
  resolve: (v: string | null) => void;
};

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [value, setValue] = useState("");

  const api = useMemo<PromptContextValue>(
    () => ({
      prompt: (opts) =>
        new Promise<string | null>((resolve) => {
          setValue(opts.defaultValue ?? "");
          setPending({ opts, resolve });
        }),
    }),
    []
  );

  const close = () => {
    if (!pending) return;
    pending.resolve(null);
    setPending(null);
    setValue("");
  };

  const confirm = () => {
    if (!pending) return;
    const required = pending.opts.required === true;
    const trimmed = value.trim();

    if (required && !trimmed) return; // keep modal open
    pending.resolve(trimmed || "");
    setPending(null);
    setValue("");
  };

  return (
    <PromptContext.Provider value={api}>
      {children}

      {pending ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="card modalCard">
            <div className="cardBody">
              <div className="modalTitle">{pending.opts.title}</div>

              {pending.opts.message ? (
                <div className="muted modalMessage">{pending.opts.message}</div>
              ) : null}

              <textarea
                className={`input textarea ${pending.opts.required ? "" : ""}`}
                placeholder={pending.opts.placeholder || ""}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />

              {pending.opts.required && !value.trim() ? (
                <div className="error mt12">Reason is required.</div>
              ) : null}

              <div className="modalActions">
                <button className="btn" onClick={close}>
                  {pending.opts.cancelText || "Cancel"}
                </button>
                <button className="btn btnPrimary" onClick={confirm}>
                  {pending.opts.confirmText || "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PromptContext.Provider>
  );
}