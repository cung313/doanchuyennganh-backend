const { buildNav } = require('../ui/nav');
const { humanize } = require('../utils/strings');

module.exports = function locals(req, res, next) {
  res.locals.nav = buildNav();
  res.locals.currentPath = req.path;
  res.locals.humanize = humanize;

  res.locals.formatValue = (v) => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toLocaleString('en-US');
    return String(v);
  };

  next();
};
