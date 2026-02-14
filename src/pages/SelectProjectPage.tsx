import React from 'react';
import ProjectSwitcher from '../components/org/ProjectSwitcher';
import AccountMenu from '../components/AccountMenu';

interface SelectProjectPageProps {
  orgId: string;
}

const SelectProjectPage: React.FC<SelectProjectPageProps> = ({ orgId }) => {
  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#fff',
      }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>Chọn project để tiếp tục</h2>
        <p style={{ color: '#94a3b8' }}>Bạn có thể tạo project mới hoặc chọn một project đã có trong tổ chức.</p>
      </div>
      <ProjectSwitcher orgId={orgId} />
      <AccountMenu />
    </div>
  );
};

export default SelectProjectPage;

