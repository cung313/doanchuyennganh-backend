const express = require('express');
const router = express.Router();
const { getInventory, updateInventory } = require('../controllers/inventory.controller');

// Get inventory
router.get('/', getInventory);

// Update inventory
router.post('/update', updateInventory);

module.exports = router;