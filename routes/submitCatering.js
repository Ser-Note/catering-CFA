// routes/submitCatering.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const dataFile = path.join(__dirname, "..", "data", "orders.json");

// Helper: read existing orders or create empty array
function readOrders() {
  if (!fs.existsSync(dataFile)) return [];
  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    return JSON.parse(raw) || [];
  } catch (err) {
    console.error("❌ Error reading orders.json:", err);
    return [];
  }
}

// Helper: write orders array to file
function writeOrders(orders) {
  fs.writeFileSync(dataFile, JSON.stringify(orders, null, 2), "utf8");
}

// Helper: generate new order ID
function getNextId(orders) {
  if (!orders.length) return 1;
  return Math.max(...orders.map(o => o.id || 0)) + 1;
}

// --- POST route ---
router.post("/submit", (req, res) => {
  try {
    const orders = readOrders();
    const newId = getNextId(orders);

    const user = req.session
      ? `${req.session.firstName || ""} ${req.session.lastName || ""}`.trim()
      : "Anonymous";

    // Build new order object in the format you want
    const newOrder = {
      id: newId,
      order_type: req.body.order_type || "Pickup",
      date: req.body.date || "N/A",
      time: req.body.time || "N/A",
      destination: req.body.destination || "N/A",
      customer_name: req.body.customer_name || "N/A",
      phone_number: req.body.phone_number || "N/A",
      customer_email: req.body.customer_email || "N/A",
      guest_count: req.body.guest_count || "N/A",
      paper_goods: req.body.paper_goods || "No",
      food_items: req.body.food_items || [],
      meal_boxes: req.body.meal_boxes || [],
      drink_items: req.body.drink_items || [],
      sauces_dressings: req.body.sauces_dressings || [],
      total: req.body.total || "$0.00",
    };

    orders.push(newOrder);
    writeOrders(orders);

    console.log(`✅ New order #${newId} saved by ${user}`);
    res.json({ success: true, id: newId });
  } catch (err) {
    console.error("❌ Error saving order:", err);
    res.status(500).json({ success: false, error: "Server error while saving order." });
  }
});

module.exports = router;
