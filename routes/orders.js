const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const ordersJsonPath = path.join(__dirname, "..", "data", "orders.json");
const csvPath = path.join(__dirname, "..", "data", "catering.txt");

// --- Read CSV orders ---
function readCsvOrders() {
  if (!fs.existsSync(csvPath)) return [];
  const content = fs.readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/);
  const orders = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const data = line.split(",");
    orders.push({
      uid: "csv_" + (data[0] || Math.random().toString(36).substr(2, 9)),
      id: data[0] || "",
      date: data[1] || new Date().toISOString().split("T")[0],
      team: data[2] || "",
      sandwiches: data[3] || "N/A",
      food_items: data[4] || "N/A",
      sauces_dressings: data[5] || "N/A",
      hotbags: data[13] || "N/A",
      pickles: data[12] || "N/A",
      created_by: data[10] || "",
      time: formatTime12h(data[9] || ""),
      method: data[8] || "",
      contact: data[10] || "",
      phone: data[11] || ""
      ,
      // optional fields at the end of the CSV (new columns)
      special_instructions: data[14] || "",
      paid: (typeof data[15] !== 'undefined') ? String(data[15]).toLowerCase() === 'true' || String(data[15]).toLowerCase().startsWith('paid') : false,
      completed_boh: (typeof data[16] !== 'undefined') ? String(data[16]).toLowerCase() === 'true' || String(data[16]).toLowerCase().startsWith('complete') : false,
      completed_foh: (typeof data[17] !== 'undefined') ? String(data[17]).toLowerCase() === 'true' || String(data[17]).toLowerCase().startsWith('complete') : false,
    });
  }

  return orders;
}

// --- Read JSON orders ---
function readJsonOrders() {
  if (!fs.existsSync(ordersJsonPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(ordersJsonPath, "utf8"));
  } catch {
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

// --- Process JSON order ---
function processJsonOrder(order) {
  const sandwichesList = [];
  const otherFoodItems = [];
  const drinkList = flattenItems(order.drink_items);
  const mealBoxList = flattenItems(order.meal_boxes);
  const saucesList = flattenItems(order.sauces_dressings); 

  (order.food_items || []).forEach(f => {
    const text = `${f.qty || 1} x ${f.item}`;
    const lower = f.item.toLowerCase();
    if (lower.includes("sandwich") || lower.includes("hot")) sandwichesList.push(text);
    else otherFoodItems.push(text);
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
    pickles: sandwichesList.length ? "Yes" : "No",
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
router.get("/", (req, res) => {
  const csvOrders = readCsvOrders();
  const jsonOrdersRaw = readJsonOrders();
  const jsonOrders = jsonOrdersRaw.map(processJsonOrder);
  const allOrders = [...jsonOrders, ...csvOrders];

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
});

// --- API: update an order's paid/completed status ---
router.post('/update', (req, res) => {
  const body = req.body || {};
  const { source, id, paid, completed_boh, completed_foh } = body;

  if (!source || !id) return res.status(400).json({ success: false, error: 'source and id required' });

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

  if (source === 'csv') {
    try {
      const raw = fs.readFileSync(csvPath, 'utf8');
      const lines = raw.split(/\r?\n/);
      let found = false;
      const newLines = lines.map(line => {
        if (!line.trim()) return line;
        const cols = line.split(',');
        if (String(cols[0]) === String(id)) {
          // ensure we have at least up to index 17
          while (cols.length <= 17) cols.push('');
          if (typeof paid !== 'undefined') cols[15] = paid ? 'true' : 'false';
          if (typeof completed_boh !== 'undefined') cols[16] = completed_boh ? 'true' : 'false';
          if (typeof completed_foh !== 'undefined') cols[17] = completed_foh ? 'true' : 'false';
          found = true;
          return cols.join(',');
        }
        return line;
      });
      if (!found) return res.status(404).json({ success: false, error: 'order not found' });
      fs.writeFileSync(csvPath, newLines.join('\n'), 'utf8');
      return res.json({ success: true });
    } catch (err) {
      console.error('Error updating CSV orders', err);
      return res.status(500).json({ success: false, error: 'write-failed' });
    }
  }

  return res.status(400).json({ success: false, error: 'unknown source' });
});

module.exports = router;
