import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { createExtractorFromData } from 'node-unrar-js';

// Natural sort for comic book pages (e.g. 1.jpg, 2.jpg, 10.jpg, 01_02.png)
function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif']);

export interface ComicManifest {
  id: string;
  filename: string;
  totalPages: number;
  pages: string[];
  format: 'cbz' | 'cbr';
}

// In-memory cache for page extractions: fileId -> { manifest, cache: Map<pageIndex, { buffer, mimeType }> }
const comicCache = new Map<string, {
  manifest: ComicManifest;
  pageBuffers: Map<number, { buffer: Buffer; mimeType: string }>;
  lastAccessed: number;
}>();

// Clear cache if unused for > 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of comicCache.entries()) {
    if (now - entry.lastAccessed > 30 * 60 * 1000) {
      comicCache.delete(id);
    }
  }
}, 5 * 60 * 1000);

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.byteLength; ++i) {
    view[i] = buffer[buffer.byteOffset + i];
  }
  return ab;
}

export const comicService = {
  async getManifest(fileId: string, filePath: string, originalName: string): Promise<ComicManifest> {
    const existing = comicCache.get(fileId);
    if (existing) {
      existing.lastAccessed = Date.now();
      return existing.manifest;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('Arquivo de HQ/Comic não encontrado no disco');
    }

    const ext = path.extname(originalName).toLowerCase();
    const fileBuffer = fs.readFileSync(filePath);

    let pages: string[] = [];
    let format: 'cbz' | 'cbr' = ext === '.cbr' ? 'cbr' : 'cbz';

    // Try as ZIP first (many CBRs are actually ZIPs with .cbr extension)
    try {
      const zip = await JSZip.loadAsync(fileBuffer);
      const zipPages: string[] = [];

      zip.forEach((relativePath, file) => {
        if (!file.dir && !relativePath.startsWith('__MACOSX')) {
          const fileExt = path.extname(relativePath).toLowerCase();
          if (IMAGE_EXTENSIONS.has(fileExt)) {
            zipPages.push(relativePath);
          }
        }
      });

      if (zipPages.length > 0) {
        pages = zipPages.sort(naturalCompare);
        format = 'cbz';
      }
    } catch (zipErr) {
      // Not a valid ZIP, proceed to try RAR
    }

    // If not ZIP or 0 pages found, try RAR via node-unrar-js
    if (pages.length === 0) {
      try {
        const arrayBuf = toArrayBuffer(fileBuffer);
        const extractor = await createExtractorFromData({ data: arrayBuf });
        const list = extractor.getFileList();
        const rarPages: string[] = [];

        for (const header of list.fileHeaders) {
          if (!header.flags.directory && !header.name.startsWith('__MACOSX')) {
            const fileExt = path.extname(header.name).toLowerCase();
            if (IMAGE_EXTENSIONS.has(fileExt)) {
              rarPages.push(header.name);
            }
          }
        }

        if (rarPages.length > 0) {
          pages = rarPages.sort(naturalCompare);
          format = 'cbr';
        }
      } catch (rarErr) {
        console.error('Error extracting RAR comic:', rarErr);
      }
    }

    if (pages.length === 0) {
      throw new Error('Nenhuma página de imagem encontrada dentro deste arquivo de HQ/CBR.');
    }

    const manifest: ComicManifest = {
      id: fileId,
      filename: originalName,
      totalPages: pages.length,
      pages,
      format
    };

    comicCache.set(fileId, {
      manifest,
      pageBuffers: new Map(),
      lastAccessed: Date.now()
    });

    return manifest;
  },

  async getPage(fileId: string, filePath: string, originalName: string, pageIndex: number): Promise<{ buffer: Buffer; mimeType: string }> {
    let cacheEntry = comicCache.get(fileId);
    if (!cacheEntry) {
      await this.getManifest(fileId, filePath, originalName);
      cacheEntry = comicCache.get(fileId);
    }

    if (!cacheEntry) {
      throw new Error('Falha ao inicializar HQ');
    }

    cacheEntry.lastAccessed = Date.now();

    if (pageIndex < 0 || pageIndex >= cacheEntry.manifest.totalPages) {
      throw new Error(`Página ${pageIndex} fora do intervalo (1 a ${cacheEntry.manifest.totalPages})`);
    }

    const cachedPage = cacheEntry.pageBuffers.get(pageIndex);
    if (cachedPage) {
      return cachedPage;
    }

    const pagePath = cacheEntry.manifest.pages[pageIndex];
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(pagePath).toLowerCase();
    
    let mimeType = 'image/jpeg';
    if (fileExt === '.png') mimeType = 'image/png';
    else if (fileExt === '.webp') mimeType = 'image/webp';
    else if (fileExt === '.gif') mimeType = 'image/gif';
    else if (fileExt === '.avif') mimeType = 'image/avif';

    let pageBuffer: Buffer | null = null;

    if (cacheEntry.manifest.format === 'cbz') {
      const zip = await JSZip.loadAsync(fileBuffer);
      const zipEntry = zip.file(pagePath);
      if (!zipEntry) throw new Error(`Página ${pagePath} não encontrada no arquivo ZIP`);
      pageBuffer = await zipEntry.async('nodebuffer');
    } else {
      const arrayBuf = toArrayBuffer(fileBuffer);
      const extractor = await createExtractorFromData({ data: arrayBuf });
      const extracted = extractor.extract({ files: [pagePath] });
      const fileData = [...extracted.files][0];
      if (!fileData || !fileData.extraction) {
        throw new Error(`Página ${pagePath} não encontrada no arquivo RAR`);
      }
      pageBuffer = Buffer.from(fileData.extraction);
    }

    const result = { buffer: pageBuffer, mimeType };
    cacheEntry.pageBuffers.set(pageIndex, result);
    return result;
  }
};
