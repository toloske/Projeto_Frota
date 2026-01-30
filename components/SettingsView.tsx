
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
  Link2,
  Zap,
  ShieldAlert,
  AlertCircle,
  Copy,
  Code,
  Check
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
  svcList, onUpdate, syncUrl 
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const urlInput = syncUrl;
  
  const [editingSvc, setEditingSvc] = useState<SVCConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const googleScriptCode = `// COPIE TUDO ABAIXO E COLE NO APPS SCRIPT
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Respostas") || ss.insertSheet("Respostas");
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Data Registro", "ID", "Data Op", "SVC", "Rodando", "Parados", "SPOT", "Ocorrencias"]);
  }

  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.type === 'report') {
      var d = payload.data;
      var spot = d.spotOffers;
      var totalSpot = (spot.bulkVan || 0) + (spot.bulkVuc || 0) + (spot.utilitarios || 0) + 
                      (spot.van || 0) + (spot.veiculoPasseio || 0) + (spot.vuc || 0);
      
      sheet.appendRow([
        new Date(), d.id, d.date, d.svc,
        d.fleetStatus.filter(function(v){return v.running}).length,
        d.fleetStatus.filter(function(v){return !v.running}).length,
        totalSpot, d.problems.description || ""
      ]);
    }
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Erro: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Ativo").setMimeType(ContentService.MimeType.TEXT);
}`;

  const testConnection = async () => {
    if (!urlInput || urlInput.includes("SUA_URL_DO_GOOGLE")) {
      return alert("Configure a URL no constants.ts primeiro.");
    }
    setIsTesting(true);
    try {
      await fetch(urlInput, { mode: 'no-cors' });
      alert("✅ Sinal disparado! Verifique sua planilha.");
    } catch (e) {
      alert("❌ Erro ao conectar.");
    } finally {
      setIsTesting(false);
    }
  };

  const publishConfigToCloud = async () => {
    if (!syncUrl || syncUrl.includes("SUA_URL_DO_GOOGLE")) return;
    setIsPublishing(true);
    try {
      await fetch(syncUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ type: 'config_update', data: svcList })
      });
      setPublishStatus('success');
      setTimeout(() => setPublishStatus('idle'), 3000);
    } catch (e) {
      setPublishStatus('error');
    } finally {
      setIsPublishing(false);
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

  const isUrlValid = syncUrl.startsWith('https://script.google.com/macros/s/') && syncUrl.endsWith('/exec');

  return (
    <div className="space-y-6 pb-32">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Conexão Sheets</h2>
          </div>
          {isUrlValid && <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full"><Check className="w-4 h-4" /></div>}
        </div>
        
        {!isUrlValid ? (
          <div className="p-5 bg-rose-50 rounded-2xl flex items-start gap-3 border border-rose-100">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-[10px] font-bold text-rose-600">Link inválido ou não configurado no constants.ts.</p>
          </div>
        ) : (
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 overflow-hidden">
            <p className="text-[10px] font-black text-indigo-800 uppercase">URL Ativa</p>
            <p className="text-[9px] text-indigo-400 truncate">{syncUrl}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={testConnection} disabled={isTesting} className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Testar Link
          </button>
          <button onClick={() => setShowScriptModal(true)} className="py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
            <Code className="w-4 h-4" /> Ver Código
          </button>
        </div>
      </div>

      <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl space-y-4">
        <h2 className="text-xl font-black uppercase">Frota na Nuvem</h2>
        <button onClick={publishConfigToCloud} disabled={isPublishing || !isUrlValid} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 transition-all ${publishStatus === 'success' ? 'bg-emerald-500' : 'bg-white text-indigo-600'}`}>
          {isPublishing ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Publicar Placas'}
        </button>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 uppercase">Gerenciar SVCs</h2>
          <button onClick={() => { setEditingSvc({ id: '', name: '', vehicles: [] }); setIsAddingNew(true); }} className="p-2 text-indigo-600 bg-indigo-50 rounded-xl"><PlusCircle className="w-6 h-6" /></button>
        </div>
        <div className="space-y-3">
          {svcList.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <span className="font-black text-slate-800">{s.name}</span>
              <button onClick={() => { setEditingSvc(JSON.parse(JSON.stringify(s))); setIsAddingNew(false); }} className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm"><Edit2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {showScriptModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90%]">
            <div className="p-8 border-b flex justify-between items-center">
              <h3 className="text-xl font-black uppercase">Passos para o Sheets</h3>
              <button onClick={() => setShowScriptModal(false)} className="p-2 bg-slate-100 rounded-xl"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="space-y-3 text-[11px] font-bold text-slate-600">
                <p>1. No Sheets: <b>Extensões &gt; Apps Script</b></p>
                <p>2. Cole o código abaixo e salve.</p>
                <p>3. <b>Implantar &gt; Nova Implantação &gt; App da Web</b>.</p>
                <p>4. Acesso: <b>Qualquer Pessoa</b>.</p>
              </div>
              <div className="relative">
                <pre className="bg-slate-900 text-indigo-300 p-6 rounded-3xl font-mono text-[9px] overflow-x-auto max-h-[200px]">
                  {googleScriptCode}
                </pre>
                <button onClick={() => { navigator.clipboard.writeText(googleScriptCode); alert("Copiado!"); }} className="absolute top-4 right-4 bg-indigo-600 text-white p-2 rounded-xl text-[10px] font-black">COPIAR</button>
              </div>
            </div>
            <div className="p-8 border-t">
              <button onClick={() => setShowScriptModal(false)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black">ENTENDI</button>
            </div>
          </div>
        </div>
      )}

      {editingSvc && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-xl font-black uppercase">Editar SVC</h3>
            <input type="text" value={editingSvc.name} onChange={e => setEditingSvc({...editingSvc, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none" />
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {editingSvc.vehicles.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={v.plate} onChange={e => { const v2 = [...editingSvc.vehicles]; v2[i].plate = e.target.value.toUpperCase(); setEditingSvc({...editingSvc, vehicles: v2}) }} className="flex-1 p-3 bg-slate-50 rounded-xl font-bold" />
                  <button onClick={() => { const v2 = [...editingSvc.vehicles]; v2.splice(i, 1); setEditingSvc({...editingSvc, vehicles: v2}) }} className="p-3 bg-rose-50 text-rose-500 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setEditingSvc({...editingSvc, vehicles: [...editingSvc.vehicles, {plate: '', category: 'Veículo'}]})} className="w-full py-3 border-2 border-dashed rounded-xl text-slate-400 font-black">+ Placa</button>
            <div className="flex gap-2">
              <button onClick={() => setEditingSvc(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black">CANCELAR</button>
              <button onClick={saveSvcChanges} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black">SALVAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
