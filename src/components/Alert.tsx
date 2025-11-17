import React from 'react';
import '../Alert.css';

interface AlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Alert: React.FC<AlertProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="alert-overlay">
      <div className="alert-modal">
        <div className="alert-header">
          <h2 className="alert-title">{title}</h2>
        </div>
        <div className="alert-content">
          <p className="alert-message">{message}</p>
        </div>
        <div className="alert-actions">
          <button className="alert-btn alert-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="alert-btn alert-confirm-btn" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};