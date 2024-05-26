import type IContext from '../context/IContext';
import { DebuggerEvent } from '../types';

abstract class AbstractEffect {
  constructor(
    protected _id: number,
    protected _context: IContext,
    protected _onTrack?: (event: DebuggerEvent) => void,
    protected _onTrigger?: (event: DebuggerEvent) => void,
  ) {}

  abstract get id(): number;
  abstract run(): void;
  abstract get onTrack(): ((event: DebuggerEvent) => void) | undefined;
  abstract get onTrigger(): ((event: DebuggerEvent) => void) | undefined;
}

export default AbstractEffect;
