'use strict';
// Scoped payment documentation topology check, not a general Mermaid parser.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const files = [
  "docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md",
  "docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US03-Mua gói và khởi tạo thanh toán Mobile.md",
  "docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US06-Xem lịch sử thanh toán.md",
  "docs/user-stories/hoi-vien/HV05-Thông báo/HV05-US01-Xem và xử lý thông báo Hội viên.md",
  "docs/user-stories/le-tan/LT-W01-Tổng quan vận hành/LT-W01-US01-Xem tổng quan vận hành.md",
  "docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US01-Tạo đăng ký gói mới.md",
  "docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US02-Gia hạn đăng ký gói.md",
  "docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US03-Xem danh sách các đăng ký.md",
  "docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US04-Xem chi tiết lượt đăng ký gói.md",
  "docs/user-stories/le-tan/LT-W04-Đăng ký & gia hạn/LT-W04-US06-Đóng băng gói tập.md",
  "docs/user-stories/le-tan/LT-W07-Ra vào & check-in/LT-W07-US01-Xử lý check-in tự động qua thiết bị.md",
  "docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US01-Xem danh sách payment.md",
  "docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US02-Tạo payment.md",
  "docs/user-stories/le-tan/LT-W08-Thu tiền & thanh toán/LT-W08-US03-Xem thống kê.md",
  "docs/user-stories/le-tan/LT-W14-Chăm sóc & thông báo/LT-W14-US01-Tác nghiệp Chăm sóc khách hàng tại quầy.md",
  "docs/user-stories/pt/PT02-Học viên/PT02-US01-Xem danh sách học viên được phân công.md",
  "docs/user-stories/qtv/QTV-W01-Tổng quan vận hành/QTV-W01-US01-Xem tổng quan vận hành.md",
  "docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US01-Tạo đăng ký gói mới.md",
  "docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US02-Gia hạn đăng ký gói.md",
  "docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US03-Xem danh sách các đăng ký.md",
  "docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US04-Xem chi tiết lượt đăng ký gói.md",
  "docs/user-stories/qtv/QTV-W04-Đăng ký & gia hạn/QTV-W04-US06-Đóng băng gói tập.md",
  "docs/user-stories/qtv/QTV-W07-Ra vào & check-in/QTV-W07-US01-Xử lý check-in tự động qua thiết bị.md",
  "docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US01-Xem danh sách payment.md",
  "docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US02-Tạo payment.md",
  "docs/user-stories/qtv/QTV-W08-Thu tiền & thanh toán/QTV-W08-US03-Xem thống kê.md",
  "docs/user-stories/qtv/QTV-W09-Thông báo/QTV-W09-US01-Cấu hình thông báo tự động.md",
  "docs/user-stories/qtv/QTV-W14-Chăm sóc & thông báo/QTV-W14-US01-Quản lý tác nghiệp Chăm sóc khách hàng.md"
];

