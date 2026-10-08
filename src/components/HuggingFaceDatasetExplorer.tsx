import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  RefreshCw,
  Tag,
  ThumbsUp,
  AlertCircle,
  Eye,
  X,
  FileText,
  Sliders,
  Check,
} from 'lucide-react';
import { HuggingFaceDatasetMeta, TrainingDataset } from '../types/gguf';
import {
  searchHuggingFaceDatasets,
  downloadHuggingFaceDataset,
  FEATURED_HF_DATASETS,
} from '../services/huggingFaceService';

interface Props {
  onDatasetDownloaded: (newDataset: TrainingDataset) => void;
  onSelectForTraining?: (newDataset: TrainingDataset) => void;
  compact?: boolean;
}

const CATEGORY_TAGS = [
  { id: 'all', label: 'All Featured' },
  { id: 'instruction', label: 'Instruction' },
  { id: 'alpaca', label: 'Alpaca' },
  { id: 'chat', label: 'Chat & Dialogue' },
  { id: 'coding', label: 'Code & Dev' },
  { id: 'reasoning', label: 'Reasoning & CoT' },
  { id: 'synthetic', label: 'Synthetic SLM' },
  { id: 'medical', label: 'Medical & Science' },
];

export const HuggingFaceDatasetExplorer: React.FC<Props> = ({
  onDatasetDownloaded,
  onSelectForTraining,
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [datasets, setDatasets] = useState<HuggingFaceDatasetMeta[]>(FEATURED_HF_DATASETS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Download settings & state
  const [sampleLimit, setSampleLimit] = useState<number>(30);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<{ id: string; name: string; count: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Preview state
  const [previewMeta, setPreviewMeta] = useState<HuggingFaceDatasetMeta | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<{ prompt: string; response: string }> | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Custom repo input
  const [customRepoInput, setCustomRepoInput] = useState('');

  // Initial load
  useEffect(() => {
    handleSearch('');
  }, []);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setSearchError(null);
    try {
      const results = await searchHuggingFaceDatasets(query);
      setDatasets(results);
    } catch (err) {
      setSearchError('Failed to fetch datasets from Hugging Face.');
      setDatasets(FEATURED_HF_DATASETS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagClick = (tagId: string) => {
    setActiveTag(tagId);
    if (tagId === 'all') {
      setSearchQuery('');
      handleSearch('');
    } else {
      setSearchQuery(tagId);
      handleSearch(tagId);
    }
  };

  const handleDownload = async (meta: HuggingFaceDatasetMeta) => {
    setDownloadingId(meta.id);
    setDownloadError(null);
    try {
      const savedDataset = await downloadHuggingFaceDataset(meta, sampleLimit);
      setDownloadSuccessToast({
        id: savedDataset.id,
        name: savedDataset.name,
        count: savedDataset.examples.length,
      });
      onDatasetDownloaded(savedDataset);
    } catch (err: any) {
      setDownloadError(err?.message || 'Failed to download dataset from Hugging Face.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (meta: HuggingFaceDatasetMeta) => {
    setPreviewMeta(meta);
    setIsLoadingPreview(true);
    setPreviewRows(null);
    try {
      const res = await fetch(
        `/api/huggingface/datasets/rows?dataset=${encodeURIComponent(meta.id)}&limit=5&split=train`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.examples)) {
          setPreviewRows(data.examples);
        }
      }
    } catch {
      // preview error handled gracefully
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDownloadCustomRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    const repo = customRepoInput.trim();
    if (!repo) return;

    const meta: HuggingFaceDatasetMeta = {
      id: repo,
      name: repo.split('/').pop() || repo,
      author: repo.includes('/') ? repo.split('/')[0] : 'Community',
      description: `Hugging Face dataset ${repo}`,
      isInstructionTuning: true,
    };

    await handleDownload(meta);
    setCustomRepoInput('');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Info */}
      {!compact && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span className="text-base" role="img" aria-label="hugging-face">🤗</span>
              Hugging Face Datasets Hub
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 font-mono text-amber-200">
              Direct Downloader & Parser
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Search hundreds of thousands of open-source datasets on Hugging Face or choose from curated gold-standard instruction sets (Stanford Alpaca, Databricks Dolly, OpenOrca, CodeFeedback). One-click download directly converts samples into structured instruction pairs for local LoRA fine-tuning.
          </p>
        </div>
      )}

      {/* Success Notification */}
      {downloadSuccessToast && (
        <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold">Successfully Downloaded:</span>{' '}
              <span>{downloadSuccessToast.name}</span>{' '}
              <span className="text-emerald-400 font-mono">({downloadSuccessToast.count} instruction pairs)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onSelectForTraining && (
              <button
                onClick={() => {
                  const ds: any = { id: downloadSuccessToast.id, name: downloadSuccessToast.name };
                  onSelectForTraining(ds);
                }}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px] transition"
              >
                Fine-Tune Now
              </button>
            )}
            <button
              onClick={() => setDownloadSuccessToast(null)}
              className="text-emerald-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {downloadError && (
        <div className="p-3 rounded-2xl bg-red-950/90 border border-red-500/60 flex items-center justify-between gap-3 text-xs text-red-200 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{downloadError}</span>
          </div>
          <button onClick={() => setDownloadError(null)} className="text-red-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Bar & Download Row Limit Controls */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search datasets (e.g. alpaca, code, medical, dolly, reasoning)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) handleSearch('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch(searchQuery);
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  handleSearch('');
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={() => handleSearch(searchQuery)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Search</span>
          </button>

          {/* Sample Rows Limit Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 shrink-0">
            <Sliders className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] text-slate-400">Rows:</span>
            <select
              value={sampleLimit}
              onChange={(e) => setSampleLimit(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
              title="Number of instruction pairs to download into this fine-tuning dataset"
            >
              <option value={15} className="bg-slate-950 text-slate-200">15 pairs (Fastest)</option>
              <option value={30} className="bg-slate-950 text-slate-200">30 pairs (Recommended)</option>
              <option value={50} className="bg-slate-950 text-slate-200">50 pairs (Balanced)</option>
              <option value={100} className="bg-slate-950 text-slate-200">100 pairs (Thorough)</option>
            </select>
          </div>
        </div>

        {/* Filter Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          {CATEGORY_TAGS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTagClick(t.id)}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap font-medium ${
                activeTag === t.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Repo Direct Download Bar */}
      <form
        onSubmit={handleDownloadCustomRepo}
        className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <span className="text-[11px] font-semibold text-slate-300 shrink-0 flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          Direct Repo ID:
        </span>
        <input
          type="text"
          placeholder="e.g. tatsu-lab/alpaca or mlabonne/guanaco-llama2-1k"
          value={customRepoInput}
          onChange={(e) => setCustomRepoInput(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          disabled={!customRepoInput.trim() || !!downloadingId}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 text-xs font-semibold transition flex items-center justify-center gap-1 shrink-0"
        >
          <Download className="w-3 h-3" />
          <span>Fetch & Add</span>
        </button>
      </form>

      {/* Dataset Cards Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Found {datasets.length} datasets on Hugging Face Hub</span>
          <span className="text-[11px] text-slate-500">Formats auto-converted to instruction/response</span>
        </div>

        {datasets.length === 0 && !isLoading && (
          <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-2xl" role="img" aria-label="thinking">🔍</span>
            <p className="text-xs font-semibold text-slate-300">No matching datasets found on Hugging Face</p>
            <p className="text-[11px] text-slate-500">
              Try searching for "alpaca", "dolly", "instruction", or use the Direct Repo ID field above.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                handleSearch('');
              }}
              className="mt-2 text-xs text-amber-400 hover:underline inline-block"
            >
              Reset to Featured Datasets
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {datasets.map((meta) => {
            const isDownloading = downloadingId === meta.id;

            return (
              <div
                key={meta.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 hover:border-amber-500/40 transition flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm" role="img" aria-label="hf">🤗</span>
                        <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-amber-300 transition">
                          {meta.name || meta.id.split('/').pop()}
                        </h4>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                        {meta.id}
                      </div>
                    </div>

                    {meta.isInstructionTuning && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold shrink-0">
                        Instruct SFT
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {meta.description || 'Instruction tuning dataset on Hugging Face Hub.'}
                  </p>

                  {/* Tags and Stats */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {meta.downloads !== undefined && meta.downloads > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        <Download className="w-2.5 h-2.5 text-slate-500" />
                        {meta.downloads > 1000 ? `${Math.round(meta.downloads / 1000)}k` : meta.downloads}
                      </span>
                    )}
                    {meta.likes !== undefined && meta.likes > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                        <ThumbsUp className="w-2.5 h-2.5 text-amber-400/80" />
                        {meta.likes}
                      </span>
                    )}
                    {(meta.tags || []).slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePreview(meta)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 hover:text-white transition flex items-center gap-1 border border-slate-800"
                      title="Preview sample instruction rows"
                    >
                      <Eye className="w-3 h-3 text-slate-400" />
                      Preview
                    </button>
                    <a
                      href={`https://huggingface.co/datasets/${meta.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-500 hover:text-slate-300 transition"
                      title="View on Hugging Face Hub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload(meta)}
                    disabled={isDownloading}
                    className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Download & Add ({sampleLimit})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {previewMeta && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 space-y-3.5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="text-base" role="img" aria-label="hf">🤗</span>
                  {previewMeta.name || previewMeta.id}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{previewMeta.id}</p>
              </div>
              <button
                onClick={() => setPreviewMeta(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingPreview && (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                  <span>Fetching live sample rows from Hugging Face Datasets Server...</span>
                </div>
              )}

              {!isLoadingPreview && previewRows && previewRows.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-amber-400 block">
                    Sample Instruction Demonstrations:
                  </span>
                  {previewRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                    >
                      <div className="font-semibold text-slate-200">
                        #{idx + 1} Prompt: {row.prompt}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                        {row.response}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoadingPreview && (!previewRows || previewRows.length === 0) && (
                <div className="p-6 text-center text-xs text-slate-400">
                  <p>Preview rows not directly available, but the dataset can be downloaded using our universal schema extractor.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Limit: <strong className="text-amber-400">{sampleLimit} pairs</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewMeta(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownload(previewMeta);
                    setPreviewMeta(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download This Dataset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
