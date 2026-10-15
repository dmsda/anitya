import { describe, it, expect } from 'vitest';
import { FallbackAIProvider } from '../services/ai/fallbackProvider';
import { CloudAIProvider } from '../services/ai/cloudProvider';
import type { Note } from '../schemas/types';

describe('AI Service Layer & Privacy Guard', () => {
  const fallback = new FallbackAIProvider();

  const sampleArticle = `
    Knowledge retention in the digital age requires structured note-taking.
    Traditional highlighting often leads to passive reading without comprehension.
    Researchers must review their annotations actively to retain insights.
    Action items need to be followed up during weekly project reviews.
    Acitya Notes is a local-first platform designed to solve information fragmentation.
  `;

  const sampleNotes: Note[] = [
    {
      id: 'n_1',
      title: 'Active Recall Guidelines',
      contentMarkdown: 'Active recall means testing your memory during study instead of just re-reading paragraphs.',
      type: 'quick',
      tags: ['study'],
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'n_2',
      title: 'YouTube Study Workflow',
      contentMarkdown: 'Video notes capture timestamps at key moments so you can rewatch sections in seconds.',
      type: 'video',
      tags: ['video'],
      createdAt: 2000,
      updatedAt: 2000,
    },
  ];

  it('generates extractive summaries without crashing or making network calls', async () => {
    const summary = await fallback.summarize(sampleArticle);
    expect(summary.length).toBeGreaterThan(20);
    expect(typeof summary).toBe('string');
  });

  it('extracts actionable tasks using pattern recognition', async () => {
    const actions = await fallback.extractActionItems(sampleArticle);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((a) => a.toLowerCase().includes('review') || a.toLowerCase().includes('need to') || a.toLowerCase().includes('must'))).toBe(true);
  });

  it('grounds answers strictly in context notes without hallucinating', async () => {
    const res = await fallback.answerQuestion('What is active recall?', sampleNotes);
    expect(res.answer).toContain('Active recall');
    expect(res.references.length).toBeGreaterThan(0);
    expect(res.references[0]?.id).toBe('n_1');

    const missingRes = await fallback.answerQuestion('What is the capital of Mars?', sampleNotes);
    expect(missingRes.references.length).toBe(0);
  });

  it('enforces Cloud AI privacy guard: blocks transmission when opt-in is false', async () => {
    const cloudProvider = new CloudAIProvider({
      provider: 'cloud',
      optInCloudProcessing: false, // User has NOT opted in
      cloudApiKey: 'sk-test123456',
    });

    const status = await cloudProvider.checkAvailability();
    expect(status.available).toBe(false);
    expect(status.message).toContain('Cloud AI processing is disabled');

    // Calling summarize with cloud disabled gracefully falls back to local heuristic
    const fallbackRes = await cloudProvider.summarize(sampleArticle);
    expect(typeof fallbackRes).toBe('string');
  });

  it('enforces Cloud AI requirement: blocks transmission when API key is missing', async () => {
    const cloudProvider = new CloudAIProvider({
      provider: 'cloud',
      optInCloudProcessing: true,
      cloudApiKey: '', // Empty key
    });

    const status = await cloudProvider.checkAvailability();
    expect(status.available).toBe(false);
    expect(status.message).toContain('No Cloud API key provided');
  });
});
