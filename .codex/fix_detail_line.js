 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 var s = fs.readFileSync(p, 'utf8');
 
 // Remove wrapper layer, keep value text directly inside date-info
 s = s.replace(
   '<view class="priority-detail-row">\n        <view class="pd priority-detail-{{todo.priority}}"></view>\n        <text class="value">{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p2\' ? \'P2 重要不紧急\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}</text>\n      </view>\n    </view>',
   '<text class="value">{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p2\' ? \'P2 重要不紧急\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}</text>\n    </view>'
 );
 
 // Add flex class
 s = s.replace('class="date-info"', 'class="date-info date-info-priority"');
 
 fs.writeFileSync(p, s, 'utf8');
 var t = fs.readFileSync(p, 'utf8');
 console.log('Has wrapper:', t.includes('priority-detail-row'));
 console.log('Has class:', t.includes('date-info-priority'));
 console.log('Lines around priority:');
 var lines = t.split('\n');
 for (var i = 118; i < 126; i++) console.log((i + 1) + ': ' + lines[i]);
