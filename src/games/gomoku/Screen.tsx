import type { ScreenProps } from '../../core/screen';
import { GameBoardScreen } from '../../screens/GameBoardScreen';
export function GomokuScreen(props: ScreenProps<unknown>) { return <GameBoardScreen {...props} />; }
