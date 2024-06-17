let t;
let rsxIdentifier;
const alreadyOptimized = new Set();
const toOptimize = new Set();
const REACTIVE_NAME = '$reactive';

const optimizeFnProp = {
  JSXAttribute(path) {
    const expression = path.get('value.expression');
    if (expression.isArrowFunctionExpression() || expression.isFunctionExpression()) {
      const cbId = path.scope.generateUidIdentifier('cb');
      const cbVar = t.variableDeclaration('const', [t.variableDeclarator(cbId, expression.node)]);
      this.componentReturn.insertBefore(cbVar);
      expression.replaceWith(cbId);
    }
  },
};

const isDirtyTraverse = {
  'ArrowFunctionExpression|FunctionExpression': {
    enter(path) {
      if (!this.ignoredBlock) {
        this.ignoredBlock = path.node;
        this.ignore = true;
      }
    },
    exit(path) {
      if (this.ignoredBlock === path.node) {
        this.ignoredBlock = null;
        this.ignore = false;
      }
    },
  },
  JSXExpressionContainer: {
    enter(path) {
      if (this.toInspect.includes(path.node)) {
        this.observe = true;
      }
    },
    exit(path) {
      if (this.toInspect.includes(path.node)) {
        this.observe = false;
      }
    },
  },
  MemberExpression(path) {
    if (this.observe && !this.ignore) {
      this.dirty();
      path.stop();
    }
  },
  CallExpression(path) {
    if (this.observe && !this.ignore) {
      this.dirty();
      path.stop();
    }
  },
};

function isDirty(path) {
  const toInspect = [];
  for (const child of path.node.children) {
    if (t.isJSXExpressionContainer(child)) {
      toInspect.push(child);
    }
  }
  for (const child of path.node.openingElement.attributes) {
    if (t.isJSXExpressionContainer(child.value)) {
      toInspect.push(child.value);
    }
  }
  let dirty = false;
  path.traverse(isDirtyTraverse, { dirty: () => (dirty = true), toInspect });
  return dirty;
}

function moveChildren(parent, dirtiness, componentReturn) {
  const p = componentReturn;
  if (!p) return;
  const children = parent.node.children;

  for (let i = 0; i < children.length; i++) {
    let child = children[i];
    if (!t.isJSXElement(child) && !t.isJSXFragment(child)) continue;
    if (dirtiness.get(child)) continue;
    if (t.isJSXExpressionContainer(child)) child = child.expression;
    const jsxId = parent.scope.generateUidIdentifier('jsx');
    const jsxDec = t.variableDeclarator(jsxId, child);
    const jsxVar = t.variableDeclaration('const', [jsxDec]);
    p.insertBefore(jsxVar);
    parent.get(`children.${i}`).replaceWith(t.JSXExpressionContainer(jsxId));
  }
}

const optimizeStatic = {
  'ArrowFunctionExpression|FunctionExpression': {
    enter(path) {
      if (!this.ignoredBlock) {
        this.ignoredBlock = path.node;
        this.ignore = true;
      }
    },
    exit(path) {
      if (this.ignoredBlock === path.node) {
        this.ignoredBlock = null;
        this.ignore = false;
      }
    },
  },
  JSXElement: {
    enter(path) {
      if (this.ignore) return;
      if (!this.dirtiness.has(path.node)) this.dirtiness.set(path.node, false);

      const parent = this.parents[this.parents.length - 1];
      const isParentDirty = this.dirtiness.get(parent);

      if (isDirty(path)) {
        this.dirtiness.set(path.node, true);
        if (!isParentDirty) for (const parent of this.parents) this.dirtiness.set(parent, true);
      }

      this.parents.push(path.node);
    },
    exit(path) {
      if (this.ignore) return;
      if (path.node === this.parents.at(-1)) {
        this.parents.length--;
      }

      const isDirty = this.dirtiness.get(path.node);

      if (isDirty) {
        moveChildren(path, this.dirtiness, this.componentReturn);
      }
    },
  },
};

