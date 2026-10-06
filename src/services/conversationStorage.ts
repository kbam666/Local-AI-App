import {
  ChatSession,
  ChatMessage,
  StoredModel,
  Conversation,
} from '../types/gguf';
import {
  createChatSession,
  getChatSession,
  getAllChatSessions,
  getActiveChatSession,
  saveChatSession,
  appendMessageToSession,
  appendMessageToActiveSession,
  deleteChatSession,
  clearAllChatSessions,
  getActiveSessionId,
  setActiveSessionId,
  getActiveSessionFromLocalStorage,
  syncActiveSessionToLocalStorage,
  exportChatSessionAsJSON,
  exportAllChatSessionsAsJSON,
  generateSessionTitle,
} from './chatSessionService';

// Re-export title generator
export const generateTitleFromPrompt = generateSessionTitle;

// Re-export session creation
export function createNewConversation(model: StoredModel, initialMessage?: string): Conversation {
  const now = Date.now();
  const id = `session-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const title = initialMessage ? generateSessionTitle(initialMessage) : 'New Conversation';

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

// Re-export CRUD functions delegating to chatSessionService
export const getAllConversations = getAllChatSessions;
export const getConversationById = getChatSession;
export const saveConversation = saveChatSession;
export const deleteConversation = deleteChatSession;
export const clearAllConversations = clearAllChatSessions;
export const getActiveConversationId = getActiveSessionId;
export const setActiveConversationId = setActiveSessionId;

// Export helpers
export const exportConversationAsJSON = exportChatSessionAsJSON;
export const exportAllConversationsAsJSON = exportAllChatSessionsAsJSON;

// Re-export service methods for chat session operations
export {
  createChatSession,
  getChatSession,
  getAllChatSessions,
  getActiveChatSession,
  saveChatSession,
  appendMessageToSession,
  appendMessageToActiveSession,
  deleteChatSession,
  clearAllChatSessions,
  getActiveSessionFromLocalStorage,
  syncActiveSessionToLocalStorage,
};
