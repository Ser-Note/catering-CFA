const express = require("express");
const { emailOrderDB } = require('../database/db');

const router = express.Router();

// --- GET list page ---
router.get("/", async (req, res) => {
  try {
    console.log('🔍 JSON Catering route accessed');
    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    });

    // Delete request
    if (req.query.delete !== undefined) {
      const deleteId = parseInt(req.query.delete);
      if (!isNaN(deleteId)) {
        console.log('🗑️ Deleting email order ID:', deleteId);
        await emailOrderDB.delete(deleteId);
        const page = parseInt(req.query.page) || 1;
        return res.redirect(`/json-catering?page=${page}`);
      }
    }

    console.log('📊 Fetching email orders from database...');
    // Get all email orders from database
    let data = await emailOrderDB.getAll();
    console.log('📊 Found', data.length, 'email orders');
    
    // If no data found, render with empty state message
    if (data.length === 0) {
      console.log('📭 No email orders found in database');
      return res.render("json-catering", { 
        data: [], 
        paginated: [], 
        total: 0, 
        page: 1, 
        perPage: 5, 
        saved: req.query.saved,
        emptyState: true 
      });
    }
    
    // Convert email order database format to match what the template expects
    data = data.map(order => ({
      id: order.id,
      order_type: order.order_type || 'N/A',
      date: order.order_date || new Date().toISOString().split('T')[0],
      time: order.order_time || 'N/A',
      destination: order.destination || 'N/A',
      customer_name: order.customer_name || 'N/A',
      phone_number: order.phone_number || 'N/A',
      customer_email: order.customer_email || 'N/A',
      guest_count: order.guest_count || 'N/A',
      paper_goods: order.paper_goods || 'N/A',
      total: order.total || 'N/A',
      // Email orders already have the correct array format
      food_items: order.food_items || [],
      drink_items: order.drink_items || [],
      sauces_dressings: order.sauces_dressings || [],
      meal_boxes: order.meal_boxes || [],
      special_instructions: order.special_instructions || ''
    }));

    // Sort by ID (oldest first)
    data.sort((a, b) => (a.id || 0) - (b.id || 0));

    // Pagination
    const perPage = 5;
    const total = data.length;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const start = (page - 1) * perPage;
    const paginated = data.slice(start, start + perPage);

    res.render("json-catering", { data, paginated, total, page, perPage, saved: req.query.saved });
  } catch (error) {
    console.error('Error loading catering orders:', error);
    res.status(500).send('Error loading catering orders');
  }
});

// --- POST update ---
router.post("/", async (req, res) => {
  try {
    const orderId = parseInt(req.body.order_id);
    const page = parseInt(req.query.page) || 1;

    if (isNaN(orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    // Convert arrays back to database format
    function makeItemsArray(names, qtys) {
      if (!names) return [];
      const list = Array.isArray(names) ? names : [names];
      const qlist = Array.isArray(qtys) ? qtys : [qtys];
      const items = [];
      for (let i = 0; i < list.length; i++) {
        if (list[i] && list[i].trim() !== "") {
          items.push({
            item: list[i].trim(),
            qty: parseInt(qlist[i]) || 1
          });
        }
      }
      return items;
    }

    // Build update object with email order database fields
    const updates = {
      order_date: req.body.date || null,
      order_type: req.body.order_type || null,
      order_time: req.body.time || null,
      destination: req.body.destination || null,
      customer_name: req.body.customer_name || null,
      phone_number: req.body.phone_number || null,
      customer_email: req.body.customer_email || null,
      guest_count: req.body.guest_count || null,
      paper_goods: req.body.paper_goods || null,
      total: req.body.total || null,
      special_instructions: req.body.special_instructions || null,
      // Convert arrays back to JSONB format for email orders
      food_items: makeItemsArray(req.body.food_items, req.body.food_qty),
      drink_items: makeItemsArray(req.body.drink_items, req.body.drink_qty),
      sauces_dressings: makeItemsArray(req.body.sauce_items, req.body.sauce_qty)
    };

    // Remove any undefined values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined || updates[key] === null) {
        delete updates[key];
      }
    });

    await emailOrderDB.updateStatus(orderId, updates);

    res.redirect(`/json-catering?page=${page}&saved=1`);
  } catch (error) {
    console.error('Error updating catering order:', error);
    res.status(500).send('Error updating catering order');
  }
});

module.exports = router;
