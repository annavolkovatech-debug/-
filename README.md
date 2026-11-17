# Uley Moyka Bot

Telegram бот для автомойки "Улей".

## Структура проекта
- `api/`: Vercel Serverless Functions (webhook & cron)
- `src/bot/`: Логика Telegram бота (Telegraf)
- `src/core12/`: Интеграция с API Core12
- `src/supabase/`: Интеграция с БД Supabase
- `src/mailings/`: Модуль рассылок
- `src/utils/`: Утилиты (логгер, валидатор)
- `tests/`: Тесты (Jest)

## Деплой
Деплой осуществляется через Vercel. Подключите GitHub репозиторий к Vercel и укажите переменные окружения из `.env.example`.

## Локальный запуск
1. Установите зависимости: `npm install`
2. Скопируйте `.env.example` в `.env` и заполните данные
3. Запустите тесты: `npm test`
