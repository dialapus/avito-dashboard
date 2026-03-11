# Avito Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an operational dashboard for monitoring Avito sales account with real-time KPI metrics, chat tracking, order monitoring, and activity feed.

**Architecture:** Express proxy server handles Avito OAuth2 auth, rate limiting, and response caching. React + Tailwind frontend polls the proxy every 60 seconds. Single Railway service serves both API and static files in production.

**Tech Stack:** React 19, Tailwind CSS 4, Vite, Express, Railway

---

## File Structure

```
avito-dashboard/
├── .env.example                # Template for env vars
├── .gitignore
├── package.json                # Root package: dev runs both server + vite
├── vite.config.js              # Vite config with /api proxy to :3001
├── index.html                  # Vite entry HTML
├── server/
│   ├── index.js                # Express server: routes + static serving
│   ├── avito-auth.js           # OAuth2 client_credentials token manager
│   ├── avito-api.js            # Avito API client with rate limiting
│   └── cache.js                # In-memory TTL cache
├── src/
│   ├── main.jsx                # React DOM root
│   ├── App.jsx                 # Dashboard layout: header + KPI + quadrants
│   ├── hooks/
│   │   └── useAutoRefresh.js   # 60-sec polling hook with countdown
│   ├── components/
│   │   ├── Header.jsx          # Logo + connection status + countdown timer
│   │   ├── KpiCard.jsx         # Single metric card (value, label, delta, color)
│   │   ├── KpiRow.jsx          # Row of 7 KpiCards with data mapping
│   │   ├── ChatList.jsx        # Q1: unread chats with urgency colors
│   │   ├── OrderList.jsx       # Q2: today's orders
│   │   ├── TopListings.jsx     # Q3: items ranked by views
│   │   └── ActivityFeed.jsx    # Q4: merged chronological event feed
│   └── lib/
│       └── api.js              # fetch wrappers for /api/* endpoints
└── docs/
```

---

