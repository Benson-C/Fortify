import { createClient } from '@/lib/supabase/server';
import { logDbOperation } from '@/lib/logger';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone_number: string | null;
  id_number: string | null;
  // Note: role field removed - use isAdmin() to check admin status
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

    const startTime = Date.now();
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, phone_number, id_number')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      logDbOperation({
        operation: 'select',
        table: 'users',
        userId: authUser.id,
        query: { id: authUser.id },
        error: profileError ? new Error(profileError.message) : new Error('Profile not found'),
        duration: Date.now() - startTime,
      });
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
    // Use the "Users can check own admin status" policy (user_id = auth.uid())
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      logDbOperation({
        operation: 'select',
        table: 'admin_users',
        userId: user.id,
        query: { user_id: user.id },
        error: new Error(error.message),
        duration: Date.now() - startTime,
      });
    }

    return !error && !!data;
  } catch (err) {
    return false;
  }
}
