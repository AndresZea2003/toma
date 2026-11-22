import type { Scene, SceneEditRequest, StoryDraft, StoryRequest } from "../types";
import { demoStory } from "./demo";
import { normalizeDraft, normalizeScene } from "./util";

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("offline", "No se pudo contactar con el servidor local.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.code ?? "api", data.error ?? `Error ${res.status}`);
  return data as T;
}

export interface StoryResult {
  draft: StoryDraft;
  demo: boolean;
  notice?: string;
}

/** Genera con Claude; si no hay clave, cae al generador local. */
export async function createStory(req: StoryRequest): Promise<StoryResult> {
  try {
    const draft = normalizeDraft(await post<StoryDraft>("/api/story", req));
    if (!draft.scenes.length) throw new ApiError("bad_output", "La IA no devolvió escenas.");
    return { draft, demo: false };
  } catch (e) {
    if (e instanceof ApiError && (e.code === "no_key" || e.code === "offline")) {
      return {
        draft: demoStory(req),
        demo: true,
        notice:
          e.code === "no_key"
            ? "Modo demo: añade tu ANTHROPIC_API_KEY en .env para guiones escritos por IA."
            : "Modo demo: el servidor de IA no está disponible.",
      };
    }
    throw e;
  }
}

export async function aiEditScene(req: SceneEditRequest): Promise<Omit<Scene, "id">> {
  return normalizeScene(await post<Omit<Scene, "id">>("/api/scene", req));
}
