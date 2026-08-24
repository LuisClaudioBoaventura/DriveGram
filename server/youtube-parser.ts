// server/youtube-parser.ts
// Robust YouTube Channel, Playlist, and Video Parser with Deep Pagination Support (0 API key costs).

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

export function parseDurationStringToSeconds(durationStr: string): number {
  if (!durationStr) return 600;
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
  return 600;
}

export function formatSecondsToDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function cleanHtmlText(raw: string): string {
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
      duration: '10:00',
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
 * Recursively searches for objects matching a key in JSON
 */
function findObjectsWithKey(obj: any, key: string, results: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return results;
  if (obj[key]) {
    results.push(obj[key]);
  }
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      findObjectsWithKey(obj[k], key, results);
    }
  }
  return results;
}

/**
 * Extracts all video objects from any YouTube JSON payload (InitialData or Browse response)
 */
function extractVideosFromPayload(
  payload: any, 
  seenIds: Set<string>, 
  defaultAuthor?: string, 
  listId?: string
): YouTubeVideoItem[] {
  const newVideos: YouTubeVideoItem[] = [];

  // 1. Modern lockupViewModel (YouTube 2024-2026 UI)
  const lockups = findObjectsWithKey(payload, 'lockupViewModel');
  for (const l of lockups) {
    const vid = l.contentId || l.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;
    if (!vid || seenIds.has(vid)) continue;
    if (l.contentType && l.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO' && l.contentType !== 'LOCKUP_CONTENT_TYPE_SHORTS') continue;

    const title = l.metadata?.lockupMetadataViewModel?.title?.content ||
                  l.accessibilityContext?.label ||
                  'Vídeo';

    const thumbSources = l.contentImage?.thumbnailViewModel?.image?.sources;
    const thumb = thumbSources && thumbSources.length > 0 
      ? thumbSources[thumbSources.length - 1].url 
      : `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

    const badges = findObjectsWithKey(l, 'thumbnailOverlayBadgeViewModel');
    let durationStr = '10:00';
    if (badges.length > 0) {
      durationStr = badges[0].thumbnailBadges?.[0]?.thumbnailBadgeViewModel?.text || '10:00';
    }

    seenIds.add(vid);
    newVideos.push({
      id: `yt-${vid}`,
      videoId: vid,
      title: cleanHtmlText(title),
      duration: durationStr,
      durationSeconds: parseDurationStringToSeconds(durationStr),
      thumbnail: thumb,
      author: defaultAuthor,
      url: listId ? `https://www.youtube.com/watch?v=${vid}&list=${listId}` : `https://www.youtube.com/watch?v=${vid}`,
      embedUrl: `https://www.youtube.com/embed/${vid}`
    });
  }

  // 2. Standard videoRenderer
  const videoRenderers = findObjectsWithKey(payload, 'videoRenderer');
  for (const vr of videoRenderers) {
    const vid = vr.videoId;
    if (!vid || seenIds.has(vid)) continue;

    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Vídeo';
    const durationStr = vr.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText ||
                        vr.lengthText?.simpleText ||
                        vr.lengthText?.runs?.[0]?.text || '10:00';
    const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    const author = vr.shortBylineText?.runs?.[0]?.text || vr.ownerText?.runs?.[0]?.text || defaultAuthor;

    seenIds.add(vid);
    newVideos.push({
      id: `yt-${vid}`,
      videoId: vid,
      title: cleanHtmlText(title),
      duration: durationStr,
      durationSeconds: parseDurationStringToSeconds(durationStr),
      thumbnail: thumb,
      author: cleanHtmlText(author || ''),
      url: listId ? `https://www.youtube.com/watch?v=${vid}&list=${listId}` : `https://www.youtube.com/watch?v=${vid}`,
      embedUrl: `https://www.youtube.com/embed/${vid}`
    });
  }

  // 3. Grid gridVideoRenderer
  const gridVideos = findObjectsWithKey(payload, 'gridVideoRenderer');
  for (const vr of gridVideos) {
    const vid = vr.videoId;
    if (!vid || seenIds.has(vid)) continue;

    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Vídeo';
    const durationStr = vr.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText ||
                        vr.lengthText?.simpleText || '10:00';
    const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    const author = vr.shortBylineText?.runs?.[0]?.text || defaultAuthor;

    seenIds.add(vid);
    newVideos.push({
      id: `yt-${vid}`,
      videoId: vid,
      title: cleanHtmlText(title),
      duration: durationStr,
      durationSeconds: parseDurationStringToSeconds(durationStr),
      thumbnail: thumb,
      author: cleanHtmlText(author || ''),
      url: listId ? `https://www.youtube.com/watch?v=${vid}&list=${listId}` : `https://www.youtube.com/watch?v=${vid}`,
      embedUrl: `https://www.youtube.com/embed/${vid}`
    });
  }

  // 4. Playlist playlistVideoRenderer
  const playlistVideos = findObjectsWithKey(payload, 'playlistVideoRenderer');
  for (const vr of playlistVideos) {
    const vid = vr.videoId;
    if (!vid || seenIds.has(vid)) continue;

    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Vídeo';
    const durationStr = vr.lengthText?.simpleText || vr.lengthText?.runs?.[0]?.text || '10:00';
    const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    const author = vr.shortBylineText?.runs?.[0]?.text || defaultAuthor;

    seenIds.add(vid);
    newVideos.push({
      id: `yt-${vid}`,
      videoId: vid,
      title: cleanHtmlText(title),
      duration: durationStr,
      durationSeconds: parseDurationStringToSeconds(durationStr),
      thumbnail: thumb,
      author: cleanHtmlText(author || ''),
      url: listId ? `https://www.youtube.com/watch?v=${vid}&list=${listId}` : `https://www.youtube.com/watch?v=${vid}`,
      embedUrl: `https://www.youtube.com/embed/${vid}`
    });
  }

  // 5. Compact compactVideoRenderer
  const compactVideos = findObjectsWithKey(payload, 'compactVideoRenderer');
  for (const vr of compactVideos) {
    const vid = vr.videoId;
    if (!vid || seenIds.has(vid)) continue;

    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || 'Vídeo';
    const durationStr = vr.lengthText?.simpleText || vr.lengthText?.runs?.[0]?.text || '10:00';
    const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    const author = vr.shortBylineText?.runs?.[0]?.text || defaultAuthor;

    seenIds.add(vid);
    newVideos.push({
      id: `yt-${vid}`,
      videoId: vid,
      title: cleanHtmlText(title),
      duration: durationStr,
      durationSeconds: parseDurationStringToSeconds(durationStr),
      thumbnail: thumb,
      author: cleanHtmlText(author || ''),
      url: listId ? `https://www.youtube.com/watch?v=${vid}&list=${listId}` : `https://www.youtube.com/watch?v=${vid}`,
      embedUrl: `https://www.youtube.com/embed/${vid}`
    });
  }

  return newVideos;
}

