
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-1/2 w-1/2 text-slate-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

interface AvatarProps {
  url: string | null | undefined;
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ url, size = 40, className = '' }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (url) {
      // Check if the URL is already a full HTTP URL
      if (url.startsWith('http')) {
        setAvatarUrl(url);
      } else {
        // Otherwise, assume it's a path and get the public URL from Supabase
        const { data } = supabase.storage.from('uploads').getPublicUrl(url);
        setAvatarUrl(data.publicUrl);
      }
    } else {
      setAvatarUrl(null);
    }
  }, [url]);

  const style = {
    height: `${size}px`,
    width: `${size}px`,
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Avatar"
        className={`rounded-full object-cover ${className}`}
        style={style}
        onError={() => setAvatarUrl(null)} // Fallback if image fails to load
      />
    );
  }

  return (
    <div
      className={`bg-slate-700 rounded-full flex items-center justify-center overflow-hidden ${className}`}
      style={style}
    >
      <UserIcon />
    </div>
  );
};

export default Avatar;