## Chunk 1: Project Setup + Server

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.env.example`, `src/main.jsx`

- [ ] **Step 1: Initialize package.json**

```bash
cd C:/Users/diala/avito-dashboard
npm init -y
```

Then update `package.json`:

```json
{
  "name": "avito-dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently \"node server/index.js\" \"vite\"",
    "dev:server": "node server/index.js",
    "dev:client": "vite",
    "build": "vite build",
    "start": "NODE_ENV=production node server/index.js"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express cors dotenv
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite concurrently react react-dom
```

- [ ] **Step 3: Create vite.config.js**

```js
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Avito Dashboard</title>
  </head>
  <body class="bg-gray-950 text-gray-100 min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create src/main.jsx**

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create `src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 6: Create .env.example**

```
AVITO_CLIENT_ID=your_client_id
AVITO_CLIENT_SECRET=your_client_secret
AVITO_USER_ID=your_user_id
PORT=3001
```

- [ ] **Step 7: Create placeholder App.jsx and verify dev server starts**

```jsx
// src/App.jsx
export default function App() {
  return <div className="p-8 text-center text-2xl">Avito Dashboard</div>;
}
```

Run: `npm run dev:client`
Expected: Vite starts on http://localhost:5173, shows "Avito Dashboard"

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/ .env.example .gitignore
git commit -m "feat: project scaffolding — Vite + React + Tailwind"
```

---

### Task 2: Server — Cache Module

**Files:**
- Create: `server/cache.js`

- [ ] **Step 1: Create cache.js**

```js
// server/cache.js

const store = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 30_000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheClear() {
  store.clear();
}
```

- [ ] **Step 2: Commit**

```bash
git add server/cache.js
git commit -m "feat: add in-memory TTL cache"
```

---

### Task 3: Server — OAuth2 Auth Module

**Files:**
- Create: `server/avito-auth.js`

- [ ] **Step 1: Create avito-auth.js**

```js
// server/avito-auth.js
import "dotenv/config";

let accessToken = null;
let expiresAt = 0;

const CLIENT_ID = process.env.AVITO_CLIENT_ID;
const CLIENT_SECRET = process.env.AVITO_CLIENT_SECRET;

export async function getToken() {
  // Refresh if expires within 5 minutes
  if (accessToken && Date.now() < expiresAt - 5 * 60 * 1000) {
    return accessToken;
  }

  const res = await fetch("https://api.avito.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Avito auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  accessToken = data.access_token;
  expiresAt = Date.now() + data.expires_in * 1000;

  console.log(`[auth] Token refreshed, expires in ${data.expires_in}s`);
  return accessToken;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/avito-auth.js
git commit -m "feat: add Avito OAuth2 token manager"
```

---

### Task 4: Server — Avito API Client

**Files:**
- Create: `server/avito-api.js`

- [ ] **Step 1: Create avito-api.js with rate limiting**

```js
// server/avito-api.js
import "dotenv/config";
import { getToken } from "./avito-auth.js";
import { cacheGet, cacheSet } from "./cache.js";

const AVITO_BASE = "https://api.avito.ru";
const USER_ID = process.env.AVITO_USER_ID;

// Simple rate limiter: max 5 requests per second
let requestTimestamps = [];

async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < 1000);

  if (requestTimestamps.length >= 5) {
    const waitMs = 1000 - (now - requestTimestamps[0]);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  requestTimestamps.push(Date.now());
  return fetch(url, options);
}

async function avitoFetch(path, cacheKey) {
  // Check cache first
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const token = await getToken();
  const res = await rateLimitedFetch(`${AVITO_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Avito API ${path}: ${res.status}`);
  }

  const data = await res.json();
  cacheSet(cacheKey, data, 30_000);
  return data;
}

export async function getChats() {
  return avitoFetch(
    `/messenger/v3/accounts/${USER_ID}/chats`,
    "chats"
  );
}

export async function getItems() {
  return avitoFetch(
    `/core/v1/accounts/${USER_ID}/items`,
    "items"
  );
}

export async function getItemStats(itemId) {
  return avitoFetch(
    `/core/v1/items/${itemId}/stats`,
    `stats:${itemId}`
  );
}

export async function getOrders() {
  return avitoFetch(`/cpa/v2/orders`, "orders");
}

export async function getProfile() {
  return avitoFetch(`/core/v1/accounts/self`, "profile");
}
```

- [ ] **Step 2: Commit**

```bash
git add server/avito-api.js
git commit -m "feat: add Avito API client with rate limiting and caching"
```

---

### Task 5: Server — Express Proxy

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: Create Express server**

```js
// server/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getChats, getItems, getItemStats, getOrders, getProfile } from "./avito-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// CORS for dev
if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5173" }));
}

// API routes
app.get("/api/chats", async (req, res) => {
  try {
    const data = await getChats();
    res.json(data);
  } catch (e) {
    console.error("[api] chats error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/items", async (req, res) => {
  try {
    const data = await getItems();
    res.json(data);
  } catch (e) {
    console.error("[api] items error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/items/:id/stats", async (req, res) => {
  try {
    const data = await getItemStats(req.params.id);
    res.json(data);
  } catch (e) {
    console.error("[api] item stats error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const data = await getOrders();
    res.json(data);
  } catch (e) {
    console.error("[api] orders error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/profile", async (req, res) => {
  try {
    const data = await getProfile();
    res.json(data);
  } catch (e) {
    console.error("[api] profile error:", e.message);
    res.status(502).json({ error: e.message });
  }
});

// Production: serve React build
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`[server] Avito Dashboard proxy running on :${PORT}`);
});
```

- [ ] **Step 2: Verify server starts**

Create `.env` from `.env.example` with real credentials, then:

```bash
npm run dev:server
```

Expected: `[server] Avito Dashboard proxy running on :3001`

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: add Express proxy server with all Avito API routes"
```

---

## Chunk 2: Frontend Components

### Task 6: API Library + Auto-Refresh Hook

**Files:**
- Create: `src/lib/api.js`, `src/hooks/useAutoRefresh.js`

- [ ] **Step 1: Create src/lib/api.js**

```js
// src/lib/api.js

async function apiFetch(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export async function fetchAllData() {
  const [chats, items, orders] = await Promise.all([
    apiFetch("/api/chats"),
    apiFetch("/api/items"),
    apiFetch("/api/orders"),
  ]);

  return { chats, items, orders };
}
```

- [ ] **Step 2: Create src/hooks/useAutoRefresh.js**

```jsx
// src/hooks/useAutoRefresh.js
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAllData } from "../lib/api";

const INTERVAL = 60_000;

export function useAutoRefresh() {
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(INTERVAL / 1000);
  const [isOnline, setIsOnline] = useState(true);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const resetCountdown = useCallback(() => {
    setSecondsLeft(INTERVAL / 1000);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const newData = await fetchAllData();
      setPrevData((prev) => prev || newData);
      setData((current) => {
        if (current) setPrevData(current);
        return newData;
      });
      setLastUpdate(new Date());
      setIsOnline(true);
      resetCountdown();
    } catch (e) {
      console.error("[refresh] failed:", e);
      setIsOnline(false);
    }
  }, [resetCountdown]);

  // Initial fetch + interval
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, INTERVAL);
    return () => {
      clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [refresh]);

  return { data, prevData, lastUpdate, secondsLeft, isOnline, refresh };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.js src/hooks/useAutoRefresh.js
git commit -m "feat: add API fetch library and auto-refresh hook"
```

---

### Task 7: Header Component

**Files:**
- Create: `src/components/Header.jsx`

- [ ] **Step 1: Create Header.jsx**

```jsx
// src/components/Header.jsx

export default function Header({ lastUpdate, secondsLeft, isOnline }) {
  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
      <h1 className="text-xl font-bold">📊 Avito Dashboard</h1>
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span
          className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"}`}
        />
        <span>Обновлено: {timeStr}</span>
        <span className="text-gray-600">· след. через {countdown}</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat: add Header component with status and countdown"
```

---

### Task 8: KPI Cards

**Files:**
- Create: `src/components/KpiCard.jsx`, `src/components/KpiRow.jsx`

- [ ] **Step 1: Create KpiCard.jsx**

```jsx
// src/components/KpiCard.jsx

const colorMap = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" },
  pink: { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400" },
  teal: { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
};

export default function KpiCard({ icon, label, value, delta, color = "blue" }) {
  const c = colorMap[color] || colorMap.blue;
  const deltaColor = delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-gray-500";
  const deltaPrefix = delta > 0 ? "+" : "";

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-3 text-center`}>
      <div className={`text-2xl font-extrabold ${c.text}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">
        {icon} {label}
      </div>
      {delta !== null && delta !== undefined && (
        <div className={`text-xs mt-1 ${deltaColor}`}>
          {deltaPrefix}{delta}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create KpiRow.jsx**

```jsx
// src/components/KpiRow.jsx
import KpiCard from "./KpiCard";

export default function KpiRow({ data, prevData }) {
  if (!data) return null;

  const { chats, items, orders } = data;
  const prev = prevData || {};

  // Compute metrics
  const unreadCount = chats?.chats?.filter((c) => c.unread_count > 0).length || 0;
  const orderList = orders?.orders || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orderList.filter((o) =>
    o.created_at?.startsWith(today)
  );
  const orderCount = todayOrders.length;
  const revenue = todayOrders.reduce((sum, o) => sum + (o.price_total || 0), 0);
  const totalViews = (items?.items || []).reduce((sum, i) => sum + (i.stats?.views || 0), 0);
  const totalFavorites = (items?.items || []).reduce((sum, i) => sum + (i.stats?.favorites || 0), 0);
  const totalCalls = (items?.items || []).reduce((sum, i) => sum + (i.stats?.calls || 0), 0);
  const conversion = totalViews > 0 ? ((unreadCount / totalViews) * 100).toFixed(1) : "0.0";

  // Compute deltas from previous data
  const prevUnread = prev.chats?.chats?.filter((c) => c.unread_count > 0).length || 0;
  const prevOrders = (prev.orders?.orders || []).filter((o) =>
    o.created_at?.startsWith(today)
  ).length;
  const prevViews = (prev.items?.items || []).reduce((sum, i) => sum + (i.stats?.views || 0), 0);
  const prevRevenue = (prev.orders?.orders || []).filter((o) =>
    o.created_at?.startsWith(today)
  ).reduce((sum, o) => sum + (o.price_total || 0), 0);
  const prevFavorites = (prev.items?.items || []).reduce((sum, i) => sum + (i.stats?.favorites || 0), 0);
  const prevCalls = (prev.items?.items || []).reduce((sum, i) => sum + (i.stats?.calls || 0), 0);

  const cards = [
    { icon: "💬", label: "Сообщения", value: unreadCount, delta: unreadCount - prevUnread, color: "blue" },
    { icon: "📦", label: "Заказы", value: orderCount, delta: orderCount - prevOrders, color: "green" },
    { icon: "👁", label: "Просмотры", value: totalViews.toLocaleString(), delta: totalViews - prevViews, color: "orange" },
    { icon: "💰", label: "Выручка", value: `₽${(revenue / 1000).toFixed(1)}K`, delta: revenue - prevRevenue, color: "purple" },
    { icon: "❤️", label: "Избранное", value: totalFavorites, delta: totalFavorites - prevFavorites, color: "pink" },
    { icon: "📞", label: "Звонки", value: totalCalls, delta: totalCalls - prevCalls, color: "teal" },
    { icon: "📈", label: "Конверсия", value: `${conversion}%`, delta: null, color: "amber" },
  ];

  return (
    <div className="grid grid-cols-7 gap-3 px-6 py-4">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/KpiCard.jsx src/components/KpiRow.jsx
git commit -m "feat: add KpiCard and KpiRow components"
```

---

### Task 9: ChatList (Q1)

**Files:**
- Create: `src/components/ChatList.jsx`

- [ ] **Step 1: Create ChatList.jsx**

```jsx
// src/components/ChatList.jsx

function urgencyColor(lastMessageTime) {
  const diffMin = (Date.now() - new Date(lastMessageTime).getTime()) / 60_000;
  if (diffMin < 15) return "bg-red-500/15";
  if (diffMin < 60) return "bg-amber-500/15";
  return "bg-gray-500/10";
}

function urgencyDot(lastMessageTime) {
  const diffMin = (Date.now() - new Date(lastMessageTime).getTime()) / 60_000;
  if (diffMin < 15) return "🔴";
  if (diffMin < 60) return "🟡";
  return "⚪";
}

function timeAgo(dateStr) {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (diffMin < 60) return `${diffMin}м`;
  const hours = Math.floor(diffMin / 60);
  return `${hours}ч`;
}

export default function ChatList({ chats }) {
  const unread = (chats?.chats || [])
    .filter((c) => c.unread_count > 0)
    .sort((a, b) => new Date(b.updated) - new Date(a.updated));

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">💬 Непрочитанные чаты</h3>
        {unread.length > 0 && (
          <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full">
            {unread.length} новых
          </span>
        )}
      </div>
      <div className="space-y-1.5 overflow-y-auto flex-1">
        {unread.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Нет непрочитанных</p>
        )}
        {unread.map((chat) => (
          <div
            key={chat.id}
            className={`flex items-center justify-between ${urgencyColor(chat.updated)} px-3 py-2 rounded-lg text-sm`}
          >
            <span>
              {urgencyDot(chat.updated)}{" "}
              <strong>{chat.user?.name || "Пользователь"}</strong>
              {" — "}
              <span className="text-gray-400">
                {chat.last_message?.text?.slice(0, 30) || "..."}
              </span>
              {chat.context?.value?.title && (
                <span className="text-gray-600 italic"> · {chat.context.value.title}</span>
              )}
            </span>
            <span className="text-xs text-gray-500 ml-2 shrink-0">{timeAgo(chat.updated)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChatList.jsx
git commit -m "feat: add ChatList component with urgency indicators"
```

---

### Task 10: OrderList (Q2)

**Files:**
- Create: `src/components/OrderList.jsx`

- [ ] **Step 1: Create OrderList.jsx**

```jsx
// src/components/OrderList.jsx

export default function OrderList({ orders }) {
  const list = orders?.orders || [];

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">⚡ Последние заказы</h3>
        {list.length > 0 && (
          <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full">
            {list.length} сегодня
          </span>
        )}
      </div>
      <div className="space-y-1.5 overflow-y-auto flex-1">
        {list.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Нет заказов сегодня</p>
        )}
        {list.map((order, i) => (
          <div
            key={order.id || i}
            className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded-lg text-sm"
          >
            <span>
              📦 {order.item_name || "Товар"} —{" "}
              <strong className="text-green-400">
                ₽{(order.price_total || 0).toLocaleString()}
              </strong>
            </span>
            <span className="text-xs text-gray-500 ml-2 shrink-0">
              {order.created_at
                ? new Date(order.created_at).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OrderList.jsx
git commit -m "feat: add OrderList component"
```

---

### Task 11: TopListings (Q3)

**Files:**
- Create: `src/components/TopListings.jsx`

- [ ] **Step 1: Create TopListings.jsx**

```jsx
// src/components/TopListings.jsx

export default function TopListings({ items }) {
  const sorted = [...(items?.items || [])]
    .sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0))
    .slice(0, 10);

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">📦 Топ объявлений</h3>
        <span className="text-xs text-gray-500">по просмотрам</span>
      </div>
      <div className="space-y-1.5 overflow-y-auto flex-1">
        {sorted.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Нет данных</p>
        )}
        {sorted.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded-lg text-sm"
          >
            <strong className="truncate mr-2">{item.title || "Объявление"}</strong>
            <span className="text-xs text-gray-400 shrink-0">
              {(item.stats?.views || 0).toLocaleString()} 👁
              {" · "}
              {item.stats?.messages || 0} 💬
              {" · "}
              {item.stats?.favorites || 0} ❤️
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TopListings.jsx
git commit -m "feat: add TopListings component"
```

---

### Task 12: ActivityFeed (Q4)

**Files:**
- Create: `src/components/ActivityFeed.jsx`

- [ ] **Step 1: Create ActivityFeed.jsx**

```jsx
// src/components/ActivityFeed.jsx

function buildFeed(data) {
  if (!data) return [];

  const events = [];

  // Chat messages
  (data.chats?.chats || []).forEach((chat) => {
    if (chat.updated) {
      events.push({
        type: "message",
        color: "text-red-400",
        dot: "●",
        text: `Сообщение от ${chat.user?.name || "Пользователь"}`,
        time: new Date(chat.updated),
      });
    }
  });

  // Orders
  (data.orders?.orders || []).forEach((order) => {
    if (order.created_at) {
      events.push({
        type: "order",
        color: "text-green-400",
        dot: "●",
        text: `Заказ: ${order.item_name || "Товар"} — ₽${(order.price_total || 0).toLocaleString()}`,
        time: new Date(order.created_at),
      });
    }
  });

  // Views (top items by view activity)
  (data.items?.items || []).forEach((item) => {
    if (item.stats?.views > 0) {
      events.push({
        type: "views",
        color: "text-blue-400",
        dot: "●",
        text: `+${item.stats.views} просмотров — ${item.title || "Объявление"}`,
        time: new Date(), // current poll time — API doesn't give per-view timestamps
      });
    }
  });

  // Favorites
  (data.items?.items || []).forEach((item) => {
    if (item.stats?.favorites > 0) {
      events.push({
        type: "favorite",
        color: "text-pink-400",
        dot: "●",
        text: `${item.title || "Объявление"} добавлен в избранное (${item.stats.favorites})`,
        time: new Date(),
      });
    }
  });

  // Sort by time desc, take 20
  return events.sort((a, b) => b.time - a.time).slice(0, 20);
}

export default function ActivityFeed({ data }) {
  const feed = buildFeed(data);

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">📋 Лента активности</h3>
        <span className="text-xs text-gray-500">хронология</span>
      </div>
      <div className="space-y-1.5 overflow-y-auto flex-1">
        {feed.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Нет событий</p>
        )}
        {feed.map((event, i) => (
          <div key={i} className="bg-white/[0.03] px-3 py-2 rounded-lg text-sm">
            <span className={event.color}>{event.dot}</span>{" "}
            <span className="text-xs text-gray-500">
              {event.time.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {" — "}
            {event.text}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ActivityFeed.jsx
git commit -m "feat: add ActivityFeed component"
```

---

## Chunk 3: App Assembly + Deploy

### Task 13: App Layout Assembly

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Assemble App.jsx**

```jsx
// src/App.jsx
import Header from "./components/Header";
import KpiRow from "./components/KpiRow";
import ChatList from "./components/ChatList";
import OrderList from "./components/OrderList";
import TopListings from "./components/TopListings";
import ActivityFeed from "./components/ActivityFeed";
import { useAutoRefresh } from "./hooks/useAutoRefresh";

export default function App() {
  const { data, prevData, lastUpdate, secondsLeft, isOnline } = useAutoRefresh();

  return (
    <div className="min-h-screen flex flex-col">
      <Header lastUpdate={lastUpdate} secondsLeft={secondsLeft} isOnline={isOnline} />
      <KpiRow data={data} prevData={prevData} />
      <div className="grid grid-cols-2 gap-4 px-6 pb-6 flex-1">
        <ChatList chats={data?.chats} />
        <OrderList orders={data?.orders} />
        <TopListings items={data?.items} />
        <ActivityFeed data={data} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify full dashboard loads in dev**

```bash
npm run dev
```

Open http://localhost:5173. Expected: Header, 7 KPI cards, 4 quadrants. Data loads from Avito API if `.env` is configured. Without credentials — shows empty states.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: assemble dashboard layout with all components"
```

---

### Task 14: Production Build

**Files:**
- Modify: `server/index.js` (already handles production static serving)

- [ ] **Step 1: Test production build**

```bash
npm run build
```

Expected: `dist/` directory created with bundled HTML/JS/CSS.

- [ ] **Step 2: Test production server**

```bash
NODE_ENV=production npm start
```

Open http://localhost:3001. Expected: Same dashboard served from Express.

- [ ] **Step 3: Commit if any changes needed**

```bash
git status
# Only stage config changes if any (NOT dist/ or .env)
git diff --quiet || (git add package.json vite.config.js server/ src/ && git commit -m "chore: verify production build")
```

---

### Task 15: Railway Deployment

**Files:**
- No new files — Railway auto-detects Node.js

- [ ] **Step 1: Create GitHub repo and push**

```bash
cd C:/Users/diala/avito-dashboard
export PATH="$PATH:/c/Users/diala/AppData/Local/Programs/gh/bin"
gh repo create dialapus/avito-dashboard --private --source . --push
```

- [ ] **Step 2: Create Railway project**

```bash
railway init --name avito-dashboard
```

Expected: New project created on Railway. A `railway.toml` or `.railway/` config may be generated.

- [ ] **Step 3: Set environment variables**

Read values from your local `.env` file and set them in Railway:

```bash
railway variables set AVITO_CLIENT_ID=$(grep AVITO_CLIENT_ID .env | cut -d= -f2)
railway variables set AVITO_CLIENT_SECRET=$(grep AVITO_CLIENT_SECRET .env | cut -d= -f2)
railway variables set AVITO_USER_ID=$(grep AVITO_USER_ID .env | cut -d= -f2)
railway variables set NODE_ENV=production
```

- [ ] **Step 4: Deploy**

```bash
railway up
```

Expected: Railway builds (auto-detects Node.js via package.json, runs `npm start` which maps to `NODE_ENV=production node server/index.js`). Dashboard available at generated railway.app URL.

- [ ] **Step 5: Verify deployed dashboard**

```bash
railway open
```

Expected: Browser opens Railway URL. Working dashboard with live Avito data — Header, 7 KPI cards, 4 quadrants with real data.

- [ ] **Step 6: Commit railway config and push**

```bash
git add railway.toml 2>/dev/null; git add railway.json 2>/dev/null
git diff --cached --quiet || git commit -m "chore: add Railway deployment config"
git push
```
