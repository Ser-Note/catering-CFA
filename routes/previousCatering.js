const express = require("express");
const fs = require("fs");
const path = require("path");
// CSV parsing no longer needed for JSON files

const router = express.Router();

// ✅ Correct file path (no leading slash)
const cateringFile = path.join(__dirname, "..", "data", "catering.json");

router.get("/", (req, res) => {
  try {
    // 1️⃣ Check file existence
    if (!fs.existsSync(cateringFile)) {
      console.warn("⚠️ catering.json not found:", cateringFile);
      return res.render("catering", { rows: [] });
    }

    // 2️⃣ Read file contents
    const cateringData = JSON.parse(fs.readFileSync(cateringFile, "utf8"));

    // 3️⃣ Convert JSON objects to array format for template compatibility
    const rows = cateringData.map(order => [
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
      order.creator
    ]);

    // 4️⃣ Render template
    res.render("catering", { rows });

  } catch (error) {
    console.error("🚨 Error reading catering file:", error);
    res.status(500).send("Server Error while loading catering data.");
  }
});

module.exports = router;
