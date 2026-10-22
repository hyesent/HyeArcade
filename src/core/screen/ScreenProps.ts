import type { GameDefinition, GameSession, Move, Player, PlayerId } from '../types';
import type { LanClient, LanRoomInfo } from '../lan';

export interface ScreenProps<S = unknown> {
  game: GameDefinition<S, unknown>;
  session: GameSession<S>;
  currentId: PlayerId | null;
  currentPlayer: Player | undefined;
  isMyTurn: boolean;
  onMove: (move: Move) => void;
  onReset: () => void;
  onExit: () => void;
  accent: string;
  lanClient?: LanClient;
  lanRoom?: LanRoomInfo;
  onOpenPlayerProfile?: (player: Player) => void;
}