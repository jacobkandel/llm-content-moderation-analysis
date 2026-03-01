import { describe, it, expect } from 'vitest';
import { getProviderInfo, getLogoUrl, getProviderName } from '@/lib/provider-logos';

describe('getProviderInfo', () => {
    it('identifies OpenAI from gpt prefix', () => {
        expect(getProviderInfo('openai/gpt-4o').name).toBe('OpenAI');
        expect(getProviderInfo('gpt-4-turbo').name).toBe('OpenAI');
    });

    it('identifies OpenAI from o-series models', () => {
        expect(getProviderInfo('o1-mini').name).toBe('OpenAI');
        expect(getProviderInfo('o3-mini').name).toBe('OpenAI');
        expect(getProviderInfo('o4-mini').name).toBe('OpenAI');
    });

    it('identifies Anthropic from claude prefix', () => {
        expect(getProviderInfo('claude-3-5-sonnet').name).toBe('Anthropic');
        expect(getProviderInfo('anthropic/claude-opus').name).toBe('Anthropic');
    });

    it('identifies Mistral', () => {
        expect(getProviderInfo('mistral/mistral-large').name).toBe('Mistral AI');
        expect(getProviderInfo('ministral-8b').name).toBe('Mistral AI');
    });

    it('identifies Meta/Llama', () => {
        expect(getProviderInfo('meta/llama-3').name).toBe('Meta');
        expect(getProviderInfo('llama-3.1-70b').name).toBe('Meta');
    });

    it('identifies DeepSeek', () => {
        expect(getProviderInfo('deepseek/deepseek-r1').name).toBe('DeepSeek');
    });

    it('identifies Google/Gemini', () => {
        expect(getProviderInfo('google/gemini-pro').name).toBe('Google');
        expect(getProviderInfo('gemini-1.5-flash').name).toBe('Google');
    });

    it('returns a logo URL containing the provider domain', () => {
        const url = getLogoUrl('openai/gpt-4o');
        expect(url).toContain('openai.com');
        expect(url).toContain('google.com/s2/favicons');
    });

    it('returns correct provider name string', () => {
        expect(getProviderName('claude-3-haiku')).toBe('Anthropic');
        expect(getProviderName('gpt-4o')).toBe('OpenAI');
    });
});
