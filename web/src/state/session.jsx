import React, { createContext, useContext, useMemo, useState } from 'react';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [actorUserId, setActorUserId] = useState('');

  const value = useMemo(() => {
    return { workspaceId, setWorkspaceId, actorUserId, setActorUserId };
  }, [workspaceId, actorUserId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('SessionProvider missing');
  return ctx;
}
