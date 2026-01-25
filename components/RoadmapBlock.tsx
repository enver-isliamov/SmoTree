
import React from 'react';
import { Lock, Check, Zap, Infinity as InfinityIcon } from 'lucide-react';

export const RoadmapBlock: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Active Card - Founder's Club */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group hover:border-green-500/30 transition-all shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
                <div className="w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
            </div>
            
            <div className="flex justify-between items-center mb-6">
                <span className="bg-green-900/30 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-green-500/20 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    Этап 1 (Сейчас)
                </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Клуб основателей</h3>
            <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">€29</span>
                <span className="text-sm text-zinc-500 line-through ml-2">€49</span>
                <span className="text-xs text-green-400 font-medium ml-2 uppercase">Продажа основателя</span>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-green-900/30 text-green-400 mt-0.5"><Check size={12} /></div>
                    <div>
                        <p className="text-sm text-zinc-200 font-medium">Пожизненная лицензия SmoTree V1.X</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Платите один раз. Пользуйтесь вечно. Никаких подписок.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-green-900/30 text-green-400 mt-0.5"><Zap size={12} /></div>
                    <div>
                        <p className="text-sm text-zinc-200 font-medium">Протокол Flash-Loom <span className="text-[9px] bg-zinc-800 px-1 rounded text-zinc-400">CORE</span></p>
                        <p className="text-xs text-zinc-500 mt-0.5">Мгновенная синхронизация комментариев и видео.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-green-900/30 text-green-400 mt-0.5"><InfinityIcon size={12} /></div>
                    <div>
                        <p className="text-sm text-zinc-200 font-medium">Безлимитный доступ</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Нет ограничений на количество проектов для основателей.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 text-xs border-t border-zinc-800/50 pt-4 mt-auto">
                <div className="flex justify-between">
                    <span className="text-zinc-500">Доступность:</span>
                    <span className="text-green-400 font-medium">Первые 150 пользователей</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-500">Статус:</span>
                    <span className="text-green-400 font-bold">Открыто</span>
                </div>
            </div>
        </div>

        {/* Locked Card 1 - Early Adopter */}
        <div className="bg-zinc-950 border border-zinc-800/50 rounded-3xl p-6 relative opacity-60 hover:opacity-80 transition-opacity grayscale hover:grayscale-0">
            <div className="flex justify-between items-center mb-6">
                <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-zinc-700">
                    Фаза 2
                </span>
                <Lock size={16} className="text-zinc-600" />
            </div>
            
            <h3 className="text-xl font-bold text-zinc-300 mb-2">Ранний Последователь</h3>
            <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-zinc-400">€49</span>
                <span className="text-xs text-zinc-600 ml-2">разово</span>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-zinc-800 text-zinc-600 mt-0.5"><Check size={12} /></div>
                    <p className="text-sm text-zinc-400">Доступ к SmoTree V1.X</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-zinc-800 text-zinc-600 mt-0.5"><Check size={12} /></div>
                    <p className="text-sm text-zinc-400">Стандартная поддержка</p>
                </div>
            </div>

            <div className="space-y-2 text-xs border-t border-zinc-800/50 pt-4">
                <div className="flex justify-between">
                    <span className="text-zinc-600">Доступность:</span>
                    <span className="text-zinc-600">Пользователи 151–500</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-600">Статус:</span>
                    <span className="text-zinc-500 flex items-center gap-1"><Lock size={10} /> Заблокировано</span>
                </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-4 leading-relaxed">
                Последний шанс получить ПО без ежемесячной подписки.
            </p>
        </div>

        {/* Locked Card 2 - SaaS */}
        <div className="bg-zinc-950 border border-zinc-800/50 rounded-3xl p-6 relative opacity-60 hover:opacity-80 transition-opacity grayscale hover:grayscale-0">
            <div className="flex justify-between items-center mb-6">
                <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-zinc-700">
                    Фаза 3
                </span>
                <Lock size={16} className="text-zinc-600" />
            </div>
            
            <h3 className="text-xl font-bold text-zinc-300 mb-2">Публичный Запуск SaaS</h3>
            <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-zinc-400">€48</span>
                <span className="text-xs text-zinc-600 ml-2">/год</span>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-zinc-800 text-zinc-600 mt-0.5"><Check size={12} /></div>
                    <p className="text-sm text-zinc-400">Ежемесячная оплата</p>
                </div>
            </div>

            <div className="space-y-2 text-xs border-t border-zinc-800/50 pt-4">
                <div className="flex justify-between">
                    <span className="text-zinc-600">Доступность:</span>
                    <span className="text-zinc-600">Для всех (501+)</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-zinc-600">Статус:</span>
                    <span className="text-zinc-500">Конец 2026 года</span>
                </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-4 leading-relaxed">
                Новые пользователи платят ежемесячно. Учредители не платят ничего.
            </p>
        </div>
    </div>
  );
};
