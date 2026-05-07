import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { UserProfile, Registration, Score, OperationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Save, Trash2, ShieldAlert, Zap, Radio, SlidersHorizontal, UserX } from 'lucide-react';

interface Props {
  profile: UserProfile;
}

const CRITERIA = [
  { id: 'bass', label: 'Low Freq (Bass)', icon: Zap },
  { id: 'clarity', label: 'High Freq (Clarity)', icon: Radio },
  { id: 'power', label: 'Power Dynamic', icon: SlidersHorizontal },
  { id: 'aesthetic', label: 'System Aesthetics', icon: Star },
];

export default function JuryDashboard({ profile }: Props) {
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<UserProfile | null>(null);
  const [currentScores, setCurrentScores] = useState<Record<string, number>>({
    bass: 0, clarity: 0, power: 0, aesthetic: 0
  });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setParticipants(snapshot.docs.map(doc => doc.data() as UserProfile).filter(u => u.role === 'participant' && u.status === 'active'));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));
    
    const unsubRegs = onSnapshot(collection(db, 'registrations'), (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration)).filter(r => r.status === 'confirmed'));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'registrations'));
    
    const unsubScores = onSnapshot(query(collection(db, 'scores'), where('juryId', '==', profile.uid)), (snapshot) => {
      setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Score)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'scores'));

    return () => {
      unsubUsers();
      unsubRegs();
      unsubScores();
    };
  }, [profile.uid]);

  const handleScoreChange = (id: string, val: number) => {
    setCurrentScores(prev => ({ ...prev, [id]: val }));
  };

  const saveScore = async () => {
    if (!selectedParticipant) return;
    
    const scoreId = `${profile.uid}_${selectedParticipant.uid}`;
    const totalScore = Object.values(currentScores).reduce((a: number, b: number) => a + b, 0);
    
    try {
      await setDoc(doc(db, 'scores', scoreId), {
        participantId: selectedParticipant.uid,
        juryId: profile.uid,
        juryName: profile.displayName,
        scoreValues: currentScores,
        totalScore,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `scores/${scoreId}`);
    }
    
    setSelectedParticipant(null);
  };

  const handleDeactivate = async (participantId: string) => {
    if (confirm("Are you sure you want to deactivate this participant? All their score data will be deleted and their account locked.")) {
      try {
        // 1. Lock User
        await updateDoc(doc(db, 'users', participantId), { status: 'locked' });
        
        // 2. Mark Registrations as deactivated
        const userRegs = registrations.filter(r => r.userId === participantId);
        for (const reg of userRegs) {
          await updateDoc(doc(db, 'registrations', reg.id), { status: 'deactivated' });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'juryDeactivationTask');
      }
    }
  };

  const confirmedParticipants = participants.filter(p => registrations.some(r => r.userId === p.uid));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Participant List */}
      <div className="lg:col-span-4 space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2 ml-1">
          <Users size={14} className="text-cyan-400" /> Active Operations Field
        </h2>
        
        <div className="space-y-3">
          {confirmedParticipants.map((p) => {
            const hasScore = scores.some(s => s.participantId === p.uid);
            const reg = registrations.find(r => r.userId === p.uid);
            
            return (
              <motion.div
                key={p.uid}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedParticipant(p);
                  const existing = scores.find(s => s.participantId === p.uid);
                  if (existing) setCurrentScores(existing.scoreValues);
                  else setCurrentScores({ bass: 0, clarity: 0, power: 0, aesthetic: 0 });
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  selectedParticipant?.uid === p.uid 
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white text-sm tracking-tight uppercase italic">{p.displayName}</h3>
                    <p className="text-[9px] uppercase tracking-widest text-white/30 mt-0.5">{reg?.competitionType} Entry</p>
                  </div>
                  {hasScore ? (
                    <div className="p-1 px-2 bg-cyan-500/20 text-cyan-400 text-[8px] font-black tracking-widest rounded border border-cyan-500/30">CALIBRATED</div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
                  )}
                </div>
              </motion.div>
            );
          })}
          {confirmedParticipants.length === 0 && (
            <div className="p-8 border border-dashed border-white/5 rounded-2xl text-center text-white/20">
               <p className="text-[10px] uppercase font-black tracking-widest">No Active Personnel</p>
            </div>
          )}
        </div>
      </div>

      {/* Scoring Terminal */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">
          {selectedParticipant ? (
            <motion.div
              key={selectedParticipant.uid}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 md:p-10 relative overflow-hidden h-full flex flex-col"
            >
              <div className="absolute -top-20 -right-20 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                <Star size={300} className="text-cyan-400" />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12 relative z-10">
                <div>
                  <div className="text-cyan-400 font-mono text-[9px] uppercase tracking-[0.4em] mb-2 font-black">Calibration Target Specified</div>
                  <h2 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none"> {selectedParticipant.displayName} </h2>
                </div>
                <button
                  onClick={() => handleDeactivate(selectedParticipant.uid)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black border border-red-500/30 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2"
                >
                  <UserX size={14} /> SYSTEM LOCKDOWN
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 relative z-10 flex-1">
                {CRITERIA.map((c) => (
                  <div key={c.id} className="space-y-5">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2.5 text-white/40 uppercase text-[10px] font-black tracking-[0.2em]">
                        <div className="p-1.5 bg-white/5 rounded-lg text-cyan-400"><c.icon size={16} /></div>
                        {c.label}
                      </div>
                      <span className="text-3xl font-black text-white italic tracking-tighter">{currentScores[c.id]}</span>
                    </div>
                    <div className="relative group p-1">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={currentScores[c.id]}
                        onChange={(e) => handleScoreChange(c.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-cyan-400 group-hover:bg-white/10 transition-all outline-none"
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-white/20 font-black uppercase tracking-widest px-1">
                      <span>0.0hz</span>
                      <span>MAX_GAIN</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between p-8 bg-black/40 rounded-2xl border border-white/5 gap-6 relative z-10">
                <div className="text-center sm:text-left">
                  <div className="text-[10px] uppercase font-black tracking-[0.3em] text-white/30 mb-2">Aggregate Magnitude Output</div>
                  <div className="text-5xl font-black text-white italic tracking-tighter">
                    {(Object.values(currentScores).reduce((a: number, b: number) => a + b, 0) as number).toFixed(1)} <span className="text-white/10 text-2xl font-normal not-italic tracking-normal">/ 40.0</span>
                  </div>
                </div>
                <button
                  onClick={saveScore}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white text-black font-black px-12 py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:bg-cyan-400 active:scale-95 text-[10px] uppercase tracking-[0.2em]"
                >
                  <Save size={18} /> COMMIT DATASET
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-[40px]">
              <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                 <ShieldAlert size={40} className="text-white/10" />
              </div>
              <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/20 max-w-[200px] leading-loose">Neural connection established. Select operative to begin calibration.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Users({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}
