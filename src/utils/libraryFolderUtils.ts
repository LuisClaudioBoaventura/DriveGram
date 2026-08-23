import { FolderItem } from '../types/index.js';

export type LibraryType = 'courses' | 'books' | 'comics' | 'videos' | 'personal-videos' | 'series' | 'podcasts' | 'adult';

export interface LibraryFolderConfig {
  type: LibraryType;
  displayName: string;
  folderName: string;
  folderNameAliases: string[];
  defaultColor: string;
  emoji: string;
  accentColor: string;
}

export const LIBRARY_FOLDERS_CONFIG: Record<LibraryType, LibraryFolderConfig> = {
  courses: {
    type: 'courses',
    displayName: 'Cursos & Estudos',
    folderName: 'Cursos e Treinamentos',
    folderNameAliases: ['cursos e treinamentos', 'cursos & treinamentos', 'cursos e estudos', 'cursos & estudos', 'treinamentos', 'cursos'],
    defaultColor: '#1a73e8',
    emoji: '🎓',
    accentColor: 'indigo'
  },
  books: {
    type: 'books',
    displayName: 'Livros e Audiolivros',
    folderName: 'Livros e Audiolivros',
    folderNameAliases: ['livros e audiolivros', 'livros & audiolivros', 'livros', 'audiolivros', 'ebooks'],
    defaultColor: '#9333ea',
    emoji: '📚',
    accentColor: 'purple'
  },
  comics: {
    type: 'comics',
    displayName: 'HQs e Mangás',
    folderName: "HQ's",
    folderNameAliases: ["hq's", 'hqs', 'hqs e mangás', 'hqs & mangas', 'quadrinhos', 'mangás', 'mangas'],
    defaultColor: '#ec4899',
    emoji: '💥',
    accentColor: 'pink'
  },
  videos: {
    type: 'videos',
    displayName: 'Filmes & Cinema',
    folderName: 'Filmes',
    folderNameAliases: ['filmes', 'filme', 'cinema', 'movies', 'filmes e cinema', 'filmes & cinema', 'longas', 'filmes e videos', 'filmes e vídeos', 'filmes & videos', 'filmes & vídeos'],
    defaultColor: '#ef4444',
    emoji: '🎬',
    accentColor: 'red'
  },
  'personal-videos': {
    type: 'personal-videos',
    displayName: 'Vídeos e Mídias Pessoais',
    folderName: 'Vídeos e Mídias Pessoais',
    folderNameAliases: [
      'videos e midias pessoais',
      'vídeos e mídias pessoais',
      'videos e midias',
      'vídeos e mídias',
      'midias pessoais',
      'mídias pessoais',
      'videos pessoais',
      'vídeos pessoais',
      'gravacoes',
      'gravações',
      'home videos',
      'familia',
      'família',
      'pessoal'
    ],
    defaultColor: '#f59e0b',
    emoji: '📹',
    accentColor: 'amber'
  },
  series: {
    type: 'series',
    displayName: 'Séries e Animes',
    folderName: 'Séries e Animes',
    folderNameAliases: ['séries e animes', 'series e animes', 'séries & animes', 'series & animes', 'séries', 'series', 'animes'],
    defaultColor: '#8b5cf6',
    emoji: '📺',
    accentColor: 'purple'
  },
  podcasts: {
    type: 'podcasts',
    displayName: 'Musicas e Podcasts',
    folderName: 'Musicas e Podcasts',
    folderNameAliases: ['musicas e podcasts', 'músicas e podcasts', 'musicas & podcasts', 'músicas & podcasts', 'musicas', 'músicas', 'podcasts', 'albuns', 'álbuns'],
    defaultColor: '#10b981',
    emoji: '🎧',
    accentColor: 'emerald'
  },
  adult: {
    type: 'adult',
    displayName: 'Red Locker',
    folderName: 'Red Locker',
    folderNameAliases: ['red locker', 'redlocker'],
    defaultColor: '#e11d48',
    emoji: '🔒',
    accentColor: 'rose'
  }
};

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^[^\w\s]+|\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function matchesFolderExact(folderName: string, config: LibraryFolderConfig): boolean {
  const norm = normalizeText(folderName);
  const expectedNorm = normalizeText(config.folderName);
  if (norm === expectedNorm) return true;

  for (const alias of config.folderNameAliases) {
    if (norm === normalizeText(alias)) return true;
  }
  return false;
}

