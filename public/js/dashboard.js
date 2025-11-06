// Option B Dashboard JavaScript - Compact Data-Dense Interface
class CompactDashboard {
  constructor() {
    this.stats = null;
    this.refreshInterval = null;
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Compact Dashboard...');
    await this.loadStatistics();
    this.setupEventListeners();
    this.startAutoRefresh();
    this.updateRefreshIndicator(true);
  }

  async loadStatistics() {
    try {
      console.log('📊 Loading compact dashboard statistics...');
      
      // Show loading state for all elements
      this.showLoadingState();
      
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.stats = await response.json();
      console.log('📊 Compact statistics loaded:', this.stats);
      
      // Update all dashboard sections
      this.updateMetrics();
      this.updateKitchenStatus();
      this.updatePopularItems();
      this.updateActivityStream();
      this.updateQuickStats();
      
      this.updateRefreshIndicator(true);
      
    } catch (error) {
      console.error('❌ Error loading compact statistics:', error);
      this.showErrorState();
      this.updateRefreshIndicator(false);
    }
  }

  showLoadingState() {
    // Update metrics with loading
    const metricValues = ['orders-value', 'nuggets-value', 'revenue-value', 'completion-value'];
    metricValues.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '...';
    });

    // Update kitchen status
    const statusElements = ['boh-count', 'foh-count', 'kitchen-pending', 'delivery-ready'];
    statusElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '...';
    });
  }

  showErrorState() {
    const errorElements = [
      'orders-value', 'nuggets-value', 'revenue-value', 'completion-value',
      'boh-count', 'foh-count', 'kitchen-pending', 'delivery-ready'
    ];
    
    errorElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = '!';
    });

    // Show error in insights
    const popularItems = document.getElementById('popular-items-compact');
    if (popularItems) {
      popularItems.innerHTML = '<div class="loading-compact" style="color: #dc3545;">Unable to load data</div>';
    }
  }

  updateMetrics() {
    if (!this.stats) return;

    // Update main metrics with animation
    this.animateValue('orders-value', this.stats.thisWeek.orders);
    this.animateValue('nuggets-value', this.formatNumber(this.stats.thisWeek.nuggets));
    this.animateValue('revenue-value', `$${this.formatMoney(this.stats.thisWeek.revenue)}`);
    this.animateValue('completion-value', `${this.stats.thisWeek.completionRate.boh}%`);
    
    // Update dynamic trends
    if (this.stats.trends) {
      const ordersTrend = document.getElementById('orders-trend');
      const revenueTrend = document.getElementById('revenue-trend');
      
      if (ordersTrend) {
        const ordersChange = this.stats.trends.ordersChange;
        const sign = ordersChange > 0 ? '+' : '';
        const color = ordersChange >= 0 ? '#28a745' : '#dc3545';
        ordersTrend.innerHTML = `<span style="color: ${color}">${sign}${ordersChange}% vs last week</span>`;
      }
      
      if (revenueTrend) {
        const revenueChange = this.stats.trends.revenueChange;
        const sign = revenueChange > 0 ? '+' : '';
        const color = revenueChange >= 0 ? '#28a745' : '#dc3545';
        revenueTrend.innerHTML = `<span style="color: ${color}">${sign}${revenueChange}% vs last week</span>`;
      }
    }
  }

  updateKitchenStatus() {
    if (!this.stats) return;

    // Calculate pending and ready counts
    const pendingBOH = this.stats.thisWeek.orders - Math.floor(this.stats.thisWeek.orders * (this.stats.thisWeek.completionRate.boh / 100));
    const readyFOH = Math.floor(this.stats.thisWeek.orders * (this.stats.thisWeek.completionRate.foh / 100));

    this.animateValue('boh-count', pendingBOH);
    this.animateValue('foh-count', readyFOH);
    this.animateValue('kitchen-pending', pendingBOH);
    this.animateValue('delivery-ready', readyFOH);
  }

  updatePopularItems() {
    const container = document.getElementById('popular-items-compact');
    if (!container || !this.stats.popularItems) return;

    if (this.stats.popularItems.length === 0) {
      container.innerHTML = '<div class="loading-compact">No data available</div>';
      return;
    }

    // Show top 4 items for compact view
    container.innerHTML = this.stats.popularItems.slice(0, 4).map(item => {
      const truncatedName = this.truncateText(item.item, 20);
      const needsTooltip = item.item.length > 20;
      
      return `
        <div class="popular-item-compact">
          <span class="item-name-compact ${needsTooltip ? 'tooltip' : ''}" 
                ${needsTooltip ? `data-tooltip="${item.item}"` : ''}>
            ${truncatedName}
          </span>
          <span class="item-count-compact">${item.count}</span>
        </div>
      `;
    }).join('');

    // Add click handlers for mobile tooltips
    if (this.isMobileDevice()) {
      container.querySelectorAll('.tooltip').forEach(tooltip => {
        tooltip.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Remove active class from all other tooltips
          container.querySelectorAll('.tooltip.active').forEach(activeTooltip => {
            if (activeTooltip !== tooltip) {
              activeTooltip.classList.remove('active');
            }
          });
          
          // Toggle active class on clicked tooltip
          tooltip.classList.toggle('active');
          
          // Auto-hide after 3 seconds
          setTimeout(() => {
            tooltip.classList.remove('active');
          }, 3000);
        });
      });
    }
  }

  updateActivityStream() {
    const container = document.getElementById('activity-stream');
    if (!container || !this.stats.recentActivity) return;

    if (this.stats.recentActivity.length === 0) {
      container.innerHTML = '<div class="loading-compact">No recent activity</div>';
      return;
    }

    // Show top 3 activities for compact view
    container.innerHTML = this.stats.recentActivity.slice(0, 3).map(activity => `
      <div class="activity-item-compact">
        <div class="activity-customer-compact">${this.truncateText(activity.customer || 'Unknown', 15)}</div>
        <div class="activity-time-compact">${activity.time}</div>
      </div>
    `).join('');
  }

  updateQuickStats() {
    if (!this.stats || !this.stats.thisWeek.orders) return;

    // Calculate average order value
    const avgOrder = this.stats.thisWeek.orders > 0 
      ? Math.round(this.stats.thisWeek.revenue / this.stats.thisWeek.orders) 
      : 0;

    // Mock peak hour (in a real app, this would come from time-based analysis)
    const peakHour = '12PM';

    this.animateValue('avg-order', `$${avgOrder}`);
    this.animateValue('peak-hour', peakHour);
  }

  animateValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.transform = 'scale(1.05)';
      element.textContent = value;
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
    }
  }

  updateRefreshIndicator(success) {
    const indicator = document.getElementById('refresh-indicator');
    if (indicator) {
      indicator.style.color = success ? '#28a745' : '#dc3545';
      indicator.style.animation = success ? 'pulse 2s infinite' : 'none';
    }
  }

  setupEventListeners() {
    // Add click handlers for action buttons
    const actionButtons = document.querySelectorAll('.action-btn, .status-card');
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = button.dataset.action;
        if (action) {
          this.handleAction(action, button);
        }
      });
    });

    // Add click handlers for quick create buttons
    const quickCreateButtons = document.querySelectorAll('.quick-create');
    quickCreateButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = button.dataset.action;
        if (action) {
          this.handleAction(action, button);
        }
      });
    });

    // Add click handlers for icon buttons
    const iconButtons = document.querySelectorAll('.icon-btn[data-action]');
    iconButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = button.dataset.action;
        if (action) {
          this.handleAction(action, button);
        }
      });
    });
  }

  handleAction(action, element) {
    console.log('🎯 Compact dashboard action:', action);
    
    // Add visual feedback
    if (element) {
      element.style.transform = 'scale(0.95)';
      setTimeout(() => {
        element.style.transform = '';
      }, 150);
    }

    // Handle navigation
    switch (action) {
      case 'today-orders':
        this.showTodaysOrdersModal();
        break;
      case 'create-new':
        this.showCreateModal();
        break;
      case 'previous-orders':
        this.showPreviousOrdersModal();
        break;
      case 'management':
        this.showEmployeeManagementModal();
        break;
      case 'today-boh':
        window.location.href = '/orders?view=boh';
        break;
      case 'today-foh':
        window.location.href = '/orders?view=foh';
        break;
      case 'new-sandwich':
        window.location.href = '/fundraiser';
        break;
      case 'new-regular':
        window.location.href = '/catering';
        break;
      case 'change-password':
        this.showSettingsModal();
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  showCreateModal() {
    this.showModal('Create New Order', [
      { text: '🥪 Sandwich Catering', action: () => window.location.href = '/fundraiser', style: 'sandwich' },
      { text: '🍽️ Regular Catering', action: () => window.location.href = '/create-regular', style: 'regular' },
      { text: 'Cancel', action: null, style: 'cancel' }
    ]);
  }

  showPreviousOrdersModal() {
    this.showModal('Previous Orders', [
      { text: '🥪 Sandwich Catering Orders', action: () => window.location.href = '/catering', style: 'sandwich' },
      { text: '🍽️ Regular Catering Orders', action: () => window.location.href = '/json-catering', style: 'regular' },
      { text: 'Cancel', action: null, style: 'cancel' }
    ]);
  }

  showTodaysOrdersModal() {
    this.showModal('Today\'s Orders', [
      { text: '👨‍🍳 Back of House (Kitchen)', action: () => window.location.href = '/orders?view=boh', style: 'sandwich' },
      { text: '🚗 Front of House (Service)', action: () => window.location.href = '/orders?view=foh', style: 'regular' },
      { text: 'Cancel', action: null, style: 'cancel' }
    ]);
  }

  showEmployeeManagementModal() {
    this.showModal('Employee Management', [
      { text: '🔑 Edit Passwords', action: () => window.location.href = '/change-password', style: 'sandwich' },
      { text: '👥 Add/Delete Employees', action: () => window.location.href = '/employees/', style: 'regular' },
      { text: 'Cancel', action: null, style: 'cancel' }
    ]);
  }

  showSettingsModal() {
    this.showModal('Settings', [
      { text: '🔑 Change Password', action: () => window.location.href = '/change-password', style: 'sandwich' },
      { text: '🔄 Refresh Dashboard', action: () => window.location.reload(), style: 'regular' },
      { text: 'Cancel', action: null, style: 'cancel' }
    ]);
  }

  showModal(title, buttons) {
    // Create a sleek modal for options
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 16px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      transform: scale(0.9);
      transition: transform 0.2s ease;
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.style.cssText = `
      color: #c8102e;
      margin-bottom: 20px;
      text-align: center;
      font-size: 20px;
      font-weight: 700;
    `;
    titleEl.textContent = title;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: grid; gap: 12px;';
    
    buttons.forEach(buttonConfig => {
      const button = document.createElement('button');
      
      let buttonStyle;
      switch (buttonConfig.style) {
        case 'sandwich':
          buttonStyle = `
            padding: 16px 20px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            background: linear-gradient(135deg, #fd7e14 0%, #e85d04 100%);
            color: white;
            transition: transform 0.2s ease;
          `;
          break;
        case 'regular':
          buttonStyle = `
            padding: 16px 20px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            background: linear-gradient(135deg, #6610f2 0%, #520dc2 100%);
            color: white;
            transition: transform 0.2s ease;
          `;
          break;
        case 'cancel':
          buttonStyle = `
            padding: 12px 20px;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            background: white;
            color: #6c757d;
            transition: all 0.2s ease;
          `;
          break;
      }
      
      button.style.cssText = buttonStyle;
      button.textContent = buttonConfig.text;
      
      button.addEventListener('click', () => {
        if (buttonConfig.action) {
          buttonConfig.action();
        } else {
          modal.remove();
        }
      });
      
      // Add hover effects
      if (buttonConfig.style !== 'cancel') {
        button.addEventListener('mouseenter', () => {
          button.style.transform = 'translateY(-2px)';
        });
        button.addEventListener('mouseleave', () => {
          button.style.transform = '';
        });
      } else {
        button.addEventListener('mouseenter', () => {
          button.style.borderColor = '#c8102e';
          button.style.color = '#c8102e';
        });
        button.addEventListener('mouseleave', () => {
          button.style.borderColor = '#dee2e6';
          button.style.color = '#6c757d';
        });
      }
      
      buttonContainer.appendChild(button);
    });
    
    modalContent.appendChild(titleEl);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => {
      modalContent.style.transform = 'scale(1)';
    }, 10);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  startAutoRefresh() {
    // Refresh every 3 minutes for more frequent updates
    this.refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing compact dashboard...');
      this.loadStatistics();
    }, 3 * 60 * 1000);
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatMoney(amount) {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toString();
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  }

  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window) || 
           window.innerWidth <= 768;
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// Initialize compact dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.compactDashboard = new CompactDashboard();
});



