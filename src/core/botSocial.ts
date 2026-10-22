import type { BotPersonality, Move, Player } from './types';

const LINES: Record<BotPersonality, {good:string[];bad:string[];neutral:string[]}> = {
  friendly: {good:['Nice move!','You nearly had me there.','Good game — let’s keep it going.'],bad:['I’ll try a different strategy next turn.','That was close!'],neutral:['Your move.','Let’s see what happens next.']},
  rival: {good:['I saw that coming.','Still in this.','You’ll need a stronger move than that.'],bad:['Okay, that was a good one.','You got me that turn.'],neutral:['My turn to make a move.','The match is not over yet.']},
  strategist: {good:['Interesting choice. I’ll adapt.','That changes the position.','I’m evaluating the next line.'],bad:['That was a useful trade-off.','I need to rethink the position.'],neutral:['I’m watching the board closely.','Planning my next move.']},
  quiet: {good:['Well played.','Good move.'],bad:['Noted.','Fair move.'],neutral:['Your turn.','Ready when you are.']},
};

export function botComment(player: Player, move: Move, wonOrProgress = false): string | null {
  if (player.kind !== 'bot') return null;
  const personality = player.personality ?? 'friendly';
  const lines = LINES[personality];
  const group = move.type.toLowerCase().includes('win') || wonOrProgress ? lines.good : move.type.toLowerCase().includes('invalid') ? lines.bad : lines.neutral;
  // Deterministic selection avoids a bot producing a different line on each render.
  const index = Math.abs(`${player.id}:${move.type}:${move.ts}`.split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % group.length;
  return group[index] ?? null;
}
