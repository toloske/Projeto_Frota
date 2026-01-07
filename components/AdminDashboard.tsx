
import React, { useState, useMemo } from 'react';
import { FormData, SVCConfig } from '../types';
import { 
  Download, 
  Search, 
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
  CalendarDays,
  CheckCircle,
  Circle,
  FileCheck,
  CloudUpload,
  History,
  Info,
  Check,
  Truck,
  Package,
  AlertTriangle,
  X,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

interface Props {
  submissions: FormData[];
  onRefresh: () => void;
  isSyncing: boolean;
  lastSync: Date | null;
  svcList: SVCConfig[];
}

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
      running,
      stopped,
      spot
    };
  }, [submissions, filterDate, svcList]);

  const filteredSubmissions = submissions.filter(s => 
    normalizeDate(s.date) === filterDate &&
    (s.svc.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-500">
      {/* Header com Filtros */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestão</h2>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {lastSync ? `Sincronizado: ${lastSync.toLocaleTimeString()}` : 'Offline'}
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
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Envios do Dia</span>
          <div className="flex items-end justify-between">
            <h4 className="text-2xl font-black text-slate-800">{dailyStats.count}<span className="text-slate-200">/{dailyStats.total}</span></h4>
            <span className="text-indigo-600 font-black text-[10px]">{Math.round(dailyStats.percentage)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-50 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: `${dailyStats.percentage}%` }} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Ofertas SPOT</span>
          <div className="flex items-center gap-3 mt-1">
            <Package className="w-5 h-5 text-indigo-500" />
            <h4 className="text-2xl font-black text-slate-800">{dailyStats.spot}</h4>
          </div>
        </div>
      </div>

      {/* Lista de Reportes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Registros de {formatDisplayDate(filterDate)}</h3>
        </div>

        <div className="grid gap-3">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white/50 p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
               <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
               <p className="text-[10px] font-black text-slate-400 uppercase">Nenhum reporte hoje</p>
            </div>
          ) : (
            filteredSubmissions.map(s => (
              <ReportListItem key={s.id} report={s} onClick={() => setSelectedReport(s)} />
            ))
          )}
        </div>
      </div>

      {/* Histórico Recente */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 px-2">
          <History className="w-4 h-4" /> Últimos 10 Geral
        </h3>
        <div className="grid gap-3 opacity-90">
          {submissions.slice(0, 10).map(s => (
            <ReportListItem key={`hist-${s.id}`} report={s} isHistory onClick={() => setSelectedReport(s)} />
          ))}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedReport && (
        <ReportDetailsModal 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </div>
  );
};

const ReportListItem: React.FC<{ report: FormData; isHistory?: boolean; onClick: () => void }> = ({ report, isHistory, onClick }) => {
  const running = report.fleetStatus.filter(v => v.running).length;
  const total = report.fleetStatus.length;
  const hasProblems = report.problems.description.length > 0 || report.fleetStatus.some(v => !v.running);

  return (
    <button 
      onClick={onClick}
      className="w-full text-left bg-white p-5 rounded-[2.2rem] border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black uppercase text-xs ${isHistory ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
          {report.svc.slice(0, 3)}
        </div>
        <div>
          <span className="text-base font-black text-slate-800 block leading-tight">{report.svc}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
              {formatDisplayDate(report.date)} • {new Date(report.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
            <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${running === total ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
              {running}/{total} Frota
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {hasProblems && (
          <div className="w-8 h-8 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        )}
        <ChevronRight className="w-5 h-5 text-slate-200" />
      </div>
    </button>
  );
};

const ReportDetailsModal: React.FC<{ report: FormData; onClose: () => void }> = ({ report, onClose }) => {
  // FIX: Type assertion to number[] to fix Operator '+' cannot be applied to types 'unknown' and 'unknown'
  const spotTotal = (Object.values(report.spotOffers) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col justify-end">
      <div className="bg-slate-50 w-full max-h-[92%] rounded-t-[3rem] shadow-2xl overflow-y-auto animate-in slide-in-from-bottom-10">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white p-6 border-b border-slate-100 z-10 flex justify-between items-center">
          <div>
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em] block mb-1">Detalhes do Reporte</span>
            <h2 className="text-2xl font-black text-slate-800">{report.svc}</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-90 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Info Básica */}
          <div className="flex gap-4">
            <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Data Op</span>
              <span className="font-black text-slate-800">{formatDisplayDate(report.date)}</span>
            </div>
            <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Enviado em</span>
              <span className="font-black text-slate-800">{new Date(report.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Frota List */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-500" /> Status da Frota
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {report.fleetStatus.map(v => (
                <div key={v.plate} className={`p-4 rounded-2xl border flex items-center justify-between ${v.running ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <div>
                    <span className="font-black text-slate-800">{v.plate}</span>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mt-0.5">{v.category}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase ${v.running ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {v.running ? 'Rodou' : 'Parado'}
                    </span>
                    {!v.running && (
                      <span className="block text-[9px] font-black text-rose-400 uppercase mt-0.5">{v.justification}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SPOT Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" /> Ofertas SPOT ({spotTotal})
            </h3>
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
              {Object.entries(report.spotOffers).map(([key, val]) => (
                // FIX: Type assertion to number for comparison to fix Operator '>' cannot be applied to types 'unknown' and 'number'
                (val as number) > 0 && (
                  <div key={key} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0">
                    <span className="text-[10px] font-black uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{val as number}</span>
                  </div>
                )
              ))}
              {spotTotal === 0 && (
                <div className="p-6 text-center text-slate-300 text-[10px] font-black uppercase">Nenhuma oferta registrada</div>
              )}
            </div>
          </div>

          {/* Problemas Operacionais */}
          {(report.problems.description || report.problems.media.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Problemas Operacionais
              </h3>
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                {report.problems.description && (
                  <p className="text-sm font-medium text-slate-600 leading-relaxed italic border-l-4 border-rose-500 pl-4">
                    "{report.problems.description}"
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {report.problems.media.map((img, i) => (
                    <img key={i} src={img} className="w-full h-24 object-cover rounded-2xl shadow-sm" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Aceite Semanal */}
          {report.weeklyAcceptance && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500" /> Aceite Semanal
              </h3>
              <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
                <img src={report.weeklyAcceptance} className="w-full rounded-[1.5rem] shadow-sm" />
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="text-center pb-10">
             <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">ID: {report.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
