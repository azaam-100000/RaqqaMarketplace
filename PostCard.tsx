

import React, { useState, useEffect, useRef } from 'react';
import { Post } from './types';
import Avatar from './components/ui/Avatar';
import { useAuth } from './hooks/useAuth';
import { supabase } from './services/supabase';
import { Link } from 'react-router-dom';
import Textarea from './components/ui/Textarea';
import Button from './components/ui/Button';
import { getErrorMessage } from './utils/errors';

// Simple time ago function
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) {
    return `منذ ${Math.floor(interval)} سنة`;
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return `منذ ${Math.floor(interval)} شهر`;
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return `منذ ${Math.floor(interval)} يوم`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return `منذ ${Math.floor(interval)} ساعة`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    return `منذ ${Math.floor(interval)} دقيقة`;
  }
  return 'الآن';
};

const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-6 w-6 transition-colors duration-200 ${
        filled ? 'text-red-500' : 'text-slate-400 group-hover:text-red-400'
      }`}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const CommentIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

const MoreIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
);

interface PostCardProps {
    post: Post;
    onPostDeleted?: (postId: string) => void;
    onPostUpdated?: (updatedPost: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onPostDeleted, onPostUpdated }) => {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes.length);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [postImageUrl, setPostImageUrl] = useState<string | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const commentCount = post.comments[0]?.count || 0;
    const isOwner = user?.id === post.user_id;

    const CONTENT_LIMIT = 250;
    const isLongPost = post.content.length > CONTENT_LIMIT;
    
    useEffect(() => {
        if (post.image_url) {
            const { data } = supabase.storage.from('uploads').getPublicUrl(post.image_url);
            setPostImageUrl(data.publicUrl);
        } else {
            setPostImageUrl(null);
        }
    }, [post.image_url]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (user) {
            const liked = post.likes.some(like => like.user_id === user.id);
            setIsLiked(liked);
        } else {
            setIsLiked(false);
        }
        setLikeCount(post.likes.length);
    }, [post.likes, user]);
    
    const handleLikeToggle = async () => {
        if (!user) {
            alert('يجب عليك تسجيل الدخول أولاً لتتمكن من الإعجاب بالمنشورات.');
            return;
        }

        const currentlyLiked = isLiked;
        setIsLiked(!currentlyLiked);

        if (currentlyLiked) {
            setLikeCount(prev => prev - 1);
            const { error } = await supabase.from('likes').delete().match({ post_id: post.id, user_id: user.id });
            if (error) {
                console.error('Error unliking post:', error);
                setIsLiked(true); // Revert UI on error
                setLikeCount(prev => prev + 1);
            }
        } else {
            setLikeCount(prev => prev + 1);
            const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
            if (error) {
                console.error('Error liking post:', error);
                setIsLiked(false); // Revert UI on error
                setLikeCount(prev => prev - 1);
            } else {
                 // Send notification if not liking own post
                if (user.id !== post.user_id) {
                    await supabase.from('notifications').insert({
                        user_id: post.user_id, // Recipient
                        actor_id: user.id,     // Sender
                        type: 'like_post',
                        entity_id: post.id,
                    });
                }
            }
        }
    };

    const handleDelete = async () => {
        setIsMenuOpen(false);
        if (window.confirm('هل أنت متأكد من أنك تريد حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء.')) {
            const { error } = await supabase.from('posts').delete().eq('id', post.id);
            if (error) {
                console.error('Error deleting post:', error);
                alert(`فشل حذف المنشور: ${getErrorMessage(error)}`);
            } else {
                onPostDeleted?.(post.id);
            }
        }
    };

    const handleUpdate = async () => {
        if (!editedContent.trim()) return;
        setUpdateLoading(true);
        const { data: updatedPost, error } = await supabase
            .from('posts')
            .update({ content: editedContent.trim() })
            .eq('id', post.id)
            .select('id, content')
            .single();
        
        setUpdateLoading(false);
        if (error) {
             console.error('Error updating post:', error);
             alert(`فشل تحديث المنشور: ${getErrorMessage(error)}`);
        } else if (updatedPost) {
            const fullUpdatedPost: Post = {
                ...post,
                ...updatedPost,
            };
            onPostUpdated?.(fullUpdatedPost);
            setIsEditing(false);
        }
    };


    const authorName = post.profiles?.full_name || 'مستخدم غير معروف';
    const authorAvatarUrl = post.profiles?.avatar_url;

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
            {post.groups && post.group_id && (
                <div className="mb-2 text-xs text-slate-400">
                    <Link to={`/group/${post.group_id}`} className="hover:underline flex items-center gap-1.5 font-semibold">
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><path d="M17 14v-1a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1"/><path d="M7 7v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"/></svg>
                        <span>{post.groups.name}</span>
                    </Link>
                </div>
            )}
            <div className="flex items-start justify-between">
                <div className="flex items-center mb-3 flex-1">
                    <Link to={`/user/${post.user_id}`} className="ml-3 flex-shrink-0">
                        <Avatar url={authorAvatarUrl} size={40} />
                    </Link>
                    <div>
                        <Link to={`/user/${post.user_id}`} className="font-bold text-white hover:underline">{authorName}</Link>
                        <p className="text-sm text-slate-400">
                           <Link to={`/post/${post.id}`} className="hover:underline">{timeAgo(post.created_at)}</Link>
                        </p>
                    </div>
                </div>
                {isOwner && !isEditing && (
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full">
                            <MoreIcon />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute left-0 mt-2 w-32 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-10">
                                <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className="block w-full text-right px-4 py-2 text-sm text-slate-300 hover:bg-slate-600">تعديل</button>
                                <button onClick={handleDelete} className="block w-full text-right px-4 py-2 text-sm text-red-400 hover:bg-slate-600">حذف</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {isEditing ? (
                <div>
                    <Textarea 
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={4}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <Button onClick={() => setIsEditing(false)} variant="secondary" className="!w-auto px-4 !py-2 !text-sm">إلغاء</Button>
                        <Button onClick={handleUpdate} loading={updateLoading} className="!w-auto px-4 !py-2 !text-sm">حفظ</Button>
                    </div>
                </div>
            ) : (
                <div>
                    {post.content && (
                         <Link to={`/post/${post.id}`} className="block">
                            <p className="text-slate-300 whitespace-pre-wrap">
                                {isLongPost && !isExpanded
                                    ? `${post.content.substring(0, CONTENT_LIMIT)}...`
                                    : post.content}
                                
                                {isLongPost && (
                                    <>
                                        {' '}
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsExpanded(!isExpanded);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setIsExpanded(!isExpanded);
                                                }
                                            }}
                                            className="text-cyan-400 hover:text-cyan-500 font-medium cursor-pointer inline"
                                            aria-expanded={isExpanded}
                                        >
                                            {isExpanded ? 'عرض أقل' : 'اقرأ المزيد'}
                                        </span>
                                    </>
                                )}
                            </p>
                        </Link>
                    )}
                    {postImageUrl && (
                        <Link to={`/post/${post.id}`} className={`block ${post.content ? 'mt-3' : ''}`}>
                            <div className="rounded-lg overflow-hidden border border-slate-700">
                                <img src={postImageUrl} alt="" className="w-full h-auto max-h-[60vh] object-contain bg-slate-900" />
                            </div>
                        </Link>
                    )}
                </div>
            )}
            
            <div className="flex items-center justify-between gap-4 mt-4 border-t border-slate-700 pt-2">
                <div className="flex items-center gap-1">
                    <button 
                      onClick={handleLikeToggle} 
                      className="flex items-center gap-2 group p-1 rounded-md -ml-1 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                      aria-label={isLiked ? 'إلغاء الإعجاب' : 'إعجاب'}
                      disabled={isEditing}
                    >
                        <HeartIcon filled={isLiked} />
                    </button>
                    <span className="text-slate-400 text-sm">{likeCount} إعجابات</span>
                </div>
                <Link to={`/post/${post.id}`} className={`flex items-center gap-2 group text-slate-400 hover:text-cyan-400 text-sm transition-colors ${isEditing ? 'pointer-events-none opacity-50' : ''}`}>
                    <CommentIcon />
                    <span>{commentCount === 0 ? 'أضف تعليق' : `${commentCount} تعليقات`}</span>
                </Link>
            </div>
        </div>
    );
};

export default PostCard;
