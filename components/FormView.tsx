
import React, { useState, useEffect, useMemo } from 'react';
import { VEHICLE_CATEGORIES, STOPPED_JUSTIFICATIONS } from '../constants';
import { FormData, VehicleStatus, SVCConfig } from '../types';
import { 
  Truck, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Camera,
  Trash2,
  RefreshCw,
  Upload,
  Info,
  Database,
  Cloud,
  Layers,
  LayoutGrid
} from 'lucide-react';

const getLocalDate = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

interface Props {
  onSave: (data: FormData) => void;
  svcList: SVCConfig[];
  configSource: 'default' | 'cloud';
  onNewForm: () => void;
  isSyncing?: boolean;
  onManualSync?: () => void;
}

export const FormView: React.FC<Props> = ({ onSave, svcList, configSource, onNewForm, isSyncing, onManualSync }) => {
  const [step, setStep] = useState(1);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
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

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

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

  const handleFileSelection = async (files: FileList | null, type: 'problems' | 'acceptance') => {
    if (!files || files.length === 0) return;
    setIsProcessingImage(true);
    const newMedia: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        if (type === 'acceptance') { setWeeklyAcceptance(base64); setIsProcessingImage(false); return; }
        newMedia.push(base64);
      }
      if (type === 'problems') setProblems(p => ({ ...p, media: [...p.media, ...newMedia] }));
    } catch (e) { alert("Erro ao ler imagem."); } finally { setIsProcessingImage(false); }
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!svc) { alert("Selecione um SVC."); return; }
    
    const finalData: FormData = {
      id: `REP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
      timestamp: new Date().toISOString(),
      date, svc, spotOffers, fleetStatus, baseCapacity, problems, weeklyAcceptance,
      acceptances: []
    };
    
    try {
      await onSave(finalData);
      alert("Relatório enviado com sucesso!");
      // Reset total para a primeira página
      onNewForm();
    } catch (err) {
      alert("Erro ao salvar. Verifique sua conexão.");
    }
  };

  const groupedFleet = useMemo(() => {
    const groups: Record<string, VehicleStatus[]> = {};
    fleetStatus.forEach(v => {
      const cat = v.category || 'Outros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    });
    return groups;
  }, [fleetStatus]);

  return (
    <div className="pb-10 pt-4">
      <div className="mb-4 px-1 flex justify-between items-center">
        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Passo {step} de 7</span>
        {step === 1 && (
          <button 
            onClick={onManualSync} 
            disabled={isSyncing}
            className={`flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-400 ${isSyncing ? 'opacity-50' : ''}`}
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Atualizar Placas'}
          </button>
        )}
      </div>

      <div className="mb-8 flex items-center justify-between gap-1 px-1">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${step >= i ? 'bg-indigo-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      <div className="min-h-[420px]">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Identificação</h2>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Data da Operação</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg outline-none" />
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">Selecione seu SVC</label>
                  <div className={`flex items-center gap-1 text-[8px] font-black uppercase ${configSource === 'cloud' ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {configSource === 'cloud' ? <Cloud className="w-3 h-3" /> : <Database className="w-3 h-3" />}
                    {configSource === 'cloud' ? 'Sincronizado via Nuvem' : 'Usando Lista Padrão'}
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-300 uppercase">{svcList.length} SVCs</span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {svcList.map(s => (
                  <button key={s.id} onClick={() => handleSvcChange(s.id)} className={`p-4 rounded-2xl font-black text-sm border-2 transition-all ${svc === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Ofertas SPOT</h2>
            {Object.keys(spotOffers).map(key => (
              <div key={key} className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => setSpotOffers(prev => ({...prev, [key]: Math.max(0, (prev as any)[key] - 1)}))} className="w-10 h-10 bg-slate-100 rounded-xl font-black">-</button>
                  <span className="font-black text-indigo-600">{(spotOffers as any)[key]}</span>
                  <button onClick={() => setSpotOffers(prev => ({...prev, [key]: (prev as any)[key] + 1}))} className="w-10 h-10 bg-indigo-600 text-white rounded-xl font-black">+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Status da Frota</h2>
              <div className="bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-600" />
                <span className="text-[8px] font-black text-indigo-600 uppercase">{Object.keys(groupedFleet).length} Modais</span>
              </div>
            </div>
            
            <div className="space-y-10">
              {(Object.entries(groupedFleet) as [string, VehicleStatus[]][]).map(([category, vehicles]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{category}</h3>
                    <span className="text-[9px] font-bold text-slate-300 ml-auto bg-slate-50 px-2 py-0.5 rounded-lg">{vehicles.length} veículos</span>
                  </div>
                  
                  <div className="grid gap-4">
                    {vehicles.map(v => (
                      <div key={v.plate} className={`p-5 rounded-3xl border-2 transition-all ${!v.running ? 'bg-rose-50 border-rose-500' : 'bg-white border-slate-50 shadow-sm'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-black text-lg text-slate-800 uppercase block leading-none">{v.plate}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">ID: {v.plate.slice(-4)}</span>
                          </div>
                          <button onClick={() => setFleetStatus(prev => prev.map(p => p.plate === v.plate ? {...p, running: !p.running} : p))} 
                            className={`px-5 py-3 rounded-2xl font-black text-[10px] uppercase shadow-sm transition-transform active:scale-90 ${v.running ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-600 text-white'}`}>
                            {v.running ? 'Rodou' : 'Parado'}
                          </button>
                        </div>
                        {!v.running && (
                          <div className="mt-5 space-y-3">
                            <span className="text-[9px] font-black text-rose-400 uppercase block text-center tracking-widest">Justificativa de Ausência</span>
                            <div className="grid grid-cols-2 gap-2">
                              {STOPPED_JUSTIFICATIONS.map(j => (
                                <button key={j} onClick={() => setFleetStatus(prev => prev.map(p => p.plate === v.plate ? {...p, justification: j} : p))}
                                  className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${v.justification === j ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-[1.02]' : 'bg-white text-slate-400 border-slate-100'}`}>
                                  {j}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
             <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Capacidade Base</h2>
             {VEHICLE_CATEGORIES.map(cat => (
               <div key={cat} className="bg-white p-4 rounded-3xl flex justify-between items-center shadow-sm border border-slate-50">
                 <span className="text-[9px] font-black uppercase text-slate-500 flex-1 pr-4">{cat}</span>
                 <input type="number" inputMode="numeric" value={baseCapacity[cat]} onChange={e => setBaseCapacity(prev => ({...prev, [cat]: parseInt(e.target.value) || 0}))} className="w-20 p-4 bg-slate-50 rounded-2xl text-center font-black outline-none border-2 border-transparent focus:border-indigo-500" />
               </div>
             ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Ocorrências</h2>
            <textarea placeholder="Relate quebras, atrasos ou problemas..." value={problems.description} onChange={e => setProblems(p => ({...p, description: e.target.value}))} className="w-full p-6 bg-white border-2 border-slate-100 focus:border-indigo-500 rounded-[2rem] min-h-[120px] font-bold text-slate-700 outline-none" />
            <label htmlFor="problems-upload" className="flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] cursor-pointer active:bg-slate-100 transition-colors">
              <Camera className="w-8 h-8 text-indigo-400 mb-2" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fotos do Problema</span>
              <input id="problems-upload" type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileSelection(e.target.files, 'problems')} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              {problems.media.map((img, i) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden relative border border-slate-100">
                  <img src={img} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setProblems(p => ({...p, media: p.media.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg shadow-lg"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Aceite Semanal</h2>
            <div className="bg-indigo-600 text-white p-5 rounded-[2rem] shadow-lg flex items-start gap-4">
              <Info className="w-6 h-6 shrink-0 mt-1 text-indigo-200" />
              <p className="text-[11px] font-bold uppercase leading-relaxed">Anexe o print ou foto do aceite operacional desta semana.</p>
            </div>
            {!weeklyAcceptance ? (
              <label htmlFor="final-acceptance" className="flex flex-col items-center justify-center p-20 bg-white border-4 border-dashed border-slate-200 rounded-[3rem] cursor-pointer active:bg-indigo-50 transition-all text-center">
                <Upload className="w-12 h-12 text-indigo-400 mb-4" />
                <span className="text-[12px] font-black text-slate-500 uppercase tracking-widest">Subir Print/Foto</span>
                <input id="final-acceptance" type="file" accept="image/*" className="hidden" onChange={e => handleFileSelection(e.target.files, 'acceptance')} />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
                  <img src={weeklyAcceptance} className="w-full max-h-[400px] object-contain bg-slate-100" />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <button type="button" onClick={() => setWeeklyAcceptance(undefined)} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3"><Trash2 className="w-4 h-4" /> Remover</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-slate-800 text-center uppercase tracking-tight">Revisão</h2>
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
               <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                 <span className="text-[10px] font-black text-slate-400 uppercase">SVC</span>
                 <span className="font-black text-indigo-600 text-lg">{svc}</span>
               </div>
               <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Data</span>
                 <span className="font-black text-slate-800">{date.split('-').reverse().join('/')}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Frota</span>
                 <span className="font-black text-emerald-500">{fleetStatus.filter(f => f.running).length} Rodando</span>
               </div>
            </div>
            <button onClick={handleSubmit} className="w-full py-8 bg-indigo-600 text-white font-black text-xl rounded-[3rem] shadow-2xl uppercase tracking-widest active:scale-95 transition-all">Enviar Relatório</button>
          </div>
        )}
      </div>

      <div className="mt-12 flex justify-between gap-3">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 py-5 bg-white text-slate-400 font-black rounded-[2rem] border border-slate-100 flex items-center justify-center gap-2 uppercase text-[10px]"><ChevronLeft className="w-4 h-4" /> Anterior</button>
        )}
        {step < 7 && (
          <button 
            disabled={(step === 1 && !svc) || (step === 6 && !weeklyAcceptance)}
            onClick={() => setStep(s => s + 1)} 
            className={`flex-1 py-5 font-black rounded-[2rem] shadow-xl flex items-center justify-center gap-2 uppercase text-[10px] transition-all active:scale-[0.98] ${((!svc && step === 1) || (!weeklyAcceptance && step === 6)) ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white'}`}
          >
            {step === 6 ? 'Ir para Revisão' : 'Próximo'} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
