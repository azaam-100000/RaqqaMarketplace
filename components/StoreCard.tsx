

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store } from '../types';
import Avatar from './ui/Avatar';
import { supabase } from '../services/supabase';
import StarRating from './ui/StarRating';

const StorePlaceholderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-slate-600"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7"/></svg>
);

const StoreCard: React.FC<{ store: Store }> = ({ store }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (store.image_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(store.image_url);
      setImageUrl(data.publicUrl);
    } else {
        setImageUrl(null);
    }
  }, [store.image_url]);

  const ratings = store.store_ratings || [];
  const ratingCount = ratings.length;
  const avgRating = ratingCount > 0 
    ? ratings.reduce((acc, r) => acc + (r.rating || 0), 0) / ratingCount 
    : 0;

  return (
    <Link to={`/store/${store.id}`} className="block bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-cyan-500 transition-all duration-300 shadow-lg group">
      <div className="aspect-square w-full bg-slate-700 relative flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={store.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <StorePlaceholderIcon />
        )}
      </div>
      <div className="p-3">
           <h2 className="font-bold text-md text-white truncate mb-2">{store.name}</h2>
           <div className="flex items-center gap-2 mb-2">
              <Avatar url={store.profiles?.avatar_url} size={24} />
              <p className="text-xs text-slate-400 truncate">بواسطة {store.profiles?.full_name || 'مالك غير معروف'}</p>
          </div>
          <StarRating rating={avgRating} count={ratingCount} size="sm" />
      </div>
    </Link>
  );
};

export default StoreCard;
