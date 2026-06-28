import { supabase } from "@/integrations/supabase/client";

// Insert a notification for another user.
// Call this whenever an action should alert someone.
export async function notify(params: {
  userId: string;       // recipient
  actorId: string;      // who triggered it
  type: "request" | "request_accepted" | "meetup_invite" | "meetup_accepted" | "meetup_declined";
  message: string;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    actor_id: params.actorId,
    type: params.type,
    message: params.message,
  });
  if (error) console.error("notify error:", error.message);
}
