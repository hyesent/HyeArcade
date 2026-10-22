import { OFFLINE_ENGLISH_WORDS } from './english-words';

type TrieNode = {
  children: Map<string, TrieNode>;
  isWord: boolean;
};

let root: TrieNode | null = null;
let wordCount = 0;
let dictionaryWords: string[] = [];

// Loaded from a bundled local word list, so word validation works offline.
const BUILTIN_WORDS = OFFLINE_ENGLISH_WORDS.split(/\s+/);

function createNode(): TrieNode {
  return { children: new Map(), isWord: false };
}

export function initDictionary(words: string[]): void {
  root = createNode();
  wordCount = 0;
  dictionaryWords = [];

  for (const raw of words) {
    const word = raw.trim().toLowerCase();
    if (!word || word.length < 2) continue;

    let node = root;
    for (const ch of word) {
      let next = node.children.get(ch);
      if (!next) {
        next = createNode();
        node.children.set(ch, next);
      }
      node = next;
    }
    if (!node.isWord) {
      node.isWord = true;
      wordCount++;
      dictionaryWords.push(word);
    }
  }
}

export function initDictionaryFromText(text: string): void {
  initDictionary(text.split(/\r?\n/));
}

export function isValidWord(word: string): boolean {
  if (!root) return false;

  let node: TrieNode | undefined = root;
  for (const ch of word.toLowerCase()) {
    node = node.children.get(ch);
    if (!node) return false;
  }
  return node.isWord;
}

export function hasPrefix(prefix: string): boolean {
  if (!root) return false;

  let node: TrieNode | undefined = root;
  for (const ch of prefix.toLowerCase()) {
    node = node.children.get(ch);
    if (!node) return false;
  }
  return true;
}

export function getDictionarySize(): number { return wordCount; }
export function getDictionaryWords(): string[] { return [...dictionaryWords]; }

// Initialize once at module load; game-specific imports must not leave Scrabble with only puzzle words.
if (!root) initDictionary(BUILTIN_WORDS);

export function isDictionaryReady(): boolean {
  return root !== null;
}