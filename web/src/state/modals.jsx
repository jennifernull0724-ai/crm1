import React, { createContext, useContext, useMemo, useState } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  const api = useMemo(() => {
    return {
      open(node) {
        setModal(() => node);
      },
      close() {
        setModal(null);
      },
      modal
    };
  }, [modal]);

  return <ModalContext.Provider value={api}>{children}</ModalContext.Provider>;
}

export function useModals() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('ModalProvider missing');
  return ctx;
}

export function ModalRoot({ modal, onClose }) {
  if (!modal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        zIndex: 60
      }}
      onClick={onClose}
    >
      <div
        style={{
          border: '1px solid currentColor',
          padding: 16,
          borderRadius: 10,
          maxWidth: 720,
          width: 'min(720px, calc(100vw - 24px))'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </div>
        {modal}
      </div>
    </div>
  );
}
