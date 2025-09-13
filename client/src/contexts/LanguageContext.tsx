import { createContext, useContext, useEffect, useState } from 'react';

type Language = 'en' | 'ru';

interface Translations {
  [key: string]: {
    en: string;
    ru: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.dashboard': { en: 'Dashboard', ru: 'Панель управления' },
  'nav.channels': { en: 'Channels', ru: 'Каналы' },
  'nav.content-filters': { en: 'Content Filters', ru: 'Фильтры контента' },
  'nav.branding': { en: 'Branding', ru: 'Брендинг' },
  'nav.scheduler': { en: 'Scheduler', ru: 'Планировщик' },
  'nav.drafts': { en: 'Drafts', ru: 'Черновики' },
  'nav.analytics': { en: 'Analytics', ru: 'Аналитика' },
  'nav.activity-logs': { en: 'Activity Logs', ru: 'Журнал активности' },
  'nav.settings': { en: 'Settings', ru: 'Настройки' },

  // Dashboard
  'dashboard.title': { en: 'Dashboard', ru: 'Панель управления' },
  'dashboard.subtitle': { en: 'Monitor your Telegram auto-posting activities', ru: 'Мониторинг автопостинга в Telegram каналах' },
  'dashboard.new-channel-pair': { en: 'New Channel Pair', ru: 'Новая пара каналов' },

  // Status Cards
  'stats.active-channels': { en: 'Active Channels', ru: 'Активные каналы' },
  'stats.posts-today': { en: 'Posts Today', ru: 'Постов сегодня' },
  'stats.success-rate': { en: 'Success Rate', ru: 'Успешность' },
  'stats.errors': { en: 'Errors', ru: 'Ошибки' },
  'stats.this-week': { en: 'this week', ru: 'на этой неделе' },
  'stats.vs-yesterday': { en: 'vs yesterday', ru: 'по сравнению со вчера' },
  'stats.vs-last-week': { en: 'vs last week', ru: 'по сравнению с прошлой неделей' },
  'stats.since-yesterday': { en: 'since yesterday', ru: 'со вчерашнего дня' },

  // Channel Pairs
  'channel-pairs.title': { en: 'Active Channel Pairs', ru: 'Активные пары каналов' },
  'channel-pairs.view-all': { en: 'View All', ru: 'Показать все' },
  'channel-pairs.no-pairs': { en: 'No channel pairs configured yet.', ru: 'Пары каналов пока не настроены.' },
  'channel-pairs.create-first': { en: 'Create your first channel pair to get started.', ru: 'Создайте первую пару каналов для начала работы.' },
  'channel-pairs.edit': { en: 'Edit', ru: 'Редактировать' },
  'channel-pairs.pause': { en: 'Pause', ru: 'Приостановить' },
  'channel-pairs.resume': { en: 'Resume', ru: 'Возобновить' },
  'channel-pairs.delete': { en: 'Delete', ru: 'Удалить' },
  'channel-pairs.active': { en: 'active', ru: 'активен' },
  'channel-pairs.paused': { en: 'paused', ru: 'приостановлен' },
  'channel-pairs.error': { en: 'error', ru: 'ошибка' },

  // Recent Activity
  'activity.title': { en: 'Recent Activity', ru: 'Последняя активность' },
  'activity.no-activity': { en: 'No recent activity.', ru: 'Нет недавней активности.' },
  'activity.will-appear': { en: 'Activity will appear here once you start monitoring channels.', ru: 'Активность будет отображаться здесь после начала мониторинга каналов.' },
  'activity.view-all': { en: 'View All Activity', ru: 'Показать всю активность' },

  // Performance Chart
  'chart.title': { en: 'Performance Overview', ru: 'Обзор производительности' },
  'chart.7-days': { en: '7 Days', ru: '7 дней' },
  'chart.30-days': { en: '30 Days', ru: '30 дней' },
  'chart.90-days': { en: '90 Days', ru: '90 дней' },
  'chart.placeholder': { en: 'Performance chart will be displayed here', ru: 'Здесь будет отображен график производительности' },
  'chart.description': { en: 'Chart showing posts per day, success rate, and errors', ru: 'График показывает посты в день, успешность и ошибки' },
  'chart.posts': { en: 'Posts', ru: 'Посты' },
  'chart.success-rate': { en: 'Success Rate', ru: 'Успешность' },
  'chart.errors': { en: 'Errors', ru: 'Ошибки' },

  // Quick Setup
  'setup.title': { en: 'Quick Setup', ru: 'Быстрая настройка' },
  'setup.source-channel': { en: 'Source Channel', ru: 'Исходный канал' },
  'setup.target-channel': { en: 'Target Channel', ru: 'Целевой канал' },
  'setup.posting-delay': { en: 'Posting Delay', ru: 'Задержка публикации' },
  'setup.select-delay': { en: 'Select delay', ru: 'Выберите задержку' },
  'setup.instant': { en: 'Instant', ru: 'Мгновенно' },
  'setup.minutes': { en: 'minutes', ru: 'минут' },
  'setup.hour': { en: 'hour', ru: 'час' },
  'setup.content-filters': { en: 'Content Filters', ru: 'Фильтры контента' },
  'setup.remove-mentions': { en: 'Remove original channel mentions', ru: 'Удалить упоминания исходного канала' },
  'setup.remove-links': { en: 'Remove external links', ru: 'Удалить внешние ссылки' },
  'setup.add-watermark': { en: 'Add custom watermark to images', ru: 'Добавить водяной знак на изображения' },
  'setup.custom-branding': { en: 'Custom Branding', ru: 'Персональный брендинг' },
  'setup.footer-placeholder': { en: 'Add your custom footer text...', ru: 'Добавьте свой текст в футер...' },
  'setup.save-draft': { en: 'Save as Draft', ru: 'Сохранить как черновик' },
  'setup.create-pair': { en: 'Create Channel Pair', ru: 'Создать пару каналов' },
  'setup.creating': { en: 'Creating...', ru: 'Создание...' },

  // App Brand
  'app.name': { en: 'TeleSync Pro', ru: 'ТелеСинк Про' },
  'app.user': { en: 'Admin User', ru: 'Администратор' },
  'app.plan': { en: 'Premium Plan', ru: 'Премиум план' },

  // Page Titles
  'pages.settings.title': { en: 'Settings', ru: 'Настройки' },
  'pages.settings.subtitle': { en: 'Configure bot settings and global preferences', ru: 'Настройка бота и глобальных параметров' },
  'pages.channels.title': { en: 'Channels', ru: 'Каналы' },
  'pages.channels.subtitle': { en: 'Manage your channel pairs and configurations', ru: 'Управление парами каналов и настройками' },
  'pages.content-filters.title': { en: 'Content Filters', ru: 'Фильтры контента' },
  'pages.content-filters.subtitle': { en: 'Configure content filtering rules and moderation settings', ru: 'Настройка правил фильтрации контента и модерации' },
  'pages.branding.title': { en: 'Branding', ru: 'Брендинг' },
  'pages.branding.subtitle': { en: 'Customize branding and visual elements for your posts', ru: 'Настройка брендинга и визуальных элементов для постов' },
  'pages.scheduler.title': { en: 'Scheduler', ru: 'Планировщик' },
  'pages.scheduler.subtitle': { en: 'Configure posting schedules and timing preferences', ru: 'Настройка расписания публикаций и времени' },
  'pages.analytics.title': { en: 'Analytics', ru: 'Аналитика' },
  'pages.analytics.subtitle': { en: 'View detailed analytics and performance metrics', ru: 'Просмотр детальной аналитики и метрик производительности' },
  'pages.activity-logs.title': { en: 'Activity Logs', ru: 'Журнал активности' },
  'pages.activity-logs.subtitle': { en: 'View detailed activity logs and system events', ru: 'Просмотр детального журнала активности и системных событий' },

  // Placeholders
  'placeholder.channel-management': { en: 'Channel management interface will be implemented here.', ru: 'Интерфейс управления каналами будет реализован здесь.' },
  'placeholder.content-filtering': { en: 'Content filtering interface will be implemented here.', ru: 'Интерфейс фильтрации контента будет реализован здесь.' },
  'placeholder.branding': { en: 'Branding customization interface will be implemented here.', ru: 'Интерфейс настройки брендинга будет реализован здесь.' },
  'placeholder.scheduling': { en: 'Scheduling interface will be implemented here.', ru: 'Интерфейс планирования будет реализован здесь.' },
  'placeholder.analytics': { en: 'Advanced analytics dashboard will be implemented here.', ru: 'Расширенная панель аналитики будет реализована здесь.' },
  'placeholder.activity-logs': { en: 'Detailed activity logs interface will be implemented here.', ru: 'Детальный интерфейс журнала активности будет реализован здесь.' },

  // Card Titles
  'cards.channel-management': { en: 'Channel Management', ru: 'Управление каналами' },
  'cards.filter-configuration': { en: 'Filter Configuration', ru: 'Настройка фильтров' },
  'cards.brand-settings': { en: 'Brand Settings', ru: 'Настройки бренда' },
  'cards.schedule-management': { en: 'Schedule Management', ru: 'Управление расписанием' },
  'cards.performance-analytics': { en: 'Performance Analytics', ru: 'Аналитика производительности' },
  'cards.system-activity': { en: 'System Activity', ru: 'Активность системы' },

  // Settings
  'settings.saved-success': { en: 'Settings saved successfully!', ru: 'Настройки сохранены успешно!' },
  'settings.saved-description': { en: 'Bot configuration has been updated.', ru: 'Конфигурация бота обновлена.' },
  'settings.saved-error': { en: 'Error saving settings', ru: 'Ошибка сохранения настроек' },
  'settings.check-token': { en: 'Please check your bot token and try again.', ru: 'Проверьте токен бота и попробуйте снова.' },
  'settings.bot-instructions-title': { en: 'How to create a Telegram Bot:', ru: 'Как создать Telegram бота:' },
  'settings.bot-step-1': { en: 'Open Telegram and search for @BotFather', ru: 'Откройте Telegram и найдите @BotFather' },
  'settings.bot-step-2': { en: 'Send /newbot command and follow instructions', ru: 'Отправьте команду /newbot и следуйте инструкциям' },
  'settings.bot-step-3': { en: 'Copy the bot token from BotFather', ru: 'Скопируйте токен бота от BotFather' },
  'settings.bot-step-4': { en: 'Paste the token below and save settings', ru: 'Вставьте токен ниже и сохраните настройки' },
  'settings.bot-configuration': { en: 'Bot Configuration', ru: 'Настройка бота' },
  'settings.bot-token': { en: 'Bot Token', ru: 'Токен бота' },
  'settings.default-branding': { en: 'Default Branding Text', ru: 'Текст брендинга по умолчанию' },
  'settings.branding-placeholder': { en: 'Enter default footer text for all posts...', ru: 'Введите текст футера по умолчанию для всех постов...' },
  'settings.testing-bot': { en: 'Testing bot connection...', ru: 'Проверка подключения бота...' },
  'settings.bot-connected': { en: 'Bot connected successfully! You can now create channel pairs.', ru: 'Бот подключен успешно! Теперь можно создавать пары каналов.' },
  'settings.bot-error': { en: 'Failed to connect bot. Please check your token.', ru: 'Не удалось подключить бота. Проверьте токен.' },
  'settings.saving': { en: 'Saving...', ru: 'Сохранение...' },
  'settings.save': { en: 'Save Settings', ru: 'Сохранить настройки' },

  // Subscription Modal
  'subscription.title': { en: 'Trial Period Expired', ru: 'Пробный период истёк' },
  'subscription.subtitle': { en: 'To continue using the service, please activate your subscription', ru: 'Для продолжения использования оформите подписку' },
  'subscription.payment-link': { en: 'Subscribe Now', ru: 'Оформить подписку' },
  'subscription.activation-code': { en: 'Activation Code', ru: 'Код активации' },
  'subscription.code-placeholder': { en: 'Enter activation code', ru: 'Введите код активации' },
  'subscription.activate-button': { en: 'Activate', ru: 'Активировать' },
  'subscription.try-later': { en: 'Try Later', ru: 'Попробовать позже' },
  'subscription.activating': { en: 'Activating...', ru: 'Активация...' },
  'subscription.success': { en: 'Subscription activated successfully!', ru: 'Подписка успешно активирована!' },
  'subscription.error': { en: 'Invalid or expired activation code', ru: 'Неверный или истёкший код активации' },
  'subscription.network-error': { en: 'Network error. Please try again.', ru: 'Ошибка сети. Попробуйте снова.' },

  // Common
  'common.just-now': { en: 'Just now', ru: 'Только что' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}