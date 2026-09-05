import 'dotenv/config';

process.on('unhandledRejection', (reason: any) => {
  console.warn('[Process Warn] Unhandled rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('[Process Error] Uncaught exception:', err?.message || err);
});

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, fixUtf8Encoding } from './database.js';
import { telegramService } from './telegram.js';
import { castService } from './cast.js';
import { comicService } from './comicService.js';
import { parseYouTubeUrl, extractYouTubeVideoId } from './youtube-parser.js';
import { FileType } from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = process.env.DRIVEGRAM_UPLOADS_DIR || process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helper para prevenir ataques de Path Traversal ao acessar arquivos do disco
export function getSafeUploadPath(fileName: string): string {
  const sanitized = path.basename(fileName).replace(/\0/g, '');
  const resolved = path.resolve(UPLOADS_DIR, sanitized);
  const baseResolved = path.resolve(UPLOADS_DIR);
  if (!resolved.startsWith(baseResolved)) {
    throw new Error('Tentativa de violação de segurança de caminho (Path Traversal)');
  }
  return resolved;
}

// Configurar o callback de backup automático contínuo na nuvem (Telegram)
db.setCloudBackupCallback(async () => {
  try {
    const client = await telegramService.ensureClient();
    if (client && telegramService.getAuthState().isConnected) {
      console.log('[DriveGram Auto-Backup] Salvando alterações de metadados nas Mensagens Salvas do Telegram...');
      await telegramService.syncMetadataToTelegram();
    }
  } catch (err: any) {
    console.warn('[DriveGram Auto-Backup] Erro ao sincronizar metadados no Telegram em segundo plano:', err?.message || err);
  }
});

// Helper para localizar arquivos locais existentes testando múltiplos nomes possíveis
export function resolveExistingLocalFilePath(file: any): string | null {
  if (!file) return null;
  const candidates = [
    file.telegramMeta?.telegramFileName,
    `${file.id}.${file.extension}`,
    file.name,
    `${file.id}_${file.name}`,
    file.extension ? `${file.id}.${file.extension.toLowerCase()}` : null
  ].filter(Boolean) as string[];

  for (const name of candidates) {
    try {
      const candidatePath = getSafeUploadPath(name);
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).size > 0) {
        return candidatePath;
      }
    } catch (_) {}
  }
  return null;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const originalClean = fixUtf8Encoding(file.originalname);
    const cleanOriginalName = path.basename(originalClean).replace(/[^a-zA-Z0-9._\-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + cleanOriginalName);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB max per file
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['*']
}));
app.use(express.json({ limit: '50mb' }));

function getFileType(extension: string): FileType {
  const ext = extension.toLowerCase().replace('.', '');
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'flv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['cbr', 'cbz', 'cbt', 'cb7'].includes(ext)) return 'comic';
  if (['epub', 'mobi', 'azw', 'azw3', 'fb2'].includes(ext)) return 'ebook';
  if (['vtt', 'srt', 'sub', 'ass', 'sbv'].includes(ext)) return 'subtitle';
  if (['doc', 'docx', 'txt', 'rtf', 'odt', 'xlsx', 'xls', 'csv', 'pptx', 'ppt', 'md'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'php', 'sql'].includes(ext)) return 'code';
  return 'other';
}

// ---------------- HEALTH CHECK (AND READINESS PROBE) ----------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: Date.now(),
    version: '1.0.0',
    uploadsDir: UPLOADS_DIR,
    isEmbedded: Boolean(process.env.DRIVEGRAM_EMBEDDED)
  });
});

// ---------------- FOLDERS ----------------
app.get('/api/folders', (req, res) => {
  const parentId = (req.query.parentId as string) || null;
  const all = req.query.all === 'true';
  if (all) {
    return res.json(db.getAllFolders());
  }
  res.json(db.getFolders(parentId));
});

app.post('/api/folders', (req, res) => {
  const { name, parentId, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da pasta é obrigatório' });
  const cleanName = fixUtf8Encoding(name);
  const folder = db.createFolder(cleanName, parentId || null, color);
  res.status(201).json(folder);
});

app.patch('/api/folders/:id', (req, res) => {
  const body = { ...req.body };
  if (body.name) body.name = fixUtf8Encoding(body.name);
  const folder = db.updateFolder(req.params.id, body);
  if (!folder) return res.status(404).json({ error: 'Pasta não encontrada' });
  res.json(folder);
});

app.delete('/api/folders/:id', async (req, res) => {
  const permanent = req.query.permanent === 'true';
  const result = db.deleteFolder(req.params.id, permanent);

  if (permanent && result.deletedFiles && result.deletedFiles.length > 0) {
    for (const f of result.deletedFiles) {
      if (f.telegramMeta?.messageId) {
        await telegramService.deleteMessageFromTelegram(f.telegramMeta.messageId);
      }
      const diskFileName = f.telegramMeta?.telegramFileName || `${f.id}.${f.extension}`;
      try {
        const filePath = getSafeUploadPath(diskFileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {}
    }
  }

  res.json({ success: true });
});

// ---------------- FILES ----------------
app.get('/api/files', (req, res) => {
  const parentId = (req.query.parentId as string) || null;
  const all = req.query.all === 'true';
  if (all) {
    return res.json(db.getAllFiles());
  }
  res.json(db.getFiles(parentId));
});

interface ServerUploadProgress {
  uploadId: string;
  fileName: string;
  size: number;
  transferred: number;
  progress: number;
  speed: string;
  stage: 'local' | 'cloud' | 'completed' | 'error';
  stageLabel: string;
  updatedAt: number;
}
const activeUploadsMap = new Map<string, ServerUploadProgress>();

app.get(['/api/uploads/progress/:id', '/api/upload-progress/:id'], (req, res) => {
  const progress = activeUploadsMap.get(req.params.id);
  if (progress) {
    res.json(progress);
  } else {
    res.json({ progress: 0, transferred: 0, size: 0, stage: 'idle', speed: '' });
  }
});

app.post('/api/files/upload', upload.single('file'), async (req, res) => {
  const uploadId = (req.body.uploadId as string) || ('up-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5));

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const originalname = fixUtf8Encoding(req.file.originalname);
    const { size, mimetype, path: tempFilePath } = req.file;
    let parentId = req.body.parentId || null;
    const relativePath = req.body.relativePath ? fixUtf8Encoding(req.body.relativePath as string) : undefined;
    const courseId = req.body.courseId || undefined;
    const moduleId = req.body.moduleId || undefined;
    const lessonId = req.body.lessonId || undefined;

    // Initialise cloud stage in tracker
    activeUploadsMap.set(uploadId, {
      uploadId,
      fileName: originalname,
      size,
      transferred: 0,
      progress: 0,
      speed: 'Conectando ao Telegram...',
      stage: 'cloud',
      stageLabel: 'Enviando para o Telegram Cloud...',
      updatedAt: Date.now()
    });

    // If folder upload with relative path, recursively resolve or create subfolders
    if (relativePath && relativePath.includes('/')) {
      const pathSegments = relativePath.split('/').slice(0, -1); // folders only
      let currentParent = parentId;

      for (const segment of pathSegments) {
        if (!segment.trim()) continue;
        const allFolders = db.getAllFolders();
        let existing = allFolders.find(f => f.parentId === currentParent && f.name === segment.trim() && !f.isTrash);
        if (!existing) {
          existing = db.createFolder(segment.trim(), currentParent);
        }
        currentParent = existing.id;
      }
      parentId = currentParent;
    }

    const ext = path.extname(originalname);
    const fileType = getFileType(ext);

    // Format caption for Telegram
    const caption = `📁 DriveGram File\n📄 Nome: ${originalname}\n📦 Tamanho: ${(size / (1024 * 1024)).toFixed(2)} MB\n🏷️ Pasta: ${parentId || 'Raiz'}`;

    const startTime = Date.now();
    // Upload to Telegram Saved Messages (or fallback in demo mode)
    const telegramResult = await telegramService.uploadToSavedMessages(
      tempFilePath,
      originalname,
      caption,
      (percent) => {
        const transferred = Math.round((percent / 100) * size);
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedMBs = elapsedSec > 0 ? ((transferred / (1024 * 1024)) / elapsedSec).toFixed(1) : '1.0';
        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: originalname,
          size,
          transferred,
          progress: percent,
          speed: `${speedMBs} MB/s`,
          stage: percent >= 100 ? 'completed' : 'cloud',
          stageLabel: percent >= 100 ? 'Salvo no Telegram' : 'Enviando para o Telegram Cloud...',
          updatedAt: Date.now()
        });
      }
    );

    // Register in database
    const newFile = db.createFile({
      name: originalname,
      parentId,
      size,
      mimeType: mimetype,
      extension: ext.replace('.', ''),
      type: fileType,
      telegramMeta: {
        messageId: telegramResult.messageId,
        chatId: 'me',
        fileSize: size,
        mimeType: mimetype,
        telegramFileName: req.file.filename,
        uploadDate: new Date().toISOString(),
        isUploadedToTelegram: telegramResult.success
      },
      courseId,
      moduleId,
      lessonId
    });

    activeUploadsMap.set(uploadId, {
      uploadId,
      fileName: originalname,
      size,
      transferred: size,
      progress: 100,
      speed: 'Concluído',
      stage: 'completed',
      stageLabel: 'Salvo com sucesso no Telegram',
      updatedAt: Date.now()
    });

    setTimeout(() => {
      activeUploadsMap.delete(uploadId);
    }, 15000);

    res.status(201).json(newFile);
  } catch (e: any) {
    console.error('Upload handler error:', e);
    activeUploadsMap.set(uploadId, {
      uploadId,
      fileName: req.file?.originalname || 'Arquivo',
      size: req.file?.size || 0,
      transferred: 0,
      progress: 0,
      speed: 'Erro',
      stage: 'error',
      stageLabel: 'Falha no envio',
      updatedAt: Date.now()
    });
    res.status(500).json({ error: e.message || 'Erro ao processar upload' });
  }
});

app.patch('/api/files/:id', (req, res) => {
  const file = db.updateFile(req.params.id, req.body);
  if (!file) return res.status(404).json({ error: 'Arquivo não encontrado' });
  res.json(file);
});

app.get('/api/files/duplicates', (req, res) => {
  const parentId = (req.query.parentId as string) || null;
  const groups = db.findDuplicates(parentId);
  res.json(groups);
});

app.post('/api/files/check-duplicate', (req, res) => {
  const { name, size, parentId } = req.body;
  if (!name || size === undefined) {
    return res.status(400).json({ error: 'name e size são obrigatórios' });
  }
  const result = db.checkDuplicate(name, Number(size), parentId || null);
  res.json(result);
});

// ---------------- CAST & SMART TV NETWORK TRANSMISSION ----------------
app.get('/api/cast/devices', async (_req, res) => {
  const devices = await castService.scanNetworkDevices();
  res.json(devices);
});

app.get('/api/cast/network-ip', (_req, res) => {
  const localIp = castService.getLocalIpAddress();
  res.json({
    ip: localIp,
    port: PORT,
    baseUrl: `http://${localIp}:${PORT}`
  });
});

app.post('/api/cast/play', async (req, res) => {
  const { deviceId, mediaUrl, title } = req.body;
  if (!deviceId || !mediaUrl) {
    return res.status(400).json({ error: 'deviceId e mediaUrl são obrigatórios' });
  }
  const result = await castService.playOnDevice(deviceId, mediaUrl, title);
  res.json(result);
});

app.delete('/api/files/:id', async (req, res) => {
  const permanent = req.query.permanent === 'true';
  const result = db.deleteFile(req.params.id, permanent);

  if (permanent && result.deletedFile) {
    const file = result.deletedFile;
    if (file.telegramMeta?.messageId) {
      await telegramService.deleteMessageFromTelegram(file.telegramMeta.messageId);
    }
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    try {
      const filePath = getSafeUploadPath(diskFileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }

  res.json({ success: true });
});

// ---------------- TRASH RESTORE & EMPTY ----------------
app.post('/api/trash/restore/:id', (req, res) => {
  const isFolder = req.body.isFolder === true;
  db.restoreItem(req.params.id, isFolder);
  res.json({ success: true, message: 'Item restaurado com sucesso!' });
});

app.post('/api/trash/empty', async (_req, res) => {
  const deletedFiles = db.emptyTrash();
  for (const file of deletedFiles) {
    if (file.telegramMeta?.messageId) {
      await telegramService.deleteMessageFromTelegram(file.telegramMeta.messageId);
    }
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    try {
      const filePath = getSafeUploadPath(diskFileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }
  res.json({ success: true, message: 'Lixeira esvaziada e arquivos removidos do Telegram com sucesso!' });
});

function convertToWebVTT(rawText: string): string {
  let vtt = rawText.replace(/\r\n|\r/g, '\n').trim();
  // Convert SRT comma millisecond format to WebVTT period format: 00:00:01,000 -> 00:00:01.000
  vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  vtt = vtt.replace(/(\d{2}:\d{2}),(\d{3})/g, '00:$1.$2');
  if (!vtt.startsWith('WEBVTT')) {
    vtt = 'WEBVTT\n\n' + vtt;
  }
  return vtt;
}

// ---------------- SUBTITLES WEBVTT ROUTE ----------------
app.get('/api/subtitles/:id', async (req, res) => {
  res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const file = db.getAllFiles().find(f => f.id === req.params.id);
  if (!file) {
    const sampleVtt = `WEBVTT\n\n1\n00:00:00.500 --> 00:00:05.000\nBem-vindos ao DriveGram Cloud!`;
    return res.send(sampleVtt);
  }

  const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
  let filePath = '';
  try {
    filePath = getSafeUploadPath(diskFileName);
  } catch (e) {
    return res.status(400).send('Invalid file path');
  }

  // If local file exists, read it
  if (fs.existsSync(filePath)) {
    try {
      const rawText = fs.readFileSync(filePath, 'utf-8');
      const vtt = convertToWebVTT(rawText);
      return res.send(vtt);
    } catch (e) {}
  }

  // If not on disk, fetch subtitle purely in memory from Telegram (Zero Disk Write)
  if (file.telegramMeta?.messageId) {
    try {
      const buffer = await telegramService.getMediaBufferInMemory(file.telegramMeta.messageId);
      if (buffer) {
        return res.send(convertToWebVTT(buffer.toString('utf-8')));
      }
    } catch (e) {
      console.warn(`Could not fetch subtitle in-memory from Telegram for file ${file.id}:`, e);
    }
  }

  // Fallback default sample if content cannot be read
  const sampleVtt = `WEBVTT\n\n1\n00:00:01.000 --> 00:00:06.000\n${file.name.replace(/\.[^/.]+$/, "")}\n\n2\n00:00:06.500 --> 00:00:15.000\nLegenda sincronizada automaticamente no DriveGram.`;
  res.send(sampleVtt);
});

// ---------------- COMICS & HQS (CBR / CBZ) ROUTES ----------------
app.get('/api/comic/:id/manifest', async (req, res) => {
  try {
    const file = db.getAllFiles().find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'HQ/Comic não encontrada' });

    const existingLocalPath = resolveExistingLocalFilePath(file);
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = existingLocalPath || getSafeUploadPath(diskFileName);
    const expectedSize = file.size || file.telegramMeta?.fileSize || 0;
    const fileExists = fs.existsSync(filePath);
    const fileSizeOnDisk = fileExists ? fs.statSync(filePath).size : 0;
    const isFileComplete = fileExists && (
      (expectedSize > 0 && fileSizeOnDisk >= Math.floor(expectedSize * 0.95)) ||
      (expectedSize === 0 && fileSizeOnDisk > 1024)
    );

    // If file is not complete on disk, download it from Telegram
    if (!isFileComplete && file.telegramMeta?.messageId) {
      console.log(`[DriveGram Comic] Downloading HQ "${file.name}" to disk for page extraction...`);
      const uploadId = `comic-${file.id}`;
      activeUploadsMap.set(uploadId, {
        uploadId,
        fileName: file.name,
        size: expectedSize,
        transferred: 0,
        progress: 0,
        speed: 'Conectando ao Telegram...',
        stage: 'cloud',
        stageLabel: `⚡ Baixando HQ "${file.name}" para a pasta uploads...`,
        updatedAt: Date.now()
      });

      const dlStartTime = Date.now();
      try {
        await telegramService.downloadMediaByMessageId(
          file.telegramMeta.messageId, 
          filePath,
          (pct, transferred, total) => {
            const elapsedSec = Math.max(0.2, (Date.now() - dlStartTime) / 1000);
            const currentTrans = transferred > 0 ? transferred : 0;
            const currentTotal = total > 0 ? total : expectedSize;
            const speedMBs = ((currentTrans / (1024 * 1024)) / elapsedSec).toFixed(1);
            const safePct = Math.min(100, Math.max(0, isNaN(pct) ? Math.round((currentTrans / (currentTotal || 1)) * 100) : pct));

            activeUploadsMap.set(uploadId, {
              uploadId,
              fileName: file.name,
              size: currentTotal,
              transferred: currentTrans,
              progress: safePct,
              speed: `${speedMBs} MB/s`,
              stage: safePct >= 100 ? 'completed' : 'cloud',
              stageLabel: safePct >= 100 ? 'HQ baixada! Extraindo páginas...' : `⚡ Baixando "${file.name}" (${safePct}%)...`,
              updatedAt: Date.now()
            });
          },
          expectedSize
        );

        db.touchFileCachedAt(file.id);

        const finalSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : expectedSize;
        if (finalSize > 0 && file.size !== finalSize) {
          db.updateFile(file.id, { size: finalSize });
        }

        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: file.name,
          size: finalSize,
          transferred: finalSize,
          progress: 100,
          speed: 'Concluído',
          stage: 'completed',
          stageLabel: 'HQ baixada com sucesso!',
          updatedAt: Date.now()
        });
        setTimeout(() => activeUploadsMap.delete(uploadId), 15000);
      } catch (err: any) {
        console.error(`[DriveGram Comic] Error downloading HQ ${file.id}:`, err);
        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: file.name,
          size: expectedSize,
          transferred: 0,
          progress: 0,
          speed: '',
          stage: 'error',
          stageLabel: err.message || 'Falha no download da HQ',
          updatedAt: Date.now()
        });
        throw err;
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo da HQ não disponível no momento' });
    }

    const manifest = await comicService.getManifest(file.id, filePath, file.name);
    res.json(manifest);
  } catch (e: any) {
    console.error('Error getting comic manifest:', e);
    res.status(500).json({ error: e.message || 'Erro ao processar HQ' });
  }
});

