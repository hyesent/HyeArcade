const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }

// Compile the source to a temporary CommonJS tree so the tests work on Node 22
// even when the repository's package.json declares ESM and the test is CJS.
const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hye-ludo-test-'));
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
    if (/\.tsx$/.test(entry.name) && names.has(entry.name.replace(/\.tsx$/, '.ts'))) continue;
    if (/\.(tsx|ts)$/.test(entry.name)) {
      const relative = path.relative(srcRoot, input).replace(/\.(tsx|ts)$/, '.js');
      const output = path.join(outRoot, relative);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      if (relative === path.join('theme', 'sounds.js')) {
        fs.writeFileSync(output, 'exports.play=()=>{};exports.preload=()=>{};exports.isSoundEnabled=()=>true;exports.setSoundEnabled=()=>{};exports.getSoundVolume=()=>0.75;exports.setSoundVolume=()=>{};');
      } else {
        const source = fs.readFileSync(input, 'utf8');
        const compiled = ts.transpileModule(source, { fileName: input, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
        fs.writeFileSync(output, compiled);
      }
    } else fs.copyFileSync(input, path.join(to, entry.name));
  }
}
compileTree(srcRoot, outRoot);
const reactStub = { createElement:()=>({}), Fragment:Symbol('Fragment'), useState:v=>[typeof v==='function'?v():v,()=>{}], useEffect:()=>{}, useMemo:f=>f(), useRef:v=>({current:v}), useCallback:f=>f, createContext:()=>({Provider:()=>null}), useContext:()=>null };
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return reactStub;
  if (request === 'react/jsx-runtime') return { jsx:()=>({}), jsxs:()=>({}), Fragment:reactStub.Fragment };
  if (request === 'howler') return { Howl:class { volume(){} play(){} load(){} }, Howler:{ mute(){}, volume(){} } };
  if (request === '@capacitor/core') return { Capacitor:{isNativePlatform:()=>false,getPlatform:()=>'web',isPluginAvailable:()=>false}, registerPlugin:()=>new Proxy({}, {get:()=>()=>Promise.resolve({})}) };
  if (request.startsWith('@capacitor/')) return new Proxy({}, {get:()=>()=>Promise.resolve({})});
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions['.svg'] = (mod, file) => { mod.exports = file; };
require.extensions['.png'] = (mod, file) => { mod.exports = file; };
const { ludo } = require(path.join(outRoot, 'games', 'ludo', 'index.js'));
const { legalPawnIndices } = require(path.join(outRoot, 'games', 'ludo', 'logic.js'));
test.after(() => fs.rmSync(temp, { recursive:true, force:true }));
const players = () => [
  {id:'red', name:'Red', kind:'human', seat:0, connected:true},
  {id:'yellow', name:'Yellow', kind:'bot', seat:1, connected:true},
];
const move = (type, player, payload) => ({type, player, payload, ts:Date.now()});
function roll(state, a, b) { return ludo.apply(state, move('roll', 'red', {value:a+b, die1:a, die2:b})); }
function select(state, dieIndex) { return ludo.apply(state, move('select', ludo.currentPlayer(state), {dieIndex})); }
function pick(state, pawnIndex) { return ludo.apply(state, move('pick', ludo.currentPlayer(state), {pawnIndex, dieIndex:state.selectedDie})); }

test('6 + 3 lets a player release a pawn and then use the other die on it', () => {
  let state = ludo.setup(players());
  state = roll(state, 6, 3);
  assert.deepEqual(state.lastRoll, [6,3]);
  assert.deepEqual(state.remainingDice, [true,true]);
  assert.equal(ludo.validate(state, move('select','red',{dieIndex:0})), true);
  state = select(state, 0);
  state = pick(state, 0);
  assert.equal(state.pawns[0].state, 'ring');
  assert.equal(state.pawns[0].step, 0);
  assert.deepEqual(state.remainingDice, [false,true]);
  state = select(state, 1);
  state = pick(state, 0);
  assert.equal(state.pawns[0].step, 3);
  assert.deepEqual(state.remainingDice, [false,false]);
  assert.equal(state.turn, 1);
});

test('3 + 5 with every pawn in the yard cannot release a pawn and passes the turn', () => {
  let state = ludo.setup(players());
  state = roll(state, 3, 5);
  assert.deepEqual(state.remainingDice, [false,false]);
  assert.equal(state.turn, 1);
  assert.ok(state.pawns.filter(p=>p.color==='R').every(p=>p.state==='yard'));
});

test('double six can release two different pawns and grants another turn', () => {
  let state = ludo.setup(players());
  state = roll(state, 6, 6);
  state = select(state, 0);
  state = pick(state, 0);
  state = select(state, 1);
  state = pick(state, 1);
  assert.equal(state.pawns[0].step, 0);
  assert.equal(state.pawns[1].step, 0);
  assert.deepEqual(state.remainingDice, [false,false]);
  assert.equal(state.turn, 0);
});

test('both dice are individually validated and unusable dice cannot be selected', () => {
  let state = ludo.setup(players());
  state = roll(state, 6, 3);
  assert.equal(ludo.validate(state, move('select','red',{dieIndex:0})), true);
  assert.equal(ludo.validate(state, move('select','red',{dieIndex:1})), false);
  assert.equal(ludo.validate(state, move('select','red',{dieIndex:2})), false);
});

test('hard bots make valid decisions through the two-dice system without stalling', () => {
  let state = ludo.setup(players());
  let moves = 0;
  let winner = null;
  for (; moves < 4000; moves++) {
    const result = ludo.isOver(state);
    if (result) { winner = result.winner; break; }
    const player = ludo.currentPlayer(state);
    const candidate = ludo.bot(state, player, 'hard');
    assert.ok(candidate, `bot returned no move at step ${moves}`);
    assert.equal(ludo.validate(state, candidate), true, `invalid bot move ${candidate.type} at step ${moves}: ${JSON.stringify(candidate.payload)}`);
    const next = ludo.apply(state, candidate);
    assert.notEqual(next, undefined);
    assert.notEqual(next, null);
    assert.notEqual(next, state, `bot move failed to advance state at step ${moves}`);
    state = next;
  }
  assert.ok(winner, `no winner after ${moves} bot moves`);
  assert.ok(state.pawns.filter(p=>p.color===state.colors.find(c=>state.playerIds[c]===winner)).every(p=>p.state==='finished'));
});


test('easy, medium, and hard bots handle complete 2-, 3-, and 4-player matches', () => {
  for (const count of [2, 3, 4]) {
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const roster = Array.from({length:count}, (_,i) => ({id:`p${i}`, name:`P${i}`, kind:i===0?'human':'bot', seat:i, connected:true}));
      let state = ludo.setup(roster);
      let winner = null;
      for (let step=0; step<5000; step++) {
        const result = ludo.isOver(state);
        if (result) { winner = result.winner; break; }
        const player = ludo.currentPlayer(state);
        const candidate = ludo.bot(state, player, difficulty);
        assert.ok(candidate, `${count} players / ${difficulty}: no move at ${step}`);
        assert.equal(ludo.validate(state, candidate), true, `${count} players / ${difficulty}: invalid ${candidate.type} at ${step}`);
        const next = ludo.apply(state, candidate);
        assert.notEqual(next, state, `${count} players / ${difficulty}: state stalled at ${step}`);
        state = next;
      }
      assert.ok(winner, `${count} players / ${difficulty}: no winner within 5000 bot moves`);
    }
  }
});
