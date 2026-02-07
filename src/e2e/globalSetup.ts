import { spawn } from "node:child_process";
import net from "node:net";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to acquire a free port"));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHttpOk(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return;
    } catch {
      // ignore
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error(`Timed out waiting for server: ${url}`);
}

export default async function globalSetup() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  // Make tests pick up the URL dynamically.
  process.env.E2E_BASE_URL = baseUrl;
  process.env.MOCK_BRAINSTORM = "1";

  // For E2E runs we disable Turnstile by default so local/dev environments don't
  // require a browser-verified token.
  if (process.env.E2E_DISABLE_TURNSTILE !== "0") {
    process.env.TURNSTILE_DISABLED = "1";
  }

  const child = spawn(
    "pnpm",
    ["exec", "next", "dev", "-H", "127.0.0.1", "-p", String(port)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_TELEMETRY_DISABLED: "1",
        MOCK_BRAINSTORM: "1",
        TURNSTILE_DISABLED: process.env.TURNSTILE_DISABLED,
      },
    },
  );

  await waitForHttpOk(baseUrl, 90_000);

  const exited = new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
  });

  return async () => {
    if (!child.pid) return;

    // Try graceful shutdown first.
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }

    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 10_000));
    await Promise.race([exited, timeout]);

    if (child.exitCode === null && child.signalCode === null) {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
  };
}
