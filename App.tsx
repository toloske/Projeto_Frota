
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormView } from './components/FormView';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsView } from './components/SettingsView';
import { FormData, SVCConfig } from './types';
import { DEFAULT_SVC_LIST } from './constants';
import { 
  ClipboardList, 
  LayoutDashboard, 
  Settings, 
  CloudLightning,
  Lock,
  ShieldCheck,
  WifiOff,
  AlertTriangle
} from 'lucide-react';

// Função auxiliar para data YYYY-MM-DD local
const getLocalDate = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<'standard' | 'admin'>('standard');
  const [activeTab, setActiveTab] = useState<'form' | 'admin' | 'settings'>('form');
  const [submissions, setSubmissions] = useState<FormData[]>([]);
  const [svcList, setSvcList] = useState<SVCConfig[]>([]);
  const [formKey, setFormKey] = useState(0);
  
  const [syncUrl, setSyncUrl] = useState<string>(
    localStorage.getItem('fleet_sync_url') || ''
  );
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const pollingRef = useRef<number | null>(null);

  const mergeSubmissions = (local: FormData[], remote: FormData[]) => {
    const map = new Map<string, FormData>();
    // Remotos são a base
    remote.forEach(s => map.set(s.id, s));
    // Preserva locais que ainda não estão no remoto
    local.forEach(s => {
      if (!map.has(s.id)) {
        map.set(s.id, s);
      }
    });
    return Array.from(map.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const fetchCloudData = useCallback(async (silent = false) => {
    if (!syncUrl) return;
    if (!silent) setIsSyncing(true);
    setSyncError(false);
    
    try {
      const response = await fetch(syncUrl, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error("Servidor offline");
      const remoteData = await response.json();
      
      if (Array.isArray(remoteData)) {
        setSubmissions(currentLocal => {
          const merged = mergeSubmissions(currentLocal, remoteData);
          localStorage.setItem('fleet_submissions', JSON.stringify(merged));
          return merged;
        });
        setLastSync(new Date());
      }
    } catch (e) {
      console.warn("Falha na sincronia:", e);
      setSyncError(true);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [syncUrl]);

  useEffect(() => {
    const saved = localStorage.getItem('fleet_submissions');
    if (saved) setSubmissions(JSON.parse(saved));

    const savedSvc = localStorage.getItem('fleet_svc_config');
    setSvcList(savedSvc ? JSON.parse(savedSvc) : DEFAULT_SVC_LIST);

    if (syncUrl) {
      fetchCloudData();
      pollingRef.current = window.setInterval(() => fetchCloudData(true), 20000); // 20s
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [syncUrl, fetchCloudData]);

  const handleAdminAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === 'admin2024') {
      setUserRole('admin');
      setActiveTab('admin');
      setShowLoginModal(false);
      setPasswordInput('');
    } else {
      alert("Acesso negado.");
    }
  };

  const handleSaveSubmission = async (data: FormData) => {
    // 1. Salva localmente IMEDIATAMENTE
    setSubmissions(prev => {
      const updated = [data, ...prev];
      localStorage.setItem('fleet_submissions', JSON.stringify(updated));
      return updated;
    });

    // 2. Tenta enviar para a nuvem
    if (syncUrl) {
      setIsSyncing(true);
      try {
        await fetch(syncUrl, {
          method: 'POST',
          mode: 'no-cors', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        // Agenda uma atualização forçada em 5s para confirmar recebimento
        setTimeout(() => fetchCloudData(true), 5000);
      } catch (e) {
        console.error("Erro no envio:", e);
        setSyncError(true);
      } finally {
        setIsSyncing(false);
      }
    }
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-inter">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${syncUrl ? (syncError ? 'bg-rose-500' : 'bg-indigo-600') : 'bg-slate-200'}`}>
              {syncError ? (
                <AlertTriangle className="w-5 h-5 text-white" />
              ) : (
                <CloudLightning className={`w-5 h-5 ${syncUrl ? 'text-white' : 'text-slate-400'}`} />
              )}
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight leading-none">Frota Digital</h1>
              <div className="flex items-center gap-1.5 mt-1">
                {!syncUrl ? (
                  <div className="flex items-center gap-1 text-rose-500">
                    <WifiOff className="w-2.5 h-2.5" />
                    <span className="text-[8px] font-bold uppercase">Sem Nuvem</span>
                  </div>
                ) : (
                  <span className={`text-[8px] font-bold uppercase ${syncError ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {syncError ? 'Erro de Conexão' : 'Operando Online'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {userRole === 'standard' ? (
            <button onClick={() => setShowLoginModal(true)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
              <Lock className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-indigo-600 uppercase">Gestor</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 max-w-2xl pb-32">
        {activeTab === 'form' && (
          <FormView 
            key={formKey} 
            onSave={handleSaveSubmission} 
            svcList={svcList} 
            onNewForm={() => {
              setFormKey(k => k + 1);
              window.scrollTo(0,0);
            }}
            isSyncing={isSyncing}
          />
        )}
        
        {userRole === 'admin' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'admin' && (
              <AdminDashboard 
                submissions={submissions} 
                onRefresh={() => fetchCloudData()}
                isSyncing={isSyncing}
                lastSync={lastSync}
                svcList={svcList}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                svcList={svcList} 
                onUpdate={(l) => { setSvcList(l); localStorage.setItem('fleet_svc_config', JSON.stringify(l)); }} 
                onClearData={() => { if(confirm('Resetar banco local?')) { setSubmissions([]); localStorage.removeItem('fleet_submissions'); }}}
                syncUrl={syncUrl}
                onUpdateSyncUrl={(url) => { setSyncUrl(url); localStorage.setItem('fleet_sync_url', url); fetchCloudData(); }}
                submissions={submissions}
                onImportData={(data) => { setSubmissions(data); localStorage.setItem('fleet_submissions', JSON.stringify(data)); }}
              />
            )}
          </div>
        )}
      </main>

      {userRole === 'admin' && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2.5rem] flex justify-around p-2 z-[60]">
          <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-[2rem] transition-all ${activeTab === 'form' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            <ClipboardList className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase">Novo</span>
          </button>
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-[2rem] transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase">Relatórios</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-[2rem] transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            <Settings className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase">Ajustes</span>
          </button>
        </nav>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" /> Painel Gestor
            </h2>
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <input 
                type="password"
                placeholder="Senha administrativa"
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-center"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Voltar</button>
                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] shadow-lg shadow-indigo-200">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
