#!/bin/bash

# 🚀 АВТОМАТИЧЕСКАЯ ЗАГРУЗКА НА GITHUB

echo "=================================="
echo "📦 МОЙ ЧАТ - Загрузка на GitHub"
echo "=================================="
echo ""

# Проверка git
if ! command -v git &> /dev/null; then
    echo "❌ Git не установлен!"
    echo "Установи: pkg install git"
    exit 1
fi

# Настройка git
echo "Настройка git..."
git config --global user.name "Rafael Minnekhanov"
git config --global user.email "rafael@example.com"  # Замени на свой email!

# Инициализация
cd /app
git init

# Добавление файлов
echo "Добавление файлов..."
git add .

# Commit
echo "Создание commit..."
git commit -m "Initial commit: My Chat messenger app"

# Добавление remote
echo "Подключение к GitHub..."
git remote add origin https://github.com/rafaelminnekhanov/my-chat-app.git

# Push
echo "Загрузка на GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "=================================="
echo "✅ ГОТОВО!"
echo "=================================="
echo ""
echo "Проверь: https://github.com/rafaelminnekhanov/my-chat-app"
echo ""
echo "Теперь иди на expo.dev и создавай APK!"
echo "=================================="
