import React from 'react';
import type { OrgRole } from '../../services/organizationService';

interface RoleDropdownProps {
  value: OrgRole;
  disabled?: boolean;
  onChange: (role: OrgRole) => void;
  hideOwnerOption?: boolean;
}

const roleOptions: OrgRole[] = ['owner', 'admin', 'member'];

export const RoleDropdown: React.FC<RoleDropdownProps> = ({ value, disabled, onChange, hideOwnerOption }) => {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as OrgRole)}
      style={{
        padding: '0.4rem 0.75rem',
        borderRadius: '4px',
        border: '1px solid #4b5563',
        backgroundColor: '#111827',
        color: '#fff',
        minWidth: '120px',
      }}
    >
      {roleOptions
        .filter((role) => (hideOwnerOption ? role !== 'owner' : true))
        .map((role) => (
          <option key={role} value={role}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </option>
        ))}
    </select>
  );
};

export default RoleDropdown;

