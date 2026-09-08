/**
 * ensure-desktop-node.js
 * 
 * Verifica se o executável standalone oficial do Node.js (Windows x64)
 * está presente em src-tauri/bin/node.exe. Se não estiver, realiza o download
 * diretamente do repositório oficial da OpenJS Foundation (nodejs.org).
 *
 * Isso permite empacotar o DriveGram para o usuário final de modo 100% autônomo,
 * sem exigir que o usuário tenha Node.js ou Rust instalados na máquina.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const NODE_VERSION = 'v20.18.3'; // LTS v20 estável e leve
const NODE_URL = `https://nodejs.org/dist/${NODE_VERSION}/win-x64/node.exe`;

const targetDir = path.join(rootDir, 'src-tauri', 'bin');
const targetExe = path.join(targetDir, 'node.exe');
const tempExe = path.join(targetDir, 'node.exe.tmp');

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Tratar redirecionamentos HTTP (301, 302, 307)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`[Desktop Runtime] Redirecionando para: ${response.headers.location}`);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Falha no download de node.exe: status HTTP ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let lastReport = 0;

      const fileStream = fs.createWriteStream(destPath);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        if (now - lastReport > 500 || downloadedBytes === totalBytes) {
          lastReport = now;
          const mbCurrent = (downloadedBytes / (1024 * 1024)).toFixed(1);
          const mbTotal = totalBytes ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';
          const percent = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          process.stdout.write(`\r[Desktop Runtime] Baixando Node.js ${NODE_VERSION}: ${mbCurrent}/${mbTotal} MB (${percent}%)...`);
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => {
          console.log('\n[Desktop Runtime] ✅ Download concluído com sucesso!');
          resolve();
        });
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function ensureNodeBinary() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Se já existe e tem tamanho plausível (> 30MB)
  if (fs.existsSync(targetExe)) {
    const stats = fs.statSync(targetExe);
    if (stats.size > 30 * 1024 * 1024) {
      console.log(`[Desktop Runtime] Node.js standalone já presente: ${(stats.size / (1024 * 1024)).toFixed(1)} MB (${targetExe})`);
      return;
    }
    console.log('[Desktop Runtime] Arquivo node.exe existente corrompido ou incompleto. Baixando novamente...');
    fs.unlinkSync(targetExe);
  }

  console.log(`[Desktop Runtime] Baixando runtime Node.js standalone (${NODE_VERSION}) para embutir no instalador...`);
  console.log(`[Desktop Runtime] URL: ${NODE_URL}`);

  try {
    await downloadFile(NODE_URL, tempExe);
    fs.renameSync(tempExe, targetExe);
    const finalStats = fs.statSync(targetExe);
    console.log(`[Desktop Runtime] ✅ Runtime Node.js pronto em: ${targetExe} (${(finalStats.size / (1024 * 1024)).toFixed(1)} MB)`);
  } catch (err) {
    if (fs.existsSync(tempExe)) {
      fs.unlinkSync(tempExe);
    }
    console.error('[Desktop Runtime] ❌ Erro ao baixar Node.js standalone:', err.message);
    throw err;
  }
}

ensureNodeBinary().catch((err) => {
  console.error(err);
  process.exit(1);
});
