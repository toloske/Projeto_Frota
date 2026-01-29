
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
  Globe,
  DatabaseZap,
  Terminal,
  Eye,
  EyeOff,
  Link2
} from 'lucide-react';

interface Props {
  svcList: SVCConfig[];
  onUpdate: (newList: SVCConfig[]) => void;
  onClearData: () => void;
  syncUrl: string;
  onUpdateSyncUrl: (url: string) => void;
  submissions: FormData[];
  onImportData: (data: FormData[]) => void;
  lastRawResponse?: string;
}

export const SettingsView: React.FC<Props> = ({ 
  svcList, onUpdate, onClearData, syncUrl, onUpdateSyncUrl, lastRawResponse 
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showDebug, setShowDebug] = useState(false);
  const [urlInput, setUrlInput] = useState(syncUrl);
  
  const [editingSvc, setEditingSvc] = useState<SVCConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleSaveUrl = () => {
    onUpdateSyncUrl(urlInput);
    alert("URL salva com sucesso!");
  };

  const publishConfigToCloud = async () => {
    if (!syncUrl || !syncUrl.startsWith('http')) {
      alert("Link do Google Script não configurado.");
      return;
    }

    setIsPublishing(true);
    setPublishStatus('idle');

    try {
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
      setPublishStatus('error');
    } finally {
      setIsPublishing(false);
    }
  };

  const clearConfigCache = () => {
    if (confirm('Resetar placas para o padrão de fábrica?')) {
      localStorage.removeItem('fleet_svc_config');
      localStorage.removeItem('fleet_config_source');
      window.location.reload();
    }
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
      {/* SEÇÃO DA URL DO SERVIDOR */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Link2 className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Servidor Operacional</h2>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Insira o link do seu Google Apps Script para sincronização global.</p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={urlInput} 
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border-2 border-transparent focus:border-indigo-500"
            placeholder="https://script.google.com/macros/s/..."
          />
          <button 
            onClick={handleSaveUrl}
            className="px-6 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] active:scale-95 transition-all"
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-indigo-200" />
            <h2 className="text-xl font-black uppercase tracking-tight">Gestão Global</h2>
          </div>
          <button onClick={() => setShowDebug(!showDebug)} className="p-2 bg-white/10 rounded-xl">
            {showDebug ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        {showDebug && (
          <div className="bg-slate-900/50 p-4 rounded-2xl font-mono text-[8px] text-indigo-200 overflow-x-auto border border-white/10 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
              <Terminal className="w-3 h-3" />
              <span>DEBUG: Resposta Bruta do Servidor</span>
            </div>
            <pre className="whitespace-pre-wrap">
              {lastRawResponse ? (
                lastRawResponse.includes('"config":') 
                  ? "✓ Chave 'config' encontrada no JSON" 
                  : "⚠ Chave 'config' NÃO encontrada no JSON!"
              ) : "Nenhum dado recebido ainda."}
              {"\n\n"}
              {lastRawResponse || "Aguardando sincronização..."}
            </pre>
          </div>
        )}

        <button 
          onClick={publishConfigToCloud}
          disabled={isPublishing}
          className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all ${publishStatus === 'success' ? 'bg-emerald-500 text-white' : (publishStatus === 'error' ? 'bg-rose-500 text-white' : 'bg-white text-indigo-600 shadow-lg active:scale-95')}`}
        >
          {isPublishing ? <RefreshCw className="w-5 h-5 animate-spin" /> : publishStatus === 'success' ? <><CheckCircle className="w-5 h-5" /> Publicado!</> : <><CloudUpload className="w-5 h-5" /> Publicar para Celulares</>}
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Placas e SVCs</h2>
          </div>
          <button onClick={() => { setEditingSvc({ id: '', name: '', vehicles: [] }); setIsAddingNew(true); }} className="p-2 text-indigo-600"><PlusCircle className="w-8 h-8" /></button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {svcList.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex flex-col">
                <span className="font-black text-slate-800">{s.name}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{s.vehicles.length} Veículos</span>
              </div>
              <button onClick={() => { setEditingSvc(JSON.parse(JSON.stringify(s))); setIsAddingNew(false); }} className="p-3 bg-white shadow-sm text-indigo-600 rounded-xl border border-slate-100"><Edit2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={clearConfigCache} className="w-full py-4 bg-slate-200 text-slate-500 rounded-2xl font-black uppercase text-[9px] flex items-center justify-center gap-2"><DatabaseZap className="w-4 h-4" /> Resetar para Lista Padrão</button>

      {editingSvc && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[90%] overflow-hidden shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase">{isAddingNew ? 'Novo SVC' : 'Editar'}</h3>
              <button onClick={() => setEditingSvc(null)} className="p-2 bg-white rounded-xl"><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Nome do SVC</label>
                <input type="text" value={editingSvc.name} onChange={e => setEditingSvc({...editingSvc, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-indigo-500 outline-none" placeholder="Ex: SSP99" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Lista de Placas</span>
                  <button onClick={() => setEditingSvc({...editingSvc, vehicles: [...editingSvc.vehicles, {plate: '', category: 'Veículo Operacional'}]})} className="text-indigo-600 font-black text-[10px] uppercase bg-indigo-50 px-3 py-1.5 rounded-lg">+ Placa</button>
                </div>
                {editingSvc.vehicles.map((v, i) => (
                  <div key={i} className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                    <input type="text" value={v.plate} onChange={e => { const v2 = [...editingSvc.vehicles]; v2[i].plate = e.target.value.toUpperCase(); setEditingSvc({...editingSvc, vehicles: v2}) }} className="flex-1 p-4 bg-slate-50 rounded-xl font-mono font-bold border-2 border-transparent focus:border-indigo-200 outline-none" placeholder="ABC1D23" />
                    <button onClick={() => { const v2 = [...editingSvc.vehicles]; v2.splice(i, 1); setEditingSvc({...editingSvc, vehicles: v2}) }} className="p-4 bg-rose-50 text-rose-500 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 bg-white border-t">
               <button onClick={saveSvcChanges} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] shadow-lg shadow-indigo-200 active:scale-95 transition-all">Salvar Localmente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
