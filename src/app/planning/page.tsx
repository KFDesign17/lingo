"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Plus, 
  Clock, Moon, Coffee, Calendar as CalendarIcon, X, Save, Trash2, Umbrella, Heart, AlertCircle, XCircle, Gift, Menu
} from 'lucide-react';

interface WorkSession {
  id: string;
  start: string;
  end: string;
}

interface WorkEntry {
  date: string; 
  sessions: WorkSession[];
  absenceType?: 'cp' | 'sick' | 'recovery' | 'unpaid' | null;
  isHoliday?: boolean;
}

const absenceLabels = {
  cp: { label: 'Congé Payé', color: 'bg-orange-500/20 border-orange-500', icon: Umbrella, textColor: 'text-orange-400' },
  sick: { label: 'Maladie', color: 'bg-red-500/20 border-red-500', icon: Heart, textColor: 'text-red-400' },
  recovery: { label: 'Récupération', color: 'bg-blue-500/20 border-blue-500', icon: Coffee, textColor: 'text-blue-400' },
  unpaid: { label: 'Sans Solde', color: 'bg-gray-500/20 border-gray-500', icon: XCircle, textColor: 'text-gray-400' }
};

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mealAllowance, setMealAllowance] = useState(0);
  const [holidayRate, setHolidayRate] = useState(100);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [dayType, setDayType] = useState<'work' | 'cp' | 'sick' | 'recovery' | 'unpaid'>('work');
  const [isHolidayChecked, setIsHolidayChecked] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('lingo_settings');
    const savedPlanning = localStorage.getItem('lingo_planning');
    
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setMealAllowance(parsed.mealAllowance || 0);
      setHolidayRate(parsed.holidayRate || 100);
    }
    
    if (savedPlanning) {
      try {
        const parsedEntries: any[] = JSON.parse(savedPlanning);
        const validEntries = parsedEntries.filter(e => e && (Array.isArray(e.sessions) || e.absenceType));
        setWorkEntries(validEntries);
      } catch (e) {
        console.error("Erreur de formatage des données", e);
      }
    }
    setIsInitialLoadDone(true);
  }, []);

  useEffect(() => {
    if (isInitialLoadDone) {
      localStorage.setItem('lingo_planning', JSON.stringify(workEntries));
    }
  }, [workEntries, isInitialLoadDone]);

  const { days, startOffset, month, year } = getDaysInMonth(currentDate);
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  function getDaysInMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    return { days, startOffset, month, year };
  }

  const currentDayEntry = workEntries.find(e => e.date === selectedDate);
  const [tempSessions, setTempSessions] = useState<WorkSession[]>([]);

  useEffect(() => {
    if (selectedDate) {
      const entry = currentDayEntry;
      if (entry?.absenceType) {
        setDayType(entry.absenceType);
        setTempSessions([]);
        setIsHolidayChecked(false);
      } else {
        setDayType('work');
        setTempSessions(entry?.sessions || [{ id: Date.now().toString(), start: "08:00", end: "17:00" }]);
        setIsHolidayChecked(entry?.isHoliday || false);
      }
    }
  }, [selectedDate, currentDayEntry]);

  const addSession = () => {
    setTempSessions([...tempSessions, { id: Date.now().toString(), start: "18:00", end: "22:00" }]);
  };

  const updateSession = (id: string, field: 'start' | 'end', value: string) => {
    setTempSessions(tempSessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSession = (id: string) => {
    setTempSessions(tempSessions.filter(s => s.id !== id));
  };

  const handleSaveDay = () => {
    if (selectedDate) {
      if (dayType === 'work') {
        if (tempSessions.length === 0) {
          setWorkEntries(prev => prev.filter(e => e.date !== selectedDate));
        } else {
          const newEntry: WorkEntry = { 
            date: selectedDate, 
            sessions: tempSessions,
            isHoliday: isHolidayChecked 
          };
          setWorkEntries(prev => [...prev.filter(e => e.date !== selectedDate), newEntry]);
        }
      } else {
        const newEntry: WorkEntry = { date: selectedDate, sessions: [], absenceType: dayType };
        setWorkEntries(prev => [...prev.filter(e => e.date !== selectedDate), newEntry]);
      }
      setSelectedDate(null);
      setShowAbsenceModal(false);
    }
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowAbsenceModal(true);
  };

  const entriesThisMonth = workEntries.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const workDaysCount = entriesThisMonth.filter(e => !e.absenceType && e.sessions?.length > 0).length;
  const holidayDaysCount = entriesThisMonth.filter(e => e.isHoliday && !e.absenceType).length;
  const cpCount = workEntries.filter(e => e.absenceType === 'cp').length;
  const sickCount = entriesThisMonth.filter(e => e.absenceType === 'sick').length;
  const recoveryCount = entriesThisMonth.filter(e => e.absenceType === 'recovery').length;
  const unpaidCount = entriesThisMonth.filter(e => e.absenceType === 'unpaid').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <style jsx global>{`
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
      `}</style>

      {/* Header Mobile */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/" className="p-2 bg-[#1a1a1a] rounded-full hover:bg-white/10 active:scale-95 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold">Planning</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Sélecteur de mois */}
        <div className="flex items-center justify-center bg-[#111] border border-white/10 rounded-2xl p-1">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-3 hover:bg-white/5 active:bg-white/10 rounded-xl transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 px-4 py-2 text-center font-semibold">
            {monthNames[month]} {year}
          </div>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-3 hover:bg-white/5 active:bg-white/10 rounded-xl transition-all">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendrier */}
        <div className="grid grid-cols-7 gap-1 bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
            <div key={idx} className="bg-[#111] p-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {day}
            </div>
          ))}

          {[...Array(startOffset)].map((_, i) => (
            <div key={`e-${i}`} className="bg-[#0d0d0d] min-h-[60px] opacity-20"></div>
          ))}

          {[...Array(days)].map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = workEntries.find(e => e.date === dateStr);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const absenceConfig = entry?.absenceType ? absenceLabels[entry.absenceType] : null;
            const isHolidayDay = entry?.isHoliday && !entry.absenceType;

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(dateStr)} 
                className={`min-h-[60px] p-2 border active:scale-95 cursor-pointer transition-all ${
                  absenceConfig 
                    ? `${absenceConfig.color} bg-opacity-10` 
                    : isHolidayDay
                    ? 'bg-pink-500/10 border-pink-500/30'
                    : 'bg-[#111] border-white/5'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold ${isToday ? 'text-blue-500 underline' : 'text-gray-500'}`}>
                    {day}
                  </span>
                  {isHolidayDay && <Gift size={10} className="text-pink-400" />}
                </div>
                
                {absenceConfig ? (
                  <div className="mt-1 flex items-center gap-1">
                    {React.createElement(absenceConfig.icon, { size: 10, className: absenceConfig.textColor })}
                  </div>
                ) : (
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {entry?.sessions?.slice(0, 2).map((s) => (
                      <div key={s.id} className={`p-0.5 border-l-2 text-[8px] font-medium leading-tight ${
                        isHolidayDay 
                          ? 'bg-pink-500/10 border-pink-500 text-pink-400'
                          : 'bg-blue-500/10 border-blue-500 text-blue-400'
                      }`}>
                        {s.start.slice(0,5)}-{s.end.slice(0,5)}
                      </div>
                    ))}
                    {entry?.sessions && entry.sessions.length > 2 && (
                      <div className="text-[8px] text-gray-500 font-bold">+{entry.sessions.length - 2}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Légende */}
        <div className="bg-[#111] border border-white/10 p-4 rounded-2xl">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Légende</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-sm shrink-0"></div>
              <span className="text-[10px] text-gray-400">Travail</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift size={12} className="text-pink-400 shrink-0" />
              <span className="text-[10px] text-gray-400">Férié</span>
            </div>
            {Object.entries(absenceLabels).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                {React.createElement(config.icon, { size: 12, className: `${config.textColor} shrink-0` })}
                <span className="text-[10px] text-gray-400 truncate">{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Résumé mensuel */}
        <div className="bg-[#111] border border-white/10 p-6 rounded-3xl">
          <h3 className="text-gray-400 text-xs font-bold uppercase mb-4">Résumé mensuel</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
              <span className="text-2xl font-bold text-blue-400">{workDaysCount}</span>
              <span className="text-[10px] text-gray-500 uppercase mt-1">Jours travaillés</span>
            </div>
            {holidayDaysCount > 0 && (
              <div className="flex flex-col items-center justify-center p-4 bg-pink-500/5 border border-pink-500/20 rounded-2xl">
                <span className="text-2xl font-bold text-pink-400">{holidayDaysCount}</span>
                <span className="text-[10px] text-gray-500 uppercase mt-1">Jours fériés</span>
              </div>
            )}
            <div className="flex flex-col items-center justify-center p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
              <span className="text-2xl font-bold text-orange-400">{cpCount}</span>
              <span className="text-[10px] text-gray-500 uppercase mt-1">CP pris</span>
            </div>
            {sickCount > 0 && (
              <div className="flex flex-col items-center justify-center p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                <span className="text-2xl font-bold text-red-400">{sickCount}</span>
                <span className="text-[10px] text-gray-500 uppercase mt-1">Maladie</span>
              </div>
            )}
          </div>
          {mealAllowance > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Paniers repas</span>
              <span className="text-2xl font-bold text-green-400">{(workDaysCount * mealAllowance).toFixed(2)}€</span>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="px-6 py-4 text-center">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter italic">
            Copyright @KFDesign 2026
          </p>
        </div>
      </div>

      {/* Modal plein écran sur mobile */}
      {showAbsenceModal && selectedDate && (
        <div className="fixed inset-0 bg-[#0a0a0a] z-50 overflow-y-auto">
          <div className="min-h-screen p-4 flex flex-col">
            {/* Header du modal */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Configurer</h2>
                <p className="text-blue-500 text-sm font-mono">
                  {new Date(selectedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button 
                onClick={() => { setSelectedDate(null); setShowAbsenceModal(false); }} 
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sélection du type */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Type de journée</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setDayType('work')}
                  className={`p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                    dayType === 'work' 
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                      : 'bg-white/5 border-white/10 text-gray-500'
                  }`}
                >
                  <Clock size={20} className="mx-auto mb-2" />
                  <span className="text-[10px] font-bold uppercase block">Travail</span>
                </button>

                {Object.entries(absenceLabels).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setDayType(key as any)}
                    className={`p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                      dayType === key 
                        ? `${config.color} ${config.textColor}` 
                        : 'bg-white/5 border-white/10 text-gray-500'
                    }`}
                  >
                    {React.createElement(config.icon, { size: 20, className: 'mx-auto mb-2' })}
                    <span className="text-[10px] font-bold uppercase block">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Si travail : horaires + checkbox férié */}
            {dayType === 'work' && (
              <div className="flex-1 space-y-4">
                {/* Checkbox Férié */}
                <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-2xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isHolidayChecked}
                      onChange={(e) => setIsHolidayChecked(e.target.checked)}
                      className="w-6 h-6 rounded bg-[#1a1a1a] border-pink-500/50 text-pink-500"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Gift size={16} className="text-pink-400" />
                      <span className="font-bold text-sm">Jour Férié</span>
                      <span className="text-xs text-pink-400/70 ml-auto">+{holidayRate}%</span>
                    </div>
                  </label>
                </div>

                {/* Sessions */}
                <div className="space-y-3">
                  {tempSessions.map((session, index) => (
                    <div key={session.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                      <div className="bg-blue-600/20 text-blue-400 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <input 
                          type="time" 
                          value={session.start} 
                          onChange={(e) => updateSession(session.id, 'start', e.target.value)} 
                          className="bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-3 text-sm outline-none focus:border-blue-500" 
                        />
                        <input 
                          type="time" 
                          value={session.end} 
                          onChange={(e) => updateSession(session.id, 'end', e.target.value)} 
                          className="bg-[#1a1a1a] border border-white/5 rounded-xl px-3 py-3 text-sm outline-none focus:border-blue-500" 
                        />
                      </div>
                      <button 
                        onClick={() => removeSession(session.id)} 
                        className="text-red-500/50 active:text-red-500 p-2 active:scale-95 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={addSession} 
                  className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-500 active:border-blue-500/50 active:text-blue-400 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                >
                  <Plus size={18} /> Ajouter un créneau
                </button>
              </div>
            )}

            {/* Info absences */}
            {dayType !== 'work' && (
              <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm mb-1">Information</h4>
                    <p className="text-xs text-gray-400">
                      {dayType === 'cp' && "Congé payé - Maintien du salaire"}
                      {dayType === 'sick' && "Arrêt maladie - Selon convention"}
                      {dayType === 'recovery' && "Jour de récupération"}
                      {dayType === 'unpaid' && "Absence non rémunérée"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton Valider fixe en bas */}
            <div className="sticky bottom-0 pt-4 pb-safe">
              <button 
                onClick={handleSaveDay} 
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold active:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40"
              >
                <Save size={18} /> Valider la journée
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}