const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const jsonFile = path.join(__dirname, "..", "data", "orders.json");

// Ensure file exists
if (!fs.existsSync(jsonFile)) {
  fs.writeFileSync(jsonFile, JSON.stringify([], null, 2));
}

// --- Helper functions ---
function loadOrders() {
  const data = fs.readFileSync(jsonFile, "utf8");
  try {
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function saveOrders(data) {
  fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
}

// --- GET list page ---
router.get("/", (req, res) => {
  let data = loadOrders();

  // Delete request
  if (req.query.delete !== undefined) {
    const deleteIndex = parseInt(req.query.delete);
    if (!isNaN(deleteIndex) && data[deleteIndex]) {
      data.splice(deleteIndex, 1);
      data = data.map((order, i) => ({ ...order, id: i + 1 }));
      saveOrders(data);
      const page = parseInt(req.query.page) || 1;
      return res.redirect(`/json-catering?page=${page}`);
    }
  }

  // Sort by ID
  data.sort((a, b) => (a.id || 0) - (b.id || 0));

  // Pagination
  const perPage = 5;
  const total = data.length;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const start = (page - 1) * perPage;
  const paginated = data.slice(start, start + perPage);

  res.render("json-catering", { data, paginated, total, page, perPage, saved: req.query.saved });
});

// --- POST update ---
router.post("/", (req, res) => {
  const data = loadOrders();
  const index = parseInt(req.body.index);
  const page = parseInt(req.query.page) || 1;

  if (isNaN(index) || !data[index]) {
    return res.status(400).send("Invalid index");
  }

  const updated = { ...data[index] };

  updated.order_type = req.body.order_type || updated.order_type;
  updated.date = req.body.date || updated.date;
  updated.time = req.body.time || updated.time;
  updated.destination = req.body.destination || updated.destination;
  updated.customer_name = req.body.customer_name || updated.customer_name;
  updated.phone_number = req.body.phone_number || updated.phone_number;
  updated.customer_email = req.body.customer_email || updated.customer_email;
  updated.guest_count = req.body.guest_count || updated.guest_count;
  updated.paper_goods = req.body.paper_goods || updated.paper_goods;
  updated.total = req.body.total || updated.total;

  // Convert arrays
  function makeItems(names, qtys) {
    const arr = [];
    if (!names) return arr;
    const list = Array.isArray(names) ? names : [names];
    const qlist = Array.isArray(qtys) ? qtys : [qtys];
    for (let i = 0; i < list.length; i++) {
      if (list[i].trim() !== "") {
        arr.push({ item: list[i].trim(), qty: parseInt(qlist[i]) || 0 });
      }
    }
    return arr;
  }

  updated.food_items = makeItems(req.body.food_items, req.body.food_qty);
  updated.drink_items = makeItems(req.body.drink_items, req.body.drink_qty);
  updated.sauces_dressings = makeItems(req.body.sauce_items, req.body.sauce_qty);

  data[index] = updated;
  saveOrders(data);

  res.redirect(`/json-catering?page=${page}&saved=1`);
});

module.exports = router;
