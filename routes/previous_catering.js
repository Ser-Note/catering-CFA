const express = require("express");
const { cateringOrderDB } = require("../database/db");

const router = express.Router();

// --- JSON helpers (converted to database operations) ---
async function loadRows() {
  try {
    const orders = await cateringOrderDB.getAll();
    
    // Convert database objects to array format for template compatibility
    return orders.map(order => [
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
      order.creator,
      order.last_edited_by || ""
    ]);
  } catch (e) {
    console.error('Failed to load catering orders from database', e);
    return [];
  }
}

async function saveRows(rows) {
  // This function is no longer needed as we're using database operations directly
  // Individual updates are handled through cateringOrderDB.update()
}

// --- Pagination helper ---
function paginate(req, rows, perPage = 5) {
  const total = rows.length;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const start = (page - 1) * perPage;
  const displayRows = rows.slice(start, start + perPage);
  return { displayRows, total, page };
}

// --- Routes ---

// GET edit/delete page
router.get("/edit-catering", async (req, res) => {
  try {
    const rows = await loadRows();
    const { displayRows, total, page } = paginate(req, rows);
    const message = req.query.msg || "";
    res.render("edit-catering", { displayRows, total, page, message });
  } catch (error) {
    console.error("Error loading catering orders:", error);
    res.status(500).send("Server Error while loading catering data.");
  }
});

// POST edits or deletes
router.post("/edit-catering", async (req, res) => {
  try {
    const id = parseInt(req.body.id);
    const action = req.body.action;
    let message = "";

    if (action === "delete") {
      await cateringOrderDB.delete(id);
      message = "Order deleted successfully.";
    }

    if (action === "edit") {
      const otherRaw = (req.body.other || "").trim();
      let otherCount = 0;
      const otherEntries =
        otherRaw === "" ? [] : otherRaw.split(";").map((s) => s.trim()).filter(Boolean);

      for (const entry of otherEntries) {
        if (!entry) continue;
        if (entry.includes(":")) {
          const parts = entry.split(":");
          otherCount += parseInt(parts[1].trim()) || 0;
        } else {
          otherCount += 1;
        }
      }

      const cost = parseInt(req.body.sandwiches || 0) * 5 + otherCount * 3;

      const updates = {
        order_date: req.body.date || null,
        organization: req.body.org || '',
        num_sandwiches: parseInt(req.body.sandwiches || 0),
        other_items: req.body.other || '',
        cost: cost,
        paid: req.body.paid ? true : false,
        order_type: req.body.orderType || '',
        time_of_day: req.body.timeOfDay || '',
        contact_name: req.body.contactName || '',
        contact_phone: req.body.contactPhone || '',
        pickles: req.body.pickles || 'no',
        num_bags: parseInt(req.body.numBags || 0),
        sauces: Array.isArray(req.body.sauces) ? req.body.sauces.join(";") : "",
        last_edited_by: (req.session.firstName && req.session.lastName) ? 
          `${req.session.firstName} ${req.session.lastName}` : null
      };

      await cateringOrderDB.update(id, updates);
      message = "Order updated successfully.";
    }

    const page = parseInt(req.query.page) || 1;
    res.redirect(`edit-catering?page=${page}&msg=${encodeURIComponent(message)}`);
  } catch (error) {
    console.error("Error updating catering order:", error);
    const page = parseInt(req.query.page) || 1;
    res.redirect(`edit-catering?page=${page}&msg=${encodeURIComponent("Error updating order.")}`);
  }
});

module.exports = router;
