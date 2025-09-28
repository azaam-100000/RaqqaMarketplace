import React from 'react';
import { Link } from 'react-router-dom';
import { Conversation } from '../types';
import Avatar from './ui/Avatar';
import { useAuth } from '../hooks/useAuth';

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} د`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} ي`;
};

const ConversationCard: React.FC<{ conversation: Conversation }> = ({ conversation }) => {
    const { user } = useAuth();
    const { profile, last_message, unread_count } = conversation;

    const isYou = last_message.sender_id === user?.id;
    const messagePrefix = isYou ? 'أنت: ' : '';
    const isUnread = unread_count > 0;
    const isLastMessageUnread = !isYou && !last_message.read;
    
    const getLastMessageContent = () => {
        if (last_message.content) {
            return last_message.content;
        }
        if (last_message.image_url) {
            return '📷 صورة';
        }
        if (last_message.audio_url) {
            return '🎤 رسالة صوتية';
        }
        return '...';
    };

    return (
        <Link 
            to={`/chat/${profile.id}`} 
            className={`flex items-center gap-4 p-3 transition-colors ${isUnread ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
        >
            <Avatar url={profile.avatar_url} size={48} />
            <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className={`font-bold truncate ${isUnread ? 'text-white' : 'text-slate-300'}`}>{profile.full_name}</p>
                    <p className="text-xs text-slate-400 flex-shrink-0">{timeAgo(last_message.created_at)}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <p className={`text-sm truncate ${isLastMessageUnread ? 'text-white font-semibold' : 'text-slate-400'}`}>
                        {messagePrefix}
                        {getLastMessageContent()}
                    </p>
                     {isUnread && (
                        <span className="bg-cyan-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                            {unread_count > 9 ? '9+' : unread_count}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default ConversationCard;