import type { ScreenProps } from '../../core/screen';
import { DedicatedGameScreen } from '../DedicatedGameScreen';
export function MahjongScreen(props: ScreenProps<unknown>) { return <DedicatedGameScreen kind="mahjong" {...props} />; }
