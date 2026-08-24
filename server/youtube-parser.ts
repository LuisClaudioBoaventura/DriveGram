// server/youtube-parser.ts
// Robust YouTube Channel, Playlist, and Video Parser without requiring an API key.

export interface YouTubeVideoItem {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  author?: string;
  channelId?: string;
  publishedAt?: string;
  url: string;
  embedUrl: string;
}

export interface YouTubeParsedResult {
  type: 'playlist' | 'channel' | 'video';
  id: string;
  title: string;
  description: string;
  author: string;
  channelId?: string;
  coverImage: string;
  bannerImage?: string;
  videoCount: number;
  totalDurationSeconds: number;
  videos: YouTubeVideoItem[];
}

function parseDurationStringToSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.trim().split(':').map(p => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

function formatSecondsToDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function cleanHtmlText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Extracts YouTube Playlist ID
 */
export function extractYouTubePlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
}

/**
 * Parses a YouTube RSS XML feed into videos
 */
export function parseYouTubeRssXml(xml: string): { title?: string; author?: string; channelId?: string; videos: YouTubeVideoItem[] } {
  const videos: YouTubeVideoItem[] = [];
  
  const feedTitleMatch = xml.match(/<title>([^<]+)<\/title>/i);
  const feedAuthorMatch = xml.match(/<author>\s*<name>([^<]+)<\/name>/i);
  const feedChannelIdMatch = xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/i);

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let entryMatch;
  let index = 1;

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entryXml = entryMatch[1];
    const videoIdMatch = entryXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
    if (!videoIdMatch) continue;
    const videoId = videoIdMatch[1];

    const titleMatch = entryXml.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? cleanHtmlText(titleMatch[1]) : `Vídeo ${index}`;

    const descMatch = entryXml.match(/<media:description>([\s\S]*?)<\/media:description>/i);
    const description = descMatch ? cleanHtmlText(descMatch[1]) : '';

    const pubDateMatch = entryXml.match(/<published>([^<]+)<\/published>/i);
    const publishedAt = pubDateMatch ? pubDateMatch[1] : undefined;

    const authorMatch = entryXml.match(/<author>\s*<name>([^<]+)<\/name>/i);
    const author = authorMatch ? cleanHtmlText(authorMatch[1]) : (feedAuthorMatch ? cleanHtmlText(feedAuthorMatch[1]) : undefined);

    const thumbMatch = entryXml.match(/<media:thumbnail\s+[^>]*url="([^"]+)"/i);
    const thumbnail = thumbMatch ? thumbMatch[1] : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    videos.push({
      id: `yt-${videoId}`,
      videoId,
      title,
      description,
      duration: '10:00', // standard fallback for RSS
      durationSeconds: 600,
      thumbnail,
      author,
      channelId: feedChannelIdMatch ? feedChannelIdMatch[1] : undefined,
      publishedAt,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    });

    index++;
  }

  return {
    title: feedTitleMatch ? cleanHtmlText(feedTitleMatch[1]) : undefined,
    author: feedAuthorMatch ? cleanHtmlText(feedAuthorMatch[1]) : undefined,
    channelId: feedChannelIdMatch ? feedChannelIdMatch[1] : undefined,
    videos
  };
}

/**
 * Extracts ytInitialData JSON object from YouTube HTML page
 */
function extractYtInitialData(html: string): any | null {
  try {
    const patterns = [
      /var ytInitialData = ({[\s\S]*?});<\/script>/,
      /window\["ytInitialData"\] = ({[\s\S]*?});<\/script>/,
      /ytInitialData = ({[\s\S]*?});/
    ];
    for (const pat of patterns) {
      const match = html.match(pat);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    }
  } catch (e) {
    console.warn('Failed to parse ytInitialData JSON:', e);
  }
  return null;
}

/**
 * Recursively searches for objects matching a predicate in JSON
 */
function findObjectsWithKey(obj: any, key: string, results: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return results;
  if (obj[key]) {
    results.push(obj[key]);
  }
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'object') {
      findObjectsWithKey(obj[k], key, results);
    }
  }
  return results;
}

/**
 * Main parser function: accepts a URL, detects its type, and parses the metadata and videos
 */
