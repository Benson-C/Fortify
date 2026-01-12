import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger, logAuthEvent } from '@/lib/logger';

/**
 * Handle Supabase auth callback (email verification, OAuth, etc.)
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        logAuthEvent({
          event: 'auth_callback_error',
          error: new Error(exchangeError.message),
        });
        return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
      }

      // Get user after code exchange
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        logAuthEvent({
          event: 'auth_callback_no_user',
          error: userError ? new Error(userError.message) : new Error('No user data'),
        });
        return NextResponse.redirect(new URL('/login?error=no_user', requestUrl.origin));
      }

      // Verify profile exists, create if missing
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        // Profile missing - create it
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || 'User',
            phone_number: user.user_metadata?.phone_number || null,
            id_number: user.user_metadata?.id_number || null,
          });

        if (insertError) {
          logAuthEvent({
            event: 'auth_callback_profile_creation_failed',
            userId: user.id,
            error: new Error(insertError.message),
          });
          return NextResponse.redirect(new URL('/login?error=profile_failed', requestUrl.origin));
        }
        
        logAuthEvent({
          event: 'auth_callback_profile_created',
          userId: user.id,
        });
      }

      logAuthEvent({
        event: 'auth_callback_success',
        userId: user.id,
        email: user.email,
      });

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logAuthEvent({
        event: 'auth_callback_exception',
        error,
      });
      return NextResponse.redirect(new URL('/login?error=unexpected', requestUrl.origin));
    }
  }

  // No code parameter - redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
