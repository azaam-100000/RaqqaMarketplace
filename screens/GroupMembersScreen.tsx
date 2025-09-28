import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import Spinner from '../components/ui/Spinner';
import Avatar from '../components/ui/Avatar';
import { getErrorMessage } from '../utils/errors';
import { Profile } from '../types';

const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg> );

interface Member {
  profiles: Profile | null;
}

const GroupMembersScreen: React.FC = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const [members, setMembers] = useState<Member[]>([]);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!groupId) return;
        
        const fetchMembers = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch group name
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .select('name')
                    .eq('id', groupId)
                    .single();
                
                if (groupError) throw groupError;
                setGroupName(groupData.name);

                // Fetch members with their profiles
                const { data: membersData, error: membersError } = await supabase
                    .from('group_members')
                    .select('profiles(id, full_name, avatar_url)')
                    .eq('group_id', groupId);

                if (membersError) throw membersError;
                
                setMembers((membersData as Member[]) || []);

            } catch (err: unknown) {
                setError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, [groupId]);

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-10"><Spinner /></div>;
        }
        if (error) {
            return <p className="text-center text-red-400 py-10">{error}</p>;
        }
        if (members.length === 0) {
            return <p className="text-center text-slate-400 py-10">لا يوجد أعضاء في هذه المجموعة بعد.</p>;
        }
        return (
            <div className="divide-y divide-slate-700">
                {members.map(member => (
                    member.profiles && (
                        <Link 
                            key={member.profiles.id}
                            to={`/user/${member.profiles.id}`} 
                            className="flex items-center gap-4 p-3 hover:bg-slate-800 transition-colors"
                        >
                            <Avatar url={member.profiles.avatar_url} size={48} />
                            <div className="flex-1 overflow-hidden">
                                <p className="font-bold text-white truncate">{member.profiles.full_name}</p>
                            </div>
                        </Link>
                    )
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-16 relative">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-700">
                            <BackIcon />
                        </button>
                        <div className="text-center w-full px-12">
                            <h1 className="text-xl font-bold truncate">{loading ? '...' : groupName}</h1>
                            <p className="text-sm text-slate-400">الأعضاء</p>
                        </div>
                    </div>
                </div>
            </header>
            <main className="container mx-auto">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default GroupMembersScreen;