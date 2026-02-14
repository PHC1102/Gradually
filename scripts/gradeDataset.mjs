import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DATASET_ID = process.env.DATASET_ID ?? 'KalvinPhan/Result';
const DATASET_REVISION = process.env.DATASET_REVISION ?? 'main';
const DATASET_FILE = process.env.DATASET_FILE;
const HF_TOKEN = process.env.HF_TOKEN;
const MAX_RECORDS = process.env.MAX_RECORDS ? Number(process.env.MAX_RECORDS) : null;
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? path.join('data', 'grading_results.jsonl');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const OPENAI_CHAT_URL =
  process.env.OPENAI_CHAT_URL ?? 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `
Bạn là giám khảo chấm bài theo cây quyết định IF–ELSE nghiêm ngặt.

Quy tắc chấm (bắt buộc):
1) Kiểm tra đáp án cuối cùng:
   - Nếu đáp án cuối cùng trong model_solution đúng với solution
     → total_score = 1.0
     → DỪNG LẠI, KHÔNG XÉT THÊM
2) Nếu đáp án sai:
   a) Nếu model_solution giải đúng hướng bài toán
      (đặt biến đúng, suy luận hợp lý, công thức phù hợp với nội dung câu hỏi)
      → total_score = 0.2
   b) Nếu không đúng hướng nhưng vẫn hiểu đúng ngữ cảnh tiếng Việt của câu hỏi
      → total_score = 0.1
   c) Nếu vừa sai hướng, vừa sai ngữ cảnh
      → total_score = 0

Yêu cầu:
- Không cộng điểm chồng chéo, chỉ chọn một nhánh duy nhất.
- Không suy diễn vượt nội dung bài.
- Trả về JSON đúng schema sau:
{
  "final_answer_correct": true | false,
  "reasoning_correct": true | false,
  "vietnamese_understanding": true | false,
  "total_score": 0 | 0.1 | 0.2 | 1.0,
  "decision_path": "mô tả nhánh IF–ELSE đã đi",
  "explanation": "giải thích ngắn gọn"
}
`.trim();

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Set it before running.');
  process.exit(1);
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function resolveDatasetFile() {
  if (DATASET_FILE) return DATASET_FILE;

  const treeUrl = `https://huggingface.co/api/datasets/${DATASET_ID}/tree/${DATASET_REVISION}?recursive=1`;
  const headers = HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};
  const tree = await fetchJson(treeUrl, headers);

  const candidates = tree
    .filter((item) => item.type === 'file')
    .map((item) => item.path)
    .filter((p) => /\.(jsonl|json|csv)$/i.test(p));

  if (!candidates.length) {
    throw new Error('No JSON/JSONL/CSV files found in dataset tree. Set DATASET_FILE manually.');
  }

  const preference = ['jsonl', 'json', 'csv'];
  candidates.sort((a, b) => {
    const extA = preference.findIndex((ext) => a.toLowerCase().endsWith(ext));
    const extB = preference.findIndex((ext) => b.toLowerCase().endsWith(ext));
    return (extA === -1 ? 99 : extA) - (extB === -1 ? 99 : extB);
  });

  return candidates[0];
}

async function downloadDataset(filePath) {
  const url = `https://huggingface.co/datasets/${DATASET_ID}/resolve/${DATASET_REVISION}/${filePath}`;
  const headers = HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download failed ${res.status}: ${text}`);
  }

  const dataDir = path.join(process.cwd(), 'data');
  await fs.promises.mkdir(dataDir, { recursive: true });
  const localPath = path.join(dataDir, path.basename(filePath));
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(localPath, buffer);

  return localPath;
}

function parseRecords(raw, filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.jsonl') {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        try {
          return JSON.parse(line);
        } catch (err) {
          throw new Error(`Invalid JSONL at line ${idx + 1}: ${err.message}`);
        }
      });
  }

  if (ext === '.json') {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (Array.isArray(parsed.train)) return parsed.train;
    throw new Error('JSON file does not contain an array at root/data/train.');
  }

  if (ext === '.csv') {
    const [headerLine, ...rows] = raw.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(',').map((h) => h.trim());
    return rows.map((row) => {
      const cols = row.split(',');
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = cols[i] ?? '';
      });
      return obj;
    });
  }

  throw new Error(`Unsupported file extension: ${ext}`);
}

function normalizeRecord(record, idx) {
  const solution =
    record.solution_vi ??
    record.solution ??
    record.reference ??
    record.answer ??
    '';
  const modelSolution =
    record.model_solution ??
    record.prediction ??
    record.response ??
    record.output ??
    '';

  if (!solution || !modelSolution) {
    throw new Error(`Missing solution/model_solution on record ${idx}`);
  }

  return {
    id: record.id ?? record.sample_id ?? idx,
    raw: record,
    solution,
    modelSolution,
  };
}

async function judgeRecord({ solution, modelSolution }) {
  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          'Đáp án tham khảo (solution_vi):',
          solution,
          '',
          'Lời giải mô hình (model_solution):',
          modelSolution,
          '',
          'Trả JSON đúng schema, không thêm lời dẫn.',
        ].join('\n'),
      },
    ],
    response_format: { type: 'json_object' },
  };

  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI request failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI response missing content');
  }

  const parsed = JSON.parse(content);
  return parsed;
}

async function main() {
  const datasetFile = await resolveDatasetFile();
  console.log(`Dataset file resolved: ${datasetFile}`);

  const localPath = await downloadDataset(datasetFile);
  console.log(`Downloaded to: ${localPath}`);

  const raw = await fs.promises.readFile(localPath, 'utf8');
  const records = parseRecords(raw, localPath);
  console.log(`Loaded ${records.length} records`);

  const total = MAX_RECORDS ? Math.min(MAX_RECORDS, records.length) : records.length;
  const results = [];

  await fs.promises.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

  for (let i = 0; i < total; i += 1) {
    const normalized = normalizeRecord(records[i], i);
    console.log(`Scoring record ${i + 1}/${total} (id=${normalized.id})...`);

    try {
      const evaluation = await judgeRecord(normalized);
      results.push({ id: normalized.id, ...evaluation });
    } catch (err) {
      console.error(`Failed on record ${normalized.id}:`, err.message);
      results.push({
        id: normalized.id,
        error: err.message,
      });
    }
  }

  const jsonl = results.map((r) => JSON.stringify(r)).join('\n');
  await fs.promises.writeFile(OUTPUT_PATH, jsonl, 'utf8');
  console.log(`Saved results to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

