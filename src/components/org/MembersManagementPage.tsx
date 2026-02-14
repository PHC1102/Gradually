import React, { useState } from 'react';
import type { OrgMember, OrgRole } from '../../services/organizationService';
import { removeUserFromOrganization, sendOrganizationInvitation, updateUserRole } from '../../services/organizationService';
import InviteUserModal from './InviteUserModal';
import RoleDropdown from './RoleDropdown';

interface MembersManagementPageProps {
  orgId: string;
  currentRole: OrgRole | null;
  members: OrgMember[];
  onRefresh: () => Promise<void> | void;
}

export const MembersManagementPage: React.FC<MembersManagementPageProps> = ({
  orgId,
  currentRole,
  members,
  onRefresh,
}) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const canManageMembers = currentRole === 'owner' || currentRole === 'admin';
  const canChangeRoles = canManageMembers;

  const handleRoleChange = async (memberId: string, role: OrgRole) => {
    if (!canChangeRoles) return;
    try {
      setBusyMemberId(memberId);
      await updateUserRole(orgId, memberId, role);
      await onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!canManageMembers) return;
    if (!window.confirm('Remove this member from the organization?')) return;
    try {
      setBusyMemberId(memberId);
      await removeUserFromOrganization(orgId, memberId);
      await onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleInvite = async (email: string) => {
    try {
      await sendOrganizationInvitation(orgId, email);
      alert(`Invitation sent to ${email}`);
      await onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Organization Members</h2>
          <p style={{ margin: 0, color: '#9ca3af' }}>
            {currentRole ? `You are an ${currentRole}` : 'Role unavailable'}
          </p>
        </div>
        {canManageMembers && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontWeight: 500,
            }}
          >
            Invite user
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#9ca3af', fontSize: '0.9rem' }}>
              <th style={{ padding: '0.5rem 0.75rem' }}>Member</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Role</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Joined</th>
              <th style={{ padding: '0.5rem 0.75rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const joined = member.joinedAt?.toDate?.() ?? null;
              const joinedText = joined ? joined.toLocaleDateString() : '—';
              const isOwner = member.role === 'owner';
              const disableRoleChange =
                busyMemberId === member.id || !canChangeRoles || (currentRole === 'admin' && member.role !== 'member');

              return (
                <tr key={member.id} style={{ borderTop: '1px solid #374151' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>{member.displayName || member.email}</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{member.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <RoleDropdown
                      value={member.role}
                      disabled={disableRoleChange || isOwner}
                      hideOwnerOption={currentRole !== 'owner'}
                      onChange={(role) => handleRoleChange(member.id, role)}
                    />
                  </td>
                  <td style={{ padding: '0.75rem', color: '#d1d5db' }}>{joinedText}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      type="button"
                      disabled={
                        busyMemberId === member.id ||
                        !canManageMembers ||
                        isOwner ||
                        (currentRole === 'admin' && member.role !== 'member')
                      }
                      onClick={() => handleRemove(member.id)}
                      style={{
                        padding: '0.4rem 0.9rem',
                        borderRadius: '4px',
                        border: '1px solid #f87171',
                        backgroundColor: 'transparent',
                        color: '#f87171',
                        cursor: 'pointer',
                        opacity:
                          busyMemberId === member.id ||
                          !canManageMembers ||
                          isOwner ||
                          (currentRole === 'admin' && member.role !== 'member')
                            ? 0.4
                            : 1,
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <InviteUserModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvite={async (email) => {
            await handleInvite(email);
            setInviteOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default MembersManagementPage;

