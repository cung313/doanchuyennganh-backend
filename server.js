require('dotenv').config();

const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const pool = require('./src/db/pool');
const security = require('./src/middlewares/security');

// Routes
const priority1Routes = require('./src/routes/priority1.routes');
const employeeRoutes = require('./src/routes/employee.routes');
const warehouseRoutes = require('./src/routes/warehouse.routes');
const managerOrderCustomerRoutes = require('./src/routes/manager_order_customer.routes');
const managerRoutes = require('./src/routes/manager.routes');
const customerRoutes = require('./src/routes/customer.routes');
const authRoutes = require('./src/routes/auth.routes');
const productRoutes = require('./src/routes/product.routes');
const orderRoutes = require('./src/routes/order.routes');
const inventoryRoutes = require('./src/routes/inventory.routes');

const notFound = require('./src/middlewares/notFound');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(security);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SAMCO API is running',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');

    res.json({
      success: true,
      message: 'Database connected',
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error('DATABASE HEALTH ERROR:', error);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// Routes
app.use('/api/priority1', priority1Routes);
app.use('/api/employee', employeeRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/manager', managerOrderCustomerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/manager', managerRoutes);
// Error handling
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});