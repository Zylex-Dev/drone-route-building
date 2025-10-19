#!/bin/bash

divider() {
    echo "--------------------------------------------------"
}

echo "Выберите действие:"
echo "1) 🛑 Полная остановка и очистка (down --rmi all + prune)"
echo "2) ✨ Чистая сборка и запуск (build --no-cache + up -d)"
divider
read -p "Введите 1 или 2: " choice

case $choice in
    1)
        echo "Выбрано: 🛑 Полная остановка и очистка."
        divider
        docker-compose down --rmi all
        
        echo "Агрессивная очистка неиспользуемого кэша сборки..."
        docker builder prune -f
        
        echo "✅ Проект полностью остановлен, образы удалены, кэш сборки очищен."
        ;;
    2)
        echo "Выбрано: ✨ Чистая сборка и запуск."
        divider
        
        echo "Остановка запущенных контейнеров..."
        docker-compose down 
        
        echo "Запуск чистой сборки (build --no-cache)..."
        docker-compose build --no-cache
        
        echo "Запуск контейнеров (up -d)..."
        docker-compose up -d
        
        echo "✅ Чистая сборка завершена и контейнеры запущены."
        ;;
    *)
        echo "❌ Некорректный выбор. Пожалуйста, введите 1 или 2."
        exit 1
        ;;
esac

divider