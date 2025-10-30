const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const cateringFile = path.join(__dirname, '..', 'data', 'catering.json');

// Helper to add catering order
function addCateringOrder(orderData) {
    let cateringData = [];
    if (fs.existsSync(cateringFile)) {
        try {
            cateringData = JSON.parse(fs.readFileSync(cateringFile, 'utf8'));
        } catch (e) {
            cateringData = [];
        }
    }
    
    cateringData.push(orderData);
    
    const tmp = cateringFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(cateringData, null, 2), 'utf8');
    fs.renameSync(tmp, cateringFile);
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
    let cateringData = [];
    if (fs.existsSync(cateringFile)) {
        try {
            cateringData = JSON.parse(fs.readFileSync(cateringFile, 'utf8'));
        } catch (e) {
            cateringData = [];
        }
    }
    const newId = cateringData.length + 1;

    // Creator
    const creator = `${req.session.firstName} ${req.session.lastName}`;

    // Build order object
    const newOrder = {
        id: newId,
        orderDate: data.orderDate || '',
        organization: data.organization || '',
        numSandwiches: parseInt(data.numSandwiches || 0),
        otherItems: otherItemsStr,
        sauces: sauces,
        cost: cost,
        paid: data.paid ? true : false,
        orderType: data.orderType || '',
        timeOfDay: data.timeOfDay || '',
        contactName: data.contactName || '',
        contactPhone: data.contactPhone || '',
        pickles: data.pickles || 'no',
        numBags: parseInt(data.numBags || 0),
        creator: creator
    };

    addCateringOrder(newOrder);

    res.redirect('/options'); // redirect back like PHP
});

module.exports = router;
