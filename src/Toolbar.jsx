import { HexColorPicker } from "react-colorful";

export default function Toolbar({
  color,
  width,
  modeLabel,
  isPanMode,
  onColorChange,
  onWidthChange,
}) {
  return (
    <section className="toolbar">
      <div className="toolbar-header">
        <span className={`mode-pill ${isPanMode ? "pan" : "draw"}`}>
          {modeLabel}
        </span>
        <span className="hint">Press D to toggle</span>
      </div>

      <label className="toolbar-group">
        <span className="toolbar-label">Pen size</span>
        <input
          className="slider"
          type="range"
          min="1"
          max="20"
          value={width}
          onChange={(event) => onWidthChange(Number(event.target.value))}
        />
        <span className="value-label">{width}px</span>
      </label>

      <div className="toolbar-group">
        <span className="toolbar-label">Color</span>
        <HexColorPicker color={color} onChange={onColorChange} />
        <div className="color-row">
          <span
            className="color-preview"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <code className="color-code">{color}</code>
        </div>
      </div>
    </section>
  );
}
