import { spawn } from "child_process";

const env = {
  ...process.env,
  DATABASE_URL: "postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  NEON_DATABASE_URL: "postgresql://neondb_owner:npg_2Ul5CdKOpRiu@ep-twilight-night-aqn8fqln-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
  HOSTNAME: "0.0.0.0",
  PORT: "3000",
  NODE_OPTIONS: "--max-old-space-size=512",
};

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting Next.js server...`);
  const child = spawn("node", [".next/standalone/server.js"], {
    cwd: "/home/z/my-project",
    env,
    stdio: "inherit",
  });
  
  child.on("exit", (code) => {
    console.log(`[${new Date().toISOString()}] Server exited with code ${code}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
  
  child.on("error", (err) => {
    console.error(`[${new Date().toISOString()}] Server error: ${err.message}`);
    setTimeout(startServer, 3000);
  });
}

startServer();

// Keep the process alive
process.on("SIGTERM", () => { console.log("Received SIGTERM, ignoring"); });
process.on("SIGINT", () => { console.log("Received SIGINT, ignoring"); });
