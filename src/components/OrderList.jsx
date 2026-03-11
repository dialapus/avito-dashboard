export default function OrderList({ orders }) {
  const list = orders?.orders || [];

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">⚡ Последние заказы</h3>
        {list.length > 0 && (
          <span className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full">{list.length} сегодня</span>
        )}
      </div>
      <div className="space-y-1.5 overflow-y-auto flex-1">
        {list.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Нет заказов сегодня</p>}
        {list.map((order, i) => (
          <div key={order.id || i} className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded-lg text-sm">
            <span>📦 {order.item_name || "Товар"} — <strong className="text-green-400">₽{(order.price_total || 0).toLocaleString()}</strong></span>
            <span className="text-xs text-gray-500 ml-2 shrink-0">
              {order.created_at ? new Date(order.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
