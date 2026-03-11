import Header from "./components/Header";
import KpiRow from "./components/KpiRow";
import ChatList from "./components/ChatList";
import OrderList from "./components/OrderList";
import TopListings from "./components/TopListings";
import ActivityFeed from "./components/ActivityFeed";
import { useAutoRefresh } from "./hooks/useAutoRefresh";

export default function App() {
  const { data, prevData, lastUpdate, secondsLeft, isOnline } = useAutoRefresh();

  return (
    <div className="min-h-screen flex flex-col">
      <Header lastUpdate={lastUpdate} secondsLeft={secondsLeft} isOnline={isOnline} />
      <KpiRow data={data} prevData={prevData} />
      <div className="grid grid-cols-2 gap-4 px-6 pb-6 flex-1">
        <ChatList chats={data?.chats} />
        <OrderList orders={data?.orders} />
        <TopListings items={data?.items} />
        <ActivityFeed data={data} />
      </div>
    </div>
  );
}
