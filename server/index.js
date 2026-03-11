import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getChats, getItems, getItemStats, getOrders, getProfile } from "./avito-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5173" }));
}

app.get("/api/chats", async (req, res) => {
  try { res.json(await getChats()); }
  catch (e) { console.error("[api] chats error:", e.message); res.status(502).json({ error: e.message }); }
});

app.get("/api/items", async (req, res) => {
  try { res.json(await getItems()); }
  catch (e) { console.error("[api] items error:", e.message); res.status(502).json({ error: e.message }); }
});

app.get("/api/items/:id/stats", async (req, res) => {
  try { res.json(await getItemStats(req.params.id)); }
  catch (e) { console.error("[api] item stats error:", e.message); res.status(502).json({ error: e.message }); }
});

app.get("/api/orders", async (req, res) => {
  try { res.json(await getOrders()); }
  catch (e) { console.error("[api] orders error:", e.message); res.status(502).json({ error: e.message }); }
});

app.get("/api/profile", async (req, res) => {
  try { res.json(await getProfile()); }
  catch (e) { console.error("[api] profile error:", e.message); res.status(502).json({ error: e.message }); }
});

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
