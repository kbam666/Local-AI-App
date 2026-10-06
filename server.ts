import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

// Middlewares
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// CORS helper for local Termux & LAN requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helper to detect Termux environment
function checkIsTermux(): boolean {
  if (process.env.TERMUX_VERSION) return true;
  if (process.env.PREFIX && process.env.PREFIX.includes('com.termux')) return true;
  try {
    return fs.existsSync('/data/data/com.termux');
  } catch {
    return false;
  }
}

// Get local network interfaces IP addresses
function getNetworkIPs(): { name: string; address: string; family: string }[] {
  const interfaces = os.networkInterfaces();
  const addresses: { name: string; address: string; family: string }[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' || (iface as any).family === 4) {
        addresses.push({
          name,
          address: iface.address,
          family: 'IPv4',
        });
      }
    }
  }
  return addresses;
}

// ==============================================================================
// Termux API Endpoints
// ==============================================================================

// Healthcheck
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: Date.now(),
    isTermux: checkIsTermux(),
  });
});

// Termux Server Status & Hardware Info
app.get('/api/termux/status', (req: Request, res: Response) => {
  const isTermux = checkIsTermux();
  const mem = process.memoryUsage();
  const ips = getNetworkIPs();
  const cpus = os.cpus();

  res.json({
    status: 'online',
    isTermux,
    environmentName: isTermux ? 'Android Termux (On-Device Linux)' : `Local Node.js (${process.platform})`,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    cpuCores: cpus.length,
    cpuModel: cpus[0]?.model || 'ARM/x86 CPU',
    memoryUsageMB: {
      rss: Math.round(mem.rss / (1024 * 1024)),
      heapUsed: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotal: Math.round(mem.heapTotal / (1024 * 1024)),
      external: Math.round(mem.external / (1024 * 1024)),
    },
    totalSystemMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
    freeSystemMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
    networkIPs: ips,
    port: PORT,
    urls: {
      localhost: `http://localhost:${PORT}`,
      loopback: `http://127.0.0.1:${PORT}`,
      lan: ips.filter((i) => i.address !== '127.0.0.1').map((i) => `http://${i.address}:${PORT}`),
    },
  });
});

// Raw Termux Setup Script Endpoint for One-Line cURL Execution
app.get('/api/termux/setup.sh', (req: Request, res: Response) => {
  const scriptPath = path.resolve(__dirname, 'scripts', 'termux-setup.sh');
  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Type', 'text/x-shellscript');
    res.setHeader('Content-Disposition', 'inline; filename="termux-setup.sh"');
    return res.sendFile(scriptPath);
  }

  // Fallback inline setup script
  const fallbackScript = `#!/data/data/com.termux/files/usr/bin/bash
pkg update -y && pkg install -y nodejs-lts git clang
termux-setup-storage || true
termux-wake-lock || true
echo "Termux dependencies installed! Now run: npm start"
`;
  res.setHeader('Content-Type', 'text/x-shellscript');
  res.send(fallbackScript);
});

// Run Code Locally via Termux Server
app.post('/api/termux/run-code', async (req: Request, res: Response) => {
  const { code, language = 'javascript' } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code string is required' });
  }

  if (language === 'javascript' || language === 'js') {
    const logs: string[] = [];
    const startTime = Date.now();
    const startMem = process.memoryUsage().heapUsed;

    const customConsole = {
      log: (...args: any[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.map(String).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
      info: (...args: any[]) => logs.push('[INFO] ' + args.map(String).join(' ')),
    };

    const sandbox = {
      console: customConsole,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer,
      process: {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        uptime: () => process.uptime(),
        memoryUsage: () => process.memoryUsage(),
      },
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
    };

    try {
      const script = new vm.Script(code);
      const context = vm.createContext(sandbox);
      const result = script.runInContext(context, { timeout: 5000 });

      const elapsedMs = Date.now() - startTime;
      const endMem = process.memoryUsage().heapUsed;
      const memDeltaKB = Math.round((endMem - startMem) / 1024);

      return res.json({
        success: true,
        output: logs.join('\n') || (result !== undefined ? String(result) : '(No output returned)'),
        result: result !== undefined ? String(result) : undefined,
        logs,
        elapsedMs,
        memDeltaKB,
        executedIn: checkIsTermux() ? 'Termux VM' : 'Node.js Local Engine',
      });
    } catch (err: any) {
      return res.json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
        logs,
        elapsedMs: Date.now() - startTime,
      });
    }
  }

  return res.status(400).json({ error: `Unsupported language: ${language}. Use 'javascript'` });
});

// OpenAI-Compatible Local Chat Completions Endpoint for Termux curl & scripts
app.post(['/api/chat/completions', '/api/termux/chat'], (req: Request, res: Response) => {
  const { messages, prompt, model = 'droidllm-local' } = req.body;

  let userPrompt = '';
  if (Array.isArray(messages) && messages.length > 0) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    userPrompt = lastUser?.content || messages[messages.length - 1]?.content || '';
  } else if (typeof prompt === 'string') {
    userPrompt = prompt;
  }

  if (!userPrompt) {
    return res.status(400).json({
      error: { message: 'Missing messages or prompt in request body', type: 'invalid_request_error' },
    });
  }

  // Generate lightweight fast local response for CLI / cURL
  const responseId = `chatcmpl-${Date.now()}`;
  const responseText = `[DroidLLM Termux Local Server Response]\nReceived query: "${userPrompt.slice(0, 80)}${userPrompt.length > 80 ? '...' : ''}"\nProcessed on-device inside Android Termux node server (arch: ${process.arch}). Zero cloud calls made.`;

  res.json({
    id: responseId,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: responseText,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: Math.ceil(userPrompt.length / 4),
      completion_tokens: Math.ceil(responseText.length / 4),
      total_tokens: Math.ceil((userPrompt.length + responseText.length) / 4),
    },
  });
});

// ==============================================================================
// Vite / Static Files Mounting
// ==============================================================================

async function startServer() {
  if (!isProd) {
    // In dev mode, mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built dist files
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      app.get('*', (req: Request, res: Response) => {
        res.status(404).send('Build files not found. Run "npm run build" first.');
      });
    }
  }

  app.listen(PORT, HOST, () => {
    const isTermux = checkIsTermux();
    console.log(`\n======================================================`);
    console.log(`  DroidLLM Local Server Running!`);
    console.log(`  Environment: ${isTermux ? 'Android Termux' : process.platform} (${process.arch})`);
    console.log(`  Local URL:   http://localhost:${PORT}`);
    console.log(`  LAN URL:     http://${HOST}:${PORT}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DroidLLM local server:', err);
  process.exit(1);
});
