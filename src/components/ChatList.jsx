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
  return `${Math.floor(diffMin / 60)}ч`;
}

export default function ChatList({ chats }) {
  const unread = (chats?.chats || [])
    .filter((c) => c.unread_count > 0)
    .sort((a, b) => new Date(a.updated) - new Date(b.updated));

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">💬 Непрочитанные чаты</h3>
        {unread.length > 0 && (
          <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded-full">{unread.length} новых</span>
        )}
      </div>
      <div className="space-y-1.5 overflow-y-auto flex-1">
        {unread.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Нет непрочитанных</p>}
        {unread.map((chat) => (
          <div key={chat.id} className={`flex items-center justify-between ${urgencyColor(chat.updated)} px-3 py-2 rounded-lg text-sm`}>
            <span>
              {urgencyDot(chat.updated)}{" "}
              <strong>{chat.user?.name || "Пользователь"}</strong>
              {" — "}
              <span className="text-gray-400">{chat.last_message?.text?.slice(0, 30) || "..."}</span>
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
