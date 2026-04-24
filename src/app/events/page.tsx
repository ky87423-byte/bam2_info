import { getCoupons } from "@/lib/data";
import { Ticket, Store, Clock } from "lucide-react";

export default async function EventsPage() {
  const today  = new Date().toISOString().slice(0, 10);
  const events = getCoupons()
    .filter((c) => c.type === "event" && c.isActive && (!c.validUntil || c.validUntil >= today))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Ticket size={22} className="text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-800">이벤트</h1>
        <span className="text-sm text-gray-400">{events.length}개</span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Ticket size={40} className="mx-auto mb-3 opacity-30" />
          <p>진행 중인 이벤트가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div className="shrink-0 w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex flex-col items-center justify-center text-white shadow-sm">
                <Ticket size={16} className="mb-0.5 opacity-80" />
                <span className="text-xs font-bold text-center leading-tight px-1">{event.discount}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-800 truncate mb-0.5">{event.title}</h2>
                {event.description && (
                  <p className="text-sm text-gray-500 truncate">{event.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  {event.shopName && (
                    <span className="flex items-center gap-1"><Store size={11} />{event.shopName}</span>
                  )}
                  {event.validUntil && (
                    <span className="flex items-center gap-1"><Clock size={11} />{event.validUntil} 까지</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
