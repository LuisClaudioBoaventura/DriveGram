import { GoogleBookSearchResultItem, GoogleBookDetail } from '../types/index.js';

const GOOGLE_BOOKS_STORAGE_KEY = 'drivegram_google_books_api_key';

export function getStoredGoogleBooksApiKey(): string {
  try {
    return localStorage.getItem(GOOGLE_BOOKS_STORAGE_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setStoredGoogleBooksApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(GOOGLE_BOOKS_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GOOGLE_BOOKS_STORAGE_KEY);
    }
  } catch (e) {}
}

export interface SearchGoogleBooksParams {
  query: string;
  apiKey?: string;
  lang?: string;
  signal?: AbortSignal;
}

export async function searchGoogleBooks(params: SearchGoogleBooksParams): Promise<{ results: GoogleBookSearchResultItem[]; error?: string }> {
  const { query, apiKey, lang, signal } = params;
  const trimmed = query.trim();
  if (!trimmed) return { results: [] };

  const effectiveApiKey = apiKey || getStoredGoogleBooksApiKey();

  // 1. Try local Express backend endpoint
  try {
    const backendUrl = new URL('/api/google-books/search', window.location.origin);
    backendUrl.searchParams.set('query', trimmed);
    if (effectiveApiKey) backendUrl.searchParams.set('apiKey', effectiveApiKey);
    if (lang) backendUrl.searchParams.set('lang', lang);

    const res = await fetch(backendUrl.toString(), { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return { results: data.results };
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') throw e;
    console.warn('[GoogleBooksService] Backend proxy search failed, trying direct query:', e);
  }

  // 2. Direct browser fetch fallback (Google Books API)
  try {
    const gUrl = new URL('https://www.googleapis.com/books/v1/volumes');
    gUrl.searchParams.set('q', trimmed);
    gUrl.searchParams.set('maxResults', '15');
    if (lang) gUrl.searchParams.set('langRestrict', lang);
    if (effectiveApiKey) gUrl.searchParams.set('key', effectiveApiKey);

    const res = await fetch(gUrl.toString(), { signal });
    if (res.ok) {
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        const results: GoogleBookSearchResultItem[] = data.items.map((item: any) => {
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

          if (!coverImage && isbnObj?.identifier) {
            coverImage = `https://covers.openlibrary.org/b/isbn/${isbnObj.identifier}-L.jpg?default=false`;
          }

          return {
            id: item.id,
            title: info.title || '',
            subtitle: info.subtitle || '',
            authors: info.authors || [],
            publisher: info.publisher || '',
            publishedDate: info.publishedDate || '',
            year: info.publishedDate ? info.publishedDate.split('-')[0] : '',
            description: info.description || '',
            pageCount: info.pageCount,
            categories: info.categories || [],
            language: info.language || 'pt',
            coverImage: coverImage || undefined,
            isbn: isbnObj?.identifier,
            previewLink: info.previewLink,
            infoLink: info.infoLink,
            source: 'google_books' as const
          };
        });

        if (results.length > 0) {
          return { results };
        }
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') throw e;
    console.warn('[GoogleBooksService] Direct Google Books query failed:', e);
  }

  // 3. Fallback to Open Library
  try {
    const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=15`;
    const res = await fetch(olUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data.docs && Array.isArray(data.docs)) {
        const results: GoogleBookSearchResultItem[] = data.docs.map((doc: any) => {
          const coverId = doc.cover_i;
          const isbn = Array.isArray(doc.isbn) ? doc.isbn[0] : undefined;
          let coverImage = '';
          if (coverId) {
            coverImage = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
          } else if (isbn) {
            coverImage = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
          }

          return {
            id: doc.key ? doc.key.replace('/works/', '') : `ol-${Date.now()}`,
            title: doc.title || '',
            subtitle: doc.subtitle || '',
            authors: doc.author_name || [],
            publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
            publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : '',
            year: doc.first_publish_year ? String(doc.first_publish_year) : '',
            description: doc.first_sentence?.[0] || '',
            pageCount: doc.number_of_pages_median,
            categories: Array.isArray(doc.subject) ? doc.subject.slice(0, 3) : [],
            language: Array.isArray(doc.language) ? doc.language[0] : 'por',
            coverImage: coverImage || undefined,
            isbn,
            source: 'open_library' as const
          };
        });

        return { results };
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') throw e;
  }

  return { results: [], error: 'Nenhum livro encontrado com este termo.' };
}
