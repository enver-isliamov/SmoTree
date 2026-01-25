
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ru' | 'es' | 'ja' | 'ko' | 'pt';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];

const DICTIONARIES: Record<Language, Record<string, string>> = {
  en: {
    // General
    'app.name': 'SmoTree',
    'loading': 'Loading...',
    'cancel': 'Cancel',
    'save': 'Save',
    'delete': 'Delete',
    'edit': 'Edit',
    'logout': 'Sign Out',
    'back': 'Back',
    'nav.workflow': 'Workflow',
    'nav.pricing': 'Pricing',
    'nav.docs': 'Docs',
    'nav.about': 'About',
    
    // Auth / Landing
    'nav.login': 'Log In',
    'hero.title.1': 'Join the',
    'hero.title.2': 'SmoTree',
    'hero.desc': 'Get lifetime access to the most advanced video review platform. Your tools will always be with you, no subscription required.',
    'hero.quote': '"I develop SmoTree solo. You fund the development, and I gift you the tool forever."',
    'hero.cta': 'Become a Founder',
    'auth.card.join': 'Join Project',
    'auth.card.login': 'Account Login',
    'auth.card.desc_join': 'You\'ve been invited to collaborate.',
    'auth.card.desc_login': 'Manage your video projects.',
    'auth.manual': 'Or as Guest',
    'auth.placeholder.guest': 'Your Name (Guest)',
    'auth.placeholder.admin': 'Admin Name',
    'auth.btn.join': 'Join',
    'auth.btn.login': 'Enter',
    'roadmap.title': 'Choose Your Future',
    'roadmap.subtitle': 'Transparent pricing model for early adopters.',
    'footer.rights': 'All rights reserved.',
    
    // Dashboard
    'dash.my_projects': 'My Projects',
    'dash.shared_projects': 'Shared with Me',
    'dash.new_project': 'New Project',
    'dash.no_projects': 'No Projects Found',
    'dash.no_access': 'You don\'t have access to any projects here. Please open the specific link provided to you by the editor.',
    'dash.search': 'Search...',
    
    // Upsell Block
    'upsell.title': 'Why Upgrade?',
    'upsell.subtitle': 'Support independent software and unlock professional workflows.',
    'upsell.free.title': 'Guest / Free',
    'upsell.free.feat1': 'View & Comment',
    'upsell.free.feat2': 'No Project Creation',
    'upsell.free.feat3': 'No Export Tools',
    'upsell.founder.title': 'Founder Club',
    'upsell.founder.feat1': 'Unlimited Projects',
    'upsell.founder.feat2': 'DaVinci/Premiere Export',
    'upsell.founder.feat3': 'Lifetime Access (No Sub)',
    'upsell.cta': 'Get Lifetime Access',
    'upsell.donate': 'Donate',

    // Pages content
    'page.workflow.title': 'How SmoTree Works',
    'page.workflow.step1': 'Upload',
    'page.workflow.step1.desc': 'Drag & drop video files. We create instant proxies and thumbnails.',
    'page.workflow.step2': 'Invite',
    'page.workflow.step2.desc': 'Send a link to your client or team. They join instantly as guests, no registration needed.',
    'page.workflow.step3': 'Review',
    'page.workflow.step3.desc': 'Frame-accurate commenting. Draw on screen (coming soon). Real-time sync.',
    'page.workflow.step4': 'Export',
    'page.workflow.step4.desc': 'Download markers as EDL, XML (Resolve), or CSV to fix edits instantly.',

    'page.about.title': 'The Solo Mission',
    'page.about.p1': 'SmoTree is not a corporation. It is a passion project built by a single developer for the filmmaking community.',
    'page.about.p2': 'The goal is simple: Create professional tools that you own. No recurring nightmares. No data lock-in.',
    
    'page.pricing.title': 'Fair Pricing',
    'page.pricing.subtitle': 'Invest once, use forever during the V1 lifecycle.',

    'page.docs.title': 'Documentation',
    'page.docs.formats': 'Supported Formats: MP4, MOV, WEBM, MKV.',
    'page.docs.shortcuts': 'Shortcuts: Space (Play/Pause), J/K/L (Speed), F (Fullscreen), M (Marker).',
    
    // Roadmap Cards
    'rm.founders_club': "Founder's Club",
    'rm.early_adopter': "Early Adopter",
    'rm.saas_launch': "Public SaaS Launch",
    'rm.phase_1': "Phase 1 (Now)",
    'rm.phase_2': "Phase 2",
    'rm.phase_3': "Phase 3",
    'rm.one_time': "one-time",
    'rm.per_year': "/year",
    'rm.founder_sale': "Founder Sale",
    'rm.lifetime_license': "Lifetime SmoTree V1.X License",
    'rm.lifetime_desc': "Pay once. Use forever. No subscriptions.",
    'rm.flash_loom': "Flash-Loom Protocol",
    'rm.sync_desc': "Instant comment and video synchronization.",
    'rm.unlimited': "Unlimited Access",
    'rm.unlimited_desc': "No project limits for founders.",
    'rm.access_v1': "Access to SmoTree V1.X",
    'rm.std_support': "Standard Support",
    'rm.monthly_pay': "Monthly Payment",
    'rm.availability': "Availability:",
    'rm.status': "Status:",
    'rm.users_150': "First 150 users",
    'rm.users_500': "Users 151–500",
    'rm.users_all': "For everyone (501+)",
    'rm.open': "Open",
    'rm.locked': "Locked",
    'rm.end_2026': "Late 2026",
    'rm.last_chance': "Last chance to get software without subscription.",
    'rm.saas_desc': "New users pay monthly. Founders pay nothing.",

    // Profile
    'profile.title': 'User Profile',
    'profile.founder_msg': "You are a Founder's Club member. Thank you for supporting SmoTree!",
    'profile.tiers': 'Membership Tiers',
    'profile.language': 'Interface Language',
  },
  ru: {
    'app.name': 'SmoTree',
    'loading': 'Загрузка...',
    'cancel': 'Отмена',
    'save': 'Сохранить',
    'delete': 'Удалить',
    'edit': 'Редактировать',
    'logout': 'Выйти',
    'back': 'Назад',
    'nav.workflow': 'Воркфлоу',
    'nav.pricing': 'Цены',
    'nav.docs': 'Документация',
    'nav.about': 'О нас',

    'nav.login': 'Войти',
    'hero.title.1': 'Присоединяйтесь к',
    'hero.title.2': 'SmoTree',
    'hero.desc': 'Получите пожизненный доступ к самой продвинутой платформе для ревью видео. Ваши инструменты будут с вами всегда, без необходимости оформлять подписку.',
    'hero.quote': '"Я разрабатываю SmoTree в одиночку. Вы финансируете разработку, а я дарю вам инструмент навсегда."',
    'hero.cta': 'Стать Основателем',
    'auth.card.join': 'Присоединиться',
    'auth.card.login': 'Вход в аккаунт',
    'auth.card.desc_join': 'Вас пригласили к сотрудничеству.',
    'auth.card.desc_login': 'Управляйте своими видео проектами.',
    'auth.manual': 'Или как гость',
    'auth.placeholder.guest': 'Ваше Имя (Гость)',
    'auth.placeholder.admin': 'Имя Админа',
    'auth.btn.join': 'Присоединиться',
    'auth.btn.login': 'Войти',
    'roadmap.title': 'Выбирайте своё будущее',
    'roadmap.subtitle': 'Прозрачная модель ценообразования для ранних пользователей.',
    'footer.rights': 'Все права защищены.',
    'dash.my_projects': 'Мои Проекты',
    'dash.shared_projects': 'Доступные мне',
    'dash.new_project': 'Новый Проект',
    'dash.no_projects': 'Проекты не найдены',
    'dash.no_access': 'У вас нет доступа к проектам. Пожалуйста, откройте ссылку-приглашение.',
    'dash.search': 'Поиск...',
    
    'upsell.title': 'Почему стоит обновиться?',
    'upsell.subtitle': 'Поддержите независимую разработку и откройте профессиональные функции.',
    'upsell.free.title': 'Гость / Free',
    'upsell.free.feat1': 'Просмотр и комментарии',
    'upsell.free.feat2': 'Нельзя создавать проекты',
    'upsell.free.feat3': 'Нет экспорта монтажа',
    'upsell.founder.title': 'Клуб Основателей',
    'upsell.founder.feat1': 'Безлимит проектов',
    'upsell.founder.feat2': 'Экспорт в DaVinci/Premiere',
    'upsell.founder.feat3': 'Вечный доступ (Без подписки)',
    'upsell.cta': 'Получить вечный доступ',
    'upsell.donate': 'Задонатить',

    'page.workflow.title': 'Как работает SmoTree',
    'page.workflow.step1': 'Загрузка',
    'page.workflow.step1.desc': 'Перетащите видео. Мы создадим прокси и превью мгновенно.',
    'page.workflow.step2': 'Приглашение',
    'page.workflow.step2.desc': 'Отправьте ссылку клиенту. Они заходят как гости, регистрация не нужна.',
    'page.workflow.step3': 'Ревью',
    'page.workflow.step3.desc': 'Комментарии с точностью до кадра. Рисование (скоро). Синхронизация.',
    'page.workflow.step4': 'Экспорт',
    'page.workflow.step4.desc': 'Скачайте маркеры в EDL, XML (Resolve) или CSV для быстрого монтажа.',

    'page.about.title': 'Миссия одиночки',
    'page.about.p1': 'SmoTree — это не корпорация. Это проект страсти, созданный одним разработчиком для сообщества фильммейкеров.',
    'page.about.p2': 'Цель проста: Создать профессиональные инструменты, которыми владеете вы. Никаких подписок. Никакой привязки данных.',
    
    'page.pricing.title': 'Честные цены',
    'page.pricing.subtitle': 'Инвестируйте один раз, пользуйтесь вечно в рамках версии V1.',

    'page.docs.title': 'Документация',
    'page.docs.formats': 'Поддерживаемые форматы: MP4, MOV, WEBM, MKV.',
    'page.docs.shortcuts': 'Горячие клавиши: Пробел (Play/Pause), J/K/L (Скорость), F (Fullscreen), M (Маркер).',

    'rm.founders_club': "Клуб основателей",
    'rm.early_adopter': "Ранний Последователь",
    'rm.saas_launch': "Публичный Запуск SaaS",
    'rm.phase_1': "Этап 1 (Сейчас)",
    'rm.phase_2': "Фаза 2",
    'rm.phase_3': "Фаза 3",
    'rm.one_time': "разово",
    'rm.per_year': "/год",
    'rm.founder_sale': "Продажа основателя",
    'rm.lifetime_license': "Пожизненная лицензия SmoTree V1.X",
    'rm.lifetime_desc': "Платите один раз. Пользуйтесь вечно. Никаких подписок.",
    'rm.flash_loom': "Протокол Flash-Loom",
    'rm.sync_desc': "Мгновенная синхронизация комментариев и видео.",
    'rm.unlimited': "Безлимитный доступ",
    'rm.unlimited_desc': "Нет ограничений на количество проектов для основателей.",
    'rm.access_v1': "Доступ к SmoTree V1.X",
    'rm.std_support': "Стандартная поддержка",
    'rm.monthly_pay': "Ежемесячная оплата",
    'rm.availability': "Доступность:",
    'rm.status': "Статус:",
    'rm.users_150': "Первые 150 пользователей",
    'rm.users_500': "Пользователи 151–500",
    'rm.users_all': "Для всех (501+)",
    'rm.open': "Открыто",
    'rm.locked': "Заблокировано",
    'rm.end_2026': "Конец 2026 года",
    'rm.last_chance': "Последний шанс получить ПО без подписки.",
    'rm.saas_desc': "Новые пользователи платят ежемесячно. Учредители не платят ничего.",
    'profile.title': 'Профиль Пользователя',
    'profile.founder_msg': "Вы участник Клуба Основателей. Спасибо за поддержку SmoTree!",
    'profile.tiers': 'Уровни Участия',
    'profile.language': 'Язык интерфейса',
  },
  es: {
    'app.name': 'SmoTree',
    'nav.login': 'Iniciar Sesión',
    'nav.workflow': 'Flujo',
    'nav.pricing': 'Precios',
    'nav.docs': 'Documentos',
    'nav.about': 'Nosotros',
    'dash.upsell_title': '¿Por qué actualizar?',
    'upsell.title': '¿Por qué actualizar?',
    'upsell.subtitle': 'Apoya el software independiente y desbloquea funciones profesionales.',
    'upsell.free.title': 'Invitado / Gratis',
    'upsell.founder.title': 'Club de Fundadores',
    'upsell.cta': 'Obtener acceso de por vida',
    // ... basic translations fallback
    'hero.title.1': 'Únete al',
    'hero.title.2': 'SmoTree',
    'hero.desc': 'Obtén acceso de por vida a la plataforma de revisión de video más avanzada. Sin suscripciones.',
    'hero.cta': 'Conviértete en Fundador',
    'auth.card.login': 'Iniciar Sesión',
    'auth.btn.login': 'Entrar',
    'profile.language': 'Idioma de la interfaz',
    'logout': 'Cerrar Sesión',
  },
  ja: {
    'app.name': 'SmoTree',
    'nav.login': 'ログイン',
    'nav.workflow': 'ワークフロー',
    'nav.pricing': '価格',
    'nav.docs': 'ドキュメント',
    'nav.about': '約',
    'upsell.title': 'アップグレードする理由',
    'upsell.cta': '生涯アクセスを取得',
    'hero.title.1': '参加する',
    'hero.title.2': 'SmoTree',
    'hero.desc': '最先端のビデオレビュープラットフォームへの生涯アクセスを取得します。サブスクリプションは不要です。',
    'hero.cta': '創設者になる',
    'auth.card.login': 'アカウントログイン',
    'auth.btn.login': '入る',
    'profile.language': 'インターフェース言語',
    'logout': 'ログアウト',
  },
  ko: {
    'app.name': 'SmoTree',
    'nav.login': '로그인',
    'nav.workflow': '워크플로',
    'nav.pricing': '가격',
    'nav.docs': '문서',
    'nav.about': '정보',
    'upsell.title': '업그레이드해야 하는 이유',
    'upsell.cta': '평생 액세스 권한 받기',
    'hero.title.1': '참여하세요',
    'hero.title.2': 'SmoTree',
    'hero.desc': '가장 진보된 비디오 리뷰 플랫폼에 대한 평생 액세스 권한을 얻으세요. 구독이 필요 없습니다.',
    'hero.cta': '창립자 되기',
    'auth.card.login': '로그인',
    'auth.btn.login': '입장',
    'profile.language': '인터페이스 언어',
    'logout': '로그아웃',
  },
  pt: {
    'app.name': 'SmoTree',
    'nav.login': 'Entrar',
    'nav.workflow': 'Fluxo',
    'nav.pricing': 'Preços',
    'nav.docs': 'Docs',
    'nav.about': 'Sobre',
    'upsell.title': 'Por que atualizar?',
    'upsell.cta': 'Obter Acesso Vitalício',
    'hero.title.1': 'Junte-se ao',
    'hero.title.2': 'SmoTree',
    'hero.desc': 'Tenha acesso vitalício à plataforma de revisão de vídeo mais avançada. Sem assinaturas.',
    'hero.cta': 'Torne-se um Fundador',
    'auth.card.login': 'Login da Conta',
    'auth.btn.login': 'Entrar',
    'profile.language': 'Idioma da Interface',
    'logout': 'Sair',
  }
};

// Fallback for missing keys in other languages
const t_fallback = (lang: Language, key: string) => {
    return DICTIONARIES[lang]?.[key] || DICTIONARIES['en'][key] || key;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('smotree_lang');
    if (saved && ['en', 'ru', 'es', 'ja', 'ko', 'pt'].includes(saved)) {
        return saved as Language;
    }
    const browserLang = navigator.language.split('-')[0];
    if (['ru', 'es', 'ja', 'ko', 'pt'].includes(browserLang)) {
        return browserLang as Language;
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('smotree_lang', language);
  }, [language]);

  const t = (key: string) => t_fallback(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
