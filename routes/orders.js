const express = require("express");
const fs = require("fs");
const path = require("path");
const { cateringOrderDB, emailOrderDB } = require('../database/db');
const router = express.Router();

const ordersJsonPath = path.join(__dirname, "..", "data", "orders.json");

// --- Read catering orders from database ---
async function readCateringOrders() {
  try {
    const cateringData = await cateringOrderDB.getAll();
    return cateringData.map(order => ({
      uid: "catering_" + order.id,
      id: order.id || "",
      date: order.order_date || new Date().toISOString().split("T")[0],
      team: order.organization || "",
      sandwiches: order.num_sandwiches || "N/A",
      food_items: order.other_items || "N/A",
      sauces_dressings: order.sauces || "N/A",
      hotbags: order.num_bags || "N/A",
      pickles: order.pickles || "N/A",
      created_by: order.creator || "",
      time: formatTime12h(order.time_of_day || ""),
      method: order.order_type || "",
      contact: order.contact_name || "",
      phone: order.contact_phone || "",
      special_instructions: "",
      paid: order.paid || false,
      completed_boh: order.completed_boh || false,
      completed_foh: order.completed_foh || false,
    }));
  } catch (e) {
    console.error('Failed to read catering orders from database', e);
    return [];
  }
}

// --- Read email orders from database ---
async function readEmailOrders() {
  try {
    const emailOrders = await emailOrderDB.getAll();
    return emailOrders.map(order => ({
      ...order,
      date: order.order_date,
      time: order.order_time,
      orderType: order.order_type
    }));
  } catch (error) {
    console.error('Failed to read email orders from database', error);
    return [];
  }
}

function formatTime12h(time24) {
  if (!time24) return '';
  if (/am|pm/i.test(time24)) return time24;
  const [hours, minutes] = time24.split(':').map(Number);
  const d = new Date();
  d.setHours(hours);
  d.setMinutes(minutes || 0);
  return d.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}


// --- Flatten helper ---
function flattenItems(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(i => {
    if (typeof i === "object" && i.item) return `${i.qty || 1} x ${i.item}`;
    return i;
  });
}

// --- Check if pickles are needed for email orders ---
function checkPicklesNeeded(order, sandwichesList, otherFoodItems) {
  // Check all possible places where "side of pickles" might appear
  const allItems = [];
  
  // Add food items
  if (order.food_items && Array.isArray(order.food_items)) {
    order.food_items.forEach(f => {
      if (f && f.item) allItems.push(f.item.toLowerCase());
    });
  }
  
  // Add meal box items
  if (order.meal_boxes && Array.isArray(order.meal_boxes)) {
    order.meal_boxes.forEach(m => {
      if (m && m.item) allItems.push(m.item.toLowerCase());
    });
  }
  
  // Add drink items (in case pickles are listed there)
  if (order.drink_items && Array.isArray(order.drink_items)) {
    order.drink_items.forEach(d => {
      if (d && d.item) allItems.push(d.item.toLowerCase());
    });
  }
  
  // Add sauces/dressings (in case pickles are listed there)
  if (order.sauces_dressings && Array.isArray(order.sauces_dressings)) {
    order.sauces_dressings.forEach(s => {
      if (s && s.item) allItems.push(s.item.toLowerCase());
    });
  }
  
  // Check if any item contains "pickles" (not just "side of pickles")
  const hasPicklesItem = allItems.some(item => 
    item.includes('pickle') || item.includes('pickles')
  );
  
  // Only return "Yes" if pickles are explicitly mentioned in the order
  return hasPicklesItem ? "Yes" : "No";
}

