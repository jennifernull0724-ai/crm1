import React from 'react';
import { useParams } from 'react-router-dom';

import RecordPageLayout from '../../layouts/RecordPageLayout.jsx';
import SidePanelLayout from '../../layouts/SidePanelLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';

import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getDeal } from '../../api/crm.js';

export default function DealRecordPage({ subNav }) {
  const { dealId } = useParams();
  const { workspaceId, actorUserId } = useSession();

  const state = useAsync(
    () => getDeal(workspaceId, dealId, { actorUserId: actorUserId.trim() }),
    [workspaceId, dealId, actorUserId]
  );

  const title = state.status === 'success' ? state.data.name : 'Deal';

  const main = (
    <EmptyState
      title="No timeline"
      description="Deal history emits to Contact Activities; view via a Contact record."
    />
  );

  const side = (
    <SidePanelLayout title="Record">
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load deal" description={state.error.message} /> : null}
      {state.status === 'success' ? (
        <dl className="ui-kv">
          <div>
            <dt>Status</dt>
            <dd>{state.data.status}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{state.data.amount ?? ''} {state.data.currency ?? ''}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(state.data.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      ) : null}
    </SidePanelLayout>
  );

  return <RecordPageLayout title={title} subNav={subNav} main={main} side={side} />;
}
