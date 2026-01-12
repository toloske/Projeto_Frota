
import React, { useState } from 'react';
import { SVCConfig, FormData } from '../types';
import { 
  Cloud, 
  Database, 
  Download, 
  Trash2, 
  Smartphone,
  CheckCircle,
  Share2,
  MessageCircle,
  Link as LinkIcon,
  Truck,
  PlusCircle,
  Edit2,
  X,
  Save,
  Plus
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
  svcList, onUpdate, onClearData, syncUrl, onUpdateSyncUrl, submissions, onImportData 
}) => {
  const [newUrl, setNewUrl] = useState(syncUrl);
  const [copiedLink, setCopiedLink] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  
  // Estado para edição de SVC
  const [editingSvc, setEditingSvc] = useState<SVCConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleSaveUrl = () => {
    onUpdateSyncUrl(newUrl);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  const generateAccessLink = () => {
    if (!syncUrl) {
      alert("Defina primeiro o link de sincronia.");
      return;
    }
    const configBase64 = btoa(encodeURIComponent(syncUrl));
    const accessUrl = `${window.location.origin}${window.location.pathname}?config=${configBase64}`;
    navigator.clipboard.writeText(accessUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Funções de Gestão de SVC
  const startEditing = (svc: SVCConfig) => {
    setEditingSvc(JSON.parse(JSON.stringify(svc))); // Deep copy
    setIsAddingNew(false);
  };

  const startAdding = () => {
    setEditingSvc({
      id: '',
      name: '',
      vehicles: []
    });
    setIsAddingNew(true);
  };

  const addPlateToEditing = () => {
    if (!editingSvc) return;
    setEditingSvc({
      ...editingSvc,
      vehicles: [...editingSvc.vehicles, { plate: '', category: 'Veículo Operacional' }]
    });
  };

  const removePlateFromEditing = (index: number) => {
    if (!editingSvc) return;
    const newVehicles = [...editingSvc.vehicles];
    newVehicles.splice(index, 1);
    setEditingSvc({ ...editingSvc, vehicles: newVehicles });
  };

  const updatePlateInEditing = (index: number, plate: string) => {
    if (!editingSvc) return;
    const newVehicles = [...editingSvc.vehicles];
    newVehicles[index].plate = plate.toUpperCase();
    setEditingSvc({ ...editingSvc, vehicles: newVehicles });
  };

  const saveSvcChanges = () => {
    if (!editingSvc || !editingSvc.name) {
      alert("Preencha o nome do SVC.");
      return;
    }
    
    let newList = [...svcList];
    if (isAddingNew) {
      const newSvc = { ...editingSvc, id: editingSvc.name };
      newList.push(newSvc);
    } else {
      newList = newList.map(s => s.id === editingSvc.id ? editingSvc : s);
    }

    onUpdate(newList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    setEditingSvc(null);
  };

  const deleteSvc = (id: string) => {
    if (confirm("Deseja realmente excluir este SVC e todas as suas placas?")) {
      const newList = svcList.filter(s => s.id !== id);
      onUpdate(newList);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Configuração de Sincronia */}
      <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-indigo-300" />
            <h2 className="text-xl font-black uppercase tracking-tight">Sincronização</h2>
          </div>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="URL do Script"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full p-4 bg-white/10 border-2 border-white/20 rounded-2xl outline-none focus:border-white transition-all text-xs font-mono"
            />
            <button onClick={handleSaveUrl} className={`w-full py-4 font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest transition-all ${justSaved ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-900'}`}>
              {justSaved ? 'Salvo!' : 'Salvar URL'}
            </button>
          </div>
        </div>
      </div>

      {/* Acesso da Equipe */}
      <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Share2 className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Acesso Equipe</h2>
        </div>
        <button onClick={generateAccessLink} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all ${copiedLink ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-emerald-200 text-emerald-700 shadow-sm'}`}>
          {copiedLink ? <><CheckCircle className="w-5 h-5" /> Link Copiado!</> : <><LinkIcon className="w-5 h-5" /> Copiar Link de Acesso</>}
        </button>
      </div>

      {/* GERENCIAMENTO DE SVCS E PLACAS */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">SVCs e Placas</h2>
          </div>
          <button 
            onClick={startAdding}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          >
            <PlusCircle className="w-8 h-8" />
          </button>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {svcList.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="font-black text-slate-800 block">{s.name}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{s.vehicles.length} Veículos</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditing(s)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteSvc(s.id)} className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backup e Manutenção */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex gap-3">
          <button onClick={() => { const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(submissions)); const a = document.createElement('a'); a.href = data; a.download = "backup.json"; a.click(); }} className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <Download className="w-6 h-6 text-indigo-600" />
            <span className="text-[9px] font-black uppercase text-slate-700">Backup</span>
          </button>
          <button onClick={onClearData} className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-rose-50 rounded-3xl border border-rose-100">
            <Trash2 className="w-6 h-6 text-rose-500" />
            <span className="text-[9px] font-black uppercase text-rose-800">Resetar</span>
          </button>
      </div>

      {/* MODAL DE EDIÇÃO DE SVC */}
      {editingSvc && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90%] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {isAddingNew ? 'Novo SVC' : 'Editar SVC'}
              </h3>
              <button onClick={() => setEditingSvc(null)} className="p-2 text-slate-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do SVC</label>
                <input 
                  type="text" 
                  value={editingSvc.name}
                  onChange={(e) => setEditingSvc({...editingSvc, name: e.target.value.toUpperCase()})}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-black"
                  placeholder="EX: SSP40"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Placas vinculadas</label>
                  <button onClick={addPlateToEditing} className="flex items-center gap-1 text-indigo-600 font-black text-[10px] uppercase">
                    <Plus className="w-4 h-4" /> Adicionar Placa
                  </button>
                </div>
                
                <div className="space-y-2">
                  {editingSvc.vehicles.map((v, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        value={v.plate}
                        onChange={(e) => updatePlateInEditing(idx, e.target.value)}
                        className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-mono font-bold text-sm"
                        placeholder="ABC1D23"
                        maxLength={7}
                      />
                      <button onClick={() => removePlateFromEditing(idx)} className="p-3 text-rose-500 bg-rose-50 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editingSvc.vehicles.length === 0 && (
                    <p className="text-center py-4 text-slate-300 text-[10px] font-bold uppercase italic">Nenhuma placa adicionada</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
               <button onClick={() => setEditingSvc(null)} className="flex-1 py-4 font-black text-slate-400 uppercase text-[10px]">Cancelar</button>
               <button onClick={saveSvcChanges} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
                 <Save className="w-4 h-4" /> Salvar Alterações
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
