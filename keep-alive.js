const { spawn } = require('child_process');
const path = require('path');

const env = {
  ...process.env,
  DATABASE_URL: "postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  NEON_DATABASE_URL: "postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  HOSTNAME: "0.0.0.0",
  PORT: "3000",
  NODE_OPTIONS: "--max-old-space-size=512",
};

function start() {
  console.log(`[${new Date().toISOString()}] Starting server...`);
  const child = spawn("node", [path.join(__dirname, ".next/standalone/server.js")], {
    cwd: __dirname,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
  });
  
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  child.on('exit', (code) => {
    console.log(`[${new Date().toISOString()}] Server exited (${code}), restarting in 3s...`);
    setTimeout(start, 3000);
  });
  
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
    setTimeout(start, 3000);
  });
}

start();

// Keep alive
setInterval(() => {
  // heartbeat
}, 10000);
