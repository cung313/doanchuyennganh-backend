const express = require('express');
const router = express.Router();

const warehouseController = require('../controllers/warehouse.controller');

router.get('/summary', warehouseController.getSummary);
router.get('/stocks', warehouseController.getStocks);

router.get('/receipt-options', warehouseController.getReceiptOptions);
router.post('/receipts', warehouseController.createReceipt);
router.get('/receipts', warehouseController.getReceipts);
router.get('/receipts/:id', warehouseController.getReceiptDetail);

module.exports = router;