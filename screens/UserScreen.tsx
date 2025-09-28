

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, Post } from '../types';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import PostCard from '../components/PostCard';
import Button from '../components/ui/Button';
import { getErrorMessage } from '../utils/errors';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);

const UserScreen: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        if (!userId) {
            setError("لم يتم تحديد المستخدم.");
            setLoading(false);
            return;
        }

        const fetchUserData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch profile, counts, and follow status in parallel
                const [profileRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
                    supabase.from('profiles').select('id, full_name, avatar_url').eq('id', userId).single(),
                    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
                    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
                    currentUser ? supabase.from('followers').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null })
                ]);
                
                const { data: profileData, error: profileError } = profileRes;
                if (profileError || !profileData) throw new Error("لم يتم العثور على المستخدم.");
                setProfile(profileData);
                
                if (followersRes.error) throw followersRes.error;
                if (followingRes.error) throw followingRes.error;
                if (isFollowingRes.error) throw isFollowingRes.error;
                
                setFollowerCount(followersRes.count || 0);
                setFollowingCount(followingRes.count || 0);
                setIsFollowing(!!isFollowingRes.data);

                // Fetch posts by this user
                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('id, content, image_url, created_at, user_id, group_id')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (postsError) {
                    throw new Error("فشل في تحميل منشورات المستخدم.");
                }
                
                if (!postsData || postsData.length === 0) {
                    setPosts([]);
                } else {
                    const postIds = postsData.map(p => p.id);
                    const [
                        { data: likesData, error: likesError },
                        { data: commentsData, error: commentsError }
                    ] = await Promise.all([
                        supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
                        supabase.from('comments').select('post_id, id').in('post_id', postIds)
                    ]);

                    if (likesError || commentsError) throw new Error("فشل في تحميل بيانات المنشورات.");

                    const likesByPost = new Map<string, any[]>();
                    (likesData || []).forEach(like => {
                        if (!likesByPost.has(like.post_id)) likesByPost.set(like.post_id, []);
                        likesByPost.get(like.post_id)!.push({ user_id: like.user_id });
                    });

                    const commentsByPost = new Map<string, number>();
                    (commentsData || []).forEach(comment => {
                        commentsByPost.set(comment.post_id, (commentsByPost.get(comment.post_id) || 0) + 1);
                    });

                    const augmentedPosts = postsData.map((post: any) => ({
                        ...post,
                        profiles: profileData,
                        likes: likesByPost.get(post.id) || [],
                        comments: [{ count: commentsByPost.get(post.id) || 0 }],
                    }));
                    
                    setPosts(augmentedPosts as any[]);
                }

            } catch (err: any) {
                const errorMessage = getErrorMessage(err);
                console.error("Error fetching user data:", errorMessage);
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId, currentUser]);
    
    const handleFollowToggle = async () => {
        if (!currentUser || !profile || followLoading) return;
        
        setFollowLoading(true);
        
        try {
            if (isFollowing) {
                const { error } = await supabase.from('followers').delete().match({ follower_id: currentUser.id, following_id: profile.id });
                if (error) throw error;
                setIsFollowing(false);
                setFollowerCount(prev => prev - 1);
            } else {
                const { error } = await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: profile.id });
                if (error) throw error;
                setIsFollowing(true);
                setFollowerCount(prev => prev + 1);

                if (currentUser.id !== profile.id) {
                    await supabase.from('notifications').insert({
                        user_id: profile.id,
                        actor_id: currentUser.id,
                        type: 'new_follower',
                        entity_id: currentUser.id
                    });
                }
            }
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            console.error("Error toggling follow:", errorMessage);
            alert(`حدث خطأ: ${errorMessage}`);
        } finally {
            setFollowLoading(false);
        }
    };


    const handlePostDeleted = (postId: string) => {
        setPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
    };

    const handlePostUpdated = (updatedPost: Post) => {
        setPosts(currentPosts => currentPosts.map(p => (p.id === updatedPost.id ? updatedPost : p)));
    };

    const isOwnProfile = currentUser?.id === userId;

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                     <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">
                           الملف الشخصي
                        </h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {loading && <div className="text-center py-10"><Spinner /></div>}
                    {!loading && error && <p className="text-center text-red-400 py-10">{error}</p>}
                    {profile && (
                        <div>
                           <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
                                <div className="flex flex-col items-center text-center">
                                    <Avatar url={profile.avatar_url} size={96} />
                                    <h2 className="text-2xl font-bold mt-4">{profile.full_name}</h2>
                                </div>

                                <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-600">
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{posts.length}</p>
                                        <p className="text-sm text-slate-400">منشورات</p>
                                    </div>
                                    <Link to={`/user/${userId}/followers`} className="text-center">
                                        <p className="font-bold text-lg">{followerCount}</p>
                                        <p className="text-sm text-slate-400 hover:underline">متابعون</p>
                                    </Link>
                                    <Link to={`/user/${userId}/following`} className="text-center">
                                        <p className="font-bold text-lg">{followingCount}</p>
                                        <p className="text-sm text-slate-400 hover:underline">يتابع</p>
                                    </Link>
                                </div>

                                <div className="mt-6">
                                    {isOwnProfile ? (
                                        <Button variant="secondary" onClick={() => navigate('/profile')}>
                                            تعديل الملف الشخصي
                                        </Button>
                                    ) : (
                                        <div className="flex gap-4">
                                            <Button onClick={handleFollowToggle} loading={followLoading} variant={isFollowing ? 'secondary' : 'primary'} className="flex-1">
                                                {isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
                                            </Button>
                                            <Button onClick={() => navigate(`/chat/${userId}`)} variant="secondary" className="flex-1">
                                                مراسلة
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold mb-4">المنشورات ({posts.length})</h3>
                            {posts.length > 0 ? (
                                posts.map(post => (
                                    <PostCard 
                                        key={post.id} 
                                        post={post} 
                                        onPostDeleted={handlePostDeleted}
                                        onPostUpdated={handlePostUpdated}
                                    />
                                ))
                            ) : (
                                !loading && <p className="text-center text-slate-400 py-10 bg-slate-800 rounded-lg">
                                    لم يقم هذا المستخدم بنشر أي شيء بعد.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default UserScreen;