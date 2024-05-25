import type IContext from '../context/IContext';

abstract class AbstractEffect {
  constructor(
    protected _id: number,
    protected _context: IContext,
  ) {}

  abstract get id(): number;
  abstract run(): void;
}

export default AbstractEffect;
