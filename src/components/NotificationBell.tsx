import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
};

// A realtime notification bell. Drop into any top bar.
export function NotificationBell() {
  const { session } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  // Initial load + realtime subscription
  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;

    // Load existing
    supabase
      .from("notifications")
      .select("id, type, message, read, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setNotifs(data as Notification[]); });

    // Subscribe to new ones in realtime
    const channel = supabase
      .channel(`notifs-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          setNotifs((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAllRead = async () => {
    if (!session?.user || unread === 0) return;
    const ids = notifs.filter((n) => !n.read).map((n) => n.id);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", ids);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) markAllRead();
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative text-[#5C3317]">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-[#FAF6EF] rounded-xl border border-[rgba(92,51,23,0.15)] shadow-lg z-50">
          <div className="px-4 py-3 border-b border-[rgba(92,51,23,0.1)]">
            <span className="text-sm font-semibold text-[#3A2410]">Notifications</span>
          </div>
          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#7A6A55]">No notifications yet</div>
          ) : (
            notifs.map((n) => (
              <div key={n.id} className="px-4 py-3 border-b border-[rgba(92,51,23,0.06)] last:border-0">
                <p className="text-xs text-[#3A2410] leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-[#7A6A55] mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
