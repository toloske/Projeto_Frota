
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
  svcList, onUpdate, onClearData, syncUrl, onUpdateSyncUrl 
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [urlInput, setUrlInput] = useState(syncUrl);
  
  const [editingSvc, setEditingSvc] = useState<SVCConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // ESTE É O CÓDIGO QUE DEVE SER COLADO NO GOOGLE APPS SCRIPT
  const googleScriptCode = `// --- CÓDIGO PARA O GOOGLE APPS SCRIPT ---
// 1. Abra sua Planilha
// 2. Extensões > Apps Script
// 3. Cole este código e salve
// 4. Implantar > Nova Implantação > App da Web > Quem tem acesso: QUALQUER PESSOA

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Respostas") || ss.insertSheet("Respostas");
  
  // Cria cabeçalhos se a planilha estiver vazia
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Data Registro", "ID Reporte", "Data Operacao", "SVC", 
      "Rodando", "Parados", "SPOT Total", 
      "SPOT Detalhes", "Ocorrencias", "Link Aceite"
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#f3f4f6");
  }

  try {
    var payload = JSON.parse(e.postData.contents);
    
    if (payload.type === 'report') {
      var d = payload.data;
      var spot = d.spotOffers;
      var totalSpot = (spot.bulkVan || 0) + (spot.bulkVuc || 0) + (spot.utilitarios || 0) + 
                      (spot.van || 0) + (spot.veiculoPasseio || 0) + (spot.vuc || 0);
      
      var row = [
        new Date(),
        d.id,
        d.date,
        d.svc,
        d.fleetStatus.filter(function(v){return v.running}).length,
        d.fleetStatus.filter(function(v){return !v.running}).length,
        totalSpot,
        JSON.stringify(spot),
        d.problems.description || "Nenhuma",
        d.weeklyAcceptance ? "Possui imagem" : "Não enviado"
      ];
      
      sheet.appendRow(row);
      return ContentService.createTextOutput("Sucesso").setMimeType(ContentService.MimeType.TEXT);
    }

    if (payload.type === 'config_update') {
      var configSheet = ss.getSheetByName("Configuracao") || ss.insertSheet("Configuracao");
      configSheet.clear();
      configSheet.getRange(1, 1).setValue(JSON.stringify(payload.data));
      return ContentService.createTextOutput("Config Atualizada").setMimeType(ContentService.MimeType.TEXT);
    }
    
  } catch (err) {
    return ContentService.createTextOutput("Erro: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  if (e.parameter.action === 'ping') return ContentService.createTextOutput("PONG");
  return ContentService.createTextOutput("Servidor Ativo").setMimeType(ContentService.MimeType.TEXT);
}`;

  const testConnection = async () => {
    if (!urlInput || urlInput.includes("SUA_URL_DO_GOOGLE")) {
      return alert("ERRO: Cole a URL da sua planilha no arquivo constants.ts antes de testar.");
    }

    setIsTesting(true);
    try {
      // Usamos no-cors pois o Google Script redireciona e o navegador bloqueia a leitura do 'PONG'
      // Mas se o fetch não cair no 'catch', significa que o servidor respondeu (mesmo que opacamente)
      await fetch(`${urlInput}${urlInput.includes('?') ? '&' : '?'}action=ping`, {
        mode: 'no-cors'
      });
      alert("✅ COMUNICAÇÃO DISPARADA!\n\nO sinal foi enviado com sucesso. Se os dados não aparecerem na planilha, certifique-se de que colou o código do botão 'Ver Código Google' na planilha e implantou como 'Qualquer pessoa'.");
    } catch (e) {
      alert("❌ ERRO DE REDE:\n\nVerifique se o link está correto ou se você tem conexão com a internet.");
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
      {/* STATUS DO SERVIDOR */}
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
            <div>
              <p className="text-[10px] font-black text-rose-800 uppercase mb-1">Atenção ao Link</p>
              <p className="text-[10px] font-bold text-rose-600 leading-tight">O link deve começar com <span className="underline">https://script.google.com...</span> e terminar com <span className="underline">/exec</span>.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-indigo-50 rounded-2xl flex items-start gap-3 border border-indigo-100">
            <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-indigo-800 uppercase">Servidor Configurado</p>
              <p className="text-[9px] font-bold text-indigo-400 truncate">{syncUrl}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={testConnection}
            disabled={isTesting}
            className="py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Testar Sinal
          </button>
          <button 
            onClick={() => setShowScriptModal(true)}
            className="py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Code className="w-4 h-4" />
            Ver Código Google
          </button>
        </div>
      </div>

      {/* SINCRONIZAÇÃO DA FROTA */}
      <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-indigo-200" />
          <h2 className="text-xl font-black uppercase tracking-tight">Frota na Nuvem</h2>
        </div>
        <p className="text-[10px] font-medium text-indigo-100 opacity-80 leading-relaxed">
          Se você alterou as placas abaixo, clique aqui para enviar a nova lista para os celulares de toda a equipe.
        </p>
        <button 
          onClick={publishConfigToCloud}
          disabled={isPublishing || !isUrlValid}
          className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all ${publishStatus === 'success' ? 'bg-emerald-500 text-white' : (publishStatus === 'error' ? 'bg-rose-500 text-white' : 'bg-white text-indigo-600 shadow-lg active:scale-95 disabled:opacity-50')}`}
        >
          {isPublishing ? <RefreshCw className="w-5 h-5 animate-spin" /> : publishStatus === 'success' ? <><CheckCircle className="w-5 h-5" /> Enviado!</> : <><CloudUpload className="w-5 h-5" /> Publicar Placas</>}
        </button>
      </div>

      {/* LISTA DE PLACAS LOCAIS */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gerenciar SVCs</h2>
          </div>
          <button onClick={() => { setEditingSvc({ id: '', name: '', vehicles: [] }); setIsAddingNew(true); }} className="p-2 text-indigo-600 bg-indigo-50 rounded-xl"><PlusCircle className="w-8 h-8" /></button>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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

      {/* MODAL DO SCRIPT */}
      {showScriptModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90%] overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase">Ativar Planilha</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Siga rigorosamente estes passos</p>
              </div>
              <button onClick={() => setShowScriptModal(false)} className="p-2 bg-white rounded-xl shadow-sm"><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black mb-2">1</span>
                  <p className="text-[11px] font-bold text-slate-600">No Google Sheets, vá em <b>Extensões > Apps Script</b>.</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black mb-2">2</span>
                  <p className="text-[11px] font-bold text-slate-600">Apague tudo e cole o código abaixo.</p>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-indigo-300 p-6 rounded-3xl font-mono text-[9px] overflow-x-auto border-2 border-indigo-500/20 max-h-[250px]">
                  {googleScriptCode}
                </pre>
                <button 
                  onClick={() => { navigator.clipboard.writeText(googleScriptCode); alert("Código copiado!"); }}
                  className="absolute top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg active:scale-90 transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
              </div>

              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-3">
                <p className="text-xs font-black text-amber-800 uppercase">Passo Final Crucial:</p>
                <ul className="text-[11px] font-bold text-amber-900 list-disc pl-4 space-y-1">
                  <li>Clique em <b>Implantar > Nova Implantação</b>.</li>
                  <li>Selecione <b>App da Web</b>.</li>
                  <li>Em "Quem tem acesso", escolha <b>QUALQUER PESSOA</b>.</li>
                  <li>Copie o link final e cole no arquivo <code className="bg-amber-100 px-1">constants.ts</code>.</li>
                </ul>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t">
              <button onClick={() => setShowScriptModal(false)} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-100">Já configurei!</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE SVC (Simplificado) */}
      {editingSvc && (
        <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[90%] overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 uppercase">{isAddingNew ? 'Novo SVC' : 'Editar'}</h3>
              <button onClick={() => setEditingSvc(null)} className="p-2 bg-white rounded-xl"><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <input type="text" value={editingSvc.name} onChange={e => setEditingSvc({...editingSvc, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 rounded-2xl font-black border-2 border-transparent focus:border-indigo-500 outline-none" placeholder="NOME DO SVC (EX: SSP9)" />
              <div className="space-y-3">
                <button onClick={() => setEditingSvc({...editingSvc, vehicles: [...editingSvc.vehicles, {plate: '', category: 'Veículo Operacional'}]})} className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase text-[10px] rounded-xl">+ Adicionar Placa</button>
                {editingSvc.vehicles.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={v.plate} onChange={e => { const v2 = [...editingSvc.vehicles]; v2[i].plate = e.target.value.toUpperCase(); setEditingSvc({...editingSvc, vehicles: v2}) }} className="flex-1 p-3 bg-slate-50 rounded-xl font-mono font-bold outline-none" placeholder="PLACA" />
                    <button onClick={() => { const v2 = [...editingSvc.vehicles]; v2.splice(i, 1); setEditingSvc({...editingSvc, vehicles: v2}) }} className="p-3 bg-rose-50 text-rose-500 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 border-t">
               <button onClick={saveSvcChanges} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs">Salvar Localmente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
