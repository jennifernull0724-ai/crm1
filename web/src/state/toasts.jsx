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
    <div style={{ position: 'fixed', right: 12, bottom: 12, display: 'grid', gap: 8, zIndex: 50 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            border: '1px solid currentColor',
            padding: 10,
            borderRadius: 8,
            minWidth: 240
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 13 }}>{t.message}</div>
            <button onClick={() => onDismiss(t.id)} aria-label="Dismiss toast">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