// --- Process JSON order ---
function processJsonOrder(order) {
  const sandwichesList = [];
  const otherFoodItems = [];
  const drinkList = flattenItems(order.drink_items);
  const mealBoxList = flattenItems(order.meal_boxes);
  const saucesList = flattenItems(order.sauces_dressings); 

  // Process food_items - these should NOT include meal boxes (those are in order.meal_boxes)
  // BUT we need to handle the case where parsers didn't catch them
  (order.food_items || []).forEach(f => {
    const itemName = f.item || '';
    const text = `${f.qty || 1} x ${itemName}`;
    const lower = itemName.toLowerCase();
    
    // Double-check if this is actually a meal box that should be in meal_boxes
    // This handles cases where the parser missed it
    if (lower.includes('meal') || lower.includes('box') || lower.includes('boxed') || 
        lower.includes('package') || lower.includes('packaged')) {
      mealBoxList.push(text);
    }
    // Check if it's a sandwich (but not a packaged meal sandwich)
    else if (lower.includes("sandwich") || lower.includes("hot")) {
      sandwichesList.push(text);
    }
    // Everything else goes to other food items
    else {
      otherFoodItems.push(text);
    }
  });

  return {
    // use stable uid based on order.id when available so UI actions can map back
    uid: "json_" + (order.id || Math.random().toString(36).substr(2, 9)),
    id: order.id || '',
    date: order.date || new Date().toISOString().split("T")[0],
    team: order.customer_name || order.team || "N/A",
    sandwiches: sandwichesList.length ? sandwichesList.join("<br>") : "N/A",
    food_items: otherFoodItems.length ? otherFoodItems.join("<br>") : "N/A",
    drinks: drinkList.length ? drinkList.join("<br>") : "N/A",
    meal_boxes: mealBoxList.length ? mealBoxList.join("<br>") : "N/A",
    hotbags: order.hotbags || "N/A",
    pickles: checkPicklesNeeded(order, sandwichesList, otherFoodItems),
    guest_count: order.guest_count || "N/A",
    paper_goods: order.paper_goods || "No",
    created_by: order.customer_email || order.created_by || "",
    time: order.time || "",
    method: order.order_type || order.method || "",
    contact: order.customer_name || order.contact || "",
    phone: order.phone_number || order.phone || "",
    sauces_dressings: saucesList.length ? saucesList.join("<br>") : "N/A",
    special_instructions: order.special_instructions || order.instructions || "",
    delivery_address: order.destination || order.delivery_address || "",
    // new flags (default to false)
    paid: !!order.paid || false,
    completed_boh: !!order.completed_boh || false,
    completed_foh: !!order.completed_foh || false
  };
}

// --- GET /orders ---
router.get("/", async (req, res) => {
  try {
    const cateringOrders = await readCateringOrders();
    const emailOrdersRaw = await readEmailOrders();
    const emailOrders = emailOrdersRaw.map(processJsonOrder);
    const allOrders = [...emailOrders, ...cateringOrders];

  // Determine view mode from query params (defaults to 'boh')
  const viewMode = req.query.view || 'boh'; // 'boh' or 'foh'

  // Get today's date in Eastern Time
  const etToday = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split(',')[0];  // This gives us MM/DD/YYYY
  
  // Convert to YYYY-MM-DD format for comparison
  const [month, day, year] = etToday.split('/');
  const todayStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  const todaysOrders = allOrders.filter(o => {
    if (!o.date) return false;
    // Normalize date format to YYYY-MM-DD for comparison
    const orderDate = new Date(o.date);
    if (isNaN(orderDate)) return false;
    const orderDateStr = orderDate.toISOString().split('T')[0];
    return orderDateStr === todayStr;
  });

 // --- Time parsing helper ---
function parseTimeToDate(timeStr) {
  if (!timeStr) return new Date("1970-01-01T00:00:00");
  
  // Already 24-hour format (e.g. "22:00")
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return new Date(`1970-01-01T${timeStr}:00`);
  }

  // 12-hour format with AM/PM (e.g. "10:30 PM")
  if (/(\d{1,2}):?(\d{2})?\s*(am|pm)/i.test(timeStr)) {
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    let hours = parseInt(match[1]);
    let minutes = parseInt(match[2] || 0);
    const meridian = match[3].toLowerCase();
    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
    return new Date(1970, 0, 1, hours, minutes, 0);
  }

  // fallback — treat unknown strings as midnight
  return new Date("1970-01-01T00:00:00");
}

// --- Sort by parsed time safely ---
todaysOrders.sort((a, b) => parseTimeToDate(a.time) - parseTimeToDate(b.time));


  const traySizes = {
  "nuggets tray": {
    Small: { tray: '10"', amount: 64 },
    Medium: { tray: '14"', amount: 120 },
    Large: { tray: '16"', amount: 200 }
  },
  "strip tray": {
    Small: { tray: '10"', amount: 24 },
    Medium: { tray: '10"', amount: 45 },
    Large: { tray: '10"', amount: 75 }
  },
  "cool wrap tray": {
    Small: { halves: 6 },
    Medium: { halves: 10 },
    Large: { halves: 14 }
  },
  "garden salad tray": {
    Small: { tray: '10"', lettuce: '2 oz', tomatoes: 10 },
    Large: { tray: '14"', lettuce: '4 oz', tomatoes: 20 }
  },
  "chocolate chunk cookie tray": {
    Small: { tray: '10"', amount: 12 },
    Large: { tray: '14"', amount: 24 }
  },
  "chocolate fudge brownie tray": {
    Small: { tray: '10"', amount: 12 },
    Large: { tray: '14"', amount: 24 }
  },
  "mixed cookie & brownie tray": {
    Small: { tray: '10"', cookies: 6, brownies: 6 },
    Large: { tray: '14"', cookies: 12, brownies: 12 }
  },
  "mac & cheese tray": {
    Small: { "Aluminum Pan/Lid": "Half Size x1", "Mac & Cheese": "Full Batch" },
    Large: { "Aluminum Pan/Lid": "Half Size x2", "Mac & Cheese": "2 Full Batches" }
  },
  "chick-n-mini tray": {
    "20": { tray: '10"', amount: 20 },
    "40": { tray: '14"', amount: 40 }
  },
  "fruit tray": {
    Small: {
      tray: '10"',
      "bottom layer": "Red and Green Apples ~ 12oz, Mandarin Oranges ~ 6oz, Strawberry Halves ~ 6oz, Blueberries ~ 1.5",
      "top layer": "Red and Green Apples ~ 12oz, Mandarin Oranges ~ 6oz, Strawberry Halves ~ 6oz, Blueberries ~ 1.5"
    },
    Large: {
      tray: '14"',
      "bottom layer": "Red and Green Apples ~ 1lb 8oz, Mandarin Oranges ~ 13oz, Strawberry Halves ~ 13oz, Blueberries ~ 2",
      "top layer": "Red and Green Apples ~ 1lb 8oz, Mandarin Oranges ~ 13oz, Strawberry Halves ~ 13oz, Blueberries ~ 2"
    }
  }
};

traySizes["cool wrap® tray"] = traySizes["cool wrap tray"];
traySizes["wraps tray"] = traySizes["cool wrap tray"];
traySizes["strips tray"] = traySizes["strip tray"];
traySizes["cookie tray"] = traySizes["chocolate chunk cookie tray"];
traySizes["brownie tray"] = traySizes["chocolate fudge brownie tray"];
traySizes["combo dessert tray"] = traySizes["mixed cookie & brownie tray"];
traySizes["Chick-n-Strips® Tray"] = traySizes["strip tray"];

  // Format date in Eastern Time
  const etDate = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  res.render("orders", {
    orders: todaysOrders,
    traySizes,
    todayStr: etDate,
    viewMode: viewMode
  });
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).send('Error loading orders');
  }
});