// Add some utility functions for backwards compatibility
function goToCompactPage(action) {
  if (window.compactDashboard) {
    window.compactDashboard.handleAction(action);
  }
}

// Weekly Overview Functionality
class WeeklyOverview {
  constructor() {
    this.currentDayIndex = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    // Convert to Mon=0, Sat=5 (skip Sunday)
    if (this.currentDayIndex === 0) {
      this.currentDayIndex = 0; // Sunday -> Monday
    } else {
      this.currentDayIndex = this.currentDayIndex - 1; // Mon-Sat = 0-5
    }
    
    this.weekOrders = {};
    this.dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.init();
  }

  async init() {
    await this.fetchWeekOrders();
    this.setupEventListeners();
    this.updateDayDisplay();
  }

  async fetchWeekOrders() {
    try {
      // Get Monday and Saturday of current week
      const { monday, saturday } = this.getWeekDates();
      
      const response = await fetch(`/orders/range?start=${monday.toISOString()}&end=${saturday.toISOString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const orders = await response.json();
      
      // Organize orders by day
      this.organizeOrdersByDay(orders);
      
    } catch (error) {
      console.error('❌ Error fetching week orders:', error);
      this.showErrorState();
    }
  }

  getWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate days since Monday (Mon=0, Sun=6)
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Get Monday of current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Get Saturday of current week
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    saturday.setHours(23, 59, 59, 999);
    
    return { monday, saturday };
  }

  organizeOrdersByDay(orders) {
    // Initialize empty arrays for each day
    this.dayNames.forEach(day => {
      this.weekOrders[day] = [];
    });
    
    // Organize orders by day
    orders.forEach(order => {
      const orderDate = new Date(order.order_datetime || order.created_at);
      const dayIndex = orderDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Skip Sunday orders (day 0)
      if (dayIndex === 0) return;
      
      // Convert to Mon-Sat index (0-5)
      const dayName = this.dayNames[dayIndex - 1];
      
      if (this.weekOrders[dayName]) {
        this.weekOrders[dayName].push(order);
      }
    });
    
    // Sort each day's orders by time
    Object.keys(this.weekOrders).forEach(day => {
      this.weekOrders[day].sort((a, b) => {
        const timeA = new Date(a.order_datetime || a.created_at);
        const timeB = new Date(b.order_datetime || b.created_at);
        return timeA - timeB;
      });
    });
  }

  setupEventListeners() {
    const prevBtn = document.getElementById('prev-day');
    const nextBtn = document.getElementById('next-day');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.navigateDay(-1));
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.navigateDay(1));
    }
  }

  navigateDay(direction) {
    this.currentDayIndex += direction;
    
    // Wrap around: 0 (Mon) <-> 5 (Sat)
    if (this.currentDayIndex < 0) {
      this.currentDayIndex = 5; // Wrap to Saturday
    } else if (this.currentDayIndex > 5) {
      this.currentDayIndex = 0; // Wrap to Monday
    }
    
    this.updateDayDisplay();
  }

  updateDayDisplay() {
    const dayDisplay = document.getElementById('day-display');
    const container = document.getElementById('day-orders-container');
    
    if (!dayDisplay || !container) return;
    
    const currentDay = this.dayNames[this.currentDayIndex];
    dayDisplay.textContent = currentDay;
    
    // Get orders for current day
    const dayOrders = this.weekOrders[currentDay] || [];
    
    if (dayOrders.length === 0) {
      container.innerHTML = `
        <div class="no-orders">
          <div class="no-orders-icon">📅</div>
          <div class="no-orders-text">No orders scheduled for ${currentDay}</div>
        </div>
      `;
      return;
    }
    
    // Render order cards
    container.innerHTML = dayOrders.map(order => this.renderOrderCard(order)).join('');
    
    // Add click handlers to navigate to full order details
    container.querySelectorAll('.order-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        const orderId = dayOrders[index].id;
        window.location.href = `/orders?id=${orderId}`;
      });
    });
  }

  renderOrderCard(order) {
    const orderTime = new Date(order.order_datetime || order.created_at);
    const timeStr = orderTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const customerName = order.customer_name || 'Unknown Customer';
    const phone = order.phone || '';
    const email = order.email || '';
    
    const isPaid = order.paid || false;
    const isCompletedBOH = order.completed_boh || false;
    const isCompletedFOH = order.completed_foh || false;
    
    return `
      <div class="order-card">
        <div class="order-card-header">
          <div class="order-customer">${customerName}</div>
          <div class="order-time">${timeStr}</div>
        </div>
        
        ${phone ? `
          <div class="order-contact">
            📞 <a href="tel:${phone}" class="order-phone">${phone}</a>
          </div>
        ` : ''}
        
        ${email ? `
          <div class="order-contact">
            ✉️ ${email}
          </div>
        ` : ''}
        
        <div class="order-status">
          <span class="status-badge ${isPaid ? 'status-paid' : 'status-unpaid'}">
            ${isPaid ? 'PAID' : 'UNPAID'}
          </span>
          ${isCompletedBOH ? 
            '<span class="status-badge status-completed-boh">KITCHEN ✓</span>' : 
            '<span class="status-badge status-pending">KITCHEN</span>'
          }
          ${isCompletedFOH ? 
            '<span class="status-badge status-completed-foh">SERVICE ✓</span>' : 
            '<span class="status-badge status-pending">SERVICE</span>'
          }
        </div>
      </div>
    `;
  }

  showErrorState() {
    const container = document.getElementById('day-orders-container');
    if (container) {
      container.innerHTML = `
        <div class="no-orders">
          <div class="no-orders-icon">⚠️</div>
          <div class="no-orders-text">Unable to load orders</div>
        </div>
      `;
    }
  }
}

// Initialize weekly overview when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.weeklyOverview = new WeeklyOverview();
});