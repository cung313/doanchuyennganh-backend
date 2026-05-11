const resources = require('./resources');

function buildNav() {
  const groups = {};
  for (const r of resources) {
    if (!groups[r.group]) groups[r.group] = [];
    groups[r.group].push(r);
  }
  return groups;
}

module.exports = { buildNav };
