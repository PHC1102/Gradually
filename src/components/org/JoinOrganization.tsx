import React, { useState } from 'react';
import { joinOrganization, getMyOrganizations } from '../../services/organizationService';
import { useOrganizationStore } from '../../store/organizationStore';
import type { OrgState } from '../../store/organizationStore';

/**
 * JoinOrganization component
 * - Card-based UI with expandable input field
 * - Calls joinOrganization(orgId) and sets selectedOrgId on success
 */
export const JoinOrganization: React.FC = () => {
  const [orgId, setOrgId] = useState('');
  const [busy, setBusy] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const setSelectedOrgId = useOrganizationStore((s: OrgState) => s.setSelectedOrgId);
  const setCurrentRole = useOrganizationStore((s: OrgState) => s.setCurrentRole);
  const setOrganizations = useOrganizationStore((s: OrgState) => s.setOrganizations);

  const onJoin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = orgId.trim();
    if (!id) return;
    setBusy(true);
    try {
      await joinOrganization(id);
      
      // Refresh organizations list to include the newly joined org
      const orgs = await getMyOrganizations();
      setOrganizations(orgs);
      
      setSelectedOrgId(id);
      setCurrentRole('member');
    } catch (err) {
      console.error('Failed to join organization', err);
      alert(`Failed to join organization: ${(err as any)?.message || err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#2a2a2a',
      borderRadius: '8px',
      padding: '1.5rem',
      cursor: 'pointer',
      border: '1px solid #3a3a3a',
      transition: 'all 0.2s'
    }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: isExpanded ? '1rem' : '0' }}
      >
        {/* Magnifying Glass Icon */}
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
              d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        {/* Title */}
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            color: '#fff',
            margin: 0
          }}>
            Join an existing organization
          </h3>
        </div>
      </div>

      {/* Expandable input field */}
      {isExpanded && (
        <form onSubmit={onJoin} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #3a3a3a' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            color: '#ccc'
          }}>
            Organization ID
          </label>
          <input
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              marginBottom: '1rem', 
              border: '1px solid #4a4a4a', 
              borderRadius: '4px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              fontSize: '1rem'
            }}
            placeholder="Enter organization ID"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <button
            type="submit"
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#16a34a', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: busy ? 'not-allowed' : 'pointer', 
              opacity: busy ? 0.6 : 1,
              fontSize: '1rem',
              fontWeight: '500'
            }}
            disabled={busy}
          >
            {busy ? 'Joining…' : 'Join'}
          </button>
        </form>
      )}
    </div>
  );
};

export default JoinOrganization;
