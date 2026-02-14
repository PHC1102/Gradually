import React, { useEffect, useState } from 'react';
import CreateOrganizationForm from '../components/org/CreateOrganization';
import JoinOrganization from '../components/org/JoinOrganization';
import OrganizationSwitcher from '../components/org/OrganizationSwitcher';
import PendingInvitations from '../components/org/PendingInvitations';
import AccountMenu from '../components/AccountMenu';
import { getMyOrganizations } from '../services/organizationService';
import { useOrganizationStore } from '../store/organizationStore';
import type { OrgState } from '../store/organizationStore';
import { useAuth } from '../contexts/AuthContext';

/**
 * Page displayed after login so user can select or create/join an Organization.
 * - Loads organizations on mount; chooses which UI to show based on count.
 * - After selecting org, setSelectedOrgId is called (components do that) and page reloads to the main app.
 */
const SelectOrganizationPage: React.FC = () => {
  const { currentUser } = useAuth();
  const setOrganizations = useOrganizationStore((s: OrgState) => s.setOrganizations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const orgs = await getMyOrganizations();
        if (!mounted) return;
        setOrganizations(orgs);
      } catch (err) {
        console.error('Error loading organizations', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentUser, setOrganizations]);

  if (loading) return <div style={{ padding: '1rem', color: '#fff' }}>Loading organizations…</div>;

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#1a1a1a'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#fff' }}>Get started with an organization</h2>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* 0. Pending Invitations - shown first if any */}
        <PendingInvitations />
        
        {/* 1. Join an existing organization - Card */}
        <JoinOrganization />
        
        {/* 2. Create new organization - Card */}
        <CreateOrganizationForm />
        
        {/* 3. My organizations - Cards */}
        <OrganizationSwitcher />
      </div>
      <AccountMenu />
    </div>
  );
};

export default SelectOrganizationPage;
