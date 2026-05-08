import { useState, useEffect, useRef } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc,
  updateDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  serverTimestamp,
  doc,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { uploadToDrive } from './services/driveService';
import { indexContent, askSecondBrain, generateTitle } from './lib/gemini';
import { cn } from './lib/utils';
import { 
  Brain, 
  Plus, 
  Search, 
  Home, 
  Link as LinkIcon, 
  FileText, 
  Image as ImageIcon, 
  LogOut, 
  Send,
  Loader2,
  ChevronRight,
  TrendingUp,
  Tag,
  Trash2,
  ArrowLeft,
  Settings,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import KnowledgeGraph from './components/KnowledgeGraph';

const AUTHORIZED_EMAIL = 'solomessaggi808@gmail.com';
const PORTAL_VERSION = '20260507.01';

type View = 'dashboard' | 'index' | 'qa' | 'graph' | 'settings';

interface Note {
  id: string;
  title: string;
  content: string;
  summary: string;
  type: 'note' | 'website' | 'document' | 'image';
  keywords: string[];
  connections: string[];
  createdAt: any;
  userId: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [notes, setNotes] = useState<Note[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [notification, setNotification] = useState<{ 
    title: string; 
    message: string; 
    type: 'error' | 'info' | 'confirm'; 
    onConfirm?: () => void; 
    confirmText?: string;
  } | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [apiKeys, setApiKeys] = useState<{id: string, name: string, key: string, model: string, embedded: boolean}[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyModel, setNewKeyModel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyEmbedded, setNewKeyEmbedded] = useState(false);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState(localStorage.getItem('selected_api_key_id') || '');
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'users', user.uid, 'apiKeys'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const keys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setApiKeys(keys);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'apiKeys'));
      return () => unsubscribe();
    } else {
      setApiKeys([]);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('selected_api_key_id', selectedApiKeyId);
  }, [selectedApiKeyId]);

  const addApiKey = async () => {
    if (!newKeyName || !newKeyValue || !newKeyModel || !user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'apiKeys'), {
        name: newKeyName,
        key: newKeyValue,
        model: newKeyModel,
        embedded: newKeyEmbedded,
        userId: user.uid
      });
      setNewKeyName('');
      setNewKeyModel('');
      setNewKeyValue('');
      setNewKeyEmbedded(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'apiKeys');
    }
  };

  const updateApiKey = async () => {
    if (!editingKeyId || !newKeyName || !newKeyValue || !newKeyModel || !user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'apiKeys', editingKeyId), {
        name: newKeyName,
        key: newKeyValue,
        model: newKeyModel,
        embedded: newKeyEmbedded
      });
      setEditingKeyId(null);
      setNewKeyName('');
      setNewKeyModel('');
      setNewKeyValue('');
      setNewKeyEmbedded(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'apiKeys');
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'apiKeys', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'apiKeys');
    }
  };

  const duplicateApiKey = async (key: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'apiKeys'), {
        name: `${key.name} (Copia)`,
        key: key.key,
        model: key.model,
        embedded: key.embedded,
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'apiKeys');
    }
  };  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        if (u.email === AUTHORIZED_EMAIL) {
          setUser(u);
        } else {
          signOut(auth);
          setNotification({
            title: 'Accesso Negato',
            message: 'Solo l\'account autorizzato può accedere a questo "Second Brain".',
            type: 'error'
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch Notes
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
      setNotes(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_access_token', credential.accessToken);
      }
    } catch (error) {
      console.error(error);
      setNotification({
        title: 'Errore Login',
        message: 'Impossibile completare l\'accesso con Google.',
        type: 'error'
      });
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-md-surface text-md-primary">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-md-surface flex overflow-hidden">
      <div className="fixed top-4 right-4 z-40 bg-md-primary/10 text-md-primary text-xs font-bold px-3 py-1.5 rounded-full border border-md-primary/20 backdrop-blur-sm pointer-events-none">
        {apiKeys.find(k => k.id === selectedApiKeyId)?.name || 'Gemini 3 Flash'}
      </div>
      {progress > 0 && progress < 100 && (
          <div className="fixed top-0 left-0 h-1 bg-md-primary z-[200] transition-all" style={{ width: `${progress}%` }} />
      )}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-md-surface-variant max-w-sm w-full p-6 rounded-[28px] border border-md-outline/20 shadow-2xl"
            >
              <h3 className={cn(
                "text-xl font-bold mb-2",
                notification.type === 'error' ? "text-red-400" : "text-md-primary"
              )}>{notification.title}</h3>
              <p className="text-md-on-surface-variant mb-6">{notification.message}</p>
              <div className="flex gap-3">
                {notification.type === 'confirm' && (
                  <button 
                    onClick={() => setNotification(null)}
                    className="flex-1 px-4 py-3 rounded-full font-bold text-md-on-surface border border-md-outline/20"
                  >
                    Annulla
                  </button>
                )}
                <button 
                  onClick={() => {
                    notification.onConfirm?.();
                    setNotification(null);
                  }}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-full font-bold",
                    notification.type === 'error' ? "bg-red-500 text-white" : "md-btn-primary"
                  )}
                >
                  {notification.confirmText || 'Ho capito'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!user ? (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-md-surface p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full text-center space-y-8"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-md-primary-container rounded-[24px] flex items-center justify-center">
                <Brain className="w-12 h-12 text-md-on-primary-container" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-md-on-surface tracking-tight">Second Brain AI</h1>
              <p className="text-md-on-surface-variant px-4">Archivia, indicizza e interroga la tua conoscenza personale con la potenza di Gemini.</p>
            </div>
            <button 
              onClick={handleLogin}
              className="md-btn-primary w-full py-4 shadow-xl shadow-md-primary/10"
            >
              Accedi con Google
            </button>
            <p className="text-xs text-md-outline uppercase tracking-widest font-semibold">Accesso limitato: {AUTHORIZED_EMAIL}</p>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Sidebar - Desktop */}
          <nav className="w-80 h-screen bg-md-surface-variant/10 border-r border-md-outline/10 flex flex-col p-6 space-y-8 hidden lg:flex">
            <div className="flex items-center gap-3 px-2">
              <Brain className="w-8 h-8 text-md-primary" />
              <span className="text-xl font-bold">Second Brain</span>
            </div>

            <div className="flex-1 space-y-2">
              <NavItem 
                active={currentView === 'dashboard'} 
                onClick={() => setCurrentView('dashboard')}
                icon={<Home className="w-5 h-5" />}
                label="Dashboard"
                modelName={apiKeys.find(k => k.id === selectedApiKeyId)?.model || 'Gemini 3 Flash'}
              />
              <NavItem 
                active={currentView === 'index'} 
                onClick={() => setCurrentView('index')}
                icon={<Plus className="w-5 h-5" />}
                label="Aggiungi Nota"
                modelName={apiKeys.find(k => k.id === selectedApiKeyId)?.model || 'Gemini 3 Flash'}
              />
              <NavItem 
                active={currentView === 'qa'} 
                onClick={() => setCurrentView('qa')}
                icon={<Search className="w-5 h-5" />}
                label="Chiedi all'AI"
                modelName={apiKeys.find(k => k.id === selectedApiKeyId)?.model || 'Gemini 3 Flash'}
              />
              <NavItem 
                active={currentView === 'graph'} 
                onClick={() => setCurrentView('graph')}
                icon={<TrendingUp className="w-5 h-5" />}
                label="Knowledge Graph"
                modelName={apiKeys.find(k => k.id === selectedApiKeyId)?.model || 'Gemini 3 Flash'}
              />
              <NavItem 
                active={currentView === 'settings'} 
                onClick={() => setCurrentView('settings')}
                icon={<Settings className="w-5 h-5" />}
                label="Configurazione"
                modelName={apiKeys.find(k => k.id === selectedApiKeyId)?.model || 'Gemini 3 Flash'}
              />
            </div>

            <div className="pt-6 border-t border-md-outline/10">
              <p className="text-[10px] font-mono opacity-40 px-2 mb-4 text-center">v{PORTAL_VERSION}</p>
              <div className="px-2 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img src={user.photoURL || ''} className="w-10 h-10 rounded-full" alt="User" />
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium truncate">{user.displayName}</p>
                    <p className="text-xs text-md-on-surface-variant truncate">{user.email}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="md-icon-btn">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 h-screen overflow-y-auto relative bg-md-surface pb-24 lg:pb-0">
            <AnimatePresence mode="wait">
              {currentView === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 md:p-8 max-w-6xl mx-auto space-y-8"
                >
                  <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-3xl font-bold">La tua Conoscenza</h2>
                      <p className="text-md-on-surface-variant">Hai {notes.length} elementi indicizzati</p>
                    </div>
                    <button 
                      onClick={() => setCurrentView('index')}
                      className="md-btn-primary w-full md:w-auto"
                    >
                      <Plus className="w-5 h-5" />
                      Nuovo Elemento
                    </button>
                  </header>

                  {/* Filter Tags */}
                  <div className="flex flex-nowrap md:flex-wrap gap-2 pb-2 overflow-x-auto md:overflow-x-visible no-scrollbar">
                    <button 
                      onClick={() => setSelectedTag(null)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap",
                        selectedTag === null ? "bg-md-primary text-md-on-primary border-md-primary" : "bg-md-surface-variant/20 border-md-outline/10 text-md-on-surface-variant hover:border-md-outline/40"
                      )}
                    >
                      Tutti
                    </button>
                    {Array.from(new Set(notes.flatMap(n => n.keywords))).slice(0, 20).sort().map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap uppercase tracking-tighter",
                          selectedTag === tag ? "bg-md-primary text-md-on-primary border-md-primary" : "bg-md-surface-variant/20 border-md-outline/10 text-md-on-surface-variant hover:border-md-outline/40"
                        )}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {notes
                      .filter(note => selectedTag === null || note.keywords.includes(selectedTag))
                      .map(note => (
                        <NoteCard key={note.id} note={note} setNotification={setNotification} setProgress={setProgress} />
                      ))}
                  </div>

                  {notes.length === 0 && (
                    <div className="h-96 flex flex-col items-center justify-center text-md-on-surface-variant space-y-4 px-6 text-center">
                      <div className="w-16 h-16 bg-md-surface-variant/20 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 opacity-40" />
                      </div>
                      <p>Inizia ad aggiungere note o link per costruire il tuo cervello personale.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {currentView === 'index' && (
                <IndexForm 
                  onClose={() => setCurrentView('dashboard')} 
                  user={user} 
                  existingNotes={notes}
                  setIsIndexing={setIsIndexing}
                  isIndexing={isIndexing}
                  setNotification={setNotification}
                  setProgress={setProgress}
                />
              )}

              {currentView === 'qa' && (
                <QaView 
                  notes={notes}
                  isAsking={isAsking}
                  setIsAsking={setIsAsking}
                  setNotification={setNotification}
                  setProgress={setProgress}
                />
              )}

              {currentView === 'graph' && (
                <motion.div 
                  key="graph"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 md:p-8 h-screen flex flex-col"
                >
                  <KnowledgeGraph notes={notes} />
                </motion.div>
              )}
              {currentView === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 md:p-8 max-w-2xl mx-auto space-y-8"
                >
                  <h2 className="text-3xl font-bold">Configurazione</h2>
                  <div className="md-card space-y-4">
                    <label className="block text-sm font-bold text-md-on-surface-variant">API Key OpenRouter</label>
                    <div className="flex flex-col gap-2">
                      {apiKeys.map(key => (
                        <div key={key.id} className="flex items-center gap-2">
                          <input 
                            type="radio"
                            checked={selectedApiKeyId === key.id}
                            onChange={() => setSelectedApiKeyId(key.id)}
                          />
                          <span className="flex-1 text-sm">{key.name} ({key.model})</span>
                        <button onClick={() => deleteApiKey(key.id)} className="text-red-400">
                             <Trash2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => duplicateApiKey(key)} className="text-blue-400 text-xs">Dup</button>
                          <button 
                            onClick={() => {
                              setEditingKeyId(key.id);
                              setNewKeyName(key.name);
                              setNewKeyModel(key.model);
                              setNewKeyValue(key.key);
                              setNewKeyEmbedded(key.embedded);
                            }} 
                            className="text-green-400 text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 mt-4 pt-4 border-t border-md-outline/10">
                      <input type="text" placeholder="Nome API Key" className="md-input w-full" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                      <input type="text" placeholder="Modello (es: nvidia/nemotron...)" className="md-input w-full" value={newKeyModel} onChange={(e) => setNewKeyModel(e.target.value)} />
                      <input type="password" placeholder="sk-or-v1-..." className="md-input w-full" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} />
                      <label className="flex items-center gap-2 text-sm text-md-on-surface">
                        <input type="checkbox" checked={newKeyEmbedded} onChange={(e) => setNewKeyEmbedded(e.target.checked)} />
                        Embedded flag
                      </label>
                      {editingKeyId ? (
                        <div className="flex gap-2">
                            <button onClick={updateApiKey} className="md-btn-primary flex-1">Salva Modifiche</button>
                            <button onClick={() => { setEditingKeyId(null); setNewKeyName(''); setNewKeyModel(''); setNewKeyValue(''); setNewKeyEmbedded(false); }} className="md-btn-secondary flex-1">Annulla</button>
                        </div>
                      ) : (
                        <button onClick={addApiKey} className="md-btn-primary w-full">Aggiungi API Key</button>
                      )}
                    </div>
                    <p className="text-xs text-md-outline">Seleziona l'API Key attiva da utilizzare.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Mobile Navigation */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-md-surface/80 backdrop-blur-xl border-t border-md-outline/10 flex items-center justify-around px-6 pb-2 z-50">
            <button onClick={() => setCurrentView('dashboard')} className={cn("p-3 rounded-full transition-all flex flex-col items-center", currentView === 'dashboard' ? "bg-md-primary-container text-md-on-primary-container" : "text-md-on-surface-variant hover:bg-md-on-surface/5")}>
              <Home className="w-6 h-6" />
            </button>
            <button onClick={() => setCurrentView('index')} className={cn("p-3 rounded-full transition-all flex flex-col items-center", currentView === 'index' ? "bg-md-primary-container text-md-on-primary-container" : "text-md-on-surface-variant hover:bg-md-on-surface/5")}>
              <Plus className="w-6 h-6" />
            </button>
            <button onClick={() => setCurrentView('qa')} className={cn("p-3 rounded-full transition-all flex flex-col items-center", currentView === 'qa' ? "bg-md-primary-container text-md-on-primary-container" : "text-md-on-surface-variant hover:bg-md-on-surface/5")}>
              <Search className="w-6 h-6" />
            </button>
            <button onClick={() => setCurrentView('graph')} className={cn("p-3 rounded-full transition-all flex flex-col items-center", currentView === 'graph' ? "bg-md-primary-container text-md-on-primary-container" : "text-md-on-surface-variant hover:bg-md-on-surface/5")}>
              <TrendingUp className="w-6 h-6" />
            </button>
            <button onClick={() => setCurrentView('settings')} className={cn("p-3 rounded-full transition-all flex flex-col items-center", currentView === 'settings' ? "bg-md-primary-container text-md-on-primary-container" : "text-md-on-surface-variant hover:bg-md-on-surface/5")}>
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon, label, modelName }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string, modelName?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-full transition-all group",
        active ? "bg-md-secondary-container text-md-on-secondary-container font-semibold" : "text-md-on-surface-variant hover:bg-md-on-surface/5"
      )}
    >
      <span className={cn(
        "p-1 rounded-lg transition-colors",
        active ? "text-md-primary" : "text-md-on-surface-variant"
      )}>
        {icon}
      </span>
      <div className="flex flex-col items-start">
        <span className="text-sm">{label}</span>
      </div>
    </button>
  );
}

