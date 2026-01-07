
import React, { useState, useMemo } from 'react';
import { FormData } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Download, 
  Search, 
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Truck,
  TrendingUp,
  BarChart3,
  Clock,
  Sparkles,
  Zap,
  Loader2
} from 'lucide-react';

interface Props {
  submissions: FormData[];
  onRefresh: () => void;
  isSyncing: boolean;
  lastSync: Date | null;
}

export const AdminDashboard: React.FC<Props> = ({ submissions, onRefresh, isSyncing, lastSync }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const stats = useMemo(() => {
    if (submissions.length === 0) return null;
    let running = 0, stopped = 0, spot = 0;
    submissions.forEach(s => {
      running += s.fleetStatus.filter(v => v.running).length;
      stopped += s.fleetStatus.filter(v => !v.running).length;
      // Fix: Cast Object.values to number[] to prevent '+' operator errors with 'unknown' type
      spot += (Object.values(s.spotOffers) as number[]).reduce((a, b) => a + b, 0);
    });
    return { 
      efficiency: ((running / (running + stopped)) * 100).toFixed(1),
      running, stopped, spot
    };
  }, [submissions]);

  const generateAiInsight = async () => {
    if (submissions.length === 0) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise estes dados de operação de frota da última jornada:
        - Eficiência: ${stats?.efficiency}%
        - Veículos Parados: ${stats?.stopped}
        - Ofertas SPOT: ${stats?.spot}
        - Problemas relatados: ${submissions.map(s => s.problems.description).join('; ')}
        Forneça um insight curto (máximo 3 frases) e profissional sobre como melhorar a operação amanhã. Seja direto e use tom de gestor logístico.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiInsight(response.text);
    } catch (err) {
      console.error(err);
      setAiInsight("Não foi possível gerar análise agora. Verifique a conexão.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportCSV = () => {
    if (submissions.length === 0) return;
    const headers = ["ID", "Data", "SVC", "Parados", "Spot"].join(",");
    const rows = submissions.map(s => [
      s.id, s.date, s.svc, 
      s.fleetStatus.filter(v => !v.running).length,
      // Fix: Cast Object.values to number[] to prevent '+' operator errors with 'unknown' type
      (Object.values(s.spotOffers) as number[]).reduce((a, b) => a + b, 0)
    ].join(","));
    const blob = new Blob([headers + "\n" + rows.join("\n")], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `frota_report.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestão Central</h2>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {lastSync ? `Sync: ${lastSync.toLocaleTimeString()}` : 'Aguardando dados...'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className={`p-4 bg-slate-50 text-indigo-600 rounded-2xl active:scale-90 transition-all ${isSyncing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={handleExportCSV} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-95 transition-all">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* IA Insights Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-5 h-5 text-indigo-100" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Consultor Inteligente</h3>
            </div>
            <button 
              onClick={generateAiInsight}
              disabled={isAnalyzing || submissions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {aiInsight ? 'Recalcular' : 'Gerar Insight'}
            </button>
          </div>
          
          {aiInsight ? (
            <p className="text-sm font-medium leading-relaxed bg-white/10 p-5 rounded-2xl border border-white/10 animate-in slide-in-from-top-4">
              "{aiInsight}"
            </p>
          ) : (
            <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest opacity-80">
              {submissions.length > 0 ? 'Clique para analisar a performance do dia.' : 'Aguardando primeiros reportes...'}
            </p>
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Eficiência</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-slate-900 leading-none">{stats.efficiency}%</span>
              <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total SPOT</span>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-indigo-600 leading-none">{stats.spot}</span>
              <Truck className="w-4 h-4 text-indigo-300 mb-1" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Pesquisar SVC..." 
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-sm outline-none focus:border-indigo-500 transition-all font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid gap-3">
          {submissions.filter(s => s.svc.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
            <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-50 rounded-[1.5rem] flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  {s.svc.slice(0, 3)}
                </div>
                <div>
                  <span className="text-lg font-black text-slate-800 block leading-tight">{s.svc}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {new Date(s.timestamp).toLocaleDateString()} • {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {s.fleetStatus.some(v => !v.running) && (
                  <div className="bg-rose-50 text-rose-500 p-2.5 rounded-xl border border-rose-100">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
