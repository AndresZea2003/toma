import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Project, Scene, StoryDraft, StoryRequest } from "./types";
import { uid } from "./lib/util";

export type View =
  | { name: "home" }
  | { name: "result"; id: string; fresh?: boolean }
  | { name: "editor"; id: string; scene?: number; tab?: "texto" | "visual" | "material" }
  | { name: "batch" };

export interface Toast {
  id: string;
  text: string;
  tone?: "info" | "error" | "success";
}

interface State {
  projects: Project[];
  view: View;
  toasts: Toast[];
  go: (v: View) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismiss: (id: string) => void;
  addFromDraft: (draft: StoryDraft, req: StoryRequest, demo: boolean) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  updateScene: (pid: string, sid: string, patch: Partial<Scene>) => void;
  addScene: (pid: string, afterIndex: number) => string;
  duplicateScene: (pid: string, sid: string) => void;
  removeScene: (pid: string, sid: string) => void;
  moveScene: (pid: string, from: number, to: number) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
}

const touch = (p: Project, patch: Partial<Project>): Project => ({ ...p, ...patch, updatedAt: Date.now() });

let quotaWarned = false;
const safeStorage = createJSONStorage(() => ({
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      if (!quotaWarned) {
        quotaWarned = true;
        useStore.getState().toast("El almacenamiento local está lleno: borra historias o imágenes para seguir guardando.", "error");
      }
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* nada */
    }
  },
}));

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const mapProject = (id: string, fn: (p: Project) => Project) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) }));
      return {
        projects: [],
        view: { name: "home" },
        toasts: [],
        go: (view) => set({ view }),
        toast: (text, tone = "info") => {
          const id = uid();
          set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
          setTimeout(() => get().dismiss(id), 5200);
        },
        dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        addFromDraft: (draft, req, demo) => {
          const now = Date.now();
          const project: Project = {
            id: uid(),
            title: draft.title,
            idea: req.idea,
            language: req.language,
            tone: req.tone,
            format: req.format,
            theme: req.theme ?? draft.theme,
            music: draft.music,
            captions: true,
            voice: false,
            styleGuide: draft.styleGuide,
            scenes: draft.scenes.map((s) => ({ ...s, id: uid() })),
            createdAt: now,
            updatedAt: now,
            demo,
          };
          set((s) => ({ projects: [project, ...s.projects] }));
          return project;
        },
        updateProject: (id, patch) => mapProject(id, (p) => touch(p, patch)),
        updateScene: (pid, sid, patch) =>
          mapProject(pid, (p) => touch(p, { scenes: p.scenes.map((sc) => (sc.id === sid ? { ...sc, ...patch } : sc)) })),
        addScene: (pid, afterIndex) => {
          const id = uid();
          mapProject(pid, (p) => {
            const ref = p.scenes[afterIndex] ?? p.scenes[p.scenes.length - 1];
            const scene: Scene = {
              id,
              headline: "Nueva escena",
              narration: "",
              duration: 4,
              background: ref?.background ?? "aurora",
              actors: [{ emoji: "✨", motion: "float", size: "m", x: 0.5, y: 0.68 }],
              camera: "zoom-in",
              transition: "fade",
              textStyle: "caption",
              visualPrompt: ref?.visualPrompt ?? "",
            };
            const scenes = [...p.scenes];
            scenes.splice(afterIndex + 1, 0, scene);
            return touch(p, { scenes });
          });
          return id;
        },
        duplicateScene: (pid, sid) =>
          mapProject(pid, (p) => {
            const i = p.scenes.findIndex((s) => s.id === sid);
            if (i < 0) return p;
            const scenes = [...p.scenes];
            scenes.splice(i + 1, 0, { ...structuredClone(p.scenes[i]), id: uid() });
            return touch(p, { scenes });
          }),
        removeScene: (pid, sid) =>
          mapProject(pid, (p) => (p.scenes.length <= 1 ? p : touch(p, { scenes: p.scenes.filter((s) => s.id !== sid) }))),
        moveScene: (pid, from, to) =>
          mapProject(pid, (p) => {
            if (to < 0 || to >= p.scenes.length || from === to) return p;
            const scenes = [...p.scenes];
            const [m] = scenes.splice(from, 1);
            scenes.splice(to, 0, m);
            return touch(p, { scenes });
          }),
        duplicateProject: (id) => {
          const p = get().projects.find((x) => x.id === id);
          if (!p) return;
          const now = Date.now();
          const copy: Project = {
            ...structuredClone(p),
            id: uid(),
            title: `${p.title} (copia)`,
            scenes: p.scenes.map((s) => ({ ...structuredClone(s), id: uid() })),
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({ projects: [copy, ...s.projects] }));
        },
        deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      };
    },
    {
      name: "lienzo-studio",
      version: 2,
      storage: safeStorage,
      migrate: (persisted, version) => {
        const s = persisted as { projects?: Project[] };
        if (version < 2 && s.projects) {
          s.projects = s.projects.map((p) => ({
            ...p,
            styleGuide: p.styleGuide ?? "",
            scenes: p.scenes.map((sc) => ({ ...sc, visualPrompt: sc.visualPrompt ?? "" })),
          }));
        }
        return s as State;
      },
      partialize: (s) => ({ projects: s.projects }) as State,
    },
  ),
);

export const useProject = (id: string) => useStore((s) => s.projects.find((p) => p.id === id));
