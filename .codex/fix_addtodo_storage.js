 var fs = require('fs');
 var C = String.fromCharCode(13, 10);
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.js';
 var s = fs.readFileSync(p, 'utf8');
 
 // Fix 1: add priority to newTodo
 var old = 'images: this.data.images,' + C + '      version: 1,';
 var neu = 'images: this.data.images,' + C + '      priority: this.data.priority,' + C + '      version: 1,';
 s = s.replace(old, neu);
 fs.writeFileSync(p, s, 'utf8');
 var t = fs.readFileSync(p, 'utf8');
 console.log('1 newTodo priority:', t.includes('priority: this.data.priority'));
 
 // Fix 2: add priority to addTodoFromChild call
 var old2 = 'newTodo.images' + C + '      );';
 var neu2 = 'newTodo.images,' + C + '        newTodo.priority' + C + '      );';
 s = fs.readFileSync(p, 'utf8');
 s = s.replace(old2, neu2);
 fs.writeFileSync(p, s, 'utf8');
 t = fs.readFileSync(p, 'utf8');
 console.log('2 addTodoFromChild call:', t.includes('newTodo.priority'));
