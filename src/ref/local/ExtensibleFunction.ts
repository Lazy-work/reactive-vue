abstract class ExtensibleFunction<Parameters extends any[], ReturnType> extends Function {
  private __self__: this;

  constructor() {
    super('...args', 'return this.__self__.__call__(...args)');
    const self = this.bind(this);
    this.__self__ = self;
    return self;
  }

  abstract __call__(...args: Parameters): ReturnType;
}

export default ExtensibleFunction;
