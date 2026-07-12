 var fs = require('fs');
 
 // Step 1: database.sql
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\backend\\database.sql';
 var s = fs.readFileSync(p, 'utf8');
 s = s.replace(
   'images TEXT DEFAULT NULL,\n    version INT DEFAULT 1,',
   'images TEXT DEFAULT NULL,\n    priority VARCHAR(8) DEFAULT \'p2\',\n    version INT DEFAULT 1,'
 );
 s = s.replace(
   'images TEXT DEFAULT NULL,\n    completed_at BIGINT DEFAULT 0,',
   'images TEXT DEFAULT NULL,\n    priority VARCHAR(8) DEFAULT \'p2\',\n    completed_at BIGINT DEFAULT 0,'
 );
 fs.writeFileSync(p, s, 'utf8');
 console.log('database.sql updated');
 
 // Step 2: todoController.js - formatTodo
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\backend\\controllers\\todoController.js';
 s = fs.readFileSync(p, 'utf8');
 s = s.replace(
   'updatedAt: todo.updated_at ? new Date(todo.updated_at).getTime() : null\n  };',
   'updatedAt: todo.updated_at ? new Date(todo.updated_at).getTime() : null,\n    priority: todo.priority || \'p2\'\n  };'
 );
 // create - add priority to INSERT
 s = s.replace(
   '(user_id, todo_id, text, set_date, set_time, remarks, location_text, is_star, combo_id, images, version, created_at, updated_at)',
   '(user_id, todo_id, text, set_date, set_time, remarks, location_text, is_star, combo_id, images, priority, version, created_at, updated_at)'
 );
 s = s.replace(
   'isStar ? 1 : 0,\n        comboId || null,\n        imagesJson',
   'isStar ? 1 : 0,\n        comboId || null,\n        imagesJson,\n        req.body.priority || \'p2\''
 );
 // update - add priority to dynamic fields
 s = s.replace(
   'if (images !== undefined) {',
   'if (priority !== undefined) {\n      updateFields.push(\'priority = ?\');\n      updateValues.push(priority);\n    }\n    if (images !== undefined) {'
 );
 // sync UPDATE - add priority
 s = s.replace(
   'text = ?, set_date = ?, set_time = ?, remarks = ?, location_text = ?, \n                 completed = ?, is_star = ?, tags = ?, images = ?, combo_id = ?, version = ?, updated_at = NOW()',
   'text = ?, set_date = ?, set_time = ?, remarks = ?, location_text = ?, \n                 completed = ?, is_star = ?, tags = ?, images = ?, priority = ?, combo_id = ?, version = ?, updated_at = NOW()'
 );
 s = s.replace(
   'resolved.text,\n                  resolved.setDate',
   'resolved.text,\n                  resolved.priority || \'p2\',\n                  resolved.setDate'
 );
 fs.writeFileSync(p, s, 'utf8');
 console.log('todoController.js updated');
 
 // Step 3: add-todo.js
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.js';
 s = fs.readFileSync(p, 'utf8');
 s = s.replace('assignType: \'all\'', 'assignType: \'all\',\n    priority: \'p2\'');
 s = s.replace('setAssignType(e)', 'setPriority(e) {\n    this.setData({ priority: e.currentTarget.dataset.priority });\n  },\n\n  setAssignType(e)');
 s = s.replace('assignType: this.data.assignType', 'assignType: this.data.assignType,\n      priority: this.data.priority');
 fs.writeFileSync(p, s, 'utf8');
 console.log('add-todo.js updated');
 
 // Step 4: todo.js - formatAllTodos
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.js';
 s = fs.readFileSync(p, 'utf8');
 var idx = s.indexOf('formatAllTodos');
 if (idx > -1) {
   var brace = s.indexOf('{', idx);
   var ret = s.indexOf('return', brace);
   var rbrace = s.indexOf('}', ret);
   var body = s.slice(brace, rbrace + 1);
   if (body.includes('priority:')) {
     body = body.replace('priority: todo.priority,', 'priority: todo.priority || \'p2\',');
   } else {
     body = body.replace('updatedAt: todo.updatedAt || null', 'updatedAt: todo.updatedAt || null,\n      priority: todo.priority || \'p2\'');
   }
   s = s.slice(0, brace) + body + s.slice(rbrace + 1);
 }
 fs.writeFileSync(p, s, 'utf8');
 console.log('todo.js updated');
 
 console.log('ALL BACKEND + DATA CHANGES DONE');
