import { useEffect } from "react";
import { Batch } from "./components/Batch";
import { Editor } from "./components/Editor";
import { Home } from "./components/Home";
import { Result } from "./components/Result";
import { Toasts } from "./components/ui";
import { ensureFonts } from "./engine/render";
import { useStore } from "./store";

export function App() {
  const view = useStore((s) => s.view);
  const projects = useStore((s) => s.projects);
  const go = useStore((s) => s.go);

  useEffect(() => {
    void ensureFonts();
  }, []);

  useEffect(() => {
    if ((view.name === "editor" || view.name === "result") && !projects.some((p) => p.id === view.id)) go({ name: "home" });
  }, [view, projects, go]);

  return (
    <>
      {view.name === "home" && <Home />}
      {view.name === "batch" && <Batch />}
      {view.name === "result" && <Result key={view.id} id={view.id} fresh={view.fresh} />}
      {view.name === "editor" && <Editor key={view.id} id={view.id} initialScene={view.scene} initialTab={view.tab} />}
      <Toasts />
    </>
  );
}
