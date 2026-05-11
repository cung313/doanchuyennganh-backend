const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

router.get('/search', productController.searchProducts);
router.get('/barcode/:barcode', productController.getProductByBarcode);

module.exports = router;