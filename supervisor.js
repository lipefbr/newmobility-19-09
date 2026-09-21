const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const LOG_FILE = path.join(__dirname, 'dev.log');
let serverProcess = null;
let isStarting = false;
let restartCount = 0;

function startServer() {
  if (isStarting) return;
  isStarting = true;
  restartCount++;
  const ts = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${ts}] Starting server (#${restartCount})\n`);
  
  serverProcess = spawn(process.execPath, [
    '--max-old-space-size=512',
    path.join(__dirname, '.next/standalone/server.js')
  ], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
      DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    fs.appendFileSync(LOG_FILE, data.toString());
  });

  serverProcess.stderr.on('data', (data) => {
    fs.appendFileSync(LOG_FILE, data.toString());
  });

  serverProcess.on('exit', (code, signal) => {
    const ts = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${ts}] Server exited code=${code} signal=${signal}\n`);
    serverProcess = null;
    isStarting = false;
    setTimeout(startServer, 2000);
  });

  serverProcess.on('error', (err) => {
    const ts = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${ts}] Error: ${err.message}\n`);
    serverProcess = null;
    isStarting = false;
    setTimeout(startServer, 5000);
  });

  setTimeout(() => { isStarting = false; }, 5000);
}

fs.writeFileSync(LOG_FILE, '');
startServer();

setInterval(() => {
  const mem = process.memoryUsage();
  fs.appendFileSync(LOG_FILE, `[Health] RSS: ${Math.round(mem.rss/1024/1024)}MB\n`);
}, 120000);
