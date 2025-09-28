

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Group } from '../types';
import { supabase } from '../services/supabase';

const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

const GroupCard: React.FC<{ group: Group }> = ({ group }) => {
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const memberCount = group.group_members[0]?.count || 0;

  useEffect(() => {
    if (group.cover_image_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(group.cover_image_url);
      setCoverImageUrl(data.publicUrl);
    } else {
      setCoverImageUrl(null);
    }
  }, [group.cover_image_url]);

  return (
    <Link 
      to={`/group/${group.id}`} 
      className="block relative aspect-[4/3] w-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden group hover:border-cyan-500 transition-all duration-300 shadow-lg"
    >
      {coverImageUrl ? (
        <img src={coverImageUrl} alt={group.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800"></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h2 className="font-bold text-lg truncate">{group.name}</h2>
        <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
          {group.is_private ? <LockIcon /> : <GlobeIcon />}
          <span>{group.is_private ? 'خاصة' : 'عامة'}</span>
          <span>•</span>
          <span>{memberCount} {memberCount === 1 ? 'عضو' : 'أعضاء'}</span>
        </div>
      </div>
    </Link>
  );
};

export default GroupCard;