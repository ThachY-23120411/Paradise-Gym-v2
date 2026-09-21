const assert=require('node:assert/strict');

module.exports=async function({request,db,A,L,M,m,pkg,b1,b2,day,shift}) {
  const create=(start=day())=>request('/registrations',{token:M,method:'POST',body:{member_id:m.id,package_id:pkg.id,start_date:start,sold_branch_id:b1}});
  const invoice=(r,token=M,method='BANK_TRANSFER')=>request('/payments/create-invoice',{token,method:'POST',body:{registration_id:r.id,payment_method:method}});
  const getIntent=id=>request(`/payments/${id}`,{token:M});
  const confirm=(id,body={},token=L,status=200)=>request(`/payments/${id}/confirm`,{token,method:'POST',body,status});
  const simulate=(id,body={},status=200)=>request(`/payments/${id}/simulate-transfer`,{token:M,method:'POST',body,status});
  const count=async(table,id)=>(await db.query(`SELECT COUNT(*)::int n FROM ${table} WHERE registration_id=$1`,[id])).rows[0].n;
  const freeze=(r,token,status=409)=>request(`/registrations/${r.id}/freeze`,{token,method:'POST',body:{freeze_days:1,reason:'Isolated payment rule test'},status});

  const pending=await create(),i=await invoice(pending);
  assert.deepEqual(i.payment_intent,i.payment);
  assert.equal(i.payment.resource_type,'PAYMENT_INTENT');assert.equal(i.payment.state,'PENDING');
  assert.equal(i.is_settled,false);assert.equal(await count('payments',pending.id),0);
  assert.equal(Date.parse(i.payment.expires_at)-Date.parse(i.payment.created_at),900000);
  const history=await request('/payments?limit=1000',{token:M});
  assert(history.items.every(p=>!('status' in p)&&!('state' in p)));
  assert(!history.items.some(p=>p.id===i.payment.id));
  await confirm(i.payment.id,{manual_confirmation:true},L,400);
  for(const token of [A,L,M])await freeze(pending,token);
  await db.query("UPDATE payment_intents SET expires_at=NOW()-interval '1 second' WHERE id=$1",[i.payment.id]);
  assert.equal((await getIntent(i.payment.id)).state,'EXPIRED');
  await simulate(i.payment.id,{},409);await confirm(i.payment.id,{transaction_ref:'EXPIRED-REF'},L,409);
  await db.query("UPDATE registrations SET created_at=NOW()-interval '30 days' WHERE id=$1",[pending.id]);
  await require('../src/modules/core/jobs').runScheduledNotifications();
  assert.equal((await request(`/registrations/${pending.id}`,{token:M})).status,'PENDING_PAYMENT');
  const renewed=await invoice(pending);assert.notEqual(renewed.payment.id,i.payment.id);
  assert.equal((await db.query('SELECT state FROM payment_intents WHERE id=$1',[i.payment.id])).rows[0].state,'EXPIRED');
  const outcomes=await Promise.all([simulate(renewed.payment.id),simulate(renewed.payment.id)]);
  assert.equal(outcomes[0].receipt.id,outcomes[1].receipt.id);
  const paid=outcomes[0];assert.equal(paid.payment.id,renewed.payment.id);assert.equal(paid.is_settled,true);
  assert.equal(paid.payment.payment_method,'BANK_TRANSFER');assert(!('status' in paid.payment));assert(!('state' in paid.payment));
  assert.equal((await getIntent(paid.payment.id)).resource_type,'PAYMENT');
  assert.equal(await count('payments',pending.id),1);
  assert.equal((await request(`/payments/${paid.payment.id}/receipt`,{token:M})).id,paid.receipt.id);
  await assert.rejects(db.query('DELETE FROM payments WHERE id=$1',[paid.payment.id]),e=>e.code==='23514');
  await assert.rejects(db.query('UPDATE payments SET amount=amount WHERE id=$1',[paid.payment.id]),e=>e.code==='23514');

  const manualReg=await create(),manual=await invoice(manualReg);
  await confirm(manual.payment.id,{manual_confirmation:true,transaction_ref:paid.payment.transaction_ref},L,409);
  const manualPaid=await confirm(manual.payment.id,{manual_confirmation:true,transaction_ref:'ISOLATED-MANUAL-TRANSFER'});
  assert.equal(manualPaid.payment.payment_method,'BANK_TRANSFER');
  assert.equal(manualPaid.payment.transaction_ref,'ISOLATED-MANUAL-TRANSFER');
  const check=await request('/payments/check-bank-status',{token:M,method:'POST',body:{payment_id:manual.payment.id}});
  assert.equal(check.is_settled,true);assert(!('status' in check));

  const cancelled=await create(),cancelIntent=await invoice(cancelled);
  await request(`/registrations/${cancelled.id}/cancel`,{token:M,method:'POST',body:{reason:'No longer needed'}});
  assert.equal((await getIntent(cancelIntent.payment.id)).state,'CANCELLED');
  await simulate(cancelIntent.payment.id,{},409);await confirm(cancelIntent.payment.id,{transaction_ref:'CANCELLED-REF'},L,409);
  assert.equal(await count('payments',cancelled.id),0);

  const switchReg=await create(),bank=await invoice(switchReg),cash=await invoice(switchReg,L,'CASH');
  assert.notEqual(bank.payment.id,cash.payment.id);assert.equal((await getIntent(bank.payment.id)).state,'CANCELLED');
  await simulate(bank.payment.id,{},409);await simulate(cash.payment.id,{},409);
  assert.equal((await confirm(cash.payment.id)).payment.payment_method,'CASH');

  const timed=await request('/packages',{token:A,method:'POST',body:{package_name:'Ledger timed',package_type:'GYM_TIME',price:125000,duration_days:10,branch_ids:[b1,b2]}});
  const timedReg=async(start)=>request('/registrations',{token:M,method:'POST',body:{member_id:m.id,package_id:timed.id,start_date:start,sold_branch_id:b1}});
  const future=await timedReg(shift(day(),2)),futureInvoice=await invoice(future,L,'CASH');
  await confirm(futureInvoice.payment.id);
  for(const token of [A,L,M])await freeze(future,token);
  for(const token of [A,L,M]){
    const active=await timedReg(day()),intent=await invoice(active,L,'CASH');await confirm(intent.payment.id);
    await db.query('UPDATE registrations SET end_date=$2 WHERE id=$1',[active.id,shift(day(),4)]);
    const detail=await request(`/registrations/${active.id}`,{token});
    assert.equal(detail.status,'ACTIVE');assert.equal(detail.display_status,'EXPIRING');assert.equal(detail.is_expiring,true);
    assert((await request('/registrations?status=EXPIRING',{token})).some(r=>r.id===active.id));
    await freeze(active,token,200);
  }
  const expiring=await request('/registrations?status=EXPIRING',{token:A});
  const care=await request('/customer-care/expiring',{token:A});
  const dashboard=await request('/dashboard',{token:A});
  assert.deepEqual(care.map(r=>r.id).sort(),expiring.map(r=>r.id).sort());
  assert.equal(dashboard.metrics.expiring_packages,expiring.length);
  const summary=await request('/customer-care/summary',{token:A});assert.equal(Number(summary.expiring_soon_4days),expiring.length);
  const stats=await request('/payments/stats',{token:A});assert(!('pending_registrations' in stats));
  console.log('PASS payment ledger: intent/history separation, expiry retention, repeat/concurrent settlement, reference dedup, cancellation, method rollover, all-role freeze and consistent expiry consumers');
};