function matchesFolderFuzzy(folderName: string, config: LibraryFolderConfig): boolean {
  const norm = normalizeText(folderName);
  for (const alias of config.folderNameAliases) {
    const aliasNorm = normalizeText(alias);
    if (norm.startsWith(aliasNorm + ' ') || norm.endsWith(' ' + aliasNorm) || norm.includes(' ' + aliasNorm + ' ')) {
      return true;
    }
  }
  return false;
}

/**
 * Finds the designated root folder for a given library type among all folders in Drive.
 */
export function findLibraryRootFolder(libraryType: LibraryType, allFolders: FolderItem[]): FolderItem | null {
  const config = LIBRARY_FOLDERS_CONFIG[libraryType];
  if (!config) return null;

  const nonTrashFolders = allFolders.filter(f => !f.isTrash);

  // 1. Exact match among top-level folders first (parentId === null)
  for (const f of nonTrashFolders) {
    if (f.parentId === null && matchesFolderExact(f.name, config)) {
      return f;
    }
  }

  // 2. Exact match anywhere in folder tree
  for (const f of nonTrashFolders) {
    if (matchesFolderExact(f.name, config)) {
      return f;
    }
  }

  // 3. Fuzzy/alias match among top-level folders
  for (const f of nonTrashFolders) {
    if (f.parentId === null && matchesFolderFuzzy(f.name, config)) {
      return f;
    }
  }

  // 4. Fuzzy/alias match anywhere
  for (const f of nonTrashFolders) {
    if (matchesFolderFuzzy(f.name, config)) {
      return f;
    }
  }

  return null;
}

/**
 * Returns all direct subfolders (1st level) that belong to the library's root folder.
 * If no subfolders exist yet inside the root folder, includes the root folder itself.
 */
export function getLibraryEligibleFolders(
  libraryType: LibraryType,
  allFolders: FolderItem[]
): { rootFolder: FolderItem | null; folders: FolderItem[]; config: LibraryFolderConfig } {
  const config = LIBRARY_FOLDERS_CONFIG[libraryType];
  const rootFolder = findLibraryRootFolder(libraryType, allFolders);

  if (!rootFolder) {
    // If root folder is not yet found, return non-trash top-level folders
    return {
      rootFolder: null,
      folders: allFolders.filter(f => !f.isTrash && f.parentId === null),
      config
    };
  }

  const nonTrashFolders = allFolders.filter(f => !f.isTrash);
  
  // Direct children only (1st level subfolders directly inside the library root folder)
  const directChildFolders = nonTrashFolders.filter(f => f.parentId === rootFolder.id);

  // If there are direct subfolders, return them; otherwise, allow selecting the rootFolder itself
  const resultFolders = directChildFolders.length > 0 ? directChildFolders : [rootFolder];

  return {
    rootFolder,
    folders: resultFolders,
    config
  };
}

/**
 * Checks if a given folder is strictly the Red Locker root folder or any folder nested inside it.
 */
export function isRedLockerFolder(folderId: string | null, allFolders: FolderItem[]): boolean {
  if (!folderId) return false;
  const redLockerRoot = findLibraryRootFolder('adult', allFolders);
  if (!redLockerRoot) return false;
  if (folderId === redLockerRoot.id) return true;

  // Traverse upwards through parentIds to check if redLockerRoot is an ancestor
  let currentId: string | null = folderId;
  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    if (currentId === redLockerRoot.id) return true;
    const currentFolder = allFolders.find(f => f.id === currentId);
    currentId = currentFolder ? currentFolder.parentId : null;
  }

  return false;
}
