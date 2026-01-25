
import React from 'react';
import { Upload, Share2, MessageSquare, Download, Check, Crown, Terminal, Heart, Code2, Film, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { RoadmapBlock } from './RoadmapBlock';

interface PageProps {
  onBack: () => void;
}

const PageLayout: React.FC<PageProps & { title: string, children: React.ReactNode }> = ({ onBack, title, children }) => (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
        <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
            <h1 className="font-bold text-white text-lg">{title}</h1>
            <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-12">
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </div>
        </div>
    </div>
);

export const WorkflowPage: React.FC<PageProps> = ({ onBack }) => {
    const { t } = useLanguage();
    const steps = [
        { icon: Upload, title: t('page.workflow.step1'), desc: t('page.workflow.step1.desc'), color: 'text-blue-400', bg: 'bg-blue-900/20' },
        { icon: Share2, title: t('page.workflow.step2'), desc: t('page.workflow.step2.desc'), color: 'text-purple-400', bg: 'bg-purple-900/20' },
        { icon: MessageSquare, title: t('page.workflow.step3'), desc: t('page.workflow.step3.desc'), color: 'text-green-400', bg: 'bg-green-900/20' },
        { icon: Download, title: t('page.workflow.step4'), desc: t('page.workflow.step4.desc'), color: 'text-orange-400', bg: 'bg-orange-900/20' },
    ];

    return (
        <PageLayout onBack={onBack} title={t('page.workflow.title')}>
             <div className="space-y-12 relative">
                <div className="absolute left-6 md:left-8 top-8 bottom-8 w-0.5 bg-zinc-800 hidden md:block"></div>
                {steps.map((step, idx) => (
                    <div key={idx} className="relative flex flex-col md:flex-row gap-6 items-start md:items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                         <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 z-10 ${step.bg} ${step.color} shadow-lg ring-4 ring-zinc-950`}>
                             <step.icon size={24} />
                         </div>
                         <div className="flex-1">
                             <div className="flex items-center gap-2 mb-2">
                                 <span className="text-xs font-bold bg-zinc-800 px-2 py-0.5 rounded text-zinc-500">STEP 0{idx+1}</span>
                                 <h3 className="text-xl font-bold text-white">{step.title}</h3>
                             </div>
                             <p className="text-zinc-400 leading-relaxed">{step.desc}</p>
                         </div>
                    </div>
                ))}
             </div>
        </PageLayout>
    );
};

export const AboutPage: React.FC<PageProps> = ({ onBack }) => {
    const { t } = useLanguage();
    return (
        <PageLayout onBack={onBack} title={t('page.about.title')}>
            <div className="prose prose-invert max-w-none">
                <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-8 rounded-3xl border border-indigo-500/20 mb-12 text-center">
                    <Heart size={48} className="mx-auto text-pink-500 mb-6" />
                    <p className="text-xl md:text-2xl font-medium text-indigo-100 leading-relaxed mb-6">
                        {t('page.about.p1')}
                    </p>
                    <p className="text-zinc-400">
                         {t('page.about.p2')}
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                        <Code2 className="text-zinc-500 mb-4" size={32} />
                        <h3 className="text-lg font-bold text-white mb-2">Stack</h3>
                        <p className="text-zinc-500 text-sm">React, TypeScript, Tailwind, Node.js, Vercel Blob & Postgres.</p>
                    </div>
                    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
                        <Terminal className="text-zinc-500 mb-4" size={32} />
                        <h3 className="text-lg font-bold text-white mb-2">Philosophy</h3>
                        <p className="text-zinc-500 text-sm">Lightweight. Fast. Local-first capabilities. No bloat.</p>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
};

export const PricingPage: React.FC<PageProps> = ({ onBack }) => {
    const { t } = useLanguage();
    return (
        <PageLayout onBack={onBack} title={t('page.pricing.title')}>
             <div className="text-center mb-12">
                 <h2 className="text-3xl font-bold text-white mb-4">{t('page.pricing.title')}</h2>
                 <p className="text-zinc-400">{t('page.pricing.subtitle')}</p>
             </div>
             <RoadmapBlock />
        </PageLayout>
    );
};

export const DocsPage: React.FC<PageProps> = ({ onBack }) => {
    const { t } = useLanguage();
    return (
        <PageLayout onBack={onBack} title={t('page.docs.title')}>
             <div className="grid gap-8">
                 <section>
                     <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                         <Film size={20} className="text-indigo-400"/> Formats
                     </h2>
                     <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                         <p className="text-zinc-300">{t('page.docs.formats')}</p>
                     </div>
                 </section>
                 
                 <section>
                     <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                         <Terminal size={20} className="text-green-400"/> Shortcuts
                     </h2>
                     <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 font-mono text-sm space-y-2">
                         <div className="flex justify-between border-b border-zinc-800 pb-2">
                             <span className="text-zinc-400">Play / Pause</span>
                             <span className="text-white">Space</span>
                         </div>
                         <div className="flex justify-between border-b border-zinc-800 pb-2">
                             <span className="text-zinc-400">Rewind / Forward</span>
                             <span className="text-white">J / L</span>
                         </div>
                         <div className="flex justify-between border-b border-zinc-800 pb-2">
                             <span className="text-zinc-400">Add Marker</span>
                             <span className="text-white">M</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-zinc-400">Fullscreen</span>
                             <span className="text-white">F</span>
                         </div>
                     </div>
                 </section>

                 <section>
                     <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                         <Download size={20} className="text-orange-400"/> DaVinci Resolve Workflow
                     </h2>
                     <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 text-sm text-zinc-400 space-y-4">
                         <p>1. Export markers from SmoTree as <strong>.xml</strong>.</p>
                         <p>2. Open DaVinci Resolve. Go to <strong>File {'>'} Import {'>'} Timeline</strong>.</p>
                         <p>3. Select the downloaded XML.</p>
                         <p>4. The markers will appear as a new timeline or overlay on your clips.</p>
                     </div>
                 </section>
             </div>
        </PageLayout>
    );
};
