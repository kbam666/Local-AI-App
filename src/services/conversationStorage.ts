import { Conversation, ChatMessage, StoredModel } from '../types/gguf';

const DB_NAME = 'DroidLLM_Conversations_DB';
const DB_VERSION = 1;
const STORE_CONVERSATIONS = 'conversations';
const ACTIVE_CONV_KEY = 'droidllm_active_conversation_id';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const store = db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function generateTitleFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/^[\W_]+/, '');
  if (!clean) return 'New Conversation';
  const firstLine = clean.split('\n')[0];
  const truncated = firstLine.slice(0, 36).trim();
  return truncated.length < firstLine.length ? `${truncated}...` : truncated;
}

export function createNewConversation(model: StoredModel, initialMessage?: string): Conversation {
  const now = Date.now();
  const id = `conv-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const title = initialMessage ? generateTitleFromPrompt(initialMessage) : 'New Conversation';

  return {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    modelId: model.id,
    modelName: model.name,
    messages: [
      {
        id: `msg-starter-${now}`,
        role: 'assistant',
        content: `Hello! I am your local mobile AI running offline on your Android device via **${model.name}**.\n\nAll GGUF tensor calculations and token samplings happen 100% on your device hardware with zero data leaving your phone. Ask me anything or select a prompt below!`,
        timestamp: now,
        modelUsed: model.name,
      },
    ],
  };
}

export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as Conversation[]) || [];
        // Sort descending by updatedAt (most recent first)
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Failed to get conversations from IndexedDB:', err);
    return [];
  }
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as Conversation) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.put(conversation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save conversation to IndexedDB:', err);
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to delete conversation from IndexedDB:', err);
  }
}

export async function clearAllConversations(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to clear conversations from IndexedDB:', err);
  }
}

export function getActiveConversationId(): string | null {
  return localStorage.getItem(ACTIVE_CONV_KEY);
}

export function setActiveConversationId(id: string): void {
  localStorage.setItem(ACTIVE_CONV_KEY, id);
}

/**
 * Download a single conversation as a formatted JSON file
 */
export function exportConversationAsJSON(conv: Conversation): void {
  const exportPayload = {
    app: 'DroidLLM - Local GGUF Runner',
    exportDate: new Date().toISOString(),
    version: '1.0',
    conversation: {
      id: conv.id,
      title: conv.title,
      createdAt: new Date(conv.createdAt).toISOString(),
      updatedAt: new Date(conv.updatedAt).toISOString(),
      model: {
        id: conv.modelId,
        name: conv.modelName,
      },
      messageCount: conv.messages.length,
      messages: conv.messages.map((m) => ({
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

  const cleanTitle = conv.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 25);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `droidllm-chat-${cleanTitle}-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export all saved conversations as a combined JSON backup file
 */
export async function exportAllConversationsAsJSON(): Promise<void> {
  const conversations = await getAllConversations();

  const exportPayload = {
    app: 'DroidLLM - Local GGUF Runner',
    exportDate: new Date().toISOString(),
    version: '1.0',
    totalConversations: conversations.length,
    conversations: conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      createdAt: new Date(conv.createdAt).toISOString(),
      updatedAt: new Date(conv.updatedAt).toISOString(),
      model: {
        id: conv.modelId,
        name: conv.modelName,
      },
      messageCount: conv.messages.length,
      messages: conv.messages,
    })),
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `droidllm-all-conversations-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
