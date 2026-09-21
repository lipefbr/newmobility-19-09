import { spawn } from 'child_process';
import { createServer } from 'http';

// Start a simple keep-alive HTTP server on port 3001
// that proxies to the Next.js server on port 3000
const keepAliveServer = createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
});
keepAliveServer.listen(3001, () => {
  console.log('Keep-alive server on 3001');
});

let child = null;
let restartCount = 0;
const MAX_RESTARTS = 1000;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    console.error('Max restarts reached');
    return;
  }
  
  restartCount++;
  console.log(`[${new Date().toISOString()}] Starting server (attempt ${restartCount})...`);
  
  child = spawn('node', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512', PORT: '3000' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code=${code} signal=${signal}`);
    child = null;
    // Wait 2 seconds before restarting
    setTimeout(startServer, 2000);
  });
  
  child.on('error', (err) => {
    console.error('Failed to start server:', err);
    setTimeout(startServer, 2000);
  });
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  if (child) child.kill('SIGTERM');
  keepAliveServer.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  if (child) child.kill('SIGINT');
  keepAliveServer.close();
  process.exit(0);
});