// --- API: update an order's paid/completed status ---
router.post('/update', async (req, res) => {
  try {
    const body = req.body || {};
    const { source, id, paid, completed_boh, completed_foh } = body;

    if (!source || !id) return res.status(400).json({ success: false, error: 'source and id required' });

    if (source === 'email') {
      // Update email orders in database
      const updates = {};
      if (typeof paid !== 'undefined') updates.paid = !!paid;
      if (typeof completed_boh !== 'undefined') updates.completed_boh = !!completed_boh;
      if (typeof completed_foh !== 'undefined') updates.completed_foh = !!completed_foh;
      
      await emailOrderDB.updateStatus(id, updates);
      return res.json({ success: true });
    }

    if (source === 'json') {
    // update data/orders.json
    try {
      const raw = fs.readFileSync(ordersJsonPath, 'utf8');
      const arr = JSON.parse(raw);
      let found = false;
      for (let o of arr) {
        if (String(o.id) === String(id)) {
          if (typeof paid !== 'undefined') o.paid = !!paid;
          if (typeof completed_boh !== 'undefined') o.completed_boh = !!completed_boh;
          if (typeof completed_foh !== 'undefined') o.completed_foh = !!completed_foh;
          found = true;
          break;
        }
      }
      if (!found) return res.status(404).json({ success: false, error: 'order not found' });
      fs.writeFileSync(ordersJsonPath, JSON.stringify(arr, null, 2), 'utf8');
      return res.json({ success: true });
    } catch (err) {
      console.error('Error updating JSON orders', err);
      return res.status(500).json({ success: false, error: 'write-failed' });
    }
  }

  if (source === 'catering') {
    // Update catering orders in database
    const updates = {};
    if (typeof paid !== 'undefined') updates.paid = !!paid;
    if (typeof completed_boh !== 'undefined') updates.completed_boh = !!completed_boh;
    if (typeof completed_foh !== 'undefined') updates.completed_foh = !!completed_foh;
    
    await cateringOrderDB.updateStatus(id, updates);
    return res.json({ success: true });
  }

  return res.status(400).json({ success: false, error: 'unknown source' });
  } catch (error) {
    console.error('Error updating order:', error);
    return res.status(500).json({ success: false, error: 'server error' });
  }
});

module.exports = router;
