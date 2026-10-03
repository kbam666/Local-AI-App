import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  HardDrive,
  Cpu,
  Trash2,
  CheckCircle,
  FileText,
  Search,
  Plus,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { CatalogModel, HardwareAudit, StoredModel } from '../types/gguf';
import { MOBILE_GGUF_CATALOG, importCustomGGUFFile, deleteModelFromStorage } from '../services/modelStorage';
import { formatBytes } from '../services/ggufParser';

interface Props {
  storedModels: StoredModel[];
  activeModel: StoredModel;
  onSelectActiveModel: (model: StoredModel) => void;
  onRefreshModels: () => void;
  onInspectModel: (model: StoredModel) => void;
  onStartDownload: (model: CatalogModel, simulateFastMobile?: boolean) => void;
  hardwareAudit: HardwareAudit | null;
}

export const ModelsView: React.FC<Props> = ({
  storedModels,
  activeModel,
  onSelectActiveModel,
  onRefreshModels,
  onInspectModel,
  onStartDownload,
  hardwareAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'catalog'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [showCustomUrlDrawer, setShowCustomUrlDrawer] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.gguf')) {
      setUploadError('Please select a valid .gguf model file.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const newModel = await importCustomGGUFFile(file);
      await onRefreshModels();
      onSelectActiveModel(newModel);
      setActiveTab('installed');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to import GGUF file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Remove "${name}" from local mobile storage?`)) {
      try {
        await deleteModelFromStorage(id);
        await onRefreshModels();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete model');
      }
    }
  };

  const handleCustomUrlDownload = () => {
    if (!customUrl.trim()) return;
    const url = customUrl.trim();
    const filename = url.split('/').pop() || 'custom-model.gguf';
    const name = customModelName.trim() || filename.replace('.gguf', '');

    const customCatalogItem: CatalogModel = {
      id: `custom-url-${Date.now()}`,
      name,
      filename,
      downloadUrl: url,
      sizeBytes: 400 * 1024 * 1024,
      sizeFormatted: '~400 MB',
      parameters: 'Custom',
      quantization: 'GGUF',
      architecture: 'transformer',
      description: `Downloaded from custom URL: ${url.slice(0, 45)}...`,
      recommendedRam: '4 GB RAM',
      tag: 'Fast',
      estimatedTokSec: '12 - 25 tok/s',
      author: 'Custom URL',
    };

    onStartDownload(customCatalogItem, false);
    setShowCustomUrlDrawer(false);
    setCustomUrl('');
    setCustomModelName('');
  };

  const filteredCatalog = MOBILE_GGUF_CATALOG.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.architecture.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.quantization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const storageEst = hardwareAudit?.storageEstimate;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 p-4 space-y-4">
      {/* Title & Import Local Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            Model Manager
          </h2>
          <p className="text-xs text-slate-400">Download & execute GGUF files on Android</p>
        </div>

        {/* Local File Picker Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gguf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 shadow transition active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            {isUploading ? 'Importing...' : 'Load .gguf'}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Android Device Storage Quota Card */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            On-Device Storage Quota
          </span>
          <span className="text-slate-400 text-[11px]">
            {storageEst ? `${storageEst.usageMB} MB of ${Math.round(storageEst.quotaMB / 1024)} GB` : 'Loading...'}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full transition-all duration-500"
            style={{ width: `${storageEst ? Math.max(3, storageEst.percentUsed) : 5}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span>Persistent IndexedDB / OPFS Storage</span>
          <span className="text-emerald-400 font-medium">Ready for offline inference</span>
        </div>
      </div>

      {/* Tabs: Download Catalog vs Installed Models */}
      <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'catalog'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Download Catalog ({MOBILE_GGUF_CATALOG.length})
        </button>
        <button
          onClick={() => setActiveTab('installed')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'installed'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Installed Models ({storedModels.length})
        </button>
      </div>

      {/* TAB 1: DOWNLOAD CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-3">
          {/* Search & Custom HF link */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models, quantizations..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => setShowCustomUrlDrawer(!showCustomUrlDrawer)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
              title="Download from Custom HuggingFace URL"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>URL</span>
            </button>
          </div>

          {/* Custom URL Drawer */}
          {showCustomUrlDrawer && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-2 animate-in fade-in">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Download GGUF from Custom URL
              </h3>
              <p className="text-[11px] text-slate-400">
                Paste any direct link to a .gguf file (e.g. Hugging Face resolve URL):
              </p>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://huggingface.co/.../model-Q4_K_M.gguf"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
                placeholder="Custom Model Name (optional)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowCustomUrlDrawer(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomUrlDownload}
                  disabled={!customUrl.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs disabled:opacity-50"
                >
                  Start Download
                </button>
              </div>
            </div>
          )}

          {/* Catalog Cards */}
          <div className="space-y-3">
            {filteredCatalog.map((model) => {
              const isAlreadyInstalled = storedModels.some((m) => m.filename === model.filename);

              return (
                <div
                  key={model.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 shadow-sm flex flex-col space-y-2 hover:border-slate-700/80 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{model.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            model.tag === 'Ultra-Light'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : model.tag === 'Recommended'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {model.tag}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {model.parameters} • {model.quantization} • {model.sizeFormatted} • {model.recommendedRam}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">{model.sizeFormatted}</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{model.estimatedTokSec}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{model.description}</p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/70">
                    <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
                      By {model.author}
                    </span>

                    {isAlreadyInstalled ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => onStartDownload(model, false)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download GGUF
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: INSTALLED MODELS */}
      {activeTab === 'installed' && (
        <div className="space-y-3">
          {storedModels.map((model) => {
            const isActive = model.id === activeModel.id;

            return (
              <div
                key={model.id}
                className={`p-3.5 rounded-2xl border transition ${
                  isActive
                    ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-950/20'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{model.name}</span>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                          Active
                        </span>
                      )}
                      {model.isEmbedded && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                          Built-in
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {model.architecture} • {model.quantization} • {formatBytes(model.sizeBytes)}
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-300">
                    {formatBytes(model.sizeBytes)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{model.description}</p>

                {/* Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Inspect GGUF Button */}
                    <button
                      onClick={() => onInspectModel(model)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    >
                      <Layers className="w-3 h-3 text-emerald-400" />
                      Inspect Tensors
                    </button>

                    {/* Delete model (except embedded) */}
                    {!model.isEmbedded && (
                      <button
                        onClick={() => handleDelete(model.id, model.name)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                        title="Delete from storage"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {!isActive && (
                    <button
                      onClick={() => onSelectActiveModel(model)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm active:scale-95"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
