const express = require('express');
const { emailOrderDB } = require('../database/db');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching dashboard statistics...');
    
    // Get all email orders
    const allOrders = await emailOrderDB.getAll();
    
    // Get current week date range
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get today's date range
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    // Filter orders for this week
    const thisWeekOrders = allOrders.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= startOfWeek && orderDate <= endOfWeek;
    });
    
    // Filter orders for today only
    const todayOrders = allOrders.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= startOfToday && orderDate <= endOfToday;
    });
    
    // Calculate nuggets sold this week
    let totalNuggets = 0;
    let totalRevenue = 0;
    let popularItems = {};
    
    thisWeekOrders.forEach(order => {
      // Count nuggets from food items
      if (order.food_items && Array.isArray(order.food_items)) {
        order.food_items.forEach(item => {
          const itemName = item.item?.toLowerCase() || '';
          
          // Count nuggets based on tray sizes
          if (itemName.includes('nugget') && itemName.includes('tray')) {
            let nuggetCount = 0;
            const qty = parseInt(item.qty) || 1;
            
            if (itemName.includes('small')) {
              nuggetCount = 64 * qty;
            } else if (itemName.includes('medium')) {
              nuggetCount = 120 * qty;
            } else if (itemName.includes('large')) {
              nuggetCount = 200 * qty;
            }
            
            totalNuggets += nuggetCount;
          }
          
          // Track popular items
          const itemKey = item.item || 'Unknown Item';
          popularItems[itemKey] = (popularItems[itemKey] || 0) + (parseInt(item.qty) || 1);
        });
      }
      
      // Calculate revenue (remove $ and convert to number)
      if (order.total) {
        const revenue = parseFloat(order.total.replace(/[$,]/g, '')) || 0;
        totalRevenue += revenue;
      }
    });
    
    // Get top 3 popular items
    const topItems = Object.entries(popularItems)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([item, count]) => ({ item, count }));
    
    // Calculate completion rates
    const completedBOH = thisWeekOrders.filter(order => order.completed_boh).length;
    const completedFOH = thisWeekOrders.filter(order => order.completed_foh).length;
    const totalOrders = thisWeekOrders.length;
    
    const stats = {
      thisWeek: {
        orders: totalOrders,
        nuggets: totalNuggets,
        revenue: totalRevenue,
        completionRate: {
          boh: totalOrders > 0 ? Math.round((completedBOH / totalOrders) * 100) : 0,
          foh: totalOrders > 0 ? Math.round((completedFOH / totalOrders) * 100) : 0
        }
      },
      popularItems: topItems,
      recentActivity: todayOrders
        .sort((a, b) => {
          // Create full datetime for comparison
          const dateTimeA = new Date(`${a.order_date} ${a.order_time || '00:00'}`);
          const dateTimeB = new Date(`${b.order_date} ${b.order_time || '00:00'}`);
          
          // If both have valid dates, sort by datetime (most recent first)
          if (!isNaN(dateTimeA.getTime()) && !isNaN(dateTimeB.getTime())) {
            return dateTimeB - dateTimeA;
          }
          
          // Fallback to created_at if order_date/time is invalid
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        })
        .slice(0, 3)
        .map(order => ({
          id: order.id,
          customer: order.customer_name,
          total: order.total,
          date: order.order_date,
          time: order.order_time
        }))
    };
    
    console.log('📊 Statistics calculated:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;