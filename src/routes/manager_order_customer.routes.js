const express = require('express');
const router = express.Router();

const controller = require('../controllers/manager_order_customer.controller');

// CUSTOMERS
router.get('/customers', controller.getCustomers);
router.post('/customers', controller.createCustomer);
router.put('/customers/:id', controller.updateCustomer);
router.delete('/customers/:id', controller.deleteCustomer);

// ORDERS
router.get('/orders', controller.getOrders);
router.get('/orders/:id', controller.getOrderDetail);

module.exports = router;