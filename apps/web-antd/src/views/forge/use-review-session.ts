import type { EditForgeReviewItemParams, ForgeReviewItem } from '#/api';

import { computed, ref } from 'vue';

import {
  editForgeReviewItemApi,
  getForgeAudioApi,
  getForgeReviewSessionApi,
  passForgeReviewItemApi,
  rejectForgeReviewItemApi,
} from '#/api';

/**
 * State machine behind the human-review workbench: session items, current
 * position, progress and the audio object-URL lifecycle. Kept framework-light
 * (no lifecycle hooks) so it can be unit-tested without mounting a component;
 * the page calls `cleanup()` from `onBeforeUnmount`.
 */
export function useReviewSession() {
  const sessionId = ref('');
  const items = ref<ForgeReviewItem[]>([]);
  const currentIndex = ref(0);
  const loading = ref(false);
  /** In-flight verdict/edit actions, used to disable the action buttons. */
  const acting = ref(false);
  const progress = ref({ reviewed: 0, total: 0 });

  const audioUrl = ref<null | string>(null);
  const audioLoading = ref(false);

  const currentItem = computed<ForgeReviewItem | null>(
    () => items.value[currentIndex.value] ?? null,
  );

  const pendingCount = computed(
    () => items.value.filter((item) => item.status === 'pending').length,
  );

  function recomputeProgress() {
    progress.value = {
      total: items.value.length,
      reviewed: items.value.filter((item) => item.status !== 'pending').length,
    };
  }

  function revokeAudioUrl() {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value);
      audioUrl.value = null;
    }
  }

  /** (Re)load the audio attachment of the given item as an object URL. */
  async function loadAudio(item: ForgeReviewItem | null) {
    revokeAudioUrl();
    if (!item?.media?.audio) return;
    audioLoading.value = true;
    try {
      const blob = await getForgeAudioApi(item.media.audio);
      audioUrl.value = URL.createObjectURL(blob);
    } catch {
      // Audio is optional; leave audioUrl empty on failure.
    } finally {
      audioLoading.value = false;
    }
  }

  function firstPendingIndex(list: ForgeReviewItem[]) {
    const index = list.findIndex((item) => item.status === 'pending');
    return index === -1 ? 0 : index;
  }

  /** Load a session and jump to its first pending item. */
  async function loadSession(id: string) {
    loading.value = true;
    try {
      const detail = await getForgeReviewSessionApi(id);
      sessionId.value = detail.session_id;
      items.value = detail.items;
      progress.value = detail.progress;
      currentIndex.value = firstPendingIndex(detail.items);
      await loadAudio(currentItem.value);
    } finally {
      loading.value = false;
    }
  }

  /** Move to a clamped index and refresh the audio attachment. */
  function goTo(index: number) {
    if (items.value.length === 0) return;
    const clamped = Math.min(Math.max(index, 0), items.value.length - 1);
    if (clamped === currentIndex.value && audioUrl.value) return;
    currentIndex.value = clamped;
    void loadAudio(currentItem.value);
  }

  function goPrev() {
    goTo(currentIndex.value - 1);
  }

  function goNext() {
    goTo(currentIndex.value + 1);
  }

  /** After a verdict, advance to the next pending item if there is one. */
  function advanceToNextPending(fromIndex: number) {
    const nextPending = items.value.findIndex(
      (item, index) => index > fromIndex && item.status === 'pending',
    );
    if (nextPending !== -1) {
      goTo(nextPending);
    }
  }

  function applyStatus(
    item: ForgeReviewItem,
    status: ForgeReviewItem['status'],
    patch?: Partial<ForgeReviewItem>,
  ) {
    const index = items.value.indexOf(item);
    if (index === -1) return;
    items.value[index] = { ...item, ...patch, status };
    recomputeProgress();
  }

  async function passCurrent() {
    const item = currentItem.value;
    if (!item || item.status !== 'pending' || acting.value) return;
    acting.value = true;
    try {
      await passForgeReviewItemApi(item.content_hash, sessionId.value);
      applyStatus(item, 'passed');
      advanceToNextPending(currentIndex.value);
    } finally {
      acting.value = false;
    }
  }

  async function rejectCurrent(reason?: string) {
    const item = currentItem.value;
    if (!item || item.status !== 'pending' || acting.value) return;
    acting.value = true;
    try {
      await rejectForgeReviewItemApi(
        item.content_hash,
        sessionId.value,
        reason,
      );
      applyStatus(item, 'rejected');
      advanceToNextPending(currentIndex.value);
    } finally {
      acting.value = false;
    }
  }

  /**
   * Submit an edit for the current item. Validation errors (422) are
   * re-thrown so the caller can display the server's reason; state is only
   * mutated on success.
   */
  async function editCurrent(
    fields: Omit<EditForgeReviewItemParams, 'session_id'>,
  ) {
    const item = currentItem.value;
    if (!item || acting.value) return;
    acting.value = true;
    try {
      await editForgeReviewItemApi(item.content_hash, {
        session_id: sessionId.value,
        ...fields,
      });
      applyStatus(item, 'edited', fields);
      advanceToNextPending(currentIndex.value);
    } finally {
      acting.value = false;
    }
  }

  /** Release the object URL; called by the page on unmount. */
  function cleanup() {
    revokeAudioUrl();
  }

  return {
    acting,
    audioLoading,
    audioUrl,
    cleanup,
    currentIndex,
    currentItem,
    editCurrent,
    goNext,
    goPrev,
    goTo,
    items,
    loadSession,
    loading,
    passCurrent,
    pendingCount,
    progress,
    rejectCurrent,
    sessionId,
  };
}
