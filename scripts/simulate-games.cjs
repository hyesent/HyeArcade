const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
let ts;
try { ts = require('typescript'); }
catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }

// Compile the app source into a temporary CommonJS tree. Node 22's native .ts
// loader can take precedence over require.extensions in ESM packages, so a
// separate type=commonjs tree keeps this test runner deterministic.
const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hye-arcade-sim-'));
fs.writeFileSync(path.join(temp, 'package.json'), '{"private":true,"type":"commonjs"}');
const srcRoot = path.join(root, 'src');
const outRoot = path.join(temp, 'src');
function compileTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  const entries = fs.readdirSync(from, { withFileTypes: true });
  const names = new Set(entries.map(entry => entry.name));
  for (const entry of entries) {
    const input = path.join(from, entry.name);
    if (entry.isDirectory()) { compileTree(input, path.join(to, entry.name)); continue; }
    if (/\.d\.ts$/.test(entry.name)) continue;
    // TypeScript resolves index.ts before index.tsx when both exist. Keep the
    // same precedence in this temporary compilation tree.
    if (/\.tsx$/.test(entry.name) && names.has(entry.name.replace(/\.tsx$/, '.ts'))) continue;
    if (/\.(tsx|ts)$/.test(entry.name)) {
      const relative = path.relative(srcRoot, input).replace(/\.(tsx|ts)$/, '.js');
      const output = path.join(outRoot, relative);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      if (relative === path.join('theme', 'sounds.js')) {
        fs.writeFileSync(output, 'exports.play=()=>{};exports.preload=()=>{};exports.isSoundEnabled=()=>true;exports.setSoundEnabled=()=>{};exports.getSoundVolume=()=>0.75;exports.setSoundVolume=()=>{};');
        continue;
      }
      const source = fs.readFileSync(input, 'utf8');
      const compiled = ts.transpileModule(source, { fileName: input, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
      fs.writeFileSync(output, compiled);
    } else {
      fs.copyFileSync(input, path.join(to, entry.name));
    }
  }
}
compileTree(srcRoot, outRoot);

const reactStub = {
  createElement: () => ({}), Fragment: Symbol('Fragment'),
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {}, useMemo: fn => fn(), useRef: value => ({ current: value }),
  useCallback: fn => fn, createContext: () => ({ Provider: () => null }), useContext: () => null,
};
const capacitorStub = { Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web', isPluginAvailable: () => false }, registerPlugin: () => new Proxy({}, { get: () => () => Promise.resolve({}) }) };
const origLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return reactStub;
  if (request === 'react/jsx-runtime') return { jsx: () => ({}), jsxs: () => ({}), Fragment: reactStub.Fragment };
  if (request === 'howler') return { Howl: class { volume() {} play() {} load() {} }, Howler: { mute() {}, volume() {} } };
  if (request === '@capacitor/core') return capacitorStub;
  if (request.startsWith('@capacitor/')) return new Proxy({}, { get: () => () => Promise.resolve({}) });
  return origLoad.call(this, request, parent, isMain);
};
require.extensions['.svg'] = (mod, file) => { mod.exports = file; };
require.extensions['.png'] = (mod, file) => { mod.exports = file; };

const { GAMES } = require(path.join(outRoot, 'games', 'registry.js'));
const requestedRuns = Math.max(1, Number(process.env.HYE_SIM_RUNS) || 12);
const maxMoves = Math.max(1, Number(process.env.HYE_SIM_MAX_MOVES) || 60);
const results = [];
for (const game of GAMES) {
  let finishedRuns = 0, stalledRuns = 0, setupErrors = 0, viewErrors = 0, validMoves = 0;
  const examples = [];
  for (let run = 0; run < requestedRuns; run++) {
    try {
      const players = Array.from({ length: game.minPlayers }, (_, i) => ({ id: `${game.id}-${run}-p${i}`, name: `P${i + 1}`, kind: 'human', seat: i, connected: true }));
      let state = game.setup(players, game.boards?.[0]?.id);
      for (let step = 0; step < maxMoves; step++) {
        if (game.isOver(state)) { finishedRuns++; break; }
        const player = game.currentPlayer(state);
        const moves = game.legalMoves(state, player) || [];
        let candidate = moves.find(m => game.validate(state, m));
        if (!candidate) {
          for (const other of players) {
            const otherMoves = game.legalMoves(state, other.id) || [];
            candidate = otherMoves.find(m => game.validate(state, m) && (other.id === player || game.allowOutOfTurn?.(state, m)));
            if (candidate) break;
          }
        }
        if (!candidate && game.bot) {
          const botMove = game.bot(state, player, 'easy');
          if (botMove && game.validate(state, botMove)) candidate = botMove;
        }
        if (!candidate) {
          stalledRuns++;
          if (examples.length < 3) examples.push({ run, stop: 'no-valid-move', step, moveCount: moves.length, turn: state?.turn });
          break;
        }
        const next = game.apply(state, candidate);
        if (next === undefined || next === null) throw new Error('apply returned no state');
        state = next;
        validMoves++;
      }
      if (game.view) {
        const view = game.view(state, players[0].id);
        if (!view || typeof view !== 'object') viewErrors++;
        else if (game.id === 'crazy-eights' || game.id === 'uno' || game.id === 'whot') {
          const other = players[1]?.id;
          const hands = Array.isArray(view.hands) ? view.hands : [];
          const opponent = hands.find(hand => hand.playerId === other);
          if (opponent && opponent.cards.some(card => card !== '__hidden__')) viewErrors++;
          if (view.deck?.some(card => !String(card).startsWith('__hidden_deck_'))) viewErrors++;
        } else if (game.id === 'monopoly-deal') {
          const other = players[1]?.id;
          if ((view.hands[other] ?? []).some(card => !String(card).startsWith('__hidden_hand_')) || view.deck.some(card => !String(card).startsWith('__hidden_deck_'))) viewErrors++;
        } else if (game.id === 'scrabble') {
          const other = players[1]?.id;
          if ((view.racks[other] ?? []).some(tile => tile.letter !== '') || view.bag.some(tile => tile.letter !== '')) viewErrors++;
        } else if (game.id === 'mahjong') {
          const other = players[1]?.id;
          if ((view.hands[other] ?? []).some(tile => tile.kind !== 'hidden') || view.wall.some(tile => tile.kind !== 'hidden') || view.deadWall.some(tile => tile.kind !== 'hidden')) viewErrors++;
        } else if (game.id === 'treasure-hunt' && !view.guesses.some(g => g.distance === 0) && view.guesses.length < view.maxGuesses && (view.treasure.row !== -1 || view.treasure.col !== -1)) viewErrors++;
        else if (game.id === 'scramble' && view.current.answer !== '') viewErrors++;
        else if (game.id === 'monopoly' && (view.chanceDeck.some(card => card.text !== 'Hidden card') || view.chestDeck.some(card => card.text !== 'Hidden card'))) viewErrors++;
        else if (game.id === 'dominoes' && view.hands.slice(1).some(hand => hand.some(tile => tile[0] !== 0 || tile[1] !== 0))) viewErrors++;
        else if (game.id === 'battleship' && view.ships.slice(1).some(fleet => fleet.some(ship => ship.cells.length))) viewErrors++;
        else if (game.id === 'hearts' && view.hands.slice(1).some(hand => hand.some(card => card.s !== '?'))) viewErrors++;
        else if (game.id === 'memory-match' && view.cards.some((card, index) => !view.revealed.includes(index) && !view.matched.includes(index) && card !== -1)) viewErrors++;
      }
    } catch (error) {
      setupErrors++;
      if (examples.length < 3) examples.push({ error: String(error.message || error) });
    }
  }
  results.push({ id: game.id, runs: requestedRuns, validMoves, finishedRuns, stalledRuns, setupErrors, viewErrors, hasView: !!game.view, examples });
}
const PRIVATE = new Set(['crazy-eights','uno','whot','monopoly-deal','scrabble','mahjong','treasure-hunt','scramble','monopoly','dominoes','battleship','hearts','memory-match']);
const missingPrivateViews = results.filter(r => PRIVATE.has(r.id) && !r.hasView).map(r => r.id);
const totals = { games: GAMES.length, runs: results.reduce((n, r) => n + r.runs, 0), validMoves: results.reduce((n, r) => n + r.validMoves, 0), finishedRuns: results.reduce((n, r) => n + r.finishedRuns, 0), stalledRuns: results.reduce((n, r) => n + r.stalledRuns, 0), setupErrors: results.reduce((n, r) => n + r.setupErrors, 0), viewErrors: results.reduce((n, r) => n + r.viewErrors, 0), missingPrivateViews };
console.log(JSON.stringify({ config: { runsPerGame: requestedRuns, maxMovesPerRun: maxMoves }, totals, results }, null, 2));
fs.rmSync(temp, { recursive: true, force: true });
if (totals.stalledRuns || totals.setupErrors || totals.viewErrors || missingPrivateViews.length) process.exit(1);
