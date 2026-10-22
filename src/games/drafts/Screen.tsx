import type { ScreenProps } from '../../core/screen';
import { GameBoardScreen } from '../../screens/GameBoardScreen';
export function DraftsScreen(props: ScreenProps<unknown>) { return <GameBoardScreen {...props} />; }
