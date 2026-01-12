
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormView } from './components/FormView';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsView } from './components/SettingsView';
import { FormData, SVCConfig } from './types';
import { DEFAULT_SVC_LIST, GLOBAL_SYNC_URL } from './constants';
import { 
  ClipboardList, 
  LayoutDashboard, 
  Settings, 
  CloudLightning,
  Lock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<'standard' | 'admin'>('standard');
  const [activeTab, setActiveTab] = useState<'form' | 'admin' | 'settings'>('form');
  const [submissions, setSubmissions] = useState<FormData[]>([]);
  const [svcList, setSvcList] = useState<SVCConfig[]>([]);
  const [configSource, setConfigSource] = useState<'default' | 'cloud'>('default');
  const [lastRawResponse, setLastRawResponse] = useState<string>('');
  const [formKey, setFormKey] = useState(0);
  
  const syncUrl = GLOBAL_SYNC_URL.trim();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  const pollingRef = useRef<number | null>(null);

  const fetchCloudData = useCallback(async (silent = false) => {
    if (!syncUrl || !syncUrl.startsWith('http')) return;

    if (!silent) setIsSyncing(true);
    
    try {
      const response = await fetch(`${syncUrl}?action=get_all&t=${Date.now()}`, { 
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      });
      
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      
      const jsonText = await response.text();
      setLastRawResponse(jsonText);
      
      let data;
      try {
        data = JSON.parse(jsonText);
      } catch (e) {
        throw new Error("Resposta do servidor inválida");
      }
      
      // Caso 1: Estrutura correta { submissions, config }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Atualizar Relatórios
        if (data.submissions && Array.isArray(data.submissions)) {
          setSubmissions(currentLocal => {
            const map = new Map();
            // Primeiro coloca os da nuvem
            data.submissions.forEach((s: any) => map.set(s.id, s));
            // Depois mescla com locais que ainda não subiram (opcional)
            currentLocal.forEach(s => { if (!map.has(s.id)) map.set(s.id, s); });
            
            const merged = Array.from(map.values()).sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            localStorage.setItem('fleet_submissions', JSON.stringify(merged));
            return merged;
          });
        }

        // Atualizar Configuração (Placas)
        if (data.config && Array.isArray(data.config) && data.config.length > 0) {
          setSvcList(data.config);
          setConfigSource('cloud');
          localStorage.setItem('fleet_svc_config', JSON.stringify(data.config));
          localStorage.setItem('fleet_config_source', 'cloud');
        }
      } 
      // Caso 2: Fallback se o script estiver mandando apenas o array de relatórios
      else if (Array.isArray(data)) {
        setSubmissions(data);
        localStorage.setItem('fleet_submissions', JSON.stringify(data));
      }
      
      setLastSync(new Date());
      setSyncError(false);
    } catch (e) {
      if (!silent) setSyncError(true);
      console.error("Erro na sincronização:", e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [syncUrl]);

  useEffect(() => {
    // Carregar do cache inicial
    const savedSubmissions = localStorage.getItem('fleet_submissions');
    if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));

    const savedSvc = localStorage.getItem('fleet_svc_config');
    const savedSource = localStorage.getItem('fleet_config_source');
    
    if (savedSvc) {
      setSvcList(JSON.parse(savedSvc));
      setConfigSource((savedSource as any) || 'cloud');
    } else {
      setSvcList(DEFAULT_SVC_LIST);
      setConfigSource('default');
    }

    // Sincronização inicial e periódica
    if (syncUrl) {
      fetchCloudData();
      pollingRef.current = window.setInterval(() => fetchCloudData(true), 30000); // 30 segundos
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [syncUrl, fetchCloudData]);

  const handleSaveSubmission = async (data: FormData) => {
    // Atualiza local imediatamente para UX rápida
    setSubmissions(prev => {
      const updated = [data, ...prev];
      localStorage.setItem('fleet_submissions', JSON.stringify(updated));
      return updated;
    });

    if (syncUrl) {
      setIsSyncing(true);
      try {
        await fetch(syncUrl, {
          method: 'POST',
          mode: 'no-cors', // Necessário para Google Scripts
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ type: 'report', data })
        });
        // Aguarda um pouco e puxa os dados atualizados da nuvem
        setTimeout(() => fetchCloudData(true), 1500);
      } catch (e) {
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
            <div 
              onClick={() => fetchCloudData()}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${syncUrl ? (syncError ? 'bg-rose-500' : 'bg-indigo-600') : 'bg-slate-200'} ${isSyncing ? 'animate-spin' : ''}`}
            >
              {syncError ? <AlertTriangle className="w-5 h-5 text-white" /> : <CloudLightning className={`w-5 h-5 ${syncUrl ? 'text-white' : 'text-slate-400'}`} />}
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight leading-none">Frota Hub</h1>
              <div className="flex items-center gap-1.5 mt-1">
                {!syncUrl ? (
                  <span className="text-[7px] font-black text-rose-500 uppercase">URL não configurada</span>
                ) : (
                  <>
                    <div className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                    <span className={`text-[8px] font-bold uppercase ${syncError ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {syncError ? 'Erro Conexão' : 'Online'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {userRole === 'standard' ? (
            <button onClick={() => setShowLoginModal(true)} className="p-2 text-slate-300"><Lock className="w-5 h-5" /></button>
          ) : (
            <div className="bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-indigo-600" />
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
            configSource={configSource}
            onNewForm={() => setFormKey(k => k + 1)}
            isSyncing={isSyncing}
            onManualSync={() => fetchCloudData()}
          />
        )}
        
        {userRole === 'admin' && (
          <div className="animate-in fade-in duration-300">
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
                onClearData={() => { if(confirm('Resetar Tudo?')) { localStorage.clear(); window.location.reload(); }}}
                syncUrl={syncUrl}
                onUpdateSyncUrl={() => {}} 
                submissions={submissions}
                onImportData={(data) => { setSubmissions(data); localStorage.setItem('fleet_submissions', JSON.stringify(data)); }}
                lastRawResponse={lastRawResponse}
              />
            )}
          </div>
        )}
      </main>

      {userRole === 'admin' && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white border border-slate-200 shadow-2xl rounded-full flex justify-around p-1.5 z-[60]">
          <button onClick={() => setActiveTab('form')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-full transition-all ${activeTab === 'form' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            <ClipboardList className="w-5 h-5" />
          </button>
          <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-full transition-all ${activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-full transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </nav>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 uppercase text-center">Gestor Frota</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (passwordInput === '1234') { setUserRole('admin'); setShowLoginModal(false); setPasswordInput(''); }
              else { alert('Senha incorreta!'); }
            }} className="space-y-4">
              <input type="password" placeholder="Senha" autoFocus value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-center" />
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px]">Entrar</button>
              <button type="button" onClick={() => setShowLoginModal(false)} className="w-full text-[9px] font-black text-slate-300 uppercase">Voltar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
