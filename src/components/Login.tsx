import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { motion } from 'motion/react';
import { OperationType } from '../types';
import { UserPlus, LogIn, Mail, Lock, User as UserIcon, ShieldCheck, Loader2 } from 'lucide-react';

export default function Login({ authenticatedWithoutProfile }: { authenticatedWithoutProfile?: boolean }) {
  const [isRegister, setIsRegister] = useState(authenticatedWithoutProfile || false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'participant' | 'jury'>('participant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated but missing profile, force register mode
  React.useEffect(() => {
    if (authenticatedWithoutProfile) {
      setIsRegister(true);
    }
  }, [authenticatedWithoutProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        let user = auth.currentUser;
        
        if (!user) {
          const res = await createUserWithEmailAndPassword(auth, email, password);
          user = res.user;
        }
        
        const isAdmin = user.email === 'naymarajiarkan@gmail.com';
        const profilePath = `users/${user.uid}`;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName,
            role: isAdmin ? 'admin' : role,
            status: isAdmin ? 'active' : 'pending',
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, profilePath);
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('THIS EMAIL IS ALREADY REGISTERED. PLEASE LOGIN INSTEAD.');
      } else if (err.code === 'auth/weak-password') {
        setError('SECURITY PROTOCOL: PASSWORD MUST BE AT LEAST 6 CHARACTERS.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('ACCESS DENIED: INVALID CREDENTIALS. IF UNREGISTERED, USE THE ENLISTMENT PROTOCOL.');
      } else if (err.code === 'permission-denied') {
        setError('SYSTEM LOCK: SECURITY RULES PREVENTED IDENTITY CREATION.');
      } else {
        setError(err.message.toUpperCase());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        layout
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative"
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        
        <div className="p-8 md:p-12">
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex p-4 bg-cyan-500/10 rounded-2xl mb-6 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            >
              {isRegister ? <UserPlus className="text-cyan-400" size={36} /> : <LogIn className="text-cyan-400" size={36} />}
            </motion.div>
            <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">
              {isRegister ? 'Arena Enlistment' : 'Secure Entry'}
            </h1>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
              {isRegister ? 'Create your neural combat identity' : 'Authorise terminal session'}
            </p>
            {!isRegister && (
              <p className="text-cyan-500/50 text-[8px] uppercase tracking-widest mt-2 px-4 italic leading-relaxed">
                Initial entry? Use the "Register Protocol" below to create your credentials.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Identity Tag</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all placeholder:text-white/10 text-sm font-medium"
                    placeholder="PLAYER_ONE"
                  />
                </div>
              </div>
            )}

            {!authenticatedWithoutProfile && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Ether Mail</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all placeholder:text-white/10 text-sm font-medium"
                      placeholder="comm@sonic.net"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Access Key</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all placeholder:text-white/10 text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            )}

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Arena Assignment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('participant')}
                    className={`py-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-[10px] font-black tracking-widest ${
                      role === 'participant' 
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    PARTICIPANT
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('jury')}
                    className={`py-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-[10px] font-black tracking-widest ${
                      role === 'jury' 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    JURY
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-wider text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-30 mt-4 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-xs uppercase tracking-[0.2em]"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                isRegister ? 'INITIALIZE NEXUS' : 'CONNECT TERMINAL'
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            {!authenticatedWithoutProfile ? (
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-[10px] font-black text-white/30 hover:text-cyan-400 transition-colors uppercase tracking-[0.2em]"
              >
                {isRegister ? 'Already verified? Access Session' : "Unlisted Unit? Register Protocol"}
              </button>
            ) : (
              <button
                onClick={() => auth.signOut()}
                className="text-[10px] font-black text-white/30 hover:text-red-400 transition-colors uppercase tracking-[0.2em]"
              >
                Cancel Session / Switch Identity
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
