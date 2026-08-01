import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  AuthenticationError,
  AuthorizationError,
} from "@/lib/utils/errors";

export type AdminProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "editor";
  created_at: string;
  updated_at: string;
};

export type AdminContext = {
  user: User;
  profile: AdminProfile;
  supabase: SupabaseClient;
};

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

async function getProfileForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new AuthorizationError("Profil bilgisi alınamadı", {
      message: error.message,
    });
  }

  if (!data) {
    return null;
  }

  return data as AdminProfile;
}

/**
 * Layout / sayfa koruması: oturum yoksa login'e, admin değilse 403'e yönlendirir.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const profile = await getProfileForUser(supabase, user.id);

  if (!profile || profile.role !== "admin") {
    redirect("/admin/forbidden");
  }

  return { user, profile, supabase };
}

/**
 * Server action koruması: redirect yerine hata fırlatır.
 */
export async function requireAdminAction(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationError("Admin paneline erişmek için giriş yapın");
  }

  const profile = await getProfileForUser(supabase, user.id);

  if (!profile || profile.role !== "admin") {
    throw new AuthorizationError("Bu işlem yalnızca yöneticiler içindir");
  }

  return { user, profile, supabase };
}
