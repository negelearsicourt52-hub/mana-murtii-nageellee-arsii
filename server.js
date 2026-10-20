const express = require('express');
const sql = require('mssql');
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

const config={server:process.env.DB_SERVER||'localhost',port:Number(process.env.DB_PORT||1433),database:process.env.DB_NAME||'CCMS_Misba3SERVER1',user:process.env.DB_USER||'',password:process.env.DB_PASSWORD||'',options:{encrypt:(process.env.DB_ENCRYPT||'false')==='true',trustServerCertificate:true},pool:{max:10,min:0,idleTimeoutMillis:30000}};
let pool;
async function db(){if(!pool) pool=await sql.connect(config); return pool;}

const users={
  admin:{password:process.env.ADMIN_PASSWORD||'Admin@2026',role:'Admin',name:'Court Administrator'},
  judge:{password:process.env.JUDGE_PASSWORD||'Judge@2026',role:'Abbaa Seeraa',name:'Abbaa Seeraa'},
  officer:{password:process.env.OFFICER_PASSWORD||'Officer@2026',role:'Ofisera Seeraa',name:'Legal Officer'}
};
const sessions=new Map();
const attendance=[];
const hearings=[
 {id:1,caseNo:'CASE-2026-001',title:'Dhaddacha Yakkaa',date:'2026-09-10',time:'09:00',status:'Qophaa’e',meetUrl:process.env.CONFERENCE_URL||'https://meet.google.com/'}
];
function auth(req,res,next){const token=req.headers.authorization?.replace('Bearer ','')||req.body?.token||req.query?.token; const s=token&&sessions.get(token); if(!s) return res.status(401).json({error:'Seensa hayyamame hin jiru.'}); req.user=s; next();}
function roleAllowed(role){return ['Abbaa Seeraa','Abbaa Alangaa','Abukaatoo','Himatamaa','Ragaa','Hirmaataa','Ofisera Seeraa','Admin'].includes(role)}

app.get('/api/health',async(req,res)=>{try{const p=await db();const r=await p.request().query('SELECT DB_NAME() AS database_name, GETDATE() AS server_time');res.json({ok:true,...r.recordset[0]});}catch(e){res.json({ok:true,database:'not-connected',message:'Website works; CCMS database is not connected.'});}});
app.post('/api/login',(req,res)=>{const {username,password}=req.body||{}; const u=users[String(username||'').toLowerCase()]; if(!u||u.password!==password)return res.status(401).json({error:'Username ykn password sirrii miti.'}); const token=crypto.randomBytes(24).toString('hex'); sessions.set(token,{username:String(username).toLowerCase(),role:u.role,name:u.name,createdAt:Date.now()}); res.json({token,user:{username:String(username).toLowerCase(),role:u.role,name:u.name}});});
app.post('/api/logout',auth,(req,res)=>{const token=req.headers.authorization?.replace('Bearer ','')||req.body?.token; sessions.delete(token); res.json({ok:true});});
app.get('/api/me',auth,(req,res)=>res.json(req.user));
app.get('/api/hearings',(req,res)=>res.json(hearings.map(({id,caseNo,title,date,time,status})=>({id,caseNo,title,date,time,status}))));
app.get('/api/hearings/:id',(req,res)=>{const h=hearings.find(x=>x.id===Number(req.params.id)); if(!h)return res.status(404).json({error:'Dhaddachi hin argamne.'}); res.json(h);});
app.post('/api/hearings/:id/join',auth,(req,res)=>{const h=hearings.find(x=>x.id===Number(req.params.id)); if(!h)return res.status(404).json({error:'Dhaddachi hin argamne.'}); const role=req.body.role||req.user.role; if(!roleAllowed(role))return res.status(403).json({error:'Gaheen kun hin hayyamamne.'}); const item={hearingId:h.id,caseNo:h.caseNo,user:req.user.name,username:req.user.username,role,joinedAt:new Date().toISOString()}; attendance.push(item); res.json({ok:true,...item,meetUrl:h.meetUrl,message:'Seensa kee qophaa’eera.'});});
app.get('/api/hearings/:id/attendance',auth,(req,res)=>{if(!['Admin','Abbaa Seeraa'].includes(req.user.role))return res.status(403).json({error:'Hayyama gahaa hin qabdu.'});res.json(attendance.filter(x=>x.hearingId===Number(req.params.id)));});