function validateDiagram(source,context) {
const issues=[],summary={diagrams:0,nodes:0,edges:0};
for(const match of source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)){
 const nodes=new Map(),edges=[],ids=new Set();let boundaries=0,lanes=0,stack=[];
 const err=msg=>issues.push(context+': '+msg);
 for(let line of match[1].split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){
  if(/^flowchart|^%%/.test(line))continue;
  if(/^subgraph/.test(line)){const sg=line.match(/^subgraph\s+(\w+)\[/);if(!sg){err('unsupported subgraph '+line);continue;}if(ids.has(sg[1]))err('duplicate subgraph/node ID '+sg[1]);ids.add(sg[1]);stack.push(line);if(/Boundary/.test(line))boundaries++;if(/Swimlane/.test(line))lanes++;continue;}
  if(line==='end'){if(!stack.length)err('unbalanced end');else stack.pop();continue;}
  const node=line.match(/^(\w+)(\(\(\(|\(\(|\{\{|\{|\[)"([^"]*)"(\)\)\)|\)\)|\}\}|\}|\])\s*$/);
  if(node){const[id,shape,label,close]=node.slice(1);if(ids.has(id))err('duplicate subgraph/node ID '+id);ids.add(id);if(close!=={'(((':')))','((':' ))'.trim(),'{{':'}}','{':'}','[':']'}[shape])err('shape '+id);nodes.set(id,{shape,label,incoming:[],outgoing:[]});continue;}
  line=line.replace(/--\s*"([^"]+)"\s*-->/g,'-->|$1|');
  const parts=line.split(/\s*-->(?:\|([^|]+)\|)?\s*/);
  if(parts.length<3){err('unsupported syntax '+line);continue;}
  for(let i=0;i+2<parts.length;i+=2){
   const from=parts[i].trim(),label=parts[i+1],to=parts[i+2].trim();
   if(!/^\w+$/.test(from)||!/^\w+$/.test(to))err('unsupported edge '+line);
   edges.push({from,to,label});
  }
 }
 if(stack.length)err('unclosed subgraph');
 if(boundaries!==1||lanes<2)err('boundary/swimlanes');
 for(const edge of edges){if(!nodes.has(edge.from)||!nodes.has(edge.to)){err('unknown endpoint '+edge.from+' -> '+edge.to);continue;}nodes.get(edge.from).outgoing.push(edge);nodes.get(edge.to).incoming.push(edge);}
 const initials=[...nodes].filter(([,n])=>/^Initial\b/.test(n.label));
 if(initials.length!==1)err('initial count '+initials.length);
 const reachable=new Set(),finals=new Set();
 function visit(id,seen,direction){if(seen.has(id)||!nodes.has(id))return;seen.add(id);for(const edge of nodes.get(id)[direction])visit(direction==='incoming'?edge.from:edge.to,seen,direction);}
 if(initials[0])visit(initials[0][0],reachable,'outgoing');
 for(const[id,n]of nodes){
 const ins=n.incoming.length,outs=n.outgoing.length;let ok;
 if(/^Initial\b/.test(n.label))ok=ins===0&&outs===1;
 else if(n.shape==='((('){ok=ins===1&&outs===0;visit(id,finals,'incoming');}
 else if(/^(Merge|Join)\b/.test(n.label))ok=ins>=2&&outs===1;
 else if(n.shape==='{')ok=ins===1&&outs>=2&&n.outgoing.every(e=>e.label);
 else ok=n.shape==='['&&ins===1&&outs===1;
 if(!ok)err(id+' '+n.label+' arity '+ins+'/'+outs);
 if(!reachable.has(id))err('unreachable '+id);
 }
 for(const[id]of nodes)if(!finals.has(id))err('no final path '+id);
 summary.diagrams++;summary.nodes+=nodes.size;summary.edges+=edges.length;
}
return {context,...summary,issues};
}

// Both declaration orders must reject Mermaid's shared subgraph/node namespace.
for (const duplicate of ['subgraph Clash["Boundary"]\nClash["Action"]', 'Clash["Action"]\nsubgraph Clash["Boundary"]', 'subgraph Clash["Boundary"]\nsubgraph Clash["Lane"]']) {
  const result = validateDiagram('\x60\x60\x60mermaid\nflowchart TB\n' + duplicate + '\nend\n\x60\x60\x60', 'collision regression');
  assert(result.issues.some(issue => issue.includes('duplicate subgraph/node ID Clash')));
}
const results = files.map(file => validateDiagram(fs.readFileSync(path.join(root, file), 'utf8'), file));
assert.equal(files.length, 28);
const errors = results.flatMap(r => r.diagrams === 1 ? r.issues : [...r.issues, r.context + ': expected exactly one diagram']);
const count = results.reduce((a,r) => ({diagrams:a.diagrams+r.diagrams,nodes:a.nodes+r.nodes,edges:a.edges+r.edges}), {diagrams:0,nodes:0,edges:0});
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: ' + count.diagrams + ' diagrams / ' + count.nodes + ' nodes / ' + count.edges + ' edges; 3 namespace regression checks.');
}
