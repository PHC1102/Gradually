import React, { useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useOrganizationStore } from '../../store/organizationStore';
import type { ProjectState } from '../../store/projectStore';
import type { OrgState } from '../../store/organizationStore';
import type { ProjectMember, ProjectRole } from '../../types';
import { updateProjectMemberRole, removeProjectMember, addProjectMember } from '../../services/projectService';
import { useAuth } from '../../contexts/AuthContext';

interface ProjectMembersPageProps {
  orgId: string;
  projectId: string;
}

const ProjectMembersPage: React.FC<ProjectMembersPageProps> = ({ orgId, projectId }) => {
  const { currentUser } = useAuth();
  // Using store directly - real-time updates handled by App.tsx subscription
  const projectMembers = useProjectStore((s: ProjectState) => s.projectMembers);
  const currentProjectRole = useProjectStore((s: ProjectState) => s.currentProjectRole);
  const orgMembers = useOrganizationStore((s: OrgState) => s.members);
  const currentOrgRole = useOrganizationStore((s: OrgState) => s.currentRole);
  
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedOrgMember, setSelectedOrgMember] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectRole>('viewer');
  const [busy, setBusy] = useState(false);

  const handleRoleChange = async (userId: string, newRole: ProjectRole) => {
    setBusy(true);
    try {
      await updateProjectMemberRole(orgId, projectId, userId, newRole);
      // Real-time subscription will update the store automatically
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the project?')) return;
    setBusy(true);
    try {
      await removeProjectMember(orgId, projectId, userId);
      // Real-time subscription will update the store automatically
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedOrgMember) return;
    setBusy(true);
    try {
      const orgMember = orgMembers.find(m => m.id === selectedOrgMember);
      if (!orgMember) return;

      await addProjectMember(orgId, projectId, selectedOrgMember, newMemberRole, {
        userId: selectedOrgMember,
        displayName: orgMember.displayName,
        email: orgMember.email,
        role: newMemberRole,
      });

      // Real-time subscription will update the store automatically
      setShowAddMember(false);
      setSelectedOrgMember('');
      setNewMemberRole('viewer');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Can manage if project admin or org owner/admin
  const canManageMembers = currentProjectRole === 'admin' || currentOrgRole === 'owner' || currentOrgRole === 'admin';

  // Filter org members who are not yet in the project
  const availableOrgMembers = orgMembers.filter(
    orgMember => !projectMembers.some(pm => pm.userId === orgMember.id)
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: '#fff', margin: 0 }}>Project Members</h2>
          <p style={{ color: '#9ca3af', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            {projectMembers.length} member{projectMembers.length !== 1 ? 's' : ''} • 
            Your role: <strong style={{ color: currentProjectRole === 'admin' ? '#22c55e' : currentProjectRole === 'contributor' ? '#3b82f6' : '#f59e0b' }}>
              {currentProjectRole || 'Not a member'}
            </strong>
          </p>
        </div>
        {canManageMembers && (
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            disabled={busy}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {showAddMember ? 'Cancel' : 'Add Member'}
          </button>
        )}
      </div>

      {showAddMember && (
        <div
          style={{
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #3a3a3a',
          }}
        >
          <h3 style={{ color: '#fff', marginBottom: '1rem' }}>Add Member from Organization</h3>
          {availableOrgMembers.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>All organization members are already in this project.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Select Member</label>
                <select
                  value={selectedOrgMember}
                  onChange={(e) => setSelectedOrgMember(e.target.value)}
                  disabled={busy}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #4b5563',
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                  }}
                >
                  <option value="">Select a member...</option>
                  {availableOrgMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.displayName || member.email} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as ProjectRole)}
                  disabled={busy}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #4b5563',
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                  }}
                >
                  <option value="viewer">Viewer (can only view tasks)</option>
                  <option value="contributor">Contributor (can edit task status only)</option>
                  <option value="admin">Admin (full control)</option>
                </select>
              </div>
              <button
                onClick={handleAddMember}
                disabled={!selectedOrgMember || busy}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: selectedOrgMember && !busy ? '#16a34a' : '#6b7280',
                  color: '#fff',
                  cursor: selectedOrgMember && !busy ? 'pointer' : 'not-allowed',
                }}
              >
                {busy ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          )}
        </div>
      )}

      {projectMembers.length === 0 ? (
        <div style={{ 
          backgroundColor: '#2a2a2a', 
          borderRadius: '8px', 
          padding: '2rem', 
          textAlign: 'center',
          color: '#9ca3af' 
        }}>
          <p>No members in this project yet.</p>
          {canManageMembers && <p>Click "Add Member" to add organization members to this project.</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {projectMembers.map(member => (
            <div
              key={member.userId}
              style={{
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                padding: '1.5rem',
                border: '1px solid #3a3a3a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: '#fff', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {member.displayName || 'Unknown User'}
                  {member.userId === currentUser?.uid && (
                    <span style={{ color: '#3b82f6', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(You)</span>
                  )}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{member.email || 'No email'}</div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as ProjectRole)}
                  disabled={!canManageMembers || member.userId === currentUser?.uid || busy}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #4b5563',
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    cursor: canManageMembers && member.userId !== currentUser?.uid && !busy ? 'pointer' : 'not-allowed',
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="contributor">Contributor</option>
                  <option value="admin">Admin</option>
                </select>
                {canManageMembers && member.userId !== currentUser?.uid && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={busy}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectMembersPage;
