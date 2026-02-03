'use client';

import { useState } from 'react';
import { healthMetricSchema, type HealthMetricInput } from '@/lib/validations';
import { createClient } from '@/lib/supabase/client';

interface HealthMetricsFormProps {
  onSuccess?: () => void;
}

export default function HealthMetricsForm({ onSuccess }: HealthMetricsFormProps) {
  const [formData, setFormData] = useState<HealthMetricInput>({
    recorded_date: new Date().toISOString().slice(0, 16), // Format for datetime-local input
    grip_strength: undefined,
    bone_density: undefined,
    pushup_count: undefined,
    heart_rate: undefined,
    body_fat: undefined,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Convert datetime-local format to ISO string
      const submitData = {
        ...formData,
        recorded_date: formData.recorded_date 
          ? new Date(formData.recorded_date).toISOString()
          : undefined,
        // Ensure numbers are properly typed
        grip_strength: formData.grip_strength,
        bone_density: formData.bone_density,
        pushup_count: formData.pushup_count,
        heart_rate: formData.heart_rate,
        body_fat: formData.body_fat,
        notes: formData.notes || undefined,
      };

      const validated = healthMetricSchema.parse(submitData);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Prepare data for insertion
      const insertData: any = {
        user_id: user.id,
        recorded_date: validated.recorded_date || new Date().toISOString(),
      };

      if (validated.grip_strength !== undefined) insertData.grip_strength = validated.grip_strength;
      if (validated.bone_density !== undefined) insertData.bone_density = validated.bone_density;
      if (validated.pushup_count !== undefined) insertData.pushup_count = validated.pushup_count;
      if (validated.heart_rate !== undefined) insertData.heart_rate = validated.heart_rate;
      if (validated.body_fat !== undefined) insertData.body_fat = validated.body_fat;
      if (validated.notes !== undefined) insertData.notes = validated.notes;

      const { error: insertError } = await supabase
        .from('health_metrics')
        .insert(insertData);

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Reset form
      setFormData({
        recorded_date: new Date().toISOString().slice(0, 16),
        grip_strength: undefined,
        bone_density: undefined,
        pushup_count: undefined,
        heart_rate: undefined,
        body_fat: undefined,
        notes: '',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg animate-slide-up">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg animate-slide-up">
          <p className="font-medium">Health metrics saved successfully!</p>
        </div>
      )}

      <div>
        <label htmlFor="recorded_date" className="block text-sm font-semibold text-gray-700 mb-2">
          Date & Time
        </label>
        <input
          id="recorded_date"
          type="datetime-local"
          value={formData.recorded_date}
          onChange={(e) => setFormData({ ...formData, recorded_date: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-gray-900"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="grip_strength" className="block text-sm font-semibold text-gray-700 mb-2">
            Grip Strength
          </label>
          <input
            id="grip_strength"
            type="number"
            step="0.1"
            min="0"
            value={formData.grip_strength || ''}
            onChange={(e) => setFormData({ ...formData, grip_strength: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-gray-900"
            placeholder="kg"
          />
        </div>

        <div>
          <label htmlFor="bone_density" className="block text-sm font-semibold text-gray-700 mb-2">
            Bone Density
          </label>
          <input
            id="bone_density"
            type="number"
            step="0.01"
            min="0"
            value={formData.bone_density || ''}
            onChange={(e) => setFormData({ ...formData, bone_density: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-gray-900"
            placeholder="g/cm²"
          />
        </div>

        <div>
          <label htmlFor="pushup_count" className="block text-sm font-semibold text-gray-700 mb-2">
            Pushup Count
          </label>
          <input
            id="pushup_count"
            type="number"
            min="0"
            step="1"
            value={formData.pushup_count || ''}
            onChange={(e) => setFormData({ ...formData, pushup_count: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-gray-900"
            placeholder="count"
          />
        </div>

        <div>
          <label htmlFor="heart_rate" className="block text-sm font-semibold text-gray-700 mb-2">
            Heart Rate
          </label>
          <input
            id="heart_rate"
            type="number"
            min="1"
            step="1"
            value={formData.heart_rate || ''}
            onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-gray-900"
            placeholder="bpm"
          />
        </div>

        <div>
          <label htmlFor="body_fat" className="block text-sm font-semibold text-gray-700 mb-2">
            Body Fat Percentage
          </label>
          <input
            id="body_fat"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={formData.body_fat || ''}
            onChange={(e) => setFormData({ ...formData, body_fat: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-gray-900"
            placeholder="%"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white text-gray-900 resize-none"
          placeholder="Any additional notes..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 disabled:transform-none"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        ) : (
          'Save Health Metrics'
        )}
      </button>
    </form>
  );
}
