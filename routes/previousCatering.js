const express = require("express");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const router = express.Router();

// ✅ Correct file path (no leading slash)
const csvFile = path.join(__dirname, "..", "data", "catering.txt");

router.get("/", (req, res) => {
  try {
    // 1️⃣ Check file existence
    if (!fs.existsSync(csvFile)) {
      console.warn("⚠️ catering.txt not found:", csvFile);
      return res.render("catering", { rows: [] });
    }

    // 2️⃣ Read file contents
    const fileContent = fs.readFileSync(csvFile, "utf8");

    // 3️⃣ Parse CSV content safely
    const rows = parse(fileContent, {
      delimiter: ",",
      quote: '"',
      escape: "\\",
      trim: true,
      relax_column_count: true,       // allow uneven rows
      skip_records_with_error: true,  // skip bad lines
    });

    // 4️⃣ Render template
    res.render("catering", { rows });

  } catch (error) {
    console.error("🚨 Error reading catering file:", error);
    res.status(500).send("Server Error while loading catering data.");
  }
});

module.exports = router;
