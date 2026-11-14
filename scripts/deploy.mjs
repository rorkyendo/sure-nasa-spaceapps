/* One-command deploy: build → push dist/ to the gh-pages branch.
   Uses a throwaway clone in .ghp-tmp so the main worktree is untouched. */
import { execSync } from 'node:child_process';
import { cpSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const TMP = '.ghp-tmp';
const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd, shell: true });

run('npm run build');

const remote = execSync('git remote get-url origin').toString().trim();
rmSync(TMP, { recursive: true, force: true });
try {
  run(`git clone --depth 1 --branch gh-pages "${remote}" "${TMP}"`);
} catch {
  run(`git clone --depth 1 "${remote}" "${TMP}"`);
  run('git checkout --orphan gh-pages && git rm -rf .', TMP);
}
for (const f of readdirSync(TMP)) {
  if (f !== '.git') rmSync(`${TMP}/${f}`, { recursive: true, force: true });
}
cpSync('dist', TMP, { recursive: true });
writeFileSync(`${TMP}/.nojekyll`, '');

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';
run(`git add -A && (git diff --cached --quiet || git commit -m "deploy: ${stamp}") && git push -u origin gh-pages`, TMP);
rmSync(TMP, { recursive: true, force: true });
console.log('deployed to gh-pages');
