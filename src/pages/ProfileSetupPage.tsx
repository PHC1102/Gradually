import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveUserProfile } from '../services/userService';
import { logoutUser } from '../services/authService';

interface ProfileSetupPageProps {
  onCompleted: () => void;
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#0f172a',
  color: '#fff',
  padding: '2rem',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#111827',
  padding: '2rem',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
};

export const ProfileSetupPage: React.FC<ProfileSetupPageProps> = ({ onCompleted }) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState(() => currentUser?.email?.split('@')[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên hiển thị');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveUserProfile(currentUser.uid, { displayName: name.trim(), avatarUrl: 'default' });
      await onCompleted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Chào mừng!</h2>
        <p style={{ color: '#94a3b8' }}>Đặt tên hiển thị cho tài khoản của bạn để mọi người nhận ra bạn dễ dàng hơn.</p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tên hiển thị</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #374151',
              marginBottom: '1rem',
              backgroundColor: '#0f172a',
              color: '#fff',
            }}
            maxLength={40}
          />
          {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Đang lưu...' : 'Hoàn tất'}
          </button>
        </form>
        <button
          onClick={logoutUser}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #4b5563',
            backgroundColor: 'transparent',
            color: '#fff',
          }}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default ProfileSetupPage;

