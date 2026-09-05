const express = require('express');
const sql = require('mssql');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || 'CCMS_Misba3SERVER1',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: (process.env.DB_ENCRYPT || 'false') === 'true',
    trustServerCertificate: true
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let pool;
async function db() {
  if (!pool) pool = await sql.connect(config);
  return pool;
}

app.get('/api/health', async (req,res)=>{
  try {
    const p = await db();
    const r = await p.request().query('SELECT DB_NAME() AS database_name, GETDATE() AS server_time');
    res.json({ok:true, ...r.recordset[0]});
  } catch(e) { res.status(500).json({ok:false,error:e.message}); }
});

app.get('/api/tables', async (req,res)=>{
  try {
    const p = await db();
    const r = await p.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE='BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME`);
    res.json(r.recordset);
  } catch(e) { res.status(500).json({error:e.message}); }
});

/*
  The backup contains a real CCMS SQL Server database, but the exact case
  table/column mapping must be verified after restoring it. This endpoint
  is deliberately schema-safe: set CASE_TABLE and CASE_NUMBER_COLUMN in .env
  after inspecting /api/tables and the relevant table's columns.
*/
app.get('/api/case-schema', async (req,res)=>{
  try {
    const p = await db();
    const r = await p.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME IN ('FileNumber','CaseNumber','CaseNo','CaseNumberId')
         OR LOWER(COLUMN_NAME) LIKE '%filenumber%'
         OR LOWER(COLUMN_NAME) LIKE '%casenumber%'
      ORDER BY TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME`);
    res.json(r.recordset);
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/api/cases', async (req,res)=>{
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const p = await db();
    const meta = await p.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME IN ('FileNumber','CaseNumber','CaseNo','CaseNumberId')
         OR LOWER(COLUMN_NAME) LIKE '%filenumber%'
         OR LOWER(COLUMN_NAME) LIKE '%casenumber%'`);
    const rows = [];
    for (const m of meta.recordset.slice(0,25)) {
      const schema = `[${m.TABLE_SCHEMA.replace(/]/g,'')}]`;
      const table = `[${m.TABLE_NAME.replace(/]/g,'')}]`;
      const col = `[${m.COLUMN_NAME.replace(/]/g,'')}]`;
      try {
        const r = await p.request().input('q', sql.NVarChar, `%${q}%`)
          .query(`SELECT TOP 25 * FROM ${schema}.${table} WHERE CAST(${col} AS NVARCHAR(255)) LIKE @q`);
        for (const item of r.recordset) rows.push({...item, _source_table:`${m.TABLE_SCHEMA}.${m.TABLE_NAME}`});
      } catch (_) {}
      if (rows.length >= 50) break;
    }
    res.json(rows.slice(0,50));
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, ()=>console.log(`CCMS website running on http://localhost:${PORT}`));
