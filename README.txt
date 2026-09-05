CCMS WEBSITE — MANA MURTII AANAA NAGEELLEE ARSII
====================================================

Kun website + backend Node.js + Microsoft SQL Server integration skeleton dha.

BACKUP KEESSA ARGAME:
- SQL Server backup (.bak)
- Database name: CCMS_Misba3SERVER1
- Data file: Court_Data.MDF
- Log file: Court_log.LDF
- Backup size: gara 48.3 MB

FAAYILOTA:
- server.js       Backend/API
- package.json    Node dependencies
- .env.example    SQL Server connection settings
- public/index.html
- public/logo.jpg
- public/mana.jpg

AKKA ITTI HOJJETU:
1. .bak restore godhi gara SQL Server.
2. SQL Server server/database isaa mirkaneessi.
3. .env.example gara .env jijjiiri; DB_SERVER, DB_USER, DB_PASSWORD guuti.
4. npm install
5. npm start
6. Browser: http://localhost:3000
7. /api/tables banaatii tables database keessa jiran ilaali.
8. Table dhimmaa fi column lakkoofsa dhimmaa erga mirkanaa'ee booda:
   CASE_TABLE=dbo.TABLE_NAME
   CASE_NUMBER_COLUMN=COLUMN_NAME
   jechuun .env keessatti guuti.

HUBACHIISA:
Backup irraa table/column names guutuu fi case mapping sirrii as keessatti hin murtaa'in;
kanaaf endpoint /api/cases schema tilmaamuun hin ijaaramne. Kun data dogoggoraa agarsiisuu irraa
eega. Restore SQL Server irratti erga mirkanaa'ee booda mapping sirrii itti guutamuu qaba.

SECURITY:
- Password database .env keessa qofa kaa'i; Git/public website irratti hin maxxansin.
- Public user'atti database kallattiin hin saaxilin; API qofa fayyadami.
- HTTPS, authentication/authorization fi audit logging yeroo production irratti dabaluu qaba.

XML sources inspected: xmlCaseForm, xmlSearch, xmlLogin, xmlSettingsForm. Case search terminology follows the supplied XML, including Lakk. Gal., Gosa dhimmichaa, Haala Galmee, Dhaddacha, Himataa and Himatamaa.
