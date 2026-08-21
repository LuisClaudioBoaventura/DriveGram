import { useState, useEffect, useCallback } from 'react';
import { Course, Lesson, CourseModule } from '../types/index.js';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        if (data.length > 0 && !activeCourse) {
          setActiveCourse(data[0]);
          if (data[0].modules?.[0]?.lessons?.[0]) {
            setActiveLesson(data[0].modules[0].lessons[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for courses');
    }
  }, [activeCourse]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const selectCourse = (course: Course) => {
    setActiveCourse(course);
    if (course.modules?.[0]?.lessons?.[0]) {
      setActiveLesson(course.modules[0].lessons[0]);
    } else {
      setActiveLesson(null);
    }
  };

  const selectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
  };

  // Find next lesson in the course hierarchy
  const getNextLesson = useCallback((): Lesson | null => {
    if (!activeCourse || !activeLesson) return null;
    
    let foundCurrent = false;
    for (const module of activeCourse.modules) {
      for (const lesson of module.lessons) {
        if (foundCurrent) {
          return lesson;
        }
        if (lesson.id === activeLesson.id) {
          foundCurrent = true;
        }
      }
    }
    return null;
  }, [activeCourse, activeLesson]);

  // Find previous lesson
  const getPreviousLesson = useCallback((): Lesson | null => {
    if (!activeCourse || !activeLesson) return null;

    let previous: Lesson | null = null;
    for (const module of activeCourse.modules) {
      for (const lesson of module.lessons) {
        if (lesson.id === activeLesson.id) {
          return previous;
        }
        previous = lesson;
      }
    }
    return null;
  }, [activeCourse, activeLesson]);

  // Update whole course
  const updateCourse = async (updatedCourse: Course) => {
    setActiveCourse(updatedCourse);
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    if (activeLesson) {
      const updatedLesson = updatedCourse.modules
        .flatMap(m => m.lessons)
        .find(l => l.id === activeLesson.id);
      if (updatedLesson) setActiveLesson(updatedLesson);
    }

    try {
      await fetch(`/api/courses/${updatedCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCourse)
      });
    } catch (e) {}
  };

  // Toggle lesson completed
  const toggleLessonCompletion = async (lessonId: string) => {
    if (!activeCourse) return;

    const updatedModules = activeCourse.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, isCompleted: !lesson.isCompleted } : lesson
      )
    }));

    const updatedCourse = { ...activeCourse, modules: updatedModules };
    await updateCourse(updatedCourse);
  };

  // Save lesson notes
  const saveLessonNotes = async (lessonId: string, notes: string) => {
    if (!activeCourse) return;

    const updatedModules = activeCourse.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, notes } : lesson
      )
    }));

    const updatedCourse = { ...activeCourse, modules: updatedModules };
    await updateCourse(updatedCourse);
  };

  // Create new course manually
  const createCourse = async (courseData: Partial<Course>) => {
    const newCourse: Course = {
      id: 'course-' + Date.now(),
      title: courseData.title || 'Novo Curso',
      description: courseData.description || '',
      coverImage: courseData.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: courseData.category || 'Geral',
      modules: courseData.modules || [
        {
          id: 'mod-' + Date.now(),
          title: 'Módulo 1: Introdução',
          order: 1,
          lessons: []
        }
      ]
    };

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });
      if (res.ok) {
        const saved = await res.json();
        setCourses(prev => [...prev, saved]);
        setActiveCourse(saved);
        return saved;
      }
    } catch (e) {
      setCourses(prev => [...prev, newCourse]);
      setActiveCourse(newCourse);
      return newCourse;
    }
  };

  // Create course directly from an existing Drive folder
  const createCourseFromFolder = async (folderId: string, title?: string, description?: string, category?: string) => {
    try {
      const res = await fetch('/api/courses/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, title, description, category })
      });
      if (res.ok) {
        const saved = await res.json();
        setCourses(prev => [...prev, saved]);
        selectCourse(saved);
        return saved;
      }
    } catch (e) {
      console.error('Error creating course from folder:', e);
    }
  };

  // Delete course
  const deleteCourse = async (courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    if (activeCourse?.id === courseId) {
      setActiveCourse(null);
      setActiveLesson(null);
    }
    try {
      await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
    } catch (e) {}
  };

  return {
    courses,
    activeCourse,
    activeLesson,
    isAutoPlayEnabled,
    setIsAutoPlayEnabled,
    loading,
    selectCourse,
    selectLesson,
    getNextLesson,
    getPreviousLesson,
    toggleLessonCompletion,
    saveLessonNotes,
    updateCourse,
    createCourse,
    createCourseFromFolder,
    deleteCourse,
    refreshCourses: fetchCourses
  };
}
