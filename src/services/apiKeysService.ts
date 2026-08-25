import { searchOmdbMovies } from './omdbService.js';
import { searchGoogleBooks } from './googleBooksService.js';

export interface ApiKeyItem {
  id: 'omdb' | 'google_books' | 'youtube' | 'tmdb';
  name: string;
  category: string;
  description: string;
  storageKey: string;
  placeholder: string;
  docsUrl: string;
  isOptional: boolean;
  tag: string;
}

export const API_SERVICES: ApiKeyItem[] = [
  {
    id: 'omdb',
    name: 'OMDb API (IMDb & Cinema)',
    category: 'Filmes & Séries',
    description: 'Preenchimento automático de notas IMDb, pôsteres em alta resolução, diretores, atores e sinopses.',
    storageKey: 'drivegram_omdb_api_key',
    placeholder: 'Ex: 8a4c12ef ou sua chave de 8 caracteres',
    docsUrl: 'https://www.omdbapi.com/apikey.aspx',
    isOptional: true,
    tag: 'Filmes'
  },
  {
    id: 'google_books',
    name: 'Google Books API',
    category: 'Livros & Audiolivros',
    description: 'Consulta oficial do catálogo Google Books com sinopses, autores, ISBNs, páginas e capas em alta qualidade.',
    storageKey: 'drivegram_google_books_api_key',
    placeholder: 'Ex: AIzaSyD...',
    docsUrl: 'https://developers.google.com/books/docs/v1/using#APIKey',
    isOptional: true,
    tag: 'Livros'
  },
  {
    id: 'youtube',
    name: 'YouTube Data API v3',
    category: 'YouTube Cloud Sync',
    description: 'Chave do Google Cloud para listar canais completos, playlists extensas e transcrições com alta velocidade.',
    storageKey: 'drivegram_youtube_api_key',
    placeholder: 'Ex: AIzaSyB...',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
    isOptional: true,
    tag: 'YouTube'
  },
  {
    id: 'tmdb',
    name: 'The Movie Database (TMDb)',
    category: 'Séries & Animes',
    description: 'Metadados aprofundados para episódios, temporadas, sinopses em português e cartazes de séries.',
    storageKey: 'drivegram_tmdb_api_key',
    placeholder: 'Ex: 4f8b2c...',
    docsUrl: 'https://www.themoviedb.org/settings/api',
    isOptional: true,
    tag: 'Séries'
  }
];

export function getStoredApiKey(storageKey: string): string {
  try {
    return localStorage.getItem(storageKey) || '';
  } catch (e) {
    return '';
  }
}

export function setStoredApiKey(storageKey: string, key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(storageKey, key.trim());
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch (e) {}
}

export function getAllStoredApiKeys(): Record<string, string> {
  const result: Record<string, string> = {};
  API_SERVICES.forEach(service => {
    result[service.id] = getStoredApiKey(service.storageKey);
  });
  return result;
}

export async function testApiKey(serviceId: 'omdb' | 'google_books' | 'youtube' | 'tmdb', key: string): Promise<{ success: boolean; message: string }> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { success: false, message: 'Insira uma chave antes de testar a conexão.' };
  }

  try {
    if (serviceId === 'omdb') {
      const res = await searchOmdbMovies({ query: 'Inception', apiKey: trimmed });
      if (res.error) return { success: false, message: `Erro OMDb: ${res.error}` };
      return { success: true, message: 'Chave OMDb válida! Conexão estabelecida com sucesso.' };
    }

    if (serviceId === 'google_books') {
      const res = await searchGoogleBooks({ query: 'Habitos Atomicos', apiKey: trimmed });
      if (res.error && res.results.length === 0) return { success: false, message: `Erro Google Books: ${res.error}` };
      return { success: true, message: 'Chave Google Books válida! Conexão estabelecida com sucesso.' };
    }

    if (serviceId === 'youtube') {
      const testUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${trimmed}`;
      const res = await fetch(testUrl);
      if (res.ok) {
        return { success: true, message: 'Chave YouTube Data API v3 válida e pronta para uso!' };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err?.error?.message || 'Chave do YouTube inválida ou sem permissão para YouTube Data API v3.' };
      }
    }

    if (serviceId === 'tmdb') {
      const testUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${trimmed}&page=1`;
      const res = await fetch(testUrl);
      if (res.ok) {
        return { success: true, message: 'Chave TMDb válida e conectada com sucesso!' };
      } else {
        return { success: false, message: 'Chave TMDb inválida. Verifique sua API Key na The Movie Database.' };
      }
    }
  } catch (e: any) {
    return { success: false, message: `Falha na requisição: ${e.message || 'Erro de rede'}` };
  }

  return { success: false, message: 'Serviço desconhecido' };
}
