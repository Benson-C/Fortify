import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { z } from 'zod';
import type { Booking } from './types';
import { logDbOperation, logApiCall } from '@/lib/logger';

/**
 * Get all bookings for the current user
 */
export async function getUserBookings(): Promise<{ bookings: Booking[]; error: Error | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { bookings: [], error: new Error('Not authenticated') };
    }

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        events (
          id,
          title,
          date_time,
          duration,
          event_type,
          location,
          instructor_name
        )
      `)
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false });

    if (error) {
      logDbOperation({
        operation: 'select',
        table: 'bookings',
        userId: user.id,
        query: { user_id: user.id },
        error: new Error(error.message),
        duration: Date.now() - startTime,
      });
      return { bookings: [], error: new Error(error.message) };
    }

    logDbOperation({
      operation: 'select',
      table: 'bookings',
      userId: user.id,
      query: { user_id: user.id },
      result: data,
      duration: Date.now() - startTime,
    });

    return { bookings: (data || []) as Booking[], error: null };
  } catch (err) {
    return { bookings: [], error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get booking count for an event
 */
export async function getEventBookingCount(eventId: string): Promise<{ count: number; error: Error | null }> {
  try {
    const supabase = await createClient();
    const startTime = Date.now();

    const { count, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmed');

    if (error) {
      logDbOperation({
        operation: 'count',
        table: 'bookings',
        query: { event_id: eventId, status: 'confirmed' },
        error: new Error(error.message),
        duration: Date.now() - startTime,
      });
      return { count: 0, error: new Error(error.message) };
    }

    logDbOperation({
      operation: 'count',
      table: 'bookings',
      query: { event_id: eventId, status: 'confirmed' },
      result: { count: count || 0 },
      duration: Date.now() - startTime,
    });

    return { count: count || 0, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logDbOperation({
      operation: 'count',
      table: 'bookings',
      query: { event_id: eventId },
      error,
    });
    return { count: 0, error };
  }
}

/**
 * Check if user is already booked for an event
 */
export async function isUserBooked(eventId: string): Promise<{ isBooked: boolean; bookingId: string | null; error: Error | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { isBooked: false, bookingId: null, error: new Error('Not authenticated') };
    }

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logDbOperation({
        operation: 'select',
        table: 'bookings',
        userId: user.id,
        query: { user_id: user.id, event_id: eventId, status: 'confirmed' },
        error: new Error(error.message),
        duration: Date.now() - startTime,
      });
      return { isBooked: false, bookingId: null, error: new Error(error.message) };
    }

    return { isBooked: !!data, bookingId: data?.id || null, error: null };
  } catch (err) {
    return { isBooked: false, bookingId: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Create a booking for an event (uses atomic database function to prevent race conditions)
 */
export async function createBooking(eventId: string): Promise<{ booking: Booking | null; error: Error | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { booking: null, error: new Error('Not authenticated') };
    }

    // Use atomic database function to prevent race conditions
    const { data: result, error: functionError } = await supabase.rpc('create_booking_safe', {
      p_user_id: user.id,
      p_event_id: eventId,
    });

    if (functionError) {
      return { booking: null, error: new Error(functionError.message) };
    }

    if (!result || !result.success) {
      return { 
        booking: null, 
        error: new Error(result?.error || 'Failed to create booking') 
      };
    }

    // Fetch the created booking with event details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        events (
          id,
          title,
          date_time,
          duration,
          event_type,
          location,
          instructor_name
        )
      `)
      .eq('id', result.booking_id)
      .single();

    if (fetchError || !booking) {
      return { booking: null, error: new Error('Booking created but could not be retrieved') };
    }

    return { booking: booking as Booking, error: null };
  } catch (err) {
    return { booking: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Cancel a booking (with 24-hour policy check)
 */
export async function cancelBooking(bookingId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: new Error('Not authenticated') };
    }

    // Get booking with event details
    const fetchStartTime = Date.now();
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        events (
          date_time
        )
      `)
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .single();

    if (fetchError || !booking) {
      const error = new Error('Booking not found');
      logDbOperation({
        operation: 'select',
        table: 'bookings',
        userId: user.id,
        query: { id: bookingId, user_id: user.id, status: 'confirmed' },
        error: fetchError ? new Error(fetchError.message) : error,
        duration: Date.now() - fetchStartTime,
      });
      return { success: false, error };
    }

    const eventDate = new Date((booking.events as any).date_time);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check 24-hour cancellation policy
    if (hoursUntilEvent < 24) {
      return { success: false, error: new Error('Cancellations must be made at least 24 hours before the event') };
    }

    // Cancel booking
    const updateStartTime = Date.now();
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('user_id', user.id);

    if (updateError) {
      logDbOperation({
        operation: 'update',
        table: 'bookings',
        userId: user.id,
        query: { id: bookingId, status: 'cancelled' },
        error: new Error(updateError.message),
        duration: Date.now() - updateStartTime,
      });
      return { success: false, error: new Error(updateError.message) };
    }

    logDbOperation({
      operation: 'update',
      table: 'bookings',
      userId: user.id,
      query: { id: bookingId, status: 'cancelled' },
      result: { success: true },
      duration: Date.now() - updateStartTime,
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Client-side function to create booking (for use in client components)
 * Uses atomic database function to prevent race conditions
 */
export async function createBookingClient(eventId: string): Promise<{ booking: Booking | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { booking: null, error: new Error('Not authenticated') };
    }

    // Use atomic database function to prevent race conditions
    const startTime = Date.now();
    const { data: result, error: functionError } = await supabase.rpc('create_booking_safe', {
      p_user_id: user.id,
      p_event_id: eventId,
    });

    if (functionError) {
      logApiCall({
        method: 'RPC',
        url: 'create_booking_safe',
        userId: user.id,
        request: { p_user_id: user.id, p_event_id: eventId },
        error: new Error(functionError.message),
        duration: Date.now() - startTime,
      });
      return { booking: null, error: new Error(functionError.message) };
    }

    if (!result || !result.success) {
      const error = new Error(result?.error || 'Failed to create booking');
      logApiCall({
        method: 'RPC',
        url: 'create_booking_safe',
        userId: user.id,
        request: { p_user_id: user.id, p_event_id: eventId },
        response: result,
        error,
        duration: Date.now() - startTime,
      });
      return { booking: null, error };
    }

    // Fetch the created booking with event details
    const fetchStartTime = Date.now();
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        events (
          id,
          title,
          date_time,
          duration,
          event_type,
          location,
          instructor_name
        )
      `)
      .eq('id', result.booking_id)
      .single();

    if (fetchError || !booking) {
      logDbOperation({
        operation: 'select',
        table: 'bookings',
        userId: user.id,
        query: { id: result.booking_id },
        error: fetchError ? new Error(fetchError.message) : new Error('Booking created but could not be retrieved'),
        duration: Date.now() - fetchStartTime,
      });
      return { booking: null, error: new Error('Booking created but could not be retrieved') };
    }

    logApiCall({
      method: 'RPC',
      url: 'create_booking_safe',
      userId: user.id,
      request: { p_user_id: user.id, p_event_id: eventId },
      response: booking,
      duration: Date.now() - startTime,
    });

    return { booking: booking as Booking, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logApiCall({
      method: 'RPC',
      url: 'create_booking_safe',
      request: { eventId },
      error,
    });
    return { booking: null, error };
  }
}
