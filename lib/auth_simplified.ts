// Simplified auth utilities using admin_users table instead of role field
// Use this after running MIGRATE_TO_ADMIN_TABLE.sql

import { createClient } from '@/lib/supabase/server';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone_number: string | null;
  id_number: string | null;
  // No role field needed!
}

/**
 * Get the current user's profile
 */
export async function getUserProfile(): Promise<{ user: UserProfile | null; error: Error | null }> {
  try {
    const supabase = await createClient();
    
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return { user: null, error: authError ? new Error(authError.message) : new Error('Not authenticated') };
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, phone_number, id_number')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return { user: null, error: profileError ? new Error(profileError.message) : new Error('Profile not found') };
    }

    return { user: profile as UserProfile, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Check if the current user is an admin
 * Uses admin_users table instead of role field
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    // Check if user exists in admin_users table
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    return !error && !!data;
  } catch (err) {
    return false;
  }
}

/**
 * Get admin user IDs (for admin dashboard)
 */
export async function getAdminUserIds(): Promise<string[]> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id');

    if (error || !data) {
      return [];
    }

    return data.map(row => row.user_id);
  } catch (err) {
    return [];
  }
}
