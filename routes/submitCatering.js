// routes/submitCatering.js
const express = require("express");
const { emailOrderDB } = require('../database/db');

const router = express.Router();

// --- POST route ---
router.post("/submit", async (req, res) => {
  try {
    const user = req.session
      ? `${req.session.firstName || ""} ${req.session.lastName || ""}`.trim()
      : "Anonymous";

    // Build new order object for email_orders table
    const newOrder = {
      order_type: req.body.order_type || "Pickup",
      order_date: req.body.date || new Date().toISOString().split('T')[0],
      order_time: req.body.time || "N/A",
      destination: req.body.destination || "N/A",
      customer_name: req.body.customer_name || "N/A",
      phone_number: req.body.phone_number || "N/A",
      customer_email: req.body.customer_email || "N/A",
      guest_count: req.body.guest_count || "N/A",
      paper_goods: req.body.paper_goods || "No",
      special_instructions: req.body.special_instructions || "",
      food_items: req.body.food_items || [],
      meal_boxes: req.body.meal_boxes || [],
      drink_items: req.body.drink_items || [],
      sauces_dressings: req.body.sauces_dressings || [],
      total: req.body.total || "$0.00",
      paid: false,
      completed_boh: false,
      completed_foh: false
    };

    // Save to database
    const savedOrder = await emailOrderDB.create(newOrder);

    console.log(`✅ New order #${savedOrder.id} saved to database by ${user}`);
    res.json({ success: true, id: savedOrder.id });
  } catch (err) {
    console.error("❌ Error saving order to database:", err);
    res.status(500).json({ success: false, error: "Server error while saving order." });
  }
});

module.exports = router;
