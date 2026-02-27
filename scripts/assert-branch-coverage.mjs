import { readFile } from 'node:fs/promises';

const lcovPath = process.argv[2] ?? 'coverage/lcov.info';
const threshold = Number(process.env.BRANCH_COVERAGE_THRESHOLD ?? '100');

const text = await readFile(lcovPath, 'utf8');
const records = text
  .split('end_of_record')
  .map((record) => record.trim())
  .filter(Boolean);

let totalFound = 0;
let totalHit = 0;
const failures = [];

for (const record of records) {
  const lines = record.split('\n');
  const source = lines.find((line) => line.startsWith('SF:'))?.slice(3) ?? '<unknown>';
  const found = Number(lines.find((line) => line.startsWith('BRF:'))?.slice(4) ?? '0');
  const hit = Number(lines.find((line) => line.startsWith('BRH:'))?.slice(4) ?? '0');

  totalFound += found;
  totalHit += hit;

  const pct = found === 0 ? 100 : (hit / found) * 100;
  if (pct < threshold) {
    failures.push({ source, found, hit, pct });
  }
}

const globalPct = totalFound === 0 ? 0 : (totalHit / totalFound) * 100;

if (totalFound === 0) {
  console.error(`No branch coverage data found in ${lcovPath}.`);
  process.exit(1);
}

if (globalPct < threshold || failures.length > 0) {
  console.error(
    `Branch coverage is ${globalPct.toFixed(2)}% (${totalHit}/${totalFound}), below ${threshold}%.`
  );

  for (const failure of failures) {
    console.error(
      ` - ${failure.source}: ${failure.pct.toFixed(2)}% (${failure.hit}/${failure.found})`
    );
  }

  process.exit(1);
}

console.log(
  `Branch coverage verified at ${globalPct.toFixed(2)}% (${totalHit}/${totalFound}) from ${lcovPath}.`
);
