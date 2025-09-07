# Быстрый старт - Telegram Auto-Posting System

## Минимальная установка (Mac OS)

### 1. Установка зависимостей

```bash
# Установить Homebrew (если не установлен)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установить Node.js 18+
brew install node

# Установить PostgreSQL
brew install postgresql
brew services start postgresql

# Установить PM2 глобально
npm install -g pm2
```

### 2. Развертывание

```bash
# Распаковать архив
unzip telegram-autoposter-deployment.zip
cd telegram-autoposter-deployment

# Быстрая установка
npm install
```

### 3. Настройка окружения

Создать файл `.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/telegram_autoposter
TELEGRAM_BOT_TOKEN=ваш_токен_бота_telegram
NODE_ENV=production
PORT=5000
SESSION_SECRET=ваш_секретный_ключ_сессии_минимум_32_символа
```

### 4. Инициализация базы данных

```bash
# Создать базу данных
createdb telegram_autoposter

# Применить схему
npm run db:push
```

### 5. Запуск

```bash
# Сборка приложения
npm run build

# Запуск с PM2
pm2 start ecosystem.config.js
pm2 save
```

### 6. Проверка

Откройте браузер: `http://localhost:5000`

## Настройка Telegram бота

1. Создайте бота через @BotFather в Telegram
2. Получите токен и добавьте в `.env`
3. Добавьте бота в нужные каналы как администратора

## Обновление реплита

```bash
# Обновить replit.md
npm run update:replit

# Перезапустить
pm2 restart telegram-autoposter
```

## Резервное копирование

```bash
# Создать бэкап БД
pg_dump telegram_autoposter > backup.sql

# Восстановить
psql telegram_autoposter < backup.sql
```

Полная документация: см. DEPLOYMENT_GUIDE.md