app.get('/api/tables',async(req,res)=>{try{const p=await db();const r=await p.request().query(`SELECT TABLE_SCHEMA,TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_SCHEMA,TABLE_NAME`);res.json(r.recordset);}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/case-schema',async(req,res)=>{try{const p=await db();const r=await p.request().query(`SELECT TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME IN ('FileNumber','CaseNumber','CaseNo','CaseNumberId') OR LOWER(COLUMN_NAME) LIKE '%filenumber%' OR LOWER(COLUMN_NAME) LIKE '%casenumber%' ORDER BY TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME`);res.json(r.recordset);}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/cases',async(req,res)=>{const q=String(req.query.q||'').trim();if(!q)return res.json([]);try{const p=await db();const meta=await p.request().query(`SELECT TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME IN ('FileNumber','CaseNumber','CaseNo','CaseNumberId') OR LOWER(COLUMN_NAME) LIKE '%filenumber%' OR LOWER(COLUMN_NAME) LIKE '%casenumber%'`);const rows=[];for(const m of meta.recordset.slice(0,25)){const schema=`[${m.TABLE_SCHEMA.replace(/]/g,'')}]`,table=`[${m.TABLE_NAME.replace(/]/g,'')}]`,col=`[${m.COLUMN_NAME.replace(/]/g,'')}]`;try{const r=await p.request().input('q',sql.NVarChar,`%${q}%`).query(`SELECT TOP 25 * FROM ${schema}.${table} WHERE CAST(${col} AS NVARCHAR(255)) LIKE @q`);for(const item of r.recordset)rows.push({...item,_source_table:`${m.TABLE_SCHEMA}.${m.TABLE_NAME}`});}catch(_){}if(rows.length>=50)break;}res.json(rows.slice(0,50));}catch(e){res.status(500).json({error:e.message});}});

// Scan-count reporting: only PDF metadata/hash is sent; PDF documents remain on office PCs.
const scanConfig={
  server:process.env.SCAN_DB_SERVER||process.env.DB_SERVER||'localhost',
  port:Number(process.env.SCAN_DB_PORT||process.env.DB_PORT||1433),
  database:process.env.SCAN_DB_NAME||process.env.DB_NAME||'CCMS_Misba3SERVER1',
  user:process.env.SCAN_DB_USER||process.env.DB_USER||'',
  password:process.env.SCAN_DB_PASSWORD||process.env.DB_PASSWORD||'',
  options:{encrypt:(process.env.SCAN_DB_ENCRYPT||process.env.DB_ENCRYPT||'false')==='true',trustServerCertificate:true},
  pool:{max:5,min:0,idleTimeoutMillis:30000}
};
let scanPool, scanTableReady;
async function scanDb(){if(!scanPool) scanPool=await new sql.ConnectionPool(scanConfig).connect(); return scanPool;}
async function ensureScanTable(){
  if(!scanTableReady) scanTableReady=(async()=>{
    const p=await scanDb();
    await p.request().query(`
      IF OBJECT_ID(N'dbo.ScanEvents', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.ScanEvents (
          eventKey varchar(64) NOT NULL PRIMARY KEY,
          computerId varchar(10) NOT NULL,
          workerName nvarchar(100) NOT NULL,
          category varchar(10) NOT NULL,
          fileName nvarchar(260) NOT NULL,
          fileSize bigint NOT NULL,
          fileHash varchar(64) NOT NULL,
          createdAt datetime NOT NULL CONSTRAINT DF_ScanEvents_createdAt DEFAULT (GETDATE())
        )
      END
    `);
  })();
  return scanTableReady;
}
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(String(s||'')) && !Number.isNaN(Date.parse(s+'T00:00:00Z'));}
app.post('/api/scan/events',async(req,res)=>{
  const configured=process.env.SCAN_AGENT_KEY;
  if(!configured) return res.status(503).json({error:'SCAN_AGENT_KEY Render irratti hin qindaa’in.'});
  if(!req.headers['x-scan-agent-key'] || req.headers['x-scan-agent-key']!==configured)
    return res.status(401).json({error:'Scan agent key sirrii miti.'});
  const b=req.body||{};
  const computerId=String(b.computerId||'').trim();
  const workerName=String(b.workerName||'').trim();
  const category=String(b.category||'');
  const fileName=String(b.fileName||'').trim().slice(0,260);
  const fileHash=String(b.fileHash||'').toLowerCase();
  const fileSize=Number(b.fileSize);
  if(!/^\d{3}$/.test(computerId) || !workerName || !['Yakkaa','HH'].includes(category) ||
     !fileName.toLowerCase().endsWith('.pdf') || !/^[a-f0-9]{64}$/.test(fileHash) ||
     !Number.isSafeInteger(fileSize) || fileSize<0)
    return res.status(400).json({error:'Odeeffannoo scan guutuu ykn sirrii miti.'});
  const eventKey=crypto.createHash('sha256').update(`${computerId}|${category}|${fileHash}`).digest('hex');
  try{
    await ensureScanTable();
    const p=await scanDb();
    const r=await p.request()
      .input('eventKey',sql.VarChar(64),eventKey)
      .input('computerId',sql.VarChar(10),computerId)
      .input('workerName',sql.NVarChar(100),workerName.slice(0,100))
      .input('category',sql.VarChar(10),category)
      .input('fileName',sql.NVarChar(260),fileName)
      .input('fileSize',sql.BigInt,fileSize)
      .input('fileHash',sql.VarChar(64),fileHash)
      .query(`IF NOT EXISTS (SELECT 1 FROM dbo.ScanEvents WHERE eventKey=@eventKey)
        BEGIN
          INSERT INTO dbo.ScanEvents(eventKey,computerId,workerName,category,fileName,fileSize,fileHash)
          VALUES(@eventKey,@computerId,@workerName,@category,@fileName,@fileSize,@fileHash);
          SELECT CAST(1 AS int) AS inserted;
        END
        ELSE SELECT CAST(0 AS int) AS inserted;`);
    res.status(200).json({ok:true,inserted:!!r.recordset[0].inserted});
  }catch(e){console.error('Scan event error:',e.message);res.status(503).json({error:'Kuusaan daataa scan waliin walqabsiisuun hin danda’amne. Database fi hayyama isaa mirkaneessi.'});}
});
app.get('/api/scan/report',auth,async(req,res)=>{
  if(!['Admin','Ofisera Seeraa'].includes(req.user.role))
    return res.status(403).json({error:'Gabaasa scan ilaaluuf hayyama hin qabdu.'});
  const from=String(req.query.from||'');
  const to=String(req.query.to||'');
  if(!validDate(from)||!validDate(to)||from>to)
    return res.status(400).json({error:'Guyyaa jalqabaa fi dhumaa sirriitti filadhu.'});
  try{
    await ensureScanTable();
    const p=await scanDb();
    const r=await p.request()
      .input('fromDate',sql.VarChar(10),from)
      .input('toDate',sql.VarChar(10),to)
      .query(`SELECT CONVERT(varchar(10),createdAt,120) AS scanDate, computerId, workerName, category,
        COUNT(*) AS recordCount
        FROM dbo.ScanEvents
        WHERE createdAt >= CONVERT(datetime,@fromDate,120)
          AND createdAt < DATEADD(day,1,CONVERT(datetime,@toDate,120))
        GROUP BY CONVERT(varchar(10),createdAt,120),computerId,workerName,category
        ORDER BY scanDate,computerId,category`);
    res.json({from,to,rows:r.recordset});
  }catch(e){console.error('Scan report error:',e.message);res.status(503).json({error:'Gabaasa scan argachuun hin danda’amne. Database scan qindaa’uu qaba.'});}
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const PORT=Number(process.env.PORT||3000); app.listen(PORT,()=>console.log(`CCMS V3 running on http://localhost:${PORT}`));
