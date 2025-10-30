const express = require("express");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const router = express.Router();
const csvFile = path.join(__dirname, "..", "data", "catering.txt");

// --- CSV helpers ---
function loadRows() {
  if (!fs.existsSync(csvFile)) return [];

  const fileContent = fs.readFileSync(csvFile, "utf8");
  if (!fileContent.trim()) return [];

  // ✅ Safe parsing: allow flexible column counts
  const rows = parse(fileContent, {
    delimiter: ",",
    quote: '"',
    escape: "\\",
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true, // <-- prevents "Invalid Record Length" error
  });

  // ✅ Normalize all rows to 16 columns
  rows.forEach((row) => {
    while (row.length < 16) row.push("");
    if (row.length > 16) row.length = 16;
  });

  return rows;
}

function saveRows(rows) {
  const csvData = stringify(rows, { quoted: true });
  fs.writeFileSync(csvFile, csvData, "utf8");
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
