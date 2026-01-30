
import React, { useState, useEffect, useCallback } from 'react';
import { FormView } from './components/FormView';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsView } from './components/SettingsView';
import { FormData, SVCConfig } from './types';
import { DEFAULT_SVC_LIST, NATIVE_SHEET_URL } from './constants';
import * as db from './db';
import { 
  ClipboardList, 
  LayoutDashboard, 
  Settings, 
  Lock,
  ShieldCheck,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2
} from 'lucide-react';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<'standard' | 'admin'>('standard');
  const [activeTab, setActiveTab] = useState<'form' | 'admin' | 'settings'>('form');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [svcList, setSvcList] = useState<SVCConfig[]>([]);
  const [formKey, setFormKey] = useState(0);
  
  const [syncUrl, setSyncUrl] = useState<string>(() => {
    const saved = localStorage.getItem('fleet_sync_url');
    if (NATIVE_SHEET_URL && NATIVE_SHEET_URL.startsWith('http') && !NATIVE_SHEET_URL.includes("SUA_URL")) return NATIVE_SHEET_URL;
    return saved || "";
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const refreshLocalData = useCallback(async () => {
    const subs = await db.getAllSubmissions();
    setSubmissions(subs);
    setPendingCount(subs.filter(s => s.syncStatus === 'pending').length);
    const savedSvc = localStorage.getItem('fleet_svc_config');
    setSvcList(savedSvc ? JSON.parse(savedSvc) : DEFAULT_SVC_LIST);
  }, []);

  useEffect(() => {
    refreshLocalData();
  }, [formKey, refreshLocalData]);

  const syncQueue = useCallback(async () => {
    if (!syncUrl || syncUrl.length < 30 || isSyncing || syncUrl.includes("SUA_URL")) return;
    
    const pending = await db.getPendingSubmissions();
    if (pending.length === 0) {
      setPendingCount(0);
      setSyncError(false);
      return;
    }

    setIsSyncing(true);
    setSyncError(false);

    for (const item of pending) {
      try {
        // Para Google Script no-cors, NÃO envie Content-Type: application/json
        // Envie como texto puro para evitar pre-flight OPTIONS que o Google bloqueia
        await fetch(syncUrl, {
          method: 'POST',
          mode: 'no-cors',
          cache: 'no-cache',
          body: JSON.stringify({ type: 'report', data: item })
        });
        
        await db.markAsSynced(item.id);
      } catch (e) {
        setSyncError(true);
        break; 
      }
    }

    await refreshLocalData();
    setIsSyncing(false);
  }, [syncUrl, isSyncing, refreshLocalData]);

  useEffect(() => {
    const interval = setInterval(syncQueue, 30000);
    return () => clearInterval(interval);
  }, [syncQueue]);

  const handleSaveSubmission = async (data: FormData) => {
    await db.saveSubmission(data);
    await refreshLocalData();
    setTimeout(syncQueue, 500); 
    return true;
  };

  const handleUpdateSyncUrl = (url: string) => {
    setSyncUrl(url);
    localStorage.setItem('fleet_sync_url', url);
  };

  const isConfigured = syncUrl && syncUrl.length > 30 && !syncUrl.includes("SUA_URL");

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-inter">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div onClick={syncQueue} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${isSyncing ? 'bg-indigo-600 animate-pulse' : (syncError ? 'bg-rose-500' : (!isConfigured ? 'bg-slate-100' : 'bg-slate-100'))}`}>
              {isSyncing ? <RefreshCw className="w-5 h-5 text-white animate-spin" /> : (syncError ? <WifiOff className="w-5 h-5 text-white" /> : <Wifi className={`w-5 h-5 ${pendingCount > 0 ? 'text-amber-500' : 'text-slate-300'}`} />)}
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight leading-none">Frota Hub</h1>
              <span className={`text-[9px] font-black uppercase ${isConfigured ? 'text-emerald-500' : 'text-slate-300'}`}>{isConfigured ? 'Servidor Ativo' : 'Offline'}</span>
            </div>
          </div>
          
          {userRole === 'standard' ? (
            <button onClick={() => setShowLoginModal(true)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 active:scale-95"><Lock className="w-5 h-5" /></button>
          ) : (
            <div className="bg-indigo-600 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-100">
              <ShieldCheck className="w-3 h-3 text-white" />
              <span className="text-[10px] font-black text-white uppercase">Gestor</span>
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
            configSource={isConfigured ? 'cloud' : 'default'}
            onNewForm={() => setFormKey(k => k + 1)}
          />
        )}
        
        {userRole === 'admin' && (
          <div className="animate-in fade-in duration-300">
            {activeTab === 'admin' && (
              <AdminDashboard 
                submissions={submissions} 
                onRefresh={() => { syncQueue(); refreshLocalData(); }}
                isSyncing={isSyncing}
                lastSync={new Date()}
                svcList={svcList}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                svcList={svcList} 
                onUpdate={(l) => { setSvcList(l); localStorage.setItem('fleet_svc_config', JSON.stringify(l)); }} 
                onClearData={() => {}}
                syncUrl={syncUrl}
                onUpdateSyncUrl={handleUpdateSyncUrl} 
                submissions={submissions}
                onImportData={() => {}}
              />
            )}
          </div>
        )}
      </main>

      {userRole === 'admin' && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white border border-slate-200 shadow-2xl rounded-[2.5rem] flex justify-around p-1.5 z-[60]">
          <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 flex-1 py-4 rounded-[2rem] transition-all ${activeTab === 'form' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <ClipboardList className="w-5 h-5" />
          </button>
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 flex-1 py-4 rounded-[2rem] transition-all ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 flex-1 py-4 rounded-[2rem] transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </nav>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-center">
            <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Acesso Gestor</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === '1234') { setUserRole('admin'); setShowLoginModal(false); setPasswordInput(''); }
              else { alert('Senha incorreta!'); }
            }} className="space-y-4">
              <input type="password" placeholder="SENHA" autoFocus value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-black text-center text-lg tracking-widest" />
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[12px]">Entrar</button>
              <button type="button" onClick={() => setShowLoginModal(false)} className="w-full text-[10px] font-black text-slate-300 uppercase py-2">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
