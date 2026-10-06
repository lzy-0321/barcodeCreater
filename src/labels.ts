import JsBarcode from "jsbarcode";

export type LabelSize = "15x10" | "7x4";

const SIZE_CLASS: Record<LabelSize, string> = {
  "15x10": "label-15x10",
  "7x4": "label-7x4",
};

export function renderLabels(container: HTMLElement, codes: string[], size: LabelSize): void {
  container.replaceChildren();
  const tall = size === "15x10";
  const moduleWidth = 2;

  for (const code of codes) {
    const label = document.createElement("article");
    label.className = `label ${SIZE_CLASS[size]}`;

    const barcodeWrap = document.createElement("div");
    barcodeWrap.className = "barcode-wrap";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `Code 39 ${code}`);

    const caption = document.createElement("p");
    caption.textContent = code;

    barcodeWrap.append(svg);
    label.append(barcodeWrap, caption);
    container.append(label);

    JsBarcode(svg, code, {
      format: "CODE39",
      displayValue: false,
      margin: moduleWidth * 10,
      background: "#ffffff",
      lineColor: "#000000",
      width: moduleWidth,
      height: tall ? 160 : 72,
    });

    const drawnWidth = Number(svg.getAttribute("width"));
    const drawnHeight = Number(svg.getAttribute("height"));
    if (drawnWidth > 0 && drawnHeight > 0) {
      svg.setAttribute("viewBox", `0 0 ${drawnWidth} ${drawnHeight}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }
  }
}