const breakDownReturn = {
  JSXElement: {
    exit(path) {
      if (!rsxIdentifier) {
        const program = path.findParent((path) => path.isProgram());
        rsxIdentifier = program.scope.generateUidIdentifier('rsx');
        program.unshiftContainer('body', [
          t.importDeclaration(
            [t.importSpecifier(rsxIdentifier, t.identifier('rsx'))],
            t.stringLiteral('/node_modules/@lazywork/reactive-vue-jsx-runtime/'),
          ),
        ]);
      }

      const container = path.findParent((path) => path.isJSXExpressionContainer());
      if (container) {
        const isInFunctionCall = path
          .findParent((path) => path.node === container.node || path.isCallExpression())
          .isCallExpression();
        if (isInFunctionCall) return;
      }
      const props = path.get('openingElement');
      props.traverse(optimizeFnProp, { types: t, seen: this.seen, componentReturn: this.componentReturn });

      const cbJsx = t.arrowFunctionExpression([], path.node);

      const cbId = path.scope.generateUidIdentifier('cbJsx');
      const cbVar = t.variableDeclaration('const', [t.variableDeclarator(cbId, cbJsx)]);

      this.componentReturn.insertBefore(cbVar);
      if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
        path.replaceWith(t.JSXExpressionContainer(t.callExpression(rsxIdentifier, [cbId])));
      } else {
        path.replaceWith(t.callExpression(rsxIdentifier, [cbId]));
      }
    },
  },
};

const findReturns = {
  'ArrowFunctionExpression|FunctionExpression|FunctionDeclaration': {
    enter(path) {
      if (!this.ignoredBlock) {
        this.ignoredBlock = path.node;
        this.ignore = true;
      }
    },
    exit(path) {
      if (this.ignoredBlock === path.node) {
        this.ignoredBlock = null;
        this.ignore = false;
      }
    },
  },
  ReturnStatement(path) {
    if (this.ignore) return;
    this.returns.push(path);
  },
};

const handleReactiveComponent = {
  ReturnStatement(path) {
    const t = this.types;
    const argument = path.get('argument');
    if (this.componentReturn.node === path.node && argument.isJSXElement()) {
      argument.replaceWith(t.arrowFunctionExpression([], argument.node));
    }
    const body = argument.get('body');
    let jsxList;
    if (body.isBlockStatement()) {
      const returns = [];
      body.traverse(findReturns, { returns });
      jsxList = returns;
    } else {
      jsxList = [argument];
    }
    for (const jsx of jsxList) {
      jsx.traverse(optimizeStatic, { dirtiness: new WeakMap(), parents: [], componentReturn: this.componentReturn });
      jsx.traverse(breakDownReturn, { componentReturn: this.componentReturn });
    }
  },
};

const isReactiveComponent = {
  CallExpression(path) {
    if (
      path.node.callee.name === REACTIVE_NAME &&
      t.isIdentifier(path.node.arguments[0]) &&
      path.node.arguments[0].name === this.idName
    ) {
      this.isReactive();
    }
  }
};

function optimizeComponent(componentBody) {
  const returnIndex = componentBody.node.body.findIndex((item) => t.isReturnStatement(item));
  const componentReturn = componentBody.get(`body.${returnIndex}`);
  componentBody.traverse(handleReactiveComponent, { types: t, componentReturn });
}

function isComponentishName(name) {
  return typeof name === "string" && name[0] >= "A" && name[0] <= "Z";
}

let program;
export default function (babel) {
  const { types } = babel;
  t = types;
  return {
    name: 'reactive-vue-compiler',
    visitor: {
      Program: {
        enter(path) {
          program = path;
        },
        exit() {
          rsxIdentifier = undefined; 
          program = undefined;
        }
      },
      FunctionDeclaration(path) {
        if (isComponentishName(path.node.id.name)) {
          let isReactive = false;
          program.traverse(isReactiveComponent, {
            isReactive: () => void (isReactive = true),
            idName: path.node.id.name
          });
          if (isReactive) {
            const componentBody = path.get("body");
            optimizeComponent(componentBody);
          }
        }
      },
      VariableDeclaration(path) {
        if (path.node.declarations.length === 0) return;
        const declaration = path.get("declarations.0");

        if (
          isComponentishName(declaration.node.id.name) &&
          t.isCallExpression(declaration.node.init) &&
          declaration.node.init.callee.name === REACTIVE_NAME
        ) {
          let root = declaration.get("init");

          const argument = root.get("arguments.0");
          if (argument.isArrowFunctionExpression() || argument.isFunctionExpression()) {
            const componentBody = argument.get("body");
            optimizeComponent(componentBody);
            alreadyOptimized.add(declaration.node.id.name);
            toOptimize.delete(declaration.node.id.name);
          }

          if (argument.isIdentifier()) {
            if (!alreadyOptimized.has(declaration.node.id.name)) {
              toOptimize.add(declaration.node.id.name);
            }
          }
        }
      }
    }
  };
}