app.get('/api/comic/:id/page/:pageIndex', async (req, res) => {
  try {
    const file = db.getAllFiles().find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'HQ/Comic não encontrada' });

    const existingLocalPath = resolveExistingLocalFilePath(file);
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = existingLocalPath || getSafeUploadPath(diskFileName);
    const expectedSize = file.size || file.telegramMeta?.fileSize || 0;
    const isFileComplete = fs.existsSync(filePath) && (expectedSize === 0 || fs.statSync(filePath).size >= Math.floor(expectedSize * 0.95));

    if (!isFileComplete && file.telegramMeta?.messageId) {
      const uploadId = `comic-${file.id}`;
      const dlStart = Date.now();
      activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: expectedSize, transferred: 0, progress: 0, speed: 'Conectando...', stage: 'cloud', stageLabel: `Baixando HQ "${file.name}"...`, updatedAt: Date.now() });
      try {
        await telegramService.downloadMediaByMessageId(file.telegramMeta.messageId, filePath, (pct, transferred, total) => {
          const speed = ((transferred / (1024 * 1024)) / Math.max(0.2, (Date.now() - dlStart) / 1000)).toFixed(1);
          activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: total, transferred, progress: pct, speed: `${speed} MB/s`, stage: pct >= 100 ? 'completed' : 'cloud', stageLabel: pct >= 100 ? 'HQ baixada!' : `Baixando "${file.name}" (${pct}%)...`, updatedAt: Date.now() });
        }, expectedSize);
        db.touchFileCachedAt(file.id);
        activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: expectedSize, transferred: expectedSize, progress: 100, speed: 'Concluído', stage: 'completed', stageLabel: 'HQ baixada!', updatedAt: Date.now() });
        setTimeout(() => activeUploadsMap.delete(uploadId), 15000);
      } catch (dlErr: any) {
        activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: expectedSize, transferred: 0, progress: 0, speed: '', stage: 'error', stageLabel: dlErr.message || 'Falha no download', updatedAt: Date.now() });
        throw dlErr;
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo da HQ não disponível' });
    }

    const pageIndex = parseInt(req.params.pageIndex, 10);
    const page = await comicService.getPage(file.id, filePath, file.name, pageIndex);

    res.setHeader('Content-Type', page.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(page.buffer);
  } catch (e: any) {
    console.error('Error streaming comic page:', e);
    res.status(500).json({ error: e.message || 'Erro ao carregar página da HQ' });
  }
});

// ---------------- MEDIA & FILE CACHE STATUS & ON-DEMAND LOCAL CACHING ----------------
app.get(['/api/video/:id/cache-status', '/api/file/:id/cache-status'], (req, res) => {
  try {
    const file = db.getAllFiles().find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'Arquivo não encontrado' });

    const existingLocalPath = resolveExistingLocalFilePath(file);
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = existingLocalPath || getSafeUploadPath(diskFileName);
    const expectedSize = file.size || file.telegramMeta?.fileSize || 0;
    const fileExists = fs.existsSync(filePath);
    const fileSizeOnDisk = fileExists ? fs.statSync(filePath).size : 0;
    const activeDownload = activeUploadsMap.get(`video-${file.id}`);
    const isActivelyDownloading = !!activeDownload && activeDownload.stage !== 'completed' && activeDownload.stage !== 'error';

    const isCached = !isActivelyDownloading && fileExists && (
      (expectedSize > 0 && fileSizeOnDisk >= Math.floor(expectedSize * 0.95)) ||
      (expectedSize === 0 && fileSizeOnDisk > 1024)
    );

    res.json({
      cached: isCached,
      size: expectedSize || fileSizeOnDisk || (activeDownload?.size || 0),
      transferred: isCached ? (fileSizeOnDisk || expectedSize) : (activeDownload?.transferred || 0),
      progress: isCached ? 100 : (activeDownload?.progress || 0),
      speed: isCached ? 'Pasta uploads' : (activeDownload?.speed || ''),
      stage: isCached ? 'completed' : (activeDownload?.stage || (isActivelyDownloading ? 'cloud' : 'idle')),
      stageLabel: isCached ? 'Vídeo disponível na pasta uploads!' : (activeDownload?.stageLabel || (isActivelyDownloading ? 'Baixando...' : 'Não iniciado')),
      isDownloading: isActivelyDownloading
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Erro ao verificar status do vídeo' });
  }
});

app.post(['/api/video/:id/cache', '/api/file/:id/cache'], async (req, res) => {
  try {
    const file = db.getAllFiles().find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'Arquivo não encontrado' });

    const existingLocalPath = resolveExistingLocalFilePath(file);
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = existingLocalPath || getSafeUploadPath(diskFileName);
    const expectedSize = file.size || file.telegramMeta?.fileSize || 0;
    const fileExists = fs.existsSync(filePath);
    const fileSizeOnDisk = fileExists ? fs.statSync(filePath).size : 0;
    const activeDownload = activeUploadsMap.get(`video-${file.id}`);
    const isActivelyDownloading = !!activeDownload && activeDownload.stage !== 'completed' && activeDownload.stage !== 'error';

    const isCached = !isActivelyDownloading && fileExists && (
      (expectedSize > 0 && fileSizeOnDisk >= Math.floor(expectedSize * 0.95)) ||
      (expectedSize === 0 && fileSizeOnDisk > 1024)
    );

    if (isCached) {
      db.touchFileCachedAt(file.id);
      return res.json({ cached: true, message: 'Arquivo já está salvo na pasta uploads' });
    }

    if (!file.telegramMeta?.messageId) {
      return res.status(400).json({ error: 'Arquivo não possui registro no Telegram' });
    }

    const uploadId = `video-${file.id}`;
    const existing = activeUploadsMap.get(uploadId);
    if (existing && existing.stage !== 'completed' && existing.stage !== 'error') {
      return res.json({ cached: false, isDownloading: true, message: 'Download já em andamento' });
    }

    activeUploadsMap.set(uploadId, {
      uploadId,
      fileName: file.name,
      size: expectedSize,
      transferred: 0,
      progress: 0,
      speed: 'Conectando ao Telegram...',
      stage: 'cloud',
      stageLabel: `⚡ Conectando e baixando "${file.name}" para a pasta uploads...`,
      updatedAt: Date.now()
    });

    // Start download in background
    (async () => {
      const dlStartTime = Date.now();
      try {
        await telegramService.downloadMediaByMessageId(
          file.telegramMeta!.messageId!,
          filePath,
          (pct, transferred, total) => {
            const elapsedSec = Math.max(0.2, (Date.now() - dlStartTime) / 1000);
            const currentTrans = transferred > 0 ? transferred : 0;
            const currentTotal = total > 0 ? total : expectedSize;
            const speedMBs = ((currentTrans / (1024 * 1024)) / elapsedSec).toFixed(2);
            const safePct = Math.min(100, Math.max(0, isNaN(pct) ? Math.round((currentTrans / (currentTotal || 1)) * 100) : pct));

            activeUploadsMap.set(uploadId, {
              uploadId,
              fileName: file.name,
              size: currentTotal,
              transferred: currentTrans,
              progress: safePct,
              speed: `${speedMBs} MB/s`,
              stage: safePct >= 100 ? 'completed' : 'cloud',
              stageLabel: safePct >= 100 ? 'Vídeo salvo na pasta uploads!' : `⚡ Baixando "${file.name}" (${safePct}% - ${speedMBs} MB/s)...`,
              updatedAt: Date.now()
            });
          },
          expectedSize
        );

        db.touchFileCachedAt(file.id);

        const finalSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : expectedSize;
        if (finalSize > 0 && file.size !== finalSize) {
          db.updateFile(file.id, { size: finalSize });
        }

        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: file.name,
          size: finalSize,
          transferred: finalSize,
          progress: 100,
          speed: 'Concluído',
          stage: 'completed',
          stageLabel: 'Vídeo salvo na pasta uploads com sucesso!',
          updatedAt: Date.now()
        });

        if (!file.telegramMeta!.telegramFileName || file.telegramMeta!.telegramFileName !== diskFileName) {
          file.telegramMeta!.telegramFileName = diskFileName;
          db.updateFile(file.id, { telegramMeta: file.telegramMeta });
        }
      } catch (err: any) {
        console.error(`[Video Download] Error downloading video ${file.id}:`, err);
        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: file.name,
          size: expectedSize,
          transferred: 0,
          progress: 0,
          speed: '',
          stage: 'error',
          stageLabel: err.message || 'Erro ao baixar vídeo para a pasta uploads',
          updatedAt: Date.now()
        });
      }
    })();

    res.json({ cached: false, isDownloading: true, message: 'Download iniciado' });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Erro ao iniciar download do vídeo' });
  }
});

// Helper para mapear Content-Type preciso baseado na extensão do arquivo
function getMimeType(fileName: string, fallback?: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    // Vídeo
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.ts': 'video/mp2t',
    '.3gp': 'video/3gpp',
    // Áudio
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.oga': 'audio/ogg',
    '.opus': 'audio/opus',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.weba': 'audio/webm',
    // Documentos / Livros
    '.pdf': 'application/pdf',
    '.epub': 'application/epub+zip',
    '.txt': 'text/plain; charset=utf-8',
    '.json': 'application/json',
    // Imagens
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    // Quadrinhos
    '.cbz': 'application/vnd.comicbook+zip',
    '.cbr': 'application/vnd.comicbook-rar',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed'
  };
  return mimeMap[ext] || (fallback && fallback !== 'application/octet-stream' ? fallback : (ext.endsWith('mp3') ? 'audio/mpeg' : 'video/mp4'));
}

// ---------------- STREAMING & PREVIEW (SUPPORTS CLOUD, TEMP CACHE & LOCAL CACHE) ----------------
app.get('/api/stream/:id', async (req, res) => {
  try {
    const file = db.getAllFiles().find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'Arquivo não encontrado' });

    const localFilePath = resolveExistingLocalFilePath(file);
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = localFilePath || getSafeUploadPath(diskFileName);
    const mimeType = getMimeType(file.name || `${file.id}.${file.extension}`, file.mimeType);

    // Subtitle handler
    if (file.type === 'subtitle' || file.extension === 'srt' || file.extension === 'vtt') {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (fs.existsSync(filePath)) {
        try {
          const rawText = fs.readFileSync(filePath, 'utf-8');
          return res.send(convertToWebVTT(rawText));
        } catch (e) {}
      } else if (file.telegramMeta?.messageId) {
        const buffer = await telegramService.getMediaBufferInMemory(file.telegramMeta.messageId);
        if (buffer) {
          return res.send(convertToWebVTT(buffer.toString('utf-8')));
        }
      }
    }

    // 1. PRIORIDADE MÁXIMA: Arquivo já existe no disco local (baixado ou enviado)
    // Se o arquivo existe e tem tamanho > 0, SEMPRE sirva localmente com suporte a Range (HTTP 206)
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 0) {
        db.touchFileCachedAt(file.id);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (req.method === 'HEAD') {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
          });
          return res.end();
        }

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

          if (start >= fileSize || end >= fileSize || start > end) {
            res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
            return res.end();
          }

          const chunksize = (end - start) + 1;
          const streamFile = fs.createReadStream(filePath, { start, end });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
          });
          return streamFile.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
          });
          return fs.createReadStream(filePath).pipe(res);
        }
      }
    }

    // 2. Arquivo na Nuvem Telegram (Streaming direto ou Cache temporário)
    if (file.telegramMeta?.messageId && telegramService.getAuthState().isConnected) {
      const range = req.headers.range;
      const fileSize = file.size || file.telegramMeta.fileSize || 0;
      let start = 0;
      let end = fileSize > 0 ? fileSize - 1 : 1024 * 1024;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        start = parseInt(parts[0], 10);
        if (parts[1]) {
          end = parseInt(parts[1], 10);
        } else if (fileSize > 0) {
          end = fileSize - 1;
        } else {
          end = start + (512 * 1024);
        }
      }

      const streamed = await telegramService.streamMediaDirect(
        file.telegramMeta.messageId,
        start,
        end,
        fileSize,
        mimeType,
        res
      );

      if (streamed) return;
      if (res.headersSent || res.writableEnded) {
        if (!res.writableEnded && !res.closed && !res.destroyed) {
          try { res.end(); } catch (e) {}
        }
        return;
      }
    }

    // 3. Fallback final: se não foi possível transmitir
    if (!res.headersSent) {
      res.status(404).json({ error: 'Mídia não disponível no momento. Baixe o arquivo para reprodução local.' });
    } else if (!res.writableEnded && !res.closed && !res.destroyed) {
      try { res.end(); } catch (e) {}
    }
  } catch (err) {
    console.error(`[DriveGram Stream Error]`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao processar streaming' });
    } else if (!res.writableEnded && !res.closed && !res.destroyed) {
      try { res.end(); } catch (e) {}
    }
  }
});

// ---------------- CAPAS & THUMBNAILS VIA TELEGRAM & CACHE LOCAL ----------------
app.get('/api/covers/telegram/:messageId', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    if (!messageId || isNaN(messageId)) {
      return res.status(400).json({ error: 'messageId inválido' });
    }

    const coversDir = path.join(UPLOADS_DIR, 'covers');
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
    }

    // 1. Check if cached on local disk
    const cachedFiles = fs.readdirSync(coversDir).filter(f => f.startsWith(`cover_tg_${messageId}_`));
    if (cachedFiles.length > 0) {
      const filePath = path.join(coversDir, cachedFiles[0]);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return fs.createReadStream(filePath).pipe(res);
    }

    // 2. Download directly from Telegram Saved Messages
    const buffer = await telegramService.getMediaBufferInMemory(messageId);
    if (buffer && buffer.length > 0) {
      const cachedPath = path.join(coversDir, `cover_tg_${messageId}_${Date.now()}.jpg`);
      try {
        fs.writeFileSync(cachedPath, buffer);
      } catch (e) {}
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    }

    // 3. Fallback URL redirect if available
    const fallback = req.query.fallback as string;
    if (fallback && (fallback.startsWith('http://') || fallback.startsWith('https://'))) {
      return res.redirect(fallback);
    }

    res.status(404).json({ error: 'Capa não encontrada no Telegram' });
  } catch (e: any) {
    console.error('Error serving Telegram cover:', e);
    const fallback = req.query.fallback as string;
    if (fallback && (fallback.startsWith('http://') || fallback.startsWith('https://'))) {
      return res.redirect(fallback);
    }
    res.status(500).json({ error: 'Erro ao carregar capa do Telegram' });
  }
});

app.get('/api/covers/local/:fileName', (req, res) => {
  try {
    const fileName = path.basename(req.params.fileName);
    const coversDir = path.join(UPLOADS_DIR, 'covers');
    const filePath = path.join(coversDir, fileName);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return fs.createReadStream(filePath).pipe(res);
    }

    const fallback = req.query.fallback as string;
    if (fallback && (fallback.startsWith('http://') || fallback.startsWith('https://'))) {
      return res.redirect(fallback);
    }

    res.status(404).json({ error: 'Capa local não encontrada' });
  } catch (e: any) {
    const fallback = req.query.fallback as string;
    if (fallback && (fallback.startsWith('http://') || fallback.startsWith('https://'))) {
      return res.redirect(fallback);
    }
    res.status(500).json({ error: 'Erro ao carregar capa local' });
  }
});

// ---------------- STREAMING MODE & CACHE DURATION SETTINGS ----------------
app.get('/api/settings/streaming-mode', (_req, res) => {
  res.json({ 
    mode: db.getStreamingMode(),
    cacheDuration: db.getCacheDuration()
  });
});

app.post('/api/settings/streaming-mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'cloud_direct' || mode === 'temp_cache' || mode === 'local_cache') {
    db.setStreamingMode(mode);
    return res.json({ success: true, mode });
  }
  res.status(400).json({ error: 'Modo inválido. Escolha cloud_direct, temp_cache ou local_cache' });
});

app.get('/api/settings/cache-duration', (_req, res) => {
  res.json(db.getCacheDuration());
});

app.post('/api/settings/cache-duration', (req, res) => {
  const { value, unit } = req.body;
  const numValue = Math.max(1, parseInt(value, 10) || 1);
  const validUnit = (unit === 'minutes' || unit === 'hours' || unit === 'days') ? unit : 'hours';
  
  let totalMinutes = numValue;
  if (validUnit === 'hours') totalMinutes = numValue * 60;
  if (validUnit === 'days') totalMinutes = numValue * 1440;

  const config = {
    value: numValue,
    unit: validUnit,
    totalMinutes
  };

  db.setCacheDuration(config);
  res.json({ success: true, config });
});

app.post('/api/cache/clear', (_req, res) => {
  const result = db.clearAllCache(UPLOADS_DIR);
  res.json({
    success: true,
    clearedFiles: result.clearedFiles,
    freedBytes: result.freedBytes,
    freedBytesFormatted: (result.freedBytes / (1024 * 1024)).toFixed(2) + ' MB',
    message: `Cache limpo com sucesso! ${result.clearedFiles} arquivo(s) removidos (${(result.freedBytes / (1024 * 1024)).toFixed(2)} MB liberados).`
  });
});

