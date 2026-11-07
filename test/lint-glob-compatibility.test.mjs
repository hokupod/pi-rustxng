import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { ESLint } from 'eslint';

const files = {
  'root.mjs': 'const unused = 1;\n',
  '.hidden/keep.mjs': 'const unused = 1;\n',
  'src/keep.mjs': 'const unused = 1;\n',
  'src/deep/keep-nested.mjs': 'const unused = 1;\n',
  'src/deep/other.mjs': 'const unused = 1;\n',
  'src/deep/file.txt': 'not javascript',
  'ai/ignored.mjs': 'invalid !!!',
  'ai/deep/ignored.mjs': 'invalid !!!',
  'node_modules/ignored.mjs': 'invalid !!!',
};

test('ESLint preserves nested glob traversal, dotfiles, and directory exclusions', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'pi-lint-glob-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, name)), { recursive: true });
    await writeFile(join(cwd, name), content);
  }
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: [
      { ignores: ['node_modules/**', 'ai/**'] },
      { files: ['**/*.mjs'], rules: { 'no-unused-vars': 'error' } },
    ],
  });
  const all = await eslint.lintFiles(['.']);
  const expected = [
    '.hidden/keep.mjs',
    'root.mjs',
    'src/deep/keep-nested.mjs',
    'src/deep/other.mjs',
    'src/keep.mjs',
  ];
  assert.deepEqual(all.map((result) => relative(cwd, result.filePath)).sort(), expected);
  for (const result of all) {
    assert.equal(result.fatalErrorCount, 0);
    assert.equal(result.errorCount, 1);
    assert.deepEqual(
      result.messages.map(({ ruleId, line, column }) => ({ ruleId, line, column })),
      [{ ruleId: 'no-unused-vars', line: 1, column: 7 }],
    );
  }
  const selected = await eslint.lintFiles(['src/**/keep*.mjs', '.hidden/*.mjs']);
  assert.deepEqual(selected.map((result) => relative(cwd, result.filePath)).sort(), [
    '.hidden/keep.mjs',
    'src/deep/keep-nested.mjs',
    'src/keep.mjs',
  ]);
  assert.equal(await eslint.isPathIgnored(join(cwd, 'ai/deep/ignored.mjs')), true);
  assert.equal(await eslint.isPathIgnored(join(cwd, 'node_modules/ignored.mjs')), true);
});
