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

// NHÀ CUNG CẤP
router.get('/suppliers', managerController.getSuppliers);
router.post('/suppliers', managerController.createSupplier);
router.put('/suppliers/:id', managerController.updateSupplier);
router.delete('/suppliers/:id', managerController.deleteSupplier);

// CÔNG NỢ
router.get('/debts', managerController.getDebts);

// BÁO CÁO
router.get('/reports/summary', managerController.getReportsSummary);

// NGƯỜI DÙNG
router.get('/users', managerController.getUsers);
router.post('/users', managerController.createUser);
router.patch('/users/:id/status', managerController.updateUserStatus);
router.patch('/users/:id/role', managerController.updateUserRole);

module.exports = router;