"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Clock, ShieldCheck, Plus, Trash2, FileText, Wallet, Umbrella, Gift, ChevronDown, ChevronUp } from 'lucide-react';

interface NightShift {
  id: string;
  start: string;
  end: string;
  rate: number;
}

interface UserSettings {
  userName: string;
  hourlyRate: number;
  contractHours: number;
  mealAllowance: number;
  socialChargesRate: number; 
  fixedDeductions: number;   
  taxRate: number;           
  targetNet: number;
  annualLeave: number;
  leaveDayValue: number;
  holidayRate: number;
  nightShifts: NightShift[];
}

export default function SettingsPage() {
  const defaultSettings: UserSettings = {
    userName: "Utilisateur",
    hourlyRate: 12.50,
    contractHours: 151.67,
    mealAllowance: 0,
    socialChargesRate: 22, 
    fixedDeductions: 0,
    taxRate: 0,
    targetNet: 0,
    annualLeave: 25,
    leaveDayValue: 7,
    holidayRate: 100,
    nightShifts: [
      { id: '1', start: "21:00", end: "00:00", rate: 10 },
      { id: '2', start: "00:00", end: "06:00", rate: 30 }
    ]
  };

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lingo_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({
          ...defaultSettings,
          ...parsed,
          nightShifts: Array.isArray(parsed.nightShifts) ? parsed.nightShifts : defaultSettings.nightShifts,
          annualLeave: parsed.annualLeave || 25,
          leaveDayValue: parsed.leaveDayValue || 7,
          holidayRate: parsed.holidayRate || 100
        });
      } catch (e) {
        console.error("Erreur de lecture du stockage", e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('lingo_settings', JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const addNightShift = () => {
    const newShift: NightShift = { id: Date.now().toString(), start: "00:00", end: "00:00", rate: 0 };
    setSettings({ ...settings, nightShifts: [...settings.nightShifts, newShift] });
  };

  const removeNightShift = (id: string) => {
    setSettings({ ...settings, nightShifts: settings.nightShifts.filter(s => s.id !== id) });
  };

  const updateNightShift = (id: string, field: keyof NightShift, value: string | number) => {
    const updated = settings.nightShifts.map(s => s.id === id ? { ...s, [field]: value } : s);
    setSettings({ ...settings, nightShifts: updated });
  };

  const baseBrut = settings.hourlyRate * settings.contractHours;
  const netAvantImpot = (baseBrut * (1 - settings.socialChargesRate / 100)) - settings.fixedDeductions;
  const netAPayer = netAvantImpot * (1 - settings.taxRate / 100);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <style jsx global>{`
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
      `}</style>

      {/* Header Mobile */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/" className="p-2 bg-[#1a1a1a] rounded-full hover:bg-white/10 active:scale-95 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold italic text-blue-500">Configurations</h1>
          <button 
            onClick={handleSave} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-blue-600'}`}
          >
            <Save size={16} /> {isSaved ? "✓" : "OK"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Base Contrat */}
        <div className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-xl">
          <h2 className="text-lg font-medium mb-6 flex items-center gap-2 text-left">
            <FileText className="text-blue-500" size={18} /> Base Contrat
          </h2>
          <div className="space-y-4">
            <InputGroup 
              label="Ton Prénom" 
              value={settings.userName} 
              type="text" 
              onChange={(v) => setSettings({...settings, userName: v})} 
            />
            
            <InputGroup 
              label="Taux Horaire Brut (€/h)" 
              value={settings.hourlyRate} 
              type="number" 
              onChange={(v) => setSettings({...settings, hourlyRate: parseFloat(v) || 0})} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <InputGroup 
                label="Heures mensuelles" 
                value={settings.contractHours} 
                type="number" 
                onChange={(v) => setSettings({...settings, contractHours: parseFloat(v) || 0})} 
              />
              <InputGroup 
                label="Panier Repas (€)" 
                value={settings.mealAllowance} 
                type="number" 
                onChange={(v) => setSettings({...settings, mealAllowance: parseFloat(v) || 0})} 
              />
            </div>
          </div>
        </div>

        {/* Congés Payés */}
        <div className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-xl">
          <h2 className="text-lg font-medium mb-6 flex items-center gap-2 text-left">
            <Umbrella className="text-orange-500" size={18} /> Congés Payés
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputGroup 
                label="Jours annuels" 
                value={settings.annualLeave} 
                type="number" 
                onChange={(v) => setSettings({...settings, annualLeave: parseInt(v) || 0})} 
              />
              <InputGroup 
                label="Heures / jour" 
                value={settings.leaveDayValue} 
                type="number" 
                onChange={(v) => setSettings({...settings, leaveDayValue: parseFloat(v) || 0})} 
              />
            </div>
            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
              <p className="text-[10px] text-orange-400/70 italic">
                💡 Heures payées par jour de CP posé
              </p>
            </div>
          </div>
        </div>

        {/* Jours Fériés */}
        <div className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-xl">
          <h2 className="text-lg font-medium mb-6 flex items-center gap-2 text-left">
            <Gift className="text-pink-500" size={18} /> Jours Fériés
          </h2>
          <div className="space-y-4">
            <InputGroup 
              label="Majoration (%)" 
              value={settings.holidayRate} 
              type="number" 
              onChange={(v) => setSettings({...settings, holidayRate: parseFloat(v) || 0})} 
            />
            <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl space-y-2">
              <p className="text-[10px] text-pink-400/70 italic">
                💰 100% = Paiement double<br/>
                💰 50% = Paiement à 150%<br/>
                💰 Le bonus se cumule avec les primes nuit !
              </p>
            </div>
          </div>
        </div>

        {/* Calcul du Net */}
        <div className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-xl">
          <h2 className="text-lg font-medium mb-6 flex items-center gap-2 text-left">
            <Wallet className="text-green-500" size={18} /> Calcul du Net
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
              <InputGroup 
                label="Objectif Net Mensuel (€)" 
                value={settings.targetNet} 
                type="number" 
                onChange={(v) => setSettings({...settings, targetNet: parseFloat(v) || 0})} 
              />
              <p className="mt-2 text-[10px] text-blue-400/70 italic">
                Pour la barre de progression
              </p>
            </div>

            <InputGroup 
              label="Cotisations sociales (%)" 
              value={settings.socialChargesRate} 
              type="number" 
              onChange={(v) => setSettings({...settings, socialChargesRate: parseFloat(v) || 0})} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <InputGroup 
                label="Mutuelle (€)" 
                value={settings.fixedDeductions} 
                type="number" 
                onChange={(v) => setSettings({...settings, fixedDeductions: parseFloat(v) || 0})} 
              />
              <InputGroup 
                label="Impôt source (%)" 
                value={settings.taxRate} 
                type="number" 
                onChange={(v) => setSettings({...settings, taxRate: parseFloat(v) || 0})} 
              />
            </div>
          </div>
        </div>

        {/* Majorations Nuit */}
        <div className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium flex items-center gap-2 text-left">
              <Clock className="text-purple-500" size={18} /> Majorations Nuit
            </h2>
            <button 
              onClick={addNightShift} 
              className="p-2 bg-blue-600/10 text-blue-400 rounded-xl active:bg-blue-600/20 active:scale-95 transition-all"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {settings.nightShifts.map((shift) => (
              <div key={shift.id} className="p-4 bg-[#0a0a0a] rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Créneau</span>
                  <button 
                    onClick={() => removeNightShift(shift.id)} 
                    className="text-gray-600 active:text-red-500 active:scale-95 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <InputGroup 
                    label="Début" 
                    value={shift.start} 
                    type="time" 
                    onChange={(v) => updateNightShift(shift.id, 'start', v)} 
                  />
                  <InputGroup 
                    label="Fin" 
                    value={shift.end} 
                    type="time" 
                    onChange={(v) => updateNightShift(shift.id, 'end', v)} 
                  />
                  <InputGroup 
                    label="+ %" 
                    value={shift.rate} 
                    type="number" 
                    onChange={(v) => updateNightShift(shift.id, 'rate', parseFloat(v) || 0)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Synthèse Accordéon sur mobile */}
        <div className="bg-gradient-to-b from-[#111] to-[#0d0d0d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <button
            onClick={() => setShowSynthesis(!showSynthesis)}
            className="w-full p-6 flex items-center justify-between active:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-blue-400" size={20} />
              <h3 className="text-xl font-bold">Synthèse</h3>
            </div>
            {showSynthesis ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showSynthesis && (
            <div className="p-6 pt-0 space-y-4 animate-in slide-in-from-top duration-300">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-gray-400 text-sm">Salaire Brut Base</span>
                <span className="text-lg font-bold text-white">
                  {baseBrut.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                </span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div>
                  <span className="text-gray-400 text-sm block">Net à payer estimé</span>
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Après charges & impôts</span>
                </div>
                <span className="text-2xl font-black text-green-400">
                  {netAPayer.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                </span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Umbrella size={16} className="text-orange-400" />
                  <span className="text-gray-400 text-sm">CP annuels</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-orange-400 block">{settings.annualLeave}j</span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold">
                    ({settings.leaveDayValue}h/j)
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Gift size={16} className="text-pink-400" />
                  <span className="text-gray-400 text-sm">Bonus Férié</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-pink-400 block">+{settings.holidayRate}%</span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold">
                    {settings.holidayRate === 100 ? 'Double' : `x${(1 + settings.holidayRate / 100).toFixed(1)}`}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-widest">Taux horaires (Brut)</p>
                
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-xs text-gray-300">Normal</span>
                  <span className="font-bold text-blue-400">{settings.hourlyRate.toFixed(2)}€/h</span>
                </div>

                <div className="flex justify-between items-center bg-pink-500/5 p-3 rounded-xl border border-pink-500/20">
                  <span className="text-xs text-gray-300">Férié (+{settings.holidayRate}%)</span>
                  <span className="font-bold text-pink-400">
                    {(settings.hourlyRate * (1 + settings.holidayRate / 100)).toFixed(2)}€/h
                  </span>
                </div>

                {settings.nightShifts.map((shift) => (
                  <div key={shift.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-xs text-gray-300">
                      {shift.start}-{shift.end} (+{shift.rate}%)
                    </span>
                    <span className="font-bold text-blue-400">
                      {(settings.hourlyRate * (1 + shift.rate / 100)).toFixed(2)}€/h
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="pt-4 pb-8 px-6 text-center">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter italic">
            Copyright @KFDesign 2026
          </p>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, type, onChange }: { label: string, value: string | number, type: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-2 text-left">
      <label className="text-[10px] uppercase font-bold text-gray-600 ml-1 tracking-wider">{label}</label>
      <input 
        type={type} 
        value={value ?? ''} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm text-white transition-all" 
      />
    </div>
  );
}