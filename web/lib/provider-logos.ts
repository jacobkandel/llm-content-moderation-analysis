/**
 * Provider detection and logo URL generation for model display.
 *
 * Maps model IDs to their provider (OpenAI, Anthropic, Google, etc.)
 * and returns a Google Favicon URL for the provider's logo.
 */

export interface ProviderInfo {
  name: string;
  domain: string;
  color: string;
}

const PROVIDER_RULES: { match: (id: string) => boolean; info: ProviderInfo }[] = [
  {
    match: (id) => /\bgpt-|^openai\//i.test(id) || /^o[1-4]-/i.test(id),
    info: { name: 'OpenAI', domain: 'openai.com', color: '#10A37F' },
  },
  {
    match: (id) => /\bclaude|^anthropic\//i.test(id),
    info: { name: 'Anthropic', domain: 'anthropic.com', color: '#D4A574' },
  },
  {
    match: (id) => /\bgemini|^google\//i.test(id),
    info: { name: 'Google', domain: 'google.com', color: '#4285F4' },
  },
  {
    match: (id) => /\bllama|^meta\//i.test(id),
    info: { name: 'Meta', domain: 'meta.com', color: '#0668E1' },
  },
  {
    match: (id) => /\bmistral|^mistral\/|ministral/i.test(id),
    info: { name: 'Mistral AI', domain: 'mistral.ai', color: '#FF7000' },
  },
  {
    match: (id) => /\bdeepseek|^deepseek\//i.test(id),
    info: { name: 'DeepSeek', domain: 'deepseek.com', color: '#4D6BFE' },
  },
  {
    match: (id) => /\bqwen|^qwen\//i.test(id),
    info: { name: 'Alibaba', domain: 'qwenlm.ai', color: '#FF6A00' },
  },
  {
    match: (id) => /\bcommand|^cohere\//i.test(id),
    info: { name: 'Cohere', domain: 'cohere.com', color: '#39594D' },
  },
  {
    match: (id) => /\bdbrx|^databricks\//i.test(id),
    info: { name: 'Databricks', domain: 'databricks.com', color: '#FF3621' },
  },
  {
    match: (id) => /\byi-/i.test(id),
    info: { name: '01.AI', domain: '01.ai', color: '#6366F1' },
  },
  {
    match: (id) => /\bgemma|^google\/gemma/i.test(id),
    info: { name: 'Google', domain: 'google.com', color: '#4285F4' },
  },
];

const UNKNOWN_PROVIDER: ProviderInfo = {
  name: 'Unknown',
  domain: 'openrouter.ai',
  color: '#6B7280',
};

/**
 * Detect the provider from a model ID string.
 */
export function getProviderInfo(modelId: string): ProviderInfo {
  for (const rule of PROVIDER_RULES) {
    if (rule.match(modelId)) return rule.info;
  }
  return UNKNOWN_PROVIDER;
}

/**
 * Get a provider favicon URL via Google's favicon service.
 */
export function getLogoUrl(modelId: string): string {
  const { domain } = getProviderInfo(modelId);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Get the display name of the provider for a model.
 */
export function getProviderName(modelId: string): string {
  return getProviderInfo(modelId).name;
}
