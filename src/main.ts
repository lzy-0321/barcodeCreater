import "./style.css";
import {
  DEFAULT_SEGMENTS,
  countLabels,
  generateCodes,
  type GrowthMode,
  type SegmentConfig,
} from "./generate";
import { renderLabels, type LabelSize } from "./labels";

const MODES: { value: GrowthMode; label: string }[] = [
  { value: "fixed", label: "固定" },
  { value: "inc", label: "递增" },
  { value: "dec", label: "递减" },
];

const form = document.querySelector<HTMLFormElement>("#form")!;
const segmentsRoot = document.querySelector<HTMLElement>("#segments")!;
const countEl = document.querySelector<HTMLElement>("#count")!;
const errorEl = document.querySelector<HTMLElement>("#error")!;
const errorText = document.querySelector<HTMLElement>("#error-text")!;
const preview = document.querySelector<HTMLElement>("#preview")!;
const previewHint = document.querySelector<HTMLElement>("#preview-hint")!;
const printLabelBtn = document.querySelector<HTMLButtonElement>("#print-label")!;
const printA4Btn = document.querySelector<HTMLButtonElement>("#print-a4")!;
const pageSize = document.querySelector<HTMLStyleElement>("#page-size")!;
const sizeSwitch = document.querySelector<HTMLElement>("#size-switch")!;

let currentCodes: string[] = [];
let opened = false;

function field(name: string, label: string, value: number, min: number): HTMLLabelElement {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const title = document.createElement("span");
  title.className = "field-label";
  title.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.name = name;
  input.min = String(min);
  input.step = "1";
  input.required = true;
  input.value = String(value);
  input.inputMode = "numeric";
  wrapper.append(title, input);
  return wrapper;
}

function buildSegments(): void {
  DEFAULT_SEGMENTS.forEach((segment, index) => {
    const row = document.createElement("div");
    row.className = "segment";
    row.dataset.index = String(index);

    const legend = document.createElement("div");
    legend.className = "segment-name";
    legend.textContent = `第 ${index + 1} 段`;

    const modeLabel = document.createElement("label");
    modeLabel.className = "field";
    const modeTitle = document.createElement("span");
    modeTitle.className = "field-label";
    modeTitle.textContent = "增长方式";
    const select = document.createElement("select");
    select.name = "mode";
    for (const mode of MODES) {
      const option = document.createElement("option");
      option.value = mode.value;
      option.textContent = mode.label;
      option.selected = mode.value === segment.mode;
      select.append(option);
    }
    modeLabel.append(modeTitle, select);

    row.append(
      legend,
      field("start", "起始值", segment.start, 0),
      field("end", "结束值", segment.end, 0),
      modeLabel,
      field("step", "步长", segment.step, 1),
      field("digits", "位数", segment.digits, 0),
    );
    segmentsRoot.append(row);
    syncMode(row);
    select.addEventListener("change", () => syncMode(row));
  });
}

function syncMode(row: HTMLElement): void {
  const mode = row.querySelector<HTMLSelectElement>('[name="mode"]')!.value;
  const locked = mode === "fixed";
  for (const name of ["end", "step"]) {
    const input = row.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    input.disabled = locked;
  }
}

function readInteger(input: HTMLInputElement): number {
  return Number(input.value);
}

function readSegments(): SegmentConfig[] {
  return [...segmentsRoot.querySelectorAll<HTMLElement>(".segment")].map((row) => ({
    start: readInteger(row.querySelector<HTMLInputElement>('[name="start"]')!),
    end: readInteger(row.querySelector<HTMLInputElement>('[name="end"]')!),
    mode: row.querySelector<HTMLSelectElement>('[name="mode"]')!.value as GrowthMode,
    step: readInteger(row.querySelector<HTMLInputElement>('[name="step"]')!),
    digits: readInteger(row.querySelector<HTMLInputElement>('[name="digits"]')!),
  }));
}

function selectedSize(): LabelSize {
  const selected = sizeSwitch.querySelector<HTMLInputElement>('input[name="size"]:checked');
  return selected?.value === "7x4" ? "7x4" : "15x10";
}

