
import React from 'react';
import { Upload, Share2, MessageSquare, Download, Film, Terminal, ArrowRight, Code2, Heart, Zap, Layout, User as UserIcon, Rocket, Shield, Server } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { RoadmapBlock } from './RoadmapBlock';

// Simplified Props - No navigation logic needed inside content components
export const WorkflowPage: React.FC = () => {
    const { t } = useLanguage();
    const steps = [
        { icon: Upload, title: t('page.workflow.step1'), desc: t('page.workflow.step1.desc') },
        { icon: Share2, title: t('page.workflow.step2'), desc: t('page.workflow.step2.desc') },
        { icon: MessageSquare, title: t('page.workflow.step3'), desc: t('page.workflow.step3.desc') },
        { icon: Download, title: t('page.workflow.step4'), desc: t('page.workflow.step4.desc') },
    ];

    return (
        <div className="max-w-5xl mx-auto py-8">
             <h1 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">{t('page.workflow.title')}</h1>
             
             {/* Compact Node-based Workflow */}
             <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 mb-24 relative">
                {steps.map((step, idx) => (
                    <React.Fragment key={idx}>
                        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center hover:border-indigo-500/30 transition-colors group min-w-[200px]">
                             <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors text-zinc-400">
                                 <step.icon size={24} />
                             </div>
                             <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                             <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
                        </div>
                        
                        {idx < steps.length - 1 && (
                            <div className="flex items-center justify-center text-zinc-700">
                                <ArrowRight size={24} className="rotate-90 md:rotate-0 opacity-50" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
             </div>

             {/* Section 2: Technical Docs */}
             <div className="border-t border-zinc-900 pt-12">
                 <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                    <Terminal size={24} className="text-indigo-500"/>
                    {t('page.docs.title')}
                 </h2>
                 <div className="grid md:grid-cols-2 gap-6">
                     <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50">
                         <h3 className="text-base font-bold text-zinc-300 mb-4 flex items-center gap-2">
                             <Film size={18} className="text-indigo-400"/> Formats
                         </h3>
                         <p className="text-sm text-zinc-400">{t('page.docs.formats')}</p>
                     </div>
                     
                     <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50">
                         <h3 className="text-base font-bold text-zinc-300 mb-4 flex items-center gap-2">
                             <Terminal size={18} className="text-green-400"/> Shortcuts
                         </h3>
                         <div className="font-mono text-xs space-y-2 text-zinc-400">
                             <div className="flex justify-between"><span>Play / Pause</span><span className="text-zinc-200">Space</span></div>
                             <div className="flex justify-between"><span>Rewind / Forward</span><span className="text-zinc-200">J / L</span></div>
                             <div className="flex justify-between"><span>Set In / Out</span><span className="text-zinc-200">I / O</span></div>
                             <div className="flex justify-between"><span>Marker</span><span className="text-zinc-200">M</span></div>
                             <div className="flex justify-between"><span>Fullscreen</span><span className="text-zinc-200">F</span></div>
                         </div>
                     </div>

                     <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50 md:col-span-2">
                         <h3 className="text-base font-bold text-zinc-300 mb-4 flex items-center gap-2">
                             <Download size={18} className="text-orange-400"/> DaVinci Resolve Workflow
                         </h3>
                         <div className="text-sm text-zinc-400 space-y-2">
                             <p>1. Export markers from SmoTree as <strong>.xml</strong>.</p>
                             <p>2. Open DaVinci Resolve. Go to <strong>File {'>'} Import {'>'} Timeline</strong>.</p>
                             <p>3. Select the downloaded XML.</p>
                             <p>4. The markers will appear as a new timeline or overlay on your clips.</p>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
};

export const AboutPage: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col gap-12 max-w-5xl mx-auto py-8">
            
            {/* 1. Hero / Mission */}
            <div className="bg-gradient-to-b from-indigo-950/40 to-transparent border border-indigo-900/30 rounded-3xl p-8 md:p-12 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-6 text-indigo-400">
                    <Rocket size={32} />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                    {t('page.about.hero')}
                </h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    {t('page.about.mission')}
                </p>
            </div>

            {/* 2. Key Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center hover:border-indigo-500/20 transition-colors group">
                    <div className="p-3 bg-zinc-950 rounded-xl mb-4 text-yellow-500 group-hover:scale-110 transition-transform"><Zap size={24} /></div>
                    <h3 className="font-bold text-white mb-2">{t('page.about.val.1.title')}</h3>
                    <p className="text-sm text-zinc-500">{t('page.about.val.1.desc')}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center hover:border-indigo-500/20 transition-colors group">
                    <div className="p-3 bg-zinc-950 rounded-xl mb-4 text-blue-500 group-hover:scale-110 transition-transform"><Layout size={24} /></div>
                    <h3 className="font-bold text-white mb-2">{t('page.about.val.2.title')}</h3>
                    <p className="text-sm text-zinc-500">{t('page.about.val.2.desc')}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center hover:border-indigo-500/20 transition-colors group">
                    <div className="p-3 bg-zinc-950 rounded-xl mb-4 text-green-500 group-hover:scale-110 transition-transform"><UserIcon size={24} /></div>
                    <h3 className="font-bold text-white mb-2">{t('page.about.val.3.title')}</h3>
                    <p className="text-sm text-zinc-500">{t('page.about.val.3.desc')}</p>
                </div>
            </div>

            {/* 3. The Solo Story */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500"><Heart size={20} /></div>
                        <h3 className="text-xl font-bold text-white">{t('page.about.story.title')}</h3>
                    </div>
                    <p className="text-zinc-400 leading-relaxed mb-6 italic">
                        "{t('page.about.story.text')}"
                    </p>
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-zinc-800/50">
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white">S</div>
                        <div>
                            <div className="text-sm font-bold text-white">SmoTree Dev</div>
                            <div className="text-xs text-zinc-500 font-medium">Founder & Maker</div>
                        </div>
                    </div>
                </div>

                {/* 4. Tech Stack (Modernized) */}
                <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Code2 size={20} /></div>
                        <h3 className="text-xl font-bold text-white">Technology</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {['React 19', 'TypeScript', 'Tailwind', 'Vercel Blob', 'Postgres', 'Vite'].map(tech => (
                            <div key={tech} className="bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-xl text-sm text-zinc-400 font-mono text-center hover:bg-zinc-800 transition-colors cursor-default">
                                {tech}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PricingPage: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="max-w-5xl mx-auto py-8">
             <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">{t('page.pricing.title')}</h1>
             <div className="text-center mb-12">
                 <p className="text-zinc-400 max-w-xl mx-auto text-lg">{t('page.pricing.subtitle')}</p>
             </div>

             {/* Personal Message Block */}
             <div className="max-w-4xl mx-auto mb-16 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5">
                     <Server size={120} />
                 </div>
                 <div className="relative z-10">
                     <h3 className="text-lg font-bold text-indigo-200 mb-3 flex items-center gap-2">
                         <Shield size={20} />
                         {t('page.pricing.why_title')}
                     </h3>
                     <p className="text-sm md:text-base text-indigo-200/70 leading-relaxed max-w-3xl">
                         {t('page.pricing.why_text')}
                     </p>
                 </div>
             </div>

             <RoadmapBlock />
        </div>
    );
};
