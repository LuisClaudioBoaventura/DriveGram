import { useState, useEffect, useCallback } from 'react';
import { DriveItem, FolderItem, UploadProgress, FileType } from '../types/index.js';

export type ActiveTabType = 'drive' | 'courses' | 'books' | 'comics' | 'videos' | 'personal-videos' | 'series' | 'podcasts' | 'adult' | 'favorites' | 'trash';

export function useFileSystem() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [allFolders, setAllFolders] = useState<FolderItem[]>([]);
  const [allFiles, setAllFiles] = useState<DriveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<ActiveTabType>('drive');
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const fetchItems = useCallback(async () => {
    try {
      const [foldersRes, filesRes, allFoldersRes, allFilesRes] = await Promise.all([
        fetch(currentFolderId ? `/api/folders?parentId=${currentFolderId}` : '/api/folders'),
        fetch(currentFolderId ? `/api/files?parentId=${currentFolderId}` : '/api/files'),
        fetch('/api/folders?all=true'),
        fetch('/api/files?all=true')
      ]);

      if (foldersRes.ok && filesRes.ok) {
        setFolders(await foldersRes.json());
        setFiles(await filesRes.json());
      }
      if (allFoldersRes.ok && allFilesRes.ok) {
        setAllFolders(await allFoldersRes.json());
        setAllFiles(await allFilesRes.json());
      }
    } catch (e) {
      console.warn('Backend unavailable, using fallback client state');
    }
  }, [currentFolderId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Compute breadcrumb path
  const getBreadcrumbPath = useCallback(() => {
    const path: FolderItem[] = [];
    let currentId = currentFolderId;

    while (currentId) {
      const folder = allFolders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [currentFolderId, allFolders]);

  // Create folder
  const createFolder = async (name: string, color?: string, description?: string) => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: currentFolderId, color, description })
      });
      if (res.ok) {
        await fetchItems();
        return true;
      }
    } catch (e) {
      const newFolder: FolderItem = {
        id: 'folder-' + Date.now(),
        name,
        description,
        parentId: currentFolderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        color: color || '#1a73e8'
      };
      setFolders(prev => [...prev, newFolder]);
      setAllFolders(prev => [...prev, newFolder]);
      return true;
    }
    return false;
  };

  // Upload multiple files or folder contents
  const uploadFiles = async (
    fileList: FileList | File[] | { file: File; relativePath?: string }[],
    targetFolderId = currentFolderId
  ) => {
    const items = Array.from(fileList as any[]);

    for (const item of items) {
      const file: File = item instanceof File ? item : item.file || item;
      const relativePath: string = (item as any).relativePath || (file as any).webkitRelativePath || '';

      const uploadId = 'up-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
      
      const newUpload: UploadProgress = {
        id: uploadId,
        fileName: relativePath || file.name,
        size: file.size,
        transferred: 0,
        progress: 0,
        speed: 'Iniciando...',
        status: 'uploading',
        stage: 'local',
        stageLabel: '1/2 • Carregando arquivo...',
        targetFolderId
      };

      setUploads(prev => [newUpload, ...prev]);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadId', uploadId);
      if (targetFolderId) {
        formData.append('parentId', targetFolderId);
      }
      if (relativePath) {
        formData.append('relativePath', relativePath);
      }

      await new Promise<void>((resolve) => {
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();
        let pollTimer: any = null;

        const startCloudPolling = () => {
          if (pollTimer) return;
          pollTimer = setInterval(async () => {
            try {
              const res = await fetch(`/api/uploads/progress/${uploadId}`);
              if (res.ok) {
                const data = await res.json();
                if (data && data.progress !== undefined) {
                  setUploads(prev => prev.map(u => u.id === uploadId && u.status === 'uploading' ? {
                    ...u,
                    transferred: data.transferred !== undefined ? data.transferred : u.transferred,
                    progress: data.progress,
                    speed: data.speed || u.speed,
                    stage: data.stage || 'cloud',
                    stageLabel: data.stageLabel || '2/2 • Enviando para o Telegram Cloud...'
                  } : u));
                }
              }
            } catch (e) {}
          }, 200);
        };

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const transferred = event.loaded;
            const total = event.total || file.size;
            const isFinishedLocal = transferred >= total;
            const progress = isFinishedLocal ? 100 : Math.min(Math.round((transferred / total) * 100), 99);
            const elapsedSec = (Date.now() - startTime) / 1000;
            const speedMBs = elapsedSec > 0 ? ((transferred / (1024 * 1024)) / elapsedSec).toFixed(1) : '1.0';

            setUploads(prev => prev.map(u => u.id === uploadId && u.status === 'uploading' ? {
              ...u,
              transferred: isFinishedLocal ? 0 : transferred,
              size: total,
              progress: isFinishedLocal ? 0 : progress,
              speed: `${speedMBs} MB/s`,
              stage: isFinishedLocal ? 'cloud' : 'local',
              stageLabel: isFinishedLocal ? '2/2 • Conectando ao Telegram Cloud...' : '1/2 • Carregando arquivo local...'
            } : u));

            if (isFinishedLocal) {
              startCloudPolling();
            }
          }
        };

        xhr.onload = async () => {
          if (pollTimer) clearInterval(pollTimer);
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploads(prev => prev.map(u => u.id === uploadId ? {
              ...u,
              transferred: file.size,
              size: file.size,
              progress: 100,
              status: 'completed',
              stage: 'completed',
              stageLabel: 'Salvo com sucesso na nuvem',
              speed: 'Concluído'
            } : u));
            await fetchItems();
          } else {
            setUploads(prev => prev.map(u => u.id === uploadId ? {
              ...u,
              status: 'error',
              stage: 'error',
              stageLabel: 'Falha no envio',
              error: 'Erro no upload'
            } : u));
          }
          resolve();
        };

        xhr.onerror = () => {
          if (pollTimer) clearInterval(pollTimer);
          setUploads(prev => prev.map(u => u.id === uploadId ? {
            ...u,
            status: 'error',
            stage: 'error',
            stageLabel: 'Falha na conexão',
            error: 'Falha na conexão'
          } : u));
          resolve();
        };

        xhr.open('POST', '/api/files/upload', true);
        xhr.send(formData);
      });
    }
  };

  // Delete file or folder (permanent=true deletes permanently from Telegram & disk)
  const deleteItem = async (id: string, isFolder: boolean, permanent = false) => {
    try {
      const endpoint = isFolder ? `/api/folders/${id}?permanent=${permanent}` : `/api/files/${id}?permanent=${permanent}`;
      await fetch(endpoint, { method: 'DELETE' });
      await fetchItems();
    } catch (e) {
      if (isFolder) {
        setFolders(prev => prev.filter(f => f.id !== id));
        setAllFolders(prev => prev.filter(f => f.id !== id));
      } else {
        setFiles(prev => prev.filter(f => f.id !== id));
        setAllFiles(prev => prev.filter(f => f.id !== id));
      }
    }
  };

  // Restore item from trash
  const restoreItem = async (id: string, isFolder: boolean) => {
    try {
      await fetch(`/api/trash/restore/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFolder })
      });
      await fetchItems();
    } catch (e) {
      await fetchItems();
    }
  };

  // Empty entire trash permanently
  const emptyTrash = async () => {
    try {
      await fetch('/api/trash/empty', { method: 'POST' });
      await fetchItems();
    } catch (e) {
      await fetchItems();
    }
  };

  // Update item (name, description, tags, color)
  const updateItem = async (id: string, isFolder: boolean, updates: { name: string; description?: string; tags?: string[]; color?: string }) => {
    try {
      const endpoint = isFolder ? `/api/folders/${id}` : `/api/files/${id}`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      await fetchItems();
    } catch (e) {
      if (isFolder) {
        setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
        setAllFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      } else {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
        setAllFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      }
    }
  };

  // Helper to check if folder B is descendant of folder A
  const isDescendantFolder = (folderId: string, potentialAncestorId: string): boolean => {
    let curr = allFolders.find(f => f.id === folderId);
    while (curr) {
      if (curr.id === potentialAncestorId || curr.parentId === potentialAncestorId) {
        return true;
      }
      curr = allFolders.find(f => f.id === curr?.parentId);
    }
    return false;
  };

  // Move item (file or folder) to a target folder or root (null)
  const moveItem = async (id: string, isFolder: boolean, targetParentId: string | null): Promise<boolean> => {
    if (isFolder) {
      if (id === targetParentId) return false;
      if (targetParentId && isDescendantFolder(targetParentId, id)) {
        return false;
      }
      // Optimistic update
      setFolders(prev => prev.filter(f => f.id !== id));
      setAllFolders(prev => prev.map(f => f.id === id ? { ...f, parentId: targetParentId } : f));

      try {
        await fetch(`/api/folders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: targetParentId })
        });
        await fetchItems();
        return true;
      } catch (e) {
        return true;
      }
    } else {
      // Optimistic update
      setFiles(prev => prev.filter(f => f.id !== id));
      setAllFiles(prev => prev.map(f => f.id === id ? { ...f, parentId: targetParentId } : f));

      try {
        await fetch(`/api/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: targetParentId })
        });
        await fetchItems();
        return true;
      } catch (e) {
        return true;
      }
    }
  };

  // Toggle favorite
  const toggleFavorite = async (id: string, isFolder: boolean) => {
    if (isFolder) {
      const folder = allFolders.find(f => f.id === id);
      if (!folder) return;
      try {
        await fetch(`/api/folders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite: !folder.isFavorite })
        });
        await fetchItems();
      } catch (e) {
        setFolders(prev => prev.map(f => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
      }
    } else {
      const file = allFiles.find(f => f.id === id);
      if (!file) return;
      try {
        await fetch(`/api/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite: !file.isFavorite })
        });
        await fetchItems();
      } catch (e) {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
      }
    }
  };

  // Helper to test file type by type property or extension fallback
  const matchesFileType = useCallback((file: DriveItem, filter: FileType | 'all'): boolean => {
    if (filter === 'all') return true;
    if (file.type === filter) return true;

    const ext = file.extension ? file.extension.toLowerCase() : (file.name.split('.').pop()?.toLowerCase() || '');

    if (filter === 'video') return ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', 'ts', '3gp'].includes(ext);
    if (filter === 'comic') return ['cbr', 'cbz', 'cbt', 'cb7'].includes(ext);
    if (filter === 'ebook') return ['epub', 'mobi', 'azw', 'azw3', 'fb2'].includes(ext);
    if (filter === 'pdf') return ['pdf'].includes(ext);
    if (filter === 'document') return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'csv', 'md'].includes(ext);
    if (filter === 'image') return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(ext);
    if (filter === 'audio') return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus', 'm4b'].includes(ext);
    if (filter === 'archive') return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext);
    if (filter === 'code') return ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'sql', 'sh', 'bat', 'ps1'].includes(ext);
    if (filter === 'subtitle') return ['vtt', 'srt', 'ass', 'ssa', 'sub'].includes(ext);

    return false;
  }, []);

  // Helper to normalize accents and special characters
  const normalizeSearch = (text: string) => {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  const matchesSearch = useCallback((item: DriveItem | FolderItem, query: string): boolean => {
    if (!query || !query.trim()) return true;
    const cleanQ = normalizeSearch(query);

    if (normalizeSearch(item.name).includes(cleanQ)) return true;
    if (item.description && normalizeSearch(item.description).includes(cleanQ)) return true;

    // Tag and extension check for files
    if ('tags' in item && item.tags && item.tags.some(t => normalizeSearch(t).includes(cleanQ))) return true;
    if ('extension' in item && item.extension && normalizeSearch(item.extension).includes(cleanQ)) return true;

    return false;
  }, []);

  const isFilterActive = filterType !== 'all' || searchQuery.trim().length > 0;

  const resetFilters = useCallback(() => {
    setFilterType('all');
    setSearchQuery('');
  }, []);

  // Filtered and sorted files/folders
  let baseFoldersPool: FolderItem[] = [];
  if (activeTab === 'favorites') {
    baseFoldersPool = allFolders.filter(f => f.isFavorite && !f.isTrash);
  } else if (activeTab === 'trash') {
    baseFoldersPool = allFolders.filter(f => f.isTrash);
  } else if (isFilterActive) {
    if (filterType !== 'all') {
      // When a specific file type is selected, focus on displaying the files directly
      baseFoldersPool = [];
    } else {
      // Searching by name: search folders across whole drive (if in root) or in current subtree
      baseFoldersPool = (currentFolderId === null 
        ? allFolders 
        : allFolders.filter(f => f.id === currentFolderId || isDescendantFolder(f.id, currentFolderId))
      ).filter(f => !f.isTrash);
    }
  } else {
    baseFoldersPool = folders.filter(f => !f.isTrash);
  }

  const displayedFolders = baseFoldersPool
    .filter(f => matchesSearch(f, searchQuery))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return sortOrder === 'asc'
        ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  let baseFilesPool: DriveItem[] = [];
  if (activeTab === 'favorites') {
    baseFilesPool = allFiles.filter(f => f.isFavorite && !f.isTrash);
  } else if (activeTab === 'trash') {
    baseFilesPool = allFiles.filter(f => f.isTrash);
  } else if (isFilterActive) {
    // Search/filter recursively across the entire drive if at root, or inside current subtree
    baseFilesPool = (currentFolderId === null
      ? allFiles
      : allFiles.filter(f => f.parentId === currentFolderId || (f.parentId && isDescendantFolder(f.parentId, currentFolderId)))
    ).filter(f => !f.isTrash);
  } else {
    baseFilesPool = files.filter(f => !f.isTrash);
  }

  const displayedFiles = baseFilesPool
    .filter(f => matchesSearch(f, searchQuery) && matchesFileType(f, filterType))
    .sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortBy === 'size') {
        return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
      }
      if (sortBy === 'type') {
        return sortOrder === 'asc' ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
      }
      return sortOrder === 'asc' 
        ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const [retryingFileIds, setRetryingFileIds] = useState<string[]>([]);
  const pendingFilesList = allFiles.filter(f => !f.isTrash && (!f.telegramMeta?.isUploadedToTelegram || !f.telegramMeta?.messageId));
  const pendingUploadsCount = pendingFilesList.length;
  const pendingUploadsBytes = pendingFilesList.reduce((acc, f) => acc + (f.size || 0), 0);

  const retryUploadToTelegram = async (fileId: string) => {
    const targetFile = allFiles.find(f => f.id === fileId);
    const uploadId = `retry-${fileId}`;

    setRetryingFileIds(prev => Array.from(new Set([...prev, fileId])));

    if (targetFile) {
      const newUpload: UploadProgress = {
        id: uploadId,
        fileName: targetFile.name,
        size: targetFile.size,
        transferred: 0,
        progress: 15,
        speed: 'Conectando ao Telegram...',
        status: 'uploading',
        stage: 'cloud',
        stageLabel: 'Enviando para o Telegram Cloud...',
        targetFolderId: targetFile.parentId || null
      };
      setUploads(prev => [newUpload, ...prev.filter(u => u.id !== uploadId)]);
    }

    let pollTimer: any = setInterval(async () => {
      try {
        const res = await fetch(`/api/uploads/progress/${uploadId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.progress !== undefined) {
            setUploads(prev => prev.map(u => u.id === uploadId && u.status === 'uploading' ? {
              ...u,
              transferred: data.transferred !== undefined ? data.transferred : u.transferred,
              progress: data.progress,
              speed: data.speed || u.speed,
              stage: data.stage || 'cloud',
              stageLabel: data.stageLabel || 'Enviando para o Telegram Cloud...'
            } : u));
          }
        }
      } catch (e) {}
    }, 250);

    try {
      const res = await fetch(`/api/telegram/retry-file/${fileId}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId })
      });
      const data = await res.json();
      clearInterval(pollTimer);
      if (data.success) {
        setUploads(prev => prev.map(u => u.id === uploadId ? {
          ...u,
          progress: 100,
          status: 'completed',
          stage: 'completed',
          stageLabel: 'Salvo com sucesso no Telegram',
          speed: 'Concluído'
        } : u));
      } else {
        setUploads(prev => prev.map(u => u.id === uploadId ? {
          ...u,
          status: 'error',
          stage: 'error',
          stageLabel: 'Falha no envio',
          error: data.error || 'Erro no envio'
        } : u));
      }
      await fetchItems();
      return data;
    } catch (e: any) {
      clearInterval(pollTimer);
      setUploads(prev => prev.map(u => u.id === uploadId ? {
        ...u,
        status: 'error',
        stage: 'error',
        stageLabel: 'Falha no envio',
        error: e.message || 'Erro no envio'
      } : u));
      return { success: false, error: e.message || 'Erro ao reenviar arquivo para o Telegram' };
    } finally {
      setRetryingFileIds(prev => prev.filter(id => id !== fileId));
    }
  };

  const syncAllPendingToTelegram = async () => {
    const pendingIds = allFiles.filter(f => !f.isTrash && (!f.telegramMeta?.isUploadedToTelegram || !f.telegramMeta?.messageId)).map(f => f.id);
    setRetryingFileIds(prev => Array.from(new Set([...prev, ...pendingIds])));
    try {
      const res = await fetch('/api/telegram/sync-pending', { method: 'POST' });
      const data = await res.json();
      await fetchItems();
      return data;
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao sincronizar arquivos pendentes' };
    } finally {
      setRetryingFileIds(prev => prev.filter(id => !pendingIds.includes(id)));
    }
  };

  return {
    currentFolderId,
    setCurrentFolderId,
    folders: displayedFolders,
    files: displayedFiles,
    allFolders,
    allFiles,
    pendingUploadsCount,
    pendingUploadsBytes,
    retryingFileIds,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    isFilterActive,
    resetFilters,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    activeTab,
    setActiveTab,
    uploads,
    setUploads,
    selectedItemIds,
    setSelectedItemIds,
    getBreadcrumbPath,
    createFolder,
    uploadFiles,
    retryUploadToTelegram,
    syncAllPendingToTelegram,
    deleteItem,
    restoreItem,
    emptyTrash,
    updateItem,
    moveItem,
    isDescendantFolder,
    toggleFavorite,
    refresh: fetchItems
  };
}
