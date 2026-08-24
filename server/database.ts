import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { 
  DriveItem, 
  FolderItem, 
  Course, 
  CourseModule, 
  Lesson, 
  Book, 
  BookChapter, 
  ComicBook, 
  ComicIssue, 
  MovieVideo,
  PersonalVideo,
  SeriesShow,
  SeriesSeason,
  SeriesEpisode,
  AudioShow,
  AudioTrack,
  AdultVideo,
  AdultPerformer,
  AdultVaultSettings,
  VideoSubtitle, 
  DriveGramSyncManifest, 
  StreamingMode, 
  CacheDurationConfig 
} from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'drivegram_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface DatabaseSchema {
  folders: FolderItem[];
  files: DriveItem[];
  courses: Course[];
  books: Book[];
  bookCategories: string[];
  comics: ComicBook[];
  comicCategories: string[];
  videos: MovieVideo[];
  videoCategories: string[];
  personalVideos: PersonalVideo[];
  personalVideoCategories: string[];
  series: SeriesShow[];
  seriesCategories: string[];
  audioShows: AudioShow[];
  audioCategories: string[];
  adultVideos: AdultVideo[];
  adultPerformers: AdultPerformer[];
  adultCategories: string[];
  adultVaultSettings: AdultVaultSettings;
  settings: {
    theme: 'dark' | 'light';
    autoSyncTelegram: boolean;
    streamingMode: StreamingMode;
    cacheDuration?: CacheDurationConfig;
    telegramApiId?: string;
    telegramApiHash?: string;
    telegramSession?: string;
    lastSyncDate?: string;
  };
}

