# Avito Dashboard — Design Spec

## Overview

Оперативный пульт управления аккаунтом на Авито. Дашборд показывает ключевые метрики, непрочитанные чаты, заказы, рейтинг объявлений и ленту активности в реальном времени. Автообновление каждые 60 секунд.

## Goals

- Видеть все ключевые метрики аккаунта на одном экране
- Быстро реагировать на новые сообщения и заказы
- Отслеживать эффективность объявлений
- Минимальная задержка — данные обновляются раз в минуту

## Non-Goals

- Аналитика трендов (графики за неделю/месяц) — v2
- Управление объявлениями (создание/редактирование) — отдельный инструмент
- Интеграция с CRM (Twenty) — v2
- Мобильная адаптация — v2

## Tech Stack

- **Frontend:** React 19 + Tailwind CSS 4
- **Bundler:** Vite
- **Backend/API:** Avito REST API через прокси-сервер (Node.js Express)
- **Auth:** Avito OAuth2 (client_credentials) — токен обновляется автоматически
- **Deploy:** Railway (аккаунт dialapus@gmail.com, CLI установлен)

## Architecture

```
┌─────────────────────────────────────────┐
│            React Frontend               │
│  (Vite dev server, port 5173)           │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │KPI Cards│ │Quadrants│ │Timer Bar │  │
│  └────┬────┘ └────┬────┘ └────┬─────┘  │
│       └───────────┴───────────┘         │
│              fetch /api/*               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Express Proxy Server            │
│         (port 3001)                     │
│                                         │
│  - OAuth2 token management              │
│  - Rate limiting (Avito: 5 req/sec)     │
│  - Response caching (30 sec TTL)        │
│  - CORS for dev                         │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│           Avito REST API                │
│  - GET /messenger/v3/accounts/.../chats │
│  - GET /core/v1/accounts/.../items      │
│  - GET /core/v1/items/{id}/stats        │
│  - GET /cpa/v2/orders                   │
└─────────────────────────────────────────┘
```

## Layout

### KPI Cards (7 штук, верхняя полоса)

Горизонтальная полоса из 7 карточек с одинаковой шириной:

| # | Метрика | Иконка | Цвет | Источник API |
|---|---------|--------|------|-------------|
| 1 | Новые сообщения | 💬 | Blue | messenger/v3/accounts/.../chats (unread count) |
| 2 | Заказы сегодня | 📦 | Green | cpa/v2/orders (filter: today) |
| 3 | Просмотры | 👁 | Orange | item stats (sum views today) |
| 4 | Выручка сегодня | 💰 | Purple | cpa/v2/orders (sum amounts) |
| 5 | Избранное | ❤️ | Pink | item stats (sum favorites) |
| 6 | Звонки | 📞 | Teal | item stats (calls) |
| 7 | Конверсия | 📈 | Amber | просмотры→сообщения (computed) |

Каждая карточка показывает:
- Текущее значение (крупно)
- Название метрики
- Дельта за последний час (зелёная/красная) — вычисляется через snapshot: при каждом poll сохраняем предыдущее значение в памяти, дельта = текущее - предыдущее (за ~60 минут)

### Quadrants (4 виджета, основная область)

Сетка 2x2 под KPI-карточками:

**Q1 — Непрочитанные чаты** (левый верхний)
- Список непрочитанных чатов, отсортированных по времени ожидания
- Цветовая индикация: красный (< 15 мин), жёлтый (15-60 мин), серый (> 1ч)
- Показывает: имя, последнее сообщение, название товара, время
- Бейдж с количеством новых

**Q2 — Последние заказы** (правый верхний)
- Хронологический список заказов за сегодня
- Показывает: название товара, сумма, время
- Бейдж с количеством за день

**Q3 — Топ объявлений** (левый нижний)
- Рейтинг объявлений по просмотрам за сегодня
- Показывает: название, просмотры, сообщения, избранное
- Сортировка по просмотрам (desc)

