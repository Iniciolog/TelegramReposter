# Telegram Auto-Posting System - Deployment Guide

## Требования к серверу

- Node.js 18+ 
- PostgreSQL 14+
- npm или yarn
- Git (опционально)

## Установка на сервере

### 1. Подготовка сервера

```bash
# Обновить систему (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Установить Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установить PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Установить PM2 для управления процессами
sudo npm install -g pm2
```

### 2. Настройка базы данных

```bash
# Войти в PostgreSQL
sudo -u postgres psql

# Создать базу данных и пользователя
CREATE DATABASE telegram_autoposter;
CREATE USER autoposter_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE telegram_autoposter TO autoposter_user;
\q
```

### 3. Развертывание приложения

```bash
# Распаковать архив
unzip telegram-autoposter-deployment.zip -d /var/www/telegram-autoposter
cd /var/www/telegram-autoposter

# Установить зависимости
npm install

# Создать файл окружения
cp .env.example .env
```

### 4. Настройка переменных окружения

Отредактировать файл `.env`:

```env
# База данных
DATABASE_URL=postgresql://autoposter_user:your_secure_password@localhost:5432/telegram_autoposter

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Сервер
NODE_ENV=production
PORT=5000

# Сессии (сгенерировать случайную строку)
SESSION_SECRET=your_very_long_random_session_secret_here
```

### 5. Инициализация базы данных

```bash
# Применить схему базы данных
npm run db:push
```

### 6. Сборка приложения

```bash
# Собрать фронтенд
npm run build

# Собрать бэкенд
npm run build:server
```

### 7. Запуск с PM2

```bash
# Создать ecosystem файл
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'telegram-autoposter',
    script: 'dist/server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
EOF

# Запустить приложение
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. Настройка Nginx (опционально)

```bash
# Установить Nginx
sudo apt install nginx -y

# Создать конфигурацию
sudo tee /etc/nginx/sites-available/telegram-autoposter << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Активировать сайт
sudo ln -s /etc/nginx/sites-available/telegram-autoposter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Настройка SSL с Let's Encrypt (опционально)

```bash
# Установить Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получить SSL сертификат
sudo certbot --nginx -d your-domain.com
```

## Проверка работы

1. Откройте браузер и перейдите на ваш домен
2. Проверьте логи: `pm2 logs telegram-autoposter`
3. Убедитесь, что бот отвечает в Telegram

## Обновление приложения

```bash
# Остановить приложение
pm2 stop telegram-autoposter

# Распаковать новую версию
unzip -o new-version.zip

# Установить новые зависимости
npm install

# Применить миграции БД (если есть)
npm run db:push

# Пересобрать приложение
npm run build
npm run build:server

# Запустить приложение
pm2 start telegram-autoposter
```

## Мониторинг

```bash
# Статус приложения
pm2 status

# Логи
pm2 logs telegram-autoposter

# Мониторинг ресурсов
pm2 monit
```

## Резервное копирование

```bash
# Создать бэкап базы данных
pg_dump -U autoposter_user -h localhost telegram_autoposter > backup_$(date +%Y%m%d_%H%M%S).sql

# Настроить автоматический бэкап (crontab)
0 2 * * * pg_dump -U autoposter_user -h localhost telegram_autoposter > /backups/telegram_autoposter_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

## Устранение неисправностей

### Приложение не запускается
- Проверьте переменные окружения в `.env`
- Убедитесь, что PostgreSQL запущен: `sudo systemctl status postgresql`
- Проверьте логи: `pm2 logs telegram-autoposter`

### Ошибки базы данных
- Проверьте подключение к БД
- Убедитесь, что пользователь имеет права доступа
- Примените схему: `npm run db:push`

### Telegram бот не отвечает
- Проверьте токен бота в `.env`
- Убедитесь, что бот добавлен в каналы
- Проверьте сетевое подключение

## Поддержка

При возникновении проблем проверьте:
1. Логи приложения: `pm2 logs`
2. Логи системы: `journalctl -u nginx`
3. Статус сервисов: `systemctl status postgresql nginx`