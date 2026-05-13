const express = require('express');
const router = express.Router();

const controller = require('../controllers/priority1.controller');

router.get('/warehouse/dashboard', controller.getWarehouseDashboard);
router.get('/warehouse/stocks', controller.getStocks);

router.post('/warehouse/stock-counts', controller.createStockCount);
router.get('/warehouse/stock-counts', controller.getStockCounts);
router.get('/warehouse/stock-counts/:id', controller.getStockCountDetail);
router.post('/warehouse/stock-counts/:id/approve', controller.approveStockCount);
router.post('/warehouse/stock-counts/:id/reject', controller.rejectStockCount);

router.post('/warehouse/issues', controller.createStockIssue);
router.get('/warehouse/issues', controller.getStockIssues);
router.get('/warehouse/issues/:id', controller.getStockIssueDetail);

router.post('/orders/:id/cancel', controller.cancelOrder);

module.exports = router;