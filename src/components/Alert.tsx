import React from 'react';

interface AlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Alert({ isOpen, title, message, onConfirm, onCancel }: AlertProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="alert-overlay" onClick={handleOverlayClick}>
      <div className="alert-modal">
        <div className="alert-header">
          <h3 className="alert-title">{title}</h3>
        </div>
        
        <div className="alert-content">
          <p className="alert-message">{message}</p>
        </div>
        
        <div className="alert-actions">
          <button 
            className="alert-btn alert-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="alert-btn alert-confirm-btn"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default Alert;