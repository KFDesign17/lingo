"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, Calendar, Settings, Wallet, Clock, TrendingUp, Moon, RefreshCw, Target, ChevronLeft, ChevronRight, Sparkles, X, BarChart3, Trophy, Menu, Umbrella, Gift, Eye, EyeOff
} from 'lucide-react';

import { supabase } from '@/utils/supabase';

interface NightShift { id: string; start: string; end: string; rate: number; }
interface WorkSession { id: string; start: string; end: string; }
interface WorkEntry { 
  date: string; sessions: WorkSession[];
  absenceType?: 'cp' | 'sick' | 'recovery' | 'unpaid' | null;
  isHoliday?: boolean;
}
interface MonthHistory { label: string; net: number; isCurrent: boolean; }

export default function LingoDashboard() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'offline' | 'error'>('idle');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [displayDecimal, setDisplayDecimal] = useState(false);
  const [showNet, setShowNet] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Utilisateur");
  const [isSimMode, setIsSimMode] = useState(false);
  const [simData, setSimData] = useState({ start: "22:00", end: "06:00" });
  const [historyRange, setHistoryRange] = useState(3); 
  const [graphData, setGraphData] = useState<MonthHistory[]>([]);

  const [stats, setStats] = useState({
    hourlyRate: 0, contractHours: 0, baseSalary: 0,
    totalHoursMonth: 0, totalHoursFinancial: 0,
    nightHours: 0, nightBonus: 0,
    holidayHours: 0, holidayBonus: 0, holidayRate: 100,
    socialChargesRate: 21.9, fixedDeductions: 0, taxRate: 0, targetNet: 0,
    rawShifts: [] as NightShift[],
    annualLeave: 25, leaveTaken: 0, leaveRemaining: 25
  });

  // ─────────────────────────────────────────────
  // SYNC INTELLIGENTE — LAST WRITE WINS
  // ─────────────────────────────────────────────
  const smartSync = async (userId: string) => {
    setSyncStatus('syncing');

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    try {
      const localTs = localStorage.getItem('lingo_updated_at');
      const localTimestamp = localTs ? new Date(localTs).getTime() : 0;
      const localPlanning = localStorage.getItem('lingo_planning');
      const localSettings = localStorage.getItem('lingo_settings');

      const { data: cloudData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const cloudTimestamp = cloudData?.updated_at
        ? new Date(cloudData.updated_at).getTime() : 0;

      if (!cloudData || error) {
        // Pas de données cloud → on envoie le local
        if (localPlanning || localSettings) {
          await pushToCloud(userId, localPlanning, localSettings);
        }
      } else if (localTimestamp > cloudTimestamp) {
        // Local plus récent → on pousse vers le cloud
        await pushToCloud(userId, localPlanning, localSettings);
      } else if (cloudTimestamp > localTimestamp) {
        // Cloud plus récent → on tire depuis le cloud
        pullFromCloud(cloudData);
      } else if (cloudData.planning_data || cloudData.settings_data) {
        // Égalité ou premier chargement → on prend le cloud
        pullFromCloud(cloudData);
      }

      setSyncStatus('done');
    } catch (err) {
      console.error('Erreur sync :', err);
      setSyncStatus('error');
    }
  };

  const pushToCloud = async (userId: string, planning: string | null, settings: string | null) => {
    const now = new Date().toISOString();
    await supabase.from('user_profiles').upsert({
      id: userId,
      planning_data: planning ? JSON.parse(planning) : [],
      settings_data: settings ? JSON.parse(settings) : null,
      updated_at: now,
    });
    localStorage.setItem('lingo_updated_at', now);
  };

  const pullFromCloud = (cloudData: any) => {
    if (cloudData.planning_data) localStorage.setItem('lingo_planning', JSON.stringify(cloudData.planning_data));
    if (cloudData.settings_data) localStorage.setItem('lingo_settings', JSON.stringify(cloudData.settings_data));
    if (cloudData.updated_at) localStorage.setItem('lingo_updated_at', cloudData.updated_at);
  };

  // Sync automatique au retour en ligne
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        console.log('🌐 Retour en ligne → sync automatique');
        smartSync(user.id);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user]);

  // ─────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await smartSync(currentUser.id);
      setAuthLoading(false);
    };
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await smartSync(currentUser.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Vérifie tes emails pour confirmer l'inscription !");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    setAuthLoading(false);
  };

  // ─────────────────────────────────────────────
  // CALCULS
  // ─────────────────────────────────────────────
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  useEffect(() => {
    if (!user || syncStatus === 'syncing') return;

    const savedSettings = localStorage.getItem('lingo_settings');
    const savedPlanning = localStorage.getItem('lingo_planning');
    
    let rate = 0, hours = 0, shifts: NightShift[] = [];
    let charges = 21.9, fixed = 0, tax = 0, target = 0;
    let totalH = 0, totalHFinancial = 0, totalNightH = 0, totalBonus = 0;
    let totalHolidayH = 0, totalHolidayBonus = 0;
    let name = user.email?.split('@')[0] || "Utilisateur"; 
    let annualLeave = 25, leaveTaken = 0, leaveDayValue = 7, holidayRate = 100; 

    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      rate = parsed.hourlyRate || 0; hours = parsed.contractHours || 0;
      shifts = parsed.nightShifts || []; charges = parsed.socialChargesRate ?? 21.9;
      fixed = parsed.fixedDeductions || 0; tax = parsed.taxRate || 0;
      target = parsed.targetNet || 0;
      if (parsed.userName) name = parsed.userName;
      annualLeave = parsed.annualLeave || 25;
      leaveDayValue = parsed.leaveDayValue || 7;
      holidayRate = parsed.holidayRate || 100;
    }
    setUserName(name);

    if (savedPlanning) {
      try {
        const entries: WorkEntry[] = JSON.parse(savedPlanning);
        const selMonth = currentDate.getMonth();
        const selYear = currentDate.getFullYear();

        entries.forEach(entry => {
          const d = new Date(entry.date);
          const isSelectedMonth = d.getMonth() === selMonth && d.getFullYear() === selYear;
          if (entry.absenceType === 'cp') {
            leaveTaken++;
            if (isSelectedMonth) totalHFinancial += leaveDayValue;
          }
          if (isSelectedMonth && !entry.absenceType) {
            entry.sessions?.forEach(session => {
              const res = calculateSession(session.start, session.end, rate, shifts, entry.isHoliday || false, holidayRate);
              totalH += res.h; totalHFinancial += res.h;
              totalNightH += res.nH; totalBonus += res.b;
              if (entry.isHoliday) { totalHolidayH += res.h; totalHolidayBonus += res.hB; }
            });
          }
        });

        const tempGraphData: MonthHistory[] = [];
        for (let i = historyRange; i >= 0; i--) {
          const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i);
          let mHFinancier = 0, mB = 0, mHB = 0;
          entries.forEach(entry => {
            const d = new Date(entry.date);
            if (d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear()) {
              if (entry.absenceType === 'cp') { mHFinancier += leaveDayValue; }
              else {
                entry.sessions?.forEach(session => {
                  const res = calculateSession(session.start, session.end, rate, shifts, entry.isHoliday || false, holidayRate);
                  mHFinancier += res.h; mB += res.b; mHB += res.hB;
                });
              }
            }
          });
          const mBrut = (mHFinancier * rate) + mB + mHB;
          const mNet = Math.max(0, (mBrut - (mBrut * (charges / 100)) - fixed) * (1 - tax / 100));
          tempGraphData.push({ label: targetDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), net: mNet, isCurrent: i === 0 });
        }
        setGraphData(tempGraphData);
      } catch (e) { console.error(e); }
    }
    
    setStats({
      hourlyRate: rate, contractHours: hours, baseSalary: rate * hours,
      totalHoursMonth: totalH, totalHoursFinancial: totalHFinancial,
      nightHours: totalNightH, nightBonus: totalBonus,
      holidayHours: totalHolidayH, holidayBonus: totalHolidayBonus, holidayRate,
      socialChargesRate: charges, fixedDeductions: fixed, taxRate: tax, targetNet: target,
      rawShifts: shifts, annualLeave, leaveTaken, leaveRemaining: annualLeave - leaveTaken
    });
  }, [currentDate, historyRange, user, syncStatus]);

  function calculateSession(startStr: string, endStr: string, rate: number, shifts: NightShift[], isHoliday: boolean, holidayRate: number) {
    const [hS, mS] = startStr.split(':').map(Number);
    const [hE, mE] = endStr.split(':').map(Number);
    let start = hS + mS / 60, end = hE + mE / 60;
    if (end <= start) end += 24;
    let h = end - start, nH = 0, b = 0;
    for (let t = start; t < end; t += 0.25) {
      const curr = t % 24;
      shifts.forEach(s => {
        const [sh, sm] = s.start.split(':').map(Number);
        const [eh, em] = s.end.split(':').map(Number);
        let sr = sh + sm / 60, er = eh + em / 60;
        const inR = er > sr ? (curr >= sr && curr < er) : (curr >= sr || curr < er);
        if (inR) { nH += 0.25; b += (rate * (s.rate / 100)) * 0.25; }
      });
    }
    return { h, nH, b, hB: isHoliday ? (h * rate * (holidayRate / 100)) : 0 };
  }

  const toNet = (brut: number) => Math.max(0, (brut - brut * (stats.socialChargesRate / 100) - stats.fixedDeductions) * (1 - stats.taxRate / 100));

  const formatHours = (decimal: number) => {
    if (displayDecimal) return `${decimal.toFixed(2)}h`;
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}min`;
  };

  const currentTotalBrut = (stats.totalHoursFinancial * stats.hourlyRate) + stats.nightBonus + stats.holidayBonus;
  const currentTotalNet = toNet(currentTotalBrut);
  const progressBrut = (stats.totalHoursMonth * stats.hourlyRate) + stats.nightBonus + stats.holidayBonus;
  const progressNet = toNet(progressBrut);
  const baseNet = toNet(stats.baseSalary);
  const sim = calculateSession(simData.start, simData.end, stats.hourlyRate, stats.rawShifts, false, stats.holidayRate);
  const simNet = toNet(currentTotalBrut + (sim.h * stats.hourlyRate) + sim.b) - currentTotalNet;
  const isContractMet = stats.totalHoursMonth >= stats.contractHours;
  const hasTarget = stats.targetNet > 0;
  const financialTarget = hasTarget ? stats.targetNet : baseNet;
  const baseProgress = Math.min((stats.totalHoursMonth / stats.contractHours) * 100, 100) || 0;
  const extraProgress = stats.totalHoursMonth > stats.contractHours ? Math.min(((stats.totalHoursMonth - stats.contractHours) / stats.contractHours) * 100, 100) : 0;
  const remainingHours = Math.max(stats.contractHours - stats.totalHoursMonth, 0);
  const shouldSplitBar = hasTarget || isContractMet;
  const monthYearLabel = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const maxNetInGraph = Math.max(...graphData.map(d => d.net), 1);
  const leaveProgress = (stats.leaveTaken / stats.annualLeave) * 100;

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────
  if (authLoading || syncStatus === 'syncing') {
    return (
      <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
        <p className="text-gray-400 text-sm animate-pulse">Synchronisation en cours...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4 font-sans text-white">
        <div className="bg-[#111] p-8 rounded-2xl shadow-xl w-full max-w-md border border-white/10">
          <h1 className="text-3xl font-black text-center text-blue-500 mb-2 italic">LINGO PAY</h1>
          <p className="text-center text-gray-400 mb-8">
            {isSignUp ? "Créez votre compte sécurisé" : "Connectez-vous pour voir vos gains"}
          </p>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email" className="w-full p-3 border border-white/10 rounded-xl bg-black text-white outline-none focus:ring-2 focus:ring-blue-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Mot de passe" className="w-full p-3 pr-12 border border-white/10 rounded-xl bg-black text-white outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1" aria-label={showPassword ? "Masquer" : "Afficher"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95">
              {isSignUp ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>
          <button onClick={() => { setIsSignUp(!isSignUp); setShowPassword(false); }} className="w-full mt-6 text-sm text-blue-400 hover:underline">
            {isSignUp ? "Déjà un compte ? Connexion" : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 bg-[#111] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out w-64 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent italic">LINGO PAY</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-gray-400"><X size={20} /></button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
          <Link href="/planning" onClick={() => setIsSidebarOpen(false)}>
            <NavItem icon={<Calendar size={20} />} label="Planning" active={activeTab === 'planning'} />
          </Link>
        </nav>
        <div className="mt-auto border-t border-white/10 p-4 space-y-4">
          {/* Indicateur de sync */}
          <div className="px-2 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${syncStatus === 'done' ? 'bg-green-500' : syncStatus === 'offline' ? 'bg-orange-400 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-tighter">
              {syncStatus === 'done' ? 'Synchronisé ✓' : syncStatus === 'offline' ? 'Hors ligne' : syncStatus === 'error' ? 'Erreur sync' : 'Cloud'}
            </span>
          </div>
          <Link href="/settings" onClick={() => setIsSidebarOpen(false)}>
            <NavItem icon={<Settings size={20} />} label="Paramètres" active={activeTab === 'settings'} />
          </Link>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center px-4 py-3 gap-3 rounded-xl transition-all text-red-500 hover:bg-red-500/10">
            <X size={20} /><span className="font-medium text-sm">Déconnexion</span>
          </button>
          <div className="px-2 text-left">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter italic">Copyright @KFDesign 2026</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 p-4 lg:hidden">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><Menu size={24} /></button>
            <h2 className="text-lg font-bold">Dashboard</h2>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center font-bold text-xs">{userName.charAt(0)}</div>
          </div>
        </div>

        {/* Bannière hors ligne */}
        {syncStatus === 'offline' && (
          <div className="mx-4 lg:mx-8 mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-xs font-bold flex items-center gap-2">
            📡 Mode hors ligne — vos données seront synchronisées automatiquement à la reconnexion
          </div>
        )}

        <div className="p-4 lg:p-8">
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 gap-4 text-left">
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <div className="flex items-center justify-between lg:justify-start gap-2 bg-white/5 border border-white/10 w-full lg:w-fit p-1 rounded-xl">
                <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><ChevronLeft size={18} /></button>
                <div className="flex items-center gap-2 px-2 flex-1 justify-center">
                  <Calendar size={12} className="text-blue-500" />
                  <span className="text-[10px] lg:text-[11px] font-bold uppercase tracking-widest text-gray-200">{monthYearLabel}</span>
                </div>
                <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><ChevronRight size={18} /></button>
              </div>
              <div className="hidden lg:block">
                <h2 className="text-3xl font-semibold tracking-tight">Salut {userName} 👋</h2>
                <p className="text-gray-400 text-sm mt-1">Base contrat : <span className="text-blue-400 font-medium">{stats.hourlyRate}€/h</span> • {stats.contractHours}h</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <button onClick={() => setIsSimMode(!isSimMode)} className={`flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-wider ${isSimMode ? 'bg-purple-600 border-purple-400 shadow-lg shadow-purple-500/20 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                <Sparkles size={14} /> Simulateur
              </button>
              <button onClick={() => setDisplayDecimal(!displayDecimal)} className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <RefreshCw size={12} className={displayDecimal ? "text-blue-400" : ""} /> {displayDecimal ? "Comptable" : "Réel"}
              </button>
              <div className="hidden lg:flex w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full items-center justify-center font-bold uppercase">{userName.charAt(0)}</div>
            </div>
          </header>

          {isSimMode && (
            <div className="mb-6 bg-purple-600/10 border border-purple-500/30 rounded-2xl lg:rounded-3xl p-4 lg:p-6">
              <div className="flex justify-between items-start mb-4 lg:mb-6 text-left">
                <div className="flex items-center gap-3 text-purple-400">
                  <div className="p-2 bg-purple-500/20 rounded-lg"><Sparkles size={20} /></div>
                  <div>
                    <h3 className="font-bold text-base lg:text-lg text-white">Mode Simulation</h3>
                    <p className="text-[10px] lg:text-xs text-purple-400/60 uppercase tracking-widest font-bold italic">Gain potentiel</p>
                  </div>
                </div>
                <button onClick={() => setIsSimMode(false)} className="text-gray-500 hover:text-white p-1"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest px-1">Début</label>
                  <input type="time" value={simData.start} onChange={e => setSimData({...simData, start: e.target.value})} style={{ colorScheme: 'dark' }} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-3 text-sm focus:border-purple-500 outline-none" />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest px-1">Fin</label>
                  <input type="time" value={simData.end} onChange={e => setSimData({...simData, end: e.target.value})} style={{ colorScheme: 'dark' }} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-3 text-sm focus:border-purple-500 outline-none" />
                </div>
                <div className="col-span-2 bg-[#0a0a0a]/50 rounded-2xl p-4 border border-purple-500/20 text-left">
                  <p className="text-[10px] font-black text-purple-400/80 uppercase mb-1">Impact Net</p>
                  <p className="text-xl lg:text-2xl font-black text-white">+{simNet.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">{formatHours(sim.h)} total</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <StatCard title={showNet ? "Base Nette" : "Base Brute"} value={`${(showNet ? baseNet : stats.baseSalary).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`} icon={<Wallet className={showNet ? "text-green-400" : "text-blue-400"} />} label={showNet ? `Après ${stats.socialChargesRate}% charges` : "Salaire fixe"} onSwitch={() => setShowNet(!showNet)} isNet={showNet} />
            <StatCard title="Primes de Nuit" value={`${(showNet ? toNet((stats.totalHoursFinancial * stats.hourlyRate) + stats.nightBonus) - toNet(stats.totalHoursFinancial * stats.hourlyRate) : stats.nightBonus).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`} icon={<Moon className="text-blue-400" />} label={`${formatHours(stats.nightHours)} majorées`} />
            <StatCard title="Bonus Fériés" value={`${(showNet ? toNet(stats.holidayBonus) : stats.holidayBonus).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`} icon={<Gift className="text-pink-400" />} label={`${formatHours(stats.holidayHours)} à +${stats.holidayRate}%`} />
            <div className="border p-4 lg:p-6 rounded-2xl transition-all bg-[#111] border-white/10 text-left">
              <div className="flex justify-between items-start mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-white/5 rounded-xl border border-white/5 w-fit"><Umbrella className="text-orange-400" size={18} /></div>
              </div>
              <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Congés Payés</p>
              <h4 className="text-xl lg:text-2xl font-bold">{stats.leaveRemaining} jours</h4>
              <div className="mt-3 bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500" style={{ width: `${leaveProgress}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 italic">{stats.leaveTaken} / {stats.annualLeave} pris</p>
            </div>
          </div>

          <div className="mb-6 lg:mb-8">
            <StatCard title={showNet ? "💰 Simul Gain Net Total" : "💰 Simul Gain Brut Total"} value={`${(showNet ? currentTotalNet : currentTotalBrut).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`} icon={<TrendingUp className="text-purple-400" />} highlight label="Travail + primes + bonus + CP" />
          </div>

          <div className="bg-[#111] border border-white/10 rounded-2xl lg:rounded-3xl p-4 lg:p-6 mb-6 lg:mb-8 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-4">
              <div>
                <h3 className="text-base lg:text-lg font-medium">Progression mensuelle en cours</h3>
                <p className={`text-xl lg:text-2xl font-bold mt-1 ${showNet ? 'text-green-400' : 'text-blue-400'}`}>
                  {(showNet ? progressNet : progressBrut).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-sm font-mono text-white block">{formatHours(stats.totalHoursMonth)} / {stats.contractHours}h</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isContractMet ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {((stats.totalHoursMonth / stats.contractHours) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex gap-2 w-full h-4 lg:h-5 mb-4">
              <div className={`${shouldSplitBar ? 'flex-[4]' : 'w-full'} h-full bg-white/5 rounded-l-full overflow-hidden border border-white/5`}>
                <div className={`h-full transition-all duration-1000 ease-out shadow-lg ${isContractMet ? 'bg-green-500 shadow-green-500/20' : 'bg-blue-600 shadow-blue-500/20'}`} style={{ width: `${baseProgress}%` }}></div>
              </div>
              {shouldSplitBar && (
                <div className="flex-1 h-full bg-white/5 rounded-r-full overflow-hidden border border-white/5">
                  <div className="h-full bg-green-900 transition-all duration-1000 ease-out" style={{ width: `${extraProgress}%` }}></div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-white/5 text-left">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter flex items-center gap-1">
                  <Target size={10} className="text-green-600" /> Actuel Net Travailler / {hasTarget ? "Objectif" : "Base"}
                </span>
                <span className="text-sm font-semibold text-gray-300">
                  {progressNet.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€ / {financialTarget.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                </span>
              </div>
              <p className="text-xs lg:text-sm text-orange-400/80 italic flex items-center gap-2">
                <Clock size={14} />{isContractMet ? "Heures supp." : `${formatHours(remainingHours)} restantes`}
              </p>
            </div>
          </div>

          <div className="bg-[#111] border border-white/10 rounded-2xl lg:rounded-3xl overflow-hidden text-left shadow-2xl">
            <div className="p-4 lg:p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 lg:p-2.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20"><BarChart3 size={18} /></div>
                <div>
                  <h3 className="font-bold italic text-base lg:text-lg">Historique</h3>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{historyRange} derniers mois</p>
                </div>
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1 w-full sm:w-auto">
                {[3, 6, 12].map((range) => (
                  <button key={range} onClick={() => setHistoryRange(range)} className={`flex-1 sm:flex-initial px-3 lg:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${historyRange === range ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500'}`}>{range}M</button>
                ))}
              </div>
            </div>
            <div className="p-4 lg:p-8 relative min-h-[250px] lg:min-h-[350px]">
              <div className="absolute inset-x-4 lg:inset-x-8 top-4 lg:top-8 bottom-16 lg:bottom-20 flex flex-col justify-between pointer-events-none">
                {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                  <div key={ratio} className="flex items-center gap-2 lg:gap-4 w-full">
                    <span className="text-[9px] text-gray-600 font-bold w-8 lg:w-12 text-right">{(maxNetInGraph * ratio).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€</span>
                    <div className="flex-1 border-t border-white/5"></div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-4 lg:inset-x-8 top-4 lg:top-8 bottom-16 lg:bottom-20 left-12 lg:left-20 flex items-end justify-between px-1 lg:px-2">
                {graphData.map((month, idx) => {
                  const height = (month.net / maxNetInGraph) * 100;
                  const isMax = month.net === maxNetInGraph && month.net > 0;
                  return (
                    <div key={idx} className="relative flex-1 flex flex-col items-center group h-full justify-end max-w-[40px] lg:max-w-none">
                      <div className="absolute bottom-full mb-2 lg:mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 pointer-events-none">
                        <div className="bg-white text-black text-[10px] lg:text-[11px] font-black py-1.5 lg:py-2 px-2 lg:px-3 rounded-xl shadow-2xl flex items-center gap-1 lg:gap-2 whitespace-nowrap">
                          {isMax && <Trophy size={10} className="text-amber-500" />}
                          {month.net.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </div>
                        <div className="w-2 h-2 bg-white rotate-45 mx-auto -mt-1"></div>
                      </div>
                      <div className={`w-6 lg:w-10 rounded-t-xl transition-all duration-700 ease-out ${month.isCurrent ? 'bg-gradient-to-t from-blue-600 to-blue-400' : isMax ? 'bg-gradient-to-t from-green-600 to-emerald-400' : 'bg-white/10'}`} style={{ height: `${height || 2}%` }}></div>
                      <div className="absolute top-full mt-2 lg:mt-4 flex flex-col items-center">
                        <span className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest ${month.isCurrent ? 'text-blue-400' : 'text-gray-500'}`}>{month.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center px-4 py-3 gap-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5'}`}>
      <div className="shrink-0">{icon}</div>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, label, highlight, onSwitch, isNet }: { title: string, value: string, icon: React.ReactNode, label?: string, highlight?: boolean, onSwitch?: () => void, isNet?: boolean }) {
  return (
    <div className={`border p-4 lg:p-6 rounded-2xl transition-all relative text-left ${highlight ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5' : 'bg-[#111] border-white/10'}`}>
      <div className="flex justify-between items-start mb-3 lg:mb-4">
        <div className="p-2 lg:p-3 bg-white/5 rounded-xl border border-white/5 w-fit">{icon}</div>
        {onSwitch && (
          <button onClick={onSwitch} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all ${isNet ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>
            <RefreshCw size={10} /> {isNet ? "Net" : "Brut"}
          </button>
        )}
      </div>
      <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">{title}</p>
      <h4 className="text-xl lg:text-2xl font-bold">{value}</h4>
      {label && <p className="text-[10px] text-gray-500 mt-2 italic">{label}</p>}
    </div>
  );
}