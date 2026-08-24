import React, { useState, useRef, useEffect } from 'react';
import { 
  Headphones, 
  Play, 
  Search, 
  Plus, 
  Sparkles, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Music2, 
  Mic, 
  Disc,
  Clock,
  Calendar,
  Send,
  Radio,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { AudioShow, AudioTrack, FolderItem } from '../types/index.js';
import { fetchAndParsePodcastRss } from '../utils/podcastRssParser.js';

interface AudioCatalogProps {
  audioShows: AudioShow[];
  categories: string[];
  folders: FolderItem[];
  onSelectShow: (show: AudioShow, initialTrackIndex?: number) => void;
  onOpenNewModal: () => void;
  onEditShow?: (show: AudioShow) => void;
  onDeleteShow?: (id: string) => void;
}

interface RecentEpisodeItem {
  show: AudioShow;
  track: AudioTrack;
  trackIndex: number;
  pubDate: Date;
  pubDateFormatted: string;
}

/**
 * Robust parser for various podcast release date formats:
 * - ISO 8601 ("2026-08-20T14:30:00Z")
 * - RFC 2822 ("Wed, 19 Aug 2026 14:00:00 +0000" or "19 Aug 2026 14:00:00 GMT")
 * - Brazilian ("19/08/2026")
 * - Title regex matching
 */
function parseEpisodePublicationDate(track: AudioTrack): Date | null {
  if (track.releaseDate) {
    const raw = track.releaseDate.trim();
    
    // Direct Date parsing
    const d1 = new Date(raw);
    if (!isNaN(d1.getTime())) {
      return d1;
    }

    // Clean RFC 2822 day prefixes (e.g. "Wed, ")
    const cleaned = raw.replace(/^[a-zA-Z]+,s*/, '').trim();
    const d2 = new Date(cleaned);
    if (!isNaN(d2.getTime())) {
      return d2;
    }
  }

  // Regex check on title (e.g. "#123 - 20/08/2026" or "Episódio 2026-08-15")
  if (track.title) {
    const isoMatch = track.title.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
      if (!isNaN(d.getTime())) return d;
    }

    const brMatch = track.title.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brMatch) {
      const d = new Date(`${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Recente';
  } else if (diffDays === 0) {
    return 'Hoje';
  } else if (diffDays === 1) {
    return 'Ontem';
  } else if (diffDays < 7 && diffDays > 1) {
    return `Há ${diffDays} dias`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Há ${weeks} sem.`;
  } else {
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

export const AudioCatalog: React.FC<AudioCatalogProps> = ({
  audioShows,
  categories,
  onSelectShow,
  onOpenNewModal,
  onEditShow,
  onDeleteShow
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'music_album' | 'podcast' | 'playlist'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const recentScrollRef = useRef<HTMLDivElement>(null);
  const [isAutoSyncingDates, setIsAutoSyncingDates] = useState(false);

  // ---------------- AUTO-HEAL DATES FOR PODCASTS WITHOUT RELEASE DATES ----------------
  useEffect(() => {
    const healPodcastsWithoutDates = async () => {
      if (!onEditShow) return;

      for (const show of audioShows) {
        if (show.showType !== 'podcast' || !show.tracks || show.tracks.length === 0) continue;

        // Check if any tracks lack releaseDate
        const tracksWithoutDates = show.tracks.filter(t => !t.releaseDate);
        if (tracksWithoutDates.length > 0 && show.tracks.length > 0) {
          try {
            // Strategy 1: Try iTunes lookup if numeric ID or show title
            let updatedEpisodes: any[] = [];

            // If show id is numeric iTunes ID or we can query by show title
            const isItunesId = /^\d+$/.test(show.id.replace(/^itunes-/, ''));
            if (isItunesId) {
              const cleanId = show.id.replace(/^itunes-/, '');
              const res = await fetch(`https://itunes.apple.com/lookup?id=${cleanId}&entity=podcastEpisode&limit=60`);
              if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 1) {
                  const itunesEpisodes = data.results.slice(1);
                  const updatedTracks = show.tracks.map(t => {
                    if (t.releaseDate) return t;
                    const match = itunesEpisodes.find((ep: any) => 
                      ep.trackName === t.title || 
                      ep.episodeUrl === t.audioUrl ||
                      ep.previewUrl === t.audioUrl
                    );
                    if (match && match.releaseDate) {
                      return { ...t, releaseDate: match.releaseDate };
                    }
                    return t;
                  });

                  if (updatedTracks.some(t => t.releaseDate)) {
                    await onEditShow({ ...show, tracks: updatedTracks });
                    continue;
                  }
                }
              }
            }

            // Strategy 2: If show description or genre or RSS available
            // Check if we can search by podcast title to get feedUrl and release dates
            const searchRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(show.title)}&media=podcast&entity=podcast&limit=3`);
            if (searchRes.ok) {
              const sData = await searchRes.json();
              const foundPodcast = (sData.results || []).find((p: any) => 
                p.collectionName?.toLowerCase().includes(show.title.toLowerCase()) || 
                show.title.toLowerCase().includes(p.collectionName?.toLowerCase())
              );

              if (foundPodcast) {
                // Fetch lookup episodes with releaseDate
                const epRes = await fetch(`https://itunes.apple.com/lookup?id=${foundPodcast.collectionId}&entity=podcastEpisode&limit=60`);
                if (epRes.ok) {
                  const epData = await epRes.json();
                  if (epData.results && epData.results.length > 1) {
                    const itunesEps = epData.results.slice(1);
                    const updatedTracks = show.tracks.map((t, idx) => {
                      if (t.releaseDate) return t;
                      const matchedEp = itunesEps.find((ep: any) => 
                        ep.trackName?.trim().toLowerCase() === t.title.trim().toLowerCase() ||
                        ep.episodeUrl === t.audioUrl ||
                        ep.previewUrl === t.audioUrl
                      ) || itunesEps[idx];

                      if (matchedEp && matchedEp.releaseDate) {
                        return { ...t, releaseDate: matchedEp.releaseDate };
                      }
                      return t;
                    });

                    if (updatedTracks.some(t => t.releaseDate)) {
                      await onEditShow({ ...show, tracks: updatedTracks });
                    }
                  }
                }
              }
            }
          } catch (healErr) {
            console.warn(`Could not auto-heal dates for podcast ${show.title}:`, healErr);
          }
        }
      }
    };

    healPodcastsWithoutDates();
  }, [audioShows.length]);

  // ---------------- GATHER RECENT EPISODES (LAST 2 MONTHS) ----------------
  const now = new Date();
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const twoMonthsAgoMs = twoMonthsAgo.getTime();

  const recentEpisodes: RecentEpisodeItem[] = [];

  audioShows.forEach(show => {
    if (show.showType === 'podcast' || show.tracks?.some(t => t.releaseDate)) {
      (show.tracks || []).forEach((track, trackIndex) => {
        // Parse the genuine publication date
        const epDate = parseEpisodePublicationDate(track);

        if (epDate) {
          // Strictly filter only episodes within the last 2 months
          if (epDate.getTime() >= twoMonthsAgoMs) {
            recentEpisodes.push({
              show,
              track,
              trackIndex,
              pubDate: epDate,
              pubDateFormatted: formatRelativeDate(epDate)
            });
          }
        }
      });
    }
  });

  // Sort STRICTLY by real publication date descending (newest to oldest across all podcasts)
  recentEpisodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  const handleScrollRecent = (direction: 'left' | 'right') => {
    if (recentScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      recentScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filter shows
  const filteredShows = audioShows.filter(show => {
    const matchesSearch = show.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (show.artist && show.artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (show.host && show.host.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (show.genre && show.genre.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || show.showType === selectedType;
    const matchesCat = selectedCategory === 'all' || show.category === selectedCategory;

    return matchesSearch && matchesType && matchesCat;
  });

  const totalShows = audioShows.length;
  const totalTracks = audioShows.reduce((acc, s) => acc + (s.tracks?.length || 0), 0);
  const totalAlbums = audioShows.filter(s => s.showType === 'music_album').length;
  const totalPodcasts = audioShows.filter(s => s.showType === 'podcast').length;

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-4 sm:p-6 space-y-6">
      {/* Standardized Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-emerald-700/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <Headphones className="w-80 h-80" />
        </div>

        <div className="space-y-2.5 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-emerald-200 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            <span>Músicas, Álbuns & Podcasts</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight py-1 drop-shadow-sm">
            Músicas & Podcasts
          </h1>

          <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
            Ouça suas músicas, discografias completas e podcasts favoritos com reprodutor de áudio dedicado, streaming online e backup direto na nuvem Telegram.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Adicionar Álbum / Podcast</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full md:w-auto z-10">
          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Disc className="w-4 h-4 text-emerald-300 mb-1" />
            <span className="text-base font-black">{totalShows}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Coleções</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Music2 className="w-4 h-4 text-teal-300 mb-1" />
            <span className="text-base font-black">{totalTracks}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Faixas</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Disc className="w-4 h-4 text-sky-300 mb-1" />
            <span className="text-base font-black">{totalAlbums}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Álbuns</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Mic className="w-4 h-4 text-purple-300 mb-1" />
            <span className="text-base font-black">{totalPodcasts}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Podcasts</span>
          </div>
        </div>
      </div>

      {/* ================= CARD: NOVOS EPISÓDIOS (ORDEM REAL DE PUBLICAÇÃO) ================= */}
      {recentEpisodes.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent border border-amber-500/20 dark:border-amber-500/15 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-gray-100">
                    Novos Episódios
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold tracking-wider uppercase">
                    Ordem Real de Publicação
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {recentEpisodes.length} {recentEpisodes.length === 1 ? 'episódio lançado nos últimos 2 meses' : 'episódios lançados nos últimos 2 meses'} em ordem cronológica de publicação
                </p>
              </div>
            </div>

            {/* Carousel Scroll Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleScrollRecent('left')}
                className="p-2 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-amber-500 text-gray-600 dark:text-gray-300 hover:text-amber-500 shadow-xs transition-all active:scale-95"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScrollRecent('right')}
                className="p-2 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-amber-500 text-gray-600 dark:text-gray-300 hover:text-amber-500 shadow-xs transition-all active:scale-95"
                title="Próximo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrolling Episodes Cards */}
          <div
            ref={recentScrollRef}
            className="flex items-stretch gap-3.5 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
            style={{ scrollbarWidth: 'none' }}
          >
            {recentEpisodes.map((item, idx) => {
              return (
                <div
                  key={`${item.show.id}-${item.track.id}-${idx}`}
                  onClick={() => onSelectShow(item.show, item.trackIndex)}
                  className="w-72 sm:w-80 p-3.5 rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200/80 dark:border-drive-darkBorder hover:border-amber-500/60 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between shrink-0 snap-start cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    {/* Podcast Cover */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-md bg-black/60 shrink-0 border border-gray-200 dark:border-gray-700">
                      <img
                        src={item.show.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                        alt={item.show.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="overflow-hidden flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] truncate max-w-[140px]">
                          🎙️ {item.show.title}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight group-hover:text-amber-500 transition-colors" title={item.track.title}>
                        {item.track.title}
                      </h4>

                      {(item.show.artist || item.show.host) && (
                        <p className="text-[10px] text-gray-400 truncate">
                          {item.show.artist || item.show.host}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Metadata & Play Pill */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-drive-darkBorder/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold text-[10px]">
                        <Calendar className="w-3 h-3 text-amber-500" />
                        <span>{item.pubDateFormatted}</span>
                      </span>

                      {item.track.fileId && (
                        <span className="flex items-center gap-1 text-sky-500 font-bold text-[10px]" title="Salvo no Telegram">
                          <Send className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 font-mono text-[10px]">
                        {item.track.duration || '45:00'}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-emerald-600 group-hover:bg-amber-500 text-white flex items-center justify-center transition-colors shadow-xs">
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-drive-darkSurface p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por álbum, artista, podcast..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Type Selector (Álbuns / Podcasts / Playlists) */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedType === 'all' ? 'bg-white dark:bg-drive-darkSurface text-emerald-500 shadow-sm' : 'text-gray-500'}`}
          >
            <span>Todos</span>
          </button>
          <button
            onClick={() => setSelectedType('music_album')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedType === 'music_album' ? 'bg-white dark:bg-drive-darkSurface text-emerald-500 shadow-sm' : 'text-gray-500'}`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Álbuns</span>
          </button>
          <button
            onClick={() => setSelectedType('podcast')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedType === 'podcast' ? 'bg-white dark:bg-drive-darkSurface text-emerald-500 shadow-sm' : 'text-gray-500'}`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Podcasts</span>
          </button>
          <button
            onClick={() => setSelectedType('playlist')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedType === 'playlist' ? 'bg-white dark:bg-drive-darkSurface text-emerald-500 shadow-sm' : 'text-gray-500'}`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Playlists</span>
          </button>
        </div>
      </div>

      {/* Shows Grid (1:1 Square Album/Podcast Cards) */}
      {filteredShows.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredShows.map(show => {
            const tracksCount = show.tracks?.length || 0;
            const completedCount = (show.tracks || []).filter(t => t.isCompleted).length;

            return (
              <div
                key={show.id}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300"
              >
                {/* Square Cover Art */}
                <div
                  onClick={() => onSelectShow(show)}
                  className="relative aspect-square w-full overflow-hidden bg-black/60 cursor-pointer select-none"
                >
                  <img
                    src={show.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                    alt={show.title}
                    draggable={false}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-black uppercase shadow">
                      {show.showType === 'podcast' ? 'Podcast' : show.showType === 'playlist' ? 'Playlist' : 'Álbum'}
                    </span>
                  </div>

                  {/* Play Hover Trigger */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                    <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/50">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* Edit/Delete Overlay Actions */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    {onEditShow && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditShow(show);
                        }}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-emerald-600 text-white shadow transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteShow && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir "${show.title}"?`)) {
                            onDeleteShow(show.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white shadow transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Info Body */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                  <div>
                    <h3
                      onClick={() => onSelectShow(show)}
                      className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate hover:text-emerald-500 cursor-pointer transition-colors"
                      title={show.title}
                    >
                      {show.title}
                    </h3>
                    {(show.artist || show.host) && (
                      <p className="text-[10px] text-gray-400 truncate">
                        {show.artist || show.host}
                      </p>
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
                    <span>{tracksCount} {tracksCount === 1 ? 'faixa' : 'faixas'}</span>
                    {completedCount > 0 && (
                      <span className="text-emerald-500 font-bold">
                        {completedCount}/{tracksCount} ouvidos
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Headphones className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base">Nenhum álbum ou podcast catalogado</h3>
          <p className="text-xs text-gray-500 max-w-md">
            Adicione podcasts via busca online, feed RSS ou vincule pastas de áudio do seu Drive.
          </p>
          <button
            onClick={onOpenNewModal}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all"
          >
            Adicionar Primeiro Álbum / Podcast
          </button>
        </div>
      )}
    </div>
  );
};
