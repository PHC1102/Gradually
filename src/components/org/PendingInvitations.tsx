import React, { useEffect, useState } from 'react';
import { 
  getMyPendingInvitations, 
  acceptInvitation, 
  getMyOrganizations,
  type OrganizationInvitation 
} from '../../services/organizationService';
import { useOrganizationStore } from '../../store/organizationStore';
import type { OrgState } from '../../store/organizationStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const PendingInvitations: React.FC = () => {
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const setSelectedOrgId = useOrganizationStore((s: OrgState) => s.setSelectedOrgId);
  const setCurrentRole = useOrganizationStore((s: OrgState) => s.setCurrentRole);
  const setOrganizations = useOrganizationStore((s: OrgState) => s.setOrganizations);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const pending = await getMyPendingInvitations();
      setInvitations(pending);
      
      // Fetch org names for display
      const names: Record<string, string> = {};
      for (const inv of pending) {
        if (!names[inv.orgId]) {
          try {
            const orgDoc = await getDoc(doc(db, 'organizations', inv.orgId));
            if (orgDoc.exists()) {
              names[inv.orgId] = orgDoc.data()?.name || 'Unknown Organization';
            } else {
              names[inv.orgId] = 'Unknown Organization';
            }
          } catch {
            names[inv.orgId] = 'Unknown Organization';
          }
        }
      }
      setOrgNames(names);
    } catch (err) {
      console.error('Failed to load invitations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleAccept = async (invitationId: string, orgId: string) => {
    setProcessing(invitationId);
    try {
      await acceptInvitation(invitationId);
      
      // Refresh organizations list
      const orgs = await getMyOrganizations();
      setOrganizations(orgs);
      
      // Switch to the newly joined org
      setSelectedOrgId(orgId);
      setCurrentRole('member');
    } catch (err) {
      console.error('Failed to accept invitation', err);
      alert(`Failed to accept invitation: ${(err as Error).message}`);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        padding: '1.5rem',
        border: '1px solid #3a3a3a',
      }}>
        <p style={{ color: '#9ca3af', margin: 0 }}>Loading invitations...</p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show anything if no invitations
  }

  return (
    <div style={{
      backgroundColor: '#2a2a2a',
      borderRadius: '8px',
      padding: '1.5rem',
      border: '1px solid #16a34a',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: '#16a34a',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: '#fff' }}
          >
            <path 
              d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            color: '#fff',
            margin: 0
          }}>
            Pending Invitations ({invitations.length})
          </h3>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {invitations.map(inv => (
          <div 
            key={inv.id}
            style={{
              backgroundColor: '#1a1a1a',
              borderRadius: '6px',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #3a3a3a',
            }}
          >
            <div>
              <div style={{ color: '#fff', fontWeight: '600', marginBottom: '0.25rem' }}>
                {orgNames[inv.orgId] || 'Loading...'}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                Invited by {inv.invitedByEmail}
              </div>
            </div>
            <button
              onClick={() => handleAccept(inv.id, inv.orgId)}
              disabled={processing === inv.id}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: processing === inv.id ? '#6b7280' : '#16a34a',
                color: '#fff',
                cursor: processing === inv.id ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}
            >
              {processing === inv.id ? 'Accepting...' : 'Accept'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingInvitations;

