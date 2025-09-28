

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage, playLikeSound, triggerHapticFeedback } from '../utils/errors';

const HeartIcon = ({ filled }: { filled: boolean }) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 transform transition-all duration-300 ease-out group-hover:scale-125 ${ filled ? 'text-red-500 scale-110' : 'text-slate-400' }`}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> );
const CommentIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-400 group-hover:text-cyan-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> );
const ShareIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-400 group-hover:text-cyan-400"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg> );
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> );

interface ProductCardProps {
  product: Product;
  isOwner: boolean;
  onProductDeleted: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isOwner, onProductDeleted }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(product.product_likes.length);

  useEffect(() => {
    if (product.image_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(product.image_url);
      setImageUrl(data.publicUrl);
    }
  }, [product.image_url]);
  
  useEffect(() => {
    setIsLiked(user ? product.product_likes.some(like => like.user_id === user.id) : false);
    setLikeCount(product.product_likes.length);
  }, [product.product_likes, user]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    setDeleting(true);
    try {
        const { error: dbError } = await supabase.from('products').delete().eq('id', product.id);
        if (dbError) throw dbError;
        if (product.image_url) {
            await supabase.storage.from('uploads').remove([product.image_url]);
        }
        onProductDeleted(product.id);
    } catch (error: unknown) {
        alert(`فشل حذف المنتج: ${getErrorMessage(error)}`);
    } finally {
        setDeleting(false);
    }
  };

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!user) return alert('يجب عليك تسجيل الدخول أولاً.');
    
    playLikeSound();
    triggerHapticFeedback();
    
    const currentlyLiked = isLiked;
    setIsLiked(!currentlyLiked);
    setLikeCount(prev => currentlyLiked ? prev - 1 : prev + 1);

    if (currentlyLiked) {
        const { error } = await supabase.from('product_likes').delete().match({ product_id: product.id, user_id: user.id });
        if (error) {
            console.error('Error unliking product:', error);
            setIsLiked(true); setLikeCount(prev => prev + 1);
        }
    } else {
        const { error } = await supabase.from('product_likes').insert({ product_id: product.id, user_id: user.id });
        if (error) {
            console.error('Error liking product:', error);
            setIsLiked(false); setLikeCount(prev => prev - 1);
        } else if (user.id !== product.user_id) {
            await supabase.from('notifications').insert({ user_id: product.user_id, actor_id: user.id, type: 'like_product', entity_id: product.id });
        }
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    const shareUrl = `${window.location.origin}/#/product/${product.id}`;
    const shareData = { title: product.name, text: `${product.name} - السعر: ${product.price.toFixed(2)}$`, url: shareUrl };
    try {
        if (navigator.share) await navigator.share(shareData);
        else alert('المشاركة غير مدعومة على هذا المتصفح.');
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };
  
  const commentCount = product.product_comments?.[0]?.count || 0;

  return (
    <Link to={`/product/${product.id}`} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden group flex flex-col relative transition-all hover:border-cyan-500 hover:shadow-lg">
       {isOwner && (
          <button onClick={handleDelete} disabled={deleting} className="absolute top-2 right-2 z-10 p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-500 disabled:opacity-50" aria-label="حذف المنتج">
              {deleting ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <TrashIcon />}
          </button>
       )}
      <div className="aspect-square w-full bg-slate-700 overflow-hidden">
        {imageUrl && <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
      </div>
      <div className="p-3 flex-grow flex flex-col">
        <h3 className="font-bold text-white truncate flex-grow">{product.name}</h3>
        <p className="text-sm text-cyan-400 font-semibold mt-1">{product.price.toFixed(2)} $</p>
      </div>
       <div className="border-t border-slate-700 p-2 flex justify-around items-center text-sm">
           <button onClick={handleLikeToggle} className="flex items-center gap-1.5 group transform transition-transform active:scale-125">
                <HeartIcon filled={isLiked} />
                <span className="text-slate-400 group-hover:text-red-400">{likeCount}</span>
           </button>
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={(e) => { e.preventDefault(); navigate(`/product/${product.id}`); }}>
               <CommentIcon />
                <span className="text-slate-400 group-hover:text-cyan-400">{commentCount}</span>
           </div>
            <button onClick={handleShare} className="flex items-center gap-1.5 group">
               <ShareIcon />
           </button>
       </div>
    </Link>
  );
};

export default ProductCard;