import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from './lib/firebase';
import { UserProfile, OperationType } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import JuryDashboard from './components/JuryDashboard';
import ParticipantDashboard from './components/ParticipantDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, LogOut, Terminal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for Tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Connection test on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (user) {
        setLoading(true);
        const profilePath = `users/${user.uid}`;
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), 
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as UserProfile;
              setProfile(data);
              if (data.status === 'locked') {
                auth.signOut();
              }
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, profilePath);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060f] flex items-center justify-center text-cyan-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Background Effect */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {!user || (!profile && !loading) ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10"
          >
            <Login authenticatedWithoutProfile={!!user} />
          </motion.div>
        ) : profile ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col min-h-screen"
          >
            <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 backdrop-blur-md bg-white/5 flex items-center px-4 md:px-8">
              <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-500 rounded-sm rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    <div className="w-4 h-4 bg-black rotate-[-45deg] flex items-center justify-center">
                      <Terminal size={10} className="text-cyan-400" />
                    </div>
                  </div>
                  <span className="font-bold tracking-widest text-lg uppercase hidden sm:inline">
                    Sonic <span className="text-cyan-400">Battle</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] uppercase tracking-tighter opacity-70">System Online</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right flex flex-col">
                      <span className="text-xs font-bold leading-tight">{profile.displayName}</span>
                      <span className="text-[10px] opacity-50 uppercase tracking-widest leading-tight">{profile.role}</span>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-cyan-500/50 p-0.5 bg-slate-800">
                      <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                         <span className="text-xs font-bold">{profile.displayName.substring(0, 2).toUpperCase()}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all ml-2"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 mt-16 max-w-7xl mx-auto w-full p-4 md:p-8">
              {profile.status === 'pending' && profile.role !== 'admin' ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
                  <div className="p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl max-w-md">
                    <h2 className="text-2xl font-bold mb-4 tracking-tight">ENCRYPTED CLEARANCE REQUIRED</h2>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Your biometric profile is currently undergoing verification by the High Council. 
                      Access to the Sonic Arena is restricted until administrative confirmation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  {profile.role === 'admin' && <AdminDashboard profile={profile} />}
                  {profile.role === 'jury' && <JuryDashboard profile={profile} />}
                  {profile.role === 'participant' && <ParticipantDashboard profile={profile} />}
                </div>
              )}
            </main>

            <footer className="h-10 border-t border-white/5 bg-black/40 flex items-center justify-between px-8 text-[10px] font-mono text-white/30 tracking-wider">
              <span>ARENA_PROTOCOL_SHIELD</span>
              <span className="hidden sm:inline">© 2026 SONIC BATTLE ARENA OPERATIONS</span>
              <span>LATENCY: 8ms</span>
            </footer>
          </motion.div>
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-[#05060f]">
             <div className="animate-pulse text-cyan-400 font-mono tracking-widest text-xs uppercase">Initialising Neural Link...</div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

