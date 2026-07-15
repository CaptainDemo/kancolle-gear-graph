import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const QUESTS_DIR = join(DATA_DIR, 'quests');

const SOURCES = {
  'api_start2.json':
    'https://raw.githubusercontent.com/kcwiki/kancolle-data/master/api/api_start2.json',
  'improve_data.json':
    'https://raw.githubusercontent.com/kcwikizh/kcwiki-improvement-data/gh-pages/improve_data.json',
  'akashi.json':
    'https://raw.githubusercontent.com/KC3Kai/KC3Kai/master/src/data/akashi.json',
  'ships.nedb':
    'https://raw.githubusercontent.com/TeamFleet/WhoCallsTheFleet-DB/master/db/ships.nedb',
};

const QUEST_LIST_API =
  'https://api.github.com/repos/kcwikizh/kcwiki-quest-data/contents/data';
const questRaw = (id) =>
  `https://raw.githubusercontent.com/kcwikizh/kcwiki-quest-data/master/data/${id}.json`;

const fetchText = async (url) => {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'kancolle-equipment-sync' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
};

const formatBytes = (n) => {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
};

async function syncMainSources() {
  console.log('=== 同步主数据源 ===');
  for (const [filename, url] of Object.entries(SOURCES)) {
    const t0 = performance.now();
    const text = await fetchText(url);
    // .nedb 是每行一个 JSON 的文本格式，不是单个 JSON，跳过整体验证
    if (!filename.endsWith('.nedb')) JSON.parse(text);
    await writeFile(join(DATA_DIR, filename), text, 'utf8');
    const dt = Math.round(performance.now() - t0);
    console.log(`  ok  ${filename.padEnd(20)} ${formatBytes(text.length).padStart(10)}  ${dt}ms`);
  }
}

// TeamFleet ships.nedb → data/ships.json（精简字段，过滤脏值）
// stype 与 fullname 都从 api_start2 取（nedb 的 type 是自定义编号；name.ja_jp 不带"改"后缀）
async function transformShips() {
  console.log('=== 转换 ships.nedb → ships.json ===');
  const t0 = performance.now();
  const apiRaw = await readFile(join(DATA_DIR, 'api_start2.json'), 'utf8');
  const apiJson = JSON.parse(apiRaw);
  const apiShips = apiJson.api_data?.api_mst_ship ?? apiJson.api_mst_ship ?? [];
  const stypeByShipId = new Map();
  const fullnameByShipId = new Map();
  for (const s of apiShips) {
    if (typeof s.api_id === 'number') {
      if (typeof s.api_stype === 'number') stypeByShipId.set(s.api_id, s.api_stype);
      if (typeof s.api_name === 'string' && s.api_name) fullnameByShipId.set(s.api_id, s.api_name);
    }
  }

  const raw = await readFile(join(DATA_DIR, 'ships.nedb'), 'utf8');
  const ships = [];
  let skipped = 0;
  let stypeMissing = 0;
  let fullnameMissing = 0;
  for (const line of raw.trim().split('\n')) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }
    if (typeof entry.id !== 'number' || !entry.name?.ja_jp) {
      skipped++;
      continue;
    }
    const equip = Array.isArray(entry.equip)
      ? entry.equip
          .map((e) => (typeof e === 'number' ? e : Number(e)))
          .filter((e) => Number.isFinite(e) && e > 0)
      : [];
    const stype = stypeByShipId.get(entry.id);
    const fullname = fullnameByShipId.get(entry.id);
    if (stype == null) stypeMissing++;
    if (!fullname) fullnameMissing++;
    ships.push({
      id: entry.id,
      name: { ja_jp: entry.name.ja_jp, zh_cn: entry.name.zh_cn || '' },
      fullname: fullname ?? entry.name.ja_jp,
      type: stype ?? entry.type,
      class: typeof entry.class === 'number' ? entry.class : undefined,
      equip,
    });
  }
  ships.sort((a, b) => a.id - b.id);
  const out = JSON.stringify(ships);
  await writeFile(join(DATA_DIR, 'ships.json'), out, 'utf8');
  const dt = Math.round(performance.now() - t0);
  console.log(
    `  ok  ships.json            ${formatBytes(out.length).padStart(10)}  ${dt}ms  (${ships.length} ships, ${skipped} skipped, ${stypeMissing} stype-missing, ${fullnameMissing} fullname-missing)`,
  );
}

async function fetchQuestList() {
  console.log('=== 获取任务文件列表 ===');
  const res = await fetch(QUEST_LIST_API, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'kancolle-equipment-sync',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const list = await res.json();
  const ids = list
    .filter((item) => item.type === 'file' && item.name.endsWith('.json'))
    .map((item) => item.name.replace(/\.json$/, ''))
    .sort((a, b) => Number(a) - Number(b));
  console.log(`  找到 ${ids.length} 个任务文件`);
  return ids;
}

async function syncQuests(ids) {
  console.log('=== 并行下载任务文件（每批 50）===');
  const BATCH = 50;
  let done = 0;
  const t0 = performance.now();
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (id) => {
        const text = await fetchText(questRaw(id));
        JSON.parse(text);
        await writeFile(join(QUESTS_DIR, `${id}.json`), text, 'utf8');
        done++;
      }),
    );
    process.stdout.write(`\r  进度: ${done}/${ids.length}`);
  }
  console.log(`\n  完成，用时 ${Math.round(performance.now() - t0)}ms`);
}

async function bundleQuests(ids) {
  console.log('=== 合并任务文件为 quests.bundle.json ===');
  const bundle = {};
  for (const id of ids) {
    const text = await readFile(join(QUESTS_DIR, `${id}.json`), 'utf8');
    bundle[id] = JSON.parse(text);
  }
  const out = JSON.stringify(bundle);
  await writeFile(join(DATA_DIR, 'quests.bundle.json'), out, 'utf8');
  console.log(`  ok  quests.bundle.json  ${formatBytes(out.length)}  (${ids.length} quests)`);
}

async function main() {
  await mkdir(QUESTS_DIR, { recursive: true });
  await syncMainSources();
  await transformShips();
  const questIds = await fetchQuestList();
  await syncQuests(questIds);
  await bundleQuests(questIds);
  console.log('=== 全部同步完成 ===');
}

main().catch((e) => {
  console.error('同步失败:', e);
  process.exit(1);
});
