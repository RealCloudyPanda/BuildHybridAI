import "fake-indexeddb/auto";
import { renderHook, act, waitFor } from "@testing-library/react";
import * as store from "../src/store/drafts";
import { useDrafts } from "../src/store/useDrafts";
import { EXAMPLES } from "../src/fixtures/examples";

describe("drafts store", () => {
  it("creates, reads, sorts and deletes", async () => {
    const a = { ...store.newDraft(), updatedAt: 1 };
    const b = { ...store.newDraft(EXAMPLES[2]), updatedAt: 2 };
    await store.saveDraft(a);
    await store.saveDraft(b);
    expect((await store.getDraft(b.id))?.privacy).toBe("local-only");
    const ids = (await store.listDrafts()).map((d) => d.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
    await store.deleteDraft(a.id);
    expect(await store.getDraft(a.id)).toBeUndefined();
  });
});

describe("useDrafts", () => {
  it("keeps a deleted draft gone after a late update, autosave flush, and reload", async () => {
    const draft = { ...store.newDraft(), notes: "Draft to delete" };
    await store.saveDraft(draft);
    const removeFromStorage = store.deleteDraft;
    let finishDelete!: () => void;
    const deleting = new Promise<void>((resolve) => { finishDelete = resolve; });
    const deleteSpy = vi.spyOn(store, "deleteDraft").mockImplementation(async (id) => {
      await removeFromStorage(id);
      await deleting;
    });

    const { result, unmount } = renderHook(useDrafts);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    let removal!: Promise<void>;
    try {
      act(() => result.current.update(draft.id, { notes: "Pending edit" }));
      act(() => { removal = result.current.remove(draft.id); });
      await waitFor(async () => expect(await store.getDraft(draft.id)).toBeUndefined());
      act(() => result.current.update(draft.id, { notes: "Late run result" }));
      await act(() => result.current.flush());
    } finally {
      finishDelete();
      await act(() => removal);
      deleteSpy.mockRestore();
    }
    unmount();

    const reloaded = renderHook(useDrafts);
    await waitFor(() => expect(reloaded.result.current.loaded).toBe(true));
    expect(reloaded.result.current.drafts.map((d) => d.id)).not.toContain(draft.id);
    expect(await store.getDraft(draft.id)).toBeUndefined();
  });

  it("saves once after rapid edits", async () => {
    const spy = vi.spyOn(store, "saveDraft");
    const { result } = renderHook(() => useDrafts());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const id = result.current.activeId!;
    spy.mockClear();
    act(() => {
      for (const n of ["a", "ab", "abc"]) result.current.update(id, { notes: n });
    });
    await new Promise((r) => setTimeout(r, 500));
    const forId = spy.mock.calls.filter(([d]) => d.id === id);
    expect(forId).toHaveLength(1);
    expect(forId[0][0].notes).toBe("abc");
  });
});
