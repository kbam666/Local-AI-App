import { ChatSession, ChatMessage, StoredModel } from '../types/gguf';

const DB_NAME = 'DroidLLM_ChatSessions_DB';
const DB_VERSION = 1;
const STORE_SESSIONS = 'chat_sessions';

// Local storage keys for caching and active session tracking
export const ACTIVE_SESSION_CACHE_KEY = 'droidllm_active_chat_session';
export const ACTIVE_SESSION_ID_KEY = 'droidllm_active_session_id';

// Helper for title generation
export function generateSessionTitle(prompt: string): string {
  const clean = prompt.trim().replace(/^[\W_]+/, '');
  if (!clean) return 'New Conversation';
  const firstLine = clean.split('\n')[0];
  const truncated = firstLine.slice(0, 36).trim();
  return truncated.length < firstLine.length ? `${truncated}...` : truncated;
}

/**
 * Open IndexedDB database for Chat Sessions
 */
function openSessionDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const store = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Migration helper: check legacy DroidLLM_Conversations_DB if sessions exist
 */
async function checkLegacyConversations(): Promise<ChatSession[]> {
  try {
    return await new Promise((resolve) => {
      const req = indexedDB.open('DroidLLM_Conversations_DB', 1);
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('conversations')) {
          db.close();
          return resolve([]);
        }
        const tx = db.transaction('conversations', 'readonly');
        const store = tx.objectStore('conversations');
        const getReq = store.getAll();
        getReq.onsuccess = () => {
          const res = (getReq.result as ChatSession[]) || [];
          db.close();
          resolve(res);
        };
        getReq.onerror = () => {
          db.close();
          resolve([]);
        };
      };
    });
  } catch {
    return [];
  }
}

/**
 * Sync active session object to localStorage
 */
export function syncActiveSessionToLocalStorage(session: ChatSession | null): void {
  try {
    if (session) {
      localStorage.setItem(ACTIVE_SESSION_CACHE_KEY, JSON.stringify(session));
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, session.id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_CACHE_KEY);
      localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
    }
  } catch (err) {
    console.warn('Failed to sync active session to localStorage:', err);
  }
}

/**
 * Retrieve active session object directly from localStorage
 */
export function getActiveSessionFromLocalStorage(): ChatSession | null {
  try {
    const cached = localStorage.getItem(ACTIVE_SESSION_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as ChatSession;
    }
  } catch (err) {
    console.warn('Failed to parse active session from localStorage:', err);
  }
  return null;
}

/**
 * Retrieve active session ID from localStorage
 */
export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Set active session ID in localStorage
 */
export function setActiveSessionId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
  } catch (err) {
    console.warn('Failed to set active session ID in localStorage:', err);
  }
}

// ==========================================
// CRUD OPERATIONS FOR CHAT SESSIONS
// ==========================================

/**
 * CREATE: Initializes a new Chat Session, saves to IndexedDB and syncs to localStorage
 */
