const express = require('express');
const router = express.Router();

const managerController = require('../controllers/manager.controller');

// DASHBOARD
router.get('/dashboard', managerController.getDashboard);

// DANH MỤC
router.get('/categories', managerController.getCategories);
router.post('/categories', managerController.createCategory);
router.put('/categories/:id', managerController.updateCategory);
router.delete('/categories/:id', managerController.deleteCategory);

// SẢN PHẨM
router.get('/products', managerController.getProducts);
router.post('/products', managerController.createProduct);
router.put('/products/:id', managerController.updateProduct);
router.patch('/products/:id/status', managerController.updateProductStatus);

module.exports = router;