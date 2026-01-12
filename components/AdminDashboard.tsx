
import React, { useState, useMemo } from 'react';
import { FormData, SVCConfig } from '../types';
import { GoogleGenAI } from "@google/genai";
import { 
  Download, 
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
  CalendarDays,
  History,
  Info,
  Truck,
  Package,
  AlertTriangle,
  X,
  Sparkles
} from 'lucide-react';

const normalizeDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
};

const formatDisplayDate = (dateStr: string) => {
  const cleanDate = normalizeDate(dateStr);
  const parts = cleanDate.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const AdminDashboard: React.FC<Props> = ({ submissions, onRefresh, isSyncing, lastSync, svcList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<FormData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  
  const getLocalDate = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };
  
  const [filterDate, setFilterDate] = useState(getLocalDate());

  const dailyStats = useMemo(() => {
    const dayReports = submissions.filter(s => normalizeDate(s.date) === filterDate);
    const uniqueSvcsReported = new Set(dayReports.map(s => s.svc));
    
    let running = 0, stopped = 0, spot = 0;
    dayReports.forEach(s => {
      running += s.fleetStatus.filter(v => v.running).length;
      stopped += s.fleetStatus.filter(v => !v.running).length;
      const offers = s.spotOffers as any;
      spot += Object.keys(offers).reduce((acc, key) => acc + (Number(offers[key]) || 0), 0);
    });

    return {
      count: uniqueSvcsReported.size,
      total: svcList.length,
      percentage: svcList.length > 0 ? (uniqueSvcsReported.size / svcList.length) * 100 : 0,
      running, stopped, spot
    };
  }, [submissions, filterDate, svcList]);

  const filteredSubmissions = submissions.filter(s => 
    normalizeDate(s.date) === filterDate &&
    (s.svc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Fix: Added Gemini-powered analysis for operational problems reported in the day
  const handleAIAnalysis = async () => {
    const problemsText = filteredSubmissions
      .map(s => `[${s.svc}]: ${s.problems.description}`)
      .filter(t => t.length > 15)
      .join('\n');

    if (!problemsText) {
      alert("Nenhuma ocorrência detalhada encontrada para análise hoje.");
      return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise as seguintes ocorrências de frota logística do dia ${formatDisplayDate(filterDate)} e forneça um resumo executivo dos problemas críticos e sugestões de ações corretivas:\n\n${problemsText}`,
        config: {
          systemInstruction: "Você é um consultor especialista em logística e gestão de frotas. Seja analítico, conciso e use português do Brasil (PT-BR).",
        }
      });
      setAiAnalysis(response.text);
    } catch (err) {
      console.error("AI analysis failed:", err);
      alert("Erro ao realizar análise inteligente. Verifique sua conexão.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportFullCSV = () => {
    const dayReports = submissions.filter(s => normalizeDate(s.date) === filterDate);
    if (dayReports.length === 0) { alert("Sem dados nesta data."); return; }
    const headers = ["ID Registro", "Horario Envio", "Data Operacao", "SVC", "SPOT Bulk Van", "SPOT Bulk Vuc", "SPOT Utilitarios", "SPOT Van", "SPOT Passeio", "SPOT Vuc", "Frota Rodando", "Frota Parada", "Problemas"].join(";");
    const rows = dayReports.map(s => [s.id, new Date(s.timestamp).toLocaleTimeString(), formatDisplayDate(s.date), s.svc, s.spotOffers.bulkVan, s.spotOffers.bulkVuc, s.spotOffers.utilitarios, s.spotOffers.van, s.spotOffers.veiculoPasseio, s.spotOffers.vuc, s.fleetStatus.filter(v => v.running).length, s.fleetStatus.filter(v => !v.running).length, `"${s.problems.description.replace(/"/g, '""')}"`].join(";"));
    const csvContent = "\ufeff" + headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Frota_${filterDate}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Gestor</h2>
            <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-slate-400 uppercase">
              <Clock className="w-3 h-3" />
              {lastSync ? `Atualizado: ${lastSync.toLocaleTimeString()}` : 'Sem conexão'}
            </div>
          </div>
          <div className="flex gap-2">
            {/* Added trigger for AI insights analysis */}
            <button 
              onClick={handleAIAnalysis} 
              disabled={isAnalyzing || filteredSubmissions.length === 0}
              className={`p-4 rounded-2xl flex items-center justify-center transition-all ${isAnalyzing ? 'bg-indigo-100 text-indigo-400 animate-pulse' : 'bg-indigo-600 text-white active:scale-90 shadow-md'}`}
              title="Analisar Ocorrências (IA)"
            >
              {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
            <button onClick={onRefresh} className={`p-4 bg-indigo-50 text-indigo-600 rounded-2xl active:scale-90 transition-all ${isSyncing ? 'animate-spin' : ''}`} disabled={isSyncing}>
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-grow relative">
            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-200 rounded-2xl font-black text-sm outline-none" />
          </div>
          <button onClick={handleExportFullCSV} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-95 transition-all"><Download className="w-6 h-6" /></button>
        </div>
      </div>

      {/* AI Analysis View */}
      {aiAnalysis && (
        <div className="bg-gradient-to-br from-indigo-600 to-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white relative animate-in zoom-in-95 duration-300">
          <button onClick={() => setAiAnalysis(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-xl hover:bg-white/20"><X className="w-4 h-4 text-indigo-200" /></button>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-200">Insights Estratégicos (IA)</h3>
          </div>
          <div className="text-xs font-medium leading-relaxed whitespace-pre-wrap opacity-90">{aiAnalysis}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[8px] font-black text-slate-400 uppercase block mb-2">Envios do Dia</span>
          <div className="flex items-end justify-between">
            <h4 className="text-2xl font-black text-slate-800">{dailyStats.count}<span className="text-slate-200">/{dailyStats.total}</span></h4>
            <span className="text-indigo-600 font-black text-[10px]">{Math.round(dailyStats.percentage)}%</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[8px] font-black text-slate-400 uppercase block mb-2">SPOT Total</span>
          <div className="flex items-center gap-3 mt-1">
            <Package className="w-5 h-5 text-indigo-500" />
            <h4 className="text-2xl font-black text-slate-800">{dailyStats.spot}</h4>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Lista de Envios</h3>
        </div>
        <div className="grid gap-3">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white/50 p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
               <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
               <p className="text-[10px] font-black text-slate-400 uppercase">Sem registros para esta data</p>
            </div>
          ) : (
            filteredSubmissions.map(s => (
              <ReportListItem key={s.id} report={s} onClick={() => setSelectedReport(s)} />
            ))
          )}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 px-2">
          <History className="w-4 h-4" /> Recentes (Últimos Geral)
        </h3>
        <div className="grid gap-3 opacity-90">
          {submissions.slice(0, 15).map(s => (
            <ReportListItem key={`hist-${s.id}`} report={s} isHistory onClick={() => setSelectedReport(s)} />
          ))}
        </div>
      </div>

      {selectedReport && (
        <ReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
};

const ReportListItem: React.FC<{ report: FormData; isHistory?: boolean; onClick: () => void }> = ({ report, isHistory, onClick }) => {
  const running = report.fleetStatus.filter(v => v.running).length;
  const total = report.fleetStatus.length;
  const hasProblems = report.problems.description.length > 0 || report.fleetStatus.some(v => !v.running);
  return (
    <button onClick={onClick} className="w-full text-left bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black uppercase text-xs ${isHistory ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>{report.svc.slice(0, 3)}</div>
        <div>
          <span className="text-base font-black text-slate-800 block leading-tight">{report.svc}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{formatDisplayDate(report.date)} • {new Date(report.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
      </div>
      {hasProblems && <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center"><AlertCircle className="w-4 h-4" /></div>}
    </button>
  );
};

const ReportDetailsModal: React.FC<{ report: FormData; onClose: () => void }> = ({ report, onClose }) => {
  const spotTotal = (Object.values(report.spotOffers) as number[]).reduce((a, b) => a + b, 0);
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col justify-end">
      <div className="bg-slate-50 w-full max-h-[92%] rounded-t-[3rem] shadow-2xl overflow-y-auto animate-in slide-in-from-bottom-10">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-100 z-10 flex justify-between items-center">
          <div>
            <span className="text-[9px] font-black text-indigo-600 uppercase block mb-1">Detalhes</span>
            <h2 className="text-2xl font-black text-slate-800">{report.svc}</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl text-slate-400"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6 space-y-8 pb-20">
          <div className="flex gap-4">
            <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm"><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Data Op</span><span className="font-black text-slate-800">{formatDisplayDate(report.date)}</span></div>
            <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm"><span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Envio</span><span className="font-black text-slate-800">{new Date(report.timestamp).toLocaleTimeString()}</span></div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Truck className="w-4 h-4 text-indigo-500" /> Frota</h3>
            {report.fleetStatus.map(v => (
              <div key={v.plate} className={`p-4 rounded-2xl border flex items-center justify-between ${v.running ? 'bg-emerald-50/50' : 'bg-rose-50'}`}>
                <div><span className="font-black text-slate-800">{v.plate}</span><span className="block text-[8px] font-bold text-slate-400 uppercase">{v.category}</span></div>
                <div className="text-right"><span className={`text-[10px] font-black uppercase ${v.running ? 'text-emerald-600' : 'text-rose-600'}`}>{v.running ? 'Rodou' : 'Parado'}</span>{!v.running && <span className="block text-[9px] font-black text-rose-400 uppercase">{v.justification}</span>}</div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Package className="w-4 h-4 text-indigo-500" /> SPOT ({spotTotal})</h3>
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
              {Object.entries(report.spotOffers).map(([k, v]) => (v as number) > 0 && (
                <div key={k} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0"><span className="text-[10px] font-black uppercase text-slate-500">{k}</span><span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{v as number}</span></div>
              ))}
            </div>
          </div>
          {report.problems.description && (
            <div className="bg-rose-50 p-5 rounded-[2rem] border border-rose-100 space-y-4">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Ocorrência</h3>
              <p className="text-sm font-medium text-rose-700 leading-relaxed italic">"{report.problems.description}"</p>
            </div>
          )}
          {report.weeklyAcceptance && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">Aceite Semanal</h3>
              <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm"><img src={report.weeklyAcceptance} className="w-full rounded-[1.5rem]" /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
interface Props {
  submissions: FormData[];
  onRefresh: () => void;
  isSyncing: boolean;
  lastSync: Date | null;
  svcList: SVCConfig[];
}
