
import React, { useState, useMemo } from 'react';
import { FormData, SVCConfig } from '../types';
import { 
  Download, 
  Search, 
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Truck,
  TrendingUp,
  Clock,
  CalendarDays,
  CheckCircle,
  Circle,
  FileCheck,
  CloudUpload,
  CloudCheck,
  History,
  Info
} from 'lucide-react';

interface Props {
  submissions: FormData[];
  onRefresh: () => void;
  isSyncing: boolean;
  lastSync: Date | null;
  svcList: SVCConfig[];
}

export const AdminDashboard: React.FC<Props> = ({ submissions, onRefresh, isSyncing, lastSync, svcList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data local correta para o filtro inicial
  const getLocalDate = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };
  
  const [filterDate, setFilterDate] = useState(getLocalDate());

  // Estatísticas do dia selecionado
  const dailyStats = useMemo(() => {
    const dayReports = submissions.filter(s => s.date === filterDate);
    const uniqueSvcsReported = new Set(dayReports.map(s => s.svc));
    
    let running = 0, stopped = 0, spot = 0;
    dayReports.forEach(s => {
      running += s.fleetStatus.filter(v => v.running).length;
      stopped += s.fleetStatus.filter(v => !v.running).length;
      spot += (Object.values(s.spotOffers) as number[]).reduce((a, b) => (a as number) + (b as number), 0);
    });

    return {
      count: uniqueSvcsReported.size,
      total: svcList.length,
      percentage: (uniqueSvcsReported.size / svcList.length) * 100,
      efficiency: running + stopped > 0 ? ((running / (running + stopped)) * 100).toFixed(1) : "0",
      spot
    };
  }, [submissions, filterDate, svcList]);

  // Lista dos 10 reportes mais recentes independente da data filtrada
  const recentSubmissions = useMemo(() => {
    return submissions.slice(0, 10);
  }, [submissions]);

  const handleExportDayCSV = () => {
    const dayReports = submissions.filter(s => s.date === filterDate);
    if (dayReports.length === 0) { alert("Nenhum dado para este dia."); return; }
    
    const headers = ["Data", "SVC", "Total_Rodou", "Total_Parado", "SPOT_Total", "ID_Reporte"].join(",");
    const rows = dayReports.map(s => [
      s.date, s.svc, 
      s.fleetStatus.filter(v => v.running).length,
      s.fleetStatus.filter(v => !v.running).length,
      (Object.values(s.spotOffers) as number[]).reduce((a, b) => (a as number) + (b as number), 0),
      s.id
    ].join(","));
    
    const blob = new Blob(["\ufeff" + headers + "\n" + rows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `consolidado_frota_${filterDate}.csv`;
    link.click();
  };

  const filteredSubmissions = submissions.filter(s => 
    s.date === filterDate &&
    (s.svc.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestão</h2>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {lastSync ? `Atualizado: ${lastSync.toLocaleTimeString()}` : 'Modo Offline'}
              </span>
            </div>
          </div>
          <button 
            onClick={onRefresh} 
            className={`p-4 bg-slate-50 text-indigo-600 rounded-2xl active:scale-90 transition-all ${isSyncing ? 'animate-spin' : ''}`}
            disabled={isSyncing}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-grow relative">
            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-indigo-50/50 border-2 border-transparent focus:border-indigo-200 rounded-2xl font-black text-sm outline-none text-indigo-900"
            />
          </div>
          <button onClick={handleExportDayCSV} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-2">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Reportes para a Data Selecionada */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             Filtrados por Data
           </h3>
           <span className="text-[10px] font-bold text-slate-300">{filteredSubmissions.length} itens</span>
        </div>

        <div className="grid gap-3">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white/50 p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
               <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum reporte em {filterDate.split('-').reverse().join('/')}</p>
            </div>
          ) : (
            filteredSubmissions.map(s => (
              <ReportCard key={s.id} report={s} />
            ))
          )}
        </div>
      </div>

      {/* Histórico Geral (Para garantir que nada "sumiu") */}
      <div className="space-y-4 mt-10">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
             <History className="w-3 h-3" /> Últimos 10 Envios (Geral)
           </h3>
        </div>
        <div className="grid gap-3">
          {recentSubmissions.map(s => (
            <ReportCard key={s.id} report={s} isHistory />
          ))}
        </div>
      </div>
    </div>
  );
};

// Componente Interno para o Card de Reporte
// Fix: Typing ReportCard as a React.FC ensures that React reserved props like 'key' are handled correctly.
const ReportCard: React.FC<{ report: FormData, isHistory?: boolean }> = ({ report, isHistory = false }) => (
  <div className={`bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all ${isHistory ? 'opacity-80 scale-95' : ''}`}>
    <div className="flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black transition-colors uppercase text-xs ${isHistory ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
        {report.svc.slice(0, 3)}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-slate-800 block leading-tight">{report.svc}</span>
          {report.weeklyAcceptance && <FileCheck className="w-3 h-3 text-emerald-500" />}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {report.date.split('-').reverse().join('/')} • {new Date(report.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
           </span>
           <CloudCheck className="w-3 h-3 text-indigo-300" />
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {report.fleetStatus.some(v => !v.running) && (
        <div className="bg-rose-50 text-rose-500 p-2 rounded-xl">
          <AlertCircle className="w-4 h-4" />
        </div>
      )}
      <ChevronRight className="w-5 h-5 text-slate-200" />
    </div>
  </div>
);
