

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { RentalPost, RentalPostComment, PostProfile } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';
import { useAuth } from '../hooks/useAuth';
import CreateRentalCommentForm from '../components/CreateRentalCommentForm';
import RentalCommentCard from '../components/RentalCommentCard';
import Button from '../components/ui/Button';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );
const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const MapPinIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>);
const MoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg> );

const paymentTermText = {
    monthly: 'شهري',
    quarterly: 'كل 3 أشهر',
    semi_annually: 'كل 6 أشهر'
};

const RentalDetailScreen: React.FC = () => {
    const { rentalId } = useParams<{ rentalId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [post, setPost] = useState<RentalPost | null>(null);
    const [comments, setComments] = useState<RentalPostComment[]>([]);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isOwner = user?.id === post?.user_id;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchRentalData = useCallback(async () => {
        if (!rentalId) return;
        setLoading(true);
        setError(null);
        try {
            const { data: postData, error: postError } = await supabase
                .from('rental_posts')
                .select('*')
                .eq('id', rentalId)
                .single();
            if (postError) throw postError;

            const [profileRes, commentsRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, avatar_url').eq('id', postData.user_id).single(),
                supabase.from('rental_post_comments').select('*, profiles(id, full_name, avatar_url)').eq('post_id', rentalId).order('created_at', { ascending: true })
            ]);

            const augmentedPost = {
                ...postData,
                profiles: profileRes.data as PostProfile,
            };
            
            setPost(augmentedPost as any);
            setComments((commentsRes.data as any[]) || []);

            if (postData.image_urls && postData.image_urls.length > 0) {
                const urls = postData.image_urls.map((url: string) => supabase.storage.from('uploads').getPublicUrl(url).data.publicUrl);
                setImageUrls(urls);
            }

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [rentalId]);

    useEffect(() => {
        fetchRentalData();
        const subscription = supabase
            .channel(`public:rental_post_comments:post_id=eq.${rentalId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rental_post_comments', filter: `post_id=eq.${rentalId}`}, fetchRentalData)
            .subscribe();
            
        return () => { supabase.removeChannel(subscription); };
    }, [fetchRentalData, rentalId]);
    
    const handleDelete = async () => {
        if (!post) return;
        setIsMenuOpen(false);
        if (!window.confirm('هل أنت متأكد من حذف هذا العرض؟ سيتم حذف جميع الصور والبيانات المتعلقة به.')) return;
        try {
            if (post.image_urls && post.image_urls.length > 0) {
                const { error: storageError } = await supabase.storage.from('uploads').remove(post.image_urls);
                if (storageError) console.error("Error deleting images from storage:", storageError);
            }
            const { error: deleteError } = await supabase.from('rental_posts').delete().eq('id', post.id);
            if (deleteError) throw deleteError;
            navigate('/rentals');
        } catch (err) {
            alert(`فشل حذف العرض: ${getErrorMessage(err)}`);
        }
    };


    const onCommentCreated = (newComment: RentalPostComment) => {
        setComments(current => [...current, newComment]);
    };
    const onCommentDeleted = (commentId: string) => {
        setComments(current => current.filter(c => c.id !== commentId));
    };
    const onCommentUpdated = (updatedComment: RentalPostComment) => {
        setComments(current => current.map(c => c.id === updatedComment.id ? updatedComment : c));
    };
    
    const nextImage = () => setCurrentImageIndex(i => (i + 1) % imageUrls.length);
    const prevImage = () => setCurrentImageIndex(i => (i - 1 + imageUrls.length) % imageUrls.length);
    
    const finalMapLink = post?.map_link || (post?.latitude && post?.longitude ? `https://www.google.com/maps?q=${post.latitude},${post.longitude}` : null);

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700"><BackIcon /></button>
                        <h1 className="text-xl font-bold text-center w-full truncate px-12">تفاصيل العرض</h1>
                        {isOwner && (
                            <div className="absolute left-2" ref={menuRef}>
                                <button onClick={() => setIsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-slate-700"><MoreIcon /></button>
                                {isMenuOpen && (
                                    <div className="absolute left-0 mt-2 w-40 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-10">
                                        <Link to={`/rental/${rentalId}/edit`} className="block w-full text-right px-4 py-2 text-sm text-slate-300 hover:bg-slate-600">تعديل العرض</Link>
                                        <button onClick={handleDelete} className="block w-full text-right px-4 py-2 text-sm text-red-400 hover:bg-slate-600">حذف العرض</button>
                                    </div>
                                )}
                            </div>
                         )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {loading && <div className="text-center py-10"><Spinner /></div>}
                    {error && <p className="text-center text-red-400 py-10">{error}</p>}
                    {post && (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                            {imageUrls.length > 0 && (
                                <div className="relative aspect-video w-full bg-slate-900">
                                    <img src={imageUrls[currentImageIndex]} alt={`عرض ${currentImageIndex + 1}`} className="w-full h-full object-contain" />
                                    {imageUrls.length > 1 && <>
                                        <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80"><ChevronLeft /></button>
                                        <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80"><ChevronRight /></button>
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{currentImageIndex + 1} / {imageUrls.length}</div>
                                    </>}
                                </div>
                            )}
                            <div className="p-4 md:p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Avatar url={post.profiles?.avatar_url} size={48} />
                                    <div>
                                        <p className="font-semibold text-lg">{post.profiles?.full_name}</p>
                                        <p className="text-xs text-slate-400">الناشر</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-700 grid grid-cols-2 gap-4">
                                    <DetailItem label="الأجرة الشهرية" value={`${post.rent_amount}$`} />
                                    <DetailItem label="نظام الدفع" value={paymentTermText[post.payment_term]} />
                                    <DetailItem label="المنطقة" value={post.region} />
                                    <DetailItem label="العنوان" value={post.address} />
                                    <DetailItem label="الشارع" value={post.street_name} />
                                    <DetailItem label="عدد الغرف" value={post.room_count.toString()} />
                                    <DetailItem label="الحالة" value={post.condition} />
                                </div>
                                {finalMapLink && (
                                    <div className="pt-4 border-t border-slate-700">
                                         <a 
                                            href={finalMapLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="w-full flex items-center justify-center font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition duration-200 bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500"
                                        >
                                            <MapPinIcon />
                                            <span className="mr-2">عرض الموقع على الخريطة</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 md:p-6 border-t border-slate-700 bg-slate-800/50">
                                 <h3 className="text-lg font-bold mb-4">التعليقات</h3>
                                 <CreateRentalCommentForm postId={post.id} postOwnerId={post.user_id} onCommentCreated={onCommentCreated} />
                                 <div className="space-y-4 mt-4">
                                    {comments.length > 0 ? (
                                        comments.map(comment => <RentalCommentCard key={comment.id} comment={comment} onCommentUpdated={onCommentUpdated} onCommentDeleted={onCommentDeleted} />)
                                    ) : (
                                        <p className="text-slate-400 text-center py-4">لا توجد تعليقات. كن أول من يعلق!</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const DetailItem: React.FC<{label: string, value: string}> = ({ label, value }) => (
    <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="font-semibold text-white">{value}</p>
    </div>
);

export default RentalDetailScreen;