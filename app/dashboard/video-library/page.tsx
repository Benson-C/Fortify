import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/auth';
import Link from 'next/link';

export default async function VideoLibraryPage() {
  const { user, error } = await getUserProfile();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-4 text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-2 inline-block"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Video Library
          </h1>
          <p className="text-lg text-gray-600">Access instructional videos and resources</p>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-12 border border-gray-100 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Coming Soon</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            The video library will be available soon. Check back later for instructional videos and resources.
          </p>
        </div>
      </div>
    </div>
  );
}
