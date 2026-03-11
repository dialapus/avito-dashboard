import KpiCard from "./KpiCard";

export default function KpiRow({ data, prevData }) {
  if (!data) return null;

  const { chats, items, orders } = data;
  const prev = prevData || {};

  const unreadCount = chats?.chats?.filter((c) => c.unread_count > 0).length || 0;
  const orderList = orders?.orders || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orderList.filter((o) => o.created_at?.startsWith(today));
  const orderCount = todayOrders.length;
  const revenue = todayOrders.reduce((sum, o) => sum + (o.price_total || 0), 0);
  const totalViews = (items?.items || []).reduce((sum, i) => sum + (i.stats?.views || 0), 0);
  const totalFavorites = (items?.items || []).reduce((sum, i) => sum + (i.stats?.favorites || 0), 0);
  const totalCalls = (items?.items || []).reduce((sum, i) => sum + (i.stats?.calls || 0), 0);
  const conversion = totalViews > 0 ? ((unreadCount / totalViews) * 100).toFixed(1) : "0.0";

  const prevUnread = prev.chats?.chats?.filter((c) => c.unread_count > 0).length || 0;
  const prevTodayOrders = (prev.orders?.orders || []).filter((o) => o.created_at?.startsWith(today));
  const prevOrderCount = prevTodayOrders.length;
  const prevViews = (prev.items?.items || []).reduce((sum, i) => sum + (i.stats?.views || 0), 0);
  const prevRevenue = prevTodayOrders.reduce((sum, o) => sum + (o.price_total || 0), 0);
  const prevFavorites = (prev.items?.items || []).reduce((sum, i) => sum + (i.stats?.favorites || 0), 0);
  const prevCalls = (prev.items?.items || []).reduce((sum, i) => sum + (i.stats?.calls || 0), 0);

  const cards = [
    { icon: "💬", label: "Сообщения", value: unreadCount, delta: unreadCount - prevUnread, color: "blue" },
    { icon: "📦", label: "Заказы", value: orderCount, delta: orderCount - prevOrderCount, color: "green" },
    { icon: "👁", label: "Просмотры", value: totalViews.toLocaleString(), delta: totalViews - prevViews, color: "orange" },
    { icon: "💰", label: "Выручка", value: `₽${(revenue / 1000).toFixed(1)}K`, delta: revenue - prevRevenue, color: "purple" },
    { icon: "❤️", label: "Избранное", value: totalFavorites, delta: totalFavorites - prevFavorites, color: "pink" },
    { icon: "📞", label: "Звонки", value: totalCalls, delta: totalCalls - prevCalls, color: "teal" },
    { icon: "📈", label: "Конверсия", value: `${conversion}%`, delta: null, color: "amber" },
  ];

  return (
    <div className="grid grid-cols-7 gap-3 px-6 py-4">
      {cards.map((card) => (<KpiCard key={card.label} {...card} />))}
    </div>
  );
}
