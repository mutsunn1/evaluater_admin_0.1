import type { ForgeReviewItem } from '#/api';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeItem(
  overrides: Partial<ForgeReviewItem> & { content_hash: string },
): ForgeReviewItem {
  return {
    id: overrides.content_hash,
    level: 'HSK4',
    skill: 'reading',
    question_type: 'multiple_choice',
    stem: '题干',
    options: ['甲', '乙'],
    answer: 'A',
    explanation: '解析',
    media: null,
    source_file: 'out.jsonl',
    status: 'pending',
    ...overrides,
  };
}

function sessionDetail(items: ForgeReviewItem[]) {
  return {
    session_id: 'rs-1',
    items,
    progress: {
      total: items.length,
      reviewed: items.filter((item) => item.status !== 'pending').length,
    },
  };
}

/** Flush pending microtasks (fire-and-forget audio loads). */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe('useReviewSession', () => {
  beforeEach(() => {
    vi.resetModules();
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  async function setup(apiMocks: {
    audio?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
    detail?: ReturnType<typeof vi.fn>;
    edit?: ReturnType<typeof vi.fn>;
    pass?: ReturnType<typeof vi.fn>;
    reject?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('#/api', () => ({
      createForgeReviewSessionApi: apiMocks.create ?? vi.fn(),
      getForgeReviewSessionApi: apiMocks.detail ?? vi.fn(),
      passForgeReviewItemApi: apiMocks.pass ?? vi.fn(),
      rejectForgeReviewItemApi: apiMocks.reject ?? vi.fn(),
      editForgeReviewItemApi: apiMocks.edit ?? vi.fn(),
      getForgeAudioApi: apiMocks.audio ?? vi.fn(),
    }));
    const { useReviewSession } = await import('./use-review-session');
    return useReviewSession();
  }

  it('loads a session and selects the first pending item', async () => {
    const items = [
      makeItem({ content_hash: 'h1', status: 'passed' }),
      makeItem({ content_hash: 'h2' }),
      makeItem({ content_hash: 'h3' }),
    ];
    const store = await setup({
      detail: vi.fn().mockResolvedValue(sessionDetail(items)),
    });
    await store.loadSession('rs-1');
    expect(store.sessionId.value).toBe('rs-1');
    expect(store.items.value).toHaveLength(3);
    expect(store.progress.value).toEqual({ reviewed: 1, total: 3 });
    expect(store.currentIndex.value).toBe(1);
    expect(store.currentItem.value?.content_hash).toBe('h2');
  });

  it('clamps navigation and loads audio with an object URL', async () => {
    const items = [
      makeItem({
        content_hash: 'h1',
        media: { audio: 'a.mp3', transcript: '文本' },
      }),
      makeItem({ content_hash: 'h2' }),
    ];
    const mockAudio = vi.fn().mockResolvedValue(new Blob(['x']));
    const store = await setup({
      audio: mockAudio,
      detail: vi.fn().mockResolvedValue(sessionDetail(items)),
    });
    await store.loadSession('rs-1');
    expect(store.currentIndex.value).toBe(0);
    expect(mockAudio).toHaveBeenCalledWith('a.mp3');
    expect(store.audioUrl.value).toBe('blob:mock');

    // Move to the item without audio: previous object URL is revoked.
    store.goNext();
    await flush();
    expect(store.currentIndex.value).toBe(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(store.audioUrl.value).toBeNull();

    // Navigation is clamped at both ends.
    store.goNext();
    expect(store.currentIndex.value).toBe(1);
    store.goTo(99);
    expect(store.currentIndex.value).toBe(1);
    store.goTo(-5);
    expect(store.currentIndex.value).toBe(0);
  });

  it('passes the current item, recomputes progress and advances', async () => {
    const items = [
      makeItem({ content_hash: 'h1' }),
      makeItem({ content_hash: 'h2' }),
      makeItem({ content_hash: 'h3', status: 'passed' }),
    ];
    const mockPass = vi
      .fn()
      .mockResolvedValue({ content_hash: 'h1', status: 'passed' });
    const store = await setup({
      detail: vi.fn().mockResolvedValue(sessionDetail(items)),
      pass: mockPass,
    });
    await store.loadSession('rs-1');
    await store.passCurrent();
    expect(mockPass).toHaveBeenCalledWith('h1', 'rs-1');
    expect(store.items.value[0]?.status).toBe('passed');
    expect(store.progress.value).toEqual({ reviewed: 2, total: 3 });
    expect(store.currentIndex.value).toBe(1);
  });

  it('rejects the current item with a reason and stays at the end', async () => {
    const items = [makeItem({ content_hash: 'h1' })];
    const mockReject = vi
      .fn()
      .mockResolvedValue({ content_hash: 'h1', status: 'rejected' });
    const store = await setup({
      detail: vi.fn().mockResolvedValue(sessionDetail(items)),
      reject: mockReject,
    });
    await store.loadSession('rs-1');
    await store.rejectCurrent('答案错误');
    expect(mockReject).toHaveBeenCalledWith('h1', 'rs-1', '答案错误');
    expect(store.items.value[0]?.status).toBe('rejected');
    expect(store.progress.value).toEqual({ reviewed: 1, total: 1 });
    // No pending item left: position does not move.
    expect(store.currentIndex.value).toBe(0);
  });

  it('submits an edit and merges the fields on success', async () => {
    const items = [
      makeItem({ content_hash: 'h1' }),
      makeItem({ content_hash: 'h2' }),
    ];
    const mockEdit = vi
      .fn()
      .mockResolvedValue({ content_hash: 'h1', status: 'edited' });
    const store = await setup({
      detail: vi.fn().mockResolvedValue(sessionDetail(items)),
      edit: mockEdit,
    });
    await store.loadSession('rs-1');
    const fields = {
      stem: '新题干',
      options: ['甲', '乙', '丙'],
      answer: 'B',
      explanation: '新解析',
    };
    await store.editCurrent(fields);
    expect(mockEdit).toHaveBeenCalledWith('h1', {
      session_id: 'rs-1',
      ...fields,
    });
    const edited = store.items.value[0];
    expect(edited?.status).toBe('edited');
    expect(edited?.stem).toBe('新题干');
    expect(edited?.options).toEqual(['甲', '乙', '丙']);
    expect(store.currentIndex.value).toBe(1);
  });

  it('keeps state untouched and rethrows when the edit fails (422)', async () => {
    const items = [makeItem({ content_hash: 'h1' })];
    const serverError = { detail: [{ msg: 'answer required' }] };
    const store = await setup({
      detail: vi.fn().mockResolvedValue(sessionDetail(items)),
      edit: vi.fn().mockRejectedValue(serverError),
    });
    await store.loadSession('rs-1');
    const error = await store
      .editCurrent({ stem: 'x', options: ['甲'], answer: '', explanation: '' })
      .catch((error_: unknown) => error_);
    expect(error).toEqual(serverError);
    expect(store.items.value[0]?.status).toBe('pending');
    expect(store.items.value[0]?.stem).toBe('题干');
    expect(store.progress.value).toEqual({ reviewed: 0, total: 1 });
    expect(store.acting.value).toBe(false);
  });

  it('does not send duplicate verdicts while an action is in flight', async () => {
    const items = [makeItem({ content_hash: 'h1' })];
    let resolvePass: (value: unknown) => void = () => {};
    const mockPass = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvePass = resolve;
        }),
    );
    const store = await setup({
      detail: vi.fn().mockResolvedValue(sessionDetail(items)),
      pass: mockPass,
    });
    await store.loadSession('rs-1');
    const first = store.passCurrent();
    await store.passCurrent();
    expect(mockPass).toHaveBeenCalledTimes(1);
    resolvePass({ content_hash: 'h1', status: 'passed' });
    await first;
  });

  it('releases the object URL on cleanup', async () => {
    const items = [makeItem({ content_hash: 'h1', media: { audio: 'a.mp3' } })];
    const store = await setup({
      audio: vi.fn().mockResolvedValue(new Blob(['x'])),
      detail: vi.fn().mockResolvedValue(sessionDetail(items)),
    });
    await store.loadSession('rs-1');
    expect(store.audioUrl.value).toBe('blob:mock');
    store.cleanup();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(store.audioUrl.value).toBeNull();
  });
});
