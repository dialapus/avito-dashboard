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
        {sorted.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Нет данных</p>}
        {sorted.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded-lg text-sm">
            <strong className="truncate mr-2">{item.title || "Объявление"}</strong>
            <span className="text-xs text-gray-400 shrink-0">
              {(item.stats?.views || 0).toLocaleString()} 👁 · {item.stats?.messages || 0} 💬 · {item.stats?.favorites || 0} ❤️
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
