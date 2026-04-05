import { useMemo, useState } from "react";
import Canvas from "./Canvas.jsx";
import Toolbar from "./Toolbar.jsx";

const DEFAULT_COLOR = "#111827";
const DEFAULT_WIDTH = 4;

export default function App() {
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isPanMode, setIsPanMode] = useState(false);

  const toolbarLabel = useMemo(
    () => (isPanMode ? "Pan mode" : "Draw mode"),
    [isPanMode],
  );

  return (
    <main className="app-shell">
      <Canvas
        color={color}
        width={width}
        isPanMode={isPanMode}
        onTogglePanMode={setIsPanMode}
      />
      <Toolbar
        color={color}
        width={width}
        modeLabel={toolbarLabel}
        isPanMode={isPanMode}
        onColorChange={setColor}
        onWidthChange={setWidth}
      />
    </main>
  );
}
