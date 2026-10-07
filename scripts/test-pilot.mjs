import { spawnSync } from 'node:child_process';
import { assertEmulators } from '../tests/emulator-helpers.mjs';
assertEmulators();
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true' };
for (const args of [
  ['--test', 'tests/learning.test.mjs', 'tests/pilot.rules.test.mjs'],
  ['node_modules/next/dist/bin/next', 'build'],
  ['node_modules/@playwright/test/cli.js', 'test'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status || 1);
}
