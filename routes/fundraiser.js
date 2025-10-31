const express = require('express');
const path = require('path');
const fs = require('fs');
const { cateringOrderDB, userDB } = require('../database/db');
const router = express.Router();

// Database operations now handled by cateringOrderDB

// Show fundraiser form
router.get('/', async (req, res) => {
    try {
        // Check if user is authenticated with serverless auth
        if (!req.auth || !req.auth.authenticated) {
            return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
        }

        // Get all employees from database for the dropdown
        const employees = await userDB.getAll();
        
        res.render('fundraiser', {
            firstName: 'Authenticated',
            lastName: 'User',
            employees: employees
        });
    } catch (error) {
        console.error('Error loading fundraiser page:', error);
        res.status(500).send('Error loading page');
    }
});

// Handle form submission
router.post('/submit', async (req, res) => {
    try {
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

        // Creator - get from form data or use default
        const creator = data.creator || 'Authenticated User';

        // Build order object for database
        const newOrder = {
            order_date: data.orderDate || null,
            organization: data.organization || '',
            num_sandwiches: parseInt(data.numSandwiches || 0),
            other_items: otherItemsStr,
            sauces: sauces,
            cost: cost,
            paid: data.paid ? true : false,
            order_type: data.orderType || '',
            time_of_day: data.timeOfDay || '',
            contact_name: data.contactName || '',
            contact_phone: data.contactPhone || '',
            pickles: data.pickles || 'no',
            num_bags: parseInt(data.numBags || 0),
            creator: creator
        };

        await cateringOrderDB.create(newOrder);

        res.redirect('/options'); // redirect back like PHP
    } catch (error) {
        console.error('Error creating catering order:', error);
        res.status(500).send('Error creating catering order');
    }
});

module.exports = router;
