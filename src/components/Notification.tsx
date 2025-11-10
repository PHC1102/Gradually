import React, { useState, useEffect } from 'react';
import type { Notification as NotificationType } from '../types';
import { notificationService } from '../services/notificationService';
import './Notification.css';

interface NotificationProps {
  onNotificationUpdate?: () => void;
}

export const Notification: React.FC<NotificationProps> = ({
  onNotificationUpdate
}) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications and update counts
  const loadNotifications = () => {
    const allNotifications = notificationService.loadNotifications();
    setNotifications(allNotifications);
    setUnreadCount(notificationService.getUnreadCount());
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Refresh notifications when external changes occur
  useEffect(() => {
    if (onNotificationUpdate) {
      loadNotifications();
    }
  }, [onNotificationUpdate]);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    
    // Mark all as read when opening notifications
    if (!showNotifications && unreadCount > 0) {
      notificationService.markAllAsRead();
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
    loadNotifications();
  };

  const handleClearAll = () => {
    notificationService.clearAll();
    setNotifications([]);
    setUnreadCount(0);
    setShowNotifications(false);
  };

  // Close notifications when clicking outside
  const handleOverlayClick = () => {
    setShowNotifications(false);
  };

  const formatNotificationTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="notification-container">
      <button 
        className={`notification-bell ${unreadCount > 0 ? 'has-notifications' : ''}`}
        onClick={handleBellClick}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <>
          <div className="notification-overlay" onClick={handleOverlayClick} />
          <div className="notification-panel">
            <div className="notification-header">
              <h3>Notifications</h3>
              {notifications.length > 0 && (
                <button 
                  className="clear-all-btn"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">
                  <p>No notifications</p>
                </div>
              ) : (
                notifications
                  .sort((a, b) => b.createdAt - a.createdAt) // Most recent first
                  .map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="notification-content">
                        <div className="notification-icon">
                          {notification.type === 'task_overdue' ? '⚠️' : '📋'}
                        </div>
                        <div className="notification-text">
                          <p className="notification-message">{notification.message}</p>
                          <span className="notification-time">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      {!notification.read && <div className="unread-indicator" />}
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};