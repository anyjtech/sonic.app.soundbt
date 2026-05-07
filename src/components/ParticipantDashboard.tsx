import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { UserProfile, Registration, Score, EventState, OperationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Download, AlertCircle, BarChart3, Activity, Info, AudioLines } from 'lucide-react';
import { generateCertificate } from '../services/certificateService';

interface Props {
  profile: UserProfile;
}

export default function ParticipantDashboard({ profile }: Props) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [events, setEvents] = useState<EventState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubRegs = onSnapshot(query(collection(db, 'registrations'), where('userId', '==', profile.uid)), (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'registrations'));

    const unsubScores = onSnapshot(query(collection(db, 'scores'), where('participantId', '==', profile.uid)), (snapshot) => {
      setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Score)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'scores'));

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventState)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'events'));

    return () => {
      unsubRegs();
      unsubScores();
      unsubEvents();
    };
  }, [profile.uid]);

  const handleRegister = async (type: 'battle' | 'seminar') => {
    const exists = registrations.find(r => r.competitionType === type);
    if (exists) return;

    const newRegId = `${profile.uid}_${type}`;
    try {
      await setDoc(doc(db, 'registrations', newRegId), {
        userId: profile.uid,
        competitionType: type,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `registrations/${newRegId}`);
    }
  };

  if (loading) return <div className="text-cyan-400 font-mono animate-pulse">Scanning Field Status...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <AudioLines size={120} className="text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter mb-2 uppercase">COMMANDER_{profile.displayName.toUpperCase()}</h1>
            <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.3em]">Network Active • Biometric Linked • Field Status: GREEN</p>
          </div>
          <div className="flex gap-4">
             <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-[10px] font-black text-white/30 uppercase mb-1">Rank</p>
                <p className="text-sm font-bold text-cyan-400">PARTICIPANT</p>
             </div>
             <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-[10px] font-black text-white/30 uppercase mb-1">Assigned Events</p>
                <p className="text-sm font-bold text-white">{registrations.filter(r => r.status === 'confirmed').length}</p>
             </div>
          </div>
        </div>
      </motion.div>

      {/* Announcements / Results */}
      <AnimatePresence>
        {events.filter(e => e.announced).map(event => {
          const reg = registrations.find(r => r.competitionType === event.competitionType);
          if (!reg) return null;

          const isWinner = event.winnerId === profile.uid;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-8 rounded-[32px] border-2 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-2xl transition-all ${
                isWinner 
                  ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.25)]' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-2xl relative ${isWinner ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'bg-white/10 text-white/40'}`}>
                  <Trophy size={40} />
                  {isWinner && <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-ping opacity-75" />}
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-1">
                    {isWinner ? 'TACTICAL DOMINANCE' : 'EVENT_COMPLETE_SUMMARY'}
                  </h2>
                  <p className={`text-sm font-medium ${isWinner ? 'text-yellow-500/80' : 'text-white/40'}`}>
                    {isWinner 
                      ? `Global broadcast active: You are the verified champion of ${event.competitionType.toUpperCase()}.` 
                      : `The data for ${event.competitionType.toUpperCase()} has been archived. Visualise metrics below.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => generateCertificate(profile, reg, scores, isWinner)}
                className={`flex items-center gap-3 font-black px-10 py-4 rounded-xl transition-all shadow-xl active:scale-95 text-xs uppercase tracking-[0.2em] whitespace-nowrap ${
                  isWinner 
                    ? 'bg-white text-black hover:bg-yellow-50' 
                    : 'bg-cyan-500 text-black hover:bg-cyan-400'
                }`}
              >
                <Download size={18} /> {isWinner ? 'CLAIM WINNER CREDENTIALS' : 'ARCHIVE PARTICIPATION'}
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Registration Section */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2 ml-1">
            <Activity size={14} className="text-cyan-400" /> Operational Matrix
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {(['battle', 'seminar'] as const).map(type => {
              const reg = registrations.find(r => r.competitionType === type);
              return (
                <div key={type} className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                  <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter mb-1">
                      {type === 'battle' ? 'Sound Battle' : 'Mini Seminar'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {!reg ? (
                        <span className="text-[9px] font-black tracking-widest text-white/20 uppercase">Available for Assignment</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border ${
                          reg.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          reg.status === 'deactivated' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-white/5 text-white/30 border-white/10'
                        }`}>
                          {reg.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {!reg ? (
                    <button 
                      onClick={() => handleRegister(type)}
                      className="bg-cyan-500/5 hover:bg-cyan-500 text-cyan-400 hover:text-black font-black px-6 py-2.5 rounded-xl transition-all border border-cyan-500/20 text-[10px] uppercase tracking-widest"
                    >
                      REQUEST ENLIST
                    </button>
                  ) : (
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                      <Info size={16} className="text-white/20" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Metrics */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2 ml-1">
            <BarChart3 size={14} className="text-cyan-400" /> Biometric Assessment
          </h2>
          {scores.length > 0 ? (
            <div className="space-y-4">
              {scores.map(score => (
                <div key={score.id} className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
                  <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/40 group-hover:bg-cyan-400" />
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-white/30 block mb-1">Assessment Origin</span>
                      <span className="text-sm font-bold text-white italic">Jury Node: {score.juryName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-black tracking-widest text-cyan-500/60 block mb-1">Magnitude Spectrum</span>
                      <div className="text-4xl font-black text-white italic tracking-tighter">
                        {score.totalScore.toFixed(1)} <span className="text-white/10 text-xl font-normal not-italic">/ 40.0</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/5">
                    {Object.entries(score.scoreValues).map(([key, val]) => (
                      <div key={key} className="bg-black/20 p-3 rounded-xl border border-white/5 text-center transition-all hover:bg-white/5">
                        <div className="text-[8px] uppercase tracking-[0.15em] text-white/30 mb-2 font-black">{key}</div>
                        <div className="font-bold text-cyan-400 text-lg">{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 border-2 border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} className="text-white/10" />
               </div>
               <p className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20">Syncing with Tactical High Council...</p>
               <p className="text-xs text-white/10 mt-2">Awaiting final assessment stream.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
