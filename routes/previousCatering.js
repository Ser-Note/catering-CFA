const express = require("express");
const { cateringOrderDB } = require("../database/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Get all catering orders from database
    const orders = await cateringOrderDB.getAll();

    // Convert to array format for template compatibility
    const rows = orders.map(order => [
      order.id,
      order.order_date,
      order.organization,
      order.num_sandwiches,
      order.other_items,
      order.sauces,
      order.cost,
      order.paid ? 1 : 0,
      order.order_type,
      order.time_of_day,
      order.contact_name,
      order.contact_phone,
      order.pickles,
      order.num_bags,
      order.creator
    ]);

    // Render template
    res.render("catering", { rows });

  } catch (error) {
    console.error("🚨 Error reading catering orders from database:", error);
    res.status(500).send("Server Error while loading catering data.");
  }
});

module.exports = router;
