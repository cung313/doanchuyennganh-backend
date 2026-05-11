module.exports = function security(req, res, next) {
  // Place for custom security policies (CSP tuning etc.)
  // Helmet is already installed globally; keep this middleware for future extensions.
  next();
};
