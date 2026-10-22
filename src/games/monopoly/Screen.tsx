import type { ScreenProps } from '../../core/screen';
import { DedicatedGameScreen } from '../DedicatedGameScreen';
export function MonopolyScreen(props: ScreenProps<unknown>) { return <DedicatedGameScreen kind="monopoly" {...props} />; }
