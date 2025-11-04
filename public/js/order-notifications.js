// Order Notifications - Real-time Gmail order updates
class OrderNotifications {
  constructor() {
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
    this.isConnected = false;
    this.notificationQueue = [];
    
    this.init();
  }

  init() {
    console.log('📧 Initializing order notifications...');
    this.connect();
    this.createNotificationContainer();
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    console.log('🔌 Connecting to order notification stream...');
    this.eventSource = new EventSource('/api/order-notifications');

    this.eventSource.onopen = () => {
      console.log('✅ Connected to order notifications');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleNotification(data);
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('❌ Order notification connection error:', error);
      this.isConnected = false;
      this.updateConnectionStatus(false);
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
          this.connect();
        }, this.reconnectDelay);
      } else {
        console.error('❌ Max reconnection attempts reached');
        this.showNotification('Connection Lost', 'Unable to connect to order notifications. Please refresh the page.', 'error');
      }
    };
  }

  handleNotification(data) {
    console.log('📬 Notification received:', data);

    switch (data.type) {
      case 'connected':
        console.log('✅ Successfully connected to notifications');
        break;

      case 'newOrders':
        this.showNewOrdersNotification(data);
        break;

      case 'checked':
        console.log('✓ Gmail checked at', new Date(data.timestamp).toLocaleTimeString());
        break;

      case 'error':
        console.error('Error from server:', data.message);
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  showNewOrdersNotification(data) {
    const count = data.count;
    const title = count === 1 ? 'New Catering Order!' : `${count} New Catering Orders!`;
    const message = count === 1 
      ? 'A new catering order has been received from Gmail'
      : `${count} new catering orders have been received from Gmail`;

    this.showNotification(title, message, 'success', () => {
      // When notification is clicked, reload the page or redirect to orders
      window.location.reload();
    });

    // Play notification sound if available
    this.playNotificationSound();

    // Show browser notification if permitted
    this.showBrowserNotification(title, message);
  }

  showNotification(title, message, type = 'info', onClick = null) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    notification.innerHTML = `
      <div class="notification-icon">${icons[type] || icons.info}</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">✕</button>
    `;

    if (onClick) {
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', (e) => {
        if (!e.target.classList.contains('notification-close')) {
          onClick();
        }
      });
    }

    container.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 10000);
  }

  createNotificationContainer() {
    if (document.getElementById('notification-container')) return;

    const container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 100000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
      }

      .notification {
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        animation: slideIn 0.3s ease;
        border-left: 4px solid #ccc;
      }

      .notification-success {
        border-left-color: #28a745;
        background: linear-gradient(to right, rgba(40, 167, 69, 0.1), white);
      }

      .notification-error {
        border-left-color: #dc3545;
        background: linear-gradient(to right, rgba(220, 53, 69, 0.1), white);
      }

      .notification-warning {
        border-left-color: #ffc107;
        background: linear-gradient(to right, rgba(255, 193, 7, 0.1), white);
      }

      .notification-info {
        border-left-color: #17a2b8;
        background: linear-gradient(to right, rgba(23, 162, 184, 0.1), white);
      }

      .notification-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .notification-content {
        flex: 1;
      }

      .notification-title {
        font-weight: 700;
        font-size: 16px;
        color: #212529;
        margin-bottom: 4px;
      }

      .notification-message {
        font-size: 14px;
        color: #6c757d;
        line-height: 1.4;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        color: #6c757d;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: color 0.2s;
      }

      .notification-close:hover {
        color: #212529;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }

      .connection-status {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 99999;
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }

      .connection-status.connected {
        color: #28a745;
        border: 2px solid #28a745;
      }

      .connection-status.disconnected {
        color: #dc3545;
        border: 2px solid #dc3545;
      }

      .connection-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }

      .connection-status.connected .connection-status-dot {
        background: #28a745;
      }

      .connection-status.disconnected .connection-status-dot {
        background: #dc3545;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @media (max-width: 768px) {
        #notification-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }

        .connection-status {
          bottom: 10px;
          right: 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  updateConnectionStatus(connected) {
    let statusEl = document.getElementById('connection-status');
    
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'connection-status';
      statusEl.className = 'connection-status';
      document.body.appendChild(statusEl);
    }

    statusEl.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    statusEl.innerHTML = `
      <div class="connection-status-dot"></div>
      <span>${connected ? 'Live Updates Active' : 'Reconnecting...'}</span>
    `;

    // Auto-hide connection status after 5 seconds if connected
    if (connected) {
      setTimeout(() => {
        if (statusEl) statusEl.style.opacity = '0.3';
      }, 5000);

      // Show on hover
      statusEl.addEventListener('mouseenter', () => {
        statusEl.style.opacity = '1';
      });
      statusEl.addEventListener('mouseleave', () => {
        statusEl.style.opacity = '0.3';
      });
    } else {
      statusEl.style.opacity = '1';
    }
  }

  playNotificationSound() {
    // Create a simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }

  showBrowserNotification(title, message) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return;
    }

    // Request permission if not granted
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/images/cfa-logo.png', // Add your logo path
        badge: '/images/cfa-badge.png',
        tag: 'catering-order',
        requireInteraction: false
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: '/images/cfa-logo.png',
            badge: '/images/cfa-badge.png',
            tag: 'catering-order'
          });
        }
      });
    }
  }

  disconnect() {
    if (this.eventSource) {
      console.log('🔌 Disconnecting from order notifications');
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }
}

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.orderNotifications = new OrderNotifications();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.orderNotifications) {
    window.orderNotifications.disconnect();
  }
});
