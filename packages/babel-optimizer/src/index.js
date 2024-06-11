let t;

const optimizeFnProp = {
  JSXAttribute(path) {
    const expression = path.get("value.expression");
    if (expression.isArrowFunctionExpression() || expression.isFunctionExpression()) {
      const cbId = path.scope.generateUidIdentifier("cb");
      const cbVar = t.variableDeclaration("const", [t.variableDeclarator(cbId, expression.node)]);
      this.componentReturn.insertBefore(cbVar);
      expression.replaceWith(cbId);
    }
  }
};

const isDirtyTraverse = {
  "ArrowFunctionExpression|FunctionExpression": {
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
    }
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
    }
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
  }
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
    const jsxId = parent.scope.generateUidIdentifier("jsx");
    const jsxDec = t.variableDeclarator(jsxId, child);
    const jsxVar = t.variableDeclaration("const", [jsxDec]);
    p.insertBefore(jsxVar);
    parent.get(`children.${i}`).replaceWith(t.JSXExpressionContainer(jsxId));
  }
}

const optimizeStatic = {
  "ArrowFunctionExpression|FunctionExpression": {
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
    }
  },
  JSXElement: {
    enter(path) {
      console.log(path.node)
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
      const parent = this.parents.at(-2);
      if (path.node === this.parents.at(-1)) {
        this.parents.length--;
      }

      const isDirty = this.dirtiness.get(path.node);

      if (isDirty) {
        moveChildren(path, this.dirtiness, this.componentReturn);
      }
    }
  }
};

const breakDownReturn = {
  JSXElement: {
    exit(path) {
      const program = path.findParent((path) => path.isProgram());
      this.rsxIdentifier = program.scope.generateUidIdentifier("rsx");

      if (!this.rsxIdentifier) {
        program.unshiftContainer("body", [
          t.importDeclaration(
            [t.importSpecifier(this.rsxIdentifier, t.identifier("rsx"))],
            t.stringLiteral("@lazywork/reactive-vue-jsx-runtime")
          )
        ]);
      }

      const container = path.findParent((path) => path.isJSXExpressionContainer());
      const isInFunctionCall = path
        .findParent((path) => (container && path.node === container.node) || path.isCallExpression())
        .isCallExpression();
      if (container && isInFunctionCall) return;
      const props = path.get("openingElement");
      props.traverse(optimizeFnProp, { types: t, seen: this.seen, componentReturn: this.componentReturn });

      const cbJsx = t.arrowFunctionExpression([], path.node);

      const cbId = path.scope.generateUidIdentifier("cbJsx");
      const cbVar = t.variableDeclaration("const", [t.variableDeclarator(cbId, cbJsx)]);

      this.componentReturn.insertBefore(cbVar);
      if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
        path.replaceWith(t.JSXExpressionContainer(t.callExpression(this.rsxIdentifier, [cbId])));
      } else {
        path.replaceWith(t.callExpression(this.rsxIdentifier, [cbId]));
      }
    }
  }
};

const findReturns = {
  "ArrowFunctionExpression|FunctionExpression|FunctionDeclaration": {
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
    }
  },
  ReturnStatement(path) {
    if (this.ignore) return;
    this.returns.push(path);
  }
}

const handleReactiveComponent = {
  ReturnStatement(path) {
    const t = this.types;
    const argument = path.get("argument");
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
      jsxList = [body];
    }
    for (const jsx of jsxList) {
      jsx.traverse(optimizeStatic, { dirtiness: new WeakMap(), parents: [], componentReturn: this.componentReturn });
      jsx.traverse(breakDownReturn, { componentReturn: this.componentReturn });
    }
  }
};

let rsxIdentifier;
export default function (babel) {
  const { types } = babel;
  t = types;
  return {
    name: "reactive-vue-auto",
    visitor: {
      Program(path) {
        if (!rsxIdentifier) {
          rsxIdentifier = path.scope.generateUidIdentifier("rsx");

          path.unshiftContainer("body", [
            t.importDeclaration([t.importSpecifier(rsxIdentifier, t.identifier("rsx"))], t.stringLiteral("@lazywork/jsx-runtime-vue"))
          ]);
        }
      },
      CallExpression(path) {
        if (path.node.callee.name === "reactivity") {
          const componentBody = path.get('arguments.0.body');
          const returnIndex = componentBody.node.body.findIndex((item) => t.isReturnStatement(item))
          const componentReturn = componentBody.get(`body.${returnIndex}`)
          path.traverse(handleReactiveComponent, { types: t, componentReturn });
        }
      }
    }
  };
}
