import "dotenv/config";
import { getToken, refreshToken } from "./avito-auth.js";
import { cacheGet, cacheSet } from "./cache.js";

const AVITO_BASE = "https://api.avito.ru";
const USER_ID = process.env.AVITO_USER_ID;

let requestTimestamps = [];

async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < 1000);

  if (requestTimestamps.length >= 5) {
    const waitMs = 1000 - (now - requestTimestamps[0]);
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    requestTimestamps = requestTimestamps.filter((t) => Date.now() - t < 1000);
  }

  requestTimestamps.push(Date.now());
  return fetch(url, options);
}

async function avitoFetch(path, cacheKey) {
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const token = await getToken();
    const res = await rateLimitedFetch(`${AVITO_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      cacheSet(cacheKey, data, 30_000);
      return data;
    }

    if (res.status === 401 && attempt < MAX_RETRIES) {
      await refreshToken();
      continue;
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const backoffMs = Math.min(1000 * 2 ** attempt, 8000);
      console.warn(`[avito-api] 429 on ${path}, retry ${attempt + 1} in ${backoffMs}ms`);
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }

    lastError = new Error(`Avito API ${path}: ${res.status}`);
  }

  throw lastError;
}

export async function getChats() {
  return avitoFetch(`/messenger/v3/accounts/${USER_ID}/chats`, "chats");
}

export async function getItems() {
  return avitoFetch(`/core/v1/accounts/${USER_ID}/items`, "items");
}

export async function getItemStats(itemId) {
  return avitoFetch(`/core/v1/items/${itemId}/stats`, `stats:${itemId}`);
}

export async function getOrders() {
  return avitoFetch(`/cpa/v2/orders`, "orders");
}

export async function getProfile() {
  return avitoFetch(`/core/v1/accounts/self`, "profile");
}