// ---------------- FILE DOWNLOAD ON DEMAND ----------------
app.get('/api/files/download/:id', async (req, res) => {
  const file = db.getAllFiles().find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'Arquivo não encontrado' });

  const existingLocalPath = resolveExistingLocalFilePath(file);
  const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
  const filePath = existingLocalPath || getSafeUploadPath(diskFileName);

  if (!fs.existsSync(filePath) && file.telegramMeta?.messageId) {
    const uploadId = `download-${file.id}`;
    const expectedSize = file.size || file.telegramMeta?.fileSize || 0;
    const dlStart = Date.now();
    activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: expectedSize, transferred: 0, progress: 0, speed: 'Conectando...', stage: 'cloud', stageLabel: `⚡ Baixando "${file.name}"...`, updatedAt: Date.now() });
    try {
      await telegramService.downloadMediaByMessageId(file.telegramMeta.messageId, filePath, (pct, transferred, total) => {
        const speed = ((transferred / (1024 * 1024)) / Math.max(0.2, (Date.now() - dlStart) / 1000)).toFixed(2);
        activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: total, transferred, progress: pct, speed: `${speed} MB/s`, stage: pct >= 100 ? 'completed' : 'cloud', stageLabel: pct >= 100 ? 'Download concluído!' : `⚡ Baixando "${file.name}" (${pct}%)...`, updatedAt: Date.now() });
      }, expectedSize);
      db.touchFileCachedAt(file.id);
      const finalSz = fs.existsSync(filePath) ? fs.statSync(filePath).size : expectedSize;
      activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: finalSz, transferred: finalSz, progress: 100, speed: 'Concluído', stage: 'completed', stageLabel: 'Arquivo salvo!', updatedAt: Date.now() });
      setTimeout(() => activeUploadsMap.delete(uploadId), 15000);
    } catch (dlErr: any) {
      activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: expectedSize, transferred: 0, progress: 0, speed: '', stage: 'error', stageLabel: dlErr.message || 'Falha no download', updatedAt: Date.now() });
    }
  }

  if (fs.existsSync(filePath)) {
    return res.download(filePath, file.name);
  } else {
    res.status(404).json({ error: 'Arquivo indisponível no momento' });
  }
});

// ---------------- BOOK CATEGORIES ROUTES ----------------
app.get('/api/book-categories', (_req, res) => {
  res.json(db.getBookCategories());
});

app.post('/api/book-categories', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
  const updated = db.addBookCategory(category);
  res.status(201).json(updated);
});

app.put('/api/book-categories', (req, res) => {
  const { oldCategory, newCategory } = req.body;
  if (!oldCategory || !newCategory) return res.status(400).json({ error: 'oldCategory e newCategory são obrigatórios' });
  const updated = db.updateBookCategory(oldCategory, newCategory);
  res.json(updated);
});

app.delete('/api/book-categories/:name', (req, res) => {
  const updated = db.deleteBookCategory(decodeURIComponent(req.params.name));
  res.json(updated);
});

// ---------------- BOOKS & AUDIOBOOKS ROUTES ----------------
app.get('/api/books', (req, res) => {
  res.json(db.getBooks());
});

app.get('/api/books/:id', (req, res) => {
  const book = db.getBookById(req.params.id);
  if (!book) return res.status(404).json({ error: 'Livro não encontrado' });
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const book = db.saveBook(req.body);
  res.status(201).json(book);
});

app.post('/api/books/from-folder', (req, res) => {
  try {
    const { 
      folderId, 
      title, 
      author, 
      narrationType, 
      narrator, 
      version, 
      totalDuration, 
      saga, 
      fileSizeFormatted, 
      category, 
      genre, 
      language, 
      description,
      coverImage 
    } = req.body;
    
    if (!folderId) return res.status(400).json({ error: 'folderId é obrigatório' });

    const folders = db.getAllFolders();
    const rootFolder = folders.find(f => f.id === folderId);
    if (!rootFolder) return res.status(404).json({ error: 'Pasta não encontrada' });

    const allFiles = db.getAllFiles().filter(f => !f.isTrash);
    const audioFiles = allFiles.filter(f => f.parentId === folderId && f.type === 'audio');
    const pdfFiles = allFiles.filter(f => f.parentId === folderId && (f.type === 'pdf' || f.extension === 'epub'));

    const totalBytes = audioFiles.reduce((acc, f) => acc + f.size, 0) + pdfFiles.reduce((acc, f) => acc + f.size, 0);
    const autoSizeFormatted = totalBytes > 0 
      ? (totalBytes / (1024 * 1024)).toFixed(1) + ' MB' 
      : '120 MB';

    const chapters = audioFiles.map((audio, idx) => ({
      id: 'chap-' + Date.now() + '-' + idx,
      title: audio.name.replace(/\.[^/.]+$/, ""),
      duration: '25:00',
      fileId: audio.id,
      order: idx + 1,
      isCompleted: false,
      lastPositionSeconds: 0,
      timestamps: audio.timestamps || [],
      notes: ''
    }));

    const newBook = db.saveBook({
      id: 'book-' + Date.now(),
      title: title || rootFolder.name,
      author: author || 'Autor Desconhecido',
      narrationType: narrationType || 'Humana',
      narrator: narrator || undefined,
      version: version || 'Estúdio de áudio',
      totalDuration: totalDuration || (chapters.length > 0 ? `${chapters.length * 25} min` : undefined),
      saga: saga || 'N/A',
      fileSizeFormatted: fileSizeFormatted || autoSizeFormatted,
      category: category || 'Desenvolvimento Pessoal',
      genre: genre || 'Geral',
      language: language || 'Português',
      description: description || rootFolder.description || '',
      folderId,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      format: chapters.length > 0 && pdfFiles.length > 0 ? 'bundle' : chapters.length > 0 ? 'audiobook' : 'ebook',
      ebookFileId: pdfFiles[0]?.id || undefined,
      chapters
    });

    res.status(201).json(newBook);
  } catch (e: any) {
    console.error('Error creating book from folder:', e);
    res.status(500).json({ error: e.message || 'Erro ao criar livro da pasta' });
  }
});

app.put('/api/books/:id', (req, res) => {
  const updated = db.saveBook({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/books/:id', (req, res) => {
  db.deleteBook(req.params.id);
  res.status(204).end();
});

// ---------------- GOOGLE BOOKS API INTEGRATION ----------------
app.get('/api/google-books/search', async (req, res) => {
  try {
    const query = req.query.query as string;
    const apiKey = (req.query.apiKey as string) || process.env.GOOGLE_BOOKS_API_KEY || '';
    const lang = (req.query.lang as string) || '';

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query de busca é obrigatória' });
    }

    let results: any[] = [];
    let isGoogleSuccess = false;

    // Strategy 1: Google Books API
    try {
      const gBooksUrl = new URL('https://www.googleapis.com/books/v1/volumes');
      gBooksUrl.searchParams.set('q', query.trim());
      gBooksUrl.searchParams.set('maxResults', '15');
      if (lang && lang.trim()) {
        gBooksUrl.searchParams.set('langRestrict', lang.trim());
      }
      if (apiKey && apiKey.trim()) {
        gBooksUrl.searchParams.set('key', apiKey.trim());
      }

      const response = await fetch(gBooksUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DriveGram/1.0'
        }
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          isGoogleSuccess = true;
          results = data.items.map((item: any) => {
            const info = item.volumeInfo || {};
            const isbns = info.industryIdentifiers || [];
            const isbnObj = isbns.find((x: any) => x.type === 'ISBN_13') || isbns.find((x: any) => x.type === 'ISBN_10') || isbns[0];
            
            let coverImage = '';
            if (info.imageLinks) {
              const rawImg = info.imageLinks.extraLarge || info.imageLinks.large || info.imageLinks.medium || info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
              if (rawImg) {
                coverImage = rawImg.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
              }
            }

            // Fallback cover via OpenLibrary if ISBN is present and Google has no cover
            if (!coverImage && isbnObj?.identifier) {
              coverImage = `https://covers.openlibrary.org/b/isbn/${isbnObj.identifier}-L.jpg?default=false`;
            }

            return {
              id: item.id,
              title: fixUtf8Encoding(info.title || ''),
              subtitle: fixUtf8Encoding(info.subtitle || ''),
              authors: Array.isArray(info.authors) ? info.authors.map(fixUtf8Encoding) : [],
              publisher: fixUtf8Encoding(info.publisher || ''),
              publishedDate: info.publishedDate || '',
              year: info.publishedDate ? info.publishedDate.split('-')[0] : '',
              description: fixUtf8Encoding(info.description || ''),
              pageCount: info.pageCount || undefined,
              categories: Array.isArray(info.categories) ? info.categories.map(fixUtf8Encoding) : [],
              language: info.language || 'pt',
              coverImage: coverImage || undefined,
              isbn: isbnObj?.identifier || undefined,
              previewLink: info.previewLink,
              infoLink: info.infoLink,
              source: 'google_books'
            };
          });
        }
      }
    } catch (gErr: any) {
      console.warn('[Google Books API] Request failed, trying OpenLibrary fallback:', gErr.message);
    }

    // Strategy 2: Open Library API (Seamless Fallback if Google is rate limited)
    if (!isGoogleSuccess || results.length === 0) {
      try {
        const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query.trim())}&limit=15`;
        const olRes = await fetch(olUrl, {
          headers: {
            'User-Agent': 'DriveGram/1.0 (https://github.com/LuisClaudioBoaventura/DriveGram)'
          }
        });

        if (olRes.ok) {
          const olData: any = await olRes.json();
          if (olData.docs && Array.isArray(olData.docs) && olData.docs.length > 0) {
            results = olData.docs.map((doc: any) => {
              const coverId = doc.cover_i;
              const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : undefined;
              let coverImage = '';
              if (coverId) {
                coverImage = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
              } else if (isbn) {
                coverImage = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
              }

              return {
                id: doc.key ? doc.key.replace('/works/', '') : `ol-${Date.now()}-${Math.random()}`,
                title: fixUtf8Encoding(doc.title || ''),
                subtitle: fixUtf8Encoding(doc.subtitle || ''),
                authors: Array.isArray(doc.author_name) ? doc.author_name.map(fixUtf8Encoding) : [],
                publisher: Array.isArray(doc.publisher) ? fixUtf8Encoding(doc.publisher[0]) : undefined,
                publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : '',
                year: doc.first_publish_year ? String(doc.first_publish_year) : '',
                description: fixUtf8Encoding(doc.first_sentence?.[0] || ''),
                pageCount: doc.number_of_pages_median || undefined,
                categories: Array.isArray(doc.subject) ? doc.subject.slice(0, 3).map(fixUtf8Encoding) : [],
                language: Array.isArray(doc.language) ? doc.language[0] : 'por',
                coverImage: coverImage || undefined,
                isbn,
                source: 'open_library'
              };
            });
          }
        }
      } catch (olErr: any) {
        console.warn('[OpenLibrary API] Request failed:', olErr.message);
      }
    }

    res.json({ results });
  } catch (error: any) {
    console.error('Error in Google Books search route:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar livros' });
  }
});

app.get('/api/google-books/volume', async (req, res) => {
  try {
    const id = req.query.id as string;
    const apiKey = (req.query.apiKey as string) || process.env.GOOGLE_BOOKS_API_KEY || '';

    if (!id || !id.trim()) {
      return res.status(400).json({ error: 'ID do livro é obrigatório' });
    }

    const gBooksUrl = new URL(`https://www.googleapis.com/books/v1/volumes/${id.trim()}`);
    if (apiKey && apiKey.trim()) {
      gBooksUrl.searchParams.set('key', apiKey.trim());
    }

    const response = await fetch(gBooksUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DriveGram/1.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Livro não encontrado' });
    }

    const item: any = await response.json();
    const info = item.volumeInfo || {};
    const isbns = info.industryIdentifiers || [];
    const isbnObj = isbns.find((x: any) => x.type === 'ISBN_13') || isbns.find((x: any) => x.type === 'ISBN_10') || isbns[0];
    
    let coverImage = '';
    if (info.imageLinks) {
      const rawImg = info.imageLinks.extraLarge || info.imageLinks.large || info.imageLinks.medium || info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
      if (rawImg) {
        coverImage = rawImg.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
      }
    }

    res.json({
      id: item.id,
      title: fixUtf8Encoding(info.title || ''),
      subtitle: fixUtf8Encoding(info.subtitle || ''),
      authors: Array.isArray(info.authors) ? info.authors.map(fixUtf8Encoding) : [],
      publisher: fixUtf8Encoding(info.publisher || ''),
      publishedDate: info.publishedDate || '',
      year: info.publishedDate ? info.publishedDate.split('-')[0] : '',
      description: fixUtf8Encoding(info.description || ''),
      pageCount: info.pageCount || undefined,
      categories: Array.isArray(info.categories) ? info.categories.map(fixUtf8Encoding) : [],
      language: info.language || 'pt',
      coverImage: coverImage || undefined,
      isbn: isbnObj?.identifier || undefined,
      previewLink: info.previewLink,
      infoLink: info.infoLink,
      source: 'google_books'
    });
  } catch (error: any) {
    console.error('Error fetching Google Books volume details:', error);
    res.status(500).json({ error: error.message || 'Erro ao carregar detalhes do livro' });
  }
});

// ---------------- COMICS & MANGAS ----------------
app.get('/api/comics', (_req, res) => {
  res.json(db.getComics());
});

app.get('/api/comics/:id', (req, res) => {
  const comic = db.getComicById(req.params.id);
  if (!comic) return res.status(404).json({ error: 'HQ/Mangá não encontrado' });
  res.json(comic);
});

app.post('/api/comics', (req, res) => {
  const comic = db.saveComic(req.body);
  res.status(201).json(comic);
});

app.post('/api/comics/from-folder', (req, res) => {
  try {
    const { folderId, title, description, category, publisher, author, artist, coverImage } = req.body;
    if (!folderId) return res.status(400).json({ error: 'ID da pasta é obrigatório' });

    const rootFolder = db.getAllFolders().find(f => f.id === folderId);
    const allFiles = db.getAllFiles().filter(f => !f.isTrash);
    const allFolders = db.getAllFolders().filter(f => !f.isTrash);

    const subFolders = allFolders.filter(f => f.parentId === folderId);
    const subFolderIds = new Set(subFolders.map(sf => sf.id));

    const comicFiles = allFiles.filter(f => 
      (f.parentId === folderId || subFolderIds.has(f.parentId || '')) &&
      (f.type === 'comic' || f.type === 'ebook' || ['cbr', 'cbz', 'pdf', 'zip', 'epub'].includes(f.extension.toLowerCase()) || /\.(cbr|cbz|pdf|epub)$/i.test(f.name))
    );

    // Natural sort for files
    comicFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const issues = comicFiles.map((file, idx) => ({
      id: 'issue-' + Date.now() + '-' + idx,
      title: file.name.replace(/\.[^/.]+$/, ""),
      issueNumber: idx + 1,
      fileId: file.id,
      order: idx + 1,
      isCompleted: false,
      currentPage: 0
    }));

    const newComic = db.saveComic({
      id: 'comic-' + Date.now(),
      title: title || (rootFolder ? rootFolder.name : 'Nova Coleção de Quadrinhos'),
      description: description || rootFolder?.description || '',
      category: category || 'Super-Heróis',
      publisher: publisher || 'Indie / Autoral',
      author: author || '',
      artist: artist || '',
      folderId,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60',
      status: 'reading',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issues
    });

    res.status(201).json(newComic);
  } catch (e: any) {
    console.error('Error creating comic from folder:', e);
    res.status(500).json({ error: e.message || 'Erro ao criar quadrinho da pasta' });
  }
});

