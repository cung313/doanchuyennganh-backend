function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect('/login');
}

function attachUser(req, res, next) {
  res.locals.currentUser = req.session?.user || null;
  next();
}

module.exports = { requireAuth, attachUser };
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ',
    });
  }
};