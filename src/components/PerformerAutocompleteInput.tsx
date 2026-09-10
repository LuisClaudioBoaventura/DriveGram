import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Star, X, Check } from 'lucide-react';
import { AdultPerformer } from '../types/index.js';

interface PerformerAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  performersList?: AdultPerformer[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const PerformerAutocompleteInput: React.FC<PerformerAutocompleteInputProps> = ({
  value,
  onChange,
  performersList = [],
  placeholder = 'Ex: Nome 1, Nome 2',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Parse currently selected tokens from the comma-separated string
  const selectedTokens = useMemo(() => {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  // Determine active segment/query being typed at the end of the string
  const activeQuery = useMemo(() => {
    const parts = value.split(',');
    return parts[parts.length - 1].trim();
  }, [value]);

  // Filter registered performers based on activeQuery
  const suggestions = useMemo(() => {
    if (!performersList || performersList.length === 0) return [];

    const lowerTokens = selectedTokens.map((t) => t.toLowerCase());

    // If no query typed yet in current segment, suggest top registered performers not yet added
    if (!activeQuery) {
      return performersList
        .filter((p) => !lowerTokens.includes(p.name.toLowerCase()))
        .sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 10);
    }

    const q = activeQuery.toLowerCase();
    return performersList
      .filter((p) => {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesAka = p.aka ? p.aka.toLowerCase().includes(q) : false;
        const alreadyAdded = lowerTokens.includes(p.name.toLowerCase());
        return (matchesName || matchesAka) && !alreadyAdded;
      })
      .sort((a, b) => {
        // Exact prefix match first
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 15);
  }, [performersList, activeQuery, selectedTokens]);

  // Reset keyboard selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(suggestions.length > 0 ? 0 : -1);
  }, [suggestions]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle selecting a performer
  const handleSelectPerformer = (performer: AdultPerformer) => {
    const parts = value.split(',');
    // Pop the last incomplete part
    parts.pop();
    const existing = parts.map((p) => p.trim()).filter(Boolean);
    existing.push(performer.name);
    const newValue = existing.join(', ') + ', ';
    onChange(newValue);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Remove a performer chip
  const handleRemoveToken = (indexToRemove: number) => {
    const newTokens = selectedTokens.filter((_, idx) => idx !== indexToRemove);
    const hasTrailingComma = value.endsWith(',') || value.endsWith(', ');
    const newValue = newTokens.join(', ') + (newTokens.length > 0 && hasTrailingComma ? ', ' : '');
    onChange(newValue);
  };

  // Handle keyboard events on input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    } else if (e.key === 'Enter') {
      if (isOpen && selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSelectPerformer(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current && selectedIndex >= 0) {
      const activeElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input container */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-gray-400 pointer-events-none">
          <User className="w-3.5 h-3.5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Limpar elenco"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Selected Performer Chips */}
      {selectedTokens.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTokens.map((token, idx) => {
            const matched = performersList.find(
              (p) =>
                p.name.toLowerCase() === token.toLowerCase() ||
                (p.aka && p.aka.toLowerCase() === token.toLowerCase())
            );

            return (
              <span
                key={`${token}-${idx}`}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                  matched
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {matched?.photoUrl ? (
                  <img
                    src={matched.photoUrl}
                    alt={matched.name}
                    className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <User className="w-3 h-3 shrink-0 opacity-60" />
                )}

                <span className="truncate max-w-[140px]">{token}</span>

                {matched?.isFavorite && (
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveToken(idx)}
                  className="p-0.5 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                  title={`Remover ${token}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && performersList.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 duration-150">
          {/* Dropdown Header */}
          <div className="px-3 py-1.5 bg-gray-50 dark:bg-drive-darkBg border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <span>
              {activeQuery
                ? `Resultados para "${activeQuery}" (${suggestions.length})`
                : 'Atores Cadastrados'}
            </span>
            <span className="text-[9px] font-normal lowercase opacity-70">
              clique ou enter para escolher
            </span>
          </div>

          {/* Suggestions List */}
          <div ref={listRef} className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 sidebar-scrollbar">
            {suggestions.length > 0 ? (
              suggestions.map((performer, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={performer.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectPerformer(performer);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {performer.photoUrl ? (
                        <img
                          src={performer.photoUrl}
                          alt={performer.name}
                          className="w-7 h-7 rounded-full object-cover border border-rose-500/30 shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 border border-rose-500/20">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5 font-bold truncate">
                          <span>{performer.name}</span>
                          {performer.isFavorite && (
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          )}
                        </div>
                        {performer.aka && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                            AKA: {performer.aka}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                      {performer.gender && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium capitalize">
                          {performer.gender === 'female'
                            ? 'Feminino'
                            : performer.gender === 'male'
                            ? 'Masculino'
                            : performer.gender === 'trans'
                            ? 'Trans'
                            : performer.gender}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-rose-500" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-gray-400 dark:text-gray-500">
                Nenhum ator cadastrado encontrado para "{activeQuery}".
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Você pode continuar digitando para salvar como texto livre.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};