
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
  // Added missing FileCheck import
  FileCheck
} from 'lucide-react';

interface Props {
  submissions: FormData[];
  onRefresh: () => void;
  isSyncing: boolean;
  lastSync: Date | null;
  svcList: SVCConfig[]; // Necessário para calcular o progresso total
}

export const AdminDashboard: React.FC<Props> = ({ submissions, onRefresh, isSyncing, lastSync, svcList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Agrupar submissões por data para visualização
  const groupedByDate = useMemo(() => {
    const groups: Record<string, FormData[]> = {};
    submissions.forEach(s => {
      if (!groups[s.date]) groups[s.date] = [];
      groups[s.date].push(s);
    });
    return groups;
  }, [submissions]);

  // Estatísticas do dia selecionado
  const dailyStats = useMemo(() => {
    const dayReports = submissions.filter(s => s.date === filterDate);
    const uniqueSvcsReported = new Set(dayReports.map(s => s.svc));
    
    let running = 0, stopped = 0, spot = 0;
    dayReports.forEach(s => {
      running += s.fleetStatus.filter(v => v.running).length;
      stopped += s.fleetStatus.filter(v => !v.running).length;
      spot += (Object.values(s.spotOffers) as number[]).reduce((a, b) => a + b, 0);
    });

    return {
      count: uniqueSvcsReported.size,
      total: svcList.length,
      percentage: (uniqueSvcsReported.size / svcList.length) * 100,
      efficiency: running + stopped > 0 ? ((running / (running + stopped)) * 100).toFixed(1) : "0",
      spot
    };
  }, [submissions, filterDate, svcList]);

  const handleExportDayCSV = () => {
    const dayReports = submissions.filter(s => s.date === filterDate);
    if (dayReports.length === 0) { alert("Nenhum dado para este dia."); return; }
    
    const headers = ["Data", "SVC", "Total_Rodou", "Total_Parado", "SPOT_Total", "ID_Reporte"].join(",");
    const rows = dayReports.map(s => [
      s.date, s.svc, 
      s.fleetStatus.filter(v => v.running).length,
      s.fleetStatus.filter(v => !v.running).length,
      (Object.values(s.spotOffers) as number[]).reduce((a, b) => a + b, 0),
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
      {/* Header com Filtro de Data */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Gestor</h2>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {lastSync ? `Sincronizado: ${lastSync.toLocaleTimeString()}` : 'Aguardando nuvem...'}
              </span>
            </div>
          </div>
          <button onClick={onRefresh} className={`p-4 bg-slate-50 text-indigo-600 rounded-2xl active:scale-90 transition-all ${isSyncing ? 'animate-spin' : ''}`}>
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
            <span className="text-[10px] font-black uppercase pr-2 hidden sm:block">Exportar Dia</span>
          </button>
        </div>
      </div>

      {/* Barra de Progresso do Dia */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status de Envio</span>
            <h3 className="text-2xl font-black text-slate-800 leading-none">
              {dailyStats.count} <span className="text-slate-300">/ {dailyStats.total} SVCs</span>
            </h3>
          </div>
          <span className="text-indigo-600 font-black text-lg">{Math.round(dailyStats.percentage)}%</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000 ease-out shadow-inner"
            style={{ width: `${dailyStats.percentage}%` }}
          />
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
           {svcList.map(s => {
             const reported = submissions.some(sub => sub.date === filterDate && sub.svc === s.id);
             return (
               <div key={s.id} className="flex flex-col items-center gap-1 min-w-[50px]">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${reported ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-100 text-slate-300'}`}>
                   {reported ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                 </div>
                 <span className={`text-[8px] font-black uppercase ${reported ? 'text-slate-800' : 'text-slate-300'}`}>{s.name}</span>
               </div>
             )
           })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Eficiência (Dia)</span>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900 leading-none">{dailyStats.efficiency}%</span>
            <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total SPOT</span>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-indigo-600 leading-none">{dailyStats.spot}</span>
            <Truck className="w-4 h-4 text-indigo-300 mb-1" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar SVC..." 
            className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-3xl shadow-sm outline-none focus:border-indigo-500 transition-all font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid gap-3">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase text-xs">Nenhum reporte para {filterDate}</p>
            </div>
          ) : (
            filteredSubmissions.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors uppercase">
                    {s.svc.slice(0, 3)}
                  </div>
                  <div>
                    <span className="text-lg font-black text-slate-800 block leading-tight">{s.svc}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </span>
                       {s.weeklyAcceptance && <FileCheck className="w-3 h-3 text-emerald-500" />}
                    </div>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};
