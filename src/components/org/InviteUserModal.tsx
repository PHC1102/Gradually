import React, { useState } from 'react';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string) => Promise<void> | void;
}

const modalBackdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalCard: React.CSSProperties = {
  backgroundColor: '#1f2937',
  padding: '2rem',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '400px',
  color: '#fff',
};

export const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setBusy(true);
    try {
      await onInvite(email.trim());
      setEmail('');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={modalBackdrop} role="dialog" aria-modal="true">
      <div style={modalCard}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Invite a teammate</h3>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Teammate email
          </label>
          <input
            type="email"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #374151',
              backgroundColor: '#111827',
              color: '#fff',
              marginBottom: '0.75rem',
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            placeholder="name@example.com"
            autoFocus
          />
          {error && <div style={{ color: '#f87171', marginBottom: '0.75rem' }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                color: '#fff',
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1.2rem',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
              disabled={busy}
            >
              {busy ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteUserModal;

