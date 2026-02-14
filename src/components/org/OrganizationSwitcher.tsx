import React, { useEffect, useState } from 'react';
import { getMyOrganizations, switchOrganization } from '../../services/organizationService';
import type { Organization } from '../../services/organizationService';
import { useOrganizationStore } from '../../store/organizationStore';
import type { OrgState } from '../../store/organizationStore';

/**
 * OrganizationSwitcher component
 * - Loads organizations
 * - Allows selecting the active org (persists via store/localStorage)
 */
interface OrganizationSwitcherProps {
  onSwitch?: () => void;
}

const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({ onSwitch }) => {
  const organizations = useOrganizationStore((s: OrgState) => s.organizations);
  const selectedOrgId = useOrganizationStore((s: OrgState) => s.selectedOrgId);
  const setOrganizations = useOrganizationStore((s: OrgState) => s.setOrganizations);
  const setSelectedOrgId = useOrganizationStore((s: OrgState) => s.setSelectedOrgId);
  const setCurrentRole = useOrganizationStore((s: OrgState) => s.setCurrentRole);
  const setLoading = useOrganizationStore((s: OrgState) => s.setLoading);
  const loading = useOrganizationStore((s: OrgState) => s.loading);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const orgs = await getMyOrganizations();
        if (!mounted) return;
        setOrganizations(orgs);
      } catch (err) {
        console.error('Failed to load organizations', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [setOrganizations, setLoading]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'OR';
  };

  const getColorForOrg = (index: number) => {
    const colors = ['#ec4899', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'];
    return colors[index % colors.length];
  };

  const handleSwitch = async (orgId: string) => {
    try {
      setSwitchingId(orgId);
      const role = await switchOrganization(orgId);
      setSelectedOrgId(orgId);
      setCurrentRole(role);
      onSwitch?.();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSwitchingId(null);
    }
  };

  if (loading) {
    return <div style={{ color: '#fff' }}>Loading organizations…</div>;
  }

  if (!organizations || organizations.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#fff' }}>
          My organizations
        </h3>
        <div style={{ color: '#999' }}>You have no organizations. Create or join one above.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#fff' }}>
        My organizations
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {organizations.map((org: Organization, index: number) => {
          const isSelected = selectedOrgId === org.id;
          return (
            <button
              type="button"
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '1.5rem',
                border: isSelected ? '2px solid #60a5fa' : '1px solid #3a3a3a',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                cursor: switchingId ? 'not-allowed' : 'pointer',
                opacity: switchingId && switchingId !== org.id ? 0.6 : 1,
              }}
              disabled={!!switchingId}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: getColorForOrg(index),
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                }}
              >
                {getInitials(org.name)}
              </div>
              <div
                style={{
                  fontWeight: '500',
                  color: '#fff',
                  fontSize: '1rem',
                  wordBreak: 'break-word',
                  width: '100%',
                }}
              >
                {org.name}
              </div>
              {isSelected && (
                <div style={{ marginTop: '0.5rem', color: '#60a5fa', fontSize: '0.875rem' }}>Current</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OrganizationSwitcher;

