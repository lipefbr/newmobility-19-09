const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const LOG_FILE = '/home/z/my-project/persistent-server.log';
const PID_FILE = '/home/z/my-project/server.pid';

const env = {
  ...process.env,
  DATABASE_URL: "postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  NEON_DATABASE_URL: "postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  HOSTNAME: "0.0.0.0",
  PORT: "3000",
  NODE_OPTIONS: "--max-old-space-size=512",
};

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function startServer() {
  log('Starting Next.js production server...');
  
  const child = spawn('node', [path.join(__dirname, '.next/standalone/server.js')], {
    cwd: __dirname,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
  });
  
  // Write PID
  fs.writeFileSync(PID_FILE, String(child.pid));
  
  child.stdout.on('data', (data) => {
    fs.appendFileSync(LOG_FILE, data);
  });
  
  child.stderr.on('data', (data) => {
    fs.appendFileSync(LOG_FILE, data);
  });
  
  child.on('exit', (code, signal) => {
    log(`Server exited (code=${code}, signal=${signal}), restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
  
  child.on('error', (err) => {
    log(`Server error: ${err.message}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
}

// Handle signals
process.on('SIGTERM', () => log('Received SIGTERM, ignoring'));
process.on('SIGINT', () => log('Received SIGINT, ignoring'));

// Start
log('Persistent server manager started');
startServer();

// Heartbeat
setInterval(() => {
  log('Heartbeat - manager still running');
}, 60000);
