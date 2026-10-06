import React, { useState, useEffect } from 'react';
import { AndroidFrame } from './components/AndroidFrame';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidNavBar, NavTab } from './components/AndroidNavBar';
import { ChatView } from './components/ChatView';
import { ModelsView } from './components/ModelsView';
import { InspectorView } from './components/InspectorView';
import { TrainingView } from './components/TrainingView';
import { BenchmarkView } from './components/BenchmarkView';
import { SettingsView } from './components/SettingsView';
import { ModelDownloadModal } from './components/ModelDownloadModal';
import {
  CatalogModel,
  DownloadProgress,
  GenerationParams,
  HardwareAudit,
  StoredModel,
} from './types/gguf';
import {
  auditDeviceHardware,
  EMBEDDED_STARTER_MODEL,
  getStoredModels,
  setActiveModelId,
} from './services/modelStorage';
import { llmEngine } from './services/llmEngine';
import { modelDownloader } from './services/modelDownloader';

const DEFAULT_PARAMS: GenerationParams = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 256,
  repeatPenalty: 1.1,
  systemPrompt: 'You are DroidLLM, a helpful, precise AI assistant running locally and privately on an Android device.',
  threads: 4,
  useWebGPU: false,
  contextLength: 2048,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('chat');
  const [models, setModels] = useState<StoredModel[]>([EMBEDDED_STARTER_MODEL]);
  const [activeModel, setActiveModel] = useState<StoredModel>(EMBEDDED_STARTER_MODEL);
  const [inspectTargetModel, setInspectTargetModel] = useState<StoredModel>(EMBEDDED_STARTER_MODEL);
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hardwareAudit, setHardwareAudit] = useState<HardwareAudit | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [activeDownloadModelId, setActiveDownloadModelId] = useState<string | null>(null);
  const [downloadErrorToast, setDownloadErrorToast] = useState<string | null>(null);

  // Load models & hardware audit on mount
  useEffect(() => {
    const initializeApp = async () => {
      // 1. Audit hardware
      try {
        const audit = await auditDeviceHardware();
        setHardwareAudit(audit);
        setParams((p) => ({
          ...p,
          threads: Math.max(2, Math.min(4, audit.cpuThreads || 4)),
        }));
      } catch (err) {
        console.error('Failed to audit device hardware:', err);
      }

      // 2. Load stored models
      try {
        const stored = await getStoredModels();
        setModels(stored);
        const restored = await llmEngine.restoreActiveModel(params);
        setActiveModel(restored);
        setInspectTargetModel(restored);
      } catch (err) {
        console.error('Failed to restore active model:', err);
      }
    };

    initializeApp();
  }, []);

  const refreshModels = async () => {
    const stored = await getStoredModels();
    setModels(stored);
  };

  const handleSelectModel = async (model: StoredModel) => {
    setActiveModel(model);
    setInspectTargetModel(model);
    setActiveModelId(model.id);
    await llmEngine.loadModel(model, params);
  };

  const handleInspectModel = (model: StoredModel) => {
    setInspectTargetModel(model);
    setActiveTab('inspector');
  };

  const handleStartDownload = async (catalogModel: CatalogModel, simulateFastMobile = false) => {
    try {
      setActiveDownloadModelId(catalogModel.id);
      setDownloadProgress({
        modelId: catalogModel.id,
        modelName: catalogModel.name,
        bytesReceived: 0,
        totalBytes: catalogModel.sizeBytes,
        percentage: 0,
        speedMBs: 0,
        etaSeconds: 0,
        isPaused: false,
      });

      const newStoredModel = await modelDownloader.downloadModel(
        catalogModel,
        (progress) => {
          setDownloadProgress(progress);
        },
        { simulateFastMobileDownload: simulateFastMobile }
      );

      setDownloadProgress(null);
      setActiveDownloadModelId(null);
      await refreshModels();
      await handleSelectModel(newStoredModel);
      setActiveTab('chat');
    } catch (err: unknown) {
      setDownloadProgress(null);
      setActiveDownloadModelId(null);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (!errMsg.includes('cancelled')) {
        setDownloadErrorToast(`Download notice: ${errMsg}`);
        setTimeout(() => setDownloadErrorToast(null), 4000);
      }
    }
  };

  const handleCancelDownload = () => {
    if (activeDownloadModelId) {
      modelDownloader.cancelDownload(activeDownloadModelId);
      setDownloadProgress(null);
      setActiveDownloadModelId(null);
    }
  };

  return (
    <AndroidFrame>
      {/* Android Top Status Bar */}
      <AndroidStatusBar
        activeModel={activeModel}
        isGenerating={isGenerating}
        batteryInfo={hardwareAudit?.battery}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-slate-950">
        {activeTab === 'chat' && (
          <ChatView
            activeModel={activeModel}
            models={models}
            onSelectModel={handleSelectModel}
            onOpenModelsTab={() => setActiveTab('models')}
            onOpenInspectorTab={() => {
              setInspectTargetModel(activeModel);
              setActiveTab('inspector');
            }}
            params={params}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
        )}

        {activeTab === 'models' && (
          <ModelsView
            storedModels={models}
            activeModel={activeModel}
            onSelectActiveModel={handleSelectModel}
            onRefreshModels={refreshModels}
            onInspectModel={handleInspectModel}
            onOpenTrainTab={(model) => {
              handleSelectModel(model);
              setActiveTab('train');
            }}
            onStartDownload={handleStartDownload}
            hardwareAudit={hardwareAudit}
          />
        )}

        {activeTab === 'train' && (
          <TrainingView
            activeModel={activeModel}
            models={models}
            onSelectActiveModel={handleSelectModel}
            onOpenChatWithAdapter={() => setActiveTab('chat')}
          />
        )}

        {activeTab === 'inspector' && (
          <InspectorView activeModel={inspectTargetModel} />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkView
            activeModel={activeModel}
            hardwareAudit={hardwareAudit}
            params={params}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            params={params}
            onChangeParams={setParams}
            hardwareAudit={hardwareAudit}
          />
        )}
      </main>

      {/* Download Error Notice Toast */}
      {downloadErrorToast && (
        <div className="absolute top-12 left-4 right-4 z-50 bg-slate-900 border border-amber-500/50 text-amber-200 text-xs px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="truncate pr-2">{downloadErrorToast}</span>
          <button
            onClick={() => setDownloadErrorToast(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Download Progress Modal Drawer */}
      <ModelDownloadModal
        progress={downloadProgress}
        onCancel={handleCancelDownload}
      />

      {/* Android Material 3 Bottom Navigation Bar */}
      <AndroidNavBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        modelsCount={models.length}
      />
    </AndroidFrame>
  );
}
