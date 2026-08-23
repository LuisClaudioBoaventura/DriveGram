import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './database.js';
import { telegramService } from './telegram.js';
import { castService } from './cast.js';
import { comicService } from './comicService.js';
import { FileType } from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const cleanOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._\-]/g, '_');
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

app.use(cors());
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
  const folder = db.createFolder(name, parentId || null, color);
  res.status(201).json(folder);
});

app.patch('/api/folders/:id', (req, res) => {
  const folder = db.updateFolder(req.params.id, req.body);
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

app.get('/api/uploads/progress/:id', (req, res) => {
  const progress = activeUploadsMap.get(req.params.id);
  if (progress) {
    res.json(progress);
  } else {
    res.json({ progress: 100, stage: 'completed', speed: 'Concluído' });
  }
});

app.post('/api/files/upload', upload.single('file'), async (req, res) => {
  const uploadId = (req.body.uploadId as string) || ('up-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5));

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { originalname, size, mimetype, path: tempFilePath } = req.file;
    let parentId = req.body.parentId || null;
    const relativePath = req.body.relativePath as string; // e.g. "Modulo 1/Aula 1/video.mp4"
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

    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = getSafeUploadPath(diskFileName);

    // If file is not on disk, download it from Telegram
    if (!fs.existsSync(filePath) && file.telegramMeta?.messageId) {
      console.log(`[DriveGram Comic] Downloading HQ ${file.name} to disk for page extraction...`);
      await telegramService.downloadMediaByMessageId(file.telegramMeta.messageId, filePath);
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

    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = getSafeUploadPath(diskFileName);

    if (!fs.existsSync(filePath) && file.telegramMeta?.messageId) {
      await telegramService.downloadMediaByMessageId(file.telegramMeta.messageId, filePath);
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

// ---------------- STREAMING & PREVIEW (SUPPORTS CLOUD, TEMP CACHE & LOCAL CACHE) ----------------
app.get('/api/stream/:id', async (req, res) => {
  try {
    const file = db.getAllFiles().find(f => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: 'Arquivo não encontrado' });

    const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
    const filePath = getSafeUploadPath(diskFileName);
    const streamingMode = db.getStreamingMode(); // 'cloud_direct' | 'temp_cache' | 'local_cache'
    const isCloudDirect = req.query.mode === 'direct' || req.query.mode === 'cloud' || streamingMode === 'cloud_direct';
    const isTempCache = req.query.mode === 'temp' || streamingMode === 'temp_cache';

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

    // 1. Temporary Cache Mode (Salva em disco com expiração / auto-limpeza)
    if (isTempCache) {
      if (!fs.existsSync(filePath) && file.telegramMeta?.messageId) {
        try {
          console.log(`[DriveGram Temp Cache] Downloading file ${file.name} to uploads for temporary caching...`);
          const buffer = await telegramService.downloadMediaByMessageId(file.telegramMeta.messageId, filePath);
          if (buffer && (!file.telegramMeta.telegramFileName || file.telegramMeta.telegramFileName !== diskFileName)) {
            file.telegramMeta.telegramFileName = diskFileName;
            db.updateFile(file.id, { telegramMeta: file.telegramMeta });
          }
        } catch (e) {
          console.warn(`[DriveGram Temp Cache] Failed to download to cache, falling back to direct stream:`, e);
        }
      }

      if (fs.existsSync(filePath)) {
        db.touchFileCachedAt(file.id);
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const streamFile = fs.createReadStream(filePath, { start, end });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': file.mimeType || 'video/mp4',
            'Access-Control-Allow-Origin': '*'
          });
          return streamFile.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': file.mimeType || 'video/mp4',
            'Access-Control-Allow-Origin': '*'
          });
          return fs.createReadStream(filePath).pipe(res);
        }
      }
    }

    // 2. Local Permanent Cache Mode (Salva em disco permanentemente)
    if (fs.existsSync(filePath) && !isCloudDirect) {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const streamFile = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': file.mimeType || 'video/mp4',
          'Access-Control-Allow-Origin': '*'
        });
        return streamFile.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': file.mimeType || 'video/mp4',
          'Access-Control-Allow-Origin': '*'
        });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // 3. Pure Cloud Direct Streaming (Zero Download / Zero Disco)
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
          end = start + 1024 * 1024;
        }
      }

      const streamed = await telegramService.streamMediaDirect(
        file.telegramMeta.messageId,
        start,
        end,
        fileSize,
        file.mimeType || 'video/mp4',
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

    // Fallback: If local file exists, stream it
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const streamFile = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': file.mimeType || 'video/mp4',
          'Access-Control-Allow-Origin': '*'
        });
        return streamFile.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': file.mimeType || 'video/mp4',
          'Access-Control-Allow-Origin': '*'
        });
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // Final fallback: 404 or empty response closed properly
    if (!res.headersSent) {
      res.status(404).json({ error: 'Mídia não disponível' });
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

  const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
  const filePath = getSafeUploadPath(diskFileName);

  if (!fs.existsSync(filePath) && file.telegramMeta?.messageId) {
    await telegramService.downloadMediaByMessageId(file.telegramMeta.messageId, filePath);
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
      const buffer = await telegramService.downloadMediaByMessageId(file.telegramMeta.messageId, filePath);
      if (buffer) {
        downloadedCount++;
        totalBytes += buffer.length;
        if (!file.telegramMeta.telegramFileName || file.telegramMeta.telegramFileName !== diskFileName) {
          file.telegramMeta.telegramFileName = diskFileName;
          db.updateFile(file.id, { telegramMeta: file.telegramMeta });
        }
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
      return res.status(500).json({
        success: false,
        error: telegramResult.error || 'Erro ao enviar para o Telegram'
      });
    }
  } catch (err: any) {
    activeUploadsMap.delete(uploadId);
    return res.status(500).json({ success: false, error: err.message || 'Erro no envio' });
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

// ---------------- SERVIR FRONTEND ESTÁTICO (PRODUÇÃO / RENDER) ----------------
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 DriveGram rodando na porta http://localhost:${PORT}`);
});
