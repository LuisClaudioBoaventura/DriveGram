import React, { useState } from 'react';
import { 
  User, 
  X, 
  Play, 
  Star, 
  Edit3, 
  Trash2, 
  Film, 
  Sparkles, 
  CheckCircle2, 
  Shuffle, 
  Flame, 
  Globe2,
  Crop,
  Sliders
} from 'lucide-react';
import { AdultPerformer, AdultVideo } from '../types/index.js';
import { ImageCropModal } from './ImageCropModal.js';

interface PerformerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  performer: AdultPerformer | null;
  videos: AdultVideo[];
  onSelectVideo: (video: AdultVideo, playlist?: AdultVideo[]) => void;
  onEditPerformer?: (performer: AdultPerformer) => void;
  onDeletePerformer?: (id: string) => void;
  onToggleFavorite?: (id: string) => Promise<boolean>;
  onUpdatePerformer?: (performer: AdultPerformer) => Promise<void>;
  isDiscreetMode?: boolean;
}

export const PerformerDetailModal: React.FC<PerformerDetailModalProps> = ({
  isOpen,
  onClose,
  performer,
  videos,
  onSelectVideo,
  onEditPerformer,
  onDeletePerformer,
  onToggleFavorite,
  onUpdatePerformer,
  isDiscreetMode = false
}) => {
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  if (!isOpen || !performer) return null;

  // Filter videos featuring this performer by matching name or AKA
  const performerVideos = videos.filter(v => {
    const pName = performer.name.toLowerCase();
    const pAka = performer.aka ? performer.aka.toLowerCase() : '';

    const matchPerformers = v.performers && (
      v.performers.toLowerCase().includes(pName) ||
      (pAka && v.performers.toLowerCase().includes(pAka))
    );

    const matchTags = v.tags && v.tags.some(t => {
      const lower = t.toLowerCase();
      return lower.includes(pName) || (pAka && lower.includes(pAka));
    });

    const matchTitle = v.title.toLowerCase().includes(pName) || (pAka && v.title.toLowerCase().includes(pAka));

    return matchPerformers || matchTags || matchTitle;
  });

  const handlePlayAll = (shuffle = false) => {
    if (performerVideos.length === 0) return;
    const list = shuffle ? [...performerVideos].sort(() => Math.random() - 0.5) : performerVideos;
    onSelectVideo(list[0], list);
    onClose();
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    if (onUpdatePerformer) {
      await onUpdatePerformer({
        ...performer,
        photoUrl: croppedDataUrl,
        updatedAt: new Date().toISOString()
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 select-none">
        <div className="relative w-full max-w-4xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
          {/* Header Cover / Hero Card */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-br from-rose-950/70 via-red-950/40 to-black text-white shrink-0 border-b border-gray-800">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Actor Photo */}
              <div className="relative flex flex-col items-center gap-2 shrink-0">
                <div 
                  onClick={() => setIsCropModalOpen(true)}
                  className="relative w-28 sm:w-36 aspect-square rounded-3xl overflow-hidden border-2 border-rose-500/50 shadow-2xl bg-black cursor-pointer group"
                  title="Clique para ajustar o enquadramento da foto"
                >
                  <img
                    src={performer.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                    alt={performer.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                    <Crop className="w-4 h-4" />
                    <span>Ajustar</span>
                  </div>
                  {performer.isFavorite && (
                    <div className="absolute top-2 right-2 p-1.5 rounded-xl bg-amber-500 text-black shadow-md z-10">
                      <Star className="w-3.5 h-3.5 fill-black" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/10 transition-all"
                  title="Ajustar enquadramento e zoom da foto"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Ajustar Foto</span>
                </button>
              </div>

              {/* Info & Details */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider">
                    Ficha do Ator / Performer
                  </span>
                  {performer.gender && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold capitalize">
                      {performer.gender === 'female' ? 'Feminino' : performer.gender === 'male' ? 'Masculino' : performer.gender}
                    </span>
                  )}
                  {performer.nationality && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold flex items-center gap-1">
                      <Globe2 className="w-3 h-3" />
                      <span>{performer.nationality}</span>
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {performer.name}
                </h1>

                {performer.aka && (
                  <p className="text-xs text-rose-300 font-bold">
                    AKA: <span className="text-gray-300 font-normal">{performer.aka}</span>
                  </p>
                )}

                {performer.bio && (
                  <p className="text-xs text-gray-400 max-w-xl line-clamp-2 leading-relaxed">
                    {performer.bio}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  {performerVideos.length > 0 && (
                    <button
                      onClick={() => handlePlayAll(false)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Reproduzir Todos ({performerVideos.length})</span>
                    </button>
                  )}

                  {performerVideos.length > 1 && (
                    <button
                      onClick={() => handlePlayAll(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95"
                      title="Reproduzir em ordem aleatória"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Aleatório</span>
                    </button>
                  )}

                  {onToggleFavorite && (
                    <button
                      onClick={() => onToggleFavorite(performer.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                        performer.isFavorite
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-white/10 border-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${performer.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      <span>{performer.isFavorite ? 'Favoritado ⭐' : 'Favoritar'}</span>
                    </button>
                  )}

                  {onEditPerformer && (
                    <button
                      onClick={() => {
                        onEditPerformer(performer);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Ficha</span>
                    </button>
                  )}

                  {onDeletePerformer && (
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a ficha de "${performer.name}"?`)) {
                          onDeletePerformer(performer.id);
                          onClose();
                        }
                      }}
                      className="p-2.5 rounded-2xl bg-white/10 hover:bg-rose-600/50 text-gray-300 hover:text-white transition-colors"
                      title="Excluir Ficha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Gallery of Videos with this Performer */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Galeria de Vídeos ({performerVideos.length})
                </h3>
              </div>
              <span className="text-xs text-gray-500">
                Vídeos no Red Locker com {performer.name}
              </span>
            </div>

            {performerVideos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {performerVideos.map(video => (
                  <div
                    key={video.id}
                    onClick={() => {
                      onSelectVideo(video, performerVideos);
                      onClose();
                    }}
                    className="group relative flex flex-col rounded-2xl overflow-hidden bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:border-rose-500/50 hover:shadow-xl transition-all cursor-pointer"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
                      <img
                        src={video.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'}
                        alt={video.title}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          isDiscreetMode ? 'blur-md group-hover:blur-none' : ''
                        }`}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>
                      </div>
                      {video.category && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[9px] font-black uppercase">
                          {video.category}
                        </span>
                      )}
                      {video.isFavorite && (
                        <div className="absolute top-2 right-2 p-1 rounded-md bg-amber-500 text-black">
                          <Star className="w-3 h-3 fill-black" />
                        </div>
                      )}
                    </div>

                    <div className="p-2.5">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-rose-500 transition-colors">
                        {video.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 block truncate mt-0.5">
                        {video.studio || video.year || '+18'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 dark:bg-drive-darkBg rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 space-y-2">
                <Film className="w-8 h-8 text-gray-400" />
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Nenhum vídeo vinculado ainda
                </h4>
                <p className="text-[11px] text-gray-500 max-w-sm">
                  Ao cadastrar ou editar um vídeo no Red Locker, inclua <strong>"{performer.name}"</strong> no campo Elenco para que ele apareça automaticamente aqui nesta galeria.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Crop Modal for Performer Profile */}
      {isCropModalOpen && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          imageSrc={performer.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
          onClose={() => setIsCropModalOpen(false)}
          onCropComplete={handleCropComplete}
          aspectRatio="circle"
        />
      )}
    </>
  );
};