const initialDemoData: DatabaseSchema = {
  folders: [
    {
      id: 'folder-cursos',
      name: '🎓 Cursos e Treinamentos',
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#1a73e8'
    },
    {
      id: 'folder-fullstack',
      name: 'Curso Fullstack Master',
      parentId: 'folder-cursos',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#34a853'
    },
    {
      id: 'folder-livros',
      name: '📚 Livros & Audiolivros',
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#9333ea'
    },
    {
      id: 'folder-habitos-atomicos',
      name: 'Hábitos Atômicos (Audiobook + Livro)',
      parentId: 'folder-livros',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#8b5cf6'
    },
    {
      id: 'folder-documentos',
      name: '📄 Documentos & Textos',
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#fbbc04'
    }
  ],
  files: [
    {
      id: 'file-demo-video-1',
      name: '01 - Introdução e Configuração do Ambiente.mp4',
      isFolder: false,
      parentId: 'folder-fullstack',
      size: 48500000,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      type: 'video',
      extension: 'mp4',
      mimeType: 'video/mp4',
      isFavorite: true,
      telegramMeta: {
        messageId: 1042,
        chatId: 'me',
        fileSize: 48500000,
        mimeType: 'video/mp4',
        telegramFileName: '01_intro_fullstack.mp4',
        uploadDate: new Date().toISOString(),
        isUploadedToTelegram: true
      },
      timestamps: [
        { id: 'ts-1', seconds: 0, timeFormatted: '00:00', label: 'Introdução ao Treinamento' },
        { id: 'ts-2', seconds: 180, timeFormatted: '03:00', label: 'Instalação do Node.js e Editor' }
      ],
      subtitles: [
        { id: 'sub-1', label: 'Português (BR)', srclang: 'pt', url: 'data:text/vtt;charset=utf-8,WEBVTT%0A%0A1%0A00:00:01.000%20--%3E%2000:00:05.000%0ABem-vindos%20ao%20DriveGram%20Cloud!' }
      ],
      tags: ['curso', 'programação', 'aula-01']
    },
    {
      id: 'file-demo-audio-1',
      name: '01 - O Surpreendente Poder dos Hábitos Atômicos.mp3',
      isFolder: false,
      parentId: 'folder-habitos-atomicos',
      size: 18500000,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      type: 'audio',
      extension: 'mp3',
      mimeType: 'audio/mpeg',
      isFavorite: true,
      telegramMeta: {
        messageId: 1045,
        chatId: 'me',
        fileSize: 18500000,
        mimeType: 'audio/mpeg',
        telegramFileName: 'habitos_cap01.mp3',
        uploadDate: new Date().toISOString(),
        isUploadedToTelegram: true
      },
      timestamps: [
        { id: 'ts-a1', seconds: 0, timeFormatted: '00:00', label: 'A regra do 1% ao dia' },
        { id: 'ts-a2', seconds: 240, timeFormatted: '04:00', label: 'O platô do potencial latente' }
      ]
    },
    {
      id: 'file-demo-audio-2',
      name: '02 - Como seus hábitos moldam sua identidade.mp3',
      isFolder: false,
      parentId: 'folder-habitos-atomicos',
      size: 22100000,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      type: 'audio',
      extension: 'mp3',
      mimeType: 'audio/mpeg',
      telegramMeta: {
        messageId: 1046,
        chatId: 'me',
        fileSize: 22100000,
        mimeType: 'audio/mpeg',
        telegramFileName: 'habitos_cap02.mp3',
        uploadDate: new Date().toISOString(),
        isUploadedToTelegram: true
      }
    },
    {
      id: 'file-demo-ebook-1',
      name: 'Hábitos Atômicos - James Clear.pdf',
      isFolder: false,
      parentId: 'folder-habitos-atomicos',
      size: 12400000,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      type: 'pdf',
      extension: 'pdf',
      mimeType: 'application/pdf',
      isFavorite: true,
      telegramMeta: {
        messageId: 1047,
        chatId: 'me',
        fileSize: 12400000,
        mimeType: 'application/pdf',
        telegramFileName: 'habitos_atomicos_livro.pdf',
        uploadDate: new Date().toISOString(),
        isUploadedToTelegram: true
      }
    }
  ],
  courses: [
    {
      id: 'course-fullstack',
      title: 'Fullstack Master: Do Zero ao Avançado',
      description: 'Curso completo de desenvolvimento moderno com React, Node, Cloud e APIs de alta escala.',
      folderId: 'folder-fullstack',
      coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'Desenvolvimento Web',
      modules: [
        {
          id: 'mod-1',
          title: 'Módulo 1: Fundamentos & Arquitetura',
          order: 1,
          lessons: [
            {
              id: 'lesson-1',
              title: '01 - Introdução e Configuração do Ambiente',
              duration: '14:20',
              fileId: 'file-demo-video-1',
              order: 1,
              isCompleted: true,
              lastPositionSeconds: 120,
              timestamps: [
                { id: 'ts-1', seconds: 0, timeFormatted: '00:00', label: 'Introdução ao Treinamento' },
                { id: 'ts-2', seconds: 180, timeFormatted: '03:00', label: 'Instalação do Node.js e Editor' }
              ]
            }
          ]
        }
      ]
    }
  ],
  books: [
    {
      id: 'book-habitos-atomicos',
      title: 'Hábitos Atômicos',
      author: 'James Clear',
      narrator: 'Carlos Silveira',
      description: 'Um método fácil e comprovado de construir bons hábitos e se livrar dos maus.',
      folderId: 'folder-habitos-atomicos',
      coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'Desenvolvimento Pessoal',
      format: 'bundle',
      ebookFileId: 'file-demo-ebook-1',
      chapters: [
        {
          id: 'chap-1',
          title: '01 - O Surpreendente Poder dos Hábitos Atômicos',
          duration: '32:15',
          fileId: 'file-demo-audio-1',
          order: 1,
          isCompleted: true,
          lastPositionSeconds: 180,
          timestamps: [
            { id: 'ts-a1', seconds: 0, timeFormatted: '00:00', label: 'A regra do 1% ao dia' },
            { id: 'ts-a2', seconds: 240, timeFormatted: '04:00', label: 'O platô do potencial latente' }
          ],
          notes: 'Melhorar 1% a cada dia gera uma evolução de 37 vezes ao final de um ano.'
        },
        {
          id: 'chap-2',
          title: '02 - Como seus hábitos moldam sua identidade',
          duration: '28:40',
          fileId: 'file-demo-audio-2',
          order: 2,
          isCompleted: false,
          lastPositionSeconds: 0
        }
      ]
    }
  ],
  bookCategories: [
    'Desenvolvimento Pessoal',
    'Negócios & Carreira',
    'Ficção & Literatura',
    'Finanças & Investimentos',
    'Produtividade',
    'Tecnologia & Ciência',
    'Psicologia & Mente',
    'Biografia & História',
    'Fantasia & Sci-Fi'
  ],
  comics: [],
  comicCategories: [
    'Super-Heróis',
    'Mangá (Shonen)',
    'Mangá (Seinen)',
    'Graphic Novels',
    'Ficção Científica',
    'Fantasia & Aventura',
    'Terror & Suspense',
    'Quadrinhos Clássicos',
    'Indie & Autoral'
  ],
  videos: [],
  videoCategories: [
    'Filmes',
    'Documentários',
    'Ação & Aventura',
    'Ficção Científica',
    'Comédia',
    'Drama & Suspense',
    'Palestras & Workshops',
    'Vídeos Curtos & Clipes',
    'Outros'
  ],
  personalVideos: [],
  personalVideoCategories: [
    'Viagens',
    'Família & Eventos',
    'Aniversários & Festas',
    'Memórias & Momentos',
    'Gravações & Projetos',
    'Vlogs & Dia a Dia',
    'Outros'
  ],
  series: [],
  seriesCategories: [
    'Séries de TV',
    'Animes',
    'Minisséries',
    'Doramas & K-Dramas',
    'Desenhos & Animações',
    'Reality Shows',
    'Web Séries',
    'Clássicos'
  ],
  audioShows: [],
  audioCategories: [
    'Podcasts',
    'Álbuns de Música',
    'Entrevistas',
    'Tecnologia & Inovação',
    'Negócios & Carreira',
    'Notícias & Atualidades',
    'Comédia & Variedades',
    'Playlists & Sets'
  ],
  adultVideos: [],
  adultPerformers: [],
  adultCategories: [
    'Longas-Metragens',
    'Cenas & Clipes',
    'Estúdios',
    'Amador & Autoral',
    'VR & 360°',
    'Paródias',
    'Clássicos',
    'Outros'
  ],
  adultVaultSettings: {
    isConfigured: false
  },
  settings: {
    theme: 'dark',
    autoSyncTelegram: true,
    streamingMode: 'cloud_direct',
    cacheDuration: {
      value: 24,
      unit: 'hours',
      totalMinutes: 1440
    },
    lastSyncDate: new Date().toISOString()
  }
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    this.ensureDefaultLibraryFolders();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.books) parsed.books = initialDemoData.books;
        if (!parsed.bookCategories || parsed.bookCategories.length === 0) {
          parsed.bookCategories = [
            'Desenvolvimento Pessoal',
            'Negócios & Carreira',
            'Ficção & Literatura',
            'Finanças & Investimentos',
            'Produtividade',
            'Tecnologia & Ciência',
            'Psicologia & Mente',
            'Biografia & História',
            'Fantasia & Sci-Fi'
          ];
        }
        if (!parsed.comics) parsed.comics = [];
        if (!parsed.comicCategories || parsed.comicCategories.length === 0) {
          parsed.comicCategories = [
            'Super-Heróis',
            'Mangá (Shonen)',
            'Mangá (Seinen)',
            'Graphic Novels',
            'Ficção Científica',
            'Fantasia & Aventura',
            'Terror & Suspense',
            'Quadrinhos Clássicos',
            'Indie & Autoral'
          ];
        }
        if (!parsed.videos) parsed.videos = [];
        if (!parsed.videoCategories || parsed.videoCategories.length === 0) {
          parsed.videoCategories = initialDemoData.videoCategories;
        }
        if (!parsed.personalVideos) parsed.personalVideos = [];
        if (!parsed.personalVideoCategories || parsed.personalVideoCategories.length === 0) {
          parsed.personalVideoCategories = initialDemoData.personalVideoCategories;
        }
        if (!parsed.series) parsed.series = [];
        if (!parsed.seriesCategories || parsed.seriesCategories.length === 0) {
          parsed.seriesCategories = initialDemoData.seriesCategories;
        }
        if (!parsed.audioShows) parsed.audioShows = [];
        if (!parsed.audioCategories || parsed.audioCategories.length === 0) {
          parsed.audioCategories = initialDemoData.audioCategories;
        }
        if (!parsed.adultVideos) parsed.adultVideos = [];
        if (!parsed.adultPerformers) parsed.adultPerformers = [];
        if (!parsed.adultCategories || parsed.adultCategories.length === 0) {
          parsed.adultCategories = initialDemoData.adultCategories;
        }
        if (!parsed.adultVaultSettings) {
          parsed.adultVaultSettings = { isConfigured: false };
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading database, initializing with default data:', e);
    }
    this.save(initialDemoData);
    return initialDemoData;
  }

  public ensureDefaultLibraryFolders(): void {
    const requiredFolders = [
      { name: 'Cursos e Treinamentos', color: '#1a73e8', aliases: ['cursos e treinamentos', 'cursos & treinamentos', 'cursos e estudos', 'cursos & estudos', 'treinamentos', 'cursos'] },
      { name: 'Livros e Audiolivros', color: '#9333ea', aliases: ['livros e audiolivros', 'livros & audiolivros', 'livros', 'audiolivros', 'ebooks'] },
      { name: "HQ's", color: '#ec4899', aliases: ["hq's", 'hqs', 'hqs e mangás', 'hqs & mangas', 'quadrinhos', 'mangás', 'mangas'] },
      { name: 'Filmes', color: '#ef4444', aliases: ['filmes', 'filme', 'cinema', 'movies', 'filmes e cinema', 'filmes & cinema', 'longas', 'filmes e videos', 'filmes e vídeos'] },
      { name: 'Vídeos e Mídias Pessoais', color: '#f59e0b', aliases: ['videos e midias pessoais', 'vídeos e mídias pessoais', 'videos e midias', 'vídeos e mídias', 'midias pessoais', 'mídias pessoais', 'videos pessoais', 'vídeos pessoais', 'gravacoes', 'gravações', 'home videos', 'familia', 'família', 'pessoal'] },
      { name: 'Séries e Animes', color: '#8b5cf6', aliases: ['séries e animes', 'series e animes', 'séries & animes', 'series & animes', 'séries', 'series', 'animes'] },
      { name: 'Musicas e Podcasts', color: '#10b981', aliases: ['musicas e podcasts', 'músicas e podcasts', 'musicas & podcasts', 'músicas & podcasts', 'músicas', 'musicas', 'podcasts', 'albuns', 'álbuns'] },
      { name: 'Red Locker', color: '#e11d48', aliases: ['red locker', 'redlocker'] }
    ];

    let modified = false;
    for (const req of requiredFolders) {
      const exists = this.data.folders.some(f => {
        if (f.isTrash) return false;
        const normalized = f.name.toLowerCase().replace(/^[^\w\s]+|\s+/g, ' ').trim();
        return req.aliases.some(alias => normalized === alias.toLowerCase() || normalized.includes(alias.toLowerCase()));
      });

      if (!exists) {
        const id = 'folder-lib-' + req.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        this.data.folders.push({
          id: id,
          name: req.name,
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          color: req.color
        });
        modified = true;
      }
    }

    if (modified) {
      this.save(this.data);
    }
  }

  private save(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  // ---------------- AUTO-SYNC COURSES & SUBTITLES ----------------
  public syncCoursesWithFolderStructure() {
    const courses = this.data.courses || [];
    const folders = this.data.folders.filter(f => !f.isTrash);
    const files = this.data.files.filter(f => !f.isTrash);

    const videoFiles = files.filter(f => f.type === 'video');
    const subtitleFiles = files.filter(f => f.type === 'subtitle');

    for (let video of videoFiles) {
      const folderSubtitles = subtitleFiles.filter(s => s.parentId === video.parentId);
      if (folderSubtitles.length > 0) {
        const videoBaseName = video.name.replace(/\.[^/.]+$/, "").toLowerCase();
        const matchingSub = folderSubtitles.find(s => {
          const subBaseName = s.name.replace(/\.[^/.]+$/, "").toLowerCase();
          return subBaseName === videoBaseName || subBaseName.startsWith(videoBaseName) || folderSubtitles.length === 1;
        });

        if (matchingSub) {
          const subUrl = `/api/stream/${matchingSub.id}`;
          const existingSubs = video.subtitles || [];
          if (!existingSubs.some(s => s.fileId === matchingSub.id || s.url === subUrl)) {
            video.subtitles = [
              ...existingSubs,
              {
                id: 'sub-' + matchingSub.id,
                label: matchingSub.name.replace(/\.[^/.]+$/, ""),
                srclang: 'pt',
                fileId: matchingSub.id,
                url: subUrl
              }
            ];
          }
        }
      }
    }

    for (let course of courses) {
      if (!course.folderId) continue;
      
      const rootFolder = folders.find(f => f.id === course.folderId);
      if (!rootFolder) continue;

      const existingModules = course.modules || [];

      // 1. First, make sure every module in course.modules has a corresponding subfolder in this.data.folders
      for (const mod of existingModules) {
        let matchingFolder = folders.find(f => f.id === mod.id || (f.parentId === course.folderId && f.name === mod.title && !f.isTrash));
        if (!matchingFolder) {
          // Auto-create the subfolder in origin folder!
          const newSubfolder: FolderItem = {
            id: mod.id.startsWith('folder-') ? mod.id : `folder-${mod.id}`,
            name: mod.title,
            parentId: course.folderId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            color: '#6366f1'
          };
          this.data.folders.push(newSubfolder);
          folders.push(newSubfolder);
          mod.id = newSubfolder.id;
        } else {
          // Synchronize folder id
          mod.id = matchingFolder.id;
          // Synchronize folder title if changed
          if (matchingFolder.name !== mod.title) {
            matchingFolder.name = mod.title;
            matchingFolder.updatedAt = new Date().toISOString();
          }
        }
      }

      // 2. Fetch all subfolders (now including any newly created module subfolders)
      const subfolders = folders.filter(f => f.parentId === course.folderId && !f.isTrash);

      if (subfolders.length > 0) {
        const updatedModules: CourseModule[] = subfolders.map((sub, idx) => {
          const existingMod = existingModules.find(m => m.id === sub.id || m.title === sub.name);
          const subVideos = files.filter(f => f.parentId === sub.id && f.type === 'video');

          // Keep existing lessons that were manually attached or video files
          const existingLessons = existingMod?.lessons || [];

          const lessons: Lesson[] = subVideos.map((video, vIdx) => {
            const existingLesson = existingLessons.find(l => l.fileId === video.id || l.title === video.name.replace(/\.[^/.]+$/, ""));
            const mergedSubtitles = video.subtitles && video.subtitles.length > 0 
              ? video.subtitles 
              : (existingLesson?.subtitles || []);

            return {
              id: existingLesson?.id || 'lesson-' + sub.id + '-' + video.id,
              title: video.name.replace(/\.[^/.]+$/, ""),
              duration: existingLesson?.duration || '15:00',
              fileId: video.id,
              order: vIdx + 1,
              isCompleted: existingLesson?.isCompleted || false,
              lastPositionSeconds: existingLesson?.lastPositionSeconds || 0,
              timestamps: existingLesson?.timestamps || video.timestamps || [],
              subtitles: mergedSubtitles,
              notes: existingLesson?.notes,
              materials: existingLesson?.materials
            };
          });

          // Also include any placeholder/manual lessons added to this module that don't have fileId yet
          for (const l of existingLessons) {
            if (!l.fileId && !lessons.some(x => x.id === l.id)) {
              lessons.push(l);
            }
          }

          return {
            id: sub.id,
            title: sub.name,
            order: existingMod?.order || (idx + 1),
            lessons
          };
        });

        course.modules = updatedModules;
      } else {
        const rootVideos = files.filter(f => f.parentId === course.folderId && f.type === 'video');
        const existingMod = existingModules[0];

        const lessons: Lesson[] = rootVideos.map((video, vIdx) => {
          const existingLesson = existingMod?.lessons?.find(l => l.fileId === video.id || l.title === video.name.replace(/\.[^/.]+$/, ""));
          const mergedSubtitles = video.subtitles && video.subtitles.length > 0 
            ? video.subtitles 
            : (existingLesson?.subtitles || []);

          return {
            id: existingLesson?.id || 'lesson-' + course.folderId + '-' + video.id,
            title: video.name.replace(/\.[^/.]+$/, ""),
            duration: existingLesson?.duration || '15:00',
            fileId: video.id,
            order: vIdx + 1,
            isCompleted: existingLesson?.isCompleted || false,
            lastPositionSeconds: existingLesson?.lastPositionSeconds || 0,
            timestamps: existingLesson?.timestamps || video.timestamps || [],
            subtitles: mergedSubtitles,
            notes: existingLesson?.notes,
            materials: existingLesson?.materials
          };
        });

        // Also preserve any placeholder lessons without files
        if (existingMod?.lessons) {
          for (const l of existingMod.lessons) {
            if (!l.fileId && !lessons.some(x => x.id === l.id)) {
              lessons.push(l);
            }
          }
        }

        course.modules = [
          {
            id: existingMod?.id || 'mod-' + course.folderId,
            title: rootFolder.name,
            order: 1,
            lessons
          }
        ];
      }

      course.updatedAt = new Date().toISOString();
    }
  }

  // ---------------- AUTO-SYNC BOOKS & AUDIOBOOKS ----------------
  public syncBooksWithFolderStructure() {
    if (!this.data.books) this.data.books = [];
    const books = this.data.books;
    const files = this.data.files.filter(f => !f.isTrash);

    for (let book of books) {
      if (!book.folderId) continue;
      
      const bookAudioFiles = files.filter(f => f.parentId === book.folderId && f.type === 'audio');
      const bookPdfFiles = files.filter(f => f.parentId === book.folderId && (f.type === 'pdf' || f.extension === 'epub'));
      
      const existingChapters = book.chapters || [];

      if (bookAudioFiles.length > 0) {
        book.chapters = bookAudioFiles.map((audio, idx) => {
          const existing = existingChapters.find(c => c.fileId === audio.id || c.title === audio.name.replace(/\.[^/.]+$/, ""));
          return {
            id: existing?.id || 'chap-' + book.id + '-' + audio.id,
            title: audio.name.replace(/\.[^/.]+$/, ""),
            duration: existing?.duration || '20:00',
            fileId: audio.id,
            order: idx + 1,
            isCompleted: existing?.isCompleted || false,
            lastPositionSeconds: existing?.lastPositionSeconds || 0,
            timestamps: existing?.timestamps || audio.timestamps || [],
            notes: existing?.notes
          };
        });
      }

      if (bookPdfFiles.length > 0 && !book.ebookFileId) {
        book.ebookFileId = bookPdfFiles[0].id;
      }

      // Determine format
      if (book.chapters.length > 0 && book.ebookFileId) {
        book.format = 'bundle';
      } else if (book.chapters.length > 0) {
        book.format = 'audiobook';
      } else if (book.ebookFileId) {
        book.format = 'ebook';
      }

      book.updatedAt = new Date().toISOString();
    }
  }

  // ---------------- AUTO-SYNC COMICS & MANGAS ----------------
  public syncComicsWithFolderStructure() {
    if (!this.data.comics) this.data.comics = [];
    const comics = this.data.comics;
    const files = this.data.files.filter(f => !f.isTrash);
    const folders = this.data.folders.filter(f => !f.isTrash);

    for (let comic of comics) {
      if (!comic.folderId) continue;

      const subFolders = folders.filter(f => f.parentId === comic.folderId);
      const subFolderIds = new Set(subFolders.map(sf => sf.id));

      const comicFiles = files.filter(f => 
        (f.parentId === comic.folderId || subFolderIds.has(f.parentId || '')) &&
        (f.type === 'comic' || f.type === 'ebook' || ['cbr', 'cbz', 'pdf', 'zip', 'epub'].includes(f.extension.toLowerCase()) || /\.(cbr|cbz|pdf|epub)$/i.test(f.name))
      );

      // Natural sort for issues
      comicFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      const existingIssues = comic.issues || [];

      if (comicFiles.length > 0) {
        comic.issues = comicFiles.map((file, idx) => {
          const existing = existingIssues.find(i => i.fileId === file.id || i.title === file.name.replace(/\.[^/.]+$/, ""));
          return {
            id: existing?.id || 'issue-' + comic.id + '-' + file.id,
            title: existing?.title || file.name.replace(/\.[^/.]+$/, ""),
            issueNumber: existing?.issueNumber || (idx + 1),
            fileId: file.id,
            order: idx + 1,
            isCompleted: existing?.isCompleted || false,
            currentPage: existing?.currentPage || 0,
            lastReadAt: existing?.lastReadAt
          };
        });
      }

      comic.updatedAt = new Date().toISOString();
    }
  }

  // ---------------- AUTO-SYNC VIDEOS & FILMES ----------------
  public syncVideosWithFolderStructure() {
    if (!this.data.videos) this.data.videos = [];
    const videos = this.data.videos;
    const files = this.data.files.filter(f => !f.isTrash);

    for (let video of videos) {
      if (video.fileId) {
        const file = files.find(f => f.id === video.fileId);
        if (file) {
          if (!video.title) video.title = file.name.replace(/\.[^/.]+$/, "");
          if (file.timestamps && file.timestamps.length > 0 && (!video.timestamps || video.timestamps.length === 0)) {
            video.timestamps = file.timestamps;
          }
          if (file.subtitles && file.subtitles.length > 0 && (!video.subtitles || video.subtitles.length === 0)) {
            video.subtitles = file.subtitles;
          }
        }
      } else if (video.folderId) {
        const videoFiles = files.filter(f => f.parentId === video.folderId && f.type === 'video');
        if (videoFiles.length > 0) {
          const primary = videoFiles[0];
          video.fileId = primary.id;
          if (primary.timestamps) video.timestamps = primary.timestamps;
          if (primary.subtitles) video.subtitles = primary.subtitles;
        }
      }
      video.updatedAt = new Date().toISOString();
    }
  }

  // ---------------- AUTO-SYNC SÉRIES & TV SHOWS ----------------
  public syncSeriesWithFolderStructure() {
    if (!this.data.series) this.data.series = [];
    const seriesList = this.data.series;
    const files = this.data.files.filter(f => !f.isTrash);
    const folders = this.data.folders.filter(f => !f.isTrash);

    for (let series of seriesList) {
      if (!series.folderId) continue;

      const subFolders = folders.filter(f => f.parentId === series.folderId);
      subFolders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      const existingSeasons = series.seasons || [];

      if (subFolders.length > 0) {
        // Multi-season from subfolders
        series.seasons = subFolders.map((sub, sIdx) => {
          const seasonFiles = files.filter(f => f.parentId === sub.id && f.type === 'video');
          seasonFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

          const existingSeason = existingSeasons.find(s => s.id === sub.id || s.title === sub.name);
          const existingEpisodes = existingSeason?.episodes || [];

          const episodes: SeriesEpisode[] = seasonFiles.map((file, eIdx) => {
            const existingEp = existingEpisodes.find(e => e.fileId === file.id || e.title === file.name.replace(/\.[^/.]+$/, ""));
            return {
              id: existingEp?.id || 'ep-' + series.id + '-' + sub.id + '-' + file.id,
              title: existingEp?.title || file.name.replace(/\.[^/.]+$/, ""),
              episodeNumber: existingEp?.episodeNumber || (eIdx + 1),
              seasonNumber: sIdx + 1,
              duration: existingEp?.duration || '24:00',
              fileId: file.id,
              isCompleted: existingEp?.isCompleted || false,
              lastPositionSeconds: existingEp?.lastPositionSeconds || 0,
              description: existingEp?.description,
              timestamps: existingEp?.timestamps || file.timestamps || [],
              subtitles: existingEp?.subtitles || file.subtitles || []
            };
          });

          return {
            id: existingSeason?.id || sub.id,
            title: existingSeason?.title || sub.name,
            seasonNumber: sIdx + 1,
            episodes
          };
        });
      } else {
        // Single season directly inside folder
        const rootVideos = files.filter(f => f.parentId === series.folderId && f.type === 'video');
        rootVideos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        const existingSeason = existingSeasons[0];
        const existingEpisodes = existingSeason?.episodes || [];

        const episodes: SeriesEpisode[] = rootVideos.map((file, eIdx) => {
          const existingEp = existingEpisodes.find(e => e.fileId === file.id || e.title === file.name.replace(/\.[^/.]+$/, ""));
          return {
            id: existingEp?.id || 'ep-' + series.id + '-' + file.id,
            title: existingEp?.title || file.name.replace(/\.[^/.]+$/, ""),
            episodeNumber: existingEp?.episodeNumber || (eIdx + 1),
            seasonNumber: 1,
            duration: existingEp?.duration || '24:00',
            fileId: file.id,
            isCompleted: existingEp?.isCompleted || false,
            lastPositionSeconds: existingEp?.lastPositionSeconds || 0,
            description: existingEp?.description,
            timestamps: existingEp?.timestamps || file.timestamps || [],
            subtitles: existingEp?.subtitles || file.subtitles || []
          };
        });

        series.seasons = [
          {
            id: existingSeason?.id || 'season-1-' + series.id,
            title: existingSeason?.title || 'Temporada 1',
            seasonNumber: 1,
            episodes
          }
        ];
      }

      series.updatedAt = new Date().toISOString();
    }
  }

  // ---------------- AUTO-SYNC MÚSICAS & PODCASTS ----------------
  public syncAudioShowsWithFolderStructure() {
    if (!this.data.audioShows) this.data.audioShows = [];
    const audioShows = this.data.audioShows;
    const files = this.data.files.filter(f => !f.isTrash);
    const folders = this.data.folders.filter(f => !f.isTrash);

    for (let show of audioShows) {
      if (!show.folderId) continue;

      const subFolders = folders.filter(f => f.parentId === show.folderId);
      const subFolderIds = new Set(subFolders.map(sf => sf.id));

      const audioFiles = files.filter(f => 
        (f.parentId === show.folderId || subFolderIds.has(f.parentId || '')) &&
        (f.type === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes((f.extension || '').toLowerCase()))
      );

      audioFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      const existingTracks = show.tracks || [];

      // If show is a Podcast or contains remote stream/RSS tracks
      if (show.showType === 'podcast' || existingTracks.some(t => t.audioUrl || !t.fileId)) {
        const updatedTracks = [...existingTracks];

        // Match every downloaded audio file to existing tracks or add new ones
        for (const file of audioFiles) {
          const cleanFileName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().trim();
          
          let track = updatedTracks.find(t => t.fileId === file.id);
          if (!track) {
            track = updatedTracks.find(t => {
              const cleanTrackTitle = (t.title || '').toLowerCase().trim();
              return cleanTrackTitle === cleanFileName || cleanTrackTitle.includes(cleanFileName) || cleanFileName.includes(cleanTrackTitle);
            });
          }

          if (track) {
            track.fileId = file.id;
            if ((!track.timestamps || track.timestamps.length === 0) && file.timestamps && file.timestamps.length > 0) {
              track.timestamps = file.timestamps;
            }
          } else {
            // New local file in folder not matching an existing track
            updatedTracks.push({
              id: 'track-' + show.id + '-' + file.id,
              title: file.name.replace(/\.[^/.]+$/, ''),
              artist: show.artist || show.host || 'Artista',
              album: show.title,
              duration: '03:45',
              fileId: file.id,
              order: updatedTracks.length + 1,
              trackNumber: updatedTracks.length + 1,
              isCompleted: false,
              lastPositionSeconds: 0,
              timestamps: file.timestamps || []
            });
          }
        }

        show.tracks = updatedTracks;
      } else {
        // Pure local music albums
        if (audioFiles.length > 0) {
          show.tracks = audioFiles.map((file, idx) => {
            const existing = existingTracks.find(t => t.fileId === file.id || t.title === file.name.replace(/\.[^/.]+$/, ""));
            return {
              id: existing?.id || 'track-' + show.id + '-' + file.id,
              title: existing?.title || file.name.replace(/\.[^/.]+$/, ""),
              artist: existing?.artist || show.artist || show.host || 'Artista',
              album: existing?.album || show.title,
              duration: existing?.duration || '03:45',
              fileId: file.id,
              order: idx + 1,
              trackNumber: existing?.trackNumber || (idx + 1),
              isCompleted: existing?.isCompleted || false,
              lastPositionSeconds: existing?.lastPositionSeconds || 0,
              timestamps: existing?.timestamps || file.timestamps || [],
              notes: existing?.notes
            };
          });
        }
      }

      show.updatedAt = new Date().toISOString();
    }
  }

  // ---------------- AUTO-SYNC CONTEÚDO ADULTO ----------------
  public syncAdultVideosWithFolderStructure() {
    if (!this.data.adultVideos) this.data.adultVideos = [];
    const files = this.data.files.filter(f => !f.isTrash);
    const folders = this.data.folders.filter(f => !f.isTrash);
    const activeFileIds = new Set(files.map(f => f.id));
    const activeFolderIds = new Set(folders.map(f => f.id));

    // 1. Remove adultVideos whose associated file or folder was deleted / sent to trash
    this.data.adultVideos = this.data.adultVideos.filter(vid => {
      if (vid.fileId) {
        return activeFileIds.has(vid.fileId);
      }
      if (vid.folderId) {
        return activeFolderIds.has(vid.folderId);
      }
      return true;
    });

    // 2. Identify all distinct active source folders registered in Red Locker
    const registeredFolderIds = new Set<string>();
    for (const vid of this.data.adultVideos) {
      if (vid.folderId && activeFolderIds.has(vid.folderId)) {
        registeredFolderIds.add(vid.folderId);
      }
    }

    // 3. For each registered folder, ensure all video files are imported and mapped
    for (const folderId of registeredFolderIds) {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) continue;

      // Collect all recursive subfolders of folderId
      const subFolderIds = new Set<string>();
      const queue = [folderId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = folders.filter(f => f.parentId === currentId);
        for (const child of children) {
          subFolderIds.add(child.id);
          queue.push(child.id);
        }
      }

      // Find all non-trash video files inside folder and subfolders
      const videoFiles = files.filter(f => 
        (f.parentId === folderId || subFolderIds.has(f.parentId || '')) &&
        (f.type === 'video' || ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', 'ts', 'flv', 'wmv'].includes(f.extension?.toLowerCase() || ''))
      );

      videoFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      // Find a template AdultVideo from the same folder to inherit metadata (category, studio, performers, etc.)
      const templateVideo = this.data.adultVideos.find(v => 
        v.folderId === folderId || subFolderIds.has(v.folderId || '')
      );

      const defaultCover = templateVideo?.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60';
      const defaultCategory = templateVideo?.category || 'Longas-Metragens';

      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i];
        const existingVid = this.data.adultVideos.find(v => v.fileId === file.id);

        if (existingVid) {
          // Keep folderId synced if file was moved within subfolders
          if (file.parentId && existingVid.folderId !== file.parentId) {
            existingVid.folderId = file.parentId;
            existingVid.updatedAt = new Date().toISOString();
          }
        } else {
          // Automatically add newly detected video file to Red Locker!
          const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/^[🔞🔥🎬\s]+/, '').trim();
          const newVid: AdultVideo = {
            id: 'adult-vid-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substring(2, 7),
            title: cleanFileName,
            description: templateVideo?.description || folder.description || '',
            coverImage: defaultCover,
            category: defaultCategory,
            studio: templateVideo?.studio,
            performers: templateVideo?.performers,
            aka: templateVideo?.aka,
            year: templateVideo?.year,
            folderId: file.parentId || folderId,
            fileId: file.id,
            tags: templateVideo?.tags ? [...templateVideo.tags] : [],
            isFavorite: false,
            lastPositionSeconds: 0,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          this.data.adultVideos.push(newVid);
        }
      }
    }
  }

  // ---------------- AUTO-SYNC ALL LIBRARIES ----------------
  public syncAllLibrariesWithFolderStructure() {
    this.syncCoursesWithFolderStructure();
    this.syncBooksWithFolderStructure();
    this.syncComicsWithFolderStructure();
    this.syncVideosWithFolderStructure();
    this.syncSeriesWithFolderStructure();
    this.syncAudioShowsWithFolderStructure();
    this.syncAdultVideosWithFolderStructure();
  }

  // ---------------- FOLDERS CRUD ----------------
  public getFolders(parentId: string | null = null, includeTrash = false): FolderItem[] {
    return this.data.folders.filter(f => 
      f.parentId === parentId && (includeTrash ? true : !f.isTrash)
    );
  }

  public getAllFolders(): FolderItem[] {
    return this.data.folders;
  }

  public getFolderById(id: string): FolderItem | undefined {
    return this.data.folders.find(f => f.id === id);
  }

  public createFolder(name: string, parentId: string | null = null, color?: string, description?: string): FolderItem {
    const newFolder: FolderItem = {
      id: 'folder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name,
      description,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: color || '#1a73e8'
    };
    this.data.folders.push(newFolder);
    this.syncAllLibrariesWithFolderStructure();
    this.save(this.data);
    return newFolder;
  }

  public updateFolder(id: string, updates: Partial<FolderItem>): FolderItem | null {
    const idx = this.data.folders.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.data.folders[idx] = {
      ...this.data.folders[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.syncAllLibrariesWithFolderStructure();
    this.save(this.data);
    return this.data.folders[idx];
  }

  public deleteFolder(id: string, permanent = false): { success: boolean; deletedFiles: DriveItem[] } {
    const deletedFiles: DriveItem[] = [];

    if (permanent) {
      // Find all child files to remove
      const childFiles = this.data.files.filter(f => f.parentId === id);
      deletedFiles.push(...childFiles);
      this.data.files = this.data.files.filter(f => f.parentId !== id);
      this.data.folders = this.data.folders.filter(f => f.id !== id);
    } else {
      const now = new Date().toISOString();
      const folder = this.data.folders.find(f => f.id === id);
      if (folder) {
        folder.isTrash = true;
        folder.deletedAt = now;
      }
      // Also mark child files as trash
      this.data.files.forEach(f => {
        if (f.parentId === id) {
          f.isTrash = true;
          f.deletedAt = now;
        }
      });
    }

    this.syncAllLibrariesWithFolderStructure();
    this.save(this.data);
    return { success: true, deletedFiles };
  }

  // ---------------- FILES CRUD ----------------
  public getFiles(parentId: string | null = null, includeTrash = false): DriveItem[] {
    return this.data.files.filter(f => 
      f.parentId === parentId && (includeTrash ? true : !f.isTrash)
    );
  }

  public getAllFiles(): DriveItem[] {
    return this.data.files;
  }

  public createFile(item: Partial<DriveItem>): DriveItem {
    const newFile: DriveItem = {
      id: item.id || 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: item.name || 'Sem nome',
      description: item.description,
      isFolder: false,
      parentId: item.parentId !== undefined ? item.parentId : null,
      size: item.size || 0,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      type: item.type || 'other',
      extension: item.extension || '',
      mimeType: item.mimeType || 'application/octet-stream',
      isFavorite: !!item.isFavorite,
      telegramMeta: item.telegramMeta,
      tags: item.tags || [],
      timestamps: (item.timestamps || []).sort((a, b) => (a.seconds || 0) - (b.seconds || 0)),
      subtitles: item.subtitles || [],
      courseId: item.courseId,
      moduleId: item.moduleId,
      lessonId: item.lessonId
    };
    this.data.files.push(newFile);
    this.syncAllLibrariesWithFolderStructure();
    this.save(this.data);
    return newFile;
  }

  public updateFile(id: string, updates: Partial<DriveItem>): DriveItem | null {
    const idx = this.data.files.findIndex(f => f.id === id);
    if (idx === -1) return null;
    if (updates.timestamps) {
      updates.timestamps = [...updates.timestamps].sort((a, b) => (a.seconds || 0) - (b.seconds || 0));
    }
    this.data.files[idx] = {
      ...this.data.files[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.syncAllLibrariesWithFolderStructure();
    this.save(this.data);
    return this.data.files[idx];
  }

  public deleteFile(id: string, permanent = false): { success: boolean; deletedFile?: DriveItem } {
    const file = this.data.files.find(f => f.id === id);
    if (!file) return { success: false };

    if (permanent) {
      this.data.files = this.data.files.filter(f => f.id !== id);
      this.syncAllLibrariesWithFolderStructure();
      this.save(this.data);
      return { success: true, deletedFile: file };
    } else {
      file.isTrash = true;
      file.deletedAt = new Date().toISOString();
      this.syncAllLibrariesWithFolderStructure();
      this.save(this.data);
      return { success: true };
    }
  }

  public restoreItem(id: string, isFolder: boolean): boolean {
    if (isFolder) {
      const folder = this.data.folders.find(f => f.id === id);
      if (folder) {
        folder.isTrash = false;
        folder.deletedAt = undefined;
        this.data.files.forEach(f => {
          if (f.parentId === id) {
            f.isTrash = false;
            f.deletedAt = undefined;
          }
        });
      }
    } else {
      const file = this.data.files.find(f => f.id === id);
      if (file) {
        file.isTrash = false;
        file.deletedAt = undefined;
      }
    }
    this.syncAllLibrariesWithFolderStructure();
    this.save(this.data);
    return true;
  }

  public emptyTrash(): DriveItem[] {
    const trashFiles = this.data.files.filter(f => f.isTrash);
    this.data.files = this.data.files.filter(f => !f.isTrash);
    this.data.folders = this.data.folders.filter(f => !f.isTrash);
    this.syncAllLibrariesWithFolderStructure();
    this.save(this.data);
    return trashFiles;
  }

  public purgeExpiredTrash(days = 30): DriveItem[] {
    const now = Date.now();
    const maxAgeMs = days * 24 * 60 * 60 * 1000;

    const expiredFiles: DriveItem[] = [];

    this.data.files = this.data.files.filter(f => {
      if (f.isTrash && f.deletedAt) {
        const deletedTime = new Date(f.deletedAt).getTime();
        if (now - deletedTime >= maxAgeMs) {
          expiredFiles.push(f);
          return false; // Remove
        }
      }
      return true; // Keep
    });

    this.data.folders = this.data.folders.filter(f => {
      if (f.isTrash && f.deletedAt) {
        const deletedTime = new Date(f.deletedAt).getTime();
        if (now - deletedTime >= maxAgeMs) {
          return false; // Remove
        }
      }
      return true; // Keep
    });

    if (expiredFiles.length > 0) {
      this.syncAllLibrariesWithFolderStructure();
      this.save(this.data);
    }

    return expiredFiles;
  }

  // ---------------- DUPLICATE DETECTION ----------------
  public findDuplicates(parentId: string | null = null): Array<{
    id: string;
    original: DriveItem;
    duplicates: DriveItem[];
    reason: string;
    totalWastedBytes: number;
  }> {
    const files = this.data.files.filter(f => !f.isTrash && (parentId === undefined || parentId === null ? true : f.parentId === parentId));
    
    // Group by (parentId + size) when size > 0
    const sizeGroups = new Map<string, DriveItem[]>();

    for (const file of files) {
      if (file.size <= 0) continue;
      const key = `${file.parentId || 'root'}__${file.size}`;
      const list = sizeGroups.get(key) || [];
      list.push(file);
      sizeGroups.set(key, list);
    }

    const duplicateGroups: Array<{
      id: string;
      original: DriveItem;
      duplicates: DriveItem[];
      reason: string;
      totalWastedBytes: number;
    }> = [];

    sizeGroups.forEach((groupFiles, key) => {
      if (groupFiles.length > 1) {
        // Sort oldest first as original
        const sorted = [...groupFiles].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const original = sorted[0];
        const duplicates = sorted.slice(1);

        const allSameName = duplicates.every(d => d.name === original.name);
        const reason = allSameName 
          ? 'Nome e tamanho em bytes idênticos'
          : `Mesmo tamanho exato (${(original.size / (1024 * 1024)).toFixed(2)} MB) e duração compatível`;

        duplicateGroups.push({
          id: 'dup-' + key,
          original,
          duplicates,
          reason,
          totalWastedBytes: original.size * duplicates.length
        });
      }
    });

    return duplicateGroups;
  }

  public checkDuplicate(name: string, size: number, parentId: string | null = null): { isDuplicate: boolean; existingFile?: DriveItem; reason?: string } {
    const files = this.data.files.filter(f => !f.isTrash && f.parentId === parentId);
    
    // 1. Exact name and size
    const exact = files.find(f => f.name.toLowerCase() === name.toLowerCase() && f.size === size);
    if (exact) {
      return {
        isDuplicate: true,
        existingFile: exact,
        reason: `Arquivo idêntico "${exact.name}" (${(size / (1024 * 1024)).toFixed(2)} MB) já existe nesta pasta.`
      };
    }

    // 2. Same size and similar name (e.g. video.mp4 vs video (1).mp4)
    const sameSize = files.find(f => f.size > 0 && f.size === size);
    if (sameSize) {
      return {
        isDuplicate: true,
        existingFile: sameSize,
        reason: `Arquivo com tamanho idêntico "${sameSize.name}" (${(size / (1024 * 1024)).toFixed(2)} MB) já existe nesta pasta.`
      };
    }

    return { isDuplicate: false };
  }

  // ---------------- COURSES CRUD ----------------
  public getCourses(): Course[] {
    this.syncCoursesWithFolderStructure();
    return this.data.courses;
  }

  public getCourseById(id: string): Course | null {
    this.syncCoursesWithFolderStructure();
    return this.data.courses.find(c => c.id === id) || null;
  }

  public saveCourse(courseData: Partial<Course> & { title: string }): Course {
    const id = courseData.id || 'course-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const existingIdx = this.data.courses.findIndex(c => c.id === id);

    // Ensure all lessons' timestamps are sorted sequentially
    const sanitizedModules = (courseData.modules || []).map(mod => ({
      ...mod,
      lessons: (mod.lessons || []).map(l => ({
        ...l,
        timestamps: (l.timestamps || []).sort((a: any, b: any) => (a.seconds || 0) - (b.seconds || 0))
      }))
    }));

    const course: Course = {
      id,
      title: courseData.title,
      description: courseData.description || '',
      instructor: courseData.instructor,
      folderId: courseData.folderId,
      coverImage: courseData.coverImage,
      category: courseData.category || 'Geral',
      modules: sanitizedModules,
      createdAt: courseData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      const oldCourse = this.data.courses[existingIdx];
      // Check for removed modules
      if (oldCourse.modules && course.modules && course.folderId) {
        const newModIds = new Set(course.modules.map(m => m.id));
        for (const oldMod of oldCourse.modules) {
          if (!newModIds.has(oldMod.id)) {
            // Module was removed, delete its matching subfolder
            this.data.folders = this.data.folders.filter(f => f.id !== oldMod.id);
          }
        }
      }

      this.data.courses[existingIdx] = course;
    } else {
      this.data.courses.push(course);
    }
    this.syncCoursesWithFolderStructure();
    this.save(this.data);
    return course;
  }

  public deleteCourse(id: string): boolean {
    this.data.courses = this.data.courses.filter(c => c.id !== id);
    this.save(this.data);
    return true;
  }

  // ---------------- BOOKS & AUDIOBOOKS CRUD ----------------
  public getBooks(): Book[] {
    this.syncBooksWithFolderStructure();
    return this.data.books || [];
  }

  public getBookById(id: string): Book | null {
    this.syncBooksWithFolderStructure();
    return (this.data.books || []).find(b => b.id === id) || null;
  }

  public saveBook(book: Book): Book {
    if (!this.data.books) this.data.books = [];
    // Ensure all chapters' timestamps are sorted sequentially
    const sanitizedChapters = (book.chapters || []).map(ch => ({
      ...ch,
      timestamps: (ch.timestamps || []).sort((a: any, b: any) => (a.seconds || 0) - (b.seconds || 0))
    }));
    book.chapters = sanitizedChapters;

    const idx = this.data.books.findIndex(b => b.id === book.id);
    if (idx >= 0) {
      this.data.books[idx] = {
        ...book,
        updatedAt: new Date().toISOString()
      };
    } else {
      this.data.books.push({
        ...book,
        createdAt: book.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this.syncBooksWithFolderStructure();
    this.save(this.data);
    return book;
  }

  public deleteBook(id: string): boolean {
    if (!this.data.books) return false;
    this.data.books = this.data.books.filter(b => b.id !== id);
    this.save(this.data);
    return true;
  }

  // ---------------- BOOK CATEGORIES CRUD ----------------
  public getBookCategories(): string[] {
    if (!this.data.bookCategories || this.data.bookCategories.length === 0) {
      this.data.bookCategories = [
        'Desenvolvimento Pessoal',
        'Negócios & Carreira',
        'Ficção & Literatura',
        'Finanças & Investimentos',
        'Produtividade',
        'Tecnologia & Ciência',
        'Psicologia & Mente',
        'Biografia & História',
        'Fantasia & Sci-Fi'
      ];
      this.save(this.data);
    }
    return this.data.bookCategories;
  }

  public addBookCategory(category: string): string[] {
    const trimmed = category.trim();
    if (!trimmed) return this.getBookCategories();
    const categories = this.getBookCategories();
    if (!categories.includes(trimmed)) {
      categories.push(trimmed);
      this.data.bookCategories = categories;
      this.save(this.data);
    }
    return this.data.bookCategories;
  }

  public updateBookCategory(oldCategory: string, newCategory: string): string[] {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew) return this.getBookCategories();
    const categories = this.getBookCategories();
    const idx = categories.indexOf(oldCategory);
    if (idx >= 0) {
      categories[idx] = trimmedNew;
      // Also update any books with this old category
      if (this.data.books) {
        this.data.books.forEach(b => {
          if (b.category === oldCategory) b.category = trimmedNew;
        });
      }
      this.data.bookCategories = categories;
      this.save(this.data);
    }
    return this.data.bookCategories;
  }

  public deleteBookCategory(category: string): string[] {
    const categories = this.getBookCategories();
    this.data.bookCategories = categories.filter(c => c !== category);
    this.save(this.data);
    return this.data.bookCategories;
  }

  // ---------------- COMICS & MANGAS CRUD ----------------
  public getComics(): ComicBook[] {
    this.syncComicsWithFolderStructure();
    return this.data.comics;
  }

  public getComicById(id: string): ComicBook | null {
    this.syncComicsWithFolderStructure();
    return this.data.comics.find(c => c.id === id) || null;
  }

  public saveComic(comic: ComicBook): ComicBook {
    if (!this.data.comics) this.data.comics = [];
    const idx = this.data.comics.findIndex(c => c.id === comic.id);
    comic.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      this.data.comics[idx] = comic;
    } else {
      comic.createdAt = new Date().toISOString();
      this.data.comics.push(comic);
    }
    this.syncComicsWithFolderStructure();
    this.save(this.data);
    return comic;
  }

  public deleteComic(id: string): boolean {
    if (!this.data.comics) return false;
    const initialLen = this.data.comics.length;
    this.data.comics = this.data.comics.filter(c => c.id !== id);
    if (this.data.comics.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  public getComicCategories(): string[] {
    if (!this.data.comicCategories || this.data.comicCategories.length === 0) {
      this.data.comicCategories = [
        'Super-Heróis',
        'Mangá (Shonen)',
        'Mangá (Seinen)',
        'Graphic Novels',
        'Ficção Científica',
        'Fantasia & Aventura',
        'Terror & Suspense',
        'Quadrinhos Clássicos',
        'Indie & Autoral'
      ];
      this.save(this.data);
    }
    return this.data.comicCategories;
  }

  public addComicCategory(category: string): string[] {
    const trimmed = category.trim();
    if (!trimmed) return this.getComicCategories();
    const categories = this.getComicCategories();
    if (!categories.includes(trimmed)) {
      categories.push(trimmed);
      this.data.comicCategories = categories;
      this.save(this.data);
    }
    return this.data.comicCategories;
  }

  public updateComicCategory(oldCategory: string, newCategory: string): string[] {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew) return this.getComicCategories();
    const categories = this.getComicCategories();
    const idx = categories.indexOf(oldCategory);
    if (idx >= 0) {
      categories[idx] = trimmedNew;
      if (this.data.comics) {
        this.data.comics.forEach(c => {
          if (c.category === oldCategory) c.category = trimmedNew;
        });
      }
      this.data.comicCategories = categories;
      this.save(this.data);
    }
    return this.data.comicCategories;
  }

  public deleteComicCategory(category: string): string[] {
    const categories = this.getComicCategories();
    this.data.comicCategories = categories.filter(c => c !== category);
    this.save(this.data);
    return this.data.comicCategories;
  }

  // ---------------- VIDEOS & FILMES CRUD ----------------
  public getVideos(): MovieVideo[] {
    this.syncVideosWithFolderStructure();
    return this.data.videos || [];
  }

  public getVideoById(id: string): MovieVideo | undefined {
    this.syncVideosWithFolderStructure();
    return (this.data.videos || []).find(v => v.id === id);
  }

  public saveVideo(videoData: Partial<MovieVideo> & { title: string }): MovieVideo {
    if (!this.data.videos) this.data.videos = [];
    const id = videoData.id || 'vid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const existingIdx = this.data.videos.findIndex(v => v.id === id);

    const video: MovieVideo = {
      id,
      title: videoData.title,
      titlePt: videoData.titlePt,
      description: videoData.description || '',
      duration: videoData.duration || '1h 30m',
      durationSeconds: videoData.durationSeconds,
      resolution: videoData.resolution || '1080p',
      category: videoData.category || 'Filmes',
      genre: videoData.genre,
      year: videoData.year,
      director: videoData.director,
      coverImage: videoData.coverImage,
      fileId: videoData.fileId,
      folderId: videoData.folderId,
      timestamps: (videoData.timestamps || []).sort((a: any, b: any) => (a.seconds || 0) - (b.seconds || 0)),
      subtitles: videoData.subtitles || [],
      lastPositionSeconds: videoData.lastPositionSeconds || 0,
      isCompleted: videoData.isCompleted || false,
      rating: videoData.rating,
      imdbId: videoData.imdbId,
      imdbRating: videoData.imdbRating,
      actors: videoData.actors,
      rated: videoData.rated,
      runtime: videoData.runtime,
      awards: videoData.awards,
      writer: videoData.writer,
      metascore: videoData.metascore,
      country: videoData.country,
      createdAt: videoData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.data.videos[existingIdx] = video;
    } else {
      this.data.videos.push(video);
    }

    this.syncVideosWithFolderStructure();
    this.save(this.data);
    return video;
  }

  public deleteVideo(id: string): boolean {
    if (!this.data.videos) return false;
    const initialLen = this.data.videos.length;
    this.data.videos = this.data.videos.filter(v => v.id !== id);
    if (this.data.videos.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  public getVideoCategories(): string[] {
    return this.data.videoCategories || initialDemoData.videoCategories;
  }

  public addVideoCategory(category: string): string[] {
    const trimmed = category.trim();
    if (!trimmed) return this.getVideoCategories();
    const categories = this.getVideoCategories();
    if (!categories.includes(trimmed)) {
      categories.push(trimmed);
      this.data.videoCategories = categories;
      this.save(this.data);
    }
    return this.data.videoCategories;
  }

  public updateVideoCategory(oldCategory: string, newCategory: string): string[] {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew) return this.getVideoCategories();
    const categories = this.getVideoCategories();
    const idx = categories.indexOf(oldCategory);
    if (idx >= 0) {
      categories[idx] = trimmedNew;
      if (this.data.videos) {
        this.data.videos.forEach(v => {
          if (v.category === oldCategory) v.category = trimmedNew;
        });
      }
      this.data.videoCategories = categories;
      this.save(this.data);
    }
    return this.data.videoCategories;
  }

  public deleteVideoCategory(category: string): string[] {
    const categories = this.getVideoCategories();
    this.data.videoCategories = categories.filter(c => c !== category);
    this.save(this.data);
    return this.data.videoCategories;
  }

  // ---------------- VÍDEOS & MÍDIAS PESSOAIS CRUD ----------------
  public getPersonalVideos(): PersonalVideo[] {
    return this.data.personalVideos || [];
  }

  public getPersonalVideoById(id: string): PersonalVideo | undefined {
    return (this.data.personalVideos || []).find(v => v.id === id);
  }

  public savePersonalVideo(videoData: Partial<PersonalVideo> & { title: string }): PersonalVideo {
    if (!this.data.personalVideos) this.data.personalVideos = [];
    const id = videoData.id || 'pvid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const existingIdx = this.data.personalVideos.findIndex(v => v.id === id);

    const video: PersonalVideo = {
      id,
      title: videoData.title,
      description: videoData.description || '',
      date: videoData.date,
      location: videoData.location,
      people: videoData.people,
      category: videoData.category || 'Memórias & Momentos',
      tags: videoData.tags || [],
      duration: videoData.duration || '00:00',
      durationSeconds: videoData.durationSeconds,
      resolution: videoData.resolution || '1080p',
      coverImage: videoData.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
      fileId: videoData.fileId,
      folderId: videoData.folderId,
      timestamps: (videoData.timestamps || []).sort((a: any, b: any) => (a.seconds || 0) - (b.seconds || 0)),
      subtitles: videoData.subtitles || [],
      lastPositionSeconds: videoData.lastPositionSeconds || 0,
      isCompleted: videoData.isCompleted || false,
      isFavorite: videoData.isFavorite || false,
      createdAt: videoData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.data.personalVideos[existingIdx] = video;
    } else {
      this.data.personalVideos.push(video);
    }

    this.save(this.data);
    return video;
  }

  public deletePersonalVideo(id: string): boolean {
    if (!this.data.personalVideos) return false;
    const initialLen = this.data.personalVideos.length;
    this.data.personalVideos = this.data.personalVideos.filter(v => v.id !== id);
    if (this.data.personalVideos.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  public getPersonalVideoCategories(): string[] {
    return this.data.personalVideoCategories || initialDemoData.personalVideoCategories;
  }

  public addPersonalVideoCategory(category: string): string[] {
    const trimmed = category.trim();
    if (!trimmed) return this.getPersonalVideoCategories();
    const categories = this.getPersonalVideoCategories();
    if (!categories.includes(trimmed)) {
      categories.push(trimmed);
      this.data.personalVideoCategories = categories;
      this.save(this.data);
    }
    return this.data.personalVideoCategories;
  }

  public updatePersonalVideoCategory(oldCategory: string, newCategory: string): string[] {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew) return this.getPersonalVideoCategories();
    const categories = this.getPersonalVideoCategories();
    const idx = categories.indexOf(oldCategory);
    if (idx >= 0) {
      categories[idx] = trimmedNew;
      if (this.data.personalVideos) {
        this.data.personalVideos.forEach(v => {
          if (v.category === oldCategory) v.category = trimmedNew;
        });
      }
      this.data.personalVideoCategories = categories;
      this.save(this.data);
    }
    return this.data.personalVideoCategories;
  }

  public deletePersonalVideoCategory(category: string): string[] {
    const categories = this.getPersonalVideoCategories();
    this.data.personalVideoCategories = categories.filter(c => c !== category);
    this.save(this.data);
    return this.data.personalVideoCategories;
  }

  // ---------------- SÉRIES & TV SHOWS CRUD ----------------
  public getSeries(): SeriesShow[] {
    this.syncSeriesWithFolderStructure();
    return this.data.series || [];
  }

  public getSeriesById(id: string): SeriesShow | undefined {
    this.syncSeriesWithFolderStructure();
    return (this.data.series || []).find(s => s.id === id);
  }

  public saveSeries(seriesData: Partial<SeriesShow> & { title: string }): SeriesShow {
    if (!this.data.series) this.data.series = [];
    const id = seriesData.id || 'series-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const existingIdx = this.data.series.findIndex(s => s.id === id);

    const series: SeriesShow = {
      id,
      title: seriesData.title,
      description: seriesData.description || '',
      coverImage: seriesData.coverImage,
      bannerImage: seriesData.bannerImage,
      category: seriesData.category || 'Séries de TV',
      genre: seriesData.genre,
      network: seriesData.network,
      year: seriesData.year,
      status: seriesData.status || 'watching',
      folderId: seriesData.folderId,
      seasons: seriesData.seasons || [],
      rating: seriesData.rating,
      createdAt: seriesData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.data.series[existingIdx] = series;
    } else {
      this.data.series.push(series);
    }

    this.syncSeriesWithFolderStructure();
    this.save(this.data);
    return series;
  }

  public deleteSeries(id: string): boolean {
    if (!this.data.series) return false;
    const initialLen = this.data.series.length;
    this.data.series = this.data.series.filter(s => s.id !== id);
    if (this.data.series.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  public getSeriesCategories(): string[] {
    return this.data.seriesCategories || initialDemoData.seriesCategories;
  }

  public addSeriesCategory(category: string): string[] {
    const trimmed = category.trim();
    if (!trimmed) return this.getSeriesCategories();
    const categories = this.getSeriesCategories();
    if (!categories.includes(trimmed)) {
      categories.push(trimmed);
      this.data.seriesCategories = categories;
      this.save(this.data);
    }
    return this.data.seriesCategories;
  }

  public updateSeriesCategory(oldCategory: string, newCategory: string): string[] {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew) return this.getSeriesCategories();
    const categories = this.getSeriesCategories();
    const idx = categories.indexOf(oldCategory);
    if (idx >= 0) {
      categories[idx] = trimmedNew;
      if (this.data.series) {
        this.data.series.forEach(s => {
          if (s.category === oldCategory) s.category = trimmedNew;
        });
      }
      this.data.seriesCategories = categories;
      this.save(this.data);
    }
    return this.data.seriesCategories;
  }

  public deleteSeriesCategory(category: string): string[] {
    const categories = this.getSeriesCategories();
    this.data.seriesCategories = categories.filter(c => c !== category);
    this.save(this.data);
    return this.data.seriesCategories;
  }

  // ---------------- MÚSICAS & PODCASTS CRUD ----------------
  public getAudioShows(): AudioShow[] {
    this.syncAudioShowsWithFolderStructure();
    return this.data.audioShows || [];
  }

  public getAudioShowById(id: string): AudioShow | undefined {
    this.syncAudioShowsWithFolderStructure();
    return (this.data.audioShows || []).find(a => a.id === id);
  }

  public saveAudioShow(audioData: Partial<AudioShow> & { title: string }): AudioShow {
    if (!this.data.audioShows) this.data.audioShows = [];
    const id = audioData.id || 'audio-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const existingIdx = this.data.audioShows.findIndex(a => a.id === id);

    const show: AudioShow = {
      id,
      title: audioData.title,
      artist: audioData.artist,
      host: audioData.host,
      showType: audioData.showType || 'music_album',
      description: audioData.description || '',
      coverImage: audioData.coverImage,
      category: audioData.category || 'Álbuns de Música',
      genre: audioData.genre,
      folderId: audioData.folderId,
      feedUrl: audioData.feedUrl,
      podcastId: audioData.podcastId,
      lastSyncedAt: audioData.lastSyncedAt || new Date().toISOString(),
      tracks: audioData.tracks || [],
      createdAt: audioData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.data.audioShows[existingIdx] = show;
    } else {
      this.data.audioShows.push(show);
    }

    this.syncAudioShowsWithFolderStructure();
    this.save(this.data);
    return show;
  }

  public deleteAudioShow(id: string): boolean {
    if (!this.data.audioShows) return false;
    const initialLen = this.data.audioShows.length;
    this.data.audioShows = this.data.audioShows.filter(a => a.id !== id);
    if (this.data.audioShows.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  public getOrCreatePodcastFolder(showIdOrShow: string | AudioShow): FolderItem {
    const show = typeof showIdOrShow === 'string' ? this.getAudioShowById(showIdOrShow) : showIdOrShow;
    const allFolders = this.data.folders.filter(f => !f.isTrash);
    
    // 1. If show already has a valid folderId in database that exists in folders, return it
    if (show?.folderId) {
      const existing = allFolders.find(f => f.id === show.folderId);
      if (existing) return existing;
    }

    // 2. Find or create root library folder "Musicas e Podcasts" / "Podcasts" in "Meu Drive"
    const rootAliases = ['musicas e podcasts', 'músicas e podcasts', 'musicas & podcasts', 'músicas & podcasts', 'podcasts', 'músicas', 'musicas'];
    let podcastsRoot = allFolders.find(f => {
      if (f.parentId) return false;
      const normalized = f.name.toLowerCase().replace(/^[^\w\s]+|\s+/g, ' ').trim();
      return rootAliases.some(alias => normalized === alias || normalized.includes(alias));
    });

    if (!podcastsRoot) {
      podcastsRoot = this.createFolder('🎙️ Músicas & Podcasts', null, '#10b981', 'Biblioteca de Músicas e Podcasts');
    }

    const showTitle = show?.title?.trim() || 'Podcast';
    const folderName = `🎙️ ${showTitle}`;

    // 3. Find if a subfolder for this podcast already exists under podcastsRoot or in root
    let podcastFolder = allFolders.find(f => 
      f.parentId === podcastsRoot.id && 
      (f.name.toLowerCase().trim() === folderName.toLowerCase().trim() || f.name.toLowerCase().trim() === showTitle.toLowerCase().trim())
    );

    if (!podcastFolder) {
      podcastFolder = allFolders.find(f => 
        !f.parentId && 
        (f.name.toLowerCase().trim() === folderName.toLowerCase().trim() || f.name.toLowerCase().trim() === showTitle.toLowerCase().trim())
      );
    }

    if (!podcastFolder) {
      podcastFolder = this.createFolder(folderName, podcastsRoot.id, '#10b981', `Episódios salvos do podcast ${showTitle}`);
    }

    // 4. Link folderId to the show in database
    if (show && show.id) {
      show.folderId = podcastFolder.id;
      this.saveAudioShow(show);
    }

    return podcastFolder;
  }

  public getOrCreateCourseFolder(courseTitle: string, parentFolderId?: string): FolderItem {
    const allFolders = this.data.folders.filter(f => !f.isTrash);
    let coursesRoot = parentFolderId ? allFolders.find(f => f.id === parentFolderId) : null;
    
    if (!coursesRoot) {
      const rootAliases = ['cursos & treinamentos', 'cursos e treinamentos', 'cursos', 'treinamentos', 'aulas'];
      coursesRoot = allFolders.find(f => {
        if (f.parentId) return false;
        const normalized = f.name.toLowerCase().replace(/^[^\w\s]+|\s+/g, ' ').trim();
        return rootAliases.some(alias => normalized === alias || normalized.includes(alias));
      });

      if (!coursesRoot) {
        coursesRoot = this.createFolder('🎓 Cursos & Treinamentos', null, '#3b82f6', 'Biblioteca de Cursos e Treinamentos');
      }
    }

    const title = courseTitle?.trim() || 'Curso';
    const folderName = `🎓 ${title}`;

    let courseFolder = allFolders.find(f => 
      f.parentId === coursesRoot!.id && 
      (f.name.toLowerCase().trim() === folderName.toLowerCase().trim() || f.name.toLowerCase().trim() === title.toLowerCase().trim())
    );

    if (!courseFolder) {
      courseFolder = this.createFolder(folderName, coursesRoot.id, '#3b82f6', `Aulas do curso ${title}`);
    }

    return courseFolder;
  }

  public getOrCreateSeriesFolder(seriesTitle: string, parentFolderId?: string): FolderItem {
    const allFolders = this.data.folders.filter(f => !f.isTrash);
    let seriesRoot = parentFolderId ? allFolders.find(f => f.id === parentFolderId) : null;

    if (!seriesRoot) {
      const rootAliases = ['séries & tv shows', 'series & tv shows', 'séries e tv shows', 'series e tv shows', 'séries', 'series'];
      seriesRoot = allFolders.find(f => {
        if (f.parentId) return false;
        const normalized = f.name.toLowerCase().replace(/^[^\w\s]+|\s+/g, ' ').trim();
        return rootAliases.some(alias => normalized === alias || normalized.includes(alias));
      });

      if (!seriesRoot) {
        seriesRoot = this.createFolder('🎬 Séries & TV Shows', null, '#8b5cf6', 'Biblioteca de Séries e TV Shows');
      }
    }

    const title = seriesTitle?.trim() || 'Série';
    const folderName = `🎬 ${title}`;

    let seriesFolder = allFolders.find(f => 
      f.parentId === seriesRoot!.id && 
      (f.name.toLowerCase().trim() === folderName.toLowerCase().trim() || f.name.toLowerCase().trim() === title.toLowerCase().trim())
    );

    if (!seriesFolder) {
      seriesFolder = this.createFolder(folderName, seriesRoot.id, '#8b5cf6', `Episódios da série ${title}`);
    }

    return seriesFolder;
  }

  public getOrCreateVideoFolder(videoTitle?: string, parentFolderId?: string): FolderItem {
    const allFolders = this.data.folders.filter(f => !f.isTrash);
    let videoRoot = parentFolderId ? allFolders.find(f => f.id === parentFolderId) : null;

    if (!videoRoot) {
      const rootAliases = ['filmes & vídeos', 'filmes e vídeos', 'filmes & videos', 'filmes e videos', 'filmes', 'vídeos', 'videos'];
      videoRoot = allFolders.find(f => {
        if (f.parentId) return false;
        const normalized = f.name.toLowerCase().replace(/^[^\w\s]+|\s+/g, ' ').trim();
        return rootAliases.some(alias => normalized === alias || normalized.includes(alias));
      });

      if (!videoRoot) {
        videoRoot = this.createFolder('🎥 Filmes & Vídeos', null, '#f59e0b', 'Biblioteca de Filmes e Vídeos');
      }
    }

    if (videoTitle && videoTitle.trim()) {
      const title = videoTitle.trim();
      const folderName = `🎥 ${title}`;
      let subFolder = allFolders.find(f => 
        f.parentId === videoRoot!.id && 
        (f.name.toLowerCase().trim() === folderName.toLowerCase().trim() || f.name.toLowerCase().trim() === title.toLowerCase().trim())
      );
      if (!subFolder) {
        subFolder = this.createFolder(folderName, videoRoot.id, '#f59e0b', `Vídeos de ${title}`);
      }
      return subFolder;
    }

    return videoRoot;
  }

  public getAudioCategories(): string[] {
    return this.data.audioCategories || initialDemoData.audioCategories;
  }

  public addAudioCategory(category: string): string[] {
    const trimmed = category.trim();
    if (!trimmed) return this.getAudioCategories();
    const categories = this.getAudioCategories();
    if (!categories.includes(trimmed)) {
      categories.push(trimmed);
      this.data.audioCategories = categories;
      this.save(this.data);
    }
    return this.data.audioCategories;
  }

  public updateAudioCategory(oldCategory: string, newCategory: string): string[] {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew) return this.getAudioCategories();
    const categories = this.getAudioCategories();
    const idx = categories.indexOf(oldCategory);
    if (idx >= 0) {
      categories[idx] = trimmedNew;
      if (this.data.audioShows) {
        this.data.audioShows.forEach(a => {
          if (a.category === oldCategory) a.category = trimmedNew;
        });
      }
      this.data.audioCategories = categories;
      this.save(this.data);
    }
    return this.data.audioCategories;
  }

  public deleteAudioCategory(category: string): string[] {
    const categories = this.getAudioCategories();
    this.data.audioCategories = categories.filter(c => c !== category);
    this.save(this.data);
    return this.data.audioCategories;
  }

  // ---------------- ADULT VAULT & SECURITY ----------------
  public hashString(str: string): string {
    return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
  }

  public getAdultVaultStatus(): { isConfigured: boolean; recoveryQuestion?: string; hint?: string } {
    const vs = this.data.adultVaultSettings || { isConfigured: false };
    return {
      isConfigured: !!vs.isConfigured,
      recoveryQuestion: vs.recoveryQuestion,
      hint: vs.hint
    };
  }

  public setupAdultVault(password: string, recoveryQuestion: string, recoveryAnswer: string, hint?: string): boolean {
    if (!password || !recoveryQuestion || !recoveryAnswer) return false;
    this.data.adultVaultSettings = {
      isConfigured: true,
      passwordHash: this.hashString(password),
      recoveryQuestion: recoveryQuestion.trim(),
      recoveryAnswerHash: this.hashString(recoveryAnswer),
      hint: hint?.trim() || undefined,
      updatedAt: new Date().toISOString()
    };
    this.save(this.data);
    return true;
  }

  public verifyAdultPassword(password: string): boolean {
    const vs = this.data.adultVaultSettings;
    if (!vs || !vs.isConfigured || !vs.passwordHash) return false;
    return this.hashString(password) === vs.passwordHash;
  }

  public verifyAndResetAdultPassword(recoveryAnswer: string, newPassword: string): boolean {
    const vs = this.data.adultVaultSettings;
    if (!vs || !vs.isConfigured || !vs.recoveryAnswerHash) return false;
    if (this.hashString(recoveryAnswer) !== vs.recoveryAnswerHash) return false;
    if (!newPassword || newPassword.trim().length === 0) return false;

    vs.passwordHash = this.hashString(newPassword);
    vs.updatedAt = new Date().toISOString();
    this.save(this.data);
    return true;
  }

  public changeAdultVaultSettings(currentPassword: string, newPassword?: string, recoveryQuestion?: string, recoveryAnswer?: string, hint?: string): boolean {
    const vs = this.data.adultVaultSettings;
    if (!vs || !vs.isConfigured) return false;
    if (!this.verifyAdultPassword(currentPassword)) return false;

    if (newPassword && newPassword.trim()) {
      vs.passwordHash = this.hashString(newPassword);
    }
    if (recoveryQuestion && recoveryQuestion.trim()) {
      vs.recoveryQuestion = recoveryQuestion.trim();
    }
    if (recoveryAnswer && recoveryAnswer.trim()) {
      vs.recoveryAnswerHash = this.hashString(recoveryAnswer);
    }
    if (hint !== undefined) {
      vs.hint = hint.trim() || undefined;
    }
    vs.updatedAt = new Date().toISOString();
    this.save(this.data);
    return true;
  }

  // ---------------- ADULT VIDEOS CRUD ----------------
  public getAdultVideos(): AdultVideo[] {
    if (!this.data.adultVideos) this.data.adultVideos = [];
    return this.data.adultVideos;
  }

  public getAdultVideoById(id: string): AdultVideo | undefined {
    return (this.data.adultVideos || []).find(v => v.id === id);
  }

  public createAdultVideosFromFolder(data: {
    folderId: string;
    title?: string;
    description?: string;
    category?: string;
    studio?: string;
    performers?: string;
    aka?: string;
    year?: number;
    coverImage?: string;
  }): AdultVideo[] {
    if (!this.data.adultVideos) this.data.adultVideos = [];
    const folder = this.getFolderById(data.folderId);
    if (!folder) return [];

    const files = this.data.files.filter(f => !f.isTrash);
    const folders = this.data.folders.filter(f => !f.isTrash);

    // Collect all recursive subfolders of folderId
    const subFolderIds = new Set<string>();
    const queue = [data.folderId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = folders.filter(f => f.parentId === currentId);
      for (const child of children) {
        subFolderIds.add(child.id);
        queue.push(child.id);
      }
    }

    // Find all video files inside folder and its subfolders
    const videoFiles = files.filter(f => 
      (f.parentId === data.folderId || subFolderIds.has(f.parentId || '')) &&
      (f.type === 'video' || ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', 'ts', 'flv', 'wmv'].includes(f.extension?.toLowerCase() || ''))
    );

    videoFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const defaultCover = data.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60';
    const defaultCategory = data.category || 'Longas-Metragens';
    const baseFolderCleanName = folder.name.replace(/^[🔞🔥🎬\s]+/, '').trim();

    const createdOrExistingVideos: AdultVideo[] = [];

    if (videoFiles.length === 0) {
      // If no video files found directly, create 1 entry for the folder
      const newVid: AdultVideo = {
        id: 'adult-vid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        title: data.title?.trim() || baseFolderCleanName,
        description: data.description || folder.description || '',
        coverImage: defaultCover,
        category: defaultCategory,
        studio: data.studio?.trim() || undefined,
        performers: data.performers?.trim() || undefined,
        aka: data.aka?.trim() || undefined,
        year: data.year,
        folderId: data.folderId,
        tags: [],
        isFavorite: false,
        lastPositionSeconds: 0,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.adultVideos.push(newVid);
      createdOrExistingVideos.push(newVid);
    } else {
      // Create or link an entry for EACH video file in the folder!
      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i];
        const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/^[🔞🔥🎬\s]+/, '').trim();

        // Check if an AdultVideo already exists with this exact fileId
        let existing = this.data.adultVideos.find(v => v.fileId === file.id);

        if (existing) {
          // Update metadata if provided
          if (data.studio) existing.studio = data.studio.trim();
          if (data.performers) existing.performers = data.performers.trim();
          if (data.aka) existing.aka = data.aka.trim();
          if (data.category) existing.category = data.category;
          if (data.coverImage) existing.coverImage = data.coverImage;
          if (data.year) existing.year = data.year;
          existing.updatedAt = new Date().toISOString();
          createdOrExistingVideos.push(existing);
        } else {
          let itemTitle = cleanFileName;
          if (videoFiles.length === 1 && data.title?.trim()) {
            itemTitle = data.title.trim();
          } else if (data.title?.trim() && data.title.trim() !== baseFolderCleanName) {
            // Custom title prefix if provided by user
            itemTitle = `${data.title.trim()} - ${cleanFileName}`;
          }

          const newVid: AdultVideo = {
            id: 'adult-vid-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substring(2, 7),
            title: itemTitle,
            description: data.description || folder.description || '',
            coverImage: defaultCover,
            category: defaultCategory,
            studio: data.studio?.trim() || undefined,
            performers: data.performers?.trim() || undefined,
            aka: data.aka?.trim() || undefined,
            year: data.year,
            folderId: file.parentId || data.folderId,
            fileId: file.id,
            tags: [],
            isFavorite: false,
            lastPositionSeconds: 0,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          this.data.adultVideos.push(newVid);
          createdOrExistingVideos.push(newVid);
        }
      }
    }

    this.syncAdultVideosWithFolderStructure();
    this.save(this.data);
    return createdOrExistingVideos;
  }

  public createAdultVideo(data: Partial<AdultVideo> & { title: string }): AdultVideo {
    if (!this.data.adultVideos) this.data.adultVideos = [];
    const newVideo: AdultVideo = {
      id: 'adult-vid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: data.title,
      description: data.description,
      coverImage: data.coverImage,
      category: data.category || 'Longas-Metragens',
      studio: data.studio,
      performers: data.performers,
      aka: data.aka?.trim() || undefined,
      year: data.year,
      duration: data.duration,
      durationSeconds: data.durationSeconds,
      folderId: data.folderId,
      fileId: data.fileId,
      tags: data.tags || [],
      isFavorite: !!data.isFavorite,
      lastPositionSeconds: 0,
      isCompleted: false,
      rating: data.rating,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.adultVideos.push(newVideo);
    this.syncAdultVideosWithFolderStructure();
    this.save(this.data);
    return newVideo;
  }

  public updateAdultVideo(video: AdultVideo): AdultVideo {
    if (!this.data.adultVideos) this.data.adultVideos = [];
    const idx = this.data.adultVideos.findIndex(v => v.id === video.id);
    if (idx >= 0) {
      this.data.adultVideos[idx] = {
        ...video,
        updatedAt: new Date().toISOString()
      };
      this.syncAdultVideosWithFolderStructure();
      this.save(this.data);
      return this.data.adultVideos[idx];
    }
    return video;
  }

  public deleteAdultVideo(id: string): boolean {
    if (!this.data.adultVideos) return false;
    const initialLen = this.data.adultVideos.length;
    this.data.adultVideos = this.data.adultVideos.filter(v => v.id !== id);
    if (this.data.adultVideos.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  public updateAdultVideoProgress(videoId: string, seconds: number, isCompleted?: boolean): boolean {
    const video = this.getAdultVideoById(videoId);
    if (!video) return false;
    video.lastPositionSeconds = seconds;
    if (isCompleted !== undefined) {
      video.isCompleted = isCompleted;
    }
    video.updatedAt = new Date().toISOString();
    this.save(this.data);
    return true;
  }

  public toggleAdultVideoFavorite(id: string): boolean {
    const video = this.getAdultVideoById(id);
    if (!video) return false;
    video.isFavorite = !video.isFavorite;
    video.updatedAt = new Date().toISOString();
    this.save(this.data);
    return !!video.isFavorite;
  }

  public getAdultCategories(): string[] {
    if (!this.data.adultCategories || this.data.adultCategories.length === 0) {
      this.data.adultCategories = [
        'Longas-Metragens',
        'Cenas & Clipes',
        'Estúdios',
        'Amador & Autoral',
        'VR & 360°',
        'Paródias',
        'Clássicos',
        'Outros'
      ];
    }
    return this.data.adultCategories;
  }

  public addAdultCategory(category: string): string[] {
    const trimmed = category.trim();
    if (!trimmed) return this.getAdultCategories();
    const categories = this.getAdultCategories();
    if (!categories.includes(trimmed)) {
      categories.push(trimmed);
      this.data.adultCategories = categories;
      this.save(this.data);
    }
    return this.data.adultCategories;
  }

  public updateAdultCategory(oldCategory: string, newCategory: string): string[] {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew) return this.getAdultCategories();
    const categories = this.getAdultCategories();
    const idx = categories.indexOf(oldCategory);
    if (idx >= 0) {
      categories[idx] = trimmedNew;
      if (this.data.adultVideos) {
        this.data.adultVideos.forEach(v => {
          if (v.category === oldCategory) v.category = trimmedNew;
        });
      }
      this.data.adultCategories = categories;
      this.save(this.data);
    }
    return this.data.adultCategories;
  }

  public deleteAdultCategory(category: string): string[] {
    const categories = this.getAdultCategories();
    this.data.adultCategories = categories.filter(c => c !== category);
    this.save(this.data);
    return this.data.adultCategories;
  }

  // ---------------- ADULT PERFORMERS CRUD ----------------
  public getAdultPerformers(): AdultPerformer[] {
    if (!this.data.adultPerformers) this.data.adultPerformers = [];
    return this.data.adultPerformers;
  }

  public getAdultPerformerById(id: string): AdultPerformer | undefined {
    return (this.data.adultPerformers || []).find(p => p.id === id);
  }

  public createAdultPerformer(data: Partial<AdultPerformer> & { name: string }): AdultPerformer {
    if (!this.data.adultPerformers) this.data.adultPerformers = [];
    const newPerformer: AdultPerformer = {
      id: 'performer-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: data.name.trim(),
      aka: data.aka?.trim() || undefined,
      photoUrl: data.photoUrl?.trim() || undefined,
      bio: data.bio?.trim() || undefined,
      gender: data.gender || 'female',
      nationality: data.nationality?.trim() || undefined,
      birthDate: data.birthDate?.trim() || undefined,
      rating: data.rating,
      isFavorite: !!data.isFavorite,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.adultPerformers.push(newPerformer);
    this.save(this.data);
    return newPerformer;
  }

  public updateAdultPerformer(performer: AdultPerformer): AdultPerformer {
    if (!this.data.adultPerformers) this.data.adultPerformers = [];
    const idx = this.data.adultPerformers.findIndex(p => p.id === performer.id);
    if (idx >= 0) {
      this.data.adultPerformers[idx] = {
        ...performer,
        updatedAt: new Date().toISOString()
      };
      this.save(this.data);
      return this.data.adultPerformers[idx];
    }
    return performer;
  }

  public deleteAdultPerformer(id: string): boolean {
    if (!this.data.adultPerformers) return false;
    const initialLen = this.data.adultPerformers.length;
    this.data.adultPerformers = this.data.adultPerformers.filter(p => p.id !== id);
    if (this.data.adultPerformers.length !== initialLen) {
      this.save(this.data);
      return true;
    }
    return false;
  }

  public toggleAdultPerformerFavorite(id: string): boolean {
    const perf = this.getAdultPerformerById(id);
    if (!perf) return false;
    perf.isFavorite = !perf.isFavorite;
    perf.updatedAt = new Date().toISOString();
    this.save(this.data);
    return !!perf.isFavorite;
  }

  // Cloud Sync Manifest export / import
  public exportManifest(): DriveGramSyncManifest {
    this.syncCoursesWithFolderStructure();
    this.syncBooksWithFolderStructure();
    this.syncComicsWithFolderStructure();
    this.syncVideosWithFolderStructure();
    this.syncSeriesWithFolderStructure();
    this.syncAudioShowsWithFolderStructure();
    this.syncAdultVideosWithFolderStructure();
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      account: {
        phone: this.data.settings.telegramSession ? 'Conectado' : undefined
      },
      folders: this.data.folders,
      files: this.data.files,
      courses: this.data.courses,
      books: this.data.books,
      comics: this.data.comics,
      videos: this.data.videos,
      series: this.data.series,
      audioShows: this.data.audioShows,
      adultVideos: this.data.adultVideos,
      adultPerformers: this.data.adultPerformers,
      adultVaultSettings: this.data.adultVaultSettings
    };
  }

  public importManifest(manifest: DriveGramSyncManifest): boolean {
    if (!manifest.folders || !manifest.files) return false;
    this.data.folders = manifest.folders;
    this.data.files = manifest.files;
    if (manifest.courses) this.data.courses = manifest.courses;
    if (manifest.books) this.data.books = manifest.books;
    if (manifest.comics) this.data.comics = manifest.comics;
    if (manifest.videos) this.data.videos = manifest.videos;
    if (manifest.series) this.data.series = manifest.series;
    if (manifest.audioShows) this.data.audioShows = manifest.audioShows;
    if (manifest.adultVideos) this.data.adultVideos = manifest.adultVideos;
    if (manifest.adultPerformers) this.data.adultPerformers = manifest.adultPerformers;
    if (manifest.adultVaultSettings) this.data.adultVaultSettings = manifest.adultVaultSettings;
    this.syncCoursesWithFolderStructure();
    this.syncBooksWithFolderStructure();
    this.syncComicsWithFolderStructure();
    this.syncVideosWithFolderStructure();
    this.syncSeriesWithFolderStructure();
    this.syncAudioShowsWithFolderStructure();
    this.syncAdultVideosWithFolderStructure();
    this.data.settings.lastSyncDate = new Date().toISOString();
    this.save(this.data);
    return true;
  }

  public getStreamingMode(): StreamingMode {
    return this.data.settings.streamingMode || 'cloud_direct';
  }

  public setStreamingMode(mode: StreamingMode) {
    this.data.settings.streamingMode = mode;
    this.save(this.data);
  }

  public getCacheDuration(): CacheDurationConfig {
    return this.data.settings.cacheDuration || {
      value: 24,
      unit: 'hours',
      totalMinutes: 1440
    };
  }

  public setCacheDuration(config: CacheDurationConfig) {
    this.data.settings.cacheDuration = config;
    this.save(this.data);
  }

  public touchFileCachedAt(fileId: string): void {
    const file = this.data.files.find(f => f.id === fileId);
    if (file) {
      file.cachedAt = new Date().toISOString();
      this.save(this.data);
    }
  }

  public purgeExpiredCache(uploadsDir: string): { purgedFiles: number; freedBytes: number } {
    const duration = this.getCacheDuration();
    const maxMinutes = duration.totalMinutes || 1440;
    const now = Date.now();
    let purgedFiles = 0;
    let freedBytes = 0;

    for (let file of this.data.files) {
      if (file.isTrash) continue;
      // Only purge if file has cachedAt and telegram message id exists for safe re-download
      if (file.cachedAt && file.telegramMeta?.messageId) {
        const cachedTime = new Date(file.cachedAt).getTime();
        const diffMinutes = (now - cachedTime) / (1000 * 60);

        if (diffMinutes >= maxMinutes) {
          const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
          const filePath = path.join(uploadsDir, diskFileName);

          if (fs.existsSync(filePath)) {
            try {
              const stat = fs.statSync(filePath);
              freedBytes += stat.size;
              fs.unlinkSync(filePath);
              purgedFiles++;
              file.cachedAt = undefined;
              console.log(`[DriveGram Cache] Auto-purged expired cached file "${file.name}" (${file.id}) after ${diffMinutes.toFixed(1)} mins.`);
            } catch (e) {
              console.error(`[DriveGram Cache] Failed to purge cached file ${file.id}:`, e);
            }
          }
        }
      }
    }

    if (purgedFiles > 0) {
      this.save(this.data);
    }

    return { purgedFiles, freedBytes };
  }

  public clearAllCache(uploadsDir: string): { clearedFiles: number; freedBytes: number } {
    let clearedFiles = 0;
    let freedBytes = 0;

    for (let file of this.data.files) {
      if (file.telegramMeta?.messageId) {
        const diskFileName = file.telegramMeta?.telegramFileName || `${file.id}.${file.extension}`;
        const filePath = path.join(uploadsDir, diskFileName);

        if (fs.existsSync(filePath)) {
          try {
            const stat = fs.statSync(filePath);
            freedBytes += stat.size;
            fs.unlinkSync(filePath);
            clearedFiles++;
            file.cachedAt = undefined;
          } catch (e) {}
        }
      }
    }

    this.save(this.data);
    return { clearedFiles, freedBytes };
  }

  public getLocalCacheSizeBytes(uploadsDir: string): number {
    let total = 0;
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        for (const f of files) {
          const p = path.join(uploadsDir, f);
          try {
            const stat = fs.statSync(p);
            if (stat.isFile()) total += stat.size;
          } catch (e) {}
        }
      } catch (e) {}
    }
    return total;
  }

  public updateSettings(settings: Partial<DatabaseSchema['settings']>) {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save(this.data);
  }
}

export const db = new Database();