**Q4 — Лента активности** (правый нижний)
- Хронологическая лента всех событий
- Типы: сообщение (красная точка), заказ (зелёная), просмотры (синяя), избранное (розовая)
- Показывает: тип, описание, время
- Собирается client-side из тех же API-ответов (чаты, заказы, статистика) — без отдельного endpoint

### Header

- Логотип/название слева
- Статус обновления справа: зелёный индикатор + "Обновлено: HH:MM" + таймер обратного отсчёта

## Data Flow

### Автообновление (60 сек цикл)

1. Frontend запускает `setInterval(fetchAll, 60_000)` при монтировании
2. `fetchAll()` параллельно запрашивает все endpoints через прокси
3. Прокси проверяет кэш (30 сек TTL) → если свежий, отдаёт из кэша
4. Если кэш устарел → запрос к Avito API с rate limiting (макс 5 req/sec)
5. Ответ кэшируется и отдаётся фронтенду
6. React обновляет только изменившиеся компоненты

### API Endpoints (прокси)

```
GET /api/chats          → messenger/v3/accounts/{user_id}/chats
GET /api/items          → core/v1/accounts/{user_id}/items
GET /api/items/:id/stats → core/v1/items/{id}/stats
GET /api/orders         → cpa/v2/orders
GET /api/profile        → core/v1/accounts/self
```

### OAuth2 Token Management

- При старте прокси получает access_token через client_credentials
- Токен хранится в памяти, обновляется за 5 минут до истечения
- client_id и client_secret из `.env`

## Error Handling

- API недоступен → показывать последние данные + жёлтый индикатор "Offline"
- Токен истёк → автоматическое обновление, retry запроса
- Rate limit → exponential backoff с максимумом 3 retry

## File Structure

```
avito-dashboard/
├── .env                    # AVITO_CLIENT_ID, AVITO_CLIENT_SECRET, AVITO_USER_ID
├── .gitignore
├── package.json
├── vite.config.js
├── server/
│   ├── index.js            # Express proxy server
│   ├── avito-auth.js       # OAuth2 token management
│   ├── avito-api.js        # API client with rate limiting
│   └── cache.js            # Simple in-memory cache (30s TTL)
├── src/
│   ├── main.jsx            # React entry
│   ├── App.jsx             # Layout: header + KPI row + quadrants grid
│   ├── hooks/
│   │   └── useAutoRefresh.js  # 60-sec polling hook
│   ├── components/
│   │   ├── Header.jsx         # Logo + update status + countdown
│   │   ├── KpiCard.jsx        # Single KPI card (value, label, delta)
│   │   ├── KpiRow.jsx         # Row of 7 KPI cards
│   │   ├── ChatList.jsx       # Q1: unread chats
│   │   ├── OrderList.jsx      # Q2: recent orders
│   │   ├── TopListings.jsx    # Q3: top items by views
│   │   └── ActivityFeed.jsx   # Q4: chronological event feed
│   └── lib/
│       └── api.js             # fetch wrappers for /api/*
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-03-12-avito-dashboard-design.md
└── README.md
```

## Deployment (Railway)

- Один сервис: Express server раздаёт и API, и статику (React build)
- В production: `npm run build` собирает React → `dist/`, Express serve `dist/` + `/api/*`
- Переменные окружения в Railway: `AVITO_CLIENT_ID`, `AVITO_CLIENT_SECRET`, `AVITO_USER_ID`
- Railway автодеплой при push в main
- Dockerfile или Nixpacks (Railway автодетект Node.js)

## Security

- Avito credentials хранятся только в `.env` локально, в Railway — через environment variables
- Прокси-сервер — единственная точка контакта с Avito API
- Фронтенд не имеет доступа к токенам
- CORS ограничен localhost в dev, в production не нужен (same origin)

## Success Criteria

- [ ] Дашборд загружается и показывает реальные данные из Avito API
- [ ] Все 7 KPI-карточек отображают актуальные значения
- [ ] 4 квадранта заполнены данными
- [ ] Автообновление работает каждые 60 сек
- [ ] Таймер обратного отсчёта до следующего обновления
- [ ] Цветовая индикация приоритетов в чатах
- [ ] Graceful degradation при ошибках API
