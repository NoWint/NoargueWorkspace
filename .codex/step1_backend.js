 var fs = require('fs');
 
 // 1. database.sql
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\backend\\database.sql';
 var s = fs.readFileSync(p, 'utf8');
 s = s.replace('images TEXT DEFAULT NULL,\n    version INT DEFAULT 1,','images TEXT DEFAULT NULL,\n    priority VARCHAR(8) DEFAULT \'p2\',\n    version INT DEFAULT 1,');
 s = s.replace('images TEXT DEFAULT NULL,\n    completed_at BIGINT DEFAULT 0,','images TEXT DEFAULT NULL,\n    priority VARCHAR(8) DEFAULT \'p2\',\n    completed_at BIGINT DEFAULT 0,');
 fs.writeFileSync(p, s, 'utf8');
 console.log('database.sql updated');
 
 // 2. todoController.js
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\backend\\controllers\\todoController.js';
 s = fs.readFileSync(p, 'utf8');
 
 // formatTodo return
 s = s.replace('updatedAt: todo.updated_at ? new Date(todo.updated_at).getTime() : null\n  };','updatedAt: todo.updated_at ? new Date(todo.updated_at).getTime() : null,\n    priority: todo.priority || \'p2\'\n  };');
 // create INSERT columns
 s = s.replace('(user_id, todo_id, text, set_date, set_time, remarks, location_text, is_star, combo_id, images, version, created_at, updated_at)','(user_id, todo_id, text, set_date, set_time, remarks, location_text, is_star, combo_id, images, priority, version, created_at, updated_at)');
 // create VALUES
 s = s.replace('isStar ? 1 : 0,\n        comboId || null,\n        imagesJson','isStar ? 1 : 0,\n        comboId || null,\n        imagesJson,\n        req.body.priority || \'p2\'');
 // update dynamic fields
 s = s.replace('if (images !== undefined) {','if (priority !== undefined) {\n      updateFields.push(\'priority = ?\');\n      updateValues.push(priority);\n    }\n    if (images !== undefined) {');
 // sync UPDATE
 s = s.replace('text = ?, set_date = ?, set_time = ?, remarks = ?, location_text = ?, \n                 completed = ?, is_star = ?, tags = ?, images = ?, combo_id = ?, version = ?, updated_at = NOW()','text = ?, set_date = ?, set_time = ?, remarks = ?, location_text = ?, \n                 completed = ?, is_star = ?, tags = ?, images = ?, priority = ?, combo_id = ?, version = ?, updated_at = NOW()');
 s = s.replace('resolved.text,\n                  resolved.setDate','resolved.text,\n                  resolved.priority || \'p2\',\n                  resolved.setDate');
 fs.writeFileSync(p, s, 'utf8');
 console.log('todoController.js updated');
 
 // 3. comboController.js
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\backend\\controllers\\comboController.js';
 s = fs.readFileSync(p, 'utf8');
 // INSERT columns
 s = s.replace('(combo_id, creator_id, text, set_date, set_time, remarks, assign_type, created_at)','(combo_id, creator_id, text, set_date, set_time, remarks, assign_type, priority, created_at)');
 // VALUES
 s = s.replace("VALUES (?, ?, ?, ?, ?, ?, 'all', NOW())","VALUES (?, ?, ?, ?, ?, ?, 'all', ?, NOW())");
 s = s.replace('[comboId, userId, todo.text, todo.set_date, todo.set_time, todo.remarks]','[comboId, userId, todo.text, todo.set_date, todo.set_time, todo.remarks, todo.priority || \'p2\']');
 // format return
 s = s.replace('images: images,\n            completedAt: todo.completed_at,','images: images,\n            priority: todo.priority || \'p2\',\n            completedAt: todo.completed_at,');
 fs.writeFileSync(p, s, 'utf8');
 console.log('comboController.js updated');
 
 console.log('BACKEND DONE');
