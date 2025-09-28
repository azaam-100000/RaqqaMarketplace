import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Message } from '../types';
import { supabase } from '../services/supabase';

const PlayIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M8 5v14l11-7z"></path></svg> );
const PauseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg> );

const AudioPlayer: React.FC<{ src: string }> = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const setAudioData = () => { setDuration(audio.duration); setCurrentTime(audio.currentTime); };
            const setAudioTime = () => setCurrentTime(audio.currentTime);
            const handleEnded = () => { setIsPlaying(false); setCurrentTime(0); };

            audio.addEventListener('loadeddata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);
            audio.addEventListener('ended', handleEnded);

            return () => {
                audio.removeEventListener('loadeddata', setAudioData);
                audio.removeEventListener('timeupdate', setAudioTime);
                audio.removeEventListener('ended', handleEnded);
            }
        }
    }, []);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-3 w-64">
            <audio ref={audioRef} src={src} preload="metadata"></audio>
            <button onClick={togglePlayPause} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="flex-grow flex items-center gap-2">
                <div className="w-full bg-white/20 h-1.5 rounded-full">
                    <div style={{ width: `${progress}%` }} className="h-full bg-white rounded-full"></div>
                </div>
                <span className="text-xs text-white/80 font-mono w-10 text-right">{formatTime(duration)}</span>
            </div>
        </div>
    );
};

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (message.image_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(message.image_url);
      setImageUrl(data.publicUrl);
    }
     if (message.audio_url) {
      const { data } = supabase.storage.from('uploads').getPublicUrl(message.audio_url);
      setAudioUrl(data.publicUrl);
    }
  }, [message.image_url, message.audio_url]);


  const isSender = message.sender_id === user?.id;
  const bubbleClasses = isSender ? 'bg-cyan-600 rounded-br-none self-end' : 'bg-slate-700 rounded-bl-none self-start';
  const containerClasses = isSender ? 'justify-end' : 'justify-start';
  const paddingClasses = !message.content && imageUrl ? 'p-1.5' : 'px-4 py-3';

  return (
    <div className={`flex ${containerClasses}`}>
      <div className={`max-w-md lg:max-w-xl rounded-2xl ${bubbleClasses} ${paddingClasses}`}>
        {imageUrl && (
            <img 
                src={imageUrl} 
                alt="محتوى مرسل"
                className={`rounded-lg max-w-xs max-h-80 object-cover cursor-pointer ${message.content ? 'mb-2' : ''}`}
                onClick={() => window.open(imageUrl, '_blank')}
            />
        )}
        {audioUrl && <AudioPlayer src={audioUrl} />}
        {message.content && (
            <p className="text-white whitespace-pre-wrap mt-1">{message.content}</p>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;