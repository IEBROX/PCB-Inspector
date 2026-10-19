import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class PythonBackendManager {
  private pyProcess: ChildProcess | null = null;
  private port: number = 8000;
  private isShuttingDown: boolean = false;
  private lastError: string | null = null;
  private logFilePath: string = '';
  private logStream: fs.WriteStream | null = null;

  constructor(defaultPort: number = 8000) {
    this.port = defaultPort;
  }

  public getPort(): number {
    return this.port;
  }

  public getBackendUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getLogPath(): string {
    return this.logFilePath;
  }

  /**
   * Find an available local port starting from preferredPort
   */
  private async findAvailablePort(preferredPort: number): Promise<number> {
    const isPortFree = (portToCheck: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const tester = net.createServer();
        tester.once('error', () => resolve(false));
        tester.once('listening', () => {
          tester.close(() => resolve(true));
        });
        tester.listen(portToCheck, '127.0.0.1');
      });
    };

    if (await isPortFree(preferredPort)) {
      return preferredPort;
    }

    // Try sequential ports in 8001-8050 range
    for (let p = preferredPort + 1; p < preferredPort + 50; p++) {
      if (await isPortFree(p)) {
        return p;
      }
    }

    // Fallback to random free ephemeral port
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address() as net.AddressInfo;
        server.close(() => resolve(port));
      });
    });
  }

  public async isBackendHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`${this.getBackendUrl()}/health`, { timeout: 2000 }, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public async start(): Promise<boolean> {
    this.isShuttingDown = false;
    this.lastError = null;

    // Check if an existing backend is already healthy at preferred port
    const alreadyHealthy = await this.isBackendHealthy();
    if (alreadyHealthy) {
      console.log(`[PythonManager] Existing backend healthy at ${this.getBackendUrl()}`);
      return true;
    }

    // Select dynamic free port to avoid collision
    this.port = await this.findAvailablePort(this.port);
    console.log(`[PythonManager] Selected port ${this.port} for backend service`);

    // Prepare logs directory in per-user data directory
    try {
      const userDataPath = app.getPath('userData');
      const logsDir = path.join(userDataPath, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      this.logFilePath = path.join(logsDir, 'backend.log');
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
      this.logStream.write(`\n--- [${new Date().toISOString()}] Launching backend on port ${this.port} ---\n`);
    } catch (e) {
      console.warn('[PythonManager] Could not initialize backend log file:', e);
    }

    let executable = '';
    let args: string[] = [];
    let cwd = '';

    if (app.isPackaged) {
      // Production Packaged App: look for PyInstaller standalone executable
      const candidateExePaths = [
        path.join(process.resourcesPath, 'backend', 'pcb-backend.exe'),
        path.join(process.resourcesPath, 'backend', 'pcb-backend', 'pcb-backend.exe'),
        path.join(process.resourcesPath, 'pcb-backend', 'pcb-backend.exe'),
        path.join(process.resourcesPath, 'pcb-backend.exe'),
      ];

      for (const cand of candidateExePaths) {
        if (fs.existsSync(cand)) {
          executable = cand;
          cwd = path.dirname(cand);
          break;
        }
      }

      if (!executable) {
        this.lastError = `Standalone backend executable not found in resources. Checked: ${candidateExePaths.join(', ')}`;
        console.error(`[PythonManager] ${this.lastError}`);
        return false;
      }

      args = ['--port', String(this.port), '--host', '127.0.0.1'];
    } else {
      // Development mode: look for local virtualenv python first
      const venvPy = path.join(app.getAppPath(), '.venv', 'Scripts', 'python.exe');
      const candidates = [
        process.env.PYTHON_PATH,
        venvPy,
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
        'python.exe',
        'python',
      ].filter(Boolean) as string[];

      for (const cand of candidates) {
        if (cand && fs.existsSync(cand)) {
          executable = cand;
          break;
        }
      }
      if (!executable) executable = 'python';

      const scriptPath = path.join(app.getAppPath(), 'backend', 'main.py');
      cwd = path.join(app.getAppPath(), 'backend');
      args = [scriptPath, '--port', String(this.port), '--host', '127.0.0.1'];
    }

    const userDataPath = app.getPath('userData');
    const resourcesPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
    const packagedModel = path.join(resourcesPath, 'models', 'pcb_best.pt');

    console.log(`[PythonManager] Spawning: ${executable} ${args.join(' ')} (CWD: ${cwd})`);

    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONUNBUFFERED: '1',
      PORT: String(this.port),
      HOST: '127.0.0.1',
      PCB_USER_DATA_DIR: userDataPath,
      PCB_RESOURCES_DIR: resourcesPath,
    };
    if (fs.existsSync(packagedModel)) {
      childEnv.PCB_MODEL_PATH = packagedModel;
    }

    try {
      this.pyProcess = spawn(executable, args, {
        cwd,
        env: childEnv,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      this.pyProcess.stdout?.on('data', (data) => {
        const msg = data.toString();
        this.logStream?.write(`[stdout] ${msg}`);
        console.log(`[Backend stdout]: ${msg.trim()}`);
      });

      this.pyProcess.stderr?.on('data', (data) => {
        const msg = data.toString();
        this.logStream?.write(`[stderr] ${msg}`);
        console.warn(`[Backend stderr]: ${msg.trim()}`);
      });

      this.pyProcess.on('error', (err) => {
        this.lastError = `Failed to start backend process: ${err.message}`;
        this.logStream?.write(`[Process Error]: ${err.message}\n`);
        console.error('[PythonManager] Process error:', err);
      });

      this.pyProcess.on('exit', (code, signal) => {
        const exitMsg = `Backend process exited with code ${code}, signal ${signal}`;
        this.logStream?.write(`[Process Exit]: ${exitMsg}\n`);
        if (!this.isShuttingDown) {
          this.lastError = exitMsg;
          console.error(`[PythonManager] ${exitMsg}`);
        }
      });

      // Poll until healthy or 60s timeout (allowing YOLO model loading)
      const isHealthy = await this.waitForHealthy(60000);
      if (!isHealthy && !this.lastError) {
        this.lastError = `Backend did not respond on http://127.0.0.1:${this.port}/health within 60s.`;
      }
      return isHealthy;
    } catch (err: any) {
      this.lastError = `Failed to spawn backend process: ${err.message}`;
      console.error('[PythonManager]', this.lastError);
      return false;
    }
  }

  private async waitForHealthy(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.isShuttingDown) return false;
      const ok = await this.isBackendHealthy();
      if (ok) return true;
      await new Promise((r) => setTimeout(r, 600));
    }
    return false;
  }

  public stop(): void {
    this.isShuttingDown = true;
    if (this.pyProcess) {
      const pid = this.pyProcess.pid;
      console.log(`[PythonManager] Terminating backend process (PID ${pid})...`);
      try {
        if (process.platform === 'win32' && pid) {
          spawn('taskkill', ['/pid', String(pid), '/f', '/t']);
        } else {
          this.pyProcess.kill('SIGTERM');
        }
      } catch (e) {
        console.error('[PythonManager] Error stopping backend:', e);
      }
      this.pyProcess = null;
    }

    if (this.logStream) {
      try {
        this.logStream.end();
      } catch (_) {}
      this.logStream = null;
    }
  }
}