/**
 * Paginates through YouTube continuation tokens via public Innertube browse API
 */
async function paginateYouTubeContinuations(
  initialPayload: any,
  apiKey: string,
  clientVersion: string,
  fetchHeaders: any,
  seenIds: Set<string>,
  maxPages = 60,
  maxVideos = 2500,
  defaultAuthor?: string,
  listId?: string
): Promise<YouTubeVideoItem[]> {
  const allVideos: YouTubeVideoItem[] = [];
  const continuations = findObjectsWithKey(initialPayload, 'continuationCommand');
  let token = continuations.length > 0 ? continuations[0].token : null;
  let page = 1;

  while (token && page < maxPages && seenIds.size < maxVideos) {
    page++;
    try {
      const browseUrl = apiKey
        ? `https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`
        : 'https://www.youtube.com/youtubei/v1/browse';

      const bRes = await fetch(browseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': fetchHeaders['User-Agent'],
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': clientVersion
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: clientVersion,
              hl: 'pt-BR',
              gl: 'BR'
            }
          },
          continuation: token
        })
      });

      if (!bRes.ok) break;

      const bData = await bRes.json();
      const pageVideos = extractVideosFromPayload(bData, seenIds, defaultAuthor, listId);
      if (pageVideos.length === 0) break;

      allVideos.push(...pageVideos);

      const nextContinuations = findObjectsWithKey(bData, 'continuationCommand');
      token = nextContinuations.length > 0 ? nextContinuations[0].token : null;
    } catch (err) {
      console.warn(`Pagination error on page ${page}:`, err);
      break;
    }
  }

  return allVideos;
}

