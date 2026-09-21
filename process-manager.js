const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const LOG_FILE = '/home/z/my-project/pm.log';
const SERVER_PATH = path.join(__dirname, '.next/standalone/server.js');
const MAX_RESTARTS = 100;
let restartCount = 0;

const env = {
  ...process.env,
  DATABASE_URL: "postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  NEON_DATABASE_URL: "postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  HOSTNAME: "0.0.0.0",
  PORT: "3000",
  NODE_OPTIONS: "--max-old-space-size=256",
};

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch(e) {}
  console.log(line.trim());
}

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    log(`Max restarts (${MAX_RESTARTS}) reached. Waiting 60s before resetting...`);
    setTimeout(() => { restartCount = 0; startServer(); }, 60000);
    return;
  }

  restartCount++;
  log(`Starting server (attempt #${restartCount})...`);

  const child = spawn('node', [SERVER_PATH], {
    cwd: __dirname,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
  });

  child.stdout.on('data', (data) => {
    try { fs.appendFileSync(LOG_FILE, data); } catch(e) {}
  });

  child.stderr.on('data', (data) => {
    try { fs.appendFileSync(LOG_FILE, data); } catch(e) {}
  });

  child.on('exit', (code, signal) => {
    log(`Server exited (code=${code}, signal=${signal}), restarting in 2s...`);
    setTimeout(startServer, 2000);
  });

  child.on('error', (err) => {
    log(`Server error: ${err.message}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
}

// Ignore termination signals
process.on('SIGTERM', () => log('Received SIGTERM, ignoring'));
process.on('SIGINT', () => log('Received SIGINT, ignoring'));
process.on('SIGHUP', () => log('Received SIGHUP, ignoring'));

log('Process manager started');
startServer();

// Heartbeat
setInterval(() => {
  log('PM heartbeat');
}, 30000);
