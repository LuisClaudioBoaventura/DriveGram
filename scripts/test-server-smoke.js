#!/usr/bin/env node
/**
 * test-server-smoke.js
 * 
 * Smoke test automatizado para validar se o bundle do servidor embutido
 * (server.bundle.js) gerado pelo esbuild inicializa corretamente e
 * responde às rotas essenciais sem quebras de dependências ou runtime.
 *
 * Utilizado localmente antes de releases e no CI do GitHub Actions.
 */

import http from 'http';
import path from 'path';
import fs from 'fs';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const TEST_PORT = 5099;
const TEST_HOST = '127.0.0.1';
const BUNDLE_PATH = path.join(rootDir, 'www', 'nodejs-project', 'server.bundle.js');
const TMP_DATA_DIR = path.join(rootDir, '_tmp_smoke_test_data');
const TMP_UPLOADS_DIR = path.join(TMP_DATA_DIR, 'uploads');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(msg, color = COLORS.reset) {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function ensureBundleExists() {
  if (!fs.existsSync(BUNDLE_PATH)) {
    log('[Smoke Test] ⚠️  server.bundle.js não encontrado. Executando build-embedded-server.js...', COLORS.yellow);
    execSync('node scripts/build-embedded-server.js', { stdio: 'inherit', cwd: rootDir });
  }
  if (!fs.existsSync(BUNDLE_PATH)) {
    throw new Error(`Bundle não encontrado em: ${BUNDLE_PATH}`);
  }
  const stats = fs.statSync(BUNDLE_PATH);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  log(`[Smoke Test] 📦 Bundle localizado: ${BUNDLE_PATH} (${sizeMb} MB)`, COLORS.cyan);
}

function setupTempDirs() {
  cleanupTempDirs();
  fs.mkdirSync(TMP_UPLOADS_DIR, { recursive: true });
}

function cleanupTempDirs() {
  try {
    if (fs.existsSync(TMP_DATA_DIR)) {
      fs.rmSync(TMP_DATA_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    // Ignora erros não críticos de limpeza
  }
}

function requestHttp(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${TEST_HOST}:${TEST_PORT}${endpoint}`, { timeout: 4000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (err) {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout ao requisitar ${endpoint}`));
    });
  });
}

async function waitForServerReady(maxWaitMs = 20000) {
  const startTime = Date.now();
  const pollInterval = 400;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await requestHttp('/api/health');
      if (res.status === 200) {
        return true;
      }
    } catch (_) {
      // Servidor ainda subindo, aguarda o próximo ciclo
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  return false;
}

function killProcess(child) {
  if (!child || !child.pid) return;

  try {
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      } catch (_) {
        child.kill('SIGKILL');
      }
    } else {
      child.kill('SIGTERM');
      setTimeout(() => {
        try { child.kill('SIGKILL'); } catch (_) {}
      }, 1000);
    }
  } catch (_) {}
}

