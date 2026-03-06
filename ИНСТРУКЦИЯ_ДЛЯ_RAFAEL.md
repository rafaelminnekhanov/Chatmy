# 📱 ИНСТРУКЦИЯ: Создать APK с телефона

## Для @rafaelminnekhanov

---

## ШАГ 1: Загрузить код на GitHub

### На телефоне в браузере:

1. Открой **github.com/rafaelminnekhanov**
2. Нажми **"New repository"** (зеленая кнопка)
3. Название: **my-chat-app**
4. Сделай **Private** (приватный)
5. Нажми **"Create repository"**

---

## ШАГ 2: Загрузить файлы

### Вариант А: Через веб-интерфейс GitHub

1. В новом репозитории нажми **"uploading an existing file"**
2. Перетащи все файлы из папки `/app`
3. Нажми **"Commit changes"**

### Вариант Б: Через Termux (если есть)

```bash
# Установи git
pkg install git

# Настрой git
git config --global user.email "твой@email.com"
git config --global user.name "Rafael"

# Перейди в папку проекта
cd /app

# Инициализируй git
git init
git add .
git commit -m "Initial commit"

# Подключи к GitHub
git remote add origin https://github.com/rafaelminnekhanov/my-chat-app.git
git branch -M main
git push -u origin main
```

---

## ШАГ 3: Зарегистрируйся на Expo.dev

1. Открой **expo.dev** в браузере
2. Нажми **"Sign Up"**
3. Зарегистрируйся (можно через GitHub!)

---

## ШАГ 4: Создать APK через Expo.dev

1. Войди в **expo.dev**
2. Нажми **"Create a new project"**
3. Выбери **"Import from GitHub"**
4. Выбери репозиторий **my-chat-app**
5. Нажми **"Create"**

6. В проекте нажми **"Builds"** (слева в меню)
7. Нажми **"Create a build"**
8. Выбери:
   - Platform: **Android**
   - Build type: **APK**
9. Нажми **"Create build"**

10. Подожди **15-20 минут** ⏱️

11. Когда готово - нажми **"Download APK"** 📥

---

## ШАГ 5: Раздать друзьям

1. Скачанный APK отправь друзьям через Telegram/WhatsApp
2. Или загрузи на Google Drive и отправь ссылку

---

## ⚠️ ВАЖНО!

При установке Android покажет "Неизвестный источник" - это нормально!
Нужно разрешить установку в настройках.

---

## 🆘 Если проблемы:

- **"Build failed"** - проверь что все файлы загружены
- **"No EAS project"** - в файле `frontend/app.json` должно быть поле `"slug": "my-chat"`
- Нужна помощь? Напиши мне!

---

**Готово! Следуй по шагам и у тебя будет APK!** 🎉

GitHub: github.com/rafaelminnekhanov/my-chat-app
Expo: expo.dev
