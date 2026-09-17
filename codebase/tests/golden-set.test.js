import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('golden set has fifty complete and balanced C3 evaluation cases',async()=>{
  const csv=await readFile(new URL('../../eval/golden-set.csv',import.meta.url),'utf8');
  const [header,...rows]=csv.trim().split(/\r?\n/);
  assert.equal(header,'case_id,category,input,expected_output,difficulty,source');
  assert.equal(rows.length,50);
  const parsed=rows.map(row=>row.split(','));
  assert.ok(parsed.every(row=>row.length===6&&row.every(value=>value.trim().length>0)));
  const ids=parsed.map(row=>row[0]);assert.equal(new Set(ids).size,50);
  const totals=Object.fromEntries(['CITED','NEEDS_VERIFY','NO_SOURCE','OUT_OF_SCOPE'].map(category=>[category,parsed.filter(row=>row[1]===category).length]));
  assert.deepEqual(totals,{CITED:20,NEEDS_VERIFY:12,NO_SOURCE:10,OUT_OF_SCOPE:8});
});