export async function parseYouTubeUrl(rawUrl: string): Promise<YouTubeParsedResult> {
  const url = rawUrl.trim();
  if (!url) {
    throw new Error('URL do YouTube inválida ou vazia.');
  }

  const playlistId = extractYouTubePlaylistId(url);
  const videoId = extractYouTubeVideoId(url);

  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };

  // ==========================================
  // CASE 1: PLAYLIST
  // ==========================================
  if (playlistId && !url.includes('/watch?v=') || (playlistId && url.includes('/playlist'))) {
    try {
      const playlistPageUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
      const pageRes = await fetch(playlistPageUrl, { headers: fetchHeaders });
      const html = await pageRes.text();

      const ytData = extractYtInitialData(html);
      let playlistTitle = 'Playlist do YouTube';
      let playlistAuthor = 'YouTube';
      let playlistDesc = '';
      let playlistCover = `https://i.ytimg.com/vi/${videoId || 'default'}/maxresdefault.jpg`;
      const videos: YouTubeVideoItem[] = [];

      // Extract metadata from page
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        playlistTitle = cleanHtmlText(titleMatch[1].replace('- YouTube', ''));
      }

      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
      if (imageMatch) {
        playlistCover = imageMatch[1];
      }

      if (ytData) {
        // Extract playlist header
        const microformat = ytData.microformat?.microformatDataRenderer;
        if (microformat?.title) playlistTitle = cleanHtmlText(microformat.title);
        if (microformat?.description) playlistDesc = cleanHtmlText(microformat.description);
        if (microformat?.thumbnail?.thumbnails?.[0]?.url) {
          playlistCover = microformat.thumbnail.thumbnails.slice(-1)[0].url;
        }

        // Find all playlistVideoRenderer items
        const videoRenderers = findObjectsWithKey(ytData, 'playlistVideoRenderer');
        for (const item of videoRenderers) {
          if (!item.videoId) continue;
          const vid = item.videoId;
          const title = item.title?.runs?.[0]?.text || item.title?.simpleText || 'Vídeo';
          const durationStr = item.lengthText?.simpleText || item.lengthText?.runs?.[0]?.text || '00:00';
          const durationSec = parseDurationStringToSeconds(durationStr);
          const author = item.shortBylineText?.runs?.[0]?.text || playlistAuthor;
          
          let thumb = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
          if (item.thumbnail?.thumbnails?.length > 0) {
            thumb = item.thumbnail.thumbnails.slice(-1)[0].url;
          }

          videos.push({
            id: `yt-${vid}`,
            videoId: vid,
            title: cleanHtmlText(title),
            duration: durationStr,
            durationSeconds: durationSec,
            thumbnail: thumb,
            author: cleanHtmlText(author),
            url: `https://www.youtube.com/watch?v=${vid}&list=${playlistId}`,
            embedUrl: `https://www.youtube.com/embed/${vid}`
          });
        }
      }

      // If scraping ytInitialData yielded 0 items, try playlist RSS fallback
      if (videos.length === 0) {
        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
          const rssRes = await fetch(rssUrl, { headers: fetchHeaders });
          if (rssRes.ok) {
            const xml = await rssRes.text();
            const parsedRss = parseYouTubeRssXml(xml);
            if (parsedRss.videos.length > 0) {
              videos.push(...parsedRss.videos);
              if (parsedRss.title) playlistTitle = parsedRss.title;
              if (parsedRss.author) playlistAuthor = parsedRss.author;
            }
          }
        } catch (e) {}
      }

      if (videos.length > 0) {
        if (!playlistCover && videos[0].thumbnail) {
          playlistCover = videos[0].thumbnail;
        }
        const totalDurationSeconds = videos.reduce((acc, v) => acc + v.durationSeconds, 0);

        return {
          type: 'playlist',
          id: playlistId,
          title: playlistTitle,
          description: playlistDesc,
          author: playlistAuthor,
          coverImage: playlistCover,
          videoCount: videos.length,
          totalDurationSeconds,
          videos
        };
      }
    } catch (e: any) {
      console.warn('Playlist extraction error, falling back to video/rss:', e);
    }
  }

  // ==========================================
  // CASE 2: CHANNEL / USER
  // ==========================================
  const isChannelUrl = url.includes('/@') || url.includes('/channel/') || url.includes('/c/') || url.includes('/user/');
  if (isChannelUrl) {
    try {
      // Step 1: Fetch channel HTML
      const targetUrl = url.endsWith('/videos') ? url : `${url.replace(/\/$/, '')}/videos`;
      const res = await fetch(targetUrl, { headers: fetchHeaders });
      const html = await res.text();

      let channelId = '';
      const channelIdMatch = html.match(/<meta itemprop="channelId" content="([^"]+)"/i) ||
                             html.match(/<link rel="alternate" type="application\/rss\+xml" title="RSS" href="https:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id=([^"]+)"/i) ||
                             html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);

      if (channelIdMatch) {
        channelId = channelIdMatch[1];
      }

      let channelTitle = 'Canal do YouTube';
      let channelDesc = '';
      let channelAvatar = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
      let channelBanner = '';
      const videos: YouTubeVideoItem[] = [];

      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (titleMatch) channelTitle = cleanHtmlText(titleMatch[1]);

      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
      if (imageMatch) channelAvatar = imageMatch[1];

      const ytData = extractYtInitialData(html);
      if (ytData) {
        const header = ytData.header?.c4TabbedHeaderRenderer || ytData.header?.pageHeaderRenderer;
        if (header?.title?.runs?.[0]?.text || header?.title?.simpleText) {
          channelTitle = cleanHtmlText(header.title.runs?.[0]?.text || header.title.simpleText);
        }
        if (header?.avatar?.thumbnails?.length > 0) {
          channelAvatar = header.avatar.thumbnails.slice(-1)[0].url;
        }
        if (header?.banner?.thumbnails?.length > 0) {
          channelBanner = header.banner.thumbnails.slice(-1)[0].url;
        }

        // Find videoRenderers or gridVideoRenderers
        const gridVideos = findObjectsWithKey(ytData, 'gridVideoRenderer');
        const standardVideos = findObjectsWithKey(ytData, 'videoRenderer');
        const richVideos = findObjectsWithKey(ytData, 'compactVideoRenderer');
        const allItems = [...gridVideos, ...standardVideos, ...richVideos];

        for (const item of allItems) {
          if (!item.videoId) continue;
          const vid = item.videoId;
          if (videos.some(v => v.videoId === vid)) continue;

          const title = item.title?.runs?.[0]?.text || item.title?.simpleText || 'Vídeo';
          const durationStr = item.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)
            ?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText ||
            item.lengthText?.simpleText ||
            item.lengthText?.runs?.[0]?.text ||
            '10:00';
          const durationSec = parseDurationStringToSeconds(durationStr);

          let thumb = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
          if (item.thumbnail?.thumbnails?.length > 0) {
            thumb = item.thumbnail.thumbnails.slice(-1)[0].url;
          }

          videos.push({
            id: `yt-${vid}`,
            videoId: vid,
            title: cleanHtmlText(title),
            duration: durationStr,
            durationSeconds: durationSec,
            thumbnail: thumb,
            author: channelTitle,
            channelId,
            url: `https://www.youtube.com/watch?v=${vid}`,
            embedUrl: `https://www.youtube.com/embed/${vid}`
          });
        }
      }

      // If ytInitialData gave few or no videos, fallback to official channel RSS
      if (channelId && videos.length < 5) {
        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          const rssRes = await fetch(rssUrl, { headers: fetchHeaders });
          if (rssRes.ok) {
            const xml = await rssRes.text();
            const parsedRss = parseYouTubeRssXml(xml);
            for (const v of parsedRss.videos) {
              if (!videos.some(existing => existing.videoId === v.videoId)) {
                videos.push(v);
              }
            }
          }
        } catch (e) {}
      }

      if (videos.length > 0) {
        const totalDurationSeconds = videos.reduce((acc, v) => acc + v.durationSeconds, 0);

        return {
          type: 'channel',
          id: channelId || url,
          title: channelTitle,
          description: channelDesc,
          author: channelTitle,
          channelId,
          coverImage: channelAvatar,
          bannerImage: channelBanner,
          videoCount: videos.length,
          totalDurationSeconds,
          videos
        };
      }
    } catch (e: any) {
      console.warn('Channel parsing error:', e);
    }
  }

  // ==========================================
  // CASE 3: SINGLE VIDEO (OR EMBED)
  // ==========================================
  if (videoId) {
    try {
      // Use official OEmbed API for clean, fast video data
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      
      let videoTitle = `Vídeo ${videoId}`;
      let authorName = 'YouTube';
      let thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

      if (oembedRes.ok) {
        const oembedData: any = await oembedRes.json();
        videoTitle = oembedData.title || videoTitle;
        authorName = oembedData.author_name || authorName;
        thumbnail = oembedData.thumbnail_url || thumbnail;
      }

      const singleVideo: YouTubeVideoItem = {
        id: `yt-${videoId}`,
        videoId,
        title: cleanHtmlText(videoTitle),
        duration: '15:00',
        durationSeconds: 900,
        thumbnail,
        author: cleanHtmlText(authorName),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      };

      return {
        type: 'video',
        id: videoId,
        title: cleanHtmlText(videoTitle),
        description: '',
        author: cleanHtmlText(authorName),
        coverImage: thumbnail,
        videoCount: 1,
        totalDurationSeconds: 900,
        videos: [singleVideo]
      };
    } catch (e: any) {
      throw new Error(`Falha ao obter metadados do vídeo do YouTube: ${e.message}`);
    }
  }

  throw new Error('Não foi possível identificar o link do YouTube. Certifique-se de que o link é de uma Playlist, Canal ou Vídeo.');
}
