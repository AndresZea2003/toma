import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRobot } from "../lib/robot";
import { useStore } from "../store";
import type { Project } from "../types";
import { Thumb } from "./ui";

export function SceneList({ project, selected, onSelect }: { project: Project; selected: number; onSelect: (i: number) => void }) {
  const { moveScene, duplicateScene, removeScene, addScene } = useStore.getState();
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const wide = project.format === "16:9";
  const runs = useRobot((st) => st.runs);

  return (
    <aside className="sheet scenes" aria-label="Escenas">
      <h2 className="panel-title">
        Escenas <span className="muted small">{project.scenes.length}</span>
      </h2>
      <ol className="scene-list">
        {project.scenes.map((s, i) => (
          <li
            key={s.id}
            className={["scene-item", i === selected && "on", over === i && drag !== i && "drop"].filter(Boolean).join(" ")}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(i);
            }}
            onDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
            onDrop={() => {
              if (drag !== null) {
                moveScene(project.id, drag, i);
                onSelect(i);
              }
              setDrag(null);
              setOver(null);
            }}
          >
            <button className="scene-main" onClick={() => onSelect(i)} aria-current={i === selected ? "step" : undefined}>
              <Thumb project={project} index={i} width={wide ? 70 : 46} className={wide ? "scene-thumb wide" : "scene-thumb"} />
              <span className="scene-text">
                <span className="scene-num">
                  {i + 1} · {s.duration.toFixed(1)} s{s.media && <i className="has-media" title="Con material importado" />}
                  {runs[s.id] && !s.media && <i className="robot-dot" title="Toma lo está generando" />}
                </span>
                <span className="scene-headline">{s.headline || "Sin texto"}</span>
              </span>
            </button>
            <span className="scene-actions">
              <button className="icon-btn sm" title="Subir" aria-label="Subir escena" disabled={i === 0} onClick={() => (moveScene(project.id, i, i - 1), onSelect(i - 1))}>
                <ArrowUp size={14} />
              </button>
              <button
                className="icon-btn sm"
                title="Bajar"
                aria-label="Bajar escena"
                disabled={i === project.scenes.length - 1}
                onClick={() => (moveScene(project.id, i, i + 1), onSelect(i + 1))}
              >
                <ArrowDown size={14} />
              </button>
              <button className="icon-btn sm" title="Duplicar" aria-label="Duplicar escena" onClick={() => duplicateScene(project.id, s.id)}>
                <Copy size={14} />
              </button>
              <button
                className="icon-btn sm danger"
                title="Eliminar"
                aria-label="Eliminar escena"
                disabled={project.scenes.length <= 1}
                onClick={() => {
                  removeScene(project.id, s.id);
                  onSelect(Math.max(0, Math.min(selected, project.scenes.length - 2)));
                }}
              >
                <Trash2 size={14} />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <button
        className="btn soft add-scene"
        onClick={() => {
          addScene(project.id, selected);
          onSelect(selected + 1);
        }}
      >
        <Plus size={17} /> Añadir escena
      </button>
    </aside>
  );
}
