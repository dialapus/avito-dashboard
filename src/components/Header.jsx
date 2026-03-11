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
        <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"}`} />
        <span>Обновлено: {timeStr}</span>
        <span className="text-gray-600">· след. через {countdown}</span>
      </div>
    </header>
  );
}
