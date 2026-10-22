declare module 'howler' {
  export interface HowlOptions {
    src: string[];
    format?: string[];
    preload?: boolean;
    volume?: number;
  }
  export class Howl {
    constructor(options: HowlOptions);
    volume(): number;
    volume(value: number): this;
    play(): number;
    load(): this;
  }
  export const Howler: {
    mute(muted: boolean): void;
    volume(): number;
    volume(value: number): void;
  };
}
