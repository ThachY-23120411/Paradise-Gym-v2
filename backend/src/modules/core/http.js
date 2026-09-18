const { randomUUID } = require('crypto');
const { pool } = require('../../db/postgres');
const { localize } = require('./messages');
const fail = (status, message, code = 'VALIDATION_ERROR') => { throw Object.assign(new Error(message), { status, code }); };
const route = fn => (req, res, next) => Promise.resolve(fn(req, res)).then(data => {
  if (!res.headersSent) res.json({ success: true, data, message: 'Success' });
}).catch(next);
const text = (value, field, max = 255, required = true) => {
  if (value == null || value === '') { if (!required) return null; fail(400, `${field} is required`); }
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, `${field} is invalid`);
  return value.trim().replace(/\s+/g, ' ');
};
function phone(value, landline = false) {
  let result = String(value || '').replace(/[\s().-]/g, '').replace(/^\+84/, '0');
  if (!(landline ? /^0\d{9,10}$/ : /^0\d{9}$/).test(result)) fail(400, 'Invalid Vietnamese phone number');
  return result;
}
function date(value, field = 'date') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value) fail(400, `${field} must be YYYY-MM-DD`);
  return value;
}
const today = () => new Date(Date.now()+7*3600000).toISOString().slice(0,10);
const addDays = (day, count) => new Date(Date.parse(day)+count*86400000).toISOString().slice(0,10);
function choice(value, options, field) { if (!options.includes(value)) fail(400, `Invalid ${field}`); return value; }
function integer(value, field, min = 1, max = 100000) { const n=Number(value); if (!Number.isInteger(n)||n<min||n>max) fail(400, `Invalid ${field}`); return n; }
function only(body, allowed) { const invalid = Object.keys(body).filter(k=>!allowed.includes(k)); if (invalid.length) fail(400, `Fields cannot be changed: ${invalid.join(', ')}`); }
const isStaff = req => ['QTV','RECEPTIONIST'].includes(req.user.active_role);
function role(req, ...allowed) { if (!allowed.includes(req.user.active_role)) fail(403, 'Role does not allow this operation', 'FORBIDDEN'); }
function globalAdmin(req) { role(req,'QTV'); if (!req.user.is_all_branches) fail(403, 'All-branches administrator required','FORBIDDEN'); }
function financial(req) { role(req,'QTV','RECEPTIONIST'); if (!req.user.permissions.view_financial) fail(403,'Financial permission required','FORBIDDEN'); }
function branch(req, id) {
  if (!id || (!req.user.is_all_branches && !req.user.branch_ids.includes(id))) fail(403, 'Branch outside authorized scope','FORBIDDEN');
  return id;
}
function selected(req, explicit) {
  const header=req.headers['x-branch-id'];
  if(header && explicit && header!==explicit) fail(403,'Branch must match current working branch','FORBIDDEN');
  const id=explicit||header||req.query.branch_id||(!req.user.is_all_branches&&req.user.branch_ids.length===1?req.user.branch_ids[0]:null);
  if(!id) fail(400,'Select a working branch');
  return branch(req,id);
}
function scope(req) {
  if (!req.user) return null;
  const header=req.headers['x-branch-id'], query=req.query.branch_id;
  if(header && query && header!==query) fail(403,'Conflicting branch scope','FORBIDDEN');
  const id=query||header;
  return id ? [branch(req,id)] : req.user.is_all_branches ? null : req.user.branch_ids;
}
async function row(db, table, id, lock = false) {
  const result=await db.query(`SELECT * FROM ${table} WHERE id=$1${lock?' FOR UPDATE':''}`, [id]);
  if(!result.rows.length) fail(404,'Record not found','NOT_FOUND');
  return result.rows[0];
}
async function activeBranch(db,id) { const b=await row(db,'branches',id,true); if(b.status!=='ACTIVE') fail(409,'Branch is inactive'); return b; }
async function audit(db,req,table,target,action,before,after,branchId,reason) {
  await db.query('INSERT INTO audit_logs(actor_account_id,branch_id,action_name,target_table,target_id,old_values,new_values,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [req.user.account_id,branchId||null,action,table,target,before?JSON.stringify(before):null,after?JSON.stringify(after):null,reason||null]);
}
async function code(db,table,column,prefix) {
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`code:${table}`]);
  const {rows}=await db.query(`SELECT COALESCE(MAX(substring(${column} from $1)::bigint),0)+1 AS n FROM ${table} WHERE ${column} ~ $2`, [`^${prefix}([0-9]+)$`,`^${prefix}[0-9]+$`]);
  return prefix+String(rows[0].n).padStart(3,'0');
}
function page(items,query) {
  const p=integer(query.page||1,'page'),limit=integer(query.limit||20,'limit',1,1000);
  return {items:items.slice((p-1)*limit,p*limit),total:items.length,page:p,limit};
}
function search(items, query, fields) {
  const q=String(query.q||'').toLocaleLowerCase('vi');
  return items.filter(x=>(!query.status || query.status==='ALL' || x.status===query.status) && (!q || fields.some(k=>String(x[k]||'').toLocaleLowerCase('vi').includes(q))));
}
function errorHandler(err,req,res,next) {
  if(res.headersSent) return next(err);
  const dbCodes={ '23505':[409,'Dữ liệu đã tồn tại. Vui lòng kiểm tra số điện thoại hoặc mã định danh.'], '23503':[409,'Dữ liệu tham chiếu không tồn tại hoặc đang được sử dụng.'], '23514':[409,'Dữ liệu không đáp ứng ràng buộc nghiệp vụ.'], '22P02':[400,'Mã định danh hoặc giá trị không hợp lệ.'], '22007':[400,'Ngày không hợp lệ.'], '22008':[400,'Ngày không hợp lệ.'], '40P01':[409,'Dữ liệu đang được cập nhật đồng thời. Vui lòng thử lại.'], '40001':[409,'Dữ liệu đã thay đổi. Vui lòng thử lại.'] };
  const mapped=dbCodes[err.code];
  const connection=['ECONNREFUSED','ENOTFOUND','57P01','08006'].includes(err.code)||String(err.message).includes('Connection terminated');
  const status=err.status||mapped?.[0]||(connection?503:500);
  if(status>=500) console.error('[API]',err.code||'',err.message);
  res.status(status).json({success:false,message:err.status?localize(err):mapped?.[1]||(connection?'Chưa kết nối được cơ sở dữ liệu. Vui lòng thử lại sau.':'Không thể xử lý yêu cầu. Vui lòng thử lại sau.'),code:err.status?err.code:(connection?'DATABASE_UNAVAILABLE':'REQUEST_FAILED')});
}
module.exports={pool,route,fail,text,phone,date,today,addDays,choice,integer,only,isStaff,role,globalAdmin,financial,branch,selected,scope,row,activeBranch,audit,code,page,search,errorHandler,uuid:randomUUID};
