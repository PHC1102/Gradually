import React, { useState } from 'react';
import { createOrganization, getMyOrganizations } from '../../services/organizationService';
import { useOrganizationStore } from '../../store/organizationStore';
import type { OrgState } from '../../store/organizationStore';

/**
 * CreateOrganizationForm component
 * - Card-based UI with expandable input field
 * - Calls createOrganization() and sets selectedOrgId on success
 */
export const CreateOrganizationForm: React.FC = () => {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const setSelectedOrgId = useOrganizationStore((s: OrgState) => s.setSelectedOrgId);
  const setCurrentRole = useOrganizationStore((s: OrgState) => s.setCurrentRole);
  const setOrganizations = useOrganizationStore((s: OrgState) => s.setOrganizations);

  const onCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const orgId = await createOrganization(name.trim());
      
      // Retry logic: try to find the org in the list with exponential backoff
      let orgs: any[] = [];
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, attempts))); // 300ms, 600ms, 1200ms, 2400ms, 4800ms
        orgs = await getMyOrganizations();
        
        if (orgs.some(org => org.id === orgId)) {
          // Found it!
          break;
        }
        
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts}: Organization not found yet, retrying...`);
      }
      
      // Final check
      if (!orgs.some(org => org.id === orgId)) {
        // If still not found, just proceed anyway - the validation in App.tsx will handle it
        console.warn('Organization created but not immediately found in list. Proceeding anyway...');
      }
      
      setOrganizations(orgs);
      
      // Set as selected and set role
      setSelectedOrgId(orgId);
      setCurrentRole('owner');
    } catch (err) {
      console.error('Failed to create organization', err);
      alert(`Failed to create organization: ${(err as any)?.message || err}`);
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
        {/* People/Group Icon */}
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: '#2563eb',
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
              d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" 
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
            Create new organization
          </h3>
        </div>
      </div>

      {/* Expandable input field */}
      {isExpanded && (
        <form onSubmit={onCreate} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #3a3a3a' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.875rem', 
            fontWeight: '500',
            color: '#ccc'
          }}>
            Organization name
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
            placeholder="Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            autoFocus
          />
          <button
            type="submit"
            style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#2563eb', 
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
            {busy ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}
    </div>
  );
};

export default CreateOrganizationForm;
