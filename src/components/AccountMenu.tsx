import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../services/authService';
import { useOrganizationStore } from '../store/organizationStore';
import { useProjectStore } from '../store/projectStore';

const avatarStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  backgroundColor: '#1f2937',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontWeight: 600,
  border: '1px solid #374151',
};

const menuStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  zIndex: 1200,
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '60px',
  right: 0,
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: '10px',
  padding: '1rem',
  minWidth: '220px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
};

const defaultAvatarSvg = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 12c2.761 0 5-2.462 5-5.5S14.761 1 12 1 7 3.462 7 6.5 9.239 12 12 12z" />
    <path d="M4 22c0-4 3.134-7 8-7s8 3 8 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AccountMenu: React.FC = () => {
  const { currentUser, profile } = useAuth();
  const [open, setOpen] = useState(false);
  
  // Organization & Project stores
  const organizations = useOrganizationStore((s) => s.organizations);
  const selectedOrgId = useOrganizationStore((s) => s.selectedOrgId);
  const setSelectedOrgId = useOrganizationStore((s) => s.setSelectedOrgId);
  const projects = useProjectStore((s) => s.projects);
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useProjectStore((s) => s.setSelectedProjectId);
  
  const currentOrg = organizations.find((o) => o.id === selectedOrgId);
  const currentProject = projects.find((p) => p.id === selectedProjectId);

  if (!currentUser) return null;

  const initials =
    profile?.displayName?.length
      ? profile.displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : currentUser.email?.slice(0, 2).toUpperCase();

  const renderAvatarContent = () => {
    if (profile?.avatarUrl && profile.avatarUrl !== 'default') {
      return <img src={profile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />;
    }
    return defaultAvatarSvg;
  };

  return (
    <div style={menuStyle}>
      {open && (
        <div style={dropdownStyle}>
          {/* User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={avatarStyle}>{renderAvatarContent()}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{profile?.displayName || 'Chưa đặt tên'}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{currentUser.email}</div>
            </div>
          </div>
          
          {/* Organization & Project Section */}
          {selectedOrgId && (
            <div style={{ borderTop: '1px solid #374151', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
              {/* Current Organization */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Tổ chức</div>
                <button
                  onClick={() => {
                    setSelectedOrgId(null);
                    setSelectedProjectId(null);
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #4b5563',
                    backgroundColor: '#1f2937',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{currentOrg?.name || 'Chọn tổ chức'}</span>
                  <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}>Đổi</span>
                </button>
              </div>
              
              {/* Current Project */}
              {selectedProjectId && (
                <div>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Project</div>
                  <button
                    onClick={() => {
                      setSelectedProjectId(null);
                      setOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #4b5563',
                      backgroundColor: '#1f2937',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{currentProject?.name || 'Chọn project'}</span>
                    <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}>Đổi</span>
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Logout Button */}
          <button
            onClick={logoutUser}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #f87171',
              backgroundColor: 'transparent',
              color: '#f87171',
              cursor: 'pointer',
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...avatarStyle,
          backgroundColor: '#2563eb',
          borderColor: '#3b82f6',
        }}
      >
        {renderAvatarContent()}
      </button>
    </div>
  );
};

export default AccountMenu;

