import { PGlite } from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
await db.exec(readFileSync('database/setup.sql','utf8'));
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const data={version:1,children:[],tasks:[],rewards:[],logs:{},redemptions:[]};
async function as(id){await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id])}
async function save(rev,mutation,obj=data){return (await db.query('select public.yawmuna_save($1::jsonb,$2::bigint,$3::uuid) as board',[JSON.stringify(obj),rev,mutation])).rows[0].board}
await as(a);const m1='33333333-3333-4333-8333-333333333333',m2='44444444-4444-4444-8444-444444444444',m3='55555555-5555-4555-8555-555555555555';
assert.equal((await save(0,m1)).revision,1);assert.equal((await save(0,m1)).revision,1);
assert.equal((await save(1,m2)).revision,2);
await assert.rejects(save(1,m3),/REVISION_CONFLICT/);
await assert.rejects(save(2,m3,{version:1}),/check constraint/);
await as(b);assert.equal((await db.query('select * from public.yawmuna_boards')).rows.length,0);await save(0,m3);assert.equal((await db.query('select * from public.yawmuna_boards')).rows[0].user_id,b);
await assert.rejects(db.query('update public.yawmuna_boards set user_id=$1 where user_id=$2',[a,b]),/row-level security/);
assert.equal((await db.query('update public.yawmuna_boards set revision=9 where user_id=$1 returning user_id',[a])).rows.length,0);
await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from public.yawmuna_boards'),/permission denied/);await assert.rejects(save(0,m1),/permission denied/);
await db.exec('reset role');await db.exec(readFileSync('database/setup.sql','utf8'));assert.equal((await db.query('select count(*)::int as n from public.yawmuna_boards')).rows[0].n,2);
await db.close();console.log('PASS: create, save, idempotent retry, stale write conflict, shape validation, account isolation, ownership reassignment denial, anonymous denial, non-destructive SQL rerun.');
