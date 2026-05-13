const express = require('express');
const router = express.Router();

const employeeController = require('../controllers/employee.controller');

router.get('/profile/:userId', employeeController.getProfile);

router.patch(
  '/change-password/:userId',
  employeeController.changePassword
);

router.get(
  '/orders/:userId',
  employeeController.getMyOrders
);

router.get(
  '/orders/:userId/:orderId',
  employeeController.getMyOrderDetail
);

router.get(
  '/notifications/:userId',
  employeeController.getNotifications
);

module.exports = router;