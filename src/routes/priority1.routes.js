const express = require('express');
const router = express.Router();

const controller = require('../controllers/priority1.controller');

// ======================================================
// KHO - DASHBOARD / TỒN KHO
// ======================================================
router.get('/warehouse/dashboard', controller.getWarehouseDashboard);
router.get('/warehouse/stocks', controller.getStocks);

// ======================================================
// KIỂM KÊ
// ======================================================
router.post('/warehouse/stock-counts', controller.createStockCount);
router.get('/warehouse/stock-counts', controller.getStockCounts);
router.get('/warehouse/stock-counts/:id', controller.getStockCountDetail);
router.post(
  '/warehouse/stock-counts/:id/approve',
  controller.approveStockCount
);
router.post(
  '/warehouse/stock-counts/:id/reject',
  controller.rejectStockCount
);

// ======================================================
// PHIẾU XUẤT KHO / HAO HỤT
// ======================================================
router.post('/warehouse/issues', controller.createStockIssue);
router.get('/warehouse/issues', controller.getStockIssues);
router.get('/warehouse/issues/:id', controller.getStockIssueDetail);
router.post(
  '/warehouse/issues/:id/approve',
  controller.approveStockIssue
);
router.post(
  '/warehouse/issues/:id/reject',
  controller.rejectStockIssue
);

// ======================================================
// ĐƠN HÀNG
// ======================================================
router.post('/orders/:id/cancel', controller.cancelOrder);
router.patch('/orders/:id/status', controller.updateOrderStatus);

module.exports = router;