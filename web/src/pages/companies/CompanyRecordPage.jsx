import React from 'react';
import { useParams } from 'react-router-dom';

import RecordPageLayout from '../../layouts/RecordPageLayout.jsx';
import SidePanelLayout from '../../layouts/SidePanelLayout.jsx';
import EmptyState from '../../components/EmptyState.jsx';

import { useSession } from '../../state/session.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getCompany } from '../../api/crm.js';

export default function CompanyRecordPage({ subNav }) {
  const { companyId } = useParams();
  const { workspaceId } = useSession();

  const state = useAsync(() => getCompany(workspaceId, companyId), [workspaceId, companyId]);

  const title = state.status === 'success' ? state.data.name : 'Company';

  const main = (
    <EmptyState
      title="No timeline"
      description="Company history emits to Contact Activities; view via a Contact record."
    />
  );

  const side = (
    <SidePanelLayout title="Record">
      {state.status === 'loading' || state.status === 'idle' ? <div>Loading…</div> : null}
      {state.status === 'error' ? <EmptyState title="Failed to load company" description={state.error.message} /> : null}
      {state.status === 'success' ? (
        <dl style={{ margin: 0, display: 'grid', gap: 6 }}>
          <div>
            <dt style={{ fontSize: 12 }}>Domain</dt>
            <dd style={{ margin: 0 }}>{state.data.domain ?? ''}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12 }}>Industry</dt>
            <dd style={{ margin: 0 }}>{state.data.industry ?? ''}</dd>
          </div>
          <div>
            <dt style={{ fontSize: 12 }}>Created</dt>
            <dd style={{ margin: 0 }}>{new Date(state.data.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      ) : null}
    </SidePanelLayout>
  );

  return <RecordPageLayout title={title} subNav={subNav} main={main} side={side} />;
}
