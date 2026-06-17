/**
 * FC9.8 — Shared TTS / audio coordinator.
 *
 * Before this, three players each tracked their own playback independently:
 *   - LibraryPanel  (page read)      → component-local `activeAudioRef`
 *   - StickyChat    (companion read) → `window._activeAudio`
 *   - PracticePanel (oral practice)  → `window._activeAudioPractice`
 *   - plus the browser `speechSynthesis` fallback
 * None of them stopped the others, so two (or more) voices could play at once.
 *
 * This module is the single source of truth for "what is playing right now".
 * Every player calls `stopAllAudio()` immediately BEFORE starting a new read/
 * listen, then `registerActiveAudio(el)` with its element (or `null` when it uses
 * `speechSynthesis`). Starting any new playback therefore always stops whatever is
 * currently playing → guaranteed no overlap. The existing per-player Stop buttons
 * keep working (they also call `stopAllAudio()`).
 */

let activeAudio: HTMLAudioElement | null = null;

/** Stop every kind of in-flight audio: the registered element, the legacy window
 *  globals (kept during migration), and browser speech synthesis. */
export function stopAllAudio(): void {
  if (typeof window === "undefined") return;

  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* no-op */
  }

  if (activeAudio) {
    try {
      activeAudio.pause();
    } catch {
      /* no-op */
    }
    activeAudio = null;
  }

  // Legacy globals from the pre-FC9.8 controllers — pause any that are still set.
  const w = window as any;
  ["_activeAudio", "_activeAudioPractice"].forEach((k) => {
    if (w[k]) {
      try {
        w[k].pause();
      } catch {
        /* no-op */
      }
      w[k] = null;
    }
  });
}

/** Register the element that is now playing (or `null` for speechSynthesis-only). */
export function registerActiveAudio(el: HTMLAudioElement | null): void {
  activeAudio = el;
}
