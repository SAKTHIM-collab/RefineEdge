// refine-edge/frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, AlertTriangle, CheckCircle, TrendingUp, Leaf, Gauge, Settings2, ShieldCheck, ClipboardList, Mail
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

// --- System Interfaces ---
interface SensorDataPoint {
  time: string;
  ReactorTemp: number;
  Pressure: number;
}

interface OptimalMixData {
  strategy: string;
  projected_daily_profit_usd: number;
  optimal_crude_feed_bpd: number;
  product_mix_bpd: { naphtha: number; diesel: number; fuel_oil: number; };
}

interface RootCauseData {
  sensor: string;
  impact_score: number;
  action: string;
}

interface SustainabilityData {
  daily_co2_tonnes: number;
  carbon_intensity_score: number;
  esg_rating: string;
}

interface PredictiveMaintenance {
  asset_id: string;
  current_health: number;
  days_until_failure: number;
  recommendation: string;
}

export default function App() {
  // --- Operational State ---
  const [systemStatus, setSystemStatus] = useState<string>('SYSTEM READY');
  const [isAnomaly, setIsAnomaly] = useState<boolean>(false);
  const [sensorHistory, setSensorHistory] = useState<SensorDataPoint[]>([]);
  const [optimalMix, setOptimalMix] = useState<OptimalMixData | null>(null);
  const [rootCause, setRootCause] = useState<RootCauseData | null>(null);
  const [sustainability, setSustainability] = useState<SustainabilityData | null>(null);
  const [maintenance, setMaintenance] = useState<PredictiveMaintenance | null>(null);
  
  // --- Market & ESG State ---
  const [prices, setPrices] = useState({ naphtha: 85, diesel: 110, fuel_oil: 65 });
  const [greenMode, setGreenMode] = useState(false);

  // --- Safety Management (MOC) State ---
  const [showMOC, setShowMOC] = useState(false);
  const [hazardNote, setHazardNote] = useState("");
  const [mocHistory, setMocHistory] = useState<string[]>([]);

  // --- Data Acquisition Loop ---
  useEffect(() => {
    const fetchTelemetry = async () => {
      const mockReadings: Record<string, number> = {};
      for (let i = 1; i <= 41; i++) mockReadings[`xmeas_${i}`] = 50 + Math.random() * 5;
      for (let i = 1; i <= 11; i++) mockReadings[`xmv_${i}`] = 50 + Math.random() * 5;

      try {
        const res = await axios.post(`${API_URL}/predict-anomaly`, { readings: mockReadings });
        
        setIsAnomaly(res.data.is_anomaly);
        setSystemStatus(res.data.status.toUpperCase());
        setSustainability(res.data.sustainability);
        setMaintenance(res.data.predictive_maintenance);
        
        if (res.data.is_anomaly && res.data.root_cause) {
          setRootCause(res.data.root_cause);
        } else {
          setRootCause(null);
        }
        
        const newPoint: SensorDataPoint = { 
          time: new Date().toLocaleTimeString([], { hour12: false }), 
          ReactorTemp: mockReadings['xmeas_9'], 
          Pressure: mockReadings['xmeas_21'] 
        };
        setSensorHistory(prev => [...prev.slice(-18), newPoint]); 
      } catch (err) {
        setSystemStatus("COMMUNICATION FAILURE");
      }
    };

    const interval = setInterval(fetchTelemetry, 2000); 
    return () => clearInterval(interval);
  }, []);

  const runOptimizer = async () => {
    try {
      const res = await axios.post(`${API_URL}/optimize-mix`, {
        ...prices,
        green_mode: greenMode
      });
      setOptimalMix(res.data);
    } catch (err) {
      console.error("LP Engine Error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f16] text-[#e2e8f0] p-6 font-mono selection:bg-blue-500/30">
      
      {/* INDUSTRIAL HEADER */}
      <header className="mb-6 flex justify-between items-center border-b-2 border-[#1e293b] pb-4 bg-[#0f172a]/50 p-4 rounded-t-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="text-blue-400 w-5 h-5" />
            <h1 className="text-xl font-black tracking-tighter text-white">REFINE-EDGE // DIGITAL TWIN V1.0</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Crude Distillation Unit // Real-Time Supervisory Control</p>
        </div>
        
        <div className={`px-8 py-2 border-2 flex items-center gap-3 font-black text-sm transition-all duration-300 ${isAnomaly ? 'bg-red-950/20 text-red-500 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-slate-900/50 text-emerald-500 border-emerald-800'}`}>
          <div className={`w-2 h-2 rounded-full ${isAnomaly ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
          {systemStatus}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            <div className="flex justify-between items-center mb-6 text-xs font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-2"><Gauge className="w-4 h-4" /> [01] Telemetry</span>
              <div className="flex gap-4">
                <span className="text-blue-400 font-mono">RX_T: {sensorHistory[sensorHistory.length-1]?.ReactorTemp.toFixed(1)}°C</span>
                <span className="text-emerald-400 font-mono">SYS_P: {sensorHistory[sensorHistory.length-1]?.Pressure.toFixed(1)} BAR</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorHistory}>
                  <CartesianGrid strokeDasharray="0" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 10}} />
                  <YAxis stroke="#475569" domain={['dataMin - 2', 'dataMax + 2']} tick={{fontSize: 10}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: '10px' }} />
                  <Line type="stepAfter" dataKey="ReactorTemp" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="stepAfter" dataKey="Pressure" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {sustainability && (
            <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-6">
                <Leaf className="w-4 h-4" /> [02] ESG Compliance
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "CO2 Discharge", val: `${sustainability.daily_co2_tonnes} MT` },
                  { label: "Intensity", val: `${sustainability.carbon_intensity_score}` },
                  { label: "Environmental Tier", val: sustainability.esg_rating }
                ].map((item, i) => (
                  <div key={i} className="bg-[#0a0f16] p-4 border border-[#1e293b]">
                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">{item.label}</p>
                    <p className="text-xl font-bold text-emerald-400 leading-none">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-700" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                 <ClipboardList className="w-4 h-4" /> [04] Digital Audit Trail (OSHA PSM 1910.119)
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                 {mocHistory.length > 0 ? mocHistory.map((log, idx) => (
                   <div key={idx} className="text-[10px] bg-black/40 p-2 border-l-2 border-amber-600 font-mono text-slate-300">
                     {log}
                   </div>
                 )) : <div className="text-[10px] text-slate-600 italic">No authorized changes logged.</div>}
              </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className={`bg-[#0f172a] border p-6 rounded-sm relative transition-all duration-500 ${greenMode ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-[#1e293b]'}`}>
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-500 ${greenMode ? 'bg-emerald-500' : 'bg-amber-600'}`} />
            
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${greenMode ? 'text-emerald-400' : 'text-slate-400'}`}>
                <Settings2 className="w-4 h-4" /> [03] Strategic Optimizer
              </h2>
              <label className="relative inline-flex items-center cursor-pointer scale-75">
                <input type="checkbox" className="sr-only peer" checked={greenMode} onChange={() => setGreenMode(!greenMode)} />
                <div className="w-11 h-6 bg-slate-800 border border-slate-700 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            
            <div className="space-y-6 mb-8 text-[10px] font-bold uppercase">
              {['naphtha', 'diesel'].map((fuel) => (
                <div key={fuel}>
                  <div className="flex justify-between mb-2">
                    <span className={fuel === 'naphtha' ? 'text-blue-400' : 'text-amber-400'}>{fuel} Price</span>
                    <span className="text-white">${prices[fuel as keyof typeof prices]}</span>
                  </div>
                  <input type="range" min="40" max="150" value={prices[fuel as keyof typeof prices]} onChange={(e) => setPrices({...prices, [fuel]: parseInt(e.target.value)})} className="w-full h-1 bg-slate-800 appearance-none cursor-crosshair accent-blue-600" />
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowMOC(true)} 
              className={`w-full py-3 border text-[10px] font-black uppercase tracking-widest transition-all mb-6 active:scale-95 ${greenMode ? 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/40' : 'border-[#334155] text-white hover:bg-blue-900'}`}
            >
              Initiate MOC Authorization
            </button>

            {optimalMix && (
              <div className="bg-[#0a0f16] p-4 border border-[#1e293b] space-y-3">
                <div className={`py-1 px-2 inline-block rounded-sm text-[8px] font-black uppercase ${greenMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  Strategy: {optimalMix.strategy}
                </div>
                <div className="flex justify-between border-b border-[#1e293b] pb-2 text-[9px]">
                  <span className="text-slate-500 font-bold">PROJECTED PROFIT</span>
                  <span className="text-emerald-400 font-black text-lg">${optimalMix.projected_daily_profit_usd.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {maintenance && (
            <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-sm relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-500" />
              <div className="flex justify-between mb-4">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Asset: {maintenance.asset_id}</h2>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm ${maintenance.days_until_failure < 7 ? 'bg-red-500' : 'bg-blue-600'}`}>RUL: {maintenance.days_until_failure}D</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 border border-slate-800 mb-2">
                <div className={`h-full ${maintenance.current_health < 40 ? 'bg-red-600' : 'bg-blue-600'}`} style={{ width: `${maintenance.current_health}%` }} />
              </div>
              <p className="text-[9px] font-bold text-blue-400 italic text-right uppercase tracking-tighter">{maintenance.recommendation}</p>
            </div>
          )}
        </div>

        {isAnomaly && rootCause && (
          <div className="col-span-12 bg-red-950/10 border-2 border-red-900/50 p-6 rounded-sm animate-pulse shadow-[inset_0_0_20px_rgba(220,38,38,0.1)]">
            <div className="flex gap-6 items-center">
              <AlertTriangle className="text-red-500 w-10 h-10 shrink-0" />
              <div className="flex-1">
                <h3 className="text-xs font-black text-red-500 uppercase tracking-[0.3em] mb-4 underline">SHAP Diagnostic Alert</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-black/40 p-4 border border-red-900/30 text-xs font-black uppercase"><span className="text-red-700 block text-[8px] mb-1">Source</span>{rootCause.sensor}</div>
                  <div className="bg-black/40 p-4 border border-red-900/30 text-xs font-black uppercase"><span className="text-red-700 block text-[8px] mb-1">Score</span>+{rootCause.impact_score}</div>
                  <div className="bg-red-900/20 p-4 border border-red-600/50 text-[10px] font-bold text-white flex items-center italic">{rootCause.action}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SAFETY MOC MODAL */}
      {showMOC && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border-2 border-amber-600 w-full max-w-lg p-8 shadow-[0_0_60px_rgba(217,119,6,0.3)]">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4 text-white">
              <ShieldCheck className="text-amber-500 w-8 h-8" />
              <h2 className="text-xl font-black uppercase italic tracking-tighter">MOC Authorization Protocol</h2>
            </div>
            <div className="space-y-5">
              <div className="bg-slate-900/80 p-4 border border-slate-800 rounded-sm">
                <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Summary</p>
                <p className="text-[11px] font-mono text-amber-200 uppercase tracking-tighter">Adjust CDU-101 mix for price-yield optimization {greenMode ? "(ESG PRIORITY)" : "(PROFIT PRIORITY)"}</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-black mb-2 block tracking-widest">Hazard Identification & Risk Assessment (HIRA)</label>
                <textarea 
                  className="w-full bg-[#0a0f16] border border-slate-700 p-4 text-xs text-emerald-400 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none h-32"
                  placeholder="Analyze safety implications..."
                  value={hazardNote}
                  onChange={(e) => setHazardNote(e.target.value)}
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => {setShowMOC(false); setHazardNote("");}} className="flex-1 py-4 border border-slate-700 text-[10px] font-black uppercase hover:bg-red-900/10 transition-all">Abort</button>
                <button 
                  disabled={hazardNote.length < 10}
                  onClick={async () => {
                    try {
                      // 1. Submit MOC and Trigger Email Alert
                      await axios.post(`${API_URL}/submit-moc`, {
                        change_type: "PROCESS_OPTIMIZATION",
                        proposed_value: prices.diesel,
                        hazard_analysis: hazardNote,
                        operator_id: "NITT-SAKTHI-2026"
                      });

                      // 2. Execute Math
                      await runOptimizer();

                      // 3. Update Audit Trail
                      setMocHistory([
                        `[${new Date().toLocaleTimeString()}] 📧 EMAIL SENT TO SAFETY // AUTH: OP-SAKTHI // RISK: ${hazardNote.substring(0,35)}...`, 
                        ...mocHistory
                      ]);
                      setShowMOC(false);
                      setHazardNote("");
                    } catch (err) {
                      console.error("MOC Execution Failed");
                    }
                  }}
                  className="flex-1 py-4 bg-amber-600 text-black text-[10px] font-black uppercase hover:bg-amber-500 disabled:opacity-20 transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-3 h-3" /> Authorize & Dispatch Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}