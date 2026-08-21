import React, { useState, useRef } from 'react';
import { User, X, Image as ImageIcon, Save, Star, Sparkles, Upload, Heart, Crop, Sliders } from 'lucide-react';
import { AdultPerformer } from '../types/index.js';
import { ImageCropModal } from './ImageCropModal.js';

interface PerformerModalProps {
  isOpen: boolean;
  onClose: () => void;
  performer?: AdultPerformer | null;
  onSave: (data: Partial<AdultPerformer> & { name: string }) => Promise<void>;
}

const PRESET_PERFORMER_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80'
];

export const PerformerModal: React.FC<PerformerModalProps> = ({
  isOpen,
  onClose,
  performer,
  onSave
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(performer?.name || '');
  const [aka, setAka] = useState(performer?.aka || '');
  const [photoUrl, setPhotoUrl] = useState(performer?.photoUrl || PRESET_PERFORMER_AVATARS[0]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'trans' | 'other'>(performer?.gender || 'female');
  const [nationality, setNationality] = useState(performer?.nationality || '');
  const [bio, setBio] = useState(performer?.bio || '');
  const [isFavorite, setIsFavorite] = useState(!!performer?.isFavorite);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentActivePhoto = customPhotoUrl.trim() ? customPhotoUrl.trim() : photoUrl;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
        setCustomPhotoUrl('');
        // Automatically open crop adjustment after selecting a custom photo
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setPhotoUrl(croppedDataUrl);
    setCustomPhotoUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave({
        ...(performer ? { id: performer.id } : {}),
        name: name.trim(),
        aka: aka.trim() || undefined,
        photoUrl: currentActivePhoto.trim() || undefined,
        gender,
        nationality: nationality.trim() || undefined,
        bio: bio.trim() || undefined,
        isFavorite
      });
      onClose();
    } catch (err) {
      console.error('Error saving performer:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden my-8">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">
                  {performer ? 'Editar Ficha do Ator / Performer' : 'Novo Ator / Performer'}
                </h2>
                <p className="text-xs text-gray-500">
                  Cadastre a foto, nomes e detalhes do performer no Red Locker
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Photo Preview & Selection */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800">
              <div className="relative flex flex-col items-center gap-1.5 shrink-0">
                <div 
                  onClick={() => setIsCropModalOpen(true)}
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-rose-500/50 shadow-md bg-black cursor-pointer group"
                  title="Clique para ajustar enquadramento e zoom"
                >
                  <img
                    src={currentActivePhoto}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                    <Crop className="w-4 h-4" />
                  </div>
                </div>

                {/* Adjust Photo Button */}
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600/15 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 text-[10px] font-bold transition-all"
                  title="Ajustar zoom, enquadramento e posição"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Ajustar Foto</span>
                </button>
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                    Foto de Perfil
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Ajuste o foco e zoom
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PRESET_PERFORMER_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPhotoUrl(url);
                        setCustomPhotoUrl('');
                      }}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all shrink-0 ${
                        photoUrl === url && !customPhotoUrl ? 'border-rose-500 scale-110 shadow' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customPhotoUrl}
                    onChange={(e) => setCustomPhotoUrl(e.target.value)}
                    placeholder="Ou cole URL da foto..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-drive-darkSurface text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-800 text-xs font-bold hover:bg-gray-300 text-gray-700 dark:text-gray-300"
                  >
                    Upload
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Name & AKA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nome Principal *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nome do Performer"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  AKA / Nomes Alternativos
                </label>
                <input
                  type="text"
                  value={aka}
                  onChange={(e) => setAka(e.target.value)}
                  placeholder="Ex: Nome anterior, pseudônimo..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Gender & Nationality */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Gênero / Categoria
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="female">Feminino (Atriz/Modelo)</option>
                  <option value="male">Masculino (Ator)</option>
                  <option value="trans">Trans / Travesti</option>
                  <option value="other">Outro / Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nacionalidade / Origem
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Ex: Brasil, EUA, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Bio / Observações */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Biografia / Observações
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Informações, estúdios frequentes, notas..."
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
              />
            </div>

            {/* Favorite Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-gray-400'}`} />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Marcar como Performer Favorito
                </span>
              </div>
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Salvando...' : 'Salvar Ficha'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Crop & Adjust Modal */}
      {isCropModalOpen && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          imageSrc={currentActivePhoto}
          onClose={() => setIsCropModalOpen(false)}
          onCropComplete={handleCropComplete}
          aspectRatio="circle"
        />
      )}
    </>
  );
};
