'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'react-qr-code';

export default function QRCodePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setLoading(false);
    }

    getUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            My QR Code
          </h1>
          <p className="text-lg text-gray-600">Scan this QR code to access your profile</p>
        </div>

        {/* QR Code Card */}
        <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-8 border border-gray-100">
          <div className="flex flex-col items-center">
            <div className="bg-white p-6 rounded-xl shadow-md mb-6">
              <QRCode
                value={userId}
                size={256}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                viewBox="0 0 256 256"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">User ID</p>
              <p className="text-xs font-mono text-gray-700 break-all bg-gray-50 px-4 py-2 rounded-lg">
                {userId}
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-6 text-center">
              Present this QR code at events for quick check-in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