function ExpandableNote({ note, onClose, setProgress }: { note: Note; onClose: () => void; setProgress: (p: number) => void }) {
  const [prompt, setPrompt] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    setProgress(20);
    try {
      const all = await getDocs(query(collection(db, 'notes'), where('userId', '==', note.userId)));
      setProgress(40);
      const allKeywords = Array.from(new Set(all.docs.flatMap(d => d.data().keywords)));
      setProgress(60);
      const result = await indexContent(note.title, note.content, allKeywords, prompt, (p) => setProgress(60 + p * 0.3));
      setProgress(90);

      await updateDoc(doc(db, 'notes', note.id), {
        summary: result.summary || '',
        keywords: (result.keywords && result.keywords.length > 0) ? result.keywords : [note.type],
        connections: result.suggestedConnections || [],
        updatedAt: serverTimestamp()
      });
      setProgress(100);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsReanalyzing(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-md-surface-variant max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-10 rounded-[32px] border border-md-outline/20 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 md-icon-btn bg-md-surface/40"
        >
          <Plus className="w-6 h-6 rotate-45" />
        </button>
        <div className="mb-6">
          <span className="text-xs uppercase font-bold text-md-primary tracking-widest">{note.type}</span>
          <h2 className="text-2xl md:text-3xl font-bold mt-2 text-md-on-surface">{note.title}</h2>
          
          <div className="mt-6 p-4 bg-md-surface/50 rounded-2xl border border-md-outline/10 space-y-3">
            <textarea 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Istruzioni per migliorare l'analisi (es: 'focalizzati sulla data di scadenza')"
              className="md-input w-full bg-transparent p-0"
            />
            <button 
              onClick={handleReanalyze}
              disabled={isReanalyzing}
              className="px-4 py-2 bg-md-primary text-md-on-primary rounded-full font-bold text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isReanalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Ri-analizza
            </button>
          </div>

          {note.summary && (
            <div className="mt-4 p-4 bg-md-secondary-container text-md-on-secondary-container rounded-2xl">
              <p className="text-sm font-bold uppercase tracking-widest mb-1 opacity-70">Riassunto AI</p>
              <p className="text-sm">{note.summary}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {note.keywords.map((kw, i) => (
              <span key={i} className="text-xs bg-md-primary/10 text-md-primary px-3 py-1 rounded-full border border-md-primary/20">
                #{kw}
              </span>
            ))}
          </div>
        </div>
        <div className="markdown-body prose prose-invert max-w-none">
          <ReactMarkdown>{note.content}</ReactMarkdown>
        </div>
      </motion.div>
    </div>
  );
}

function NoteCard({ note, setNotification, setProgress }: { note: Note; setNotification: (v: any) => void; setProgress: (p: number) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotification({
      title: 'Elimina fonte',
      message: 'Sei sicuro di voler eliminare questa fonte di conoscenza?',
      type: 'confirm',
      confirmText: 'Elimina',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deleteDoc(doc(db, 'notes', note.id));
        } catch (error) {
          console.error(error);
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  return (
    <motion.div 
      layout
      className="md-card flex flex-col space-y-4 group"
    >
      <div className="flex justify-between items-start">
        <div className="p-2 bg-md-primary/10 rounded-lg text-md-primary">
          {note.type === 'note' && <FileText className="w-5 h-5" />}
          {note.type === 'website' && <LinkIcon className="w-5 h-5" />}
          {note.type === 'image' && <ImageIcon className="w-5 h-5" />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-md-outline">
            {note.createdAt?.toDate ? format(note.createdAt.toDate(), 'dd MMM yyyy', { locale: it }) : 'Ora'}
          </span>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:bg-red-400/10 rounded-lg disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-lg leading-tight line-clamp-2">{note.title}</h3>
        <div className="flex flex-wrap gap-2 pt-1">
          {note.keywords.map((kw, i) => (
            <span key={i} className="text-[10px] bg-md-secondary/10 text-md-secondary px-2 py-0.5 rounded-full border border-md-secondary/20">
              {kw}
            </span>
          ))}
        </div>
      </div>

      <div className="text-sm text-md-on-surface-variant/80 line-clamp-3 overflow-hidden">
        {note.summary || note.content}
      </div>

      {note.connections.length > 0 && (
        <div className="pt-3 border-t border-md-outline/10">
          <p className="text-[10px] font-bold text-md-primary mb-2 flex items-center gap-1 uppercase tracking-tight">
            <TrendingUp className="w-3 h-3" />
            Relazioni AI
          </p>
          <div className="flex flex-wrap gap-2">
            {note.connections.map((conn, i) => (
              <span key={i} className="text-[10px] text-md-outline bg-md-outline/5 px-2 py-0.5 rounded italic">
                #{conn}
              </span>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsExpanded(true)}
        className="w-full text-center text-xs font-semibold py-3 text-md-primary border border-md-primary/20 rounded-xl hover:bg-md-primary/10 transition-all uppercase tracking-widest mt-auto"
      >
        Leggi Tutto
      </button>

      <AnimatePresence>
        {isExpanded && <ExpandableNote note={note} onClose={() => setIsExpanded(false)} setProgress={setProgress} />}
      </AnimatePresence>
    </motion.div>
  );
}

function IndexForm({ onClose, user, existingNotes, setIsIndexing, isIndexing, setNotification, setProgress }: { 
  onClose: () => void; 
  user: User; 
  existingNotes: Note[];
  setIsIndexing: (v: boolean) => void;
  isIndexing: boolean;
  setNotification: (v: any) => void;
  setProgress: (p: number) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'note' | 'website' | 'document' | 'image'>('note');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
        const driveUrl = await uploadToDrive(file);
        setContent(prev => prev + `\n\n[FILE: ${file.name}](${driveUrl})\n`);
    } catch (e) {
        setNotification({title: 'Errore upload', message: 'Impossibile caricare su drive', type: 'error'});
    } finally {
        setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || isIndexing) return;

    setIsIndexing(true);
    setProgress(10);
    let finalTitle = title;
    try {
      if (!finalTitle) {
        finalTitle = await generateTitle(content, (p) => setProgress(10 + p * 0.2));
      }
      setProgress(40);
      
      const allKeywords = Array.from(new Set(existingNotes.flatMap(n => n.keywords)));
      const resultRaw = await indexContent(finalTitle, content, allKeywords, undefined, (p) => setProgress(40 + p * 0.6));
      console.log("AI Result:", resultRaw);
      const result = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw;
      setProgress(100);

      await addDoc(collection(db, 'notes'), {
        title: finalTitle,
        content,
        summary: result.summary || '',
        type,
        keywords: (result.keywords && result.keywords.length > 0) ? result.keywords : [type],
        connections: result.suggestedConnections || [],
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onClose();
    } catch (error) {
      console.error(error);
      setNotification({
        title: 'Errore Indicizzazione',
        message: 'Si è verificato un problema durante l\'analisi AI del contenuto.',
        type: 'error'
      });
    } finally {
      setIsIndexing(false);
      setProgress(0);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 md:p-8 max-w-3xl mx-auto space-y-8"
    >
      <header className="flex items-center gap-4">
        <button onClick={onClose} className="md-icon-btn">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl md:text-3xl font-bold">Crea Nota</h2>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <TypeSelector selected={type === 'note'} onClick={() => setType('note')} icon={<FileText className="w-5 h-5"/>} label="Pensiero" />
          <TypeSelector selected={type === 'website'} onClick={() => setType('website')} icon={<LinkIcon className="w-5 h-5"/>} label="Sito" />
          <TypeSelector selected={type === 'document'} onClick={() => setType('document')} icon={<FileText className="w-5 h-5"/>} label="Doc" />
          <TypeSelector selected={type === 'image'} onClick={() => setType('image')} icon={<ImageIcon className="w-5 h-5"/>} label="Img" />
        </div>

        <div className="space-y-4">
          <input 
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titolo per la tua memoria..." 
            className="md-input w-full"
          />
          <div className="flex gap-2">
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Contenuto, link o trascrizione..." 
              className="md-input w-full min-h-[250px] md:min-h-[350px] resize-none"
              required
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="md-icon-btn">
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isIndexing}
          className="md-btn-primary w-full py-4 disabled:opacity-50 text-base font-bold shadow-lg shadow-md-primary/20"
        >
          {isIndexing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI sta analizzando...
            </>
          ) : (
            'Indicizza e Connetti'
          )}
        </button>
      </form>
    </motion.div>
  );
}

function TypeSelector({ selected, onClick, icon, label }: { selected: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 p-3 md:p-4 rounded-2xl border-2 transition-all",
        selected ? "border-md-primary bg-md-primary/10 text-md-primary shadow-sm" : "border-md-outline/10 text-md-on-surface-variant hover:border-md-outline/30"
      )}
    >
      {icon}
      <span className="font-bold text-xs uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function QaView({ notes, isAsking, setIsAsking, setNotification, setProgress }: { 
  notes: Note[]; 
  isAsking: boolean; 
  setIsAsking: (v: boolean) => void;
  setNotification: (v: any) => void;
  setProgress: (p: number) => void;
}) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<{ q: string; a: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [result]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || isAsking) return;

    setIsAsking(true);
    setProgress(20);
    try {
      const context = notes.map(n => `TITLE: ${n.title}\nSUMMARY: ${n.summary}\nKEYWORDS: ${n.keywords.join(',')}`).join('\n\n');
      setProgress(50);
      const answer = await askSecondBrain(question, context, (p) => setProgress(50 + p * 0.5));
      setProgress(100);
      setResult({ q: question, a: answer });
      setQuestion('');
    } catch (error) {
      console.error(error);
      setNotification({
        title: 'Errore AI',
        message: 'Impossibile ottenere una risposta dal "Second Brain" al momento.',
        type: 'error'
      });
    } finally {
      setIsAsking(false);
      setProgress(0);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">Chiedi al tuo Cervello</h2>
        <p className="text-md-on-surface-variant text-sm">L'AI risponderà interrogando i tuoi dati indicizzati.</p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 mb-20 pb-12 pr-1 md:pr-4 sm-scrollbar">
        {!result && !isAsking && (
          <div className="h-full flex flex-col items-center justify-center text-md-on-surface-variant opacity-40 space-y-4 px-6 text-center">
            <Search className="w-12 h-12" />
            <p className="font-medium italic">"Qual è stata l'ultima idea sul progetto X?"<br/>"Riassumi le mie note su Y"</p>
          </div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-end">
              <div className="bg-md-primary-container text-md-on-primary-container px-5 py-3 md:px-6 md:py-4 rounded-[24px] rounded-tr-none max-w-[85%] md:max-w-[80%] shadow-lg">
                <p className="font-semibold text-sm md:text-base">{result.q}</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-md-surface-variant/30 px-5 py-5 md:px-7 md:py-7 rounded-[28px] md:rounded-[32px] rounded-tl-none border border-md-outline/10 max-w-[95%] md:max-w-[90%] shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-md-primary">
                  <Brain className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Risposta Generata</span>
                </div>
                <div className="markdown-body prose prose-invert overflow-hidden text-sm md:text-base">
                  <ReactMarkdown>{result.a}</ReactMarkdown>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isAsking && (
          <div className="flex justify-start">
            <div className="bg-md-surface-variant/20 px-6 py-4 rounded-[24px] flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-md-primary" />
              <span className="text-sm italic">Accesso alle memorie...</span>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-40">
        <form onSubmit={handleAsk} className="relative group shadow-2xl">
          <input 
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Interroga il tuo cervello..." 
            className="w-full bg-md-surface-variant/60 backdrop-blur-2xl border-2 border-md-outline/10 rounded-full px-6 py-4 pr-14 md:px-8 md:py-5 md:pr-16 text-sm md:text-lg focus:outline-none focus:border-md-primary transition-all group-hover:bg-md-surface-variant/80"
          />
          <button 
            type="submit"
            disabled={!question || isAsking}
            className="absolute right-2 top-1/2 -translate-y-1/2 md-icon-btn bg-md-primary text-md-on-primary hover:bg-md-primary/90 disabled:opacity-50 shadow-md h-10 w-10 md:h-12 md:w-12 flex items-center justify-center p-0"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
