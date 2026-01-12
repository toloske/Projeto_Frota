
import React, { useState } from 'react';
import { SVCConfig, FormData } from '../types';
import { 
  Trash2, 
  CheckCircle, 
  Truck, 
  PlusCircle, 
  Edit2, 
  X, 
  CloudUpload, 
  RefreshCw, 
  Globe
} from 'lucide-react';

interface Props {
  svcList: SVCConfig[];
  onUpdate: (newList: SVCConfig[]) => void;
  onClearData: () => void;
  syncUrl: string;
  onUpdateSyncUrl: (url: string) => void;
  submissions: FormData[];
  onImportData: (data: FormData[]) => void;
}

export const SettingsView: React.FC<Props> = ({ 
  svcList, onUpdate, onClearData, syncUrl, onUpdateSyncUrl 
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [editingSvc, setEditingSvc] = useState<SVCConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const publishConfigToCloud = async () => {
    if (!syncUrl || !syncUrl.startsWith('http')) {
      alert("A variável GLOBAL_SYNC_URL no arquivo constants.ts está vazia.");
      return;
    }

    setIsPublishing(true);
    setPublishStatus('idle');

    try {
      // Importante: Usar no-cors e text/plain para evitar bloqueios de segurança do Google
      await fetch(syncUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          type: 'config_update',
          data: svcList
        })
      });
      
      setPublishStatus('success');
      setTimeout(() => setPublishStatus('idle'), 4000);
    } catch (e) {
      console.error("Erro ao publicar placas:", e);
      setPublishStatus('error');
    } finally {
      setIsPublishing(false);
    }
  };

  const startEditing = (svc: SVCConfig) => {
    setEditingSvc(JSON.parse(JSON.stringify(svc)));
    setIsAddingNew(false);
  };

  const startAdding = () => {
    setEditingSvc({ id: '', name: '', vehicles: [] });
    setIsAddingNew(true);
  };

  const saveSvcChanges = () => {
    if (!editingSvc || !editingSvc.name) return;
    let newList = [...svcList];
    if (isAddingNew) {
      newList.push({ ...editingSvc, id: editingSvc.name });
    } else {
      newList = newList.map(s => s.id === editingSvc.id ? editingSvc : s);
    }
    onUpdate(newList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    setEditingSvc(null);
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-indigo-200" />
          <h2 className="text-xl font-black uppercase tracking-tight">Gestão Global</h2>
        </div>
        <p className="text-[10px] font-bold text-indigo-100 uppercase leading-relaxed">
          Após alterar placas no computador, clique abaixo. Todos os celulares da equipe baixarão as novas placas automaticamente ao abrir o app.
        </p>
        <button 
          onClick={publishConfigToCloud}
          disabled={isPublishing}
          className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all ${publishStatus === 'success' ? 'bg-emerald-500' : (publishStatus === 'error' ? 'bg-rose-500' : 'bg-white text-indigo-600 shadow-lg active:scale-95')}`}
        >
          {isPublishing ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : publishStatus === 'success' ? (
            <><CheckCircle className="w-5 h-5" /> Placas Enviadas!</>
          ) : (
            <><CloudUpload className="w-5 h-5" /> 1. Publicar para Celulares</>
          )}
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Placas e SVCs</h2>
          </div>
          <button onClick={startAdding} className="p-2 text-indigo-600"><PlusCircle className="w-8 h-8" /></button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {svcList.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex flex-col">
                <span className="font-black text-slate-800">{s.name}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{s.vehicles.length} Veículos</span>
              </div>
              <button onClick={() => startEditing(s)} className="p-3 bg-white shadow-sm text-indigo-600 rounded-xl border border-slate-100"><Edit2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-slate-100 rounded-2xl">
        <p className="text-[8px] font-black text-slate-400 uppercase text-center mb-2">Conexão Atual</p>
        <p className="text-[8px] font-mono text-slate-400 break-all text-center">{syncUrl || "Nenhuma URL configurada em constants.ts"}</p>
      </div>

      {editingSvc && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[90%] overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase">{isAddingNew ? 'Novo SVC' : 'Editar'}</h3>
              <button onClick={() => setEditingSvc(null)}><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <input type="text" value={editingSvc.name} onChange={e => setEditingSvc({...editingSvc, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-indigo-500" placeholder="Ex: SSP99" />
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Placas</span>
                  <button onClick={() => setEditingSvc({...editingSvc, vehicles: [...editingSvc.vehicles, {plate: '', category: 'Veículo Operacional'}]})} className="text-indigo-600 font-black text-[10px] uppercase">+ Adicionar</button>
                </div>
                {editingSvc.vehicles.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={v.plate} onChange={e => { const v2 = [...editingSvc.vehicles]; v2[i].plate = e.target.value.toUpperCase(); setEditingSvc({...editingSvc, vehicles: v2}) }} className="flex-1 p-3 bg-slate-50 rounded-xl font-mono font-bold" placeholder="ABC1D23" />
                    <button onClick={() => { const v2 = [...editingSvc.vehicles]; v2.splice(i, 1); setEditingSvc({...editingSvc, vehicles: v2}) }} className="p-3 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 bg-slate-50 flex gap-3">
               <button onClick={saveSvcChanges} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px]">Salvar Alteração Local</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
