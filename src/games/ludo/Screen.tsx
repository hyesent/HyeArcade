import type { ScreenProps } from '../../core/screen';
import { GameBoardScreen } from '../../screens/GameBoardScreen';
export function LudoScreen(props: ScreenProps<unknown>) { return <GameBoardScreen {...props} />; }
