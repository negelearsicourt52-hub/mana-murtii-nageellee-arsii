const express = require('express');
const sql = require('mssql');
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
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const PORT=Number(process.env.PORT||3000); app.listen(PORT,()=>console.log(`CCMS V3 running on http://localhost:${PORT}`));
