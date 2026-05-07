import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { UserProfile, Registration, Score, EventState, OperationType } from '../types';
import { motion } from 'motion/react';
import { UserCheck, UserX, Trophy, ShieldAlert, Users, Calendar, BarChart3, Database } from 'lucide-react';

interface Props {
  profile: UserProfile;
}

export default function AdminDashboard({ profile }: Props) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [eventStates, setEventStates] = useState<EventState[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'scores'>('users');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    
    const unsubRegs = onSnapshot(collection(db, 'registrations'), (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'registrations'));
    
    const unsubScores = onSnapshot(collection(db, 'scores'), (snapshot) => {
      setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Score)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'scores'));
    
    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEventStates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventState)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'events'));

    return () => {
      unsubUsers();
      unsubRegs();
      unsubScores();
      unsubEvents();
    };
  }, []);

  const handleUserStatus = async (userId: string, status: 'active' | 'locked') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleConfirmRegistration = async (regId: string) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), { status: 'confirmed' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${regId}`);
    }
  };

  const handleDeactivateParticipant = async (userId: string) => {
    try {
      // 1. Lock User
      await updateDoc(doc(db, 'users', userId), { status: 'locked' });
      
      // 2. Mark Registrations as deactivated
      const userRegs = registrations.filter(r => r.userId === userId);
      for (const reg of userRegs) {
        await updateDoc(doc(db, 'registrations', reg.id), { status: 'deactivated' });
      }

      // 3. Delete Score Data
      const userScores = scores.filter(s => s.participantId === userId);
      for (const score of userScores) {
        await deleteDoc(doc(db, 'scores', score.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'deactivationTask');
    }
  };

  const handleSetWinner = async (type: string, winnerId: string) => {
    const eventId = type === 'battle' ? 'event-battle' : 'event-seminar';
    try {
      await setDoc(doc(db, 'events', eventId), {
        competitionType: type,
        winnerId,
        announced: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `events/${eventId}`);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Admin Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Forces', val: users.length, icon: Users, color: 'text-blue-400' },
          { label: 'Jury Council', val: users.filter(u => u.role === 'jury').length, icon: ShieldAlert, color: 'text-purple-400' },
          { label: 'Confirmed Entries', val: registrations.filter(r => r.status === 'confirmed').length, icon: UserCheck, color: 'text-green-400' },
          { label: 'Score Datasets', val: scores.length, icon: Database, color: 'text-cyan-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center gap-4 hover:border-white/20 transition-all group"
          >
            <div className={`p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-all ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <div className="text-2xl font-black italic tracking-tighter">{stat.val}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl w-fit backdrop-blur-md">
        {(['users', 'events', 'scores'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === tab 
                ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-[10px] uppercase font-black tracking-[0.3em] text-white/40 border-b border-white/5">
                  <th className="px-8 py-6">Operative Identity</th>
                  <th className="px-8 py-6">Assignment</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6 text-right">Operational Port</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-white/5 transition-all group">
                    <td className="px-8 py-5">
                      <div className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{u.displayName}</div>
                      <div className="text-[10px] text-white/20 font-mono italic mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{u.role}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        u.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        u.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right space-x-3">
                      {u.status === 'pending' && (
                        <button 
                          onClick={() => handleUserStatus(u.uid, 'active')}
                          className="p-2.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-black rounded-xl transition-all border border-green-500/20"
                          title="Verify Protocol"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      {u.status !== 'locked' && u.uid !== profile.uid && (
                        <button 
                          onClick={() => handleDeactivateParticipant(u.uid)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black rounded-xl transition-all border border-red-500/20"
                          title="Terminal Lockdown"
                        >
                          <UserX size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {['battle', 'seminar'].map(type => {
              const eventState = eventStates.find(e => e.competitionType === type);
              const participants = users.filter(u => 
                u.role === 'participant' && 
                registrations.some(r => r.userId === u.uid && r.competitionType === type && r.status === 'confirmed')
              );
              
              return (
                <div key={type} className="bg-white/5 rounded-3xl p-8 border border-white/10 group hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                        <Trophy size={28} />
                      </div>
                      <h3 className="text-2xl font-black italic tracking-tighter uppercase">
                        {type === 'battle' ? 'Sound Battle' : 'Mini Seminar'}
                      </h3>
                    </div>
                    {eventState?.announced && (
                      <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-500/20">
                        BROADCASTED
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-1">Champion Broadcast Target</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select 
                        defaultValue={eventState?.winnerId || ''}
                        id={`winner-select-${type}`}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/50 text-sm font-bold appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-slate-900">SELECT OPERATIVE...</option>
                        {participants.map(p => (
                          <option key={p.uid} value={p.uid} className="bg-slate-900">{p.displayName}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          const val = (document.getElementById(`winner-select-${type}`) as HTMLSelectElement).value;
                          if (val) handleSetWinner(type, val);
                        }}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 text-[10px] uppercase tracking-widest h-[48px]"
                      >
                        SET WINNER
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'scores' && (
          <div className="p-8">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {registrations.filter(r => r.status === 'confirmed').map(reg => {
                 const user = users.find(u => u.uid === reg.userId);
                 const userScores = scores.filter(s => s.participantId === reg.userId);
                 const totalAvg = userScores.length > 0 
                   ? userScores.reduce((acc, s) => acc + s.totalScore, 0) / userScores.length 
                   : 0;

                 return (
                   <div key={reg.id} className="bg-white/5 p-6 rounded-[24px] border border-white/10 hover:border-cyan-500/40 transition-all group relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-5">
                       <BarChart3 size={60} />
                     </div>
                     <div className="flex items-center justify-between mb-4">
                       <span className="text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase">{reg.competitionType}</span>
                       <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                     </div>
                     <h4 className="font-bold text-lg mb-4 text-white uppercase tracking-tight italic">{user?.displayName}</h4>
                     <div className="flex items-end gap-3 pt-4 border-t border-white/5">
                       <span className="text-4xl font-black text-white italic tracking-tighter">{totalAvg.toFixed(1)}</span>
                       <div className="pb-1">
                         <span className="text-[10px] font-black text-white/20 block uppercase tracking-tighter leading-none">Global Average</span>
                         <span className="text-[10px] font-bold text-cyan-500/50 uppercase tracking-tighter leading-none">{userScores.length} DATASETS</span>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
