export interface ParsedDeal {
  brand: string;
  title: string;
  amount: number;
  deadline: string; // ISO date string or empty
  memo: string;
}

// ─── 금액 파싱 ───────────────────────────────────────────────
function parseAmount(text: string): number {
  const normalized = text.trim().replace(/,/g, '');
  if (/^\d+$/.test(normalized)) return parseInt(normalized);

  // "300만원", "300만", "3,000,000원", "300만 원"
  const manMatch = text.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  if (manMatch) return Math.round(parseFloat(manMatch[1]) * 10000);

  const eokMatch = text.match(/(\d+(?:\.\d+)?)\s*억\s*원?/);
  if (eokMatch) return Math.round(parseFloat(eokMatch[1]) * 100000000);

  const rawMatch = text.match(/(\d{1,3}(?:[,\s]\d{3})+)\s*원/);
  if (rawMatch) return parseInt(rawMatch[1].replace(/[,\s]/g, ''));

  const simpleMatch = text.match(/(\d+)\s*원/);
  if (simpleMatch) return parseInt(simpleMatch[1]);

  return 0;
}

// ─── 날짜 파싱 ───────────────────────────────────────────────
function parseDeadline(text: string): string {
  const year = new Date().getFullYear();

  // "6월 15일", "6월15일"
  const koMatch = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (koMatch) {
    const m = koMatch[1].padStart(2, '0');
    const d = koMatch[2].padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // "2026-06-15", "2026/06/15"
  const isoMatch = text.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (isoMatch) {
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${isoMatch[1]}-${m}-${d}`;
  }

  // "6/15", "06/15"
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (slashMatch) {
    const m = slashMatch[1].padStart(2, '0');
    const d = slashMatch[2].padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  return '';
}

function splitSpreadsheetLine(line: string): string[] {
  const delimiter = line.includes('\t') ? '\t' : ',';
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

function headerIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((header) =>
    candidates.some((candidate) => header.toLowerCase().replace(/\s/g, '').includes(candidate))
  );
}

function parseSpreadsheetText(text: string): ParsedDeal | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0 || !lines.some((line) => line.includes('\t') || line.includes(','))) return null;

  const firstCells = splitSpreadsheetLine(lines[0]);
  if (firstCells.length < 2) return null;

  const headers = firstCells.map((cell) => cell.toLowerCase().replace(/\s/g, ''));
  const brandHeader = headerIndex(headers, ['브랜드', '브랜드명', 'brand']);
  const titleHeader = headerIndex(headers, ['제목', '콘텐츠', '내용', 'title']);
  const amountHeader = headerIndex(headers, ['금액', '단가', 'amount', 'price']);
  const deadlineHeader = headerIndex(headers, ['마감', '마감일', 'deadline', 'date']);
  const hasHeader = brandHeader >= 0 || titleHeader >= 0 || amountHeader >= 0 || deadlineHeader >= 0;

  const cells = splitSpreadsheetLine(hasHeader ? lines[1] ?? '' : lines[0]);
  if (cells.length < 2) return null;

  const brand = cells[hasHeader && brandHeader >= 0 ? brandHeader : 0]?.trim() ?? '';
  const title = cells[hasHeader && titleHeader >= 0 ? titleHeader : 1]?.trim() ?? '협찬 제안';
  const amountText = cells[hasHeader && amountHeader >= 0 ? amountHeader : 2] ?? '';
  const deadlineText = cells[hasHeader && deadlineHeader >= 0 ? deadlineHeader : 3] ?? '';

  if (!brand && !title) return null;

  return {
    brand,
    title: title || '협찬 제안',
    amount: parseAmount(amountText),
    deadline: parseDeadline(deadlineText),
    memo: text.trim().slice(0, 500),
  };
}

// ─── 브랜드명 추출 ────────────────────────────────────────────
function parseBrand(text: string): string {
  // "OO 마케팅팀", "OO 브랜드팀", "OO 담당자"
  const teamMatch = text.match(/([가-힣a-zA-Z0-9]+(?:\s?[가-힣a-zA-Z0-9]+)?)\s*(마케팅|브랜드|홍보|광고|PR)\s*팀/);
  if (teamMatch) return teamMatch[1].trim();

  // "안녕하세요, OO 입니다" / "OO에서 연락드립니다"
  const greetMatch = text.match(/안녕하세요[,.]?\s*([가-힣a-zA-Z0-9]+(?:\s[가-힣a-zA-Z0-9]+)?)\s*(입니다|에서|의)/);
  if (greetMatch) return greetMatch[1].trim();

  // "브랜드: OO" 또는 "브랜드명: OO"
  const labelMatch = text.match(/브랜드(?:명)?[:\s]+([가-힣a-zA-Z0-9]+(?:\s[가-힣a-zA-Z0-9]+)?)/);
  if (labelMatch) return labelMatch[1].trim();

  // 첫 번째 줄에서 가장 앞에 나오는 한글/영문 단어
  const firstLine = text.split('\n')[0].trim();
  const wordMatch = firstLine.match(/^([가-힣a-zA-Z0-9]+(?:\s[가-힣a-zA-Z0-9]+)?)/);
  if (wordMatch && wordMatch[1].length >= 2) return wordMatch[1].trim();

  return '';
}

// ─── 제목 추출 ────────────────────────────────────────────────
function parseTitle(text: string): string {
  // "협찬 제안: OO", "제안 내용: OO", "콘텐츠: OO"
  const labelPatterns = [
    /(?:협찬|광고|제안|콘텐츠|작업)\s*(?:내용|제목|명)?[:\s]+(.+)/,
    /(.+(?:리뷰|언박싱|협찬|광고|콜라보|콘텐츠).+)/,
  ];
  for (const pattern of labelPatterns) {
    const m = text.match(pattern);
    if (m) return m[1].trim().slice(0, 50);
  }
  return '협찬 제안';
}

// ─── 메인 파서 ────────────────────────────────────────────────
export function parseClipboardText(text: string): ParsedDeal | null {
  if (!text || text.trim().length < 5) return null;

  const spreadsheetResult = parseSpreadsheetText(text);
  if (spreadsheetResult) return spreadsheetResult;

  const SPONSORSHIP_KEYWORDS = ['협찬', '광고', '제안', '콜라보', '단가', '리뷰', '콘텐츠', '마케팅', '브랜드'];
  const hasSponsorshipKeyword = SPONSORSHIP_KEYWORDS.some((kw) => text.includes(kw));
  if (!hasSponsorshipKeyword) return null;

  return {
    brand: parseBrand(text),
    title: parseTitle(text),
    amount: parseAmount(text),
    deadline: parseDeadline(text),
    memo: text.trim().slice(0, 500),
  };
}
