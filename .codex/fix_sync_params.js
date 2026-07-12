 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\backend\\controllers\\todoController.js';
 var b = fs.readFileSync(p);
 var s = b.toString('utf8');
 
 // 1. SQL SET: add priority = ? after images = ?
 s = s.replace('images = ?, \n                 combo_id = ?, version = ?, updated_at = NOW()',
               'images = ?, priority = ?, \n                 combo_id = ?, version = ?, updated_at = NOW()');
 
 // 2. VALUES: add resolved.priority between resolvedImagesJson and comboId
 s = s.replace('resolvedImagesJson,\n                  resolved.comboId || null,',
               'resolvedImagesJson,\n                  resolved.priority || \'p2\',\n                  resolved.comboId || null,');
 
 fs.writeFileSync(p, s, 'utf8');
 var t = fs.readFileSync(p, 'utf8');
 console.log('SQL has priority:', t.includes('priority = ?, \n                 combo_id'));
 console.log('VALUES has priority:', t.includes('resolved.priority'));
