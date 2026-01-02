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
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-shell"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-close-row">
          <button onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </div>
        {modal}
      </div>
    </div>
  );
}
