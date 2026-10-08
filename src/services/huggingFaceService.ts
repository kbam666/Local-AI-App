import { HuggingFaceDatasetMeta, TrainingDataset, TrainingExample } from '../types/gguf';
import { saveDataset } from './trainingService';

export interface HuggingFaceSearchResult {
  success: boolean;
  query: string;
  datasets: HuggingFaceDatasetMeta[];
  source: string;
}

export interface HuggingFaceDownloadResult {
  success: boolean;
  datasetId: string;
  datasetName: string;
  rowsCount: number;
  examples: TrainingExample[];
  source: string;
  notice?: string;
  error?: string;
}

// Curated top-tier instruction tuning datasets on Hugging Face
export const FEATURED_HF_DATASETS: HuggingFaceDatasetMeta[] = [
  {
    id: 'tatsu-lab/alpaca',
    name: 'Stanford Alpaca 52K',
    author: 'tatsu-lab',
    description: 'The iconic 52,000 instruction-following demonstrations that started the open-source fine-tuning revolution.',
    downloads: 135000,
    likes: 1357,
    tags: ['alpaca', 'instruction-tuning', 'synthetic'],
    isInstructionTuning: true,
  },
  {
    id: 'databricks/databricks-dolly-15k',
    name: 'Databricks Dolly 15K',
    author: 'databricks',
    description: '15,000 high-quality human-generated prompt/response pairs across brainstorming, QA, summarization, and extraction.',
    downloads: 98000,
    likes: 1820,
    tags: ['human-curated', 'general-qa', 'summarization'],
    isInstructionTuning: true,
  },
  {
    id: 'HuggingFaceH4/no_robots',
    name: 'No Robots (HF-H4)',
    author: 'HuggingFaceH4',
    description: '10,000 instruction-following demonstrations created 100% by professional human annotators.',
    downloads: 45000,
    likes: 890,
    tags: ['human-curated', 'chat', 'conversational'],
    isInstructionTuning: true,
  },
  {
    id: 'Open-Orca/OpenOrca',
    name: 'OpenOrca Reasoning',
    author: 'Open-Orca',
    description: 'Step-by-step chain-of-thought demonstrations designed to instill deep reasoning into small models.',
    downloads: 87000,
    likes: 1100,
    tags: ['reasoning', 'chain-of-thought', 'orca'],
    isInstructionTuning: true,
  },
  {
    id: 'vicgalle/alpaca-gpt4',
    name: 'Alpaca GPT-4 Distillation',
    author: 'vicgalle',
    description: '52,000 instruction demonstrations answered by GPT-4 for superior student model distillation.',
    downloads: 65000,
    likes: 950,
    tags: ['gpt-4', 'distillation', 'instruction'],
    isInstructionTuning: true,
  },
  {
    id: 'fka/awesome-chatgpt-prompts',
    name: 'Awesome ChatGPT Prompts',
    author: 'fka',
    description: 'Curated collection of specialized prompts and personas for steering language models into specific roles.',
    downloads: 140000,
    likes: 2450,
    tags: ['personas', 'roleplay', 'prompts'],
    isInstructionTuning: true,
  },
  {
    id: 'yahma/alpaca-cleaned',
    name: 'Alpaca Cleaned',
    author: 'yahma',
    description: 'Cleaned and sanitized Stanford Alpaca dataset with hallucinations and formatting bugs removed.',
    downloads: 51000,
    likes: 640,
    tags: ['alpaca', 'cleaned', 'instruction'],
    isInstructionTuning: true,
  },
  {
    id: 'm-a-p/CodeFeedback-Filtered-Instruction',
    name: 'CodeFeedback Instructions',
    author: 'm-a-p',
    description: 'Multi-language programming instructions covering algorithmic problem solving, code debugging, and syntax.',
    downloads: 32000,
    likes: 420,
    tags: ['coding', 'python', 'feedback'],
    isInstructionTuning: true,
  },
  {
    id: 'roneneldan/TinyStories',
    name: 'TinyStories Synthetic',
    author: 'roneneldan',
    description: 'Synthetically generated tiny stories containing only words that a typical 3-to-4-year-old understands, perfect for SLMs.',
    downloads: 41000,
    likes: 680,
    tags: ['slm-specialized', 'stories', 'synthetic'],
    isInstructionTuning: true,
  },
  {
    id: 'FreedomIntelligence/medical-o1-reasoning-SFT',
    name: 'Medical Reasoning SFT',
    author: 'FreedomIntelligence',
    description: 'High-precision clinical diagnosis and medical QA instruction pairs with clinical verification traces.',
    downloads: 18000,
    likes: 350,
    tags: ['medical', 'clinical', 'reasoning'],
    isInstructionTuning: true,
  },
];

/**
 * Search Hugging Face Hub for fine-tuning datasets
 */
export async function searchHuggingFaceDatasets(query = ''): Promise<HuggingFaceDatasetMeta[]> {
  try {
    const res = await fetch(`/api/huggingface/datasets/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data: HuggingFaceSearchResult = await res.json();
      if (Array.isArray(data.datasets) && data.datasets.length > 0) {
        return data.datasets;
      }
    }
  } catch (err) {
    console.warn('[HuggingFace] Search API failed, using featured fallback:', err);
  }

  // Fallback to client-side filter of featured datasets
  if (!query) return FEATURED_HF_DATASETS;
  const q = query.toLowerCase();
  return FEATURED_HF_DATASETS.filter(
    (d) =>
      d.id.toLowerCase().includes(q) ||
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.tags && d.tags.some((t) => t.toLowerCase().includes(q)))
  );
}

/**
 * Download instruction rows from a Hugging Face dataset and convert into a TrainingDataset
 */
export async function downloadHuggingFaceDataset(
  datasetMeta: Partial<HuggingFaceDatasetMeta> & { id: string },
  limit = 30
): Promise<TrainingDataset> {
  const datasetId = datasetMeta.id;
  const datasetName = datasetMeta.name || datasetId.split('/').pop() || datasetId;

  const res = await fetch(
    `/api/huggingface/datasets/rows?dataset=${encodeURIComponent(datasetId)}&limit=${limit}&split=train`
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to download dataset from Hugging Face: ${errorText || res.statusText}`);
  }

  const data: HuggingFaceDownloadResult = await res.json();
  if (!data.success || !Array.isArray(data.examples) || data.examples.length === 0) {
    throw new Error(data.error || 'No instruction pairs could be extracted from this dataset.');
  }

  // Derive appropriate category
  let category = 'HuggingFace';
  const metaTags = datasetMeta.tags;
  if (metaTags && metaTags.length > 0) {
    category = metaTags[0].replace(/-/g, ' ');
    category = category.charAt(0).toUpperCase() + category.slice(1);
  } else if (datasetId.includes('code')) {
    category = 'Coding';
  } else if (datasetId.includes('medical')) {
    category = 'Medical';
  } else if (datasetId.includes('alpaca') || datasetId.includes('dolly')) {
    category = 'General Instruct';
  }

  const newDataset: TrainingDataset = {
    id: `hf-${datasetId.replace(/[/:\s]/g, '-')}-${Date.now()}`,
    name: `${datasetName} (${data.examples.length} pairs)`,
    description: datasetMeta.description || `Downloaded from Hugging Face: ${datasetId}`,
    category,
    examples: data.examples,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'huggingface',
    hfDatasetId: datasetId,
    downloads: datasetMeta.downloads,
    likes: datasetMeta.likes,
    isPreset: false,
  };

  // Persist directly to IndexedDB
  await saveDataset(newDataset);
  return newDataset;
}
