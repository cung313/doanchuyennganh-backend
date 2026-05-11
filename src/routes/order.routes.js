const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// Nếu đã có middleware auth thì bật dòng dưới
const auth = require('../middlewares/auth');
router.post('/', auth, orderController.createOrder);


module.exports = router;