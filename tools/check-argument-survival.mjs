/**
 * Which parts of a request survive the AntSeed buyer proxy, and which are
 * destroyed before the seller node sees them.
 *
 * FREE, OFFLINE AND DETERMINISTIC. It calls `transformRequest` out of the
 * `@antseed/api-adapter` package your own AntSeed install already has, on
 * synthetic request bodies written here. It opens no socket, discovers no peer,
 * routes nothing and pays nothing, so run it as often as you like.
 *
 * WHY IT MATTERS. Sippar's `sippar-chain-state` listing takes two top-level
 * request-body parameters, `network` and `fields`. They select which chain you
 * are served and which columns you pay for. A parameter that does not reach the
 * seller is not an error: you are served the default page, in full, at full
 * price, and nothing anywhere says so.
 *
 * WHAT IT SHOWS:
 *
 *   1. A top-level custom field survives only on the PASSTHROUGH branch, where
 *      the buyer's request shape and the seller's advertised protocol are the
 *      same. There `transformRequest` returns the request object untouched.
 *   2. Every CROSS-protocol path rebuilds the body from a canonical form whose
 *      key list is closed (model, messages/input, instructions, max_tokens,
 *      temperature, top_p, stop, tools, tool_choice, metadata, user). A key
 *      outside that list has nowhere to live and is dropped. Case D tests the
 *      exact pair BUYING.md's table asserts, and case D2 tests the reverse, so
 *      the loss is not a property of one shape or one direction.
 *   3. Two channels do cross a translation: request HEADERS, and the `metadata`
 *      object on one pair. Sippar reads neither today. They are listed because
 *      a reader deserves the whole picture, not as something to rely on.
 *
 * Every body below is synthetic and written by the author. No buyer's request
 * has been inspected to produce any of it.
 *
 * VERSIONS ARE PART OF THE RESULT, because an unstamped claim about a vendor
 * surface cannot be told from a stale one. The script prints the version of the
 * package it actually loaded. Verified 2026-09-24 against api-adapter 0.1.48.
 *
 * Usage:  node tools/check-argument-survival.mjs
 * Exit:   0 when the observed behaviour matches what is written above,
 *         1 when it has CHANGED, which is the interesting outcome and means the
 *           guidance in BUYING.md needs re-reading,
 *         2 when no AntSeed install could be found to test against.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

/* The same package ships in several places depending on how you installed
   AntSeed. We load whichever copy imports and print which one it was, so the
   result always names what it measured. */
const CANDIDATES = [
  { label: 'user plugin dir', dir: join(homedir(), '.antseed/plugins/node_modules/@antseed/api-adapter') },
  { label: '@antseed/cli nested copy', dir: '/opt/homebrew/lib/node_modules/@antseed/cli/node_modules/@antseed/api-adapter' },
  { label: '@antseed/cli nested copy (linux/npm prefix)', dir: '/usr/local/lib/node_modules/@antseed/cli/node_modules/@antseed/api-adapter' },
  { label: 'AntSeed desktop bundled plugins', dir: '/Applications/AntSeed VPR.app/Contents/Resources/bundled-plugins/@antseed/api-adapter' },
];

let found = null;
let transformRequest = null;
for (const c of CANDIDATES) {
  if (!existsSync(join(c.dir, 'package.json'))) continue;
  try {
    ({ transformRequest } = await import(pathToFileURL(join(c.dir, 'dist/request-transform.js')).href));
    found = c;
    break;
  } catch (e) {
    console.log(`(${c.label} present but not importable: ${e.code ?? e.message})`);
  }
}
if (!found) {
  console.error('No importable @antseed/api-adapter found. This check needs an AntSeed install');
  console.error('(the desktop app, or `npm i -g @antseed/cli`). Nothing was tested.');
  process.exit(2);
}
const pkg = JSON.parse(readFileSync(join(found.dir, 'package.json'), 'utf-8'));
console.log(`api-adapter : ${pkg.version}  (${found.label})\n`);

const enc = (o) => new TextEncoder().encode(JSON.stringify(o));
const dec = (b) => JSON.parse(Buffer.from(b).toString('utf-8'));

const ARGS = { network: 'base', fields: ['blockNumber', 'chainId'] };
const PEER = '0x706fca9c0d0684c30f86209aae0c3565ce1aa69f@sippar-chain-state';
const anthropicBody = { model: PEER, max_tokens: 1024, messages: [{ role: 'user', content: 'chain state' }], ...ARGS };
const openaiBody = { model: PEER, messages: [{ role: 'user', content: 'chain state' }], ...ARGS };
const responsesBody = { model: PEER, input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'chain state' }] }], ...ARGS };

function run({ path, body, from, to, headers = {} }) {
  const out = transformRequest(
    { method: 'POST', path, headers: { 'content-type': 'application/json', ...headers }, body: enc(body) },
    { from, to },
  );
  if (!out) return { failed: 'transformRequest returned null' };
  const b = dec(out.request.body);
  return {
    network: b.network,
    fields: b.fields,
    metadataNetwork: b.metadata?.network,
    headerNetwork: out.request.headers['x-sippar-network'],
  };
}

const CASES = [
  {
    name: 'A. Anthropic shape to an openai-chat seller (the silent loss)',
    path: '/v1/messages',
    body: anthropicBody,
    from: 'anthropic-messages',
    to: 'openai-chat-completions',
    expect: { network: undefined, fields: undefined },
  },
  {
    name: 'B. openai-chat to an openai-chat seller (passthrough, from === to)',
    path: '/v1/chat/completions',
    body: openaiBody,
    from: 'openai-chat-completions',
    to: 'openai-chat-completions',
    expect: { network: 'base', fields: ['blockNumber', 'chainId'] },
  },
  {
    name: 'C. Headers cross the same translation that drops the body fields',
    path: '/v1/messages',
    body: anthropicBody,
    from: 'anthropic-messages',
    to: 'openai-chat-completions',
    headers: { 'x-sippar-network': 'base' },
    expect: { headerNetwork: 'base' },
  },
  {
    name: 'D. openai-responses shape to an openai-chat seller (the row BUYING.md asserts)',
    path: '/v1/responses',
    body: responsesBody,
    from: 'openai-responses',
    to: 'openai-chat-completions',
    expect: { network: undefined, fields: undefined },
  },
  {
    name: 'D2. openai-chat to openai-responses (the loss is not one direction either)',
    path: '/v1/chat/completions',
    body: openaiBody,
    from: 'openai-chat-completions',
    to: 'openai-responses',
    expect: { network: undefined, fields: undefined },
  },
  {
    name: 'E. metadata survives anthropic-messages to openai-chat only',
    path: '/v1/messages',
    body: { ...anthropicBody, metadata: { network: 'base' } },
    from: 'anthropic-messages',
    to: 'openai-chat-completions',
    expect: { metadataNetwork: 'base' },
  },
];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let changed = 0;
for (const c of CASES) {
  const got = run(c);
  const ok = Object.entries(c.expect).every(([k, v]) => same(got[k], v));
  if (!ok) changed += 1;
  console.log(`${ok ? 'as documented' : 'CHANGED     '}  ${c.name}`);
  for (const [k, v] of Object.entries(c.expect)) {
    console.log(`    ${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(got[k])}`);
  }
}
console.log(
  changed === 0
    ? '\nAll cases behave as BUYING.md describes. Send the chat-completions shape.'
    : `\n${changed} case(s) CHANGED. Re-read BUYING.md before trusting its guidance.`,
);
process.exit(changed === 0 ? 0 : 1);
