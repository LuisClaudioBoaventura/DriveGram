import React, { useState } from 'react';
import { 
  GraduationCap, 
  Plus, 
  BookOpen, 
  Play, 
  CheckCircle2, 
  Layers, 
  Trash2, 
  Clock, 
  Sparkles, 
  Search,
  Filter,
  Film,
  Youtube
} from 'lucide-react';
import { Course } from '../types/index.js';

interface CourseCatalogProps {
  courses: Course[];
  onSelectCourse: (course: Course) => void;
  onNewCourse: () => void;
  onDeleteCourse: (id: string) => void;
  onOpenYouTubeModal?: () => void;
}

export const CourseCatalog: React.FC<CourseCatalogProps> = ({
  courses,
  onSelectCourse,
  onNewCourse,
  onDeleteCourse,
  onOpenYouTubeModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean))) as string[];

  const totalCourses = courses.length;
  const totalLessons = courses.reduce((acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0), 0);
  const totalCompletedLessons = courses.reduce((acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.filter(l => l.isCompleted).length, 0), 0);
  const overallProgress = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.category && course.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'all' || course.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-4 sm:p-6 space-y-6">
      {/* Standardized Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-blue-600/30 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <GraduationCap className="w-72 h-72" />
        </div>

        <div className="space-y-2.5 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-blue-100 text-xs font-bold uppercase tracking-wider border border-white/20">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Cursos, Treinamentos & Aulas</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight py-1 drop-shadow-sm">
            Cursos & Estudos
          </h1>

          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Acesse seus treinamentos com índice rápido de aulas, reprodução sequencial e materiais salvos na nuvem Telegram.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onNewCourse}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Curso</span>
            </button>

            {onOpenYouTubeModal && (
              <button
                onClick={onOpenYouTubeModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-900/30 transition-all hover:scale-105 active:scale-95"
              >
                <Youtube className="w-4 h-4" />
                <span>Importar do YouTube</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full md:w-auto z-10">
          <div className="p-3.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[100px]">
            <GraduationCap className="w-4 h-4 text-blue-300 mb-1" />
            <span className="text-lg font-black">{totalCourses}</span>
            <span className="text-[10px] text-blue-200 uppercase font-semibold">Cursos</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[100px]">
            <BookOpen className="w-4 h-4 text-indigo-300 mb-1" />
            <span className="text-lg font-black">{totalLessons}</span>
            <span className="text-[10px] text-indigo-200 uppercase font-semibold">Aulas</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[100px] col-span-2 sm:col-span-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 mb-1" />
            <span className="text-lg font-black">{overallProgress}%</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Progresso</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-drive-darkSurface p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por curso, aula ou assunto..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-blue-500 focus:outline-none"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-drive-darkBg text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Todas ({courses.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-drive-darkBg text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCourses.map((course) => {
            const courseLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
            const completedLessons = course.modules.reduce((acc, m) => acc + m.lessons.filter(l => l.isCompleted).length, 0);
            const progressPercent = courseLessons > 0 ? Math.round((completedLessons / courseLessons) * 100) : 0;

            return (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course)}
                className="group relative flex flex-col rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-blue-500 hover:shadow-xl dark:hover:shadow-black/40 transition-all cursor-pointer overflow-hidden"
              >
                {/* Cover Image */}
                <div className="h-44 bg-gray-100 dark:bg-drive-darkBg relative overflow-hidden">
                  <img
                    src={course.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60'}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20">
                    {course.category || 'Geral'}
                  </span>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newUrl = prompt('Digite a nova URL da Imagem de Capa:', course.coverImage || '');
                        if (newUrl) {
                          fetch(`/api/courses/${course.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...course, coverImage: newUrl.trim() })
                          }).then(() => window.location.reload());
                        }
                      }}
                      className="p-1.5 rounded-full bg-black/40 hover:bg-indigo-600 text-white backdrop-blur-md transition-colors"
                      title="Trocar Imagem de Capa"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCourse(course.id);
                      }}
                      className="p-1.5 rounded-full bg-black/40 hover:bg-rose-600 text-white backdrop-blur-md transition-colors"
                      title="Excluir Curso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                      {courseLessons} Aulas
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {progressPercent}%
                    </span>
                  </div>
                </div>

                {/* Course Info */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-1 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                      {course.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  {/* Progress Bar & Open Button */}
                  <div className="pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mb-3">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Acessar Aulas & Índice</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
            Nenhum curso encontrado
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            {searchQuery || selectedCategory !== 'all' ? 'Nenhum curso corresponde aos filtros selecionados.' : 'Crie seu primeiro curso para organizar módulos, aulas em vídeo e materiais.'}
          </p>
          <button
            onClick={onNewCourse}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Curso</span>
          </button>
        </div>
      )}
    </div>
  );
};
