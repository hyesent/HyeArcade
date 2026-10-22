import type { ScreenProps } from '../../core/screen';
import { DedicatedGameScreen } from '../DedicatedGameScreen';
export function ChessScreen(props: ScreenProps<unknown>) { return <DedicatedGameScreen kind="chess" {...props} />; }
