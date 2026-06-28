import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { notify } from "@/lib/notify";

// Modal to schedule a Kopi Meet-up with a connected kaki.
export function MeetupModal({
  inviteeId,
  inviteeName,
  onClose,
}: {
  inviteeId: string;
  inviteeName: string;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const [title, setTitle] = useState("Kopi Session");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!session?.user) return;
    if (!date || !time) { toast.error("Please pick a date and time"); return; }
    setSaving(true);
    const meetAt = new Date(`${date}T${time}`).toISOString();

    const { error } = await supabase.from("meetups").insert({
      organiser_id: session.user.id,
      invitee_id: inviteeId,
      title: title.trim() || "Kopi Session",
      location: location.trim() || null,
      meet_at: meetAt,
      status: "pending",
    });
    if (error) { setSaving(false); toast.error(error.message); return; }

    // Notify the invitee
    const myName = session.user.email?.split("@")[0] ?? "Someone";
    await notify({
      userId: inviteeId,
      actorId: session.user.id,
      type: "meetup_invite",
      message: `${myName} invited you to a Kopi Meet-up: ${title} on ${date} at ${time}`,
    });

    setSaving(false);
    toast.success(`Meet-up invite sent to ${inviteeName}!`);
    onClose();
  };

  // Today's date for the min attribute
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#EDE8DC] rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-[rgba(92,51,23,0.2)] rounded-full mx-auto sm:hidden" />
        <div>
          <h3 className="font-bold text-lg text-[#3A2410]">Schedule a Kopi Meet-up</h3>
          <p className="text-xs text-[#7A6A55] mt-0.5">with {inviteeName}</p>
        </div>

        <Field label="What's the plan?">
          <input className={inp} placeholder="e.g. CS2030S study session" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="Location">
          <input className={inp} placeholder="e.g. Central Library, COM3" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>

        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Date">
              <input type="date" min={todayStr} className={inp} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Time">
              <input type="time" className={inp} value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-[rgba(92,51,23,0.25)] py-3 text-sm text-[#7A6A55]">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="flex-1 rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] disabled:opacity-50">
            {saving ? "Sending..." : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#E0D9C8] px-4 py-2.5 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#7A6A55]">{label}</label>
      {children}
    </div>
  );
}
