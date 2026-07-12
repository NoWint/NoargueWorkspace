 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxml';
 var s = fs.readFileSync(p, 'utf8');
 var old = '        data-index="{{index}}"\n      >';
 var neu = '        data-index="{{index}}"\n        data-priority="{{todo.priority}}"\n      >';
 if (s.includes(old)) {
   s = s.replace(old, neu);
   fs.writeFileSync(p, s, 'utf8');
   console.log('data-priority added');
 } else {
   console.log('Pattern not found!');
   var idx = s.indexOf('todo-item-wrapper');
   console.log('Content:', JSON.stringify(s.slice(idx - 5, idx + 120)));
 }
