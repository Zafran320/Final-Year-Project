import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { registerGeminiLiveProxy } from "../geminiLiveProxy";
import { serveStatic, setupVite } from "./vite";
import { app } from "./app";
import { resolveSessionSecret } from "./env";
import { reportLocationServiceStatus } from "../services/location";
import { isJSearchConfigured } from "../services/jsearchProvider";
import { isSerpApiConfigured } from "../services/serpapiProvider";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Fail fast in production if JWT_SECRET is missing or weak.
  resolveSessionSecret();

  const server = createServer(app);

  // Real-time speech-to-speech (Gemini Live) WebSocket proxy
  registerGeminiLiveProxy(server);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    const jobProviders = [isJSearchConfigured() && "JSearch", isSerpApiConfigured() && "SerpApi"].filter(Boolean);
    if (jobProviders.length > 0) console.log(`[Jobs] Live job search connected: ${jobProviders.join(" + ")}`);
    else console.warn("[Jobs] No job search API key set (JSEARCH_API_KEY / SERPAPI_API_KEY); Job Radar will show a 'connect API key' message.");
    void reportLocationServiceStatus();
  });
}

startServer().catch(console.error);