export async function createChatSession(
  model: StoredModel,
  initialPrompt?: string
): Promise<ChatSession> {
  const now = Date.now();
  const id = `session-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const title = initialPrompt ? generateSessionTitle(initialPrompt) : 'New Conversation';

  const newSession: ChatSession = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    modelId: model.id,
    modelName: model.name,
    messages: [
      {
        id: `msg-welcome-${now}`,
        role: 'assistant',
        content: `Hello! I am your local mobile AI running offline on your Android device via **${model.name}**.\n\nAll GGUF tensor calculations and token samplings happen 100% on your device hardware with zero data leaving your phone. Ask me anything or select a prompt below!`,
        timestamp: now,
        modelUsed: model.name,
      },
    ],
  };

  // 1. Save to IndexedDB
  await saveChatSession(newSession);

  // 2. Set as active session in localStorage
  syncActiveSessionToLocalStorage(newSession);

  return newSession;
}

/**
 * READ (Single): Retrieves a Chat Session by ID from IndexedDB
 */
export async function getChatSession(id: string): Promise<ChatSession | null> {
  // Check active localStorage cache first for instant retrieval
  const cached = getActiveSessionFromLocalStorage();
  if (cached && cached.id === id) {
    return cached;
  }

  try {
    const db = await openSessionDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as ChatSession) || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.error(`Failed to get Chat Session ${id} from IndexedDB:`, err);
    return null;
  }
}

/**
 * READ (All): Retrieves all Chat Sessions from IndexedDB (sorted by updatedAt desc)
 */
export async function getAllChatSessions(): Promise<ChatSession[]> {
  try {
    const db = await openSessionDB();
    let sessions: ChatSession[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as ChatSession[]) || []);
      req.onerror = () => resolve([]);
    });

    // If IndexedDB has no sessions, migrate any legacy sessions from DroidLLM_Conversations_DB
    if (sessions.length === 0) {
      const legacy = await checkLegacyConversations();
      if (legacy.length > 0) {
        for (const item of legacy) {
          await saveChatSession(item);
        }
        sessions = legacy;
      }
    }

    sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    return sessions;
  } catch (err) {
    console.error('Failed to get all Chat Sessions from IndexedDB:', err);
    return [];
  }
}

/**
 * READ (Active): Retrieves the currently active Chat Session
 */
export async function getActiveChatSession(): Promise<ChatSession | null> {
  const cached = getActiveSessionFromLocalStorage();
  if (cached) {
    return cached;
  }

  const activeId = getActiveSessionId();
  if (activeId) {
    const session = await getChatSession(activeId);
    if (session) {
      syncActiveSessionToLocalStorage(session);
      return session;
    }
  }

  const all = await getAllChatSessions();
  if (all.length > 0) {
    syncActiveSessionToLocalStorage(all[0]);
    return all[0];
  }

  return null;
}

/**
 * UPDATE: Saves/updates a Chat Session in IndexedDB and syncs to localStorage if active
 */
export async function saveChatSession(session: ChatSession): Promise<void> {
  try {
    const db = await openSessionDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.put(session);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Check if this is the active session; if so, update localStorage cache
    const activeId = getActiveSessionId();
    if (!activeId || activeId === session.id) {
      syncActiveSessionToLocalStorage(session);
    }
  } catch (err) {
    console.error('Failed to save Chat Session in IndexedDB:', err);
    // Still ensure localStorage is updated even if IndexedDB encounters transient error
    syncActiveSessionToLocalStorage(session);
  }
}

/**
 * UPDATE: Appends a single message to a given session and updates IndexedDB + localStorage
 */
export async function appendMessageToSession(
  sessionId: string,
  message: ChatMessage
): Promise<ChatSession | null> {
  let session = await getChatSession(sessionId);
  if (!session) {
    session = getActiveSessionFromLocalStorage();
    if (!session || session.id !== sessionId) {
      return null;
    }
  }

  // Auto-generate title on first user message if still default
  const hasUserMsg = session.messages.some((m) => m.role === 'user');
  if (!hasUserMsg && message.role === 'user' && session.title === 'New Conversation') {
    session.title = generateSessionTitle(message.content);
  }

  // Append message and update timestamp
  session.messages.push(message);
  session.updatedAt = Date.now();

  // Save to IndexedDB and update localStorage
  await saveChatSession(session);
  syncActiveSessionToLocalStorage(session);

  return session;
}

/**
 * UPDATE: Appends a message to the currently ACTIVE session object and updates localStorage
 */
export async function appendMessageToActiveSession(
  message: ChatMessage,
  modelFallback?: StoredModel
): Promise<ChatSession> {
  let active = getActiveSessionFromLocalStorage();

  if (!active) {
    const activeId = getActiveSessionId();
    if (activeId) {
      active = await getChatSession(activeId);
    }
  }

  // If no active session exists yet, create one
  if (!active) {
    const fallbackModel: StoredModel = modelFallback || {
      id: 'default',
      name: message.modelUsed || 'Mobile SLM',
      filename: 'model.gguf',
      sizeBytes: 0,
      dateAdded: Date.now(),
      quantization: 'Q4_0',
      parameterSize: '135M',
      architecture: 'llama',
      description: 'Active model',
      recommendedRam: '1 GB',
    };
    active = await createChatSession(fallbackModel, message.content);
  }

  // Update title if needed
  const hasUserMsg = active.messages.some((m) => m.role === 'user');
  if (!hasUserMsg && message.role === 'user' && active.title === 'New Conversation') {
    active.title = generateSessionTitle(message.content);
  }

  // Append message to active session
  active.messages = [...active.messages, message];
  active.updatedAt = Date.now();

  // 1. Immediately sync updated active session object to localStorage
  syncActiveSessionToLocalStorage(active);

  // 2. Persist updated session to IndexedDB
  await saveChatSession(active);

  return active;
}

/**
 * DELETE: Removes a Chat Session from IndexedDB and clears localStorage if active
 */
export async function deleteChatSession(id: string): Promise<void> {
  try {
    const db = await openSessionDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Also delete from legacy DB if present
    try {
      const legacyReq = indexedDB.open('DroidLLM_Conversations_DB', 1);
      legacyReq.onsuccess = () => {
        const legacyDb = legacyReq.result;
        if (legacyDb.objectStoreNames.contains('conversations')) {
          const ltx = legacyDb.transaction('conversations', 'readwrite');
          ltx.objectStore('conversations').delete(id);
        }
      };
    } catch {
      // Ignore legacy db errors
    }

    const activeId = getActiveSessionId();
    if (activeId === id) {
      localStorage.removeItem(ACTIVE_SESSION_CACHE_KEY);
      localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
    }
  } catch (err) {
    console.error(`Failed to delete Chat Session ${id} from IndexedDB:`, err);
  }
}

/**
 * DELETE: Clears all Chat Sessions from IndexedDB and localStorage
 */
export async function clearAllChatSessions(): Promise<void> {
  try {
    const db = await openSessionDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    localStorage.removeItem(ACTIVE_SESSION_CACHE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  } catch (err) {
    console.error('Failed to clear Chat Sessions from IndexedDB:', err);
  }
}

/**
 * EXPORT: Downloads a single Chat Session as formatted JSON
 */
export function exportChatSessionAsJSON(session: ChatSession): void {
  const exportPayload = {
    app: 'DroidLLM - Local GGUF Runner',
    exportDate: new Date().toISOString(),
    version: '1.0',
    chatSession: {
      id: session.id,
      title: session.title,
      createdAt: new Date(session.createdAt).toISOString(),
      updatedAt: new Date(session.updatedAt).toISOString(),
      model: {
        id: session.modelId,
        name: session.modelName,
      },
      messageCount: session.messages.length,
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toISOString(),
        tokensGenerated: m.tokensGenerated,
        tokensPerSec: m.tokensPerSec,
        timeToFirstTokenMs: m.timeToFirstTokenMs,
        modelUsed: m.modelUsed,
      })),
    },
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanTitle = session.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 25);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `droidllm-session-${cleanTitle}-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * EXPORT: Downloads all Chat Sessions as a combined JSON backup
 */
export async function exportAllChatSessionsAsJSON(): Promise<void> {
  const sessions = await getAllChatSessions();

  const exportPayload = {
    app: 'DroidLLM - Local GGUF Runner',
    exportDate: new Date().toISOString(),
    version: '1.0',
    totalSessions: sessions.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: new Date(s.createdAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
      model: {
        id: s.modelId,
        name: s.modelName,
      },
      messageCount: s.messages.length,
      messages: s.messages,
    })),
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `droidllm-all-sessions-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
