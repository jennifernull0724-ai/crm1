import React, { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const api = useMemo(() => {
    return {
      toasts,
      push(message) {
        const id = crypto.randomUUID();
        setToasts((prev) => [...prev, { id, message }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
      },
      remove(id) {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }
    };
  }, [toasts]);

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('ToastProvider missing');
  return ctx;
}

export function ToastViewport({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  return (
    <div className="toast-viewport">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast"
        >
          <div className="toast-row">
            <div className="toast-message">{t.message}</div>
            <button onClick={() => onDismiss(t.id)} aria-label="Dismiss toast">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
