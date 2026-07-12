 var fs = require('fs');
 var CR = String.fromCharCode(13);
 var LF = String.fromCharCode(10);
 var CRLF = CR + LF;
 
 // Issue 1: Restore completed style (was changed to grayscale)
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxss';
 var s = fs.readFileSync(p, 'utf8');
 var old = '.todo-item.completed {' + CRLF +
 '  opacity: 0.5;' + CRLF +
 '  filter: grayscale(0.4);' + CRLF +
 '  background: #f8fbf9;' + CRLF +
 '}';
 var neu = '.todo-item.completed {' + CRLF +
 '  background: linear-gradient(135deg, #ecfdf5 0%, #90e0b7 100%) !important;' + CRLF +
 '  box-shadow: 0 4rpx 16rpx rgba(76,175,80,0.15);' + CRLF +
 '}';
 s = s.replace(old, neu);
 fs.writeFileSync(p, s, 'utf8');
 console.log('1. Restored completed gradient style');
 
 // Issue 2: Fix todo-detail WXML - show priority for all values (including P2)
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 s = fs.readFileSync(p, 'utf8');
 old = '<view wx:if="{{todo.priority && todo.priority !== \'p2\'}}" class="date-info">';
 neu = '<view wx:if="{{todo.priority}}" class="date-info">';
 s = s.replace(old, neu);
 // Fix the label text to include P2
 old = '{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}';
 neu = '{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p2\' ? \'P2 重要不紧急\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}';
 s = s.replace(old, neu);
 fs.writeFileSync(p, s, 'utf8');
 console.log('2. Fixed detail WXML priority display');
 
 // Issue 3: Fix todo.js formatAllTodos - add priority fallback
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.js';
 s = fs.readFileSync(p, 'utf8');
 var idx = s.indexOf('formatAllTodos');
 if (idx > -1) {
   var brace = s.indexOf('{', idx);
   var space = s.indexOf('return', brace);
   var end = s.indexOf('}', space);
   var inner = s.slice(space, end);
   if (!inner.includes('priority') || !inner.includes('todo.priority ||')) {
     var oldStr = 'completed: todo.completed || 0,';
     var newStr = oldStr + CRLF + '      priority: todo.priority || \'p2\',';
     internal = inner.replace(oldStr, newStr);
     s = s.slice(0, space) + internal + s.slice(end);
   }
 }
 fs.writeFileSync(p, s, 'utf8');
 console.log('3. Fixed todo.js formatAllTodos priority fallback');
 
 console.log('ALL 3 ISSUES FIXED');
