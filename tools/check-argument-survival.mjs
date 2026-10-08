/**
 * Which parts of a request survive the AntSeed buyer proxy, and which are
 * destroyed before the seller node sees them.
 *
 * FREE, OFFLINE AND DETERMINISTIC. It calls `transformRequest` out of the
 * `@antseed/api-adapter` package your own AntSeed install already has, on
 * synthetic request bodies written here. It opens no socket, discovers no peer,
 * routes nothing and pays nothing, so run it as often as you like.
 *
 * WHY IT MATTERS. Sippar's models take their arguments as top-level request-body
 * keys (`network` and `fields` on `sippar-chain-state`, for example). They select
 * which chain you are served and which rows you pay for. A parameter that does not
 * reach the seller is not an error: you are served the default page, in full, at
 * full price, and nothing anywhere says so.
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
 *      exact pair the buyer skill warns about, and case D2 tests the reverse, so
 *      the loss is not a property of one shape or one direction.
 *   3. Two channels do cross a translation: request HEADERS, and the `metadata`
 *      object. Every Sippar model reads both, in a fixed order: a top-level
 *      field first, then `metadata.sippar.<name>`, then the `x-sippar-<name>`
 *      header. The namespaced spelling is the one the models read, so cases E
 *      and F test that spelling, on both translating pairs a buyer can take,
 *      and case G tests `fields` as a list as well as a comma string.
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
 *           guidance in the skills needs re-reading,
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
  const h = out.request.headers ?? {};
  return {
    network: b.network,
    fields: b.fields,
    sipparNetwork: b.metadata?.sippar?.network,
    sipparFields: b.metadata?.sippar?.fields,
    headerNetwork: h['x-sippar-network'],
    headerCount: Object.keys(h).filter((k) => k.startsWith('x-sippar-')).length,
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
    name: 'D. openai-responses shape to an openai-chat seller (the shape the buyer skill warns about)',
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
    name: 'E. metadata.sippar survives anthropic-messages to openai-chat (the spelling the models read)',
    path: '/v1/messages',
    body: { ...anthropicBody, metadata: { sippar: { network: 'base', fields: ['blockNumber', 'chainId'] } } },
    from: 'anthropic-messages',
    to: 'openai-chat-completions',
    expect: { sipparNetwork: 'base', sipparFields: ['blockNumber', 'chainId'] },
  },
  {
    name: 'F. metadata.sippar survives openai-responses to openai-chat too',
    path: '/v1/responses',
    body: { ...responsesBody, metadata: { sippar: { network: 'base', fields: 'blockNumber,chainId' } } },
    from: 'openai-responses',
    to: 'openai-chat-completions',
    expect: { sipparNetwork: 'base', sipparFields: 'blockNumber,chainId' },
  },
  {
    name: 'G. every x-sippar-* header crosses the translation (one per argument name)',
    path: '/v1/messages',
    body: anthropicBody,
    from: 'anthropic-messages',
    to: 'openai-chat-completions',
    headers: {
      'x-sippar-network': 'base', 'x-sippar-fields': 'blockNumber,chainId', 'x-sippar-address': '0x0000000000000000000000000000000000000001',
      'x-sippar-tokens': '0x0000000000000000000000000000000000000002', 'x-sippar-chains': 'base,solana', 'x-sippar-rows': '10',
      'x-sippar-view': 'perp-screener', 'x-sippar-rpc': '{"method":"eth_getLogs","params":[{"address":"0x0000000000000000000000000000000000000003"}]}',
    },
    expect: { headerNetwork: 'base', headerCount: 8 },
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
    ? '\nAll cases behave as the skills describe. Send the chat-completions shape.'
    : `\n${changed} case(s) CHANGED. Re-read the skills before trusting their guidance.`,
);
process.exit(changed === 0 ? 0 : 1);
