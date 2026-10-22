import type { ScreenProps } from '../../core/screen';
import { GameBoardScreen } from '../../screens/GameBoardScreen';
export function SolitaireScreen(props: ScreenProps<unknown>) { return <GameBoardScreen {...props} />; }
