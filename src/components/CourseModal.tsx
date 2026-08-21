import React, { useState } from 'react';
import { 
  X, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Layers, 
  Folder, 
  FolderTree, 
  Sparkles, 
  Upload, 
  CheckCircle2,
  FileVideo
} from 'lucide-react';
import { Course, CourseModule, DriveItem, FolderItem } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCourse: (course: Partial<Course>) => Promise<any>;
  onCreateCourseFromFolder?: (folderId: string, title?: string, description?: string, category?: string) => Promise<any>;
  availableFolders: FolderItem[];
  availableFiles: DriveItem[];
}

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  onCreateCourse,
  onCreateCourseFromFolder,
  availableFolders,
  availableFiles
}) => {
  const { rootFolder, folders: eligibleFolders, config: libConfig } = getLibraryEligibleFolders('courses', availableFolders);
  const [creationMode, setCreationMode] = useState<'from_folder' | 'custom'>('from_folder');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  
  // Custom course builder state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Desenvolvimento & Tecnologia');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60');
  const [modules, setModules] = useState<{ title: string; lessons: { title: string; fileId?: string; duration?: string }[] }[]>([
    {
      title: 'Módulo 1: Introdução e Primeiros Passos',
      lessons: [
        { title: '01 - Visão Geral do Treinamento', duration: '12:30' },
        { title: '02 - Configuração das Ferramentas', duration: '18:45' }
      ]
    }
  ]);

  if (!isOpen) return null;

  const handleAddModule = () => {
    setModules([
      ...modules,
      {
        title: `Módulo ${modules.length + 1}: Novo Módulo`,
        lessons: [{ title: '01 - Primeira Aula', duration: '15:00' }]
      }
    ]);
  };

  const handleAddLesson = (modIdx: number) => {
    const updated = [...modules];
    updated[modIdx].lessons.push({
      title: `Aula ${updated[modIdx].lessons.length + 1}`,
      duration: '10:00'
    });
    setModules(updated);
  };

  const handleRemoveModule = (modIdx: number) => {
    setModules(modules.filter((_, i) => i !== modIdx));
  };

  const handleRemoveLesson = (modIdx: number, lessonIdx: number) => {
    const updated = [...modules];
    updated[modIdx].lessons = updated[modIdx].lessons.filter((_, i) => i !== lessonIdx);
    setModules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creationMode === 'from_folder') {
      if (!selectedFolderId) return;
      if (onCreateCourseFromFolder) {
        await onCreateCourseFromFolder(selectedFolderId, title.trim() || undefined, description.trim() || undefined, category);
      } else {
        const folder = availableFolders.find(f => f.id === selectedFolderId);
        const folderVideos = availableFiles.filter(f => f.parentId === selectedFolderId && f.type === 'video');
        await onCreateCourse({
          title: title.trim() || (folder?.name || 'Novo Curso'),
          description: description.trim() || 'Curso gerado da pasta ' + (folder?.name || ''),
          category,
          folderId: selectedFolderId,
          coverImage,
          modules: [
            {
              id: 'mod-' + Date.now(),
              title: folder?.name || 'Módulo 1',
              order: 1,
              lessons: folderVideos.map((v, idx) => ({
                id: 'lesson-' + Date.now() + '-' + idx,
                title: v.name.replace(/\.[^/.]+$/, ""),
                duration: '15:00',
                fileId: v.id,
                order: idx + 1,
                isCompleted: false
              }))
            }
          ]
        });
      }
    } else {
      if (!title.trim()) return;
      const formattedModules: CourseModule[] = modules.map((m, i) => ({
        id: 'mod-' + Date.now() + '-' + i,
        title: m.title,
        order: i + 1,
        lessons: m.lessons.map((l, j) => ({
          id: 'lesson-' + Date.now() + '-' + i + '-' + j,
          title: l.title,
          duration: l.duration || '10:00',
          fileId: l.fileId,
          order: j + 1,
          isCompleted: false
        }))
      }));

      await onCreateCourse({
        title,
        description,
        category,
        coverImage,
        modules: formattedModules
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl p-6 text-gray-800 dark:text-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-drive-darkBorder mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Criar Novo Curso / Treinamento</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Transforme pastas com vídeos em cursos estruturados com índice rápido
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-gray-100 dark:bg-drive-darkBg p-1 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setCreationMode('from_folder')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              creationMode === 'from_folder'
                ? 'bg-white dark:bg-drive-darkSurface text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <FolderTree className="w-4 h-4 text-indigo-500" />
            <span>Importar de Pasta do Drive (Recomendado)</span>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode('custom')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              creationMode === 'custom'
                ? 'bg-white dark:bg-drive-darkSurface text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-500" />
            <span>Criar Estrutura Manual</span>
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: FROM EXISTING FOLDER */}
          {creationMode === 'from_folder' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-indigo-500" />
                    <span>Selecione a Pasta do Curso:</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                    📁 {rootFolder ? rootFolder.name : 'Cursos e Treinamentos'}
                  </span>
                </div>
                
                <select
                  value={selectedFolderId}
                  onChange={(e) => {
                    setSelectedFolderId(e.target.value);
                    const folder = availableFolders.find(f => f.id === e.target.value);
                    if (folder && !title) {
                      setTitle(folder.name.replace(/^[🎓📚🔥🎬🍿\s]+/, '').trim());
                    }
                  }}
                  required
                  className="w-full p-2.5 rounded-xl bg-black text-white border border-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
                >
                  <option value="" className="bg-black text-white">-- Selecione uma pasta em "{rootFolder ? rootFolder.name : 'Cursos e Treinamentos'}" --</option>
                  {eligibleFolders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-black text-white">
                      📁 {f.name}
                    </option>
                  ))}
                </select>

                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  💡 <strong>Automático</strong>: Cada subpasta virará um Módulo e todos os vídeos se tornarão Aulas com índice sequencial instantâneo!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Título Personalizado (Opcional)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nome do Curso"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Descrição do Curso
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição sobre o conteúdo do treinamento..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL BUILDER */}
          {creationMode === 'custom' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Título do Curso
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Formação Engenheiro Cloud & DevOps"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Categoria / Área
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Tecnologia, Negócios, Idiomas..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Descrição / Resumo
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que será ensinado neste treinamento..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  URL da Imagem de Capa
                </label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                />
              </div>

              {/* Modules Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Estrutura de Módulos e Aulas
                  </label>
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Adicionar Módulo
                  </button>
                </div>

                <div className="space-y-3">
                  {modules.map((m, mIdx) => (
                    <div key={mIdx} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => {
                            const updated = [...modules];
                            updated[mIdx].title = e.target.value;
                            setModules(updated);
                          }}
                          className="flex-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveModule(mIdx)}
                          className="p-1 text-gray-400 hover:text-rose-500"
                          title="Remover Módulo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Lessons list inside module */}
                      <div className="pl-4 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1.5 pt-1">
                        {m.lessons.map((l, lIdx) => (
                          <div key={lIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={l.title}
                              onChange={(e) => {
                                const updated = [...modules];
                                updated[mIdx].lessons[lIdx].title = e.target.value;
                                setModules(updated);
                              }}
                              placeholder="Título da Aula"
                              className="flex-1 px-2 py-1 text-[11px] rounded-md bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder"
                            />
                            <input
                              type="text"
                              value={l.duration}
                              onChange={(e) => {
                                const updated = [...modules];
                                updated[mIdx].lessons[lIdx].duration = e.target.value;
                                setModules(updated);
                              }}
                              placeholder="Duração"
                              className="w-16 px-2 py-1 text-[11px] rounded-md bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-center font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveLesson(mIdx, lIdx)}
                              className="text-gray-400 hover:text-rose-500 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddLesson(mIdx)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline pt-1 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Aula neste módulo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-drive-darkBorder">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creationMode === 'from_folder' && !selectedFolderId}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-40"
            >
              {creationMode === 'from_folder' ? 'Gerar Curso da Pasta' : 'Criar Curso Completo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
