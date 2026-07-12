 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxml';
 var s = fs.readFileSync(p, 'utf8');
 var old = '        data-index="{{index}}"\r\n      >';
 var neu = '        data-index="{{index}}"\r\n        data-priority="{{todo.priority}}"\r\n      >';
 if (s.includes(old)) {
   s = s.replace(old, neu);
   fs.writeFileSync(p, s, 'utf8');
   console.log('data-priority added');
 } else {
   console.log('Pattern not found again');
 }
