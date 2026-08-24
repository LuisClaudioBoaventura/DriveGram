export interface ParsedPodcastRss {
  title: string;
  artist: string;
  host: string;
  description: string;
  coverImage: string;
  category: string;
  genre: string;
  trackCount: number;
  episodes: Array<{
    id: string;
    title: string;
    artist?: string;
    duration: string;
    durationSeconds: number;
    audioUrl: string;
    order: number;
    trackNumber: number;
    releaseDate?: string;
    description?: string;
  }>;
}

export function parsePodcastRssXmlString(xmlText: string): ParsedPodcastRss {
  const getTag = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!match) return '';
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
  };

  const getAttr = (xml: string, tag: string, attr: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["'][^>]*>`, 'i'));
    return match ? match[1].trim() : '';
  };

  const channelMatch = xmlText.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channelXml = channelMatch ? channelMatch[1] : xmlText;

  const title = getTag(channelXml, 'title') || 'Podcast Importado via RSS';
  const author = getTag(channelXml, 'itunes:author') || getTag(channelXml, 'author') || getTag(channelXml, 'dc:creator') || '';
  const description = getTag(channelXml, 'description') || getTag(channelXml, 'itunes:summary') || '';
  
  let coverImage = getAttr(channelXml, 'itunes:image', 'href');
  if (!coverImage) {
    const imageBlock = getTag(channelXml, 'image');
    if (imageBlock) {
      coverImage = getTag(imageBlock, 'url');
    }
  }
  if (!coverImage) {
    coverImage = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';
  }

  const category = getAttr(channelXml, 'itunes:category', 'text') || 'Podcasts';

  const itemMatches = [...channelXml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];
  const episodes: ParsedPodcastRss['episodes'] = [];

  itemMatches.forEach((match, index) => {
    const itemXml = match[1];
    const epTitle = getTag(itemXml, 'title') || `Episódio ${index + 1}`;
    const epAudio = getAttr(itemXml, 'enclosure', 'url') || getAttr(itemXml, 'media:content', 'url');
    
    if (!epAudio) return;

    const epGuid = getTag(itemXml, 'guid') || `ep-rss-${Date.now()}-${index}`;
    const epDurationRaw = getTag(itemXml, 'itunes:duration');
    let durationSeconds = 0;
    let durationStr = '45:00';

    if (epDurationRaw) {
      if (epDurationRaw.includes(':')) {
        const parts = epDurationRaw.split(':').map(Number);
        if (parts.length === 3) {
          durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          durationStr = `${parts[1].toString().padStart(2, '0')}:${parts[2].toString().padStart(2, '0')}`;
        } else if (parts.length === 2) {
          durationSeconds = parts[0] * 60 + parts[1];
          durationStr = `${parts[0].toString().padStart(2, '0')}:${parts[1].toString().padStart(2, '0')}`;
        }
      } else {
        const parsed = parseInt(epDurationRaw, 10);
        if (!isNaN(parsed) && parsed > 0) {
          durationSeconds = parsed;
          const mins = Math.floor(parsed / 60);
          const secs = parsed % 60;
          durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
      }
    }

    const uniqueId = `ep-${index + 1}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    episodes.push({
      id: uniqueId,
      title: epTitle,
      artist: author || undefined,
      duration: durationStr,
      durationSeconds,
      audioUrl: epAudio,
      order: index + 1,
      trackNumber: index + 1,
      releaseDate: getTag(itemXml, 'pubDate'),
      description: getTag(itemXml, 'description') || getTag(itemXml, 'itunes:summary') || ''
    });
  });

  return {
    title,
    artist: author,
    host: author,
    description,
    coverImage,
    category,
    genre: category,
    trackCount: episodes.length,
    episodes
  };
}

export async function fetchAndParsePodcastRss(url: string, signal?: AbortSignal): Promise<{ podcast: any; episodes: any[] }> {
  // Strategy 1: Call local Express backend API
  try {
    const res = await fetch('/api/podcasts/parse-rss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
      signal
    });

    if (res.ok) {
      const data = await res.json();
      if (data.podcast) {
        return data;
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') throw e;
  }

  // Strategy 2: CORS Proxy Fallbacks (avoids direct fetch CORS errors)
  let xmlText = '';
  const proxies = [
    (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    (target: string) => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
    (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`
  ];

  for (const getProxyUrl of proxies) {
    if (xmlText) break;
    try {
      const proxyUrl = getProxyUrl(url.trim());
      const proxyRes = await fetch(proxyUrl, { signal });
      if (proxyRes.ok) {
        const text = await proxyRes.text();
        if (text && (text.includes('<rss') || text.includes('<channel') || text.includes('<feed'))) {
          xmlText = text;
          break;
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
    }
  }

  // Strategy 3: Direct browser fetch only as final fallback
  if (!xmlText) {
    try {
      const directRes = await fetch(url.trim(), { signal });
      if (directRes.ok) {
        xmlText = await directRes.text();
      }
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
    }
  }

  if (!xmlText) {
    throw new Error('Não foi possível baixar o Feed RSS. Verifique se o link está correto e acessível.');
  }

  const parsed = parsePodcastRssXmlString(xmlText);
  return {
    podcast: {
      id: `rss-${Date.now()}`,
      title: parsed.title,
      artist: parsed.artist,
      host: parsed.host,
      coverImage: parsed.coverImage,
      genre: parsed.genre,
      category: parsed.category,
      description: parsed.description,
      feedUrl: url.trim(),
      trackCount: parsed.trackCount
    },
    episodes: parsed.episodes
  };
}
