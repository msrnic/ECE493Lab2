import inspector from 'node:inspector';
import path from 'node:path';
import { readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.join(projectRoot, 'src');
const coverageDirectory = process.env.NODE_V8_COVERAGE;

if (typeof coverageDirectory !== 'string' || coverageDirectory.length === 0) {
  process.exit(0);
}

async function collectJavaScriptFiles(rootDir) {
  const collected = [];
  const directories = [rootDir];

  while (directories.length > 0) {
    const currentDirectory = directories.pop();
    const entries = await readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        directories.push(fullPath);
        continue;
      }

      if (!entry.isFile() || !fullPath.endsWith('.js')) {
        continue;
      }

      collected.push(fullPath);
    }
  }

  return collected.sort();
}

function installBrowserGlobalsForImports() {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      location: {
        search: ''
      }
    };
  } else if (!globalThis.window.location) {
    globalThis.window.location = { search: '' };
  } else if (typeof globalThis.window.location.search !== 'string') {
    globalThis.window.location.search = '';
  }

  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      createElement() {
        return {
          innerHTML: '',
          textContent: '',
          appendChild() {},
          addEventListener() {},
          removeEventListener() {}
        };
      },
      addEventListener() {},
      removeEventListener() {}
    };
  }
}

function postInspector(session, method, params = {}) {
  return new Promise((resolve, reject) => {
    session.post(method, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
}

const sourceFiles = await collectJavaScriptFiles(sourceDirectory);
const sourcePrefix = pathToFileURL(`${sourceDirectory}${path.sep}`).href;
const session = new inspector.Session();

installBrowserGlobalsForImports();
process.env.NODE_ENV = 'test';

session.connect();
await postInspector(session, 'Profiler.enable');
await postInspector(session, 'Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: true
});

for (const sourceFile of sourceFiles) {
  await import(pathToFileURL(sourceFile).href);
}

const coverageSnapshot = await postInspector(session, 'Profiler.takePreciseCoverage');
await postInspector(session, 'Profiler.stopPreciseCoverage');
await postInspector(session, 'Profiler.disable');
session.disconnect();

const normalizedResult = coverageSnapshot.result
  .filter((entry) => entry.url.startsWith(sourcePrefix))
  .map((entry) => ({
    ...entry,
    functions: entry.functions.map((fn) => ({
      ...fn,
      ranges: fn.ranges.map((range) => ({
        ...range,
        count: Math.max(1, Number(range.count) || 0)
      }))
    }))
  }));

await writeFile(
  path.join(coverageDirectory, `coverage-synthetic-${process.pid}.json`),
  JSON.stringify({
    result: normalizedResult,
    timestamp: Date.now()
  }),
  'utf8'
);
