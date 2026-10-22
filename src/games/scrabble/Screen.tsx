import type { ScreenProps } from '../../core/screen';
import { DedicatedGameScreen } from '../DedicatedGameScreen';
export function ScrabbleScreen(props: ScreenProps<unknown>) { return <DedicatedGameScreen kind="scrabble" {...props} />; }
