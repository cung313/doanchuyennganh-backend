const { pool } = require('./pool');
const { qident, qpath } = require('../utils/identifiers');
const { safeBase64Encode, safeBase64Decode } = require('../utils/strings');

function normalizeValue(raw, col) {
  if (raw === undefined) return undefined;

  let v = raw;
  if (typeof v === 'string') {
    v = v.trim();
    if (v === '') return null;
  }

  const udt = String(col.udt_name || '').toLowerCase();
  const dt = String(col.data_type || '').toLowerCase();

  const isInt =
    udt === 'int2' || udt === 'int4' || udt === 'int8' || dt.includes('integer') || dt.includes('bigint');
  const isNum =
    udt === 'numeric' ||
    udt === 'float4' ||
    udt === 'float8' ||
    dt.includes('numeric') ||
    dt.includes('double precision') ||
    dt.includes('real');
  const isBool = udt === 'bool' || dt === 'boolean';

  if (isBool) {
    if (v === null) return null;
    if (v === true || v === false) return v;
    const s = String(v).toLowerCase();
    return s === 'true' || s === '1' || s === 'on' || s === 'yes';
  }

  if (isInt) {
    if (v === null) return null;
    const n = Number.parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
  }

  if (isNum) {
    if (v === null) return null;
    const n = Number(String(v));
    return Number.isFinite(n) ? n : null;
  }

  // Let PostgreSQL parse date/timestamp strings as-is.
  return v;
}

function encodePkToken(pkCols, row) {
  const joined = pkCols.map((c) => String(row[c] ?? '')).join('::');
  return safeBase64Encode(joined);
}

function decodePkToken(pkCols, token) {
  const joined = safeBase64Decode(token);
  const parts = joined.split('::');
  if (parts.length !== pkCols.length) {
    throw new Error('Invalid primary key token');
  }
  const out = {};
  pkCols.forEach((c, i) => (out[c] = parts[i]));
  return out;
}

async function listRows(meta, opts) {
  const page = Math.max(1, Number(opts.page || 1));
  const pageSize = Math.min(100, Math.max(5, Number(opts.pageSize || 20)));
  const q = String(opts.q || '').trim();
  const order = String(opts.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const colNames = meta.columns.map((c) => c.column_name);
  let sort = String(opts.sort || '').trim();
  if (!sort || !colNames.includes(sort)) {
    sort = meta.pk[0] || colNames[0];
  }

  const textCols = meta.columns.filter((c) => {
    const dt = String(c.data_type).toLowerCase();
    return dt.includes('character') || dt.includes('text');
  });

  const whereParts = [];
  const values = [];
  let idx = 1;

  if (q && textCols.length) {
    values.push(`%${q}%`);
    const likeParts = textCols.map((c) => `${qident(c.column_name)}::text ILIKE $${idx}`);
    whereParts.push(`(${likeParts.join(' OR ')})`);
    idx += 1;
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  // Count
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS count FROM ${qpath(`${meta.schema}.${meta.table}`)} ${whereSql}`,
    values
  );
  const total = countRes.rows[0]?.count || 0;

  // Data
  const offset = (page - 1) * pageSize;
  values.push(pageSize);
  values.push(offset);

  const dataSql = `
    SELECT * FROM ${qpath(`${meta.schema}.${meta.table}`)}
    ${whereSql}
    ORDER BY ${qident(sort)} ${order}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  const dataRes = await pool.query(dataSql, values);
  const rows = dataRes.rows.map((r) => ({
    ...r,
    __pk: encodePkToken(meta.pk.length ? meta.pk : [meta.columns[0].column_name], r)
  }));

  return {
    rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    sort,
    order: order.toLowerCase(),
    q
  };
}

async function getByPk(meta, pkToken) {
  const pkCols = meta.pk.length ? meta.pk : [meta.columns[0].column_name];
  const pkObj = pkCols.length === 1 ? { [pkCols[0]]: safeBase64Decode(pkToken) } : decodePkToken(pkCols, pkToken);

  const where = [];
  const values = [];
  let idx = 1;

  for (const c of pkCols) {
    where.push(`${qident(c)} = $${idx++}`);
    values.push(pkObj[c]);
  }

  const { rows } = await pool.query(
    `SELECT * FROM ${qpath(`${meta.schema}.${meta.table}`)} WHERE ${where.join(' AND ')} LIMIT 1`,
    values
  );
  if (!rows[0]) return null;

  return { ...rows[0], __pk: pkToken };
}

async function insertRow(meta, body) {
  const values = [];
  const cols = [];
  const placeholders = [];
  let idx = 1;

  const colMap = new Map(meta.columns.map((c) => [c.column_name, c]));

  for (const [key, rawVal] of Object.entries(body)) {
    if (!colMap.has(key)) continue;

    // Do not insert generated/identity column if user didn't provide
    const col = colMap.get(key);
    const normalized = normalizeValue(rawVal, col);
    if (normalized === undefined) continue;

    cols.push(qident(key));
    placeholders.push(`$${idx++}`);
    values.push(normalized);
  }

  if (!cols.length) {
    throw new Error('No values to insert.');
  }

  const returning = meta.pk.length ? meta.pk.map(qident).join(', ') : '*';

  const { rows } = await pool.query(
    `INSERT INTO ${qpath(`${meta.schema}.${meta.table}`)} (${cols.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING ${returning}`,
    values
  );

  const inserted = rows[0];
  const pkCols = meta.pk.length ? meta.pk : [meta.columns[0].column_name];
  const token = encodePkToken(pkCols, inserted);

  return token;
}

async function updateRow(meta, pkToken, body) {
  const existing = await getByPk(meta, pkToken);
  if (!existing) return null;

  const pkCols = meta.pk.length ? meta.pk : [meta.columns[0].column_name];
  const colMap = new Map(meta.columns.map((c) => [c.column_name, c]));

  const sets = [];
  const values = [];
  let idx = 1;

  for (const [key, rawVal] of Object.entries(body)) {
    if (!colMap.has(key)) continue;
    if (pkCols.includes(key)) continue; // don't update PK in generic admin

    const col = colMap.get(key);
    const normalized = normalizeValue(rawVal, col);
    if (normalized === undefined) continue;

    sets.push(`${qident(key)} = $${idx++}`);
    values.push(normalized);
  }

  if (!sets.length) return pkToken;

  // WHERE
  const where = [];
  const pkObj = pkCols.length === 1 ? { [pkCols[0]]: safeBase64Decode(pkToken) } : decodePkToken(pkCols, pkToken);
  for (const c of pkCols) {
    where.push(`${qident(c)} = $${idx++}`);
    values.push(pkObj[c]);
  }

  await pool.query(
    `UPDATE ${qpath(`${meta.schema}.${meta.table}`)}
     SET ${sets.join(', ')}
     WHERE ${where.join(' AND ')}`,
    values
  );

  return pkToken;
}

async function deleteRow(meta, pkToken) {
  const pkCols = meta.pk.length ? meta.pk : [meta.columns[0].column_name];
  const pkObj = pkCols.length === 1 ? { [pkCols[0]]: safeBase64Decode(pkToken) } : decodePkToken(pkCols, pkToken);

  const where = [];
  const values = [];
  let idx = 1;
  for (const c of pkCols) {
    where.push(`${qident(c)} = $${idx++}`);
    values.push(pkObj[c]);
  }

  await pool.query(
    `DELETE FROM ${qpath(`${meta.schema}.${meta.table}`)} WHERE ${where.join(' AND ')}`,
    values
  );
}

module.exports = {
  listRows,
  getByPk,
  insertRow,
  updateRow,
  deleteRow
};
