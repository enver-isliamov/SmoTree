
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, LANGUAGES } from '../services/i18n';
import { Globe, ChevronDown } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs md:text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
      >
        <span className="text-base">{currentLang.flag}</span>
        <span className="hidden md:inline uppercase font-medium">{currentLang.code}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
           {LANGUAGES.map(lang => (
               <button
                 key={lang.code}
                 onClick={() => {
                     setLanguage(lang.code);
                     setIsOpen(false);
                 }}
                 className={`w-full text-left px-4 py-2.5 text-xs md:text-sm flex items-center gap-3 hover:bg-zinc-800 transition-colors ${language === lang.code ? 'bg-zinc-800/50 text-indigo-400' : 'text-zinc-300'}`}
               >
                   <span className="text-lg">{lang.flag}</span>
                   <span className="font-medium">{lang.label}</span>
                   {language === lang.code && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
               </button>
           ))}
        </div>
      )}
    </div>
  );
};
