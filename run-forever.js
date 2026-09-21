const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  const ts = new Date().toISOString();
  console.log(`[${ts}] Starting server...`);
  
  const child = spawn('node', [
    '--max-old-space-size=256',
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
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('exit', (code, signal) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] Server exited code=${code} signal=${signal}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });

  child.on('error', (err) => {
    const ts = new Date().toISOString();
    console.error(`[${ts}] Failed to start:`, err.message);
    setTimeout(startServer, 5000);
  });
}

startServer();

// Keep the process alive
setInterval(() => {}, 60000);
