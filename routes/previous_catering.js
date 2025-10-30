const express = require("express");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const router = express.Router();
const cateringFile = path.join(__dirname, "..", "data", "catering.json");

// --- JSON helpers ---
function loadRows() {
  if (!fs.existsSync(cateringFile)) return [];

  try {
    const cateringData = JSON.parse(fs.readFileSync(cateringFile, "utf8"));
    
    // Convert JSON objects to array format for template compatibility
    return cateringData.map(order => [
      order.id,
      order.orderDate,
      order.organization,
      order.numSandwiches,
      order.otherItems,
      order.sauces,
      order.cost,
      order.paid ? 1 : 0,
      order.orderType,
      order.timeOfDay,
      order.contactName,
      order.contactPhone,
      order.pickles,
      order.numBags,
      order.creator,
      order.lastEditedBy || ""
    ]);
  } catch (e) {
    console.error('Failed to parse catering.json', e);
    return [];
  }
}

function saveRows(rows) {
  // Convert array format back to JSON objects
  const cateringData = rows.map(row => ({
    id: parseInt(row[0]) || 0,
    orderDate: row[1] || '',
    organization: row[2] || '',
    numSandwiches: parseInt(row[3]) || 0,
    otherItems: row[4] || '',
    sauces: row[5] || '',
    cost: parseFloat(row[6]) || 0,
    paid: row[7] == 1,
    orderType: row[8] || '',
    timeOfDay: row[9] || '',
    contactName: row[10] || '',
    contactPhone: row[11] || '',
    pickles: row[12] || 'no',
    numBags: parseInt(row[13]) || 0,
    creator: row[14] || '',
    lastEditedBy: row[15] || ''
  }));
  
  const tmp = cateringFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cateringData, null, 2), 'utf8');
  fs.renameSync(tmp, cateringFile);
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
router.get("/edit-catering", (req, res) => {
  const rows = loadRows();
  const { displayRows, total, page } = paginate(req, rows);
  const message = req.query.msg || "";
  res.render("edit-catering", { displayRows, total, page, message });
});

// POST edits or deletes
router.post("/edit-catering", (req, res) => {
  let rows = loadRows();
  const id = parseInt(req.body.id);
  const action = req.body.action;
  let message = "";

  if (id < 1 || id > rows.length) {
    message = "Invalid ID.";
    return res.redirect(`edit-catering?msg=${encodeURIComponent(message)}`);
  }

  if (action === "delete") {
    rows.splice(id - 1, 1);
    rows.forEach((row, i) => (row[0] = i + 1));
    message = "Order deleted successfully.";
  }

  if (action === "edit") {
    const row = rows[id - 1];
    row[1] = req.body.date || row[1];
    row[2] = req.body.org || row[2];
    row[3] = parseInt(req.body.sandwiches || row[3] || 0);

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

    row[4] = otherRaw;
    row[6] = row[3] * 5 + otherCount * 3;
    row[7] = req.body.paid ? 1 : 0;
    row[8] = req.body.orderType || row[8];
    row[9] = req.body.timeOfDay || row[9];
    row[10] = req.body.contactName || row[10];
    row[11] = req.body.contactPhone || row[11];
    row[12] = req.body.pickles || row[12];
    row[13] = req.body.numBags || row[13];
    row[5] = Array.isArray(req.body.sauces) ? req.body.sauces.join(";") : "";

    const editorIndex = 15;
    while (row.length <= editorIndex) row.push("");
    if (req.session.firstName && req.session.lastName) {
      row[editorIndex] = `${req.session.firstName} ${req.session.lastName}`;
    }

    message = "Order updated successfully.";
  }

  saveRows(rows);
  const page = parseInt(req.query.page) || 1;
  res.redirect(`edit-catering?page=${page}&msg=${encodeURIComponent(message)}`);
});

module.exports = router;
