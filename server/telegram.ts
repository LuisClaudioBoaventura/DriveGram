import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import bigInt from 'big-integer';
import QRCode from 'qrcode';
import { TelegramAuthState, DriveGramSyncManifest } from '../src/types/index.js';
import { db } from './database.js';

const toBigInt = (v: any) => {
  const fn = typeof bigInt === 'function' ? bigInt : (bigInt as any).default;
  return fn(v);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default public credentials for Telegram Desktop/Web if user doesn't specify
const DEFAULT_API_ID = process.env.TELEGRAM_API_ID ? parseInt(process.env.TELEGRAM_API_ID, 10) : 2040;
const DEFAULT_API_HASH = process.env.TELEGRAM_API_HASH || 'b18441a1ff607e10a989891a5462e627';

class TelegramService {
  private client: TelegramClient | null = null;
  private authClient: TelegramClient | null = null;
  private apiId: number = DEFAULT_API_ID;
  private apiHash: string = DEFAULT_API_HASH;
  private stringSession: StringSession = new StringSession('');
  private authState: TelegramAuthState = {
    isConnected: false,
    savedMessagesChatId: 'me',
    totalSavedFiles: 0,
    storageUsedBytes: 0
  };
  private phoneCodeHash: string = '';
  private currentPhone: string = '';

  // QR Code State
  private qrTokenUrl: string = '';
  private qrDataUrl: string = '';
  private qrStatus: 'idle' | 'waiting_scan' | 'scanned' | 'confirmed' | 'error' = 'idle';
  private qrError: string = '';

  constructor() {
    // Check if session was previously stored
    const settings = db.getData().settings;
    if (settings.telegramSession) {
      this.apiId = settings.telegramApiId ? parseInt(settings.telegramApiId, 10) : DEFAULT_API_ID;
      this.apiHash = settings.telegramApiHash || DEFAULT_API_HASH;
      this.stringSession = new StringSession(settings.telegramSession);
      this.initClient().catch(err => {
        console.warn('Could not auto-restore Telegram session:', err.message);
      });
    }
  }

  public async ensureClient(): Promise<TelegramClient | null> {
    const settings = db.getData().settings;
    if (!settings.telegramSession) {
      this.authState.isConnected = false;
      return null;
    }

    // If client exists and is connected
    if (this.client && this.client.connected) {
      return this.client;
    }

    // If client exists but disconnected, try connecting
    if (this.client) {
      try {
        await this.client.connect();
        if (await this.client.isUserAuthorized()) {
          this.authState.isConnected = true;
          return this.client;
        }
      } catch (err: any) {
        console.warn('[DriveGram Telegram] Existing client reconnect failed, creating fresh instance...', err.message);
      }
    }

    // Recreate client from stored session
    try {
      this.apiId = settings.telegramApiId ? parseInt(settings.telegramApiId, 10) : DEFAULT_API_ID;
      this.apiHash = settings.telegramApiHash || DEFAULT_API_HASH;
      this.stringSession = new StringSession(settings.telegramSession);
      this.client = new TelegramClient(this.stringSession, this.apiId, this.apiHash, {
        connectionRetries: 5,
      });
      this.client.setLogLevel('none' as any);
      this.client.onError = async (err: any) => {
        if (err?.message === 'TIMEOUT' || err?.message?.includes('TIMEOUT')) return;
        console.warn('[DriveGram Telegram Client]', err?.message || err);
      };
      await this.client.connect();
      const isAuth = await this.client.isUserAuthorized();
      if (isAuth) {
        const me = await this.client.getMe() as any;
        this.authState = {
          isConnected: true,
          phone: me.phone,
          username: me.username,
          firstName: me.firstName,
          userId: me.id ? me.id.toString() : 'me',
          savedMessagesChatId: 'me',
          lastSyncDate: new Date().toISOString(),
          totalSavedFiles: db.getAllFiles().length,
          storageUsedBytes: db.getAllFiles().reduce((acc, f) => acc + (f.size || 0), 0)
        };
        return this.client;
      } else {
        console.warn('[DriveGram Telegram] Session is not authorized.');
        this.authState.isConnected = false;
        return null;
      }
    } catch (err: any) {
      console.error('[DriveGram Telegram] Failed to connect Telegram client:', err.message);
      this.authState.isConnected = false;
      return null;
    }
  }

  private async initClient(): Promise<boolean> {
    try {
      if (!this.apiId || !this.apiHash) return false;
      this.client = new TelegramClient(this.stringSession, this.apiId, this.apiHash, {
        connectionRetries: 5,
      });
      this.client.setLogLevel('none' as any);
      this.client.onError = async (err: any) => {
        if (err?.message === 'TIMEOUT' || err?.message?.includes('TIMEOUT')) return;
        console.warn('[DriveGram Telegram Client]', err?.message || err);
      };
      await this.client.connect();
      
      const isAuth = await this.client.isUserAuthorized();
      if (isAuth) {
        const me = await this.client.getMe() as any;
        this.authState = {
          isConnected: true,
          phone: me.phone,
          username: me.username,
          firstName: me.firstName,
          userId: me.id ? me.id.toString() : 'me',
          savedMessagesChatId: 'me',
          lastSyncDate: new Date().toISOString(),
          totalSavedFiles: db.getAllFiles().length,
          storageUsedBytes: db.getAllFiles().reduce((acc, f) => acc + (f.size || 0), 0)
        };

        // If local database has fewer items or files, try auto-restoring from Telegram Saved Messages
        if (db.getAllFiles().length <= 3) {
          this.restoreMetadataFromTelegram().catch(() => {});
        }

        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Telegram client init error:', e);
      return false;
    }
  }

  public getAuthState(): TelegramAuthState {
    const totalFiles = db.getAllFiles();
    const uploadsDir = path.join(path.dirname(__filename), '..', 'uploads');
    return {
      ...this.authState,
      totalSavedFiles: totalFiles.length,
      storageUsedBytes: totalFiles.reduce((acc, f) => acc + (f.size || 0), 0),
      streamingMode: db.getStreamingMode(),
      cacheDuration: db.getCacheDuration(),
      localCacheSizeBytes: db.getLocalCacheSizeBytes(uploadsDir),
      metadataRetentionCount: db.getMetadataRetentionCount()
    };
  }

  // ---------------- QR CODE LOGIN ----------------
  public async startQrLogin(customApiId?: number, customApiHash?: string, password?: string): Promise<{ success: boolean; qrDataUrl?: string; qrLink?: string; message?: string }> {
    try {
      const loginApiId = customApiId || this.apiId || DEFAULT_API_ID;
      const loginApiHash = customApiHash || this.apiHash || DEFAULT_API_HASH;
      this.qrStatus = 'waiting_scan';
      this.qrError = '';

      if (this.authClient) {
        try { await this.authClient.disconnect(); } catch (_) {}
      }

      const tempSession = new StringSession('');
      this.authClient = new TelegramClient(tempSession, loginApiId, loginApiHash, {
        connectionRetries: 5,
      });
      this.authClient.setLogLevel('none' as any);
      this.authClient.onError = async (err: any) => {
        if (err?.message === 'TIMEOUT' || err?.message?.includes('TIMEOUT')) return;
        console.warn('[DriveGram Telegram QR Auth]', err?.message || err);
      };
      await this.authClient.connect();

      // Launch signInUserWithQrCode in background promise
      const qrPromise = new Promise<{ success: boolean; qrDataUrl: string; qrLink: string }>((resolve, reject) => {
        this.authClient!.signInUserWithQrCode(
          {
            apiId: loginApiId,
            apiHash: loginApiHash,
          },
          {
            qrCode: async (code) => {
              const base64Url = Buffer.from(code.token).toString('base64url');
              const tgUrl = `tg://login?token=${base64Url}`;
              this.qrTokenUrl = tgUrl;

              // Generate QR Code PNG Base64 Data URL
              const qrImage = await QRCode.toDataURL(tgUrl, {
                width: 300,
                margin: 2,
                color: {
                  dark: '#1e1f20',
                  light: '#ffffff'
                }
              });

              this.qrDataUrl = qrImage;
              resolve({
                success: true,
                qrDataUrl: qrImage,
                qrLink: tgUrl
              });
            },
            password: async () => password || '',
            onError: (err) => {
              console.error('QR Login error:', err);
              this.qrStatus = 'error';
              this.qrError = err.message;
              reject(err);
            }
          }
        ).then(async (_user: any) => {
          this.qrStatus = 'confirmed';
          const sessionString = this.authClient!.session.save() as unknown as string;
          const me = await this.authClient!.getMe() as any;

          db.updateSettings({
            telegramApiId: loginApiId.toString(),
            telegramApiHash: loginApiHash,
            telegramSession: sessionString
          });

          this.client = this.authClient;
          this.authClient = null;
          this.stringSession = new StringSession(sessionString);
          this.apiId = loginApiId;
          this.apiHash = loginApiHash;

          this.authState = {
            isConnected: true,
            phone: me.phone,
            username: me.username,
            firstName: me.firstName,
            userId: me.id ? me.id.toString() : 'me',
            savedMessagesChatId: 'me',
            lastSyncDate: new Date().toISOString()
          };
        }).catch((err) => {
          this.qrStatus = 'error';
          this.qrError = err.message;
        });
      });

      const initialQr = await qrPromise;
      return initialQr;
    } catch (e: any) {
      this.qrStatus = 'error';
      this.qrError = e.message;
      return { success: false, message: e.message || 'Erro ao inicializar QR Code' };
    }
  }

  public getQrStatus(): { status: string; qrDataUrl: string; qrLink: string; isConnected: boolean; error?: string } {
    return {
      status: this.qrStatus,
      qrDataUrl: this.qrDataUrl,
      qrLink: this.qrTokenUrl,
      isConnected: this.authState.isConnected,
      error: this.qrError
    };
  }

  // ---------------- PHONE CODE LOGIN ----------------
  public async sendAuthCode(apiId: number, apiHash: string, phone: string): Promise<{ success: boolean; message: string; phoneCodeHash?: string }> {
    try {
      this.apiId = apiId || DEFAULT_API_ID;
      this.apiHash = apiHash || DEFAULT_API_HASH;
      this.currentPhone = phone;
      
      if (this.authClient) {
        try { await this.authClient.disconnect(); } catch (_) {}
      }

      const tempSession = new StringSession('');
      this.authClient = new TelegramClient(tempSession, this.apiId, this.apiHash, {
        connectionRetries: 3,
      });
      this.authClient.setLogLevel('none' as any);
      this.authClient.onError = async (err: any) => {
        if (err?.message === 'TIMEOUT' || err?.message?.includes('TIMEOUT')) return;
        console.warn('[DriveGram Telegram Phone Auth]', err?.message || err);
      };
      await this.authClient.connect();

      const result = await this.authClient.sendCode(
        {
          apiId: this.apiId,
          apiHash: this.apiHash,
        },
        phone
      );

      this.phoneCodeHash = result.phoneCodeHash;
      return { success: true, message: 'Código SMS/Telegram enviado com sucesso!', phoneCodeHash: result.phoneCodeHash };
    } catch (e: any) {
      console.error('Telegram sendCode error:', e);
      return { success: false, message: e.message || 'Erro ao enviar código de autenticação' };
    }
  }

  public async signInWithCode(code: string, password?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.authClient || !this.phoneCodeHash) {
        return { success: false, message: 'Solicitação de código expirada ou cliente não iniciado' };
      }

      await (this.authClient as any).signInUser(
        {
          apiId: this.apiId,
          apiHash: this.apiHash,
        },
        {
          phoneNumber: this.currentPhone,
          phoneCodeHash: this.phoneCodeHash,
          phoneCode: async () => code,
          password: async () => password || '',
          onError: (err: any) => console.error('Sign in error:', err),
        }
      );

      const sessionString = this.authClient.session.save() as unknown as string;
      const me = await this.authClient.getMe() as any;

      db.updateSettings({
        telegramApiId: this.apiId.toString(),
        telegramApiHash: this.apiHash,
        telegramSession: sessionString
      });

      this.client = this.authClient;
      this.authClient = null;
      this.stringSession = new StringSession(sessionString);

      this.authState = {
        isConnected: true,
        phone: me.phone,
        username: me.username,
        firstName: me.firstName,
        userId: me.id ? me.id.toString() : 'me',
        savedMessagesChatId: 'me',
        lastSyncDate: new Date().toISOString()
      };

      return { success: true, message: 'Conectado com sucesso ao Telegram!' };
    } catch (e: any) {
      console.error('Telegram signIn error:', e);
      return { success: false, message: e.message || 'Erro ao autenticar com o código fornecido' };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (e) {}
    }
    if (this.authClient) {
      try {
        await this.authClient.disconnect();
      } catch (e) {}
    }
    this.client = null;
    this.authClient = null;
    this.qrStatus = 'idle';
    this.qrDataUrl = '';
    this.qrTokenUrl = '';
    this.authState = {
      isConnected: false,
      savedMessagesChatId: 'me',
      totalSavedFiles: 0,
      storageUsedBytes: 0
    };
    db.updateSettings({
      telegramSession: undefined
    });
  }

  /**
   * Upload file directly to Telegram Saved Messages
   */
  public async uploadToSavedMessages(
    filePath: string,
    fileName: string,
    caption: string,
    onProgress?: (percent: number) => void
  ): Promise<{ messageId?: number; success: boolean; error?: string }> {
    const settings = db.getData().settings;
    if (!settings.telegramSession) {
      // In demo mode or if offline, simulate smooth real-time progress
      if (onProgress) {
        for (let pct = 15; pct <= 95; pct += 20) {
          await new Promise(r => setTimeout(r, 150));
          onProgress(pct);
        }
        await new Promise(r => setTimeout(r, 100));
        onProgress(100);
      }
      return { messageId: Math.floor(Math.random() * 90000) + 1000, success: true };
    }

    let client = await this.ensureClient();
    if (!client) {
      return { success: false, error: 'Telegram não conectado ou sessão indisponível.' };
    }

    const doUpload = async (c: TelegramClient) => {
      return await c.sendFile('me', {
        file: filePath,
        caption: caption,
        progressCallback: (p: any) => {
          if (onProgress && typeof p === 'number') {
            onProgress(Math.min(Math.round(p * 100), 99));
          }
        }
      });
    };

    try {
      const message = await doUpload(client);
      if (onProgress) {
        onProgress(100);
      }
      return {
        messageId: message.id,
        success: true
      };
    } catch (e: any) {
      console.warn('[DriveGram Telegram] Upload encountered error:', e.message);

      // Auto-recover once if connection dropped, auth key desynchronized, or timeout
      if (
        e.message?.includes('AUTH_KEY') ||
        e.message?.includes('401') ||
        e.message?.includes('TIMEOUT') ||
        e.message?.includes('disconnected') ||
        e.message?.includes('connection')
      ) {
        try {
          console.log('[DriveGram Telegram] Rebuilding client and retrying upload...');
          this.client = null;
          client = await this.ensureClient();
          if (client) {
            const retryMessage = await doUpload(client);
            if (onProgress) onProgress(100);
            return { messageId: retryMessage.id, success: true };
          }
        } catch (retryErr: any) {
          console.error('[DriveGram Telegram] Retry upload also failed:', retryErr.message);
          if (retryErr.message?.includes('AUTH_KEY_UNREGISTERED')) {
            this.authState.isConnected = false;
            db.updateSettings({ telegramSession: undefined });
            return {
              success: false,
              error: 'Sessão do Telegram revogada ou expirada. Por favor, conecte o Telegram novamente.'
            };
          }
          return { success: false, error: retryErr.message || 'Erro ao enviar para o Telegram' };
        }
      }

      return { success: false, error: e.message || 'Erro ao enviar para o Telegram' };
    }
  }

  /**
   * Sync and backup DriveGram metadata manifest to Telegram Saved Messages
   */
  public async syncMetadataToTelegram(): Promise<{ success: boolean; message: string; messageId?: number }> {
    const manifest = db.exportManifest();
    const manifestJson = JSON.stringify(manifest, null, 2);
    const courseCount = manifest.courses ? manifest.courses.length : 0;
    const bookCount = manifest.books ? manifest.books.length : 0;
    const caption = `📁 #drivegram_metadata_sync\n📅 Atualizado em: ${new Date().toLocaleString('pt-BR')}\nPastas: ${manifest.folders.length} | Arquivos: ${manifest.files.length} | Cursos: ${courseCount} | Livros: ${bookCount}`;

    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) {
      db.updateSettings({ lastSyncDate: new Date().toISOString() });
      return { success: true, message: 'Metadados salvos localmente e preparados para envio em nuvem (Conecte o Telegram para backup automático nas Mensagens Salvas).' };
    }

    try {
      const buffer = Buffer.from(manifestJson, 'utf-8');
      (buffer as any).name = 'drivegram_metadata.json';

      const sent = await client.sendFile('me', {
        file: buffer,
        caption: caption,
      });

      db.updateSettings({ lastSyncDate: new Date().toISOString() });

      // Auto-pruning de metadados antigos para manter o chat de Mensagens Salvas limpo
      this.pruneOldMetadataMessages().catch(err => {
        console.warn('[DriveGram Pruning] Erro no auto-pruning em segundo plano:', err?.message || err);
      });

      return { success: true, message: 'Metadados sincronizados e salvos com sucesso no seu Telegram (Mensagens Salvas)!', messageId: sent.id };
    } catch (e: any) {
      console.error('Error syncing metadata to Telegram:', e);
      return { success: false, message: e.message || 'Falha ao sincronizar metadados no Telegram' };
    }
  }

  /**
   * Remove backups antigos de metadados das Mensagens Salvas, mantendo apenas os N mais recentes.
   */
  public async pruneOldMetadataMessages(keepCount?: number): Promise<{ success: boolean; deletedCount: number; message: string }> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) {
      return { success: false, deletedCount: 0, message: 'Telegram não conectado.' };
    }

    const maxKeep = Math.max(1, keepCount ?? db.getMetadataRetentionCount() ?? 1);

    try {
      const messages = await client.getMessages('me', {
        search: '#drivegram_metadata_sync',
        limit: 100
      });

      if (!messages || messages.length <= maxKeep) {
        return { 
          success: true, 
          deletedCount: 0, 
          message: `Nenhum backup excedente para remover (total de ${messages?.length || 0} encontrado(s), retenção configurada para ${maxKeep}).` 
        };
      }

      // Ordenar por ID decrescente (o mais recente primeiro)
      const sortedMessages = [...messages].sort((a, b) => b.id - a.id);
      const toDelete = sortedMessages.slice(maxKeep).map(m => m.id);

      if (toDelete.length > 0) {
        console.log(`[DriveGram Pruning] Removendo ${toDelete.length} mensagem(ns) antiga(s) de metadados das Mensagens Salvas...`);
        await client.deleteMessages('me', toDelete, { revoke: true });
        console.log(`[DriveGram Pruning] ${toDelete.length} mensagem(ns) antiga(s) de metadados removida(s) com sucesso.`);
      }

      return {
        success: true,
        deletedCount: toDelete.length,
        message: `${toDelete.length} mensagem(ns) antiga(s) de metadados removida(s) com sucesso das Mensagens Salvas!`
      };
    } catch (err: any) {
      console.warn('[DriveGram Pruning] Erro ao limpar mensagens antigas de metadados:', err?.message || err);
      return { success: false, deletedCount: 0, message: err?.message || 'Falha ao limpar mensagens antigas' };
    }
  }

  /**
   * Restore all metadata & course structure from Telegram Saved Messages
   */
  public async restoreMetadataFromTelegram(): Promise<{ success: boolean; message: string }> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) {
      return { success: false, message: 'Telegram não conectado para restauração em nuvem.' };
    }

    try {
      const messages = await client.getMessages('me', {
        search: '#drivegram_metadata_sync',
        limit: 5
      });

      if (!messages || messages.length === 0) {
        return { success: false, message: 'Nenhum manifesto de backup do DriveGram foi encontrado nas suas Mensagens Salvas.' };
      }

      const latestMsg = messages[0];
      const buffer = await client.downloadMedia(latestMsg) as Buffer;

      if (!buffer) {
        return { success: false, message: 'Não foi possível baixar o arquivo de metadados.' };
      }

      const manifestText = buffer.toString('utf-8');
      const manifest: DriveGramSyncManifest = JSON.parse(manifestText);
      db.importManifest(manifest);

      const courseCount = manifest.courses ? manifest.courses.length : 0;
      const bookCount = manifest.books ? manifest.books.length : 0;

      return { 
        success: true, 
        message: `Restaurado com sucesso! ${manifest.folders.length} pastas, ${manifest.files.length} arquivos, ${courseCount} cursos e ${bookCount} livros recuperados.` 
      };
    } catch (e: any) {
      console.error('Error restoring metadata:', e);
      return { success: false, message: e.message || 'Erro ao restaurar dados do Telegram' };
    }
  }

  /**
   * Processo ativo de sincronização de metadados na inicialização do aplicativo
   */
  public async performStartupMetadataSync(): Promise<{ success: boolean; message: string; details?: any }> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) {
      return { success: false, message: 'Telegram não conectado para sincronização ativa de inicialização.' };
    }

    try {
      console.log('[DriveGram Startup Sync] Verificando backups no Telegram (Mensagens Salvas)...');
      const messages = await client.getMessages('me', {
        search: '#drivegram_metadata_sync',
        limit: 3
      });

      if (!messages || messages.length === 0) {
        console.log('[DriveGram Startup Sync] Nenhum backup prévio encontrado. Enviando manifesto inicial...');
        const initialSync = await this.syncMetadataToTelegram();
        return {
          success: true,
          message: 'Manifesto inicial sincronizado com o Telegram com sucesso!',
          details: { initial: true, messageId: initialSync.messageId }
        };
      }

      const latestMsg = messages[0];
      const buffer = await client.downloadMedia(latestMsg) as Buffer;

      if (!buffer) {
        return { success: false, message: 'Falha ao baixar mensagem de metadados do Telegram.' };
      }

      const manifestText = buffer.toString('utf-8');
      const remoteManifest: DriveGramSyncManifest = JSON.parse(manifestText);

      const reconcileResult = db.reconcileManifest(remoteManifest);
      console.log(`[DriveGram Startup Sync] Reconciliação concluída: +${reconcileResult.addedFiles} arquivos, +${reconcileResult.addedFolders} pastas.`);

      // Se houver novos arquivos locais que não existiam na nuvem, atualiza o manifesto no Telegram
      if (reconcileResult.localHasNewerChanges) {
        console.log('[DriveGram Startup Sync] Dados locais possuem novos itens. Atualizando backup na nuvem...');
        await this.syncMetadataToTelegram();
      }

      return {
        success: true,
        message: `Sincronização ativa concluída com sucesso! (${reconcileResult.addedFiles} arquivos, ${reconcileResult.addedFolders} pastas integrados)`,
        details: reconcileResult
      };
    } catch (e: any) {
      console.error('[DriveGram Startup Sync] Erro durante a sincronização de inicialização:', e);
      return { success: false, message: e.message || 'Erro durante a sincronização de inicialização' };
    }
  }

  private inFlightDownloads = new Map<string, Promise<Buffer | null>>();
  private inFlightCallbacks = new Map<string, Set<(progressPct: number, transferred: number, total: number) => void>>();

  /**
   * Download media on demand directly to disk with real-time byte tracking.
   * Uses downloadFileV2 with the properly-typed InputDocumentFileLocation so
   * the GramJS internal iterator works without "Cannot cast" errors.
   */
  public async downloadMediaByMessageId(
    messageId: number,
    targetPath?: string,
    progressCallback?: (progressPct: number, transferred: number, total: number) => void,
    expectedTotalSize?: number
  ): Promise<Buffer | null> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) {
      throw new Error('Telegram desconectado. Verifique sua conexão com a internet.');
    }

    const lockKey = `${messageId}_${targetPath || 'mem'}`;

    if (progressCallback) {
      if (!this.inFlightCallbacks.has(lockKey)) {
        this.inFlightCallbacks.set(lockKey, new Set());
      }
      this.inFlightCallbacks.get(lockKey)!.add(progressCallback);
    }

    if (this.inFlightDownloads.has(lockKey)) {
      return this.inFlightDownloads.get(lockKey)!;
    }

    const downloadTask = (async (): Promise<Buffer | null> => {
      let tempPath: string | null = null;

      try {
        const messages = await this.client!.getMessages('me', { ids: [messageId] });
        if (!messages || messages.length === 0 || !messages[0].media) {
          throw new Error('Mensagem de mídia não encontrada no Telegram');
        }

        const msg = messages[0];
        const media = msg.media as any;

        // Helper to broadcast progress to all listeners for this download
        const notifyProgress = (trans: number, tot: number) => {
          const total = tot > 0 ? tot : (trans || 1);
          const pct = Math.min(99, Math.max(1, Math.round((trans / total) * 100)));
          const callbacks = this.inFlightCallbacks.get(lockKey);
          if (callbacks) {
            for (const cb of callbacks) {
              try { cb(pct, trans, total); } catch (_) {}
            }
          }
        };

        if (targetPath) {
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

          tempPath = `${targetPath}.${Date.now()}.downloading`;

          // Extract doc/photo info to build proper InputFileLocation
          const { Api } = await import('telegram');

          let fileLocation: any = null;
          let fileSize: number = expectedTotalSize || 0;

          if (media?.document || media?.className === 'MessageMediaDocument') {
            const doc = media.document || media;
            // Build proper InputDocumentFileLocation
            fileLocation = new Api.InputDocumentFileLocation({
              id: doc.id,
              accessHash: doc.accessHash,
              fileReference: doc.fileReference,
              thumbSize: ''
            });
            if (doc.size && fileSize === 0) {
              const sz = doc.size;
              fileSize = typeof sz === 'object' && sz?.toJSNumber ? sz.toJSNumber() : Number(sz?.toString() || 0);
            }
          } else if (media?.photo || media?.className === 'MessageMediaPhoto') {
            const photo = media.photo || media;
            const lastSize = (photo.sizes || []).at(-1);
            fileLocation = new Api.InputPhotoFileLocation({
              id: photo.id,
              accessHash: photo.accessHash,
              fileReference: photo.fileReference,
              thumbSize: lastSize?.type || 's'
            });
          }

          if (!fileLocation) {
            // Last resort: let downloadMedia handle it (writes to path, no per-chunk progress)
            await (this.client as any).downloadMedia(msg, { outputFile: tempPath });
            if (fs.existsSync(tempPath)) {
              const finalSize = fs.statSync(tempPath).size;
              if (finalSize > 0) {
                if (fs.existsSync(targetPath)) try { fs.unlinkSync(targetPath); } catch (_) {}
                fs.renameSync(tempPath, targetPath);
                const callbacks = this.inFlightCallbacks.get(lockKey);
                if (callbacks) for (const cb of callbacks) { try { cb(100, finalSize, finalSize); } catch (_) {} }
                return Buffer.from('');
              }
            }
            throw new Error('Arquivo baixado está vazio ou corrompido');
          }

          // Use downloadFileV2 which internally uses the iterator correctly
          // Write to a temp WriteStream and count bytes per chunk via progressCallback
          let transferred = 0;
          const bigIntLib = bigInt;

          await (this.client as any).downloadFile(
            fileLocation,
            {
              outputFile: tempPath,
              fileSize: fileSize > 0 ? bigIntLib(fileSize) : undefined,
              progressCallback: async (dl: any, total: any) => {
                try {
                  const t = typeof dl === 'object' && dl?.toJSNumber ? dl.toJSNumber() : Number(dl?.toString() || 0);
                  const tot = typeof total === 'object' && total?.toJSNumber ? total.toJSNumber() : Number(total?.toString() || 0);
                  if (t > 0) {
                    transferred = t;
                    notifyProgress(t, tot > 0 ? tot : fileSize);
                  }
                } catch (_) {}
              },
              dcId: media?.document?.dcId || media?.photo?.dcId || undefined
            }
          );

          if (fs.existsSync(tempPath)) {
            const finalSize = fs.statSync(tempPath).size;
            if (finalSize > 0) {
              if (fs.existsSync(targetPath)) try { fs.unlinkSync(targetPath); } catch (_) {}
              fs.renameSync(tempPath, targetPath);
              const callbacks = this.inFlightCallbacks.get(lockKey);
              if (callbacks) for (const cb of callbacks) { try { cb(100, finalSize, finalSize); } catch (_) {} }
              return Buffer.from('');
            }
          }
          throw new Error('Arquivo baixado está vazio ou corrompido');
        }

        // In-memory download (no targetPath)
        const buffer = await this.client!.downloadMedia(msg) as Buffer;
        return buffer || null;

      } catch (e: any) {
        console.error(`[Telegram Download] Error for messageId ${messageId}:`, e.message || e);
        if (tempPath && fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch (_) {}
        }
        throw e;
      }
    })();

    this.inFlightDownloads.set(lockKey, downloadTask);
    try {
      return await downloadTask;
    } finally {
      this.inFlightDownloads.delete(lockKey);
      this.inFlightCallbacks.delete(lockKey);
    }
  }

  /**
   * Delete message permanently from Telegram Saved Messages
   */
  public async deleteMessageFromTelegram(messageId: number): Promise<boolean> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) return false;

    try {
      await client.deleteMessages('me', [messageId], { revoke: true });
      console.log(`[DriveGram] Successfully deleted message ${messageId} from Telegram.`);
      return true;
    } catch (e: any) {
      console.error(`[DriveGram] Error deleting message ${messageId} from Telegram:`, e);
      return false;
    }
  }

  /**
   * Uploads an image buffer or file from URL as a Cover to Telegram Saved Messages
   */
  public async uploadCoverToTelegram(
    imageUrlOrBuffer: string | Buffer,
    title: string,
    tag: string = 'youtube_cover'
  ): Promise<{ messageId?: number; filePath?: string; success: boolean }> {
    const coversDir = path.join(path.dirname(__filename), '..', 'uploads', 'covers');
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
    }

    const cleanTitle = (title || 'capa').replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 50);
    const diskFileName = `cover_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.jpg`;
    const localFilePath = path.join(coversDir, diskFileName);

    let buffer: Buffer | null = null;

    if (Buffer.isBuffer(imageUrlOrBuffer)) {
      buffer = imageUrlOrBuffer;
    } else if (typeof imageUrlOrBuffer === 'string') {
      if (imageUrlOrBuffer.startsWith('data:image')) {
        const base64Data = imageUrlOrBuffer.split(',')[1];
        if (base64Data) buffer = Buffer.from(base64Data, 'base64');
      } else if (imageUrlOrBuffer.startsWith('http://') || imageUrlOrBuffer.startsWith('https://')) {
        try {
          const res = await fetch(imageUrlOrBuffer, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DriveGram/1.0'
            }
          });
          if (res.ok) {
            buffer = Buffer.from(await res.arrayBuffer());
          }
        } catch (e: any) {
          console.warn(`[DriveGram Telegram] Could not download cover from URL ${imageUrlOrBuffer}:`, e.message);
        }
      } else if (fs.existsSync(imageUrlOrBuffer)) {
        buffer = fs.readFileSync(imageUrlOrBuffer);
      }
    }

    if (!buffer || buffer.length === 0) {
      return { success: false };
    }

    // Save locally to cache directory
    fs.writeFileSync(localFilePath, buffer);

    // If connected to Telegram, send directly to Saved Messages
    const client = await this.ensureClient();
    if (client && this.authState.isConnected) {
      try {
        (buffer as any).name = `${diskFileName}`;
        const message = await client.sendFile('me', {
          file: buffer,
          caption: `🖼️ #drivegram_cover #${tag}\n📌 ${title}\n📅 ${new Date().toLocaleString('pt-BR')}`
        });

        // Also save indexed cache by messageId
        const tgCachedPath = path.join(coversDir, `cover_tg_${message.id}_${diskFileName}`);
        try {
          fs.copyFileSync(localFilePath, tgCachedPath);
        } catch (e) {}

        console.log(`[DriveGram Telegram] Successfully saved cover for "${title}" to Telegram (Message ID: ${message.id})`);
        return {
          messageId: message.id,
          filePath: diskFileName,
          success: true
        };
      } catch (tgErr: any) {
        console.error(`[DriveGram Telegram] Failed to upload cover to Telegram:`, tgErr);
      }
    }

    // Saved to local cache (pending or offline)
    return {
      filePath: diskFileName,
      success: true
    };
  }

  /**
   * Download media purely into memory buffer without creating/writing any file to disk
   */
  public async getMediaBufferInMemory(messageId: number): Promise<Buffer | null> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) return null;

    try {
      const messages = await client.getMessages('me', { ids: [messageId] });
      if (!messages || messages.length === 0 || !messages[0].media) {
        return null;
      }

      const buffer = await client.downloadMedia(messages[0]) as Buffer;
      return buffer || null;
    } catch (e: any) {
      console.error(`[DriveGram] Error fetching media in-memory for message ${messageId}:`, e);
      return null;
    }
  }

  /**
   * Direct cloud streaming from Telegram MTProto to HTTP response without disk writing
   */
  public async streamMediaDirect(
    messageId: number,
    start: number,
    end: number,
    fileSize: number,
    mimeType: string,
    res: any
  ): Promise<boolean> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) return false;

    try {
      const messages = await client.getMessages('me', { ids: [messageId] });
      if (!messages || messages.length === 0 || !messages[0].media) {
        return false;
      }

      const msg = messages[0];
      const media = msg.media as any;
      const contentLength = (end - start) + 1;

      // Build proper InputFileLocation from document or photo
      const { Api } = await import('telegram');
      let fileLocation: any = null;
      let dcId: number | undefined = undefined;

      if (media?.document || media?.className === 'MessageMediaDocument') {
        const doc = media.document || media;
        fileLocation = new Api.InputDocumentFileLocation({
          id: doc.id,
          accessHash: doc.accessHash,
          fileReference: doc.fileReference,
          thumbSize: ''
        });
        dcId = doc.dcId;
      } else if (media?.photo || media?.className === 'MessageMediaPhoto') {
        const photo = media.photo || media;
        const lastSize = (photo.sizes || []).at(-1);
        fileLocation = new Api.InputPhotoFileLocation({
          id: photo.id,
          accessHash: photo.accessHash,
          fileReference: photo.fileReference,
          thumbSize: lastSize?.type || 's'
        });
        dcId = photo.dcId;
      }

      if (!fileLocation) {
        return false;
      }

      // MTProto upload.getFile strictly requires offset to be aligned to 4096 (4 KB)
      const CHUNK_ALIGN = 4096;
      const alignedStart = Math.floor(start / CHUNK_ALIGN) * CHUNK_ALIGN;
      const skipPrefix = start - alignedStart;

      if (!res.headersSent) {
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize || contentLength}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': contentLength,
          'Content-Type': mimeType || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
          'Cache-Control': 'no-cache'
        });
      }

      try {
        const CHUNK_SIZE = 128 * 1024; // 128 KB chunks
        let currentOffset = alignedStart;
        let skipped = 0;
        let bytesSent = 0;
        let sender = dcId ? await client.getSender(dcId) : undefined;

        while (bytesSent < contentLength) {
          if (res.destroyed || (res as any).closed || res.writableEnded) break;

          let chunk: Buffer;
          try {
            const req = new Api.upload.GetFile({
              location: fileLocation,
              offset: toBigInt(currentOffset),
              limit: CHUNK_SIZE,
            });

            const result: any = sender
              ? await client.invokeWithSender(req, sender)
              : await client.invoke(req);

            if (!result || !result.bytes || result.bytes.length === 0) {
              break; // EOF
            }
            chunk = result.bytes;
          } catch (invokeErr: any) {
            if (invokeErr.errorMessage === 'FILEREF_UPGRADE_NEEDED' || invokeErr.name === 'FileMigrateError') {
              if (invokeErr.newDc) {
                sender = await client.getSender(invokeErr.newDc);
                continue;
              }
            }
            throw invokeErr;
          }

          currentOffset += chunk.length;

          let dataToSend = chunk;
          if (skipped < skipPrefix) {
            const needToSkip = skipPrefix - skipped;
            if (dataToSend.length <= needToSkip) {
              skipped += dataToSend.length;
              continue;
            } else {
              dataToSend = dataToSend.subarray(needToSkip);
              skipped = skipPrefix;
            }
          }

          const remaining = contentLength - bytesSent;
          if (remaining <= 0) break;
          const chunkToSend = dataToSend.length > remaining ? dataToSend.subarray(0, remaining) : dataToSend;

          res.write(chunkToSend);
          bytesSent += chunkToSend.length;

          if (chunk.length < CHUNK_SIZE) {
            break; // last chunk reached
          }
        }

        if (!res.writableEnded && !res.destroyed) res.end();
        return true;
      } catch (streamErr: any) {
        console.warn(`[DriveGram Direct Stream] error for msg ${messageId}:`, streamErr?.message);
        if (!res.writableEnded && !res.destroyed) try { res.end(); } catch (_) {}
        return false;
      }
    } catch (e: any) {
      console.error(`[DriveGram] Error in streamMediaDirect for message ${messageId}:`, e);
      if (!res.writableEnded && !res.destroyed) try { res.end(); } catch (_) {}
      return false;
    }
  }

  public async deleteMultipleMessagesFromTelegram(messageIds: number[]): Promise<boolean> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected || messageIds.length === 0) return false;

    try {
      await client.deleteMessages('me', messageIds, { revoke: true });
      console.log(`[DriveGram] Successfully deleted ${messageIds.length} messages from Telegram.`);
      return true;
    } catch (e: any) {
      console.error(`[DriveGram] Error deleting multiple messages from Telegram:`, e);
      return false;
    }
  }

  /**
   * Scan and import all existing media/files from Telegram Saved Messages into DriveGram
   */
  public async scanAndImportSavedMessages(limit = 200): Promise<{ success: boolean; importedCount: number; message: string }> {
    const client = await this.ensureClient();
    if (!client || !this.authState.isConnected) {
      return { success: false, importedCount: 0, message: 'Telegram não conectado para importação.' };
    }

    try {
      const messages = await client.getMessages('me', { limit });
      let importedCount = 0;

      const allFolders = db.getAllFolders();
      let importedFolder = allFolders.find(f => f.name === '📥 Importados do Telegram' && !f.isTrash);
      if (!importedFolder) {
        importedFolder = db.createFolder('📥 Importados do Telegram', null, '#0088cc');
      }

      const existingFiles = db.getAllFiles();
      const existingMessageIds = new Set(existingFiles.map(f => f.telegramMeta?.messageId).filter(Boolean));

      for (const msg of messages) {
        if (!msg.media || existingMessageIds.has(msg.id)) continue;

        let fileName = '';
        let fileSize = 0;
        let mimeType = 'application/octet-stream';

        if ((msg.media as any).document) {
          const doc = (msg.media as any).document;
          fileSize = Number(doc.size || 0);
          mimeType = doc.mimeType || 'application/octet-stream';
          const nameAttr = doc.attributes?.find((a: any) => a.fileName);
          fileName = nameAttr ? nameAttr.fileName : `documento_${msg.id}`;
        } else if ((msg.media as any).photo) {
          fileName = `foto_${msg.id}.jpg`;
          mimeType = 'image/jpeg';
          fileSize = 1024 * 500;
        } else {
          continue;
        }

        const ext = path.extname(fileName).toLowerCase().replace('.', '') || (mimeType.includes('video') ? 'mp4' : mimeType.includes('audio') ? 'mp3' : 'bin');
        let fileType: any = 'other';
        if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v'].includes(ext) || mimeType.includes('video')) fileType = 'video';
        else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext) || mimeType.includes('audio')) fileType = 'audio';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || mimeType.includes('image')) fileType = 'image';
        else if (['pdf'].includes(ext) || mimeType.includes('pdf')) fileType = 'pdf';
        else if (['cbr', 'cbz', 'cbt', 'cb7'].includes(ext)) fileType = 'comic';
        else if (['epub', 'mobi', 'azw', 'azw3'].includes(ext)) fileType = 'ebook';
        else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) fileType = 'archive';

        db.createFile({
          name: fileName,
          parentId: importedFolder.id,
          size: fileSize,
          mimeType: mimeType,
          extension: ext,
          type: fileType,
          telegramMeta: {
            messageId: msg.id,
            chatId: 'me',
            fileSize: fileSize,
            mimeType: mimeType,
            uploadDate: new Date(msg.date * 1000).toISOString(),
            isUploadedToTelegram: true
          }
        });

        existingMessageIds.add(msg.id);
        importedCount++;
      }

      return {
        success: true,
        importedCount,
        message: importedCount > 0 
          ? `${importedCount} arquivo(s) importados com sucesso para a pasta "📥 Importados do Telegram"!` 
          : 'Nenhum novo arquivo encontrado para importar nas Mensagens Salvas.'
      };
    } catch (e: any) {
      console.error('Error scanning saved messages:', e);
      return { success: false, importedCount: 0, message: e.message || 'Erro ao escanear mensagens salvas' };
    }
  }
}

export const telegramService = new TelegramService();
