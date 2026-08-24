export type FileType = 'video' | 'audio' | 'image' | 'pdf' | 'comic' | 'ebook' | 'document' | 'archive' | 'code' | 'subtitle' | 'other';

export interface TelegramMetadata {
  messageId?: number;
  chatId?: string | number;
  fileSize: number;
  mimeType: string;
  telegramFileName?: string;
  uploadDate: string;
  isUploadedToTelegram: boolean;
}

export interface VideoTimestamp {
  id: string;
  seconds: number;
  timeFormatted: string; // e.g. "02:35"
  label: string;
}

export interface VideoSubtitle {
  id: string;
  label: string;
  srclang: string;
  fileId?: string; // drive item id for .vtt or .srt
  url?: string; // Direct data URL or stream URL
}

export interface DriveItem {
  id: string;
  name: string;
  description?: string;
  isFolder: boolean;
  parentId: string | null; // null means root
  size: number;
  updatedAt: string;
  createdAt: string;
  type: FileType;
  extension: string;
  mimeType: string;
  isFavorite?: boolean;
  isTrash?: boolean;
  deletedAt?: string;
  cachedAt?: string;
  telegramMeta?: TelegramMetadata;
  tags?: string[];
  thumbnailUrl?: string;
  subtitles?: VideoSubtitle[];
  timestamps?: VideoTimestamp[];
  // Course association if item is part of a course
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  color?: string;
  isFavorite?: boolean;
  isTrash?: boolean;
  deletedAt?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration?: string; // e.g. "12:45"
  fileId?: string; // Associated drive video file ID
  telegramMessageId?: number;
  order: number;
  isCompleted: boolean;
  lastPositionSeconds?: number;
  timestamps?: VideoTimestamp[];
  subtitles?: VideoSubtitle[];
  materials?: {
    id: string;
    name: string;
    fileId?: string;
    type: 'pdf' | 'link' | 'code' | 'file';
    url?: string;
  }[];
  notes?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface BookChapter {
  id: string;
  title: string;
  duration?: string;
  fileId?: string;
  order: number;
  isCompleted?: boolean;
  lastPositionSeconds?: number;
  timestamps?: VideoTimestamp[];
  notes?: string;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  narrationType?: 'Humana' | 'Artificial' | string;
  narrator?: string;
  version?: string; // 'Estúdio de áudio', 'Storytel', 'Audible', etc.
  totalDuration?: string; // Tempo total do áudio
  saga?: string; // 'N/A' ou número/nome dentro da saga (ex: '#1', 'Livro 2')
  fileSizeFormatted?: string; // Tamanho do arquivo (ex: '450 MB')
  category?: string;
  genre?: string; // Gênero (ex: Ficção, Desenvolvimento Pessoal, Fantasia, Negócios)
  language?: string; // Idioma (ex: Português, Inglês, Espanhol)
  description?: string;
  coverImage?: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  format?: 'audiobook' | 'ebook' | 'bundle';
  ebookFileId?: string;
  chapters: BookChapter[];
  isCompleted?: boolean;
  lastPlayedChapterId?: string;
  lastPositionSeconds?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  folderId?: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  modules: CourseModule[];
  lastPlayedLessonId?: string;
  lastPositionSeconds?: number;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  size: number;
  transferred: number;
  progress: number; // 0 to 100
  speed: string;
  status: 'uploading' | 'completed' | 'error' | 'paused';
  stage?: 'local' | 'cloud' | 'completed' | 'error';
  stageLabel?: string;
  eta?: string;
  error?: string;
  targetFolderId: string | null;
}

export type StreamingMode = 'cloud_direct' | 'temp_cache' | 'local_cache';

export interface CacheDurationConfig {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  totalMinutes: number;
}

export interface TelegramAuthState {
  isConnected: boolean;
  phone?: string;
  username?: string;
  firstName?: string;
  userId?: string;
  savedMessagesChatId?: string;
  totalSavedFiles?: number;
  lastSyncDate?: string;
  storageUsedBytes?: number;
  streamingMode?: StreamingMode;
  cacheDuration?: CacheDurationConfig;
  localCacheSizeBytes?: number;
}

export interface ComicIssue {
  id: string;
  title: string;
  issueNumber?: number | string;
  fileId?: string; // driveItem id for .cbr / .cbz / .pdf
  totalPages?: number;
  currentPage?: number;
  lastReadAt?: string;
  isCompleted?: boolean;
  order: number;
}

export interface ComicBook {
  id: string;
  title: string;
  publisher?: string; // Marvel, DC, Shueisha / Mangá, Panini, Image, Dark Horse, etc.
  author?: string; // Roteirista / Writer
  artist?: string; // Desenhista / Penciller
  coverImage?: string;
  description?: string;
  category?: string; // Super-heróis, Shonen, Seinen, Sci-Fi, Fantasia, etc.
  genre?: string;
  folderId?: string; // drive folder
  issues: ComicIssue[];
  status?: 'reading' | 'completed' | 'plan_to_read';
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------- FILMES & VÍDEOS ----------------
export interface MovieVideo {
  id: string;
  title: string;
  titlePt?: string; // Título em Português / Nome de exibição opcional
  description?: string;
  duration?: string; // Ex: "1h 45m" ou "45:00"
  durationSeconds?: number;
  resolution?: string; // Ex: "1080p", "4K", "720p"
  category?: string; // Filmes, Documentários, Clipes, Palestras, etc.
  genre?: string; // Ação, Sci-Fi, Drama, Comédia, etc.
  year?: string | number;
  director?: string;
  coverImage?: string;
  fileId?: string; // driveItem id
  folderId?: string; // drive folder
  timestamps?: VideoTimestamp[];
  subtitles?: VideoSubtitle[];
  lastPositionSeconds?: number;
  isCompleted?: boolean;
  rating?: number; // 1 to 5
  createdAt: string;
  updatedAt: string;
  // OMDb / IMDb Metadata
  imdbId?: string;
  imdbRating?: string;
  actors?: string;
  rated?: string;
  runtime?: string;
  awards?: string;
  writer?: string;
  metascore?: string;
  country?: string;
}

export interface OMDbSearchResultItem {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

export interface OMDbMovieDetail {
  Title: string;
  Year: string;
  Rated?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Writer?: string;
  Actors?: string;
  Plot?: string;
  Language?: string;
  Country?: string;
  Awards?: string;
  Poster?: string;
  Ratings?: Array<{ Source: string; Value: string }>;
  Metascore?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID: string;
  Type?: string;
  Response: string;
  Error?: string;
}

// ---------------- VÍDEOS & MÍDIAS PESSOAIS ----------------
export interface PersonalVideo {
  id: string;
  title: string;
  description?: string;
  date?: string; // Data da gravação (ex: "2024-05-12" ou "Maio 2024")
  location?: string; // Local/Cidade (ex: "Gramado, RS")
  people?: string; // Pessoas no vídeo (ex: "Família, Amigos")
  category?: string; // Viagens, Família & Eventos, Aniversários, Memórias, Gravações, Vlogs, Outros
  tags?: string[];
  duration?: string;
  durationSeconds?: number;
  resolution?: string;
  coverImage?: string;
  fileId?: string; // driveItem id
  folderId?: string; // drive folder
  timestamps?: VideoTimestamp[];
  subtitles?: VideoSubtitle[];
  lastPositionSeconds?: number;
  isCompleted?: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------- SÉRIES & TV SHOWS ----------------
export interface SeriesEpisode {
  id: string;
  title: string;
  episodeNumber: number;
  seasonNumber: number;
  duration?: string;
  fileId?: string; // driveItem id
  isCompleted?: boolean;
  lastPositionSeconds?: number;
  description?: string;
  timestamps?: VideoTimestamp[];
  subtitles?: VideoSubtitle[];
}

export interface SeriesSeason {
  id: string;
  title: string;
  seasonNumber: number;
  episodes: SeriesEpisode[];
}

export interface SeriesShow {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  bannerImage?: string;
  category?: string; // Animes, Séries TV, Minisséries, Web Séries, Doramas, etc.
  genre?: string;
  network?: string; // Netflix, HBO, Crunchyroll, etc.
  year?: string | number;
  status?: 'watching' | 'completed' | 'plan_to_watch';
  folderId?: string;
  seasons: SeriesSeason[];
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------- MÚSICAS & PODCASTS ----------------
export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: string;
  durationSeconds?: number;
  fileId?: string; // driveItem id
  audioUrl?: string; // direct online streaming URL for podcasts
  order: number;
  trackNumber?: number;
  isCompleted?: boolean;
  lastPositionSeconds?: number;
  timestamps?: VideoTimestamp[];
  notes?: string;
  releaseDate?: string; // Data de publicação do episódio (ex: "2026-08-20T10:00:00Z")
}

export interface AudioShow {
  id: string;
  title: string;
  artist?: string;
  host?: string;
  showType: 'music_album' | 'podcast' | 'playlist';
  description?: string;
  coverImage?: string;
  category?: string; // Rock, Pop, Tecnologia, Notícias, etc.
  genre?: string;
  folderId?: string;
  feedUrl?: string; // RSS Feed URL para sincronização automática
  podcastId?: string; // iTunes ID para busca e atualização
  lastSyncedAt?: string; // Data/Hora da última sincronização de episódios
  tracks: AudioTrack[];
  createdAt: string;
  updatedAt: string;
}

// ---------------- FILMES & CONTEÚDO ADULTO (+18) ----------------
export interface AdultVideo {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  category?: string; // Longas, Cenas, Clipes, VR, Amador, Estúdios, etc.
  studio?: string;
  performers?: string; // Nomes dos atores/atrizes
  aka?: string; // Nomes alternativos / Também conhecido como (AKA do performer ou produtora)
  year?: string | number;
  duration?: string;
  durationSeconds?: number;
  folderId?: string;
  fileId?: string;
  tags?: string[];
  isFavorite?: boolean;
  lastPositionSeconds?: number;
  isCompleted?: boolean;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdultPerformer {
  id: string;
  name: string;
  aka?: string; // Outros nomes conhecidos
  photoUrl?: string;
  bio?: string;
  gender?: 'female' | 'male' | 'trans' | 'other';
  nationality?: string;
  birthDate?: string;
  rating?: number;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdultVaultSettings {
  isConfigured: boolean;
  passwordHash?: string;
  recoveryQuestion?: string;
  recoveryAnswerHash?: string;
  hint?: string;
  autoLockMinutes?: number;
  updatedAt?: string;
}

export interface DriveGramSyncManifest {
  version: string;
  exportedAt: string;
  account?: {
    phone?: string;
    username?: string;
  };
  folders: FolderItem[];
  files: DriveItem[];
  courses?: Course[];
  books?: Book[];
  comics?: ComicBook[];
  videos?: MovieVideo[];
  series?: SeriesShow[];
  audioShows?: AudioShow[];
  adultVideos?: AdultVideo[];
  adultPerformers?: AdultPerformer[];
  adultVaultSettings?: AdultVaultSettings;
}
