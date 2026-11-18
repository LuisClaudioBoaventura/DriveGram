import { useState, useEffect, useCallback, useRef } from 'react';
import { RecipeVideo } from '../types/index.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';

const DEFAULT_RECIPE_CATEGORIES = [
  'Doces & Sobremesas',
  'Massas & Risotos',
  'Carnes & Aves',
  'Airfryer',
  'Lanches & Salgados',
  'Pães & Bolos',
  'Saudável & Fit',
  'Bebidas & Drinks',
  'Molhos & Dicas',
  'Outros'
];

export function useRecipes() {
  const [recipes, setRecipes] = useState<RecipeVideo[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_RECIPE_CATEGORIES);
  const [activeRecipe, setActiveRecipe] = useState<RecipeVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const pendingDeletedIdsRef = useRef<Set<string>>(new Set());

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/recipes'));
      if (res.ok) {
        const rawData: RecipeVideo[] = await res.json();
        const data = rawData.filter(r => !pendingDeletedIdsRef.current.has(r.id));
        setRecipes(data);
        setActiveRecipe(prev => prev ? (data.find((r: RecipeVideo) => r.id === prev.id) || null) : (data[0] || null));
      }
    } catch (e) {
      console.warn('Backend unavailable for recipes');
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(resolveApiUrl('/api/recipe-categories'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchRecipes();
    fetchCategories();
  }, [fetchRecipes, fetchCategories]);

  const addCategory = async (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/recipe-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: trimmed })
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
      }
    } catch (e) {
      setCategories(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    }
  };

  const updateCategory = async (oldCategory: string, newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/recipe-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategory, newCategory: trimmed })
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchRecipes();
      }
    } catch (e) {
      setCategories(prev => prev.map(c => c === oldCategory ? trimmed : c));
    }
  };

  const deleteCategory = async (category: string) => {
    try {
      const res = await fetch(`/api/recipe-categories/${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchRecipes();
      }
    } catch (e) {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };

  const createRecipe = async (recipeData: Partial<RecipeVideo>): Promise<RecipeVideo | null> => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData)
      });
      if (res.ok) {
        const newRecipe: RecipeVideo = await res.json();
        setRecipes(prev => [newRecipe, ...prev]);
        setActiveRecipe(newRecipe);
        return newRecipe;
      }
    } catch (e) {
      console.error('Error creating recipe:', e);
    }
    return null;
  };

  const createRecipeFromFolder = async (params: {
    folderId?: string;
    fileId?: string;
    title: string;
    author?: string;
    sourcePlatform?: 'youtube' | 'instagram' | 'tiktok' | 'local' | 'other';
    sourceUrl?: string;
    videoUrl?: string;
    embedUrl?: string;
    category?: string;
    prepTime?: string;
    servings?: string;
    difficulty?: 'facil' | 'medio' | 'dificil';
    ingredients?: string[];
    instructions?: string;
    description?: string;
    coverImage?: string;
    tags?: string[];
  }): Promise<RecipeVideo | null> => {
    try {
      const res = await fetch('/api/recipes/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const newRecipe: RecipeVideo = await res.json();
        setRecipes(prev => [newRecipe, ...prev]);
        setActiveRecipe(newRecipe);
        return newRecipe;
      }
    } catch (e) {
      console.error('Error creating recipe from folder/link:', e);
    }
    return null;
  };

  const updateRecipe = useCallback(async (updatedRecipe: RecipeVideo): Promise<void> => {
    if (pendingDeletedIdsRef.current.has(updatedRecipe.id)) return;
    setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
    setActiveRecipe(prev => prev?.id === updatedRecipe.id ? updatedRecipe : prev);
    try {
      const res = await fetch(resolveApiUrl(`/api/recipes/${updatedRecipe.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecipe)
      });
      if (res.ok) {
        const saved: RecipeVideo = await res.json();
        setRecipes(prev => prev.map(r => r.id === saved.id ? saved : r));
        setActiveRecipe(prev => prev?.id === saved.id ? saved : prev);
      }
    } catch (e) {
      console.error('Error updating recipe:', e);
    }
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    pendingDeletedIdsRef.current.add(id);
    setRecipes(prev => prev.filter(r => r.id !== id));
    setActiveRecipe(prev => prev?.id === id ? null : prev);
    try {
      const res = await fetch(resolveApiUrl(`/api/recipes/${id}`), { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Falha ao excluir receita no servidor');
      }
    } catch (e) {
      pendingDeletedIdsRef.current.delete(id);
      await fetchRecipes();
      console.error('Error deleting recipe:', e);
      throw e;
    } finally {
      setTimeout(() => {
        pendingDeletedIdsRef.current.delete(id);
      }, 2000);
    }
  }, [fetchRecipes]);

  const toggleFavorite = useCallback(async (id: string) => {
    const target = recipes.find(r => r.id === id);
    if (!target) return;
    await updateRecipe({
      ...target,
      isFavorite: !target.isFavorite,
      updatedAt: new Date().toISOString()
    });
  }, [recipes, updateRecipe]);

  const toggleCompleted = useCallback(async (id: string) => {
    const target = recipes.find(r => r.id === id);
    if (!target) return;
    await updateRecipe({
      ...target,
      isCompleted: !target.isCompleted,
      updatedAt: new Date().toISOString()
    });
  }, [recipes, updateRecipe]);

  const updateProgress = useCallback(async (recipeId: string, seconds: number, isCompleted?: boolean) => {
    if (pendingDeletedIdsRef.current.has(recipeId)) return;
    setRecipes(prev => prev.map(r => {
      if (r.id === recipeId) {
        return {
          ...r,
          lastPositionSeconds: seconds,
          isCompleted: isCompleted !== undefined ? isCompleted : r.isCompleted
        };
      }
      return r;
    }));

    try {
      const res = await fetch(resolveApiUrl(`/api/recipes/${recipeId}`));
      if (res.ok && !pendingDeletedIdsRef.current.has(recipeId)) {
        const target: RecipeVideo = await res.json();
        await fetch(resolveApiUrl(`/api/recipes/${recipeId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...target,
            lastPositionSeconds: seconds,
            isCompleted: isCompleted !== undefined ? isCompleted : target.isCompleted
          })
        });
      }
    } catch (e) {}
  }, []);

  const syncFromDriveRoot = async () => {
    setLoading(true);
    try {
      const res = await fetch(resolveApiUrl('/api/recipes/sync-root'), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.recipes)) {
          setRecipes(data.recipes);
        }
        return data;
      }
    } catch (e) {
      console.error('Error syncing recipes from Drive root:', e);
    } finally {
      setLoading(false);
    }
    return { importedCount: 0, updatedCount: 0, totalRecipes: recipes.length };
  };

  return {
    recipes,
    categories,
    activeRecipe,
    setActiveRecipe,
    loading,
    refresh: fetchRecipes,
    createRecipe,
    createRecipeFromFolder,
    updateRecipe,
    deleteRecipe,
    toggleFavorite,
    toggleCompleted,
    updateProgress,
    addCategory,
    updateCategory,
    deleteCategory,
    syncFromDriveRoot
  };
}
