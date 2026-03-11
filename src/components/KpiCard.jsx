const colorMap = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  green: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" },
  pink: { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400" },
  teal: { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-400" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
};

export default function KpiCard({ icon, label, value, delta, color = "blue" }) {
  const c = colorMap[color] || colorMap.blue;
  const deltaColor = delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-gray-500";
  const deltaPrefix = delta > 0 ? "+" : "";

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-3 text-center`}>
      <div className={`text-2xl font-extrabold ${c.text}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{icon} {label}</div>
      {delta !== null && delta !== undefined && (
        <div className={`text-xs mt-1 ${deltaColor}`}>{deltaPrefix}{delta}</div>
      )}
    </div>
  );
}
