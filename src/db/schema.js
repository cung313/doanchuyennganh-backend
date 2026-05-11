const { pool } = require('./pool');

async function getColumns(schema, table) {
  const { rows } = await pool.query(
    `
    SELECT
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
    `,
    [schema, table]
  );
  return rows;
}

async function getPrimaryKey(schema, table) {
  const { rows } = await pool.query(
    `
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2
    ORDER BY kcu.ordinal_position
    `,
    [schema, table]
  );

  return rows.map((r) => r.column_name);
}

async function getForeignKeys(schema, table) {
  const { rows } = await pool.query(
    `
    SELECT
      kcu.column_name AS column_name,
      ccu.table_schema AS ref_schema,
      ccu.table_name AS ref_table,
      ccu.column_name AS ref_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
      AND tc.table_name = $2
    ORDER BY kcu.ordinal_position
    `,
    [schema, table]
  );
  return rows;
}

async function getReferencedBy(schema, table) {
  // Find other tables that reference (schema.table) via FK
  const { rows } = await pool.query(
    `
    SELECT
      tc.table_schema AS child_schema,
      tc.table_name AS child_table,
      kcu.column_name AS child_column,
      ccu.table_schema AS parent_schema,
      ccu.table_name AS parent_table,
      ccu.column_name AS parent_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = $1
      AND ccu.table_name = $2
    ORDER BY tc.table_name, kcu.ordinal_position
    `,
    [schema, table]
  );

  return rows.map((r) => ({
    child_schema: r.child_schema,
    child_table: r.child_table,
    child_column: r.child_column,
    parent_schema: r.parent_schema,
    parent_table: r.parent_table,
    parent_column: r.parent_column
  }));
}

function guessLabelColumn(columns) {
  const names = columns.map((c) => c.column_name);
  const preferred = [
    'ten',
    'ten_san_pham',
    'ten_khach_hang',
    'ten_nha_cung_cap',
    'name',
    'full_name',
    'username',
    'email',
    'ma',
    'code'
  ];

  for (const p of preferred) {
    const hit = names.find((n) => n === p);
    if (hit) return hit;
  }

  // Heuristic: any column containing these tokens
  const tokens = ['ten', 'name', 'username', 'email', 'ma', 'code'];
  for (const t of tokens) {
    const hit = names.find((n) => n.includes(t));
    if (hit) return hit;
  }

  // Fallback to first non-PK-ish text column
  const textCandidates = columns.filter((c) => {
    const dt = String(c.data_type).toLowerCase();
    return dt.includes('character') || dt.includes('text');
  });
  return textCandidates[0]?.column_name || names[0];
}

async function getTableMeta(schema, table) {
  const [columns, pk, fks, referencedBy] = await Promise.all([
    getColumns(schema, table),
    getPrimaryKey(schema, table),
    getForeignKeys(schema, table),
    getReferencedBy(schema, table)
  ]);

  return {
    schema,
    table,
    columns,
    pk, // array
    fks,
    referencedBy,
    labelColumn: guessLabelColumn(columns)
  };
}

module.exports = {
  getTableMeta,
  guessLabelColumn
};
