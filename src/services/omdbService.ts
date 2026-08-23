import { OMDbMovieDetail, OMDbSearchResultItem } from '../types/index.js';

const OMDB_STORAGE_KEY = 'drivegram_omdb_api_key';

export function getStoredOmdbApiKey(): string {
  try {
    return localStorage.getItem(OMDB_STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setStoredOmdbApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(OMDB_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(OMDB_STORAGE_KEY);
    }
  } catch (e) {}
}

export interface OmdbSearchParams {
  query: string;
  year?: string;
  apiKey?: string;
}

export interface OmdbMovieParams {
  title?: string;
  year?: string;
  imdbId?: string;
  apiKey?: string;
}

export async function searchOmdbMovies(params: OmdbSearchParams): Promise<{
  results: OMDbSearchResultItem[];
  totalResults: number;
  error?: string;
}> {
  try {
    const key = params.apiKey || getStoredOmdbApiKey();
    const queryParams = new URLSearchParams();
    queryParams.set('query', params.query);
    if (params.year) queryParams.set('year', params.year);
    if (key) queryParams.set('apiKey', key);

    const res = await fetch(`/api/omdb/search?${queryParams.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro ao buscar no OMDb' }));
      return { results: [], totalResults: 0, error: err.error || 'Erro na requisição' };
    }

    const data = await res.json();
    return {
      results: data.results || [],
      totalResults: data.totalResults || 0,
      error: data.error
    };
  } catch (error: any) {
    return {
      results: [],
      totalResults: 0,
      error: error.message || 'Falha na conexão com o serviço OMDb'
    };
  }
}

export async function getOmdbMovieDetails(params: OmdbMovieParams): Promise<{
  movie: OMDbMovieDetail | null;
  error?: string;
}> {
  try {
    const key = params.apiKey || getStoredOmdbApiKey();
    const queryParams = new URLSearchParams();
    if (params.title) queryParams.set('title', params.title);
    if (params.year) queryParams.set('year', params.year);
    if (params.imdbId) queryParams.set('imdbId', params.imdbId);
    if (key) queryParams.set('apiKey', key);

    const res = await fetch(`/api/omdb/movie?${queryParams.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Filme não encontrado' }));
      return { movie: null, error: err.error || 'Filme não encontrado' };
    }

    const data: OMDbMovieDetail = await res.json();
    return { movie: data };
  } catch (error: any) {
    return {
      movie: null,
      error: error.message || 'Falha ao buscar detalhes do filme'
    };
  }
}