function setPrintEnabled(enabled: boolean): void {
  printLabelBtn.disabled = !enabled;
  printA4Btn.disabled = !enabled;
}

function setError(message: string): void {
  errorText.textContent = message;
  errorEl.hidden = message.length === 0;
}

function renderCount(count: number | null, tick: boolean): void {
  countEl.replaceChildren();
  if (count === null) {
    countEl.textContent = "无法计算张数";
    return;
  }
  countEl.append("将生成 ");
  const number = document.createElement("strong");
  number.className = tick ? "count-num tick" : "count-num";
  number.textContent = String(count);
  countEl.append(number, " 张");
}

function placeThumb(animate: boolean): void {
  const checked = sizeSwitch.querySelector<HTMLInputElement>('input[name="size"]:checked');
  const choice = checked?.closest("label");
  const thumb = sizeSwitch.querySelector<HTMLElement>(".segmented-thumb");
  if (!checked || !choice || !thumb) return;
  if (!animate) sizeSwitch.classList.remove("is-ready");
  const box = sizeSwitch.getBoundingClientRect();
  const item = choice.getBoundingClientRect();
  thumb.style.width = `${item.width}px`;
  thumb.style.height = `${item.height}px`;
  thumb.style.transform = `translate(${item.left - box.left}px, ${item.top - box.top}px)`;
  if (!animate) requestAnimationFrame(() => sizeSwitch.classList.add("is-ready"));
}

function setLabelSizeClass(size: LabelSize): void {
  const on = size === "15x10" ? "label-15x10" : "label-7x4";
  const off = size === "15x10" ? "label-7x4" : "label-15x10";
  preview.querySelectorAll<HTMLElement>(".label").forEach((label) => {
    label.classList.remove(off);
    label.classList.add(on);
  });
}

function sameCodes(codes: string[]): boolean {
  return codes.length === currentCodes.length && codes.every((code, index) => code === currentCodes[index]);
}

function refreshCount(): void {
  const counted = countLabels(readSegments());
  if ("error" in counted) {
    renderCount(null, false);
    setError(counted.error);
    return;
  }
  setError("");
  renderCount(counted.count, false);
}

function showLabels(codes: string[]): void {
  const size = selectedSize();
  const reuse = sameCodes(codes) && preview.childElementCount === codes.length;
  currentCodes = codes;
  document.body.dataset.size = size;
  if (reuse) setLabelSizeClass(size);
  else renderLabels(preview, codes, size);
  previewHint.textContent = "屏幕为缩小预览，打印为实际尺寸";
  setPrintEnabled(codes.length > 0);
}

function generate(): void {
  const result = generateCodes(readSegments());
  if (!result.ok) {
    currentCodes = [];
    preview.replaceChildren();
    previewHint.textContent = "";
    renderCount(null, false);
    setError(result.error);
    setPrintEnabled(false);
    return;
  }
  setError("");
  renderCount(result.count, opened);
  opened = true;
  showLabels(result.codes);
}

function applyPage(mode: "label" | "a4"): void {
  const size = selectedSize();
  document.body.dataset.print = mode;
  document.body.dataset.size = size;
  const page = mode === "a4" ? "A4" : size === "15x10" ? "15cm 10cm" : "7cm 4cm";
  const margin = mode === "a4" ? "6mm" : "0";
  pageSize.textContent = `@page { size: ${page}; margin: ${margin}; }`;
}

buildSegments();
refreshCount();
generate();
placeThumb(false);
window.addEventListener("resize", () => placeThumb(false));

form.addEventListener("input", () => {
  refreshCount();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});

sizeSwitch.querySelectorAll<HTMLInputElement>('input[name="size"]').forEach((input) => {
  input.addEventListener("change", () => {
    placeThumb(true);
    if (currentCodes.length > 0) showLabels(currentCodes);
  });
});

printLabelBtn.addEventListener("click", () => {
  applyPage("label");
  window.print();
});

printA4Btn.addEventListener("click", () => {
  applyPage("a4");
  window.print();
});

window.addEventListener("beforeprint", () => {
  if (!document.body.dataset.print) applyPage("label");
});

window.addEventListener("afterprint", () => {
  document.body.removeAttribute("data-print");
});
