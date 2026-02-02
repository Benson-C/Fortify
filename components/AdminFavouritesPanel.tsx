'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface FavoriteEvent {
  id: string;
  title: string;
  date_time: string;
  event_type: string;
  location: string | null;
}

export default function AdminFavouritesPanel() {
  const [favorites, setFavorites] = useState<FavoriteEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // First get favorite event IDs
    const { data: favoritesData, error: favoritesError } = await supabase
      .from('admin_event_favorites')
      .select('event_id')
      .eq('admin_id', user.id)
      .order('created_at', { ascending: false });

    if (favoritesError) {
      console.error('Error loading favorites:', favoritesError);
      setLoading(false);
      return;
    }

    if (!favoritesData || favoritesData.length === 0) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    // Then fetch the actual events
    const eventIds = favoritesData.map((f) => f.event_id);
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, title, date_time, event_type, location')
      .in('id', eventIds);

    if (eventsError) {
      console.error('Error loading favorite events:', eventsError);
      setLoading(false);
      return;
    }

    // Preserve the order from favorites
    const favoriteEventsMap = new Map((eventsData || []).map((e) => [e.id, e]));
    const favoriteEvents = eventIds
      .map((id) => favoriteEventsMap.get(id))
      .filter(Boolean) as FavoriteEvent[];

    setFavorites(favoriteEvents);
    setLoading(false);
  }

  const handleRemoveFavorite = async (eventId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from('admin_event_favorites')
      .delete()
      .eq('admin_id', user.id)
      .eq('event_id', eventId);

    if (error) {
      console.error('Error removing favorite:', error);
      return;
    }

    // Reload favorites
    await loadFavorites();
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 mb-10 border border-gray-100">
        <h2 className="text-2xl font-bold text-indigo-600 mb-4">Favourites</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 mb-10 border border-gray-100">
        <h2 className="text-2xl font-bold text-indigo-600 mb-4">Favourites</h2>
        <p className="text-gray-500 text-sm">No favorited events yet. Star events from the events page to add them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-soft p-6 mb-10 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-indigo-600">Favourites</h2>
        <Link
          href="/admin/events"
          className="text-indigo-600 hover:underline text-sm font-semibold"
        >
          Manage Events →
        </Link>
      </div>
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex gap-4 min-w-max">
          {favorites.map((event) => {
            const eventDate = new Date(event.date_time);
            const isPast = eventDate < new Date();

            return (
              <div
                key={event.id}
                className="flex-shrink-0 w-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 hover:shadow-md transition-all duration-300 hover:border-indigo-200 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/admin/events`}
                    className="flex-1 hover:underline"
                  >
                    <h3 className="font-bold text-indigo-700 text-sm mb-1 line-clamp-2 group-hover:text-indigo-800">
                      {event.title}
                    </h3>
                  </Link>
                  <button
                    onClick={() => handleRemoveFavorite(event.id)}
                    className="ml-2 flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                    title="Remove from favorites"
                  >
                    <svg
                      className="w-4 h-4 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location || 'TBA'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-700">
                      {event.event_type}
                    </span>
                    {isPast && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-600">
                        Past
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