app.put('/api/comics/:id', (req, res) => {
  const updated = db.saveComic({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/comics/:id', (req, res) => {
  db.deleteComic(req.params.id);
  res.status(204).end();
});

app.get('/api/comic-categories', (_req, res) => {
  res.json(db.getComicCategories());
});

app.post('/api/comic-categories', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Categoria é obrigatória' });
  const updated = db.addComicCategory(category);
  res.json(updated);
});

app.put('/api/comic-categories', (req, res) => {
  const { oldCategory, newCategory } = req.body;
  if (!oldCategory || !newCategory) return res.status(400).json({ error: 'Categorias são obrigatórias' });
  const updated = db.updateComicCategory(oldCategory, newCategory);
  res.json(updated);
});

app.delete('/api/comic-categories/:category', (req, res) => {
  const updated = db.deleteComicCategory(decodeURIComponent(req.params.category));
  res.json(updated);
});

// ---------------- FILMES & VÍDEOS ----------------
app.get('/api/videos', (_req, res) => {
  res.json(db.getVideos());
});

app.get('/api/videos/:id', (req, res) => {
  const video = db.getVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Vídeo/Filme não encontrado' });
  res.json(video);
});

app.post('/api/videos', (req, res) => {
  const video = db.saveVideo(req.body);
  res.status(201).json(video);
});

app.post('/api/videos/from-folder', (req, res) => {
  try {
    const { 
      folderId, title, titlePt, category, genre, year, director, description, coverImage,
      imdbId, imdbRating, actors, rated, runtime, awards, writer, metascore, country
    } = req.body;
    if (!folderId) return res.status(400).json({ error: 'folderId é obrigatório' });

    const folder = db.getFolderById(folderId);
    if (!folder) return res.status(404).json({ error: 'Pasta não encontrada' });

    const files = db.getFiles(folderId);
    const videoFile = files.find(f => f.type === 'video');

    const newVideo = db.saveVideo({
      title: title || folder.name.replace(/^[🎬🎥🎞️📽️\s]+/, '').trim(),
      titlePt,
      category: category || 'Filmes',
      genre,
      year,
      director,
      description: description || folder.description || '',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60',
      folderId,
      fileId: videoFile?.id,
      timestamps: videoFile?.timestamps || [],
      subtitles: videoFile?.subtitles || [],
      imdbId,
      imdbRating,
      actors,
      rated,
      runtime,
      awards,
      writer,
      metascore,
      country
    });

    res.status(201).json(newVideo);
  } catch (e: any) {
    console.error('Error creating video from folder:', e);
    res.status(500).json({ error: e.message || 'Erro ao criar vídeo da pasta' });
  }
});

app.put('/api/videos/:id', (req, res) => {
  const updated = db.saveVideo({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/videos/:id', (req, res) => {
  db.deleteVideo(req.params.id);
  res.status(204).end();
});

// ---------------- OMDB API INTEGRATION ----------------
app.get('/api/omdb/search', async (req, res) => {
  try {
    const query = req.query.query as string;
    const year = req.query.year as string;
    const apiKey = (req.query.apiKey as string) || process.env.OMDB_API_KEY || 'trilogy';

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query de busca é obrigatória' });
    }

    const omdbUrl = new URL('https://www.omdbapi.com/');
    omdbUrl.searchParams.set('s', query.trim());
    if (year && year.trim()) omdbUrl.searchParams.set('y', year.trim());
    omdbUrl.searchParams.set('type', 'movie');
    omdbUrl.searchParams.set('apikey', apiKey);

    const response = await fetch(omdbUrl.toString());
    const data: any = await response.json();

    if (data.Response === 'False') {
      return res.json({ results: [], totalResults: 0, error: data.Error || 'Nenhum filme encontrado' });
    }

    res.json({
      results: data.Search || [],
      totalResults: parseInt(data.totalResults || '0', 10)
    });
  } catch (error: any) {
    console.error('Error fetching from OMDb search:', error);
    res.status(500).json({ error: error.message || 'Erro ao consultar API OMDb' });
  }
});

app.get('/api/omdb/movie', async (req, res) => {
  try {
    const title = req.query.title as string;
    const year = req.query.year as string;
    const imdbId = req.query.imdbId as string;
    const apiKey = (req.query.apiKey as string) || process.env.OMDB_API_KEY || 'trilogy';

    if ((!title || !title.trim()) && (!imdbId || !imdbId.trim())) {
      return res.status(400).json({ error: 'Título ou ID IMDb é obrigatório' });
    }

    const omdbUrl = new URL('https://www.omdbapi.com/');
    if (imdbId && imdbId.trim()) {
      omdbUrl.searchParams.set('i', imdbId.trim());
    } else if (title && title.trim()) {
      omdbUrl.searchParams.set('t', title.trim());
      if (year && year.trim()) omdbUrl.searchParams.set('y', year.trim());
    }
    omdbUrl.searchParams.set('plot', 'full');
    omdbUrl.searchParams.set('apikey', apiKey);

    const response = await fetch(omdbUrl.toString());
    const data: any = await response.json();

    if (data.Response === 'False') {
      return res.status(404).json({ error: data.Error || 'Filme não encontrado no OMDb' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching movie from OMDb:', error);
    res.status(500).json({ error: error.message || 'Erro ao obter dados do filme no OMDb' });
  }
});

app.get('/api/video-categories', (_req, res) => {
  res.json(db.getVideoCategories());
});

app.post('/api/video-categories', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Categoria é obrigatória' });
  const updated = db.addVideoCategory(category);
  res.json(updated);
});

app.put('/api/video-categories', (req, res) => {
  const { oldCategory, newCategory } = req.body;
  if (!oldCategory || !newCategory) return res.status(400).json({ error: 'Categorias são obrigatórias' });
  const updated = db.updateVideoCategory(oldCategory, newCategory);
  res.json(updated);
});

app.delete('/api/video-categories/:category', (req, res) => {
  const updated = db.deleteVideoCategory(decodeURIComponent(req.params.category));
  res.json(updated);
});

// ---------------- VÍDEOS & MÍDIAS PESSOAIS ----------------
app.get('/api/personal-videos', (_req, res) => {
  res.json(db.getPersonalVideos());
});

app.get('/api/personal-videos/:id', (req, res) => {
  const video = db.getPersonalVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Vídeo pessoal não encontrado' });
  res.json(video);
});

app.post('/api/personal-videos', (req, res) => {
  const video = db.savePersonalVideo(req.body);
  res.status(201).json(video);
});

app.post('/api/personal-videos/from-folder', (req, res) => {
  try {
    const { folderId, title, category, date, location, people, description, coverImage, tags } = req.body;
    if (!folderId) return res.status(400).json({ error: 'folderId é obrigatório' });

    const folder = db.getFolderById(folderId);
    if (!folder) return res.status(404).json({ error: 'Pasta não encontrada' });

    const files = db.getFiles(folderId);
    const videoFile = files.find(f => f.type === 'video');

    const newVideo = db.savePersonalVideo({
      title: title || folder.name.replace(/^[🎬🎥🎞️📽️📹📼\s]+/, '').trim(),
      category: category || 'Memórias & Momentos',
      date,
      location,
      people,
      tags: tags || [],
      description: description || folder.description || '',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
      folderId,
      fileId: videoFile?.id,
      timestamps: videoFile?.timestamps || [],
      subtitles: videoFile?.subtitles || []
    });

    res.status(201).json(newVideo);
  } catch (e: any) {
    console.error('Error creating personal video from folder:', e);
    res.status(500).json({ error: e.message || 'Erro ao criar vídeo pessoal da pasta' });
  }
});

app.put('/api/personal-videos/:id', (req, res) => {
  const updated = db.savePersonalVideo({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/personal-videos/:id', (req, res) => {
  db.deletePersonalVideo(req.params.id);
  res.status(204).end();
});

app.get('/api/personal-video-categories', (_req, res) => {
  res.json(db.getPersonalVideoCategories());
});

app.post('/api/personal-video-categories', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Categoria é obrigatória' });
  const updated = db.addPersonalVideoCategory(category);
  res.json(updated);
});

app.put('/api/personal-video-categories', (req, res) => {
  const { oldCategory, newCategory } = req.body;
  if (!oldCategory || !newCategory) return res.status(400).json({ error: 'Categorias são obrigatórias' });
  const updated = db.updatePersonalVideoCategory(oldCategory, newCategory);
  res.json(updated);
});

app.delete('/api/personal-video-categories/:category', (req, res) => {
  const updated = db.deletePersonalVideoCategory(decodeURIComponent(req.params.category));
  res.json(updated);
});

// ---------------- SÉRIES & TV SHOWS ----------------
app.get('/api/series', (_req, res) => {
  res.json(db.getSeries());
});

app.get('/api/series/:id', (req, res) => {
  const series = db.getSeriesById(req.params.id);
  if (!series) return res.status(404).json({ error: 'Série não encontrada' });
  res.json(series);
});

app.post('/api/series', (req, res) => {
  const series = db.saveSeries(req.body);
  res.status(201).json(series);
});

app.post('/api/series/from-folder', (req, res) => {
  try {
    const { folderId, title, category, genre, network, year, description, coverImage, bannerImage } = req.body;
    if (!folderId) return res.status(400).json({ error: 'folderId é obrigatório' });

    const folder = db.getFolderById(folderId);
    if (!folder) return res.status(404).json({ error: 'Pasta não encontrada' });

    const newSeries = db.saveSeries({
      title: title || folder.name.replace(/^[📺🍿🎬\s]+/, '').trim(),
      category: category || 'Séries de TV',
      genre,
      network,
      year,
      description: description || folder.description || '',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60',
      bannerImage,
      folderId,
      status: 'watching',
      seasons: []
    });

    res.status(201).json(newSeries);
  } catch (e: any) {
    console.error('Error creating series from folder:', e);
    res.status(500).json({ error: e.message || 'Erro ao criar série da pasta' });
  }
});

app.put('/api/series/:id', (req, res) => {
  const updated = db.saveSeries({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/series/:id', (req, res) => {
  db.deleteSeries(req.params.id);
  res.status(204).end();
});

app.get('/api/series-categories', (_req, res) => {
  res.json(db.getSeriesCategories());
});

app.post('/api/series-categories', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Categoria é obrigatória' });
  const updated = db.addSeriesCategory(category);
  res.json(updated);
});

app.put('/api/series-categories', (req, res) => {
  const { oldCategory, newCategory } = req.body;
  if (!oldCategory || !newCategory) return res.status(400).json({ error: 'Categorias são obrigatórias' });
  const updated = db.updateSeriesCategory(oldCategory, newCategory);
  res.json(updated);
});

app.delete('/api/series-categories/:category', (req, res) => {
  const updated = db.deleteSeriesCategory(decodeURIComponent(req.params.category));
  res.json(updated);
});

// ---------------- ATUALIZAÇÃO AUTOMÁTICA & SINCRONIZAÇÃO DE SÉRIES (YOUTUBE) ----------------
export async function refreshSingleSeriesInternal(series: any): Promise<{ series: any; newEpisodesCount: number }> {
  if (!series || !series.youtubeUrl) return { series, newEpisodesCount: 0 };

  let fetchedVideos: any[] = [];
  try {
    const parsed = await parseYouTubeUrl(series.youtubeUrl);
    if (parsed && Array.isArray(parsed.videos) && parsed.videos.length > 0) {
      fetchedVideos = parsed.videos;
      if (parsed.coverImage && (!series.coverImage || series.coverImage.includes('unsplash'))) {
        series.coverImage = parsed.coverImage;
      }
      if (parsed.description && !series.description) {
        series.description = parsed.description;
      }
    }
  } catch (err) {
    console.warn(`[AutoSync] YouTube fetch failed for series "${series.title}":`, err);
  }

  if (fetchedVideos.length === 0) {
    series.lastSyncedAt = new Date().toISOString();
    return { series: db.saveSeries(series), newEpisodesCount: 0 };
  }

  const seasons = series.seasons || [];
  let season1 = seasons.find((s: any) => s.seasonNumber === 1) || seasons[0];
  if (!season1) {
    season1 = {
      id: `season-${Date.now()}-1`,
      seasonNumber: 1,
      title: 'Temporada 1',
      episodes: []
    };
    seasons.push(season1);
  }

  const allEpisodes = seasons.flatMap((s: any) => s.episodes || []);
  const existingKeys = new Set<string>();
  allEpisodes.forEach((e: any) => {
    if (e.videoId) existingKeys.add(e.videoId.toLowerCase().trim());
    if (e.videoUrl) existingKeys.add(e.videoUrl.toLowerCase().trim());
    if (e.id) existingKeys.add(e.id.toLowerCase().trim());
    if (e.title) existingKeys.add(e.title.toLowerCase().trim());
  });

  const deletedKeys = new Set<string>(
    (series.deletedEpisodeIds || []).map((id: string) => id.toLowerCase().trim())
  );

  let newEpisodesCount = 0;
  const newEpisodesToAdd: any[] = [];

  for (const v of fetchedVideos) {
    const vid = (v.videoId || extractYouTubeVideoId(v.url) || '').trim();
    const vUrl = (v.url || '').toLowerCase().trim();
    const vTitle = (v.title || '').toLowerCase().trim();
    const vId = (v.id || '').toLowerCase().trim();

    // Skip if already in existing episodes or in user-deleted episodes blacklist
    if (
      (vid && (existingKeys.has(vid.toLowerCase()) || deletedKeys.has(vid.toLowerCase()))) ||
      (vUrl && (existingKeys.has(vUrl) || deletedKeys.has(vUrl))) ||
      (vId && (existingKeys.has(vId) || deletedKeys.has(vId))) ||
      (vTitle && (existingKeys.has(vTitle) || deletedKeys.has(vTitle)))
    ) {
      continue;
    }

    const nextNumber = (season1.episodes?.length || 0) + newEpisodesToAdd.length + 1;
    newEpisodesToAdd.push({
      id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      seasonNumber: season1.seasonNumber || 1,
      episodeNumber: nextNumber,
      title: v.title,
      videoId: vid || undefined,
      duration: v.duration || '15:00',
      durationSeconds: v.durationSeconds || 900,
      videoUrl: v.url,
      embedUrl: v.embedUrl,
      description: v.description || undefined
    });

    if (vid) existingKeys.add(vid.toLowerCase());
    if (vUrl) existingKeys.add(vUrl);
    if (vTitle) existingKeys.add(vTitle);
    newEpisodesCount++;
  }

  season1.episodes = [...(season1.episodes || []), ...newEpisodesToAdd];
  series.seasons = seasons;
  series.lastSyncedAt = new Date().toISOString();

  const savedSeries = db.saveSeries(series);
  return { series: savedSeries, newEpisodesCount };
}

app.post('/api/series/refresh-all', async (_req, res) => {
  try {
    const allSeries = db.getSeries().filter((s: any) => s.youtubeUrl);
    let totalNewEpisodes = 0;
    const updatedSeriesList: any[] = [];

    for (const s of allSeries) {
      try {
        const result = await refreshSingleSeriesInternal(s);
        totalNewEpisodes += result.newEpisodesCount;
        updatedSeriesList.push(result.series);
      } catch (err) {
        console.warn(`[AutoSync] Could not refresh series "${s.title}":`, err);
        updatedSeriesList.push(s);
      }
    }

    res.json({
      success: true,
      refreshedCount: allSeries.length,
      totalNewEpisodes,
      updatedSeries: db.getSeries(),
      lastSyncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error refreshing all series:', error);
    res.status(500).json({ error: error.message || 'Erro ao sincronizar séries' });
  }
});

app.post('/api/series/:id/refresh', async (req, res) => {
  try {
    const series = db.getSeriesById(req.params.id);
    if (!series) {
      return res.status(404).json({ error: 'Série não encontrada' });
    }
    const result = await refreshSingleSeriesInternal(series);
    res.json({
      success: true,
      series: result.series,
      newEpisodesCount: result.newEpisodesCount,
      lastSyncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error refreshing single series:', error);
    res.status(500).json({ error: error.message || 'Erro ao sincronizar série' });
  }
});

app.delete('/api/series/:id/episodes/:episodeId', (req, res) => {
  try {
    const result = db.deleteEpisodeFromSeries(req.params.id, req.params.episodeId);
    if (!result) {
      return res.status(404).json({ error: 'Série ou episódio não encontrado' });
    }
    res.json({
      success: true,
      series: result.series,
      deletedEpisode: result.deletedEpisode
    });
  } catch (error: any) {
    console.error('Error deleting episode from series:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir vídeo da série' });
  }
});

// Periodic background auto-sync for YouTube series playlists (runs every 1 hour)
setInterval(async () => {
  try {
    const allSeries = db.getSeries().filter((s: any) => s.youtubeUrl && s.autoSyncDaily !== false);
    const now = Date.now();
    for (const s of allSeries) {
      const lastSync = s.lastSyncedAt ? new Date(s.lastSyncedAt).getTime() : 0;
      const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
      if (hoursSinceSync >= 24) {
        console.log(`[AutoSync] Daily update triggered for YouTube series "${s.title}"...`);
        await refreshSingleSeriesInternal(s).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('[AutoSync] Error in series daily auto-sync interval:', e);
  }
}, 60 * 60 * 1000);

// Startup auto-sync check after 6 seconds
setTimeout(async () => {
  try {
    const allSeries = db.getSeries().filter((s: any) => s.youtubeUrl && s.autoSyncDaily !== false);
    const now = Date.now();
    for (const s of allSeries) {
      const lastSync = s.lastSyncedAt ? new Date(s.lastSyncedAt).getTime() : 0;
      const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
      if (hoursSinceSync >= 24 || !s.lastSyncedAt) {
        console.log(`[AutoSync] Startup sync check for YouTube series "${s.title}"...`);
        await refreshSingleSeriesInternal(s).catch(() => {});
      }
    }
  } catch (e) {}
}, 6000);


// ---------------- MÚSICAS & PODCASTS ----------------
app.get('/api/audio-shows', (_req, res) => {
  res.json(db.getAudioShows());
});

app.get('/api/audio-shows/:id', (req, res) => {
  const show = db.getAudioShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Álbum/Podcast não encontrado' });
  res.json(show);
});

app.post('/api/audio-shows', (req, res) => {
  const show = db.saveAudioShow(req.body);
  res.status(201).json(show);
});

app.post('/api/audio-shows/from-folder', (req, res) => {
  try {
    const { folderId, title, artist, host, showType, category, genre, description, coverImage } = req.body;
    if (!folderId) return res.status(400).json({ error: 'folderId é obrigatório' });

    const folder = db.getFolderById(folderId);
    if (!folder) return res.status(404).json({ error: 'Pasta não encontrada' });

    const newShow = db.saveAudioShow({
      title: title || folder.name.replace(/^[🎧🎵🎙️📻\s]+/, '').trim(),
      artist,
      host,
      showType: showType || 'music_album',
      category: category || 'Álbuns de Música',
      genre,
      description: description || folder.description || '',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
      folderId,
      tracks: []
    });

    res.status(201).json(newShow);
  } catch (e: any) {
    console.error('Error creating audio show from folder:', e);
    res.status(500).json({ error: e.message || 'Erro ao criar álbum/podcast da pasta' });
  }
});

app.put('/api/audio-shows/:id', (req, res) => {
  const updated = db.saveAudioShow({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/audio-shows/:id', (req, res) => {
  db.deleteAudioShow(req.params.id);
  res.status(204).end();
});

// ---------------- BUSCA & IMPORTAÇÃO DE PODCASTS (ITUNES / APPLE PODCASTS) ----------------
app.get('/api/podcasts/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Termo de busca é obrigatório' });
    }

    const searchUrl = new URL('https://itunes.apple.com/search');
    searchUrl.searchParams.set('term', query.trim());
    searchUrl.searchParams.set('media', 'podcast');
    searchUrl.searchParams.set('entity', 'podcast');
    searchUrl.searchParams.set('limit', '30');

    const response = await fetch(searchUrl.toString());
    const data: any = await response.json();

    const results = (data.results || []).map((item: any) => ({
      id: String(item.collectionId || item.trackId),
      title: item.collectionName || item.trackName,
      artist: item.artistName,
      host: item.artistName,
      coverImage: item.artworkUrl600 || item.artworkUrl100 || item.artworkUrl60,
      genre: item.primaryGenreName,
      category: item.primaryGenreName || 'Podcasts',
      feedUrl: item.feedUrl,
      trackCount: item.trackCount || 0,
      releaseDate: item.releaseDate,
      country: item.country
    }));

    res.json({ results });
  } catch (error: any) {
    console.error('Error searching podcasts from iTunes:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar podcasts' });
  }
});

app.get('/api/podcasts/episodes', async (req, res) => {
  try {
    const podcastId = req.query.id as string;
    if (!podcastId) {
      return res.status(400).json({ error: 'ID do podcast é obrigatório' });
    }

    const lookupUrl = new URL('https://itunes.apple.com/lookup');
    lookupUrl.searchParams.set('id', podcastId);
    lookupUrl.searchParams.set('entity', 'podcastEpisode');
    lookupUrl.searchParams.set('limit', '50');

    const response = await fetch(lookupUrl.toString());
    const data: any = await response.json();

    if (data.results && data.results.length > 1) {
      const episodes = data.results.slice(1).map((ep: any, index: number) => {
        const durationSeconds = ep.trackTimeMillis ? Math.round(ep.trackTimeMillis / 1000) : 0;
        const mins = Math.floor(durationSeconds / 60);
        const secs = durationSeconds % 60;
        const durationStr = durationSeconds > 0 ? `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : '45:00';

        return {
          id: `ep-${ep.trackId || Date.now() + '-' + index}`,
          title: ep.trackName || `Episódio ${index + 1}`,
          duration: durationStr,
          durationSeconds,
          audioUrl: ep.episodeUrl || ep.previewUrl,
          order: index + 1,
          trackNumber: index + 1,
          releaseDate: ep.releaseDate,
          description: ep.description || ep.shortDescription || ''
        };
      });

      return res.json({ episodes });
    }

    res.json({ episodes: [] });
  } catch (error: any) {
    console.error('Error fetching podcast episodes:', error);
    res.status(500).json({ error: error.message || 'Erro ao buscar episódios do podcast' });
  }
});

function decodeXmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return !isNaN(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return !isNaN(code) ? String.fromCharCode(code) : '';
    })
    .trim();
}

function parsePodcastRssXml(xmlText: string) {
  const getTag = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!match) return '';
    return decodeXmlEntities(match[1]);
  };

  const getAttr = (xml: string, tag: string, attr: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["'][^>]*>`, 'i'));
    return match ? decodeXmlEntities(match[1]) : '';
  };

  const channelMatch = xmlText.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channelXml = channelMatch ? channelMatch[1] : xmlText;

  const title = getTag(channelXml, 'title') || 'Podcast Importado via RSS';
  const author = getTag(channelXml, 'itunes:author') || getTag(channelXml, 'author') || getTag(channelXml, 'dc:creator') || '';
  const description = getTag(channelXml, 'description') || getTag(channelXml, 'itunes:summary') || '';
  
  let coverImage = getAttr(channelXml, 'itunes:image', 'href');
  if (!coverImage) {
    const imageBlock = channelXml.match(/<image[^>]*>([\s\S]*?)<\/image>/i);
    if (imageBlock) {
      coverImage = getTag(imageBlock[1], 'url');
    }
  }
  if (!coverImage) {
    coverImage = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';
  }

  const category = getAttr(channelXml, 'itunes:category', 'text') || 'Podcasts';

  const itemMatches = [...channelXml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];
  const episodes: any[] = [];

  itemMatches.forEach((match, index) => {
    const itemXml = match[1];
    const epTitle = getTag(itemXml, 'title') || `Episódio ${index + 1}`;
    const epAudio = getAttr(itemXml, 'enclosure', 'url') || getAttr(itemXml, 'media:content', 'url');
    
    if (!epAudio) return;

    const epDurationRaw = getTag(itemXml, 'itunes:duration');
    let durationSeconds = 0;
    let durationStr = '45:00';

    if (epDurationRaw) {
      if (epDurationRaw.includes(':')) {
        const parts = epDurationRaw.split(':').map(Number);
        if (parts.length === 3) {
          durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          durationStr = `${parts[1].toString().padStart(2, '0')}:${parts[2].toString().padStart(2, '0')}`;
        } else if (parts.length === 2) {
          durationSeconds = parts[0] * 60 + parts[1];
          durationStr = `${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}`;
        }
      } else {
        const parsed = parseInt(epDurationRaw, 10);
        if (!isNaN(parsed) && parsed > 0) {
          durationSeconds = parsed;
          const mins = Math.floor(parsed / 60);
          const secs = parsed % 60;
          durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
      }
    }

    const uniqueId = `ep-${index + 1}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    episodes.push({
      id: uniqueId,
      title: epTitle,
      artist: author || undefined,
      duration: durationStr,
      durationSeconds,
      audioUrl: epAudio,
      order: index + 1,
      trackNumber: index + 1,
      releaseDate: getTag(itemXml, 'pubDate'),
      description: getTag(itemXml, 'description') || getTag(itemXml, 'itunes:summary') || ''
    });
  });

  return {
    title,
    artist: author,
    host: author,
    description,
    coverImage,
    category,
    genre: category,
    trackCount: episodes.length,
    episodes
  };
}

const handleParseRssRequest = async (url: string, res: any) => {
  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'URL do Feed RSS é obrigatória' });
  }

  const response = await fetch(url.trim(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DriveGramPodcastClient/1.0',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  });

  if (!response.ok) {
    return res.status(400).json({ error: `Erro ao baixar Feed RSS (HTTP ${response.status})` });
  }

  const xmlText = await response.text();
  const parsed = parsePodcastRssXml(xmlText);

  res.json({
    podcast: {
      id: `rss-${Date.now()}`,
      title: parsed.title,
      artist: parsed.artist,
      host: parsed.host,
      coverImage: parsed.coverImage,
      genre: parsed.genre,
      category: parsed.category,
      description: parsed.description,
      feedUrl: url.trim(),
      trackCount: parsed.trackCount
    },
    episodes: parsed.episodes
  });
};

app.get('/api/podcasts/parse-rss', async (req, res) => {
  try {
    const url = req.query.url as string;
    await handleParseRssRequest(url, res);
  } catch (error: any) {
    console.error('Error parsing podcast RSS feed (GET):', error);
    res.status(500).json({ error: error.message || 'Erro ao processar Feed RSS do podcast' });
  }
});

app.post('/api/podcasts/parse-rss', async (req, res) => {
  try {
    const url = (req.body?.url || req.query?.url) as string;
    await handleParseRssRequest(url, res);
  } catch (error: any) {
    console.error('Error parsing podcast RSS feed (POST):', error);
    res.status(500).json({ error: error.message || 'Erro ao processar Feed RSS do podcast' });
  }
});

// ==========================================
// YOUTUBE PARSER & IMPORTER ENDPOINTS
// ==========================================
app.post('/api/youtube/parse', async (req, res) => {
  try {
    const url = (req.body?.url || req.query?.url) as string;
    if (!url) {
      return res.status(400).json({ error: 'URL do YouTube é obrigatória' });
    }
    const result = await parseYouTubeUrl(url);
    res.json(result);
  } catch (error: any) {
    console.error('Error parsing YouTube URL:', error);
    res.status(500).json({ error: error.message || 'Falha ao processar link do YouTube' });
  }
});

app.post('/api/youtube/import', async (req, res) => {
  const uploadId = req.body.uploadId;
  try {
    const {
      url,
      targetType, // 'course' | 'podcast' | 'series' | 'video'
      title,
      author,
      description,
      coverImage,
      folderId,
      category,
      selectedVideos
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }
    const videos = Array.isArray(selectedVideos) && selectedVideos.length > 0 ? selectedVideos : [];
    if (videos.length === 0) {
      return res.status(400).json({ error: 'Selecione ao menos um vídeo para importar' });
    }

    if (uploadId) {
      activeUploadsMap.set(uploadId, {
        uploadId,
        fileName: `[YouTube] ${title.trim()}`,
        size: videos.length,
        transferred: 0,
        progress: 15,
        speed: 'Conectando...',
        stage: 'local',
        stageLabel: '1/3 • Obtendo metadados e miniaturas...',
        updatedAt: Date.now()
      });
    }

    // Process and upload gallery cover image to Telegram Saved Messages
    const rawCoverUrl = coverImage || videos[0]?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';
    let finalCoverUrl = rawCoverUrl;
    try {
      if (uploadId) {
        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: `[YouTube] ${title.trim()}`,
          size: videos.length,
          transferred: 1,
          progress: 45,
          speed: 'Salvando...',
          stage: 'cloud',
          stageLabel: '2/3 • Salvando capa na nuvem Telegram...',
          updatedAt: Date.now()
        });
      }
      const coverResult = await telegramService.uploadCoverToTelegram(rawCoverUrl, title.trim(), 'youtube_' + targetType);
      if (coverResult.messageId) {
        finalCoverUrl = `/api/covers/telegram/${coverResult.messageId}?fallback=${encodeURIComponent(rawCoverUrl)}`;
      } else if (coverResult.filePath) {
        finalCoverUrl = `/api/covers/local/${coverResult.filePath}?fallback=${encodeURIComponent(rawCoverUrl)}`;
      }
    } catch (covErr) {
      console.warn('Could not save YouTube cover to Telegram:', covErr);
    }

    if (uploadId) {
      activeUploadsMap.set(uploadId, {
        uploadId,
        fileName: `[YouTube] ${title.trim()}`,
        size: videos.length,
        transferred: Math.round(videos.length * 0.8),
        progress: 80,
        speed: 'Organizando...',
        stage: 'cloud',
        stageLabel: '3/3 • Criando biblioteca e itens no DriveGram...',
        updatedAt: Date.now()
      });
    }

    let responseData: any = null;

    // 1. IMPORT AS COURSE
    if (targetType === 'course') {
      const courseFolder = db.getOrCreateCourseFolder(title, folderId || undefined);
      const finalFolderId = courseFolder.id;

      const newCourse = db.saveCourse({
        title: title.trim(),
        instructor: author || 'YouTube',
        category: category || 'Tecnologia & Programação',
        description: description || '',
        coverImage: finalCoverUrl,
        folderId: finalFolderId,
        modules: [
          {
            id: `mod-${Date.now()}-1`,
            title: 'Aulas do Conteúdo',
            order: 1,
            lessons: videos.map((v: any, idx: number) => ({
              id: `les-${Date.now()}-${idx}`,
              title: v.title,
              duration: v.duration || '15:00',
              durationSeconds: v.durationSeconds || 900,
              videoUrl: v.url,
              embedUrl: v.embedUrl,
              order: idx + 1,
              isCompleted: false
            }))
          }
        ]
      });

      responseData = { success: true, targetType: 'course', item: newCourse };
    } else if (targetType === 'podcast' || targetType === 'audio') {
      // 2. IMPORT AS PODCAST / AUDIO SHOW
      const podcastFolder = db.getOrCreatePodcastFolder({ title: title.trim(), showType: 'podcast' } as any, folderId || undefined);
      const finalFolderId = podcastFolder.id;

      const newShow = db.saveAudioShow({
        title: title.trim(),
        artist: author || 'YouTube',
        host: author || 'YouTube',
        showType: 'podcast',
        category: category || 'Podcasts',
        genre: 'YouTube Podcast',
        description: description || '',
        coverImage: finalCoverUrl,
        folderId: finalFolderId,
        tracks: videos.map((v: any, idx: number) => ({
          id: `track-${Date.now()}-${idx}`,
          title: v.title,
          artist: author || 'YouTube',
          duration: v.duration || '15:00',
          durationSeconds: v.durationSeconds || 900,
          audioUrl: v.url,
          embedUrl: v.embedUrl,
          order: idx + 1,
          trackNumber: idx + 1,
          releaseDate: v.publishedAt || new Date().toISOString()
        }))
      });

      responseData = { success: true, targetType: 'podcast', item: newShow };
    } else if (targetType === 'series') {
      // 3. IMPORT AS SERIES / TV SHOW
      const seriesFolder = db.getOrCreateSeriesFolder(title, folderId || undefined);
      const finalFolderId = seriesFolder.id;

      const newSeries = db.saveSeries({
        title: title.trim(),
        network: author || 'YouTube',
        genre: 'Web Série',
        category: category || 'Séries',
        description: description || '',
        coverImage: finalCoverUrl,
        folderId: finalFolderId,
        youtubeUrl: url,
        lastSyncedAt: new Date().toISOString(),
        autoSyncDaily: true,
        deletedEpisodeIds: [],
        seasons: [
          {
            id: `season-${Date.now()}-1`,
            seasonNumber: 1,
            title: 'Temporada 1',
            episodes: videos.map((v: any, idx: number) => ({
              id: `ep-${Date.now()}-${idx}`,
              seasonNumber: 1,
              episodeNumber: idx + 1,
              title: v.title,
              videoId: v.videoId || extractYouTubeVideoId(v.url) || undefined,
              duration: v.duration || '15:00',
              durationSeconds: v.durationSeconds || 900,
              videoUrl: v.url,
              embedUrl: v.embedUrl,
              description: v.description || undefined
            }))
          }
        ]
      });

      responseData = { success: true, targetType: 'series', item: newSeries };
    } else {
      // 4. IMPORT AS MOVIE VIDEOS
      const videoFolder = db.getOrCreateVideoFolder(videos.length > 1 ? title : undefined, folderId || undefined);
      const finalFolderId = videoFolder.id;

      const savedVideos = [];
      for (const v of videos) {
        const newVid = db.saveVideo({
          title: v.title,
          director: author || 'YouTube',
          category: category || 'Vídeos',
          genre: 'YouTube',
          description: v.description || description || '',
          coverImage: finalCoverUrl,
          folderId: finalFolderId,
          videoUrl: v.url,
          embedUrl: v.embedUrl,
          duration: v.duration
        });
        savedVideos.push(newVid);
      }
      responseData = { success: true, targetType: 'video', items: savedVideos };
    }

    if (uploadId) {
      activeUploadsMap.set(uploadId, {
        uploadId,
        fileName: `[YouTube] ${title.trim()}`,
        size: videos.length,
        transferred: videos.length,
        progress: 100,
        speed: 'Concluído',
        stage: 'completed',
        stageLabel: 'Salvo com sucesso no DriveGram!',
        updatedAt: Date.now()
      });
      setTimeout(() => activeUploadsMap.delete(uploadId), 8000);
    }

    return res.json(responseData);
  } catch (error: any) {
    if (uploadId) {
      activeUploadsMap.set(uploadId, {
        uploadId,
        fileName: 'Importação YouTube',
        size: 0,
        transferred: 0,
        progress: 0,
        speed: 'Erro',
        stage: 'error',
        stageLabel: error.message || 'Falha ao importar do YouTube',
        updatedAt: Date.now()
      });
      setTimeout(() => activeUploadsMap.delete(uploadId), 8000);
    }
    console.error('Error importing YouTube content:', error);
    res.status(500).json({ error: error.message || 'Falha ao importar conteúdo do YouTube' });
  }
});

// ---------------- IMPORTAÇÃO DE PODCASTS ----------------
app.post('/api/audio-shows/import-podcast', async (req, res) => {
  try {
    const {
      podcastId,
      title,
      artist,
      host,
      category,
      genre,
      description,
      coverImage,
      feedUrl,
      folderId,
      episodes: initialEpisodes
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Título do podcast é obrigatório' });
    }

    let episodes: any[] = Array.isArray(initialEpisodes) ? initialEpisodes : [];

    // Strictly parse only from feedUrl if available
    if (episodes.length === 0 && feedUrl) {
      try {
        const feedRes = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DriveGramPodcastClient/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
          }
        });
        if (feedRes.ok) {
          const xmlText = await feedRes.text();
          const parsed = parsePodcastRssXml(xmlText);
          if (parsed.episodes && parsed.episodes.length > 0) {
            episodes = parsed.episodes;
          }
        }
      } catch (e) {
        console.warn('Could not fetch RSS feed episodes for import:', e);
      }
    }

    let finalFolderId = folderId;
    if (!finalFolderId) {
      const podcastFolder = db.getOrCreatePodcastFolder({ title: title.trim(), showType: 'podcast' } as any);
      finalFolderId = podcastFolder.id;
    }

    const newShow = db.saveAudioShow({
      title: title.trim(),
      artist: artist || host,
      host: host || artist,
      showType: 'podcast',
      category: category || 'Podcasts',
      genre: genre || 'Podcast',
      description: description || '',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
      folderId: finalFolderId,
      feedUrl: feedUrl || undefined,
      podcastId: podcastId ? String(podcastId) : undefined,
      lastSyncedAt: new Date().toISOString(),
      tracks: episodes
    });

    res.status(201).json(newShow);
  } catch (error: any) {
    console.error('Error importing podcast:', error);
    res.status(500).json({ error: error.message || 'Erro ao importar podcast' });
  }
});

// ---------------- ATUALIZAÇÃO AUTOMÁTICA DE PODCASTS (ESTRITAMENTE DENTRO DO RSS) ----------------
async function refreshSinglePodcastInternal(show: any): Promise<{ show: any; newEpisodesCount: number }> {
  if (show.showType !== 'podcast') return { show, newEpisodesCount: 0 };

  let fetchedEpisodes: any[] = [];
  const feedUrlToUse = show.feedUrl;

  // STRICT RULE: Only fetch episodes from the podcast's own RSS feedUrl
  if (feedUrlToUse) {
    try {
      const feedRes = await fetch(feedUrlToUse, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DriveGramPodcastClient/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      if (feedRes.ok) {
        const xml = await feedRes.text();
        const parsed = parsePodcastRssXml(xml);
        if (parsed.episodes && parsed.episodes.length > 0) {
          fetchedEpisodes = parsed.episodes;
          if (parsed.coverImage && (!show.coverImage || show.coverImage.includes('unsplash'))) {
            show.coverImage = parsed.coverImage;
          }
          if (parsed.description && !show.description) {
            show.description = parsed.description;
          }
        }
      }
    } catch (e) {
      console.warn(`[AutoSync] RSS fetch failed for podcast "${show.title}":`, e);
    }
  }

  if (fetchedEpisodes.length === 0) {
    show.lastSyncedAt = new Date().toISOString();
    return { show: db.saveAudioShow(show), newEpisodesCount: 0 };
  }

  // Merge new episodes with existing tracks without losing saved metadata/completion/telegram backups
  const existingTracks = show.tracks || [];
  const existingTrackKeys = new Set(
    existingTracks.map((t: any) => (t.audioUrl || t.title.toLowerCase().trim()))
  );

  let newEpisodesCount = 0;
  const newTracksToAdd: any[] = [];

  for (const ep of fetchedEpisodes) {
    const key = (ep.audioUrl || ep.title.toLowerCase().trim());
    if (!existingTrackKeys.has(key)) {
      newTracksToAdd.push({
        id: ep.id || `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: ep.title,
        artist: ep.artist || show.artist || show.host,
        duration: ep.duration,
        durationSeconds: ep.durationSeconds,
        audioUrl: ep.audioUrl,
        order: 0,
        trackNumber: 0,
        releaseDate: ep.releaseDate,
        description: ep.description
      });
      existingTrackKeys.add(key);
      newEpisodesCount++;
    } else {
      // Update releaseDate or duration if it was missing in existing track
      const existing = existingTracks.find((t: any) => (t.audioUrl && t.audioUrl === ep.audioUrl) || t.title.toLowerCase().trim() === ep.title.toLowerCase().trim());
      if (existing) {
        if (!existing.releaseDate && ep.releaseDate) existing.releaseDate = ep.releaseDate;
        if (!existing.duration && ep.duration) existing.duration = ep.duration;
        if (!existing.durationSeconds && ep.durationSeconds) existing.durationSeconds = ep.durationSeconds;
      }
    }
  }

  // Combine and strictly deduplicate tracks
  const finalTracks: any[] = [];
  const finalSeenKeys = new Set<string>();

  for (const t of [...newTracksToAdd, ...existingTracks]) {
    if (!t || !t.title) continue;
    const cleanTitle = t.title.toLowerCase().replace(/[/\\?%*:|"<>_.\-\s]/g, '').trim();
    const key = t.audioUrl ? t.audioUrl.trim().toLowerCase() : cleanTitle;
    if (!finalSeenKeys.has(key) && (!cleanTitle || !finalSeenKeys.has(cleanTitle))) {
      finalSeenKeys.add(key);
      if (cleanTitle) finalSeenKeys.add(cleanTitle);
      finalTracks.push(t);
    }
  }

  show.tracks = finalTracks.map((t: any, idx: number) => ({
    ...t,
    order: idx + 1,
    trackNumber: idx + 1
  }));

  show.lastSyncedAt = new Date().toISOString();
  const savedShow = db.saveAudioShow(show);

  return { show: savedShow, newEpisodesCount };
}

app.post(['/api/podcasts/refresh-all', '/api/audio-shows/refresh-all'], async (_req, res) => {
  try {
    const shows = db.getAudioShows().filter((s: any) => s.showType === 'podcast');
    let totalNewEpisodes = 0;
    const updatedShows: any[] = [];

    for (const show of shows) {
      try {
        const result = await refreshSinglePodcastInternal(show);
        totalNewEpisodes += result.newEpisodesCount;
        updatedShows.push(result.show);
      } catch (err) {
        console.warn(`[AutoSync] Could not refresh podcast "${show.title}":`, err);
        updatedShows.push(show);
      }
    }

    res.json({
      success: true,
      refreshedCount: shows.length,
      totalNewEpisodes,
      updatedShows: db.getAudioShows(),
      lastSyncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error refreshing podcasts:', error);
    res.status(500).json({ error: error.message || 'Erro ao sincronizar podcasts' });
  }
});

app.post(['/api/podcasts/:id/refresh', '/api/audio-shows/:id/refresh'], async (req, res) => {
  try {
    let show = db.getAudioShowById(req.params.id);
    if (!show) {
      const allShows = db.getAudioShows();
      show = allShows.find((s: any) => s.id === req.params.id || s.title?.toLowerCase().trim() === req.params.id.toLowerCase().trim() || s.podcastId === req.params.id);
    }
    if (!show) {
      return res.status(404).json({ error: 'Podcast não encontrado' });
    }
    const result = await refreshSinglePodcastInternal(show);
    res.json({
      success: true,
      show: result.show,
      newEpisodesCount: result.newEpisodesCount,
      lastSyncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error refreshing single podcast:', error);
    res.status(500).json({ error: error.message || 'Erro ao sincronizar podcast' });
  }
});

// Run auto-repair on startup after 2 seconds to restore any missing podcast episodes
setTimeout(async () => {
  try {
    const shows = db.getAudioShows().filter((s: any) => s.showType === 'podcast');
    for (const show of shows) {
      if (!show.tracks || show.tracks.length <= 1 || !show.tracks.some((t: any) => t.audioUrl)) {
        console.log(`[AutoRepair] Restoring full episode list for podcast "${show.title}"...`);
        await refreshSinglePodcastInternal(show).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[AutoRepair] Error restoring podcast episodes:', err);
  }
}, 2000);

// Periodic Automatic Background Refresh (Runs every 2 hours)
setInterval(async () => {
  try {
    const shows = db.getAudioShows().filter((s: any) => s.showType === 'podcast');
    if (shows.length > 0) {
      console.log(`[AutoSync] Background checking ${shows.length} podcasts for new episodes...`);
      for (const show of shows) {
        await refreshSinglePodcastInternal(show).catch(() => {});
      }
    }
  } catch (bgErr) {
    console.warn('[AutoSync] Background update error:', bgErr);
  }
}, 1000 * 60 * 60 * 2);

// Helper to download remote audio streams with live chunk progress
async function downloadStreamWithProgress(
  url: string,
  destPath: string,
  uploadId: string,
  fileName: string,
  stagePrefix: string = '1/2'
): Promise<number> {
  const startTime = Date.now();
  activeUploadsMap.set(uploadId, {
    uploadId,
    fileName,
    size: 0,
    transferred: 0,
    progress: 0,
    speed: 'Conectando ao servidor...',
    stage: 'local',
    stageLabel: `${stagePrefix} • Conectando ao servidor do podcast...`,
    updatedAt: Date.now()
  });

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DriveGramPodcastClient/1.0',
      'Accept': '*/*'
    }
  });

  if (!res.ok || !res.body) {
    throw new Error(`Erro ao baixar áudio (HTTP ${res.status})`);
  }

  const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
  const totalDownloadSize = contentLength > 0 ? contentLength : 0;

  const fileStream = fs.createWriteStream(destPath);
  let downloadedBytes = 0;
  let lastProgressUpdate = Date.now();

  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      fileStream.write(Buffer.from(value));
      downloadedBytes += value.length;

      const now = Date.now();
      if (now - lastProgressUpdate > 100 || (totalDownloadSize > 0 && downloadedBytes === totalDownloadSize)) {
        lastProgressUpdate = now;
        const elapsedSec = (now - startTime) / 1000;
        const speedMBs = elapsedSec > 0 ? ((downloadedBytes / (1024 * 1024)) / elapsedSec).toFixed(1) : '1.0';
        const pct = totalDownloadSize > 0 
          ? Math.min(Math.round((downloadedBytes / totalDownloadSize) * 100), 99) 
          : Math.min(Math.round((downloadedBytes / (20 * 1024 * 1024)) * 100), 90);

        const currentMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
        const totalMB = totalDownloadSize > 0 ? ` de ${(totalDownloadSize / (1024 * 1024)).toFixed(1)} MB` : '';

        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName,
          size: totalDownloadSize || downloadedBytes,
          transferred: downloadedBytes,
          progress: pct,
          speed: `${speedMBs} MB/s`,
          stage: 'local',
          stageLabel: `${stagePrefix} • Baixando áudio (${currentMB} MB${totalMB})...`,
          updatedAt: Date.now()
        });
      }
    }
  }

  await new Promise<void>((resolve, reject) => {
    fileStream.end((err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  return fs.statSync(destPath).size;
}

// ---------------- BACKUP DE EPISÓDIOS NO TELEGRAM ----------------
// ---------------- BACKUP DE EPISÓDIOS NO TELEGRAM ----------------
const handlePodcastBackup = async (req: express.Request, res: express.Response) => {
  const uploadId = req.body.uploadId || `backup-${req.body.trackId || Date.now()}-${Date.now()}`;
  try {
    const { showId, trackId, audioUrl, title, artist, showTitle, coverImage, folderId } = req.body;

    let show: any = null;
    const allShows = db.getAudioShows();

    if (showId && showId !== 'recent-episodes-playlist') {
      show = db.getAudioShowById(showId);
      if (!show) {
        show = allShows.find((s: any) => 
          s.id === showId || 
          (s.title && showId && s.title.toLowerCase().trim() === showId.toLowerCase().trim()) || 
          s.podcastId === showId
        );
      }
    }

    // Try finding by trackId, audioUrl, showTitle or artist across all shows
    if (!show) {
      show = allShows.find((s: any) => 
        (showTitle && s.title && s.title.toLowerCase().trim() === showTitle.toLowerCase().trim()) ||
        (artist && s.artist && s.artist.toLowerCase().trim() === artist.toLowerCase().trim()) ||
        s.tracks?.some((t: any) => (trackId && t.id === trackId) || (audioUrl && t.audioUrl === audioUrl))
      );
    }

    // If still not found, automatically create or resolve the show entity
    if (!show) {
      const finalTitle = showTitle || artist || title || 'Podcast';
      show = db.saveAudioShow({
        title: finalTitle,
        artist: artist || 'Podcast',
        host: artist || 'Podcast',
        genre: 'Podcast',
        category: 'Podcasts',
        description: 'Podcast importado',
        coverImage: coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
        showType: 'podcast',
        tracks: []
      });
    }

    let trackIndex = (show.tracks || []).findIndex((t: any) => 
      (trackId && t.id === trackId) || 
      (t.audioUrl && audioUrl && t.audioUrl === audioUrl) ||
      (t.title && title && t.title.toLowerCase().trim() === title.toLowerCase().trim())
    );

    let track = trackIndex >= 0 ? show.tracks[trackIndex] : null;
    if (!track) {
      track = {
        id: trackId || `ep-${Date.now()}`,
        title: title || 'Episódio',
        audioUrl: audioUrl,
        order: (show.tracks?.length || 0) + 1,
        trackNumber: (show.tracks?.length || 0) + 1
      };
      if (!show.tracks) show.tracks = [];
      show.tracks.push(track);
      trackIndex = show.tracks.length - 1;
    }

    const streamUrl = audioUrl || track.audioUrl;
    if (!streamUrl) {
      return res.status(400).json({ error: 'Este episódio não possui URL de áudio para download.' });
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const cleanTitle = (track.title || title || 'episodio').replace(/[/\\?%*:|"<>]/g, '_').trim();
    const diskFileName = `podcast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.mp3`;
    const tempFilePath = path.join(UPLOADS_DIR, diskFileName);

    // 1. Download stream chunks with live progress
    const fileSize = await downloadStreamWithProgress(
      streamUrl,
      tempFilePath,
      uploadId,
      `${cleanTitle}.mp3`,
      '1/2'
    );

    // Ensure podcast folder in "Meu Drive" exists
    const targetFolder = db.getOrCreatePodcastFolder(show, folderId || undefined);
    const targetFolderId = targetFolder.id;

    // 2. Upload to Telegram Cloud with live progress
    activeUploadsMap.set(uploadId, {
      uploadId,
      fileName: `${cleanTitle}.mp3`,
      size: fileSize,
      transferred: 0,
      progress: 0,
      speed: 'Conectando ao Telegram...',
      stage: 'cloud',
      stageLabel: '2/2 • Enviando ao Telegram Cloud...',
      updatedAt: Date.now()
    });

    const uploadStartTime = Date.now();
    const telegramResult = await telegramService.uploadToSavedMessages(
      tempFilePath,
      `${cleanTitle}.mp3`,
      `🎙️ Podcast: ${show.title} | ${track.title}`,
      (progressPct) => {
        const transferred = Math.round((fileSize * progressPct) / 100);
        const elapsedSec = (Date.now() - uploadStartTime) / 1000;
        const speedMBs = elapsedSec > 0 ? ((transferred / (1024 * 1024)) / elapsedSec).toFixed(1) : '2.0';
        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: `${cleanTitle}.mp3`,
          size: fileSize,
          transferred,
          progress: progressPct,
          speed: `${speedMBs} MB/s`,
          stage: progressPct >= 100 ? 'completed' : 'cloud',
          stageLabel: progressPct >= 100 ? 'Salvo no Telegram!' : '2/2 • Enviando ao Telegram Cloud...',
          updatedAt: Date.now()
        });
      }
    );

    const newDriveItem = db.createFile({
      name: `${cleanTitle}.mp3`,
      parentId: targetFolderId,
      size: fileSize,
      mimeType: 'audio/mpeg',
      extension: 'mp3',
      type: 'audio',
      telegramMeta: {
        messageId: telegramResult.messageId,
        chatId: 'me',
        fileSize: fileSize,
        mimeType: 'audio/mpeg',
        telegramFileName: diskFileName,
        uploadDate: new Date().toISOString(),
        isUploadedToTelegram: telegramResult.success
      }
    });

    const latestShow = db.getAudioShowById(show.id) || show;
    const currentTrackIdx = (latestShow.tracks || []).findIndex((t: any) => 
      (track.id && t.id === track.id) || 
      (t.audioUrl && track.audioUrl && t.audioUrl === track.audioUrl) ||
      (t.title && track.title && t.title.toLowerCase().trim() === track.title.toLowerCase().trim())
    );

    if (currentTrackIdx >= 0) {
      latestShow.tracks[currentTrackIdx] = {
        ...latestShow.tracks[currentTrackIdx],
        fileId: newDriveItem.id
      };
    } else {
      latestShow.tracks.push({
        ...track,
        fileId: newDriveItem.id
      });
    }

    const updatedShow = db.saveAudioShow(latestShow);

    activeUploadsMap.set(uploadId, {
      uploadId,
      fileName: `${cleanTitle}.mp3`,
      size: fileSize,
      transferred: fileSize,
      progress: 100,
      speed: 'Concluído',
      stage: 'completed',
      stageLabel: 'Salvo com sucesso no Telegram!',
      updatedAt: Date.now()
    });
    setTimeout(() => activeUploadsMap.delete(uploadId), 8000);

    res.json({
      success: true,
      file: newDriveItem,
      updatedShow,
      updatedTrack: show.tracks[trackIndex]
    });
  } catch (error: any) {
    activeUploadsMap.set(uploadId, {
      uploadId,
      fileName: 'Episódio de Podcast',
      size: 0,
      transferred: 0,
      progress: 0,
      speed: 'Erro',
      stage: 'error',
      stageLabel: error.message || 'Erro ao realizar backup do episódio',
      updatedAt: Date.now()
    });
    setTimeout(() => activeUploadsMap.delete(uploadId), 8000);
    console.error('Error backing up podcast episode to Telegram:', error);
    res.status(500).json({ error: error.message || 'Erro ao realizar backup do episódio no Telegram' });
  }
};

const handlePodcastBackupAll = async (req: express.Request, res: express.Response) => {
  const masterUploadId = req.body.uploadId || `backup-all-${req.body.showId || Date.now()}`;
  try {
    const { showId } = req.body;
    if (!showId) {
      return res.status(400).json({ error: 'showId é obrigatório' });
    }

    let show = db.getAudioShowById(showId);
    if (!show) {
      const allShows = db.getAudioShows();
      show = allShows.find((s: any) => s.id === showId || s.title?.toLowerCase().trim() === showId.toLowerCase().trim() || s.podcastId === showId);
    }
    if (!show) {
      return res.status(404).json({ error: 'Álbum/Podcast não encontrado' });
    }

    const tracksToBackup = (show.tracks || []).filter((t: any) => t.audioUrl && !t.fileId);
    if (tracksToBackup.length === 0) {
      return res.json({ success: true, message: 'Todos os episódios já estão salvos no Telegram!', updatedShow: show });
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // Ensure podcast folder in "Meu Drive" exists
    const targetFolder = db.getOrCreatePodcastFolder(show);
    const targetFolderId = targetFolder.id;

    let backedUpCount = 0;
    const totalToBackup = tracksToBackup.length;

    for (let i = 0; i < show.tracks.length; i++) {
      const track = show.tracks[i];
      if (!track.audioUrl || track.fileId) continue;

      const trackUploadId = `backup-${track.id}-${Date.now()}`;
      try {
        const cleanTitle = (track.title || `episodio_${i + 1}`).replace(/[/\\?%*:|"<>]/g, '_').trim();
        const diskFileName = `podcast_${Date.now()}_${i}.mp3`;
        const tempFilePath = path.join(UPLOADS_DIR, diskFileName);

        const currentEpIdx = backedUpCount + 1;
        const fileSize = await downloadStreamWithProgress(
          track.audioUrl,
          tempFilePath,
          trackUploadId,
          `${cleanTitle}.mp3`,
          `Episódio ${currentEpIdx}/${totalToBackup} (1/2)`
        );

        activeUploadsMap.set(trackUploadId, {
          uploadId: trackUploadId,
          fileName: `${cleanTitle}.mp3`,
          size: fileSize,
          transferred: 0,
          progress: 0,
          speed: 'Conectando ao Telegram...',
          stage: 'cloud',
          stageLabel: `Episódio ${currentEpIdx}/${totalToBackup} (2/2) • Enviando ao Telegram...`,
          updatedAt: Date.now()
        });

        const uploadStartTime = Date.now();
        const telegramResult = await telegramService.uploadToSavedMessages(
          tempFilePath,
          `${cleanTitle}.mp3`,
          `🎙️ Podcast: ${show.title} | ${track.title}`,
          (progressPct) => {
            const transferred = Math.round((fileSize * progressPct) / 100);
            const elapsedSec = (Date.now() - uploadStartTime) / 1000;
            const speedMBs = elapsedSec > 0 ? ((transferred / (1024 * 1024)) / elapsedSec).toFixed(1) : '2.0';
            activeUploadsMap.set(trackUploadId, {
              uploadId: trackUploadId,
              fileName: `${cleanTitle}.mp3`,
              size: fileSize,
              transferred,
              progress: progressPct,
              speed: `${speedMBs} MB/s`,
              stage: progressPct === 100 ? 'completed' : 'cloud',
              stageLabel: progressPct === 100 ? 'Salvo no Telegram!' : `Episódio ${currentEpIdx}/${totalToBackup} • Enviando ao Telegram...`,
              updatedAt: Date.now()
            });
          }
        );

        const newDriveItem = db.createFile({
          name: `${cleanTitle}.mp3`,
          parentId: targetFolderId,
          size: fileSize,
          mimeType: 'audio/mpeg',
          extension: 'mp3',
          type: 'audio',
          telegramMeta: {
            messageId: telegramResult.messageId,
            chatId: 'me',
            fileSize: fileSize,
            mimeType: 'audio/mpeg',
            telegramFileName: diskFileName,
            uploadDate: new Date().toISOString(),
            isUploadedToTelegram: telegramResult.success
          }
        });

        show.tracks[i] = {
          ...track,
          fileId: newDriveItem.id
        };

        backedUpCount++;
        activeUploadsMap.set(trackUploadId, {
          uploadId: trackUploadId,
          fileName: `${cleanTitle}.mp3`,
          size: fileSize,
          transferred: fileSize,
          progress: 100,
          speed: 'Concluído',
          stage: 'completed',
          stageLabel: 'Salvo com sucesso no Telegram!',
          updatedAt: Date.now()
        });
        setTimeout(() => activeUploadsMap.delete(trackUploadId), 6000);
      } catch (err: any) {
        console.error(`Error backing up track ${track.title}:`, err);
        activeUploadsMap.set(trackUploadId, {
          uploadId: trackUploadId,
          fileName: `${track.title || 'Episódio'}.mp3`,
          size: 0,
          transferred: 0,
          progress: 0,
          speed: 'Erro',
          stage: 'error',
          stageLabel: err.message || 'Falha no backup do episódio',
          updatedAt: Date.now()
        });
        setTimeout(() => activeUploadsMap.delete(trackUploadId), 8000);
      }
    }

    const updatedShow = db.saveAudioShow(show);
    res.json({
      success: true,
      backedUpCount,
      updatedShow
    });
  } catch (error: any) {
    console.error('Error backing up all podcast episodes to Telegram:', error);
    res.status(500).json({ error: error.message || 'Erro ao realizar backup dos episódios no Telegram' });
  }
};

app.post('/api/podcasts/backup-telegram', handlePodcastBackup);
app.post('/api/audio-shows/backup-telegram', handlePodcastBackup);

app.post('/api/podcasts/backup-all-telegram', handlePodcastBackupAll);
app.post('/api/audio-shows/backup-all-telegram', handlePodcastBackupAll);

app.get('/api/audio-categories', (_req, res) => {
  res.json(db.getAudioCategories());
});

app.post('/api/audio-categories', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Categoria é obrigatória' });
  const updated = db.addAudioCategory(category);
  res.json(updated);
});

app.put('/api/audio-categories', (req, res) => {
  const { oldCategory, newCategory } = req.body;
  if (!oldCategory || !newCategory) return res.status(400).json({ error: 'Categorias são obrigatórias' });
  const updated = db.updateAudioCategory(oldCategory, newCategory);
  res.json(updated);
});

app.delete('/api/audio-categories/:category', (req, res) => {
  const updated = db.deleteAudioCategory(decodeURIComponent(req.params.category));
  res.json(updated);
});

// ---------------- FILMES & CONTEÚDO ADULTO (+18) & COFRE ----------------
app.get('/api/adult-vault/status', (_req, res) => {
  res.json(db.getAdultVaultStatus());
});

app.post('/api/adult-vault/setup', (req, res) => {
  const { password, recoveryQuestion, recoveryAnswer, hint } = req.body;
  if (!password || !recoveryQuestion || !recoveryAnswer) {
    return res.status(400).json({ error: 'Senha, pergunta e resposta de segurança são obrigatórias' });
  }
  const success = db.setupAdultVault(password, recoveryQuestion, recoveryAnswer, hint);
  if (success) {
    res.json({ success: true, message: 'Cofre configurado com sucesso' });
  } else {
    res.status(500).json({ error: 'Erro ao configurar cofre' });
  }
});

app.post('/api/adult-vault/verify', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }
  const isValid = db.verifyAdultPassword(password);
  if (isValid) {
    res.json({ success: true, unlocked: true });
  } else {
    res.status(401).json({ error: 'Senha incorreta', unlocked: false });
  }
});

app.post('/api/adult-vault/recover', (req, res) => {
  const { recoveryAnswer, newPassword } = req.body;
  if (!recoveryAnswer || !newPassword) {
    return res.status(400).json({ error: 'Resposta de recuperação e nova senha são obrigatórias' });
  }
  const success = db.verifyAndResetAdultPassword(recoveryAnswer, newPassword);
  if (success) {
    res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } else {
    res.status(400).json({ error: 'Resposta de segurança incorreta ou dados inválidos' });
  }
});

app.post('/api/adult-vault/change-password', (req, res) => {
  const { currentPassword, newPassword, recoveryQuestion, recoveryAnswer, hint } = req.body;
  if (!currentPassword) {
    return res.status(400).json({ error: 'Senha atual é obrigatória' });
  }
  const success = db.changeAdultVaultSettings(currentPassword, newPassword, recoveryQuestion, recoveryAnswer, hint);
  if (success) {
    res.json({ success: true, message: 'Configurações atualizadas com sucesso' });
  } else {
    res.status(401).json({ error: 'Senha atual incorreta' });
  }
});

app.get('/api/adult-videos', (_req, res) => {
  db.syncAdultVideosWithFolderStructure();
  res.json(db.getAdultVideos());
});

app.get('/api/adult-videos/:id', (req, res) => {
  const video = db.getAdultVideoById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Vídeo não encontrado' });
  res.json(video);
});

app.post('/api/adult-videos', (req, res) => {
  const video = db.createAdultVideo(req.body);
  res.status(201).json(video);
});

app.post('/api/adult-videos/from-folder', (req, res) => {
  try {
    const { folderId, title, description, category, studio, performers, aka, year, coverImage } = req.body;
    if (!folderId) return res.status(400).json({ error: 'folderId é obrigatório' });

    const folder = db.getFolderById(folderId);
    if (!folder) return res.status(404).json({ error: 'Pasta não encontrada' });

    const createdVideos = db.createAdultVideosFromFolder({
      title: title ? title.trim() : undefined,
      description: description ? description.trim() : undefined,
      category: category || 'Longas-Metragens',
      studio: studio ? studio.trim() : undefined,
      performers: performers ? performers.trim() : undefined,
      aka: aka ? aka.trim() : undefined,
      year: year ? parseInt(year, 10) || undefined : undefined,
      coverImage,
      folderId
    });

    res.status(201).json(createdVideos);
  } catch (e: any) {
    console.error('Error creating adult videos from folder:', e);
    res.status(500).json({ error: e.message || 'Erro ao criar vídeos da pasta' });
  }
});

app.patch('/api/adult-videos/:id', (req, res) => {
  const updated = db.updateAdultVideo({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/adult-videos/:id', (req, res) => {
  db.deleteAdultVideo(req.params.id);
  res.status(204).end();
});

app.patch('/api/adult-videos/:id/progress', (req, res) => {
  const { seconds, isCompleted } = req.body;
  const ok = db.updateAdultVideoProgress(req.params.id, seconds, isCompleted);
  if (ok) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Vídeo não encontrado' });
  }
});

app.post('/api/adult-videos/:id/favorite', (req, res) => {
  const isFavorite = db.toggleAdultVideoFavorite(req.params.id);
  res.json({ success: true, isFavorite });
});

app.get('/api/adult-categories', (_req, res) => {
  res.json(db.getAdultCategories());
});

app.post('/api/adult-categories', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Categoria é obrigatória' });
  const updated = db.addAdultCategory(category);
  res.json(updated);
});

app.put('/api/adult-categories', (req, res) => {
  const { oldCategory, newCategory } = req.body;
  if (!oldCategory || !newCategory) return res.status(400).json({ error: 'Categorias são obrigatórias' });
  const updated = db.updateAdultCategory(oldCategory, newCategory);
  res.json(updated);
});

app.delete('/api/adult-categories/:category', (req, res) => {
  const updated = db.deleteAdultCategory(decodeURIComponent(req.params.category));
  res.json(updated);
});

// ---------------- ADULT PERFORMERS ROUTES ----------------
app.get('/api/adult-performers', (_req, res) => {
  res.json(db.getAdultPerformers());
});

app.get('/api/adult-performers/:id', (req, res) => {
  const performer = db.getAdultPerformerById(req.params.id);
  if (!performer) return res.status(404).json({ error: 'Performer não encontrado' });
  res.json(performer);
});

app.post('/api/adult-performers', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  const performer = db.createAdultPerformer(req.body);
  res.status(201).json(performer);
});

app.put('/api/adult-performers/:id', (req, res) => {
  const updated = db.updateAdultPerformer({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete('/api/adult-performers/:id', (req, res) => {
  db.deleteAdultPerformer(req.params.id);
  res.json({ success: true });
});

app.post('/api/adult-performers/:id/favorite', (req, res) => {
  const isFavorite = db.toggleAdultPerformerFavorite(req.params.id);
  res.json({ success: true, isFavorite });
});

// ---------------- COURSES ----------------
app.get('/api/courses', (_req, res) => {
  res.json(db.getCourses());
});

app.get('/api/courses/:id', (req, res) => {
  const course = db.getCourseById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso não encontrado' });
  res.json(course);
});

app.post('/api/courses', (req, res) => {
  const course = db.saveCourse(req.body);
  res.status(201).json(course);
});

app.post('/api/courses/from-folder', (req, res) => {
  const { folderId, title, description, category, coverImage } = req.body;
  if (!folderId) return res.status(400).json({ error: 'ID da pasta é obrigatório' });

  const rootFolder = db.getAllFolders().find(f => f.id === folderId);
  const allSubfolders = db.getAllFolders().filter(f => f.parentId === folderId && !f.isTrash);
  const allFiles = db.getAllFiles().filter(f => !f.isTrash);

  let modules: any[] = [];

  if (allSubfolders.length > 0) {
    // Each subfolder is a module
    modules = allSubfolders.map((sub, idx) => {
      const subFiles = allFiles.filter(f => f.parentId === sub.id && f.type === 'video');
      const lessons = subFiles.map((file, lIdx) => ({
        id: 'lesson-' + Date.now() + '-' + idx + '-' + lIdx,
        title: file.name.replace(/\.[^/.]+$/, ""),
        duration: '15:00',
        fileId: file.id,
        order: lIdx + 1,
        isCompleted: false,
        timestamps: file.timestamps || [],
        subtitles: file.subtitles || []
      }));
      return {
        id: 'mod-' + Date.now() + '-' + idx,
        title: sub.name,
        order: idx + 1,
        lessons
      };
    });
  } else {
    // Direct videos in the selected folder
    const rootVideos = allFiles.filter(f => f.parentId === folderId && f.type === 'video');
    modules = [
      {
        id: 'mod-' + Date.now() + '-1',
        title: rootFolder ? rootFolder.name : 'Módulo 1: Aulas',
        order: 1,
        lessons: rootVideos.map((file, lIdx) => ({
          id: 'lesson-' + Date.now() + '-1-' + lIdx,
          title: file.name.replace(/\.[^/.]+$/, ""),
          duration: '15:00',
          fileId: file.id,
          order: lIdx + 1,
          isCompleted: false,
          timestamps: file.timestamps || [],
          subtitles: file.subtitles || []
        }))
      }
    ];
  }

  const newCourse = db.saveCourse({
    id: 'course-' + Date.now(),
    title: title || (rootFolder ? rootFolder.name : 'Novo Curso'),
    description: description || (rootFolder?.description || 'Curso criado a partir da pasta ' + (rootFolder?.name || '')),
    category: category || 'Geral',
    folderId,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    modules
  });

  res.status(201).json(newCourse);
});

app.put('/api/courses/:id', (req, res) => {
  const course = db.saveCourse({ ...req.body, id: req.params.id });
  res.json(course);
});

app.delete('/api/courses/:id', (req, res) => {
  db.deleteCourse(req.params.id);
  res.json({ success: true });
});

// ---------------- TELEGRAM AUTH & SYNC ----------------
app.get('/api/telegram/status', (_req, res) => {
  try {
    res.json(telegramService.getAuthState());
  } catch (e: any) {
    console.error('[Telegram Status Error]', e);
    res.json({
      isConnected: false,
      savedMessagesChatId: 'me',
      totalSavedFiles: 0,
      storageUsedBytes: 0,
      streamingMode: 'cloud_direct',
      cacheDuration: { value: 24, unit: 'hours', totalMinutes: 1440 },
      localCacheSizeBytes: 0
    });
  }
});

app.post('/api/telegram/qr/start', async (req, res) => {
  const { apiId, apiHash, password } = req.body;
  const result = await telegramService.startQrLogin(
    apiId ? parseInt(apiId, 10) : undefined,
    apiHash,
    password
  );
  res.json(result);
});

app.get('/api/telegram/qr/status', (_req, res) => {
  res.json(telegramService.getQrStatus());
});

app.post('/api/telegram/send-code', async (req, res) => {
  const { apiId, apiHash, phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Telefone é obrigatório.' });
  }
  const result = await telegramService.sendAuthCode(
    apiId ? parseInt(apiId, 10) : 0, 
    apiHash || '', 
    phone
  );
  res.json(result);
});

app.post('/api/telegram/sign-in', async (req, res) => {
  const { code, password } = req.body;
  if (!code) return res.status(400).json({ error: 'Código de confirmação é obrigatório.' });
  const result = await telegramService.signInWithCode(code, password);
  res.json(result);
});

app.post('/api/telegram/disconnect', async (_req, res) => {
  await telegramService.disconnect();
  res.json({ success: true, message: 'Desconectado do Telegram.' });
});

app.post('/api/telegram/sync', async (_req, res) => {
  const result = await telegramService.syncMetadataToTelegram();
  res.json(result);
});

app.post('/api/telegram/restore', async (_req, res) => {
  const result = await telegramService.restoreMetadataFromTelegram();
  res.json(result);
});

app.post('/api/telegram/startup-sync', async (_req, res) => {
  try {
    const result = await telegramService.performStartupMetadataSync();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message || 'Erro na sincronização ativa de inicialização' });
  }
});

app.post('/api/telegram/import-saved', async (_req, res) => {
  const result = await telegramService.scanAndImportSavedMessages();
  res.json(result);
});

app.post('/api/telegram/download-all', async (_req, res) => {
  const allFiles = db.getAllFiles().filter(f => !f.isTrash);
  let downloadedCount = 0;
  let skippedCount = 0;
  let totalBytes = 0;

  for (const file of allFiles) {
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = path.join(UPLOADS_DIR, diskFileName);

    if (!fs.existsSync(filePath) && file.telegramMeta?.messageId) {
      const uploadId = `download-all-${file.id}`;
      const expectedSize = file.size || file.telegramMeta?.fileSize || 0;
      const dlStart = Date.now();
      activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: expectedSize, transferred: 0, progress: 0, speed: 'Conectando...', stage: 'cloud', stageLabel: `⚡ Baixando "${file.name}"...`, updatedAt: Date.now() });
      try {
        await telegramService.downloadMediaByMessageId(file.telegramMeta.messageId, filePath, (pct, transferred, total) => {
          const speed = ((transferred / (1024 * 1024)) / Math.max(0.2, (Date.now() - dlStart) / 1000)).toFixed(2);
          activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: total, transferred, progress: pct, speed: `${speed} MB/s`, stage: pct >= 100 ? 'completed' : 'cloud', stageLabel: pct >= 100 ? 'Concluído!' : `⚡ Baixando "${file.name}" (${pct}%)...`, updatedAt: Date.now() });
        }, expectedSize);
        downloadedCount++;
        const finalSz = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
        totalBytes += finalSz;
        if (!file.telegramMeta.telegramFileName || file.telegramMeta.telegramFileName !== diskFileName) {
          file.telegramMeta.telegramFileName = diskFileName;
          db.updateFile(file.id, { telegramMeta: file.telegramMeta });
        }
        db.touchFileCachedAt(file.id);
        activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: finalSz, transferred: finalSz, progress: 100, speed: 'Concluído', stage: 'completed', stageLabel: 'Arquivo salvo!', updatedAt: Date.now() });
        setTimeout(() => activeUploadsMap.delete(uploadId), 10000);
      } catch (dlErr: any) {
        activeUploadsMap.set(uploadId, { uploadId, fileName: file.name, size: expectedSize, transferred: 0, progress: 0, speed: '', stage: 'error', stageLabel: dlErr.message || 'Falha', updatedAt: Date.now() });
        setTimeout(() => activeUploadsMap.delete(uploadId), 10000);
      }
    } else {
      skippedCount++;
    }
  }

  res.json({
    success: true,
    downloadedCount,
    skippedCount,
    totalBytesFormatted: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB',
    message: `${downloadedCount} arquivo(s) baixados e salvos com sucesso na pasta uploads (${(totalBytes / (1024 * 1024)).toFixed(2)} MB).`
  });
});

// ---------------- RETRY PENDING TELEGRAM UPLOADS ----------------
app.get('/api/telegram/pending-uploads', (_req, res) => {
  const allFiles = db.getAllFiles().filter(f => !f.isTrash);
  const pendingFiles = allFiles.filter(file => {
    const isUploaded = file.telegramMeta?.isUploadedToTelegram && file.telegramMeta?.messageId;
    if (isUploaded) return false;
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = path.join(UPLOADS_DIR, diskFileName);
    const altFilePath = path.join(UPLOADS_DIR, file.name);
    return fs.existsSync(filePath) || fs.existsSync(altFilePath);
  });

  const totalBytes = pendingFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  res.json({
    totalPending: pendingFiles.length,
    totalBytes,
    totalBytesFormatted: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB',
    files: pendingFiles
  });
});

app.post('/api/telegram/sync-pending', async (_req, res) => {
  const allFiles = db.getAllFiles().filter(f => !f.isTrash);
  const pendingFiles = allFiles.filter(file => {
    const isUploaded = file.telegramMeta?.isUploadedToTelegram && file.telegramMeta?.messageId;
    if (isUploaded) return false;
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = path.join(UPLOADS_DIR, diskFileName);
    const altFilePath = path.join(UPLOADS_DIR, file.name);
    return fs.existsSync(filePath) || fs.existsSync(altFilePath);
  });

  if (pendingFiles.length === 0) {
    return res.json({
      success: true,
      uploadedCount: 0,
      failedCount: 0,
      totalPending: 0,
      message: 'Nenhum arquivo pendente encontrado para envio remoto.'
    });
  }

  let uploadedCount = 0;
  let failedCount = 0;

  for (const file of pendingFiles) {
    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    let filePath = path.join(UPLOADS_DIR, diskFileName);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(UPLOADS_DIR, file.name);
    }
    if (!fs.existsSync(filePath)) {
      failedCount++;
      continue;
    }

    const uploadId = `retry-${file.id}`;
    const caption = `📁 DriveGram File\n📄 Nome: ${file.name}\n📦 Tamanho: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n🏷️ Pasta: ${file.parentId || 'Raiz'}`;
    const startTime = Date.now();

    activeUploadsMap.set(uploadId, {
      uploadId,
      fileName: file.name,
      size: file.size,
      transferred: 0,
      progress: 0,
      speed: '0 MB/s',
      stage: 'cloud',
      stageLabel: 'Enviando para o Telegram Cloud...',
      updatedAt: Date.now()
    });

    try {
      const telegramResult = await telegramService.uploadToSavedMessages(
        filePath,
        file.name,
        caption,
        (percent) => {
          const transferred = Math.round((percent / 100) * file.size);
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speedMBs = elapsedSec > 0 ? ((transferred / (1024 * 1024)) / elapsedSec).toFixed(1) : '1.0';
          activeUploadsMap.set(uploadId, {
            uploadId,
            fileName: file.name,
            size: file.size,
            transferred,
            progress: percent,
            speed: `${speedMBs} MB/s`,
            stage: percent >= 100 ? 'completed' : 'cloud',
            stageLabel: percent >= 100 ? 'Salvo no Telegram' : 'Enviando para o Telegram Cloud...',
            updatedAt: Date.now()
          });
        }
      );

      if (telegramResult.success && telegramResult.messageId) {
        db.updateFile(file.id, {
          telegramMeta: {
            ...file.telegramMeta,
            messageId: telegramResult.messageId,
            chatId: 'me',
            fileSize: file.size,
            mimeType: file.mimeType,
            telegramFileName: path.basename(filePath),
            uploadDate: new Date().toISOString(),
            isUploadedToTelegram: true
          }
        });
        uploadedCount++;
        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: file.name,
          size: file.size,
          transferred: file.size,
          progress: 100,
          speed: 'Concluído',
          stage: 'completed',
          stageLabel: 'Salvo com sucesso no Telegram',
          updatedAt: Date.now()
        });
        setTimeout(() => activeUploadsMap.delete(uploadId), 10000);
      } else {
        failedCount++;
        activeUploadsMap.delete(uploadId);
      }
    } catch (err) {
      console.error(`Error uploading pending file ${file.name}:`, err);
      failedCount++;
      activeUploadsMap.delete(uploadId);
    }
  }

  // Backup metadata manifest on Telegram if anything was uploaded
  if (uploadedCount > 0) {
    telegramService.syncMetadataToTelegram().catch(() => {});
  }

  res.json({
    success: true,
    uploadedCount,
    failedCount,
    totalPending: pendingFiles.length,
    message: `${uploadedCount} arquivo(s) enviados com sucesso para as Mensagens Salvas do Telegram!${failedCount > 0 ? ` (${failedCount} falharam)` : ''}`
  });
});

app.post('/api/telegram/retry-file/:id', async (req, res) => {
  const file = db.getAllFiles().find(f => f.id === req.params.id && !f.isTrash);
  if (!file) return res.status(404).json({ error: 'Arquivo não encontrado' });

  const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
  let filePath = path.join(UPLOADS_DIR, diskFileName);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(UPLOADS_DIR, file.name);
  }
  if (!fs.existsSync(filePath)) {
    return res.status(400).json({ error: 'Arquivo físico não encontrado no cache local para envio.' });
  }

  const uploadId = (req.body?.uploadId as string) || `retry-${file.id}`;
  const caption = `📁 DriveGram File\n📄 Nome: ${file.name}\n📦 Tamanho: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n🏷️ Pasta: ${file.parentId || 'Raiz'}`;
  const startTime = Date.now();

  activeUploadsMap.set(uploadId, {
    uploadId,
    fileName: file.name,
    size: file.size,
    transferred: 0,
    progress: 0,
    speed: '0 MB/s',
    stage: 'cloud',
    stageLabel: 'Enviando para o Telegram Cloud...',
    updatedAt: Date.now()
  });

  try {
    const telegramResult = await telegramService.uploadToSavedMessages(
      filePath,
      file.name,
      caption,
      (percent) => {
        const transferred = Math.round((percent / 100) * file.size);
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedMBs = elapsedSec > 0 ? ((transferred / (1024 * 1024)) / elapsedSec).toFixed(1) : '1.0';
        activeUploadsMap.set(uploadId, {
          uploadId,
          fileName: file.name,
          size: file.size,
          transferred,
          progress: percent,
          speed: `${speedMBs} MB/s`,
          stage: percent >= 100 ? 'completed' : 'cloud',
          stageLabel: percent >= 100 ? 'Salvo no Telegram' : 'Enviando para o Telegram Cloud...',
          updatedAt: Date.now()
        });
      }
    );

    if (telegramResult.success && telegramResult.messageId) {
      const updated = db.updateFile(file.id, {
        telegramMeta: {
          ...file.telegramMeta,
          messageId: telegramResult.messageId,
          chatId: 'me',
          fileSize: file.size,
          mimeType: file.mimeType,
          telegramFileName: path.basename(filePath),
          uploadDate: new Date().toISOString(),
          isUploadedToTelegram: true
        }
      });

      activeUploadsMap.set(uploadId, {
        uploadId,
        fileName: file.name,
        size: file.size,
        transferred: file.size,
        progress: 100,
        speed: 'Concluído',
        stage: 'completed',
        stageLabel: 'Salvo com sucesso no Telegram',
        updatedAt: Date.now()
      });

      setTimeout(() => activeUploadsMap.delete(uploadId), 10000);

      telegramService.syncMetadataToTelegram().catch(() => {});

      return res.json({
        success: true,
        file: updated,
        message: `"${file.name}" enviado e salvo com sucesso no Telegram!`
      });
    } else {
      activeUploadsMap.delete(uploadId);
      return res.status(200).json({
        success: false,
        error: telegramResult.error || 'Erro ao enviar para o Telegram'
      });
    }
  } catch (err: any) {
    activeUploadsMap.delete(uploadId);
    return res.status(200).json({ success: false, error: err.message || 'Erro no envio' });
  }
});

// ---------------- EXPORT / IMPORT BACKUP ----------------
app.get('/api/manifest/export', (_req, res) => {
  const manifest = db.exportManifest();
  res.setHeader('Content-Disposition', 'attachment; filename="drivegram_backup.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(manifest, null, 2));
});

app.post('/api/manifest/import', (req, res) => {
  const success = db.importManifest(req.body);
  if (!success) return res.status(400).json({ error: 'Manifesto inválido' });
  res.json({ success: true, message: 'Estrutura restaurada com sucesso!' });
});

// ---------------- AUTO-SYNC YOUTUBE COVERS TO TELEGRAM ----------------
async function syncExistingYouTubeCoversToTelegram() {
  try {
    const data = db.getData();
    let updatedCount = 0;

    // 1. Series
    for (const s of data.series || []) {
      if (s.coverImage && (s.coverImage.includes('ytimg.com') || s.coverImage.includes('googleusercontent.com')) && !s.coverImage.startsWith('/api/covers/telegram/')) {
        const rawUrl = s.coverImage;
        const res = await telegramService.uploadCoverToTelegram(rawUrl, s.title, 'youtube_series');
        if (res.messageId) {
          s.coverImage = `/api/covers/telegram/${res.messageId}?fallback=${encodeURIComponent(rawUrl)}`;
          updatedCount++;
        }
      }
    }

    // 2. Courses
    for (const c of data.courses || []) {
      if (c.coverImage && (c.coverImage.includes('ytimg.com') || c.coverImage.includes('googleusercontent.com')) && !c.coverImage.startsWith('/api/covers/telegram/')) {
        const rawUrl = c.coverImage;
        const res = await telegramService.uploadCoverToTelegram(rawUrl, c.title, 'youtube_course');
        if (res.messageId) {
          c.coverImage = `/api/covers/telegram/${res.messageId}?fallback=${encodeURIComponent(rawUrl)}`;
          updatedCount++;
        }
      }
    }

    // 3. Audio Shows
    for (const a of data.audioShows || []) {
      if (a.coverImage && (a.coverImage.includes('ytimg.com') || a.coverImage.includes('googleusercontent.com')) && !a.coverImage.startsWith('/api/covers/telegram/')) {
        const rawUrl = a.coverImage;
        const res = await telegramService.uploadCoverToTelegram(rawUrl, a.title, 'youtube_audio');
        if (res.messageId) {
          a.coverImage = `/api/covers/telegram/${res.messageId}?fallback=${encodeURIComponent(rawUrl)}`;
          updatedCount++;
        }
      }
    }

    // 4. Videos
    for (const v of data.videos || []) {
      if (v.coverImage && (v.coverImage.includes('ytimg.com') || v.coverImage.includes('googleusercontent.com')) && !v.coverImage.startsWith('/api/covers/telegram/')) {
        const rawUrl = v.coverImage;
        const res = await telegramService.uploadCoverToTelegram(rawUrl, v.title, 'youtube_video');
        if (res.messageId) {
          v.coverImage = `/api/covers/telegram/${res.messageId}?fallback=${encodeURIComponent(rawUrl)}`;
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`[DriveGram YouTube Cover Sync] Synced ${updatedCount} YouTube covers to Telegram.`);
    }
  } catch (e) {
    console.warn('[DriveGram YouTube Cover Sync] Error during cover sync:', e);
  }
}

// Run 3s after startup to sync covers
setTimeout(syncExistingYouTubeCoversToTelegram, 3000);

// ---------------- 30-DAY TRASH AUTO-PURGE ROUTINE ----------------
async function purgeExpiredTrashRoutine() {
  try {
    const expiredFiles = db.purgeExpiredTrash(30);
    if (expiredFiles.length > 0) {
      console.log(`[DriveGram Trash Auto-Purge] Found ${expiredFiles.length} expired file(s) in trash older than 30 days. Purging from Telegram and disk...`);
      for (const file of expiredFiles) {
        if (file.telegramMeta?.messageId) {
          await telegramService.deleteMessageFromTelegram(file.telegramMeta.messageId);
        }
        const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
        const filePath = path.join(UPLOADS_DIR, diskFileName);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
      console.log(`[DriveGram Trash Auto-Purge] Purged ${expiredFiles.length} file(s) from Telegram and local cache.`);
    }
  } catch (e) {
    console.error('[DriveGram Trash Auto-Purge] Error during trash auto-purge:', e);
  }
}

// Run 5s after startup, then every 1 hour
setTimeout(purgeExpiredTrashRoutine, 5000);
setInterval(purgeExpiredTrashRoutine, 60 * 60 * 1000);

// ---------------- TEMPORARY CACHE AUTO-PURGE ROUTINE ----------------
function purgeExpiredCacheRoutine() {
  try {
    const result = db.purgeExpiredCache(UPLOADS_DIR);
    if (result.purgedFiles > 0) {
      console.log(`[DriveGram Cache Cleaner] Cleaned ${result.purgedFiles} expired cached files (${(result.freedBytes / (1024 * 1024)).toFixed(2)} MB freed).`);
    }
  } catch (e) {
    console.error('[DriveGram Cache Cleaner] Error during cache cleanup:', e);
  }
}

// Run 10s after startup, then every 2 minutes
setTimeout(purgeExpiredCacheRoutine, 10000);
setInterval(purgeExpiredCacheRoutine, 2 * 60 * 1000);

// ---------------- PROCESSO AUTOMÁTICO DE BACKUP E ATUALIZAÇÃO ATIVA DE METADADOS ----------------
db.setCloudBackupCallback(async () => {
  try {
    const client = await telegramService.ensureClient();
    if (client && telegramService.getAuthState().isConnected) {
      console.log('[DriveGram Auto-Backup] Arquivo ou metadado alterado. Disparando backup no Telegram...');
      telegramService.syncMetadataToTelegram().catch(err => {
        console.warn('[DriveGram Auto-Backup] Aviso no envio automático ao Telegram:', err?.message || err);
      });
    }
  } catch (e: any) {
    console.warn('[DriveGram Auto-Backup] Erro ao verificar estado para backup:', e?.message || e);
  }
});

// Processo ativo de sincronização de metadados ao iniciar o aplicativo (Desktop & Mobile)
setTimeout(async () => {
  try {
    const client = await telegramService.ensureClient();
    if (client && telegramService.getAuthState().isConnected) {
      console.log('[DriveGram Startup] Executando processo ativo de sincronização de metadados...');
      const res = await telegramService.performStartupMetadataSync();
      console.log('[DriveGram Startup]', res.message);
    }
  } catch (err: any) {
    console.warn('[DriveGram Startup] Aviso na sincronização ativa de inicialização:', err?.message || err);
  }
}, 3500);

// ---------------- SERVIR FRONTEND ESTÁTICO (PRODUÇÃO / RENDER / ANDROID) ----------------
const candidateDirs = [
  process.env.DRIVEGRAM_STATIC_DIR,
  path.join(__dirname, 'public'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', '..', 'www'),
  path.join(__dirname, '..', '..', 'public'),
  path.join(__dirname, '..', '..', 'dist')
].filter(Boolean) as string[];

let STATIC_DIR: string | null = null;
for (const cand of candidateDirs) {
  if (fs.existsSync(cand) && fs.existsSync(path.join(cand, 'index.html'))) {
    STATIC_DIR = cand;
    break;
  }
}

if (STATIC_DIR) {
  console.log(`[DriveGram] Serving static frontend from: ${STATIC_DIR}`);
  app.use(express.static(STATIC_DIR));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(STATIC_DIR!, 'index.html'));
    }
  });
} else {
  console.warn('[DriveGram] Warning: No static frontend index.html directory found.');
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 DriveGram server running on port ${PORT}`);
  console.log(`📁 Uploads dir: ${UPLOADS_DIR}`);
  if (STATIC_DIR) console.log(`🌐 Frontend: ${STATIC_DIR}`);

  // Rotina de Inicialização Ativa de Metadados (Desktop & Mobile)
  setTimeout(async () => {
    try {
      console.log('[DriveGram Startup] Verificando conexão e iniciando sincronização ativa de metadados...');
      const client = await telegramService.ensureClient();
      if (client && telegramService.getAuthState().isConnected) {
        const syncRes = await telegramService.performStartupMetadataSync();
        console.log('[DriveGram Startup] Resultado da sincronização de inicialização:', syncRes.message);
      } else {
        console.log('[DriveGram Startup] Telegram não conectado ainda. Sincronização de inicialização aguardando login.');
      }
    } catch (e: any) {
      console.warn('[DriveGram Startup] Erro na sincronização de inicialização:', e?.message || e);
    }
  }, 3500);
});
