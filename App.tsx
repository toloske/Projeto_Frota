
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormView } from './components/FormView';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsView } from './components/SettingsView';
import { FormData, SVCConfig } from './types';
import { DEFAULT_SVC_LIST } from './constants';
import { GoogleGenAI } from "@google/genai";
import { 
  ClipboardList, 
  LayoutDashboard, 
  Settings, 
  UserCircle, 
  Wifi, 
  WifiOff,
  X,
  CloudLightning,
  Sparkles
} from 'lucide-react';

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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const pollingRef = useRef<number | null>(null);

  const fetchCloudData = useCallback(async (silent = false) => {
    if (!syncUrl) return;
    if (!silent) setIsSyncing(true);
    
    try {
      const response = await fetch(syncUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha na rede');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSubmissions(data);
        setLastSync(new Date());
        localStorage.setItem('fleet_submissions', JSON.stringify(data));
      }
    } catch (e) {
      console.warn("Sincronização pendente ou erro de CORS:", e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [syncUrl]);

  useEffect(() => {
    const savedSubmissions = localStorage.getItem('fleet_submissions');
    if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));

    if (syncUrl) {
      fetchCloudData();
      pollingRef.current = window.setInterval(() => fetchCloudData(true), 60000);
    }
    
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [syncUrl, fetchCloudData]);

  useEffect(() => {
    const savedSvc = localStorage.getItem('fleet_svc_config');
    setSvcList(savedSvc ? JSON.parse(savedSvc) : DEFAULT_SVC_LIST);
    
    const savedRole = localStorage.getItem('user_role');
    if (savedRole === 'admin') setUserRole('admin');
  }, []);

  const handleAdminAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === '1234') { // Senha padrão, altere conforme necessário
      setUserRole('admin');
      localStorage.setItem('user_role', 'admin');
      setActiveTab('admin');
      setShowLoginModal(false);
      setPasswordInput('');
    } else {
      alert("Senha incorreta");
    }
  };

  const handleSaveSubmission = async (data: FormData) => {
    const updated = [data, ...submissions];
    setSubmissions(updated);
    localStorage.setItem('fleet_submissions', JSON.stringify(updated));

    if (syncUrl) {
      setIsSyncing(true);
      try {
        await fetch(syncUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        // Pequeno delay para o Google Script processar
        setTimeout(() => fetchCloudData(true), 3000);
        return true;
      } catch (e) {
        console.error("Erro no envio:", e);
        return false;
      } finally {
        setIsSyncing(false);
      }
    }
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-0 bg-[#F8FAFC] text-slate-900 font-inter">
      <header className="bg-slate-900 text-white p-5 shadow-xl sticky top-0 z-[60] rounded-b-[2rem]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-2xl transition-all ${isSyncing ? 'bg-indigo-500 animate-pulse' : 'bg-white/5 border border-white/10'}`}>
              {syncUrl ? (
                <Wifi className="w-5 h-5 text-emerald-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none uppercase">Frota Hub</h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-1">
                {isSyncing ? 'Sincronizando...' : lastSync ? `Nuvem OK: ${lastSync.toLocaleTimeString()}` : 'Modo Offline'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => userRole === 'admin' ? setActiveTab('admin') : setShowLoginModal(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg active:scale-95 ${
              userRole === 'admin' ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-white text-slate-900'
            }`}
          >
            <UserCircle className="w-4 h-4" /> {userRole === 'admin' ? 'PAINEL' : 'ADMIN'}
          </button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 max-w-4xl animate-in fade-in duration-700">
        {activeTab === 'form' && (
          <FormView 
            key={formKey} 
            onSave={handleSaveSubmission} 
            svcList={svcList} 
            onNewForm={() => setFormKey(k => k + 1)}
            isSyncing={isSyncing}
          />
        )}
        
        {userRole === 'admin' && (
          <>
            {activeTab === 'admin' && (
              <AdminDashboard 
                submissions={submissions} 
                onRefresh={() => fetchCloudData()}
                isSyncing={isSyncing}
                lastSync={lastSync}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                svcList={svcList} 
                onUpdate={(l) => { setSvcList(l); localStorage.setItem('fleet_svc_config', JSON.stringify(l)); }} 
                onClearData={() => { if(confirm('Excluir tudo?')) { setSubmissions([]); localStorage.removeItem('fleet_submissions'); }}}
                syncUrl={syncUrl}
                onUpdateSyncUrl={(url) => { setSyncUrl(url); localStorage.setItem('fleet_sync_url', url); fetchCloudData(); }}
                submissions={submissions}
                onImportData={(data) => { setSubmissions(data); localStorage.setItem('fleet_submissions', JSON.stringify(data)); }}
              />
            )}
          </>
        )}
      </main>

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-black text-slate-800">Acesso Restrito</h2>
              <button onClick={() => setShowLoginModal(false)}><X className="w-6 h-6 text-slate-300" /></button>
            </div>
            <form onSubmit={handleAdminAuth} className="space-y-6">
              <input 
                type="password"
                placeholder="Senha Administrativa"
                autoFocus
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 rounded-3xl text-center text-2xl font-black outline-none transition-all"
              />
              <button type="submit" className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-transform">Desbloquear Painel</button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-2xl border border-white/50 flex justify-around p-3 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] md:max-w-md md:mx-auto">
        <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1.5 flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${activeTab === 'form' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}>
          <ClipboardList className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase">Reportar</span>
        </button>
        {userRole === 'admin' && (
          <>
            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${activeTab === 'admin' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase">Painel</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 flex-1 py-3 rounded-[1.8rem] transition-all duration-300 ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}>
              <Settings className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase">Ajustes</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

export default App;
