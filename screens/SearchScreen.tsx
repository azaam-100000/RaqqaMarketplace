import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Profile, Post, Product } from '../types';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

interface SearchResults {
    profiles: Profile[];
    posts: Post[];
    products: Product[];
}

const SearchScreen: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ profiles: [], posts: [], products: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (query.trim().length > 1) {
                performSearch();
            } else {
                setResults({ profiles: [], posts: [], products: [] });
                setHasSearched(false);
            }
        }, 500); // Debounce search by 500ms

        return () => clearTimeout(debounceTimer);
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        setError(null);
        setHasSearched(true);
        try {
            const searchTerm = `%${query.trim()}%`;
            
            const [profilesRes, postsRes, productsRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, avatar_url').ilike('full_name', searchTerm).limit(10),
                supabase.from('posts').select('id, content, user_id, profiles(full_name)').ilike('content', searchTerm).limit(10),
                supabase.from('products').select('id, name, price, stores(name)').ilike('name', searchTerm).limit(10)
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (postsRes.error) throw postsRes.error;
            if (productsRes.error) throw productsRes.error;

            setResults({
                profiles: (profilesRes.data as Profile[]) || [],
                posts: (postsRes.data as any[]) || [],
                products: (productsRes.data as any[]) || [],
            });

        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };
    
    const ResultSection: React.FC<{ title: string; children: React.ReactNode; hasResults: boolean }> = ({ title, children, hasResults }) => {
        if (!hasResults) return null;
        return (
             <div className="mb-6">
                <h2 className="text-xl font-bold mb-3 text-cyan-400">{title}</h2>
                <div className="bg-slate-800 border border-slate-700 rounded-lg">
                    {children}
                </div>
            </div>
        )
    };

    const noResults = !results.profiles.length && !results.posts.length && !results.products.length;

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 gap-4">
                        <h1 className="text-xl font-bold">بحث</h1>
                        <div className="relative flex-1">
                            <Input
                                type="text"
                                placeholder="ابحث عن مستخدمين، منشورات، منتجات..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pr-10 w-full !bg-slate-700 !border-slate-600 rounded-full"
                                autoFocus
                            />
                            <SearchIcon />
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {loading && <div className="text-center py-10"><Spinner /></div>}
                    {error && <p className="text-center text-red-400 py-10">{error}</p>}
                    
                    {!loading && !error && (
                        <div>
                             {hasSearched && noResults && (
                                <p className="text-center text-slate-400 py-10">
                                    لم يتم العثور على نتائج لـ "{query}"
                                </p>
                            )}

                            <ResultSection title="المستخدمون" hasResults={results.profiles.length > 0}>
                               <div className="divide-y divide-slate-700">
                                {results.profiles.map(profile => (
                                    <Link key={profile.id} to={`/user/${profile.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors">
                                        <Avatar url={profile.avatar_url} size={40} />
                                        <span className="font-semibold">{profile.full_name}</span>
                                    </Link>
                                ))}
                               </div>
                            </ResultSection>

                             <ResultSection title="المنشورات" hasResults={results.posts.length > 0}>
                                <div className="divide-y divide-slate-700">
                                {results.posts.map(post => (
                                    <Link key={post.id} to={`/post/${post.id}`} className="block p-3 hover:bg-slate-700/50 transition-colors">
                                        <p className="truncate">{post.content}</p>
                                        <p className="text-xs text-slate-400 mt-1">بواسطة {(post as any).profiles?.full_name || 'مستخدم'}</p>
                                    </Link>
                                ))}
                                </div>
                            </ResultSection>
                            
                             <ResultSection title="المنتجات" hasResults={results.products.length > 0}>
                                <div className="divide-y divide-slate-700">
                                {results.products.map(product => (
                                    <Link key={product.id} to={`/product/${product.id}`} className="block p-3 hover:bg-slate-700/50 transition-colors">
                                        <div className="flex justify-between">
                                           <div>
                                               <p className="font-semibold">{product.name}</p>
                                               <p className="text-xs text-slate-400 mt-1">في متجر {(product as any).stores?.name || 'متجر'}</p>
                                           </div>
                                           <p className="font-semibold text-cyan-400">{product.price.toFixed(2)}$</p>
                                        </div>
                                    </Link>
                                ))}
                                </div>
                            </ResultSection>

                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default SearchScreen;