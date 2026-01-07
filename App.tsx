
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
  UserCircle, 
  Wifi, 
  WifiOff,
  X,
  CloudLightning,
  Lock,
  // Fix: Added ShieldCheck to imports as it was missing but used on line 216
  ShieldCheck
} from 'lucide-react';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<'standard' | 'admin'>('standard');
  const [activeTab, setActiveTab] = useState<'form' | 'admin' | 'settings'>('form');
  const [submissions, setSubmissions] = useState<FormData[]>([]);
  const [svcList, setSvcList] = useState<SVCConfig[]>([]);
  const [formKey, setFormKey] = useState(0);
  
  // A URL agora é prioritariamente buscada do ambiente (Vercel) ou do localStorage para o admin
  // Fix: Cast import.meta to any to resolve property 'env' does not exist error in TypeScript
  const [syncUrl, setSyncUrl] = useState<string>(
    ((import.meta as any).env?.VITE_SYNC_URL as string) || localStorage.getItem('fleet_sync_url') || ''
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
      // Usando cache: 'no-store' para garantir dados frescos no dashboard
      const response = await fetch(syncUrl, { cache: 'no-store' });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // Formata os dados vindos do Google Sheets se necessário
        setSubmissions(data);
        setLastSync(new Date());
        localStorage.setItem('fleet_submissions', JSON.stringify(data));
      }
    } catch (e) {
      console.warn("Sync background:", e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [syncUrl]);

  useEffect(() => {
    // Carrega dados locais imediatamente para funcionamento offline
    const saved = localStorage.getItem('fleet_submissions');
    if (saved) setSubmissions(JSON.parse(saved));

    if (syncUrl) {
      fetchCloudData();
      pollingRef.current = window.setInterval(() => fetchCloudData(true), 30000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [syncUrl, fetchCloudData]);

  useEffect(() => {
    const savedSvc = localStorage.getItem('fleet_svc_config');
    setSvcList(savedSvc ? JSON.parse(savedSvc) : DEFAULT_SVC_LIST);
  }, []);

  const handleAdminAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Senha simples para sua gestão, pode ser alterada aqui
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
    // 1. Salva localmente primeiro (Segurança)
    const updated = [data, ...submissions];
    setSubmissions(updated);
    localStorage.setItem('fleet_submissions', JSON.stringify(updated));

    // 2. Tenta enviar para o banco de dados central
    if (syncUrl) {
      setIsSyncing(true);
      try {
        await fetch(syncUrl, {
          method: 'POST',
          mode: 'no-cors', // Essencial para Google Apps Script
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        setTimeout(() => fetchCloudData(true), 2000);
        return true;
      } catch (e) {
        console.error("Erro ao enviar para nuvem:", e);
        return false;
      } finally {
        setIsSyncing(false);
      }
    } else {
      console.warn("App funcionando em modo local. URL de sincronia não configurada.");
      return true;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-inter">
      {/* Header Minimalista para Colaborador */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${syncUrl ? 'bg-indigo-600' : 'bg-slate-200'}`}>
              <CloudLightning className={`w-5 h-5 ${syncUrl ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight leading-none">Frota Digital</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                {syncUrl ? 'Conectado ao Banco Central' : 'Modo Offline Ativo'}
              </p>
            </div>
          </div>
          
          {userRole === 'standard' ? (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="p-2 text-slate-300 hover:text-slate-600 transition-colors"
              title="Acesso Gestão"
            >
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
              />
            )}
            {activeTab === 'settings' && (
              <SettingsView 
                svcList={svcList} 
                onUpdate={(l) => { setSvcList(l); localStorage.setItem('fleet_svc_config', JSON.stringify(l)); }} 
                onClearData={() => { if(confirm('Limpar banco de dados local?')) { setSubmissions([]); localStorage.removeItem('fleet_submissions'); }}}
                syncUrl={syncUrl}
                onUpdateSyncUrl={(url) => { setSyncUrl(url); localStorage.setItem('fleet_sync_url', url); fetchCloudData(); }}
                submissions={submissions}
                onImportData={(data) => { setSubmissions(data); localStorage.setItem('fleet_submissions', JSON.stringify(data)); }}
              />
            )}
          </div>
        )}
      </main>

      {/* Menu Inferior apenas para Admin */}
      {userRole === 'admin' && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2.5rem] flex justify-around p-2 z-[60]">
          <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-[2rem] transition-all ${activeTab === 'form' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            <ClipboardList className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase">Form</span>
          </button>
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-[2rem] transition-all ${activeTab === 'admin' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase">Painel</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-[2rem] transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            <Settings className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase">Setup</span>
          </button>
        </nav>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" /> Acesso Gestão
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
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
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
