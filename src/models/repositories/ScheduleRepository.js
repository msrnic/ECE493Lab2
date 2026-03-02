import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_DATA = {
  acceptedPapers: [],
  sessionSlots: [],
  generationRuns: [],
  generatedSchedules: [],
  sessionAssignments: [],
  conflictFlags: [],
  scheduleEditConflicts: [],
  scheduleOverrideAudits: []
};

export default class ScheduleRepository {
  constructor(filePath = path.resolve(process.cwd(), 'data/schedules.json')) {
    this.filePath = filePath;
  }

  #ensureFile() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, `${JSON.stringify(DEFAULT_DATA, null, 2)}\n`, 'utf8');
    }
  }

  read() {
    this.#ensureFile();
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_DATA,
      ...parsed
    };
  }

  write(data) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    return data;
  }

  mutate(mutator) {
    const current = this.read();
    const next = mutator(structuredClone(current));
    return this.write(next);
  }
}
