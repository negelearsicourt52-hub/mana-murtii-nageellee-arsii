MANA MURTII AANAA NAGEELLEE ARSII – WEBSITE

RENDER DEPLOYMENT
1. Upload/push the CONTENTS of this folder as the project root (server.js and package.json must be at root).
2. Build Command: npm install
3. Start Command: npm start
4. Environment variables for SQL Server are optional for the static website; configure DB_SERVER, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_ENCRYPT when database search is enabled.

TQO PHOTO
The TQO photo is stored at:
public/images/tqo/tqo-profile.jpg
The page references it with an absolute URL:
/images/tqo/tqo-profile.jpg
This avoids relative-path problems after deployment.

IMPORTANT
Do not deploy the ZIP file as a nested folder. The project root must directly contain:
server.js
package.json
public/index.html
public/images/tqo/tqo-profile.jpg
