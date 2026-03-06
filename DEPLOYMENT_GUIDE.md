# 📱 Руководство по развертыванию Мой Чат

## 🚀 Развертывание на собственном сервере

### 1. Требования к серверу

- **VPS/Dedicated сервер** с:
  - Ubuntu 20.04+ или Debian 11+
  - Минимум 2GB RAM
  - 20GB свободного места
  - Доступ root/sudo
  
### 2. Установка зависимостей на сервере

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить необходимые пакеты
sudo apt install -y python3.11 python3-pip mongodb nginx git curl

# Установить Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установить Yarn
npm install -g yarn
```

### 3. Установка и настройка MongoDB

```bash
# Запустить MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Проверить статус
sudo systemctl status mongodb
```

### 4. Загрузка кода приложения

```bash
# Клонировать или скопировать код на сервер
cd /opt
sudo mkdir my-chat
cd my-chat

# Скопировать файлы backend и frontend в эту папку
```

### 5. Настройка Backend (FastAPI)

```bash
cd /opt/my-chat/backend

# Создать виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установить зависимости
pip install -r requirements.txt

# Создать файл .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017/
DB_NAME=mychat
EOF
```

### 6. Создать systemd сервис для Backend

```bash
sudo nano /etc/systemd/system/mychat-backend.service
```

Вставить:

```ini
[Unit]
Description=My Chat Backend API
After=network.target mongodb.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/my-chat/backend
Environment="PATH=/opt/my-chat/backend/venv/bin"
ExecStart=/opt/my-chat/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

Запустить сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl start mychat-backend
sudo systemctl enable mychat-backend
sudo systemctl status mychat-backend
```

### 7. Настройка Nginx как reverse proxy

```bash
sudo nano /etc/nginx/sites-available/mychat
```

Вставить:

```nginx
server {
    listen 80;
    server_name ВАШ_ДОМЕН.com;  # Замените на ваш домен

    # API Backend
    location /api/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket (если используется)
    location /ws/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Frontend APK файл
    location /mychat.apk {
        alias /opt/my-chat/mychat.apk;
        add_header Content-Disposition 'attachment; filename="МойЧат.apk"';
    }
}
```

Активировать конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/mychat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Установить SSL сертификат (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ВАШ_ДОМЕН.com
```

### 9. Создание APK файла

На вашем компьютере для разработки:

```bash
cd /app/frontend

# Обновить API_URL в .env на ваш домен
# EXPO_PUBLIC_BACKEND_URL=https://ВАШ_ДОМЕН.com

# Установить EAS CLI
npm install -g eas-cli

# Войти в Expo аккаунт
eas login

# Настроить проект
eas build:configure

# Создать APK для Android
eas build --platform android --profile production

# После сборки скачать APK файл
```

### 10. Загрузка APK на сервер

```bash
# Скопировать APK на сервер
scp mychat.apk root@ВАШ_СЕРВЕР:/opt/my-chat/

# Дать права на чтение
sudo chmod 644 /opt/my-chat/mychat.apk
```

### 11. Поделиться APK с друзьями

Отправьте друзьям ссылку для скачивания:

```
https://ВАШ_ДОМЕН.com/mychat.apk
```

Или используйте QR код (сгенерировать на https://www.qr-code-generator.com/)

## 📦 Альтернатива: Использование Docker

Можно также развернуть используя Docker Compose:

```bash
# Создать docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    volumes:
      - mongodb_data:/data/db
    networks:
      - mychat

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017/
      - DB_NAME=mychat
    depends_on:
      - mongodb
    networks:
      - mychat

volumes:
  mongodb_data:

networks:
  mychat:
```

Запустить:

```bash
docker-compose up -d
```

## 🔒 Безопасность

1. **Настроить firewall:**

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

2. **Настроить MongoDB аутентификацию** (опционально)

3. **Регулярно обновлять сервер:**

```bash
sudo apt update && sudo apt upgrade -y
```

## 📊 Мониторинг

Проверить логи:

```bash
# Backend логи
sudo journalctl -u mychat-backend -f

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB логи
sudo tail -f /var/log/mongodb/mongod.log
```

## 🆘 Решение проблем

### Backend не запускается

```bash
# Проверить статус
sudo systemctl status mychat-backend

# Посмотреть логи
sudo journalctl -u mychat-backend --no-pager | tail -50
```

### MongoDB не подключается

```bash
# Проверить статус MongoDB
sudo systemctl status mongodb

# Перезапустить MongoDB
sudo systemctl restart mongodb
```

### Приложение не подключается к серверу

1. Проверить что API URL в APK правильный
2. Проверить что порты 80/443 открыты
3. Проверить что SSL сертификат установлен корректно

---

**Готово! Ваш приватный мессенджер запущен!** 🎉
