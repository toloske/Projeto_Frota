
import React, { useState } from 'react';
import { VEHICLE_CATEGORIES, STOPPED_JUSTIFICATIONS } from '../constants';
import { FormData, VehicleStatus, SVCConfig } from '../types';
import { 
  Calendar, 
  MapPin, 
  Truck, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Camera,
  Trash2,
  Send,
  Loader2,
  RefreshCw,
  FileCheck
} from 'lucide-react';

// Data YYYY-MM-DD local
const getLocalDate = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

interface Props {
  onSave: (data: FormData) => void;
  svcList: SVCConfig[];
  onNewForm: () => void;
  isSyncing?: boolean;
}

export const FormView: React.FC<Props> = ({ onSave, svcList, onNewForm, isSyncing }) => {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [date, setDate] = useState(getLocalDate());
  const [svc, setSvc] = useState('');
  
  const [spotOffers, setSpotOffers] = useState({
    bulkVan: 0,
    bulkVuc: 0,
    utilitarios: 0,
    van: 0,
    veiculoPasseio: 0,
    vuc: 0
  });

  const [fleetStatus, setFleetStatus] = useState<VehicleStatus[]>([]);
  const [baseCapacity, setBaseCapacity] = useState<Record<string, number>>(
    VEHICLE_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {})
  );
  
  const [problems, setProblems] = useState<{ description: string; media: string[] }>({
    description: '',
    media: []
  });

  const [weeklyAcceptance, setWeeklyAcceptance] = useState<string | undefined>();
  const [acceptances, setAcceptances] = useState<string[]>([]);

  const handleSvcChange = (val: string) => {
    setSvc(val);
    const selectedSvc = svcList.find(s => s.id === val);
    if (selectedSvc) {
      setFleetStatus(selectedSvc.vehicles.map(v => ({
        plate: v.plate,
        category: v.category,
        running: true
      })));
    }
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!svc) { alert("Selecione um SVC."); return; }
    
    const finalData: FormData = {
      id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
      timestamp: new Date().toISOString(),
      date, svc, spotOffers, fleetStatus, baseCapacity, problems, weeklyAcceptance, acceptances
    };

    onSave(finalData);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in duration-500 text-center px-6">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-100">
          <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Enviado!</h2>
        <p className="text-slate-500 font-bold mb-10 max-w-xs">Reporte de {svc} guardado localmente e sincronizando com a nuvem.</p>
        <button 
          onClick={onNewForm}
          className="w-full max-w-xs py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
        >
          Novo Reporte
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="pb-10 pt-4 relative">
      {isSyncing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-white p-10">
          <RefreshCw className="w-12 h-12 animate-spin mb-4" />
          <h3 className="text-xl font-black uppercase tracking-widest">Sincronizando...</h3>
        </div>
      )}

      {/* Progress */}
      <div className="mb-10 flex items-center justify-between gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full relative bg-slate-200">
            <div className={`absolute inset-0 transition-all duration-500 rounded-full ${step >= i ? 'bg-indigo-600 shadow-lg' : 'bg-transparent'}`} />
          </div>
        ))}
      </div>

      <div className="min-h-[480px]">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-2xl font-black text-slate-800">Identificação</h2>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Data da Operação (Dia Real)</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg border-2 border-transparent focus:border-indigo-500 outline-none" />
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-4">SVC Operacional</label>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {svcList.map(s => (
                  <button key={s.id} onClick={() => handleSvcChange(s.id)} className={`p-4 rounded-2xl font-black text-sm border-2 transition-all ${svc === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-500'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800">Ofertas SPOT</h2>
            {Object.keys(spotOffers).map(key => (
              <div key={key} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setSpotOffers(prev => ({...prev, [key]: Math.max(0, (prev as any)[key] - 1)}))} className="w-10 h-10 bg-slate-100 rounded-xl font-black">-</button>
                  <span className="font-black text-indigo-600 text-xl">{(spotOffers as any)[key]}</span>
                  <button onClick={() => setSpotOffers(prev => ({...prev, [key]: (prev as any)[key] + 1}))} className="w-10 h-10 bg-indigo-600 text-white rounded-xl font-black">+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800">Frota Parada</h2>
            <div className="space-y-3">
              {fleetStatus.map(v => (
                <div key={v.plate} className={`p-5 rounded-3xl border-2 transition-all ${!v.running ? 'bg-rose-50 border-rose-500' : 'bg-white border-slate-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xl text-slate-800 uppercase">{v.plate}</span>
                    <button onClick={() => setFleetStatus(prev => prev.map(p => p.plate === v.plate ? {...p, running: !p.running} : p))} 
                      className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase ${v.running ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-600 text-white'}`}>
                      {v.running ? 'Rodou' : 'Parado'}
                    </button>
                  </div>
                  {!v.running && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {STOPPED_JUSTIFICATIONS.map(j => (
                        <button key={j} onClick={() => setFleetStatus(prev => prev.map(p => p.plate === v.plate ? {...p, justification: j} : p))}
                          className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 ${v.justification === j ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-400 border-slate-100'}`}>
                          {j}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-in fade-in">
             <h2 className="text-2xl font-black text-slate-800">Capacidade Base</h2>
             {VEHICLE_CATEGORIES.map(cat => (
               <div key={cat} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-slate-50">
                 <span className="text-[10px] font-black uppercase text-slate-500">{cat}</span>
                 <input type="number" value={baseCapacity[cat]} onChange={e => setBaseCapacity(prev => ({...prev, [cat]: parseInt(e.target.value) || 0}))} 
                  className="w-20 p-3 bg-slate-50 rounded-xl text-center font-black outline-none border-2 border-transparent focus:border-indigo-500" />
               </div>
             ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800">Problemas Operacionais</h2>
            <textarea placeholder="Relate quebras, atrasos ou problemas extras..." value={problems.description} onChange={e => setProblems(p => ({...p, description: e.target.value}))}
              className="w-full p-6 bg-white border-2 border-slate-100 focus:border-indigo-500 rounded-[2.5rem] min-h-[150px] font-bold text-slate-700 outline-none" />
            <label className="flex flex-col items-center justify-center p-10 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] cursor-pointer">
              <Camera className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anexar Evidência</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const reader = new FileReader();
                reader.onload = () => setProblems(p => ({...p, media: [...p.media, reader.result as string]}));
                if(e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
              }} />
            </label>
            <div className="flex gap-2 flex-wrap">
              {problems.media.map((img, i) => (
                <div key={i} className="w-16 h-16 rounded-xl overflow-hidden relative border border-slate-200">
                  <img src={img} className="w-full h-full object-cover" />
                  <button onClick={() => setProblems(p => ({...p, media: p.media.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-indigo-600" />
              <h2 className="text-2xl font-black text-slate-800">Aceite Semanal</h2>
            </div>
            <p className="text-slate-500 font-bold text-sm">Por favor, anexe o print do aceite semanal desta operação.</p>
            
            <label className={`flex flex-col items-center justify-center p-12 rounded-[2.5rem] border-4 border-dashed transition-all cursor-pointer ${weeklyAcceptance ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-indigo-200'}`}>
              {!weeklyAcceptance ? (
                <>
                  <Camera className="w-10 h-10 text-slate-300 mb-4" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir Print do Aceite</span>
                </>
              ) : (
                <div className="relative group">
                  <img src={weeklyAcceptance} className="max-h-[300px] rounded-2xl shadow-lg" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-2xl">
                    <Trash2 className="text-white w-8 h-8" />
                  </div>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                if (weeklyAcceptance) { setWeeklyAcceptance(undefined); return; }
                const reader = new FileReader();
                reader.onload = () => setWeeklyAcceptance(reader.result as string);
                if(e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
              }} />
            </label>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800 text-center">Revisão Final</h2>
            <div className="bg-emerald-50 p-8 rounded-[3rem] text-center border-2 border-emerald-100">
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] block mb-2">Resumo Pronto</span>
               <p className="text-emerald-950 font-bold leading-relaxed">Você está enviando o reporte de <span className="font-black">{svc}</span> referente ao dia <span className="font-black">{date.split('-').reverse().join('/')}</span>.</p>
            </div>
            <button onClick={handleSubmit} className="w-full py-8 bg-indigo-600 text-white font-black text-xl rounded-[3rem] shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 uppercase tracking-[0.1em] active:scale-95 transition-all">
              Finalizar e Sincronizar
              <Send className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-12 flex justify-between gap-4">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 py-5 bg-white text-slate-400 font-black rounded-3xl border border-slate-100 flex items-center justify-center gap-2 uppercase text-[10px]">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
        )}
        {step < 7 && (
          <button 
            disabled={step === 1 && !svc}
            onClick={() => setStep(s => s + 1)} 
            className={`flex-1 py-5 font-black rounded-3xl shadow-xl flex items-center justify-center gap-2 uppercase text-[10px] transition-all ${(!svc && step === 1) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white'}`}
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
