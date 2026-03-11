import "dotenv/config";
import { getToken } from "./avito-auth.js";
import { cacheGet, cacheSet } from "./cache.js";

const AVITO_BASE = "https://api.avito.ru";
const USER_ID = process.env.AVITO_USER_ID;

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
