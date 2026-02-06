'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { registerSchema, type RegisterInput } from '@/lib/validations';
import { logger, logAuthEvent } from '@/lib/logger';
import { checkRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { ThemeToggle } from '@/components/ThemeToggle';

type RegisterStep = 'account' | 'screening';
type YesNoAnswer = 'yes' | 'no' | null;
type FitnessLevel = '' | 'very low' | 'low' | 'moderate' | 'high';

type ScreeningKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8';
type ScreeningState = Record<ScreeningKey, { answer: YesNoAnswer; details: string }>;

const SCREENING_QUESTIONS: Array<{ key: ScreeningKey; number: number; text: string }> = [
  {
    key: 'q1',
    number: 1,
    text: 'Have you ever been diagnosed with heart disease, coronary artery disease, or heart failure?',
  },
  {
    key: 'q2',
    number: 2,
    text: 'Do you have shortness of breath that seems excessive for your level of activity?',
  },
  { key: 'q3', number: 3, text: 'Have you been diagnosed with high blood pressure (hypertension)?' },
  { key: 'q4', number: 4, text: 'Do you experience low blood sugar symptoms during physical activity?' },
  { key: 'q5', number: 5, text: 'Do you currently have any joint pain (knees, hips, shoulders, spine)?' },
  { key: 'q6', number: 6, text: 'Are there any movements you have been advised to avoid?' },
  { key: 'q7', number: 7, text: 'Do you have issues with balance, coordination, or frequent falls?' },
  {
    key: 'q8',
    number: 8,
    text: 'Are you currently taking prescription medications that may affect exercise (e.g. heart meds, blood pressure meds, insulin)?',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>('account');
  const [formData, setFormData] = useState<RegisterInput>({
    email: '',
    password: '',
    name: '',
    phone_number: '',
    id_number: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [screening, setScreening] = useState<ScreeningState>({
    q1: { answer: null, details: '' },
    q2: { answer: null, details: '' },
    q3: { answer: null, details: '' },
    q4: { answer: null, details: '' },
    q5: { answer: null, details: '' },
    q6: { answer: null, details: '' },
    q7: { answer: null, details: '' },
    q8: { answer: null, details: '' },
  });
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  /**
   * Poll for profile existence with exponential backoff
   * Returns true if profile exists, false if not found after max attempts
   */
  async function waitForProfile(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    maxAttempts = 5
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (profile) {
        logger.auth('Profile found after %d attempts', attempt + 1);
        return true;
      }

      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
      const delay = 100 * Math.pow(2, attempt);
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    logger.auth('Profile not found after %d attempts', maxAttempts);
    return false;
  }

  const handleNext = () => {
    setError(null);
    setStatus('');

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validated = registerSchema.safeParse(formData);
    if (!validated.success) {
      setError(validated.error.issues[0]?.message || 'Please check your details and try again.');
      return;
    }

    setStep('screening');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('');

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate screening questions
    for (const q of SCREENING_QUESTIONS) {
      const state = screening[q.key];
      if (state.answer === null) {
        setError(`Please answer question ${q.number}.`);
        return;
      }
      if (state.answer === 'yes' && !state.details.trim()) {
        setError(`Please describe your answer for question ${q.number}.`);
        return;
      }
    }

    if (!fitnessLevel) {
      setError('Please select your exercise and fitness level.');
      return;
    }

    if (!consentConfirmed) {
      setError('Please confirm that the information provided is accurate and complete.');
      return;
    }

    setLoading(true);
    setStatus('Validating form...');

    // Give React a chance to paint the loading overlay immediately
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));

    let keepLoadingForRedirect = false;
    try {
      // Step 1: Validate form data first
      const validated = registerSchema.parse(formData);
      
      // CRITICAL FIX #7: Rate limiting
      // Note: In production, this should be done at the edge/server level
      // Using email as key (IP-based rate limiting should be server-side)
      const rateLimit = checkRateLimit(
        `register:${validated.email}`,
        RateLimitPresets.registration.maxRequests,
        RateLimitPresets.registration.windowMs
      );

      if (rateLimit.limited) {
        const resetMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 60000);
        setError(`Too many registration attempts. Please try again in ${resetMinutes} minute(s).`);
        setLoading(false);
        return;
      }

      logAuthEvent({ event: 'registration_started', email: validated.email });
      setStatus('Creating account...');
      
      // Step 2: Create Supabase client
      const supabase = createClient();

      // Step 3: Sign up user with email redirect URL
      const { data, error: authError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: validated.name,
            phone_number: validated.phone_number || null,
            id_number: validated.id_number || null,
            pre_exercise_screening: {
              submitted_at: new Date().toISOString(),
              questions: SCREENING_QUESTIONS.map(q => ({
                number: q.number,
                question: q.text,
                answer: screening[q.key].answer === 'yes',
                details: screening[q.key].answer === 'yes' ? screening[q.key].details.trim() : null,
              })),
              fitness_level: fitnessLevel,
              consent_confirmed: consentConfirmed,
            },
          },
        },
      });

      if (authError) {
        logAuthEvent({
          event: 'registration_failed',
          email: validated.email,
          error: new Error(authError.message),
        });
        setError('Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // CRITICAL FIX #1: Check if email verification is required
      if (data.user && !data.session) {
        // Email confirmation required
        logAuthEvent({
          event: 'registration_email_verification_required',
          email: validated.email,
          userId: data.user.id,
        });
        setStatus('');
        setError(null);
        setLoading(false);
        // Redirect to verification page
        router.push(`/register/verify-email?email=${encodeURIComponent(validated.email)}`);
        return;
      }

      if (!data.user) {
        logAuthEvent({
          event: 'registration_no_user_data',
          email: validated.email,
        });
        setError('Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      logAuthEvent({
        event: 'registration_user_created',
        email: validated.email,
        userId: data.user.id,
      });

      // Step 4: Wait for database trigger to create profile (with polling)
      setStatus('Setting up your profile...');
      const profileExists = await waitForProfile(supabase, data.user.id);

      if (!profileExists) {
        setStatus('Creating profile...');
        
        // Refresh session to ensure auth.uid() is available
        await supabase.auth.refreshSession();
        
        // Final check before fallback insert
        const { data: finalCheck } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!finalCheck) {
          // Fallback - manually create profile using auth user metadata
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              name: authUser?.user_metadata?.name || validated.name,
              phone_number: authUser?.user_metadata?.phone_number || validated.phone_number || null,
              id_number: authUser?.user_metadata?.id_number || validated.id_number || null,
            });

          if (insertError) {
            logAuthEvent({
              event: 'registration_profile_creation_failed',
              email: validated.email,
              userId: data.user.id,
              error: new Error(insertError.message),
            });
            setError('Account created but profile setup failed. Please contact support.');
            setLoading(false);
            return;
          }
          
          logAuthEvent({
            event: 'registration_profile_created_fallback',
            email: validated.email,
            userId: data.user.id,
          });
        }
      }

      // CRITICAL FIX #8: Explicitly refresh session before redirect
      setStatus('Finalizing...');
      await supabase.auth.refreshSession();

      logAuthEvent({
        event: 'registration_completed',
        email: validated.email,
        userId: data.user.id,
      });

      keepLoadingForRedirect = true;
      setStatus('Redirecting...');
      router.push('/dashboard');
      router.refresh();
      return;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logAuthEvent({
        event: 'registration_error',
        email: formData.email,
        error,
      });
      setError('An unexpected error occurred. Please try again.');
    } finally {
      if (!keepLoadingForRedirect) {
        setLoading(false);
        setStatus('');
      }
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    if (step === 'account') {
      e.preventDefault();
      handleNext();
      return;
    }
    void handleCreateAccount(e);
  };

  const isReadyToCreateAccount =
    step === 'screening' &&
    !loading &&
    consentConfirmed &&
    !!fitnessLevel &&
    SCREENING_QUESTIONS.every(q => {
      const state = screening[q.key];
      if (state.answer === null) return false;
      if (state.answer === 'yes' && !state.details.trim()) return false;
      return true;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {loading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm px-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-soft-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3">
              <svg
                className="animate-spin h-6 w-6 text-indigo-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">Creating your account</p>
                <p className="text-sm text-gray-600">{status || 'Please wait...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft-lg p-8 border border-gray-100 animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {step === 'account' ? 'Create Account' : 'Pre-Exercise Screening'}
          </h1>
          <p className="text-gray-600">
            {step === 'account'
              ? 'Step 1 of 2: Enter your account details'
              : 'Step 2 of 2: Answer a few questions before creating your account'}
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg animate-slide-up">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {status && !error && (
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded-r-lg animate-slide-up">
            <p className="font-medium">{status}</p>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {step === 'account' ? (
            <>
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
                  placeholder="At least 8 characters with uppercase, lowercase, number, and special character"
                  required
                  minLength={8}
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
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 disabled:transform-none"
              >
                Next
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                {SCREENING_QUESTIONS.map((q) => {
                  const state = screening[q.key];
                  return (
                    <div key={q.key} className="p-4 rounded-xl border border-gray-200 bg-white/70">
                      <p className="text-sm font-semibold text-gray-800">
                        {q.number}. {q.text}
                      </p>

                      <div className="mt-3 flex items-center gap-6">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name={q.key}
                            value="yes"
                            checked={state.answer === 'yes'}
                            onChange={() =>
                              setScreening(prev => ({
                                ...prev,
                                [q.key]: { ...prev[q.key], answer: 'yes' },
                              }))
                            }
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          Yes
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="radio"
                            name={q.key}
                            value="no"
                            checked={state.answer === 'no'}
                            onChange={() =>
                              setScreening(prev => ({
                                ...prev,
                                [q.key]: { answer: 'no', details: '' },
                              }))
                            }
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          No
                        </label>
                      </div>

                      {state.answer === 'yes' && (
                        <div className="mt-3">
                          <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor={`${q.key}_details`}>
                            Please describe <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id={`${q.key}_details`}
                            value={state.details}
                            onChange={(e) =>
                              setScreening(prev => ({
                                ...prev,
                                [q.key]: { ...prev[q.key], details: e.target.value },
                              }))
                            }
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-900 min-h-[96px]"
                            placeholder="Please describe..."
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-white/70">
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  9. How would you describe your exercise and fitness level?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(['very low', 'low', 'moderate', 'high'] as const).map((level) => (
                    <label
                      key={level}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                        fitnessLevel === level
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fitnessLevel"
                        value={level}
                        checked={fitnessLevel === level}
                        onChange={() => setFitnessLevel(level)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium capitalize">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white/70">
                <input
                  type="checkbox"
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  I confirm that the information provided is accurate and complete.
                </span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStatus('');
                    setStep('account');
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={loading}
                  className="w-1/3 bg-white text-gray-700 py-3.5 px-4 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={!isReadyToCreateAccount}
                  className="w-2/3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {status || 'Creating account...'}
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </>
          )}
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