async function run() {
  log('\n======================================================', COLORS.bold);
  log('   🔍 DriveGram Server Bundle Smoke Test', COLORS.bold + COLORS.cyan);
  log('======================================================\n', COLORS.bold);

  ensureBundleExists();
  setupTempDirs();

  let serverStdout = '';
  let serverStderr = '';
  let child = null;
  let isShuttingDown = false;

  try {
    log(`[Smoke Test] 🚀 Inicializando servidor embutido na porta ${TEST_PORT}...`, COLORS.gray);

    child = spawn(process.execPath, [BUNDLE_PATH], {
      cwd: path.dirname(BUNDLE_PATH),
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        NODE_ENV: 'test',
        DRIVEGRAM_EMBEDDED: '1',
        DRIVEGRAM_DATA_DIR: TMP_DATA_DIR,
        DRIVEGRAM_UPLOADS_DIR: TMP_UPLOADS_DIR,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (buf) => {
      serverStdout += buf.toString();
    });
    child.stderr.on('data', (buf) => {
      serverStderr += buf.toString();
    });

    child.on('exit', (code) => {
      if (!isShuttingDown && code !== null && code !== 0) {
        log(`[Smoke Test] ❌ O processo do servidor finalizou inesperadamente com código: ${code}`, COLORS.red);
      }
    });

    // Aguardar servidor ficar pronto
    log('[Smoke Test] ⏳ Aguardando prontidão do servidor...', COLORS.gray);
    const isReady = await waitForServerReady();

    if (!isReady) {
      throw new Error('Timeout: O servidor embutido não respondeu dentro do limite de 20 segundos.');
    }

    log('[Smoke Test] ✅ Servidor respondeu com sucesso!', COLORS.green);

    // Bateria de Testes
    const tests = [
      {
        name: 'GET /api/health (Health check & status embutido)',
        run: async () => {
          const res = await requestHttp('/api/health');
          if (res.status !== 200) throw new Error(`Status esperado 200, recebido ${res.status}`);
          if (res.data?.status !== 'ok') throw new Error(`Status de saúde não é 'ok': ${JSON.stringify(res.data)}`);
          if (!res.data?.isEmbedded) throw new Error(`isEmbedded esperado true, recebido: ${res.data?.isEmbedded}`);
          return `Versão: ${res.data.version}, Uptime: ${res.data.uptime}s`;
        },
      },
      {
        name: 'GET /api/status (Alias para saúde do sistema)',
        run: async () => {
          const res = await requestHttp('/api/status');
          if (res.status !== 200) throw new Error(`Status esperado 200, recebido ${res.status}`);
          if (res.data?.status !== 'ok') throw new Error(`Status não é 'ok'`);
          return 'Status OK';
        },
      },
      {
        name: 'GET /api/folders (Banco de dados de pastas)',
        run: async () => {
          const res = await requestHttp('/api/folders');
          if (res.status !== 200) throw new Error(`Status esperado 200, recebido ${res.status}`);
          if (!Array.isArray(res.data)) throw new Error('A resposta de folders deve ser um array');
          return `${res.data.length} pasta(s) retornada(s)`;
        },
      },
      {
        name: 'GET /api/telegram/status (Serviço de nuvem/Telegram)',
        run: async () => {
          const res = await requestHttp('/api/telegram/status');
          if (res.status !== 200) throw new Error(`Status esperado 200, recebido ${res.status}`);
          if (typeof res.data?.isConnected !== 'boolean') throw new Error('Campo isConnected inválido');
          return `Conectado: ${res.data.isConnected}`;
        },
      },
    ];

    log('\n[Smoke Test] 🧪 Executando verificações de rotas...', COLORS.bold);
    let passedCount = 0;

    for (const test of tests) {
      try {
        const details = await test.run();
        log(`  ✔ ${test.name} → ${details}`, COLORS.green);
        passedCount++;
      } catch (err) {
        log(`  ✖ ${test.name} → FALHOU: ${err.message}`, COLORS.red);
        throw err;
      }
    }

    log(`\n[Smoke Test] 🎉 Todos os ${passedCount} testes passaram com sucesso!`, COLORS.bold + COLORS.green);
    log('======================================================\n', COLORS.bold);

  } catch (err) {
    log(`\n[Smoke Test] ❌ ERRO CRÍTICO NO SMOKE TEST: ${err.message}\n`, COLORS.bold + COLORS.red);

    if (serverStderr.trim()) {
      log('--- [Server STDERR] ---', COLORS.yellow);
      console.error(serverStderr);
      log('------------------------', COLORS.yellow);
    }
    if (serverStdout.trim()) {
      log('--- [Server STDOUT (últimas 20 linhas)] ---', COLORS.gray);
      const lines = serverStdout.trim().split('\n');
      console.log(lines.slice(-20).join('\n'));
      log('-------------------------------------------', COLORS.gray);
    }

    process.exitCode = 1;
  } finally {
    if (child) {
      isShuttingDown = true;
      log('[Smoke Test] 🛑 Encerrando processo do servidor de teste...', COLORS.gray);
      killProcess(child);
    }
    cleanupTempDirs();
  }
}

run();
