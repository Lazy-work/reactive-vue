const optimizeFnProp = {
  JSXAttribute(path) {
    const expression = path.get("value.expression");
    if (expression.isArrowFunctionExpression() || expression.isFunctionExpression()) {
      const t = this.types;
      const cbId = path.scope.generateUidIdentifier("cb");
      const cbVar = t.variableDeclaration("const", [t.variableDeclarator(cbId, expression.node)]);
      const returnSt = path.findParent((path) => path.isReturnStatement());
      if (!returnSt) return;
      returnSt.insertBefore(cbVar);
      expression.replaceWith(cbId);
    }
  }
};

const handleReactiveComponent = {
  ReturnStatement(path) {
    const t = this.types;
    const argument = path.get('argument');
    if (argument.isJSXElement()) {
      argument.replaceWith(t.arrowFunctionExpression([], argument.node));
    }
  },
  JSXElement(path) {
    if (this.seen.includes(path.node)) return;
    this.seen.push(path.node);
    const t = this.types;

    const program = path.findParent((path) => path.isProgram());
    this.rsxIdentifier = program.scope.generateUidIdentifier('rsx');

    program.unshiftContainer('body', [
      t.importDeclaration(
        [t.importSpecifier(this.rsxIdentifier, t.identifier('rsx'))],
        t.stringLiteral('@lazywork/reactive-vue-jsx-runtime'),
      ),
    ]);
    
    const container = path.findParent((path) => path.isJSXExpressionContainer());
    const isInFunctionCall = path.findParent((path) => container && path.node === container.node || path.isCallExpression()).isCallExpression();
    if (container && isInFunctionCall) return;
    const props = path.get("openingElement");
    props.traverse(optimizeFnProp, { types: t, seen: this.seen });

    const cbJsx = t.arrowFunctionExpression([], path.node);

    const cbId = path.scope.generateUidIdentifier("cbJsx");
    const cbVar = t.variableDeclaration("const", [t.variableDeclarator(cbId, cbJsx)]);

    const parent = path.findParent((path) => path.isReturnStatement() || path.isVariableDeclaration());

    if (!parent) return;
    parent.insertBefore(cbVar);
    if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
      path.replaceWith(t.JSXExpressionContainer(t.callExpression(this.rsxIdentifier, [cbId])));
    } else {
      path.replaceWith(t.callExpression(this.rsxIdentifier, [cbId]));
    }
  },
};
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
export default function (babel) {
  const { types: t } = babel;
  const seen = [];
  return {
    name: 'reactive-vue-optimizer',
    visitor: {
      CallExpression(path) {
        if (path.node.callee.name === 'reactivity') {
          path.traverse(handleReactiveComponent, { types: t, seen });
        }
      },
    },
  };
}
