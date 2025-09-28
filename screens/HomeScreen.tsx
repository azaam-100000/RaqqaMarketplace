

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { Post, Product, RentalPost } from '../types';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';
import ProductPostCard from '../components/ProductPostCard';
import RentalPostCard from '../components/RentalPostCard';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';

type FeedItem = (Post & { item_type: 'post' }) | (Product & { item_type: 'product' }) | (RentalPost & { item_type: 'rental' });


const MessengerIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24" width="24" height="24">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 3.233 1.522 6.113 3.92 8.016l-1.186 2.373a.5.5 0 00.666.666l2.373-1.186A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm1.235 12.923L9.5 12.5l-3.235 1.618L8.5 10.5 4.765 8.882 14.5 4.5l-2.265 8.423z"></path>
    </svg>
);

const NotificationsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
);

const HomeScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);
        setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    const subscription = supabase
        .channel(`public:notifications:user_id=eq.${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchUnreadCount)
        .subscribe();
        
    return () => {
        supabase.removeChannel(subscription);
    }

  }, [user]);

  const fetchFeedItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        // Step 1: Fetch base posts, products, and rentals
        const [postsRes, productsRes, rentalsRes] = await Promise.all([
            supabase.from('posts').select('id, content, image_url, created_at, user_id, group_id').order('created_at', { ascending: false }),
            supabase.from('products').select('id, name, description, price, created_at, image_url, user_id, store_id').order('created_at', { ascending: false }),
            supabase.from('rental_posts').select('id, created_at, user_id, region, room_count, image_urls, rent_amount, payment_term').order('created_at', { ascending: false })
        ]);

        if (postsRes.error) throw postsRes.error;
        if (productsRes.error) throw productsRes.error;
        if (rentalsRes.error) throw rentalsRes.error;

        const postsData = postsRes.data || [];
        const productsData = productsRes.data || [];
        const rentalsData = rentalsRes.data || [];

        if (postsData.length === 0 && productsData.length === 0 && rentalsData.length === 0) {
            setFeedItems([]); setLoading(false); return;
        }

        // Step 2: Collect all unique IDs for related data
        const postIds = postsData.map(p => p.id);
        const productIds = productsData.map(p => p.id);
        const rentalIds = rentalsData.map(r => r.id);

        const allUserIds = [...new Set([...postsData.map(p => p.user_id), ...productsData.map(p => p.user_id), ...rentalsData.map(r => r.user_id)])];
        const allGroupIds = [...new Set(postsData.map(p => p.group_id).filter(Boolean))];
        const allStoreIds = [...new Set(productsData.map(p => p.store_id))];
        
        // Step 3: Fetch all related data in parallel
        const [
            profilesRes, groupsRes, storesRes, likesRes, commentsRes,
            productLikesRes, productCommentsRes, rentalLikesRes, rentalCommentsRes
        ] = await Promise.all([
            allUserIds.length > 0 ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', allUserIds) : Promise.resolve({ data: [] }),
            allGroupIds.length > 0 ? supabase.from('groups').select('id, name').in('id', allGroupIds) : Promise.resolve({ data: [] }),
            allStoreIds.length > 0 ? supabase.from('stores').select('id, name').in('id', allStoreIds) : Promise.resolve({ data: [] }),
            postIds.length > 0 ? supabase.from('likes').select('post_id, user_id').in('post_id', postIds) : Promise.resolve({ data: [] }),
            postIds.length > 0 ? supabase.from('comments').select('post_id, id').in('post_id', postIds) : Promise.resolve({ data: [] }),
            productIds.length > 0 ? supabase.from('product_likes').select('product_id, user_id').in('product_id', productIds) : Promise.resolve({ data: [] }),
            productIds.length > 0 ? supabase.from('product_comments').select('product_id, id').in('product_id', productIds) : Promise.resolve({ data: [] }),
            rentalIds.length > 0 ? supabase.from('rental_post_likes').select('post_id, user_id').in('post_id', rentalIds) : Promise.resolve({ data: [] }),
            rentalIds.length > 0 ? supabase.from('rental_post_comments').select('post_id, id').in('post_id', rentalIds) : Promise.resolve({ data: [] })
        ]);
        
        // Step 4: Create lookup maps for efficient joining
        const profilesMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
        const groupsMap = new Map((groupsRes.data || []).map(g => [g.id, g]));
        const storesMap = new Map((storesRes.data || []).map(s => [s.id, s]));
        
        const createLikesMap = (data: any[], key: string) => (data || []).reduce((map, item) => {
            if (!map.has(item[key])) map.set(item[key], []);
            map.get(item[key])!.push({ user_id: item.user_id });
            return map;
        }, new Map());
        
        const createCommentsMap = (data: any[], key: string) => (data || []).reduce((map, item) => {
            map.set(item[key], (map.get(item[key]) || 0) + 1);
            return map;
        }, new Map());

        const likesByPost = createLikesMap(likesRes.data, 'post_id');
        const commentsByPost = createCommentsMap(commentsRes.data, 'post_id');
        const likesByProduct = createLikesMap(productLikesRes.data, 'product_id');
        const commentsByProduct = createCommentsMap(productCommentsRes.data, 'product_id');
        const likesByRental = createLikesMap(rentalLikesRes.data, 'post_id');
        const commentsByRental = createCommentsMap(rentalCommentsRes.data, 'post_id');

        // Step 5: Join data on the client side
        const augmentedPosts = postsData.map((post: any) => ({ ...post, profiles: profilesMap.get(post.user_id) || null, groups: post.group_id ? groupsMap.get(post.group_id) : null, likes: likesByPost.get(post.id) || [], comments: [{ count: commentsByPost.get(post.id) || 0 }] }));
        const augmentedProducts = productsData.map((product: any) => ({ ...product, profiles: profilesMap.get(product.user_id) || null, stores: storesMap.get(product.store_id) || null, product_likes: likesByProduct.get(product.id) || [], product_comments: [{ count: commentsByProduct.get(product.id) || 0 }] }));
        const augmentedRentals = rentalsData.map((rental: any) => ({ ...rental, profiles: profilesMap.get(rental.user_id) || null, rental_post_likes: likesByRental.get(rental.id) || [], rental_post_comments: [{ count: commentsByRental.get(rental.id) || 0 }] }));
        
        // Step 6: Combine and set state
        const posts: FeedItem[] = augmentedPosts.map(p => ({ ...p, item_type: 'post' } as FeedItem));
        const products: FeedItem[] = augmentedProducts.map(p => ({ ...p, item_type: 'product' } as FeedItem));
        const rentals: FeedItem[] = augmentedRentals.map(r => ({ ...r, item_type: 'rental' } as FeedItem));
        
        const combined = [...posts, ...products, ...rentals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setFeedItems(combined);

    } catch (error: any) {
      console.error("Error fetching feed:", error);
      setError(`فشل تحميل المحتوى: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedItems();

    const subscription = supabase
      .channel('public:feed_all_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchFeedItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchFeedItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_posts' }, fetchFeedItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchFeedItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchFeedItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_likes' }, fetchFeedItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_comments' }, fetchFeedItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_post_likes' }, fetchFeedItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_post_comments' }, fetchFeedItems)
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchFeedItems]);

  const handleItemDeleted = (id: string, type: 'post' | 'product' | 'rental') => {
    setFeedItems(currentItems => currentItems.filter(item => !(item.id === id && item.item_type === type)));
  };

  const handleItemUpdated = (updatedItem: Post | Product, type: 'post' | 'product') => { // Rental posts are not editable from the feed
    setFeedItems(currentItems => 
      currentItems.map(item => 
        (item.id === updatedItem.id && item.item_type === type) 
          ? { ...item, ...updatedItem, item_type: type } as FeedItem
          : item
      )
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-10">
          <Spinner />
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-red-400 py-10">{error}</p>;
    }
    
    if (feedItems.length === 0) {
      return <p className="text-center text-slate-400 py-10">لا يوجد محتوى حتى الآن. كن أول من ينشر!</p>;
    }

    return (
      <div>
        {feedItems.map((item) => {
          if (item.item_type === 'post') {
            return (
              <PostCard 
                key={`post-${item.id}`} 
                post={item}
                onPostDeleted={(id) => handleItemDeleted(id, 'post')}
                onPostUpdated={(updatedPost) => handleItemUpdated(updatedPost, 'post')}
              />
            );
          }
          if (item.item_type === 'product') {
            return (
              <ProductPostCard
                key={`product-${item.id}`}
                product={item}
              />
            );
          }
          if (item.item_type === 'rental') {
            return (
              <RentalPostCard
                key={`rental-${item.id}`}
                post={item}
                onPostDeleted={(id) => handleItemDeleted(id, 'rental')}
              />
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700 shadow-md">
          <div className="container mx-auto px-4 flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-cyan-400">سوق محافظة الرقه</h1>
              </div>

              <div className="flex items-center gap-2">
                  <Link to="/messages" className="h-10 w-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full transition-colors text-slate-200">
                      <MessengerIcon />
                  </Link>
                  <Link to="/notifications" className="relative h-10 w-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full transition-colors text-slate-200">
                      <NotificationsIcon />
                      {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 block h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold border-2 border-slate-800">
                              {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                      )}
                  </Link>

                  <div className="relative" ref={dropdownRef}>
                      <button onClick={() => setIsDropdownOpen(prev => !prev)} className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500">
                          <Avatar url={profile?.avatar_url} size={40} />
                      </button>
                      {isDropdownOpen && (
                          <div className="absolute left-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20 p-2">
                              <Link to={`/user/${profile?.id}`} className="block p-2 hover:bg-slate-700 rounded-md" onClick={() => setIsDropdownOpen(false)}>
                                  <div className="flex items-center gap-3">
                                      <Avatar url={profile?.avatar_url} size={48} />
                                      <div>
                                          <p className="font-bold text-white">{profile?.full_name}</p>
                                          <p className="text-sm text-slate-400">عرض ملفك الشخصي</p>
                                      </div>
                                  </div>
                              </Link>
                              <hr className="border-slate-700 my-2" />
                              <button onClick={signOut} className="w-full flex items-center gap-3 text-right p-2 hover:bg-slate-700 rounded-md text-slate-300">
                                  <div className="h-9 w-9 flex items-center justify-center bg-slate-700 rounded-full"><LogoutIcon /></div>
                                  <span>تسجيل الخروج</span>
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <CreatePostForm profile={profile} />
          {renderContent()}
        </div>
      </main>
      
    </div>
  );
};

export default HomeScreen;