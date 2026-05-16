import { supabase } from "../supabase";

export type Profile = {
  id: string;
  user_name: string;
  platforms: string[];
  whip_level: string;
  notification_enabled: boolean;
  notification_time: string;
  input_mode: "idea" | "note";
  push_token?: string | null;
};

export const profilesApi = {
  get: async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data ?? null;
  },

  upsert: async (profile: Partial<Profile> & { id: string }): Promise<void> => {
    await supabase.from("profiles").upsert(profile, { onConflict: "id" });
  },
};
