export const MAX_LABELS = 1000;
export const MAX_VALUE = 999_999;
export const MAX_DIGITS = 8;

export type GrowthMode = "fixed" | "inc" | "dec";

export interface SegmentConfig {
  start: number;
  end: number;
  mode: GrowthMode;
  step: number;
  digits: number;
}

export const DEFAULT_SEGMENTS: SegmentConfig[] = [
  { start: 403, end: 403, mode: "fixed", step: 1, digits: 0 },
  { start: 4, end: 20, mode: "inc", step: 1, digits: 2 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
  { start: 1, end: 1, mode: "fixed", step: 1, digits: 0 },
];

export type GenerateSuccess = { ok: true; codes: string[]; count: number };
export type GenerateFailure = { ok: false; error: string };
export type GenerateResult = GenerateSuccess | GenerateFailure;

function segmentName(index: number): string {
  return `第 ${index + 1} 段`;
}

function invalid(message: string): { error: string } {
  return { error: message };
}

function checkNonNegative(value: number, label: string): string | null {
  if (!Number.isInteger(value) || value < 0) {
    return `${label}须为非负整数`;
  }
  if (value > MAX_VALUE) {
    return `${label}不能超过 ${MAX_VALUE}`;
  }
  return null;
}

export function segmentLength(segment: SegmentConfig, index: number): { length: number } | { error: string } {
  const name = segmentName(index);
  const startError = checkNonNegative(segment.start, `${name}的起始值`);
  if (startError) return invalid(startError);

  const digitsError = checkNonNegative(segment.digits, `${name}的位数`);
  if (digitsError) return invalid(digitsError);
  if (segment.digits > MAX_DIGITS) return invalid(`${name}的位数不能超过 ${MAX_DIGITS}`);

  if (segment.mode === "fixed") return { length: 1 };
  if (segment.mode !== "inc" && segment.mode !== "dec") {
    return invalid(`${name}的增长方式无效`);
  }

  const stepError = checkNonNegative(segment.step, `${name}的步长`);
  if (stepError) return invalid(stepError);
  if (segment.step < 1) return invalid(`${name}的步长须为正整数`);

  const endError = checkNonNegative(segment.end, `${name}的结束值`);
  if (endError) return invalid(endError);
  if (segment.mode === "inc" && segment.end < segment.start) {
    return invalid(`${name}递增时，结束值不能小于起始值`);
  }
  if (segment.mode === "dec" && segment.end > segment.start) {
    return invalid(`${name}递减时，结束值不能大于起始值`);
  }

  const span = segment.mode === "inc" ? segment.end - segment.start : segment.start - segment.end;
  return { length: Math.floor(span / segment.step) + 1 };
}

function formatPart(value: number, digits: number): string {
  return String(value).padStart(digits, "0");
}

export function expandSegment(segment: SegmentConfig, index: number): { values: string[] } | { error: string } {
  const counted = segmentLength(segment, index);
  if ("error" in counted) return counted;
  if (counted.length > MAX_LABELS) {
    return invalid(`将生成超过 ${MAX_LABELS} 张，请缩小范围`);
  }

  const numbers: number[] = [];
  if (segment.mode === "fixed") {
    numbers.push(segment.start);
  } else if (segment.mode === "inc") {
    for (let value = segment.start; value <= segment.end; value += segment.step) {
      numbers.push(value);
    }
  } else {
    for (let value = segment.start; value >= segment.end; value -= segment.step) {
      numbers.push(value);
    }
  }

  return { values: numbers.map((value) => formatPart(value, segment.digits)) };
}

export function countLabels(segments: SegmentConfig[]): { count: number } | { error: string } {
  let count = 1;
  for (let index = 0; index < segments.length; index += 1) {
    const counted = segmentLength(segments[index], index);
    if ("error" in counted) return counted;
    if (counted.length > MAX_LABELS || count > MAX_LABELS / counted.length) {
      return invalid(`将生成超过 ${MAX_LABELS} 张，请缩小范围`);
    }
    count *= counted.length;
  }
  return { count };
}

export function generateCodes(segments: SegmentConfig[]): GenerateResult {
  const lists: string[][] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const expanded = expandSegment(segments[index], index);
    if ("error" in expanded) return { ok: false, error: expanded.error };
    lists.push(expanded.values);
  }

  const counted = countLabels(segments);
  if ("error" in counted) return { ok: false, error: counted.error };
  if (counted.count === 0) return { ok: false, error: "没有可生成的编号" };

  let codes = [""];
  for (const parts of lists) {
    const next: string[] = [];
    for (const prefix of codes) {
      for (const part of parts) {
        next.push(prefix ? `${prefix}.${part}` : part);
      }
    }
    codes = next;
  }

  return { ok: true, codes, count: codes.length };
}
