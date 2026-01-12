'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, type RegisterInput } from '@/lib/validations';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterInput>({
    email: '',
    password: '',
    name: '',
    phone_number: '',
    id_number: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.warn('[REGISTER] Starting registration process...');
        console.warn('[REGISTER] Form data:', { ...formData, password: '***' });
      }
      
      // Step 1: Validate form data
      const validated = registerSchema.parse(formData);
      if (process.env.NODE_ENV === 'development') {
        console.warn('[REGISTER] ✓ Form validation passed');
      }
      
      // Step 2: Create Supabase client
      const supabase = createClient();
      if (process.env.NODE_ENV === 'development') {
        console.warn('[REGISTER] ✓ Supabase client created');
      }

      // Step 3: Sign up user
      if (process.env.NODE_ENV === 'development') {
        console.warn('[REGISTER] Attempting to sign up user...');
      }
      const { data, error: authError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            name: validated.name,
            phone_number: validated.phone_number || null,
            id_number: validated.id_number || null,
          },
        },
      });

      if (authError) {
        console.error('[REGISTER] ✗ Auth error:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
        });
        setError(`Registration failed: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.warn('[REGISTER] ✓ User signed up successfully');
        console.warn('[REGISTER] User ID:', data.user?.id);
        console.warn('[REGISTER] User email:', data.user?.email);
      }

      if (data.user) {
        // Step 4: Wait for database trigger to create profile
        if (process.env.NODE_ENV === 'development') {
          console.warn('[REGISTER] Waiting for database trigger to create profile...');
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 5: Check if profile exists
        if (process.env.NODE_ENV === 'development') {
          console.warn('[REGISTER] Checking if user profile exists...');
        }
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          console.warn('[REGISTER] Profile not found, trigger may have failed');
          console.warn('[REGISTER] Profile error:', profileError);
          
          // Step 6: Fallback - manually create profile
          if (process.env.NODE_ENV === 'development') {
            console.warn('[REGISTER] Attempting to create profile manually...');
          }
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: validated.email,
              name: validated.name,
              phone_number: validated.phone_number || null,
              id_number: validated.id_number || null,
              role: 'participant',
            });

          if (insertError) {
            console.error('[REGISTER] ✗ Failed to create user profile:', {
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              code: insertError.code,
            });
            setError(`Account created but profile setup failed: ${insertError.message}. Please contact support.`);
            setLoading(false);
            return;
          }
          if (process.env.NODE_ENV === 'development') {
            console.warn('[REGISTER] ✓ Profile created manually');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[REGISTER] ✓ Profile exists (created by trigger)');
          }
        }

        if (process.env.NODE_ENV === 'development') {
          console.warn('[REGISTER] ✓ Registration complete, redirecting to dashboard...');
        }
        router.push('/dashboard');
        router.refresh();
      } else {
        console.error('[REGISTER] ✗ No user data returned from signUp');
        setError('Registration failed: No user data returned');
      }
    } catch (err) {
      console.error('[REGISTER] ✗ Unexpected error:', err);
      if (err instanceof Error) {
        console.error('[REGISTER] Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name,
        });
        setError(err.message);
      } else {
        console.error('[REGISTER] Unknown error type:', typeof err, err);
        setError('An unexpected error occurred. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-lg p-8 border border-gray-100 animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join our research study today</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg animate-slide-up">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label htmlFor="id_number" className="block text-sm font-semibold text-gray-700 mb-2">
                ID Number
              </label>
              <input
                id="id_number"
                type="text"
                value={formData.id_number}
                onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900"
              placeholder="Re-enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
              Sign in here
            </Link>
          </p>
          <Link href="/" className="block text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
