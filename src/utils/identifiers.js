function assertSqlIdent(name) {
  // Allow only simple snake_case identifiers. This prevents SQL injection through identifiers.
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return name;
}

function qident(name) {
  assertSqlIdent(name);
  return `"${name}"`;
}

function qpath(pathLike) {
  // Supports schema.table or just table
  return pathLike
    .split('.')
    .map((p) => qident(assertSqlIdent(p)))
    .join('.');
}

module.exports = { assertSqlIdent, qident, qpath };
