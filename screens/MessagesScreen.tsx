import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Conversation, Profile, Message } from '../types';
import Spinner from '../components/ui/Spinner';
import ConversationCard from '../components/ConversationCard';

const MessagesScreen: React.FC = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchConversations = async () => {
            // Set loading to true only on initial fetch
            // FIX: Removed erroneous and redundant state updates.
            // The original code had a typo `setLoading(prev => prev.length === 0)` which causes a crash.
            // The intended behavior of only showing a loader on initial fetch is already handled by `useState(true)`
            // and the `finally` block, so these lines are not needed.
            setError(null);
            
            try {
                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages')
                    .select('id, created_at, sender_id, receiver_id, content, image_url, audio_url, read')
                    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                    .order('created_at', { ascending: false });

                if (messagesError) throw messagesError;

                if (!messagesData || messagesData.length === 0) {
                    setConversations([]);
                    setLoading(false);
                    return;
                }
                
                const otherUserIds = new Set<string>();
                messagesData.forEach(msg => {
                    if (msg.sender_id !== user.id) otherUserIds.add(msg.sender_id);
                    if (msg.receiver_id !== user.id) otherUserIds.add(msg.receiver_id);
                });

                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', Array.from(otherUserIds));

                if (profilesError) throw profilesError;

                const profilesMap = new Map<string, Profile>((profilesData || []).map(p => [p.id, p as Profile]));
                
                const conversationMap = new Map<string, Conversation>();
                for (const message of messagesData as Message[]) {
                    const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
                    
                    if (!conversationMap.has(otherUserId)) {
                        const profile = profilesMap.get(otherUserId);
                        if (profile) {
                            conversationMap.set(otherUserId, {
                                other_user_id: otherUserId,
                                profile: profile,
                                last_message: message,
                                unread_count: 0,
                            });
                        }
                    }
                    
                    if (message.receiver_id === user.id && !message.read) {
                        const conv = conversationMap.get(otherUserId);
                        if (conv) {
                            conv.unread_count += 1;
                        }
                    }
                }
                
                const sortedConversations = Array.from(conversationMap.values()).sort((a, b) => {
                    if (a.unread_count > 0 && b.unread_count === 0) return -1;
                    if (b.unread_count > 0 && a.unread_count === 0) return 1;
                    return new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime();
                });
                
                setConversations(sortedConversations);

            } catch (err: any) {
                 console.error("Error fetching conversations:", err);
                 setError("فشل في تحميل المحادثات. يرجى المحاولة مرة أخرى.");
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
        
        const channel = supabase
            .channel(`messages-screen-${user.id}`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `or(sender_id.eq.${user.id},receiver_id.eq.${user.id})`
                },
                () => fetchConversations()
            )
            .subscribe();
            
        return () => {
            supabase.removeChannel(channel);
        }

    }, [user]);

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (conversations.length === 0) {
            return <p className="text-center text-slate-400 py-10">ليس لديك رسائل حتى الآن. ابدأ محادثة من صفحة متجر.</p>;
        }
        return (
            <div className="divide-y divide-slate-700">
                {conversations.map(conv => (
                    <ConversationCard key={conv.other_user_id} conversation={conv} />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16">
                        <h1 className="text-xl font-bold">الرسائل</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default MessagesScreen;