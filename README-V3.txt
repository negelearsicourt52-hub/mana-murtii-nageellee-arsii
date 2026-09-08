Mana Murtii Aanaa Nageellee Arsii — Website V3

V3: public website + login/access control + hearing schedule + protected Google Meet join flow + CCMS SQL Server case search.

Demo accounts (change passwords in .env):
 admin / Admin@2026
 judge / Judge@2026
 officer / Officer@2026

Permanent Meet room:
1) Copy .env.example to .env
2) Set CONFERENCE_URL to the court-approved permanent Google Meet link.
3) Set strong passwords.

Run:
 npm install
 npm start
 Open http://localhost:3000

Note: the in-memory login/session is suitable for a prototype. For production, use a persistent session store and database-backed users/roles.
