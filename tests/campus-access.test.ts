import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campusPageAllowed, campusApiAllowed } from '../src/lib/campus-access';

test('campus keeps home, payout, guide and notifications while blocking inactive modules',()=>{
 for(const path of ['/campus/dashboard','/campus/guide','/campus/notifications','/campus/pencairan','/campus/pencairan/'])assert.equal(campusPageAllowed(path),true);
 for(const path of ['/campus/profile','/campus/settings','/campus/indicators','/campus/proposal','/campus/questions','/campus/questions/id','/campus/faq','/campus/lpj','/campus/pencairan/other','/admin/pencairan'])assert.equal(campusPageAllowed(path),false,path);
});

test('campus API access keeps payout and session support while rejecting other modules',()=>{
 for(const path of ['/api/pencairan','/api/pencairan/abc/documents/pks/versions','/api/session','/api/navigation','/api/auth/logout','/api/auth/change-password','/api/views/notifications','/api/notifications/read','/api/audit'])assert.equal(campusApiAllowed(path),true,path);
 for(const path of ['/api/views/dashboard','/api/views/indicators','/api/views/proposals','/api/views/questions','/api/views/faq','/api/questions','/api/proposals','/api/campuses/abc/program','/api/users','/api/admin/masters','/api/pencairan-other'])assert.equal(campusApiAllowed(path),false,path);
});
