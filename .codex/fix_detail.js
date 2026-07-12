 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.js';
 var s = fs.readFileSync(p, 'utf8');
 
 // Fix 1: admin view - add priority
 s = s.replace(
   'location: todoData.location || null\r\n          }',
   'location: todoData.location || null,\r\n            priority: todoData.priority || \'p2\'\r\n          }'
 );
 
 // Fix 2: share view - add priority
 s = s.replace(
   'images: parsedImages\r\n        }\r\n        todoTags: this.getTagsByIds(parsedTags),',
   'images: parsedImages,\r\n          priority: \'p2\'\r\n        }\r\n        todoTags: this.getTagsByIds(parsedTags),'
 );
 
 // Fix 3: options.index path (else clause) - add priority fallback
 s = s.replace(
   'const todo = todos[index]\r\n      \r\n      let setDate;',
   'const todo = todos[index]\r\n      if (!todo.priority) todo.priority = \'p2\';\r\n      \r\n      let setDate;'
 );
 
 fs.writeFileSync(p, s, 'utf8');
 var t = fs.readFileSync(p, 'utf8');
 console.log('Has admin priority:', t.includes('todoData.priority'));
 console.log('Has share priority:', t.includes('priority: \'p2\''));
 console.log('Has index fallback:', t.includes('!todo.priority) todo.priority'));
