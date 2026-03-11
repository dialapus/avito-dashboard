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
