import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { Message, Profile } from '../types';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import Textarea from '../components/ui/Textarea';
import MessageBubble from '../components/MessageBubble';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);
const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);
const ImageIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );

const VideoIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> );
const PhoneIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> );


const ChatScreen: React.FC = () => {
    const { userId: otherUserId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    // Voice message state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | undefined>();


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!otherUserId || !user) return;
        
        const markAsRead = async () => {
            await supabase
                .from('messages')
                .update({ read: true })
                .eq('receiver_id', user.id)
                .eq('sender_id', otherUserId)
                .eq('read', false);
        };
        // Mark messages as read as soon as the component loads.
        markAsRead();

        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);

            const { data: profileData, error: profileError } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', otherUserId).single();
            if (profileError || !profileData) { setError("لم يتم العثور على المستخدم."); setLoading(false); return; }
            setOtherUser(profileData as Profile);

            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select('id, created_at, sender_id, receiver_id, content, image_url, audio_url, read')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true });

            if (messagesError) { setError("فشل في تحميل الرسائل."); } else { setMessages(messagesData || []); }
            setLoading(false);
        };
        
        fetchInitialData();
        
        const channelName = `chat-${[user.id, otherUserId].sort().join('-')}`;
        
        const handleDbChanges = (payload: any) => {
            // We only care about inserts from the OTHER user now, since we add our own messages optimistically.
             if (payload.eventType === 'INSERT') {
                const newMessage = payload.new as Message;
                if (newMessage.sender_id === otherUserId) {
                    setMessages(currentMessages => {
                        if (currentMessages.some(m => m.id === newMessage.id)) {
                            return currentMessages;
                        }
                        return [...currentMessages, newMessage];
                    });
                    if (newMessage.receiver_id === user.id) {
                        markAsRead();
                    }
                }
            }
            if (payload.eventType === 'UPDATE') {
                const updatedMessage = payload.new as Message;
                setMessages(currentMessages => 
                    currentMessages.map(m => m.id === updatedMessage.id ? updatedMessage : m)
                );
            }
        };

        const channel = supabase.channel(channelName);
        const subscription = channel.on(
            'postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'messages',
                filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}))` 
            },
            handleDbChanges
        ).subscribe();

        return () => { supabase.removeChannel(channel); };

    }, [otherUserId, user]);

    const removeImage = () => {
        setImageFile(null); setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => { setImagePreview(reader.result as string); };
          reader.readAsDataURL(file);
        }
    };
    
    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = event => { audioChunksRef.current.push(event.data); };
            mediaRecorderRef.current.onstop = handleSendAudio;
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000) as unknown as number;
        } catch (err) { console.error("Error starting recording:", err); setError("لم يتمكن من الوصول للميكروفون.");}
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if(recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };
    
    const handleSendAudio = async () => {
        if (!user || !otherUserId || audioChunksRef.current.length === 0) return;
        setIsSending(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        try {
            const filePath = `audio_messages/${user.id}-${otherUserId}/${Date.now()}.webm`;
            const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, audioBlob);
            if (uploadError) throw uploadError;
            
            const { data: newAudioMessage, error: insertError } = await supabase
                .from('messages')
                .insert({ sender_id: user.id, receiver_id: otherUserId, audio_url: filePath, content: null, image_url: null })
                // FIX: The .select() method requires an argument. Changed .select() to .select('*') to fetch the newly created message data.
                .select('*')
                .single();

            if (insertError) throw insertError;
            
            if (newAudioMessage) {
                setMessages(current => [...current, newAudioMessage]);
            }

        } catch (error) { console.error("Error sending audio:", error); } 
        finally { setIsSending(false); }
    };


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !imageFile) || !user || !otherUserId) return;

        setIsSending(true);
        const messageContent = newMessage.trim(); const tempImageFile = imageFile;
        setNewMessage(''); removeImage();

        try {
            let imageUrl: string | null = null;
            if (tempImageFile) {
                const filePath = `messages/${user.id}-${otherUserId}/${Date.now()}.${tempImageFile.name.split('.').pop()}`;
                const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, tempImageFile);
                if (uploadError) throw uploadError;
                imageUrl = filePath;
            }
            
            const { data: newMessageData, error: insertError } = await supabase
                .from('messages')
                .insert({ sender_id: user.id, receiver_id: otherUserId, content: messageContent || null, image_url: imageUrl, audio_url: null })
                // FIX: The .select() method requires an argument. Changed .select() to .select('*') to fetch the newly created message data.
                .select('*')
                .single();
            
            if (insertError) throw insertError;
            
            if (newMessageData) {
                setMessages(current => [...current, newMessageData]);
            }
            
            await supabase.from('notifications').insert({ user_id: otherUserId, actor_id: user.id, type: 'new_message', entity_id: user.id });
        } catch (error) { 
            console.error("Error sending message:", error); 
            setNewMessage(messageContent); 
        } 
        finally { setIsSending(false); }
    };
    
    const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);


    const showMicButton = newMessage.trim().length === 0 && !imageFile;

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700"> <BackIcon /> </button>
                        {loading ? <Spinner /> : ( <div className="flex items-center gap-3 absolute right-1/2 translate-x-1/2"> <Avatar url={otherUser?.avatar_url} size={36} /> <h1 className="text-lg font-bold truncate">{otherUser?.full_name}</h1> </div> )}
                         <div className="absolute left-2 flex items-center gap-1">
                            <button onClick={() => navigate(`/call/${otherUserId}/video`)} className="p-2 rounded-full hover:bg-slate-700 text-slate-300"> <VideoIcon /> </button>
                            <button onClick={() => navigate(`/call/${otherUserId}/audio`)} className="p-2 rounded-full hover:bg-slate-700 text-slate-300"> <PhoneIcon /> </button>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && <div className="text-center"><Spinner /></div>}
                {error && <p className="text-center text-red-400">{error}</p>}
                {!loading && messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-2 border-t border-slate-700 bg-slate-800">
                {imagePreview && ( <div className="p-2"> <div className="relative inline-block w-24 h-24 bg-slate-700 rounded-md align-bottom"> <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-md" /> <button onClick={removeImage} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-md hover:bg-red-500"> <CloseIcon /> </button> </div> </div> )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-700 rounded-md hover:bg-slate-600 disabled:opacity-50" disabled={isSending || isRecording}> <ImageIcon /> </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    
                    {isRecording ? (
                        <div className="flex-1 h-12 bg-slate-700 rounded-md flex items-center px-4 justify-between">
                             <div className="flex items-center gap-2">
                                <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
                                <p className="text-slate-300 font-mono">{formatTime(recordingTime)}</p>
                            </div>
                             <p className="text-slate-400 text-sm">جاري التسجيل...</p>
                        </div>
                    ) : (
                        <Textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1" rows={1} disabled={isSending} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }} />
                    )}

                    {showMicButton ? (
                        <button type="button" onMouseDown={handleStartRecording} onMouseUp={handleStopRecording} onTouchStart={handleStartRecording} onTouchEnd={handleStopRecording} className={`p-3 rounded-md disabled:opacity-50 ${isRecording ? 'bg-red-600' : 'bg-cyan-600 hover:bg-cyan-700'}`} disabled={isSending}> <MicIcon /> </button>
                    ) : (
                        <button type="submit" className="p-3 bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:opacity-50" disabled={isSending || (!newMessage.trim() && !imageFile)}> {isSending ? <Spinner /> : <SendIcon />} </button>
                    )}
                </form>
            </footer>
        </div>
    );
};

export default ChatScreen;