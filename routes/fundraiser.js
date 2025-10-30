const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const csvFile = path.join(__dirname, '..', 'data', 'catering.txt');

// Helper to append CSV row
function appendCSVRow(row) {
    const line = row.join(',') + '\n';
    fs.appendFileSync(csvFile, line, 'utf8');
}

// Show fundraiser form
router.get('/', (req, res) => {
    if (!req.session.firstName || !req.session.lastName) {
        return res.send("Error: You must be logged in to access this page.");
    }

    res.render('fundraiser', {
        firstName: req.session.firstName,
        lastName: req.session.lastName
    });
});

// Handle form submission
router.post('/submit', (req, res) => {
    const data = req.body;

    // Calculate cost
    let cost = parseInt(data.numSandwiches || 0) * 5;

    // Parse "other" items from hidden field
    let otherItemsStr = data.other || '';
    if (otherItemsStr) {
        const items = otherItemsStr.split(';');
        items.forEach(item => {
            const [name, qty] = item.split(':').map(x => x.trim());
            if (name && qty) cost += parseInt(qty) * 3;
        });
    }

    // Sauces
    let sauces = Array.isArray(data.sauces) ? data.sauces.join('; ') : '';

    // Get next ID
    let rows = [];
    if (fs.existsSync(csvFile)) {
        rows = fs.readFileSync(csvFile, 'utf8').split('\n').filter(Boolean);
    }
    const newId = rows.length + 1;

    // Creator
    const creator = `${req.session.firstName} ${req.session.lastName}`;

    // Build CSV row
    const newRow = [
        newId,
        data.orderDate || '',
        data.organization || '',
        data.numSandwiches || 0,
        otherItemsStr,
        sauces,
        cost,
        data.paid ? 1 : 0,
        data.orderType || '',
        data.timeOfDay || '',
        data.contactName || '',
        data.contactPhone || '',
        data.pickles || 'no',
        data.numBags || 0,
        creator
    ];

    appendCSVRow(newRow);

    res.redirect('/options'); // redirect back like PHP
});

module.exports = router;
