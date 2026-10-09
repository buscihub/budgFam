#!/usr/bin/env node
// Checks that the task documentation (docs/DESIGN_DOC.md §13.1, docs/CHANGELOG.md)
// is consistent with the code changes on the current branch.
//
//   node scripts/check-task-docs.mjs            invariants only
//   node scripts/check-task-docs.mjs --strict   + "task is closed" rules (used by /task-close and CI)
//   node scripts/check-task-docs.mjs --hook     Claude Code Stop hook: invariants only, exit 2 on failure
//   --base <ref>                                ref to diff against (default: origin/main, then main)
//
// No dependencies on purpose: it runs in CI before `pnpm install` and as a hook.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN_DOC = 'docs/DESIGN_DOC.md';
const CHANGELOG = 'docs/CHANGELOG.md';
const DB_TYPES = 'src/data/database.types.ts';
const TASK_LINE = /^- \[( |x)\] (\d+\.\d+[a-z]?) /;

const args = process.argv.slice(2);
const hookMode = args.includes('--hook');
const strict = args.includes('--strict');
const baseFlag = args.indexOf('--base');
const baseArg = baseFlag === -1 ? undefined : args[baseFlag + 1];

function git(...gitArgs) {
  try {
    return execFileSync('git', gitArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function lines(text) {
  return text ? text.split('\n').filter(Boolean) : [];
}

// A Stop hook that already blocked once must let Claude stop, or it loops.
function stopHookAlreadyFired() {
  try {
    return JSON.parse(readFileSync(0, 'utf8')).stop_hook_active === true;
  } catch {
    return false;
  }
}

/** Task ids of §13.1, split by checkbox state, plus the ids listed more than once. */
function parseTasks(markdown) {
  const done = new Set();
  const seen = new Map();
  for (const line of markdown.split('\n')) {
    const match = TASK_LINE.exec(line);
    if (!match) continue;
    const [, box, id] = match;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    if (box === 'x') done.add(id);
  }
  const duplicates = [...seen].filter(([, count]) => count > 1).map(([id]) => id);
  return { done, duplicates };
}

function resolveMergeBase() {
  for (const ref of [baseArg, 'origin/main', 'main'].filter(Boolean)) {
    const mergeBase = git('merge-base', 'HEAD', ref);
    if (mergeBase) return mergeBase;
  }
  return git('rev-parse', 'HEAD');
}

if (hookMode && stopHookAlreadyFired()) process.exit(0);

const errors = [];
const warnings = [];

const current = parseTasks(readFileSync(join(ROOT, DESIGN_DOC), 'utf8'));
if (current.duplicates.length > 0) {
  errors.push(
    `${DESIGN_DOC} §13.1 lists these tasks more than once: ${current.duplicates.join(', ')}. Keep one line per task.`,
  );
}

const mergeBase = resolveMergeBase();
if (mergeBase) {
  // Committed, staged, unstaged and untracked changes since the branch left the base.
  const changed = new Set([
    ...lines(git('diff', '--name-only', mergeBase)),
    ...lines(git('ls-files', '--others', '--exclude-standard')),
  ]);
  const touches = (prefix) => [...changed].some((file) => file.startsWith(prefix));

  const baseDoc = git('show', `${mergeBase}:${DESIGN_DOC}`);
  const baseDone = baseDoc ? parseTasks(baseDoc).done : new Set();
  const newlyDone = [...current.done].filter((id) => !baseDone.has(id));

  if (newlyDone.length > 0 && !changed.has(CHANGELOG)) {
    errors.push(
      `Task ${newlyDone.join(', ')} is ticked in ${DESIGN_DOC} §13.1 but ${CHANGELOG} has no new entry.`,
    );
  }

  if (strict) {
    if ((touches('src/') || touches('supabase/migrations/')) && !changed.has(CHANGELOG)) {
      errors.push(
        `Code changed under src/ or supabase/migrations/ but ${CHANGELOG} has no new entry.`,
      );
    }
    if (touches('supabase/migrations/') && !changed.has(DB_TYPES)) {
      warnings.push(
        `A migration changed but ${DB_TYPES} did not. Run \`supabase gen types typescript --local > ${DB_TYPES}\` and commit the result if it differs (policy-only migrations legitimately leave it unchanged).`,
      );
    }
  }
}

for (const warning of warnings) console.error(`warning: ${warning}`);
for (const error of errors) console.error(`error: ${error}`);

if (errors.length === 0) {
  if (!hookMode) console.log('check-task-docs: ok');
  process.exit(0);
}
// Exit code 2 makes a Claude Code hook feed stderr back to the model.
process.exit(hookMode ? 2 : 1);
