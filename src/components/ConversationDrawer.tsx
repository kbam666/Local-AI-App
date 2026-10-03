import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Download,
  X,
  Search,
  Edit2,
  Check,
  Calendar,
  Layers,
  Database,
  CheckCircle,
} from 'lucide-react';
import { Conversation } from '../types/gguf';
import {
  exportConversationAsJSON,
  exportAllConversationsAsJSON,
} from '../services/conversationStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onClearAll: () => void;
}

export const ConversationDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group conversations by time
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;

  const todayList: Conversation[] = [];
  const yesterdayList: Conversation[] = [];
  const previousWeekList: Conversation[] = [];
  const olderList: Conversation[] = [];

  filteredConversations.forEach((c) => {
    const diff = now - c.updatedAt;
    if (diff < ONE_DAY) {
      todayList.push(c);
    } else if (diff < 2 * ONE_DAY) {
      yesterdayList.push(c);
    } else if (diff < SEVEN_DAYS) {
      previousWeekList.push(c);
    } else {
      olderList.push(c);
    }
  });

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleExportSingle = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    exportConversationAsJSON(conv);
    setExportNotice(`Exported "${conv.title}" as JSON`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportAll = async () => {
    await exportAllConversationsAsJSON();
    setExportNotice('Exported all conversations as JSON backup');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const renderConversationGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;

    return (
      <div key={title} className="mb-4">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-emerald-400" />
          {title} ({items.length})
        </div>
        <div className="space-y-1 mt-1">
          {items.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;
            const lastMsg = conv.messages[conv.messages.length - 1];
            const msgPreview = lastMsg ? lastMsg.content.slice(0, 65) : 'No messages';

            return (
              <div
                key={conv.id}
                onClick={() => {
                  onSelectConversation(conv.id);
                  onClose();
                }}
                className={`group relative p-2.5 rounded-xl transition cursor-pointer flex flex-col border ${
                  isActive
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-slate-100 shadow-sm'
                    : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />

                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(conv.id, e)}
                        className="flex items-center gap-1 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          className="bg-slate-950 border border-emerald-500/50 rounded px-2 py-0.5 text-xs text-white w-full focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs font-semibold truncate text-slate-100">
                        {conv.title}
                      </span>
                    )}
                  </div>

                  {/* Actions on conversation */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      {/* Export JSON */}
                      <button
                        onClick={(e) => handleExportSingle(conv, e)}
                        className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-emerald-400 transition"
                        title="Export this conversation as JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Rename */}
                      <button
                        onClick={(e) => handleStartRename(conv, e)}
                        className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition"
                        title="Rename conversation"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      {conversations.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete conversation "${conv.title}"?`)) {
                              onDeleteConversation(conv.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtitle / preview snippet */}
                <div className="text-[11px] text-slate-400 truncate mt-1 pl-5">
                  {msgPreview}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pl-5">
                  <span className="truncate max-w-[130px]">{conv.modelName}</span>
                  <span>{new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const totalSavedMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-in Drawer */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-slate-900 border-r border-slate-800 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Conversations</h2>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Database className="w-2.5 h-2.5 text-emerald-400" />
                Saved in IndexedDB
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: + New Chat */}
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={() => {
              onNewConversation();
              onClose();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>

          {/* Search Bar */}
          <div className="relative mt-2.5">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Toast notice when exported */}
        {exportNotice && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{exportNotice}</span>
          </div>
        )}

        {/* Conversations Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No conversations stored yet.
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No matching conversations found.
            </div>
          ) : (
            <>
              {renderConversationGroup('Today', todayList)}
              {renderConversationGroup('Yesterday', yesterdayList)}
              {renderConversationGroup('Previous 7 Days', previousWeekList)}
              {renderConversationGroup('Older', olderList)}
            </>
          )}
        </div>

        {/* Drawer Footer with Stats & Export All */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>{conversations.length} Chats • {totalSavedMessages} Messages</span>
            <span className="text-emerald-400 font-medium">100% On-Device</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Export All JSON */}
            <button
              onClick={handleExportAll}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5 border border-slate-700/60"
              title="Export all conversations into a JSON backup"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export All JSON
            </button>

            {/* Clear All Chats */}
            {showClearConfirm ? (
              <button
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="py-2 px-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition flex items-center justify-center gap-1"
              >
                Confirm Delete?
              </button>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-400 hover:text-red-400 transition flex items-center justify-center gap-1.5 border border-slate-700/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
