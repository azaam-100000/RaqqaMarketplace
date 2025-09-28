

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import { supabase } from '../services/supabase';
import Spinner from '../components/ui/Spinner';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { getErrorMessage } from '../utils/errors';

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
);

const ProfileScreen: React.FC = () => {
    const { user, profile, refreshProfile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setBio(profile.bio || '');
        }
    }, [profile]);


    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !user) return;

        const file = files[0];
        const fileExt = file.name.split('.').pop();
        // Use a unique path to prevent caching issues
        const newFilePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;
        const oldFilePath = profile?.avatar_url; // Get old path for cleanup

        setUploading(true);
        setAvatarError(null);

        try {
            // 1. Upload the new avatar
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(newFilePath, file); // No upsert needed with unique path
            if (uploadError) throw uploadError;

            // 2. Update the profile with the new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: newFilePath })
                .eq('id', user.id);
            if (updateError) {
                // If profile update fails, try to clean up the newly uploaded file
                await supabase.storage.from('uploads').remove([newFilePath]);
                throw updateError;
            }
            
            // 3. Refresh the profile in the app state
            await refreshProfile();
            
            // 4. Clean up the old avatar if it exists and is different from the new one
            if (oldFilePath && oldFilePath !== newFilePath) {
                const { error: removeError } = await supabase.storage
                    .from('uploads')
                    .remove([oldFilePath]);
                if (removeError) {
                    // Log this error but don't show to user, as the main operation succeeded
                    console.warn("Failed to remove old avatar:", removeError.message);
                }
            }

        } catch (error: any) {
            // Use the utility to get a user-friendly error message
            setAvatarError(getErrorMessage(error));
        } finally {
            setUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    const handleProfileUpdate = async () => {
        if (!user) return;
        setUpdateLoading(true);
        setUpdateError(null);

        try {
            const { error } = await supabase.from('profiles').update({
                full_name: fullName.trim(),
                bio: bio.trim(),
            }).eq('id', user.id);

            if (error) throw error;
            
            await refreshProfile();
            setIsEditing(false);
        } catch (error: any) {
            setUpdateError(`فشل تحديث الملف الشخصي: ${getErrorMessage(error)}`);
        } finally {
            setUpdateLoading(false);
        }
    };
    
    const handleCancelEdit = () => {
        setIsEditing(false);
        setFullName(profile?.full_name || '');
        setBio(profile?.bio || '');
        setUpdateError(null);
    }

    return (
        <Layout>
             <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 sm:p-8 w-full">
                 <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-6">الملف الشخصي</h1>
                    <div className="relative inline-block mb-4">
                        <Avatar url={profile?.avatar_url} size={128} />
                        <button 
                            onClick={handleAvatarClick}
                            disabled={uploading}
                            className="absolute bottom-1 -right-1 bg-cyan-600 hover:bg-cyan-700 text-white p-3 rounded-full shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            aria-label="تغيير الصورة الرمزية"
                        >
                           {uploading ? <Spinner/> : <EditIcon />}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" disabled={uploading} />
                    </div>
                     {avatarError && <p className="text-red-400 text-sm mb-4">{avatarError}</p>}
                 </div>

                {isEditing ? (
                    <div className="space-y-4 mt-4">
                         <div>
                            <label htmlFor="full-name" className="block text-sm font-medium text-slate-300 mb-2">الاسم الكامل</label>
                            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-slate-300 mb-2">نبذة تعريفية</label>
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="تحدث عن نفسك..." />
                        </div>
                        {updateError && <p className="text-red-400 text-sm text-center">{updateError}</p>}
                        <div className="flex gap-4 pt-2">
                             <Button onClick={handleCancelEdit} variant="secondary">إلغاء</Button>
                             <Button onClick={handleProfileUpdate} loading={updateLoading}>حفظ التغييرات</Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center mt-4">
                        <h2 className="text-2xl font-semibold text-white">{profile?.full_name}</h2>
                        <p className="text-slate-400 mt-1">{user?.email}</p>
                        <p className="text-slate-300 mt-4 min-h-[4rem] whitespace-pre-wrap">{profile?.bio || 'لا توجد نبذة تعريفية.'}</p>
                        <div className="mt-6">
                            <Button onClick={() => setIsEditing(true)}>تعديل الملف الشخصي</Button>
                        </div>
                    </div>
                )}

                <div className="mt-8">
                    <Button onClick={() => window.history.back()} variant="secondary">
                        العودة
                    </Button>
                </div>
             </div>
        </Layout>
    );
};

export default ProfileScreen;