function buildFeed(data) {
  if (!data) return [];
  const events = [];

  (data.chats?.chats || []).forEach((chat) => {
    if (chat.updated) {
      events.push({
        type: "message", color: "text-red-400", dot: "●",
        text: `Сообщение от ${chat.user?.name || "Пользователь"}`,
        time: new Date(chat.updated),
      });
    }
  });

  (data.orders?.orders || []).forEach((order) => {
    if (order.created_at) {
      events.push({
        type: "order", color: "text-green-400", dot: "●",
        text: `Заказ: ${order.item_name || "Товар"} — ₽${(order.price_total || 0).toLocaleString()}`,
        time: new Date(order.created_at),
      });
    }
  });

  (data.items?.items || []).forEach((item) => {
    if (item.stats?.views > 0) {
      events.push({
        type: "views", color: "text-blue-400", dot: "●",
        text: `+${item.stats.views} просмотров — ${item.title || "Объявление"}`,
        time: new Date(),
      });
    }
  });

  (data.items?.items || []).forEach((item) => {
    if (item.stats?.favorites > 0) {
      events.push({
        type: "favorite", color: "text-pink-400", dot: "●",
        text: `${item.title || "Объявление"} добавлен в избранное (${item.stats.favorites})`,
        time: new Date(),
      });
    }
  });

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
        {feed.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Нет событий</p>}
        {feed.map((event, i) => (
          <div key={i} className="bg-white/[0.03] px-3 py-2 rounded-lg text-sm">
            <span className={event.color}>{event.dot}</span>{" "}
            <span className="text-xs text-gray-500">
              {event.time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {" — "}{event.text}
          </div>
        ))}
      </div>
    </div>
  );
}
