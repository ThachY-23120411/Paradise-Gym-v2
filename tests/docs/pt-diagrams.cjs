const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
const stories = [
  ...files(path.join(root, 'docs/user-stories/pt')).filter(file => /PT\d+-US\d+/.test(path.basename(file))),
  ...files(path.join(root, 'docs/user-stories/qtv')).filter(file => /QTV-W15-US0[23]/.test(path.basename(file)))
];
let diagrams = 0, totalNodes = 0;
for (const file of stories) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)) {
    const nodes = new Map(), edges = [];
    const context = path.relative(root, file);
    for (const line of match[1].split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
      if (/^(flowchart|subgraph|end\b|%%)/.test(line)) continue;
      const edge = line.match(/^(\w+)\s*-->(?:\|([^|]+)\|)?\s*(\w+)\s*$/);
      if (edge) { edges.push({ from: edge[1], label: edge[2], to: edge[3] }); continue; }
      const node = line.match(/^(\w+)(\(\(\(|\(\(|\{\{|\{|\[)"([^"]*)"(\)\)\)|\)\)|\}\}|\}|\])\s*$/);
      assert(node, `${context}: unsupported diagram syntax: ${line}`);
      assert(!nodes.has(node[1]), `${context}: duplicate ${node[1]}`);
      const [id, shape, label, close] = node.slice(1);
      assert.equal(close, { '(((': ')))', '((': '))', '{{': '}}', '{': '}', '[': ']' }[shape], context);
      nodes.set(id, { label, shape, incoming: [], outgoing: [] });
    }
    for (const edge of edges) {
      assert(nodes.has(edge.from) && nodes.has(edge.to), `${context}: undeclared edge endpoint`);
      nodes.get(edge.from).outgoing.push(edge);
      nodes.get(edge.to).incoming.push(edge);
    }
    const initial = [...nodes].filter(([, node]) => /^Initial\b/.test(node.label));
    assert.equal(initial.length, 1, `${context}: one initial required`);
    const reachable = new Set();
    function visit(id) {
      if (reachable.has(id)) return;
      reachable.add(id);
      nodes.get(id).outgoing.forEach(edge => visit(edge.to));
    }
    visit(initial[0][0]);
    const reachesFinal = new Set();
    function reverseVisit(id) {
      if (reachesFinal.has(id)) return;
      reachesFinal.add(id);
      nodes.get(id).incoming.forEach(edge => reverseVisit(edge.from));
    }
    for (const [id, node] of nodes) {
      const ins = node.incoming.length, outs = node.outgoing.length;
      const location = `${context}: ${id} (${node.label}) ${ins}/${outs}`;
      if (/^Initial\b/.test(node.label)) assert(ins === 0 && outs === 1, location);
      else if (node.shape === '(((') { assert(ins === 1 && outs === 0, location); reverseVisit(id); }
      else if (/^(Merge|Join)\b/.test(node.label)) assert(ins >= 2 && outs === 1, location);
      else if (node.shape === '{') { assert(ins === 1 && outs >= 2, location); assert(node.outgoing.every(edge => edge.label), location); }
      else assert(node.shape === '[' && ins === 1 && outs === 1, location);
      assert(reachable.has(id), `${location}: unreachable`);
    }
    assert.equal(reachesFinal.size, nodes.size, `${context}: path cannot reach final`);
    diagrams++;
    totalNodes += nodes.size;
  }
}
assert(diagrams >= stories.length, 'Missing activity diagram');
console.log(`PASS ${stories.length} stories, ${diagrams} diagrams, ${totalNodes} nodes: arity, labels, reachability and final paths. Static topology only; not a Mermaid renderer.`);
