import type { ScreenProps } from '../../core/screen';
import { GameBoardScreen } from '../../screens/GameBoardScreen';
export function CheckersScreen(props: ScreenProps<unknown>) { return <GameBoardScreen {...props} />; }