/**
 * Main parser function: accepts a URL, detects its type, and parses the metadata and all videos
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
  if (playlistId && (!url.includes('/watch?v=') || url.includes('/playlist'))) {
    try {
      const playlistPageUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
      const pageRes = await fetch(playlistPageUrl, { headers: fetchHeaders });
      const html = await pageRes.text();

      let apiKey = '';
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || html.match(/innertubeApiKey":"([^"]+)"/);
      if (apiKeyMatch) apiKey = apiKeyMatch[1];

      const clientVersionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || html.match(/clientVersion":"([^"]+)"/);
      const clientVersion = clientVersionMatch ? clientVersionMatch[1] : '2.20260820.08.00';

      const ytData = extractYtInitialData(html);
      let playlistTitle = 'Playlist do YouTube';
      let playlistAuthor = 'YouTube';
      let playlistDesc = '';
      let playlistCover = `https://i.ytimg.com/vi/${videoId || 'default'}/maxresdefault.jpg`;
      const seenIds = new Set<string>();
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
        const microformat = ytData.microformat?.microformatDataRenderer;
        if (microformat?.title) playlistTitle = cleanHtmlText(microformat.title);
        if (microformat?.description) playlistDesc = cleanHtmlText(microformat.description);
        if (microformat?.thumbnail?.thumbnails?.[0]?.url) {
          playlistCover = microformat.thumbnail.thumbnails.slice(-1)[0].url;
        }

        const initialVideos = extractVideosFromPayload(ytData, seenIds, playlistAuthor, playlistId);
        videos.push(...initialVideos);

        // Paginate all remaining pages in the playlist
        const paginatedVideos = await paginateYouTubeContinuations(
          ytData,
          apiKey,
          clientVersion,
          fetchHeaders,
          seenIds,
          60,
          2500,
          playlistAuthor,
          playlistId
        );
        videos.push(...paginatedVideos);
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
      // Fetch channel videos tab
      const targetUrl = url.endsWith('/videos') ? url : `${url.replace(/\/$/, '')}/videos`;
      const res = await fetch(targetUrl, { headers: fetchHeaders });
      const html = await res.text();

      let apiKey = '';
      const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || html.match(/innertubeApiKey":"([^"]+)"/);
      if (apiKeyMatch) apiKey = apiKeyMatch[1];

      const clientVersionMatch = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || html.match(/clientVersion":"([^"]+)"/);
      const clientVersion = clientVersionMatch ? clientVersionMatch[1] : '2.20260820.08.00';

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
      const seenIds = new Set<string>();
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

        // Extract initial page of videos
        const initialVideos = extractVideosFromPayload(ytData, seenIds, channelTitle);
        videos.push(...initialVideos);

        // Paginate through all channel videos (up to 2500)
        const paginatedVideos = await paginateYouTubeContinuations(
          ytData,
          apiKey,
          clientVersion,
          fetchHeaders,
          seenIds,
          60,
          2500,
          channelTitle
        );
        videos.push(...paginatedVideos);
      }

      // If ytInitialData gave 0 videos, fallback to official channel RSS
      if (channelId && videos.length === 0) {
        try {
          const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
          const rssRes = await fetch(rssUrl, { headers: fetchHeaders });
          if (rssRes.ok) {
            const xml = await rssRes.text();
            const parsedRss = parseYouTubeRssXml(xml);
            for (const v of parsedRss.videos) {
              if (!seenIds.has(v.videoId)) {
                seenIds.add(v.videoId);
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
