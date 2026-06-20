import { randomUUID } from 'node:crypto';

// Swapped in for src/common/id-generator.ts via moduleNameMapper. The real
// IdGenerator imports the ESM-only `uuid` package, which Jest's CJS runtime
// can't require; this fake never touches `uuid` at all, so the problem
// doesn't arise. Ids are plain v4 UUIDs (not v7) — nothing under test
// depends on UUIDv7's time-sortable layout, only on ids being valid UUIDs.
export class IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
