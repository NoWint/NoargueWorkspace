 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\backend\\controllers\\todoController.js';
 var s = fs.readFileSync(p, 'utf8');
 s = s.replace('images = ?, combo_id = ?, version = ?, updated_at = NOW()',
   'images = ?, priority = ?, combo_id = ?, version = ?, updated_at = NOW()');
 s = s.replace('resolvedImagesJson,\r\n                  resolved.comboId || null,',
   'resolvedImagesJson,\r\n                  resolved.priority || \'p2\',\r\n                  resolved.comboId || null,');
 fs.writeFileSync(p, s, 'utf8');
 var t = fs.readFileSync(p, 'utf8');
 console.log('SQL has priority:', t.includes('priority = ?, combo_id'));
 console.log('VALUES has priority:', t.includes('resolved.priority'));
