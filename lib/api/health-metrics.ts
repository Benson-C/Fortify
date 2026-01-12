import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { healthMetricSchema, type HealthMetricInput } from '@/lib/validations';
import type { HealthMetric } from './types';
import { logDbOperation } from '@/lib/logger';

/**
 * Get all health metrics for the current user
 */
export async function getUserHealthMetrics(): Promise<{ metrics: HealthMetric[]; error: Error | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { metrics: [], error: new Error('Not authenticated') };
    }

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_date', { ascending: false });

    if (error) {
      logDbOperation({
        operation: 'select',
        table: 'health_metrics',
        userId: user.id,
        query: { user_id: user.id },
        error: new Error(error.message),
        duration: Date.now() - startTime,
      });
      return { metrics: [], error: new Error(error.message) };
    }

    logDbOperation({
      operation: 'select',
      table: 'health_metrics',
      userId: user.id,
      query: { user_id: user.id },
      result: data,
      duration: Date.now() - startTime,
    });

    return { metrics: (data || []) as HealthMetric[], error: null };
  } catch (err) {
    return { metrics: [], error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Get latest health metric for the current user
 */
export async function getLatestHealthMetric(): Promise<{ metric: HealthMetric | null; error: Error | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { metric: null, error: new Error('Not authenticated') };
    }

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logDbOperation({
        operation: 'select',
        table: 'health_metrics',
        userId: user.id,
        query: { user_id: user.id, limit: 1 },
        error: new Error(error.message),
        duration: Date.now() - startTime,
      });
      return { metric: null, error: new Error(error.message) };
    }

    return { metric: (data as HealthMetric) || null, error: null };
  } catch (err) {
    return { metric: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Create a new health metric entry
 */
export async function createHealthMetric(input: HealthMetricInput): Promise<{ metric: HealthMetric | null; error: Error | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { metric: null, error: new Error('Not authenticated') };
    }

    // Validate input
    const validated = healthMetricSchema.parse(input);

    // Prepare data for insertion
    const insertData: any = {
      user_id: user.id,
      recorded_date: validated.recorded_date ? new Date(validated.recorded_date).toISOString() : new Date().toISOString(),
    };

    if (validated.grip_strength !== undefined) insertData.grip_strength = validated.grip_strength;
    if (validated.bone_density !== undefined) insertData.bone_density = validated.bone_density;
    if (validated.pushup_count !== undefined) insertData.pushup_count = validated.pushup_count;
    if (validated.heart_rate !== undefined) insertData.heart_rate = validated.heart_rate;
    if (validated.body_fat !== undefined) insertData.body_fat = validated.body_fat;
    if (validated.notes !== undefined) insertData.notes = validated.notes;

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('health_metrics')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logDbOperation({
        operation: 'insert',
        table: 'health_metrics',
        userId: user.id,
        query: insertData,
        error: new Error(error.message),
        duration: Date.now() - startTime,
      });
      return { metric: null, error: new Error(error.message) };
    }

    logDbOperation({
      operation: 'insert',
      table: 'health_metrics',
      userId: user.id,
      query: insertData,
      result: data,
      duration: Date.now() - startTime,
    });

    return { metric: data as HealthMetric, error: null };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { metric: null, error: new Error(err.errors[0].message) };
    }
    return { metric: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

/**
 * Client-side function to create health metric (for use in client components)
 */
export async function createHealthMetricClient(input: HealthMetricInput): Promise<{ metric: HealthMetric | null; error: Error | null }> {
  try {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { metric: null, error: new Error('Not authenticated') };
    }

    // Validate input
    const validated = healthMetricSchema.parse(input);

    // Prepare data for insertion
    const insertData: any = {
      user_id: user.id,
      recorded_date: validated.recorded_date ? new Date(validated.recorded_date).toISOString() : new Date().toISOString(),
    };

    if (validated.grip_strength !== undefined) insertData.grip_strength = validated.grip_strength;
    if (validated.bone_density !== undefined) insertData.bone_density = validated.bone_density;
    if (validated.pushup_count !== undefined) insertData.pushup_count = validated.pushup_count;
    if (validated.heart_rate !== undefined) insertData.heart_rate = validated.heart_rate;
    if (validated.body_fat !== undefined) insertData.body_fat = validated.body_fat;
    if (validated.notes !== undefined) insertData.notes = validated.notes;

    const startTime = Date.now();
    const { data, error } = await supabase
      .from('health_metrics')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logDbOperation({
        operation: 'insert',
        table: 'health_metrics',
        userId: user.id,
        query: insertData,
        error: new Error(error.message),
        duration: Date.now() - startTime,
      });
      return { metric: null, error: new Error(error.message) };
    }

    logDbOperation({
      operation: 'insert',
      table: 'health_metrics',
      userId: user.id,
      query: insertData,
      result: data,
      duration: Date.now() - startTime,
    });

    return { metric: data as HealthMetric, error: null };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { metric: null, error: new Error(err.errors[0].message) };
    }
    return { metric: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
