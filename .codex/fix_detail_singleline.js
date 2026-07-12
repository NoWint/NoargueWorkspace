 var fs = require('fs');
 var C = String.fromCharCode(13, 10);
 
 // Fix WXML: remove priority-detail-row wrapper, make single line
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 var s = fs.readFileSync(p, 'utf8');
 var old = '<view wx:if="{{todo.priority}}" class="date-info">' + C +
 '      <text class="label">优先级</text>' + C +
 '      <view class="priority-detail-row">' + C +
 '        <view class="pd priority-detail-{{todo.priority}}"></view>' + C +
 '        <text class="value">{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p2\' ? \'P2 重要不紧急\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}</text>' + C +
 '      </view>' + C +
 '    </view>';
 var neu = '<view wx:if="{{todo.priority}}" class="date-info date-info-priority">' + C +
 '      <text class="label">优先级</text>' + C +
 '      <view class="pd priority-detail-{{todo.priority}}"></view>' + C +
 '      <text class="value">{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p2\' ? \'P2 重要不紧急\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}</text>' + C +
 '    </view>';
 s = s.replace(old, neu);
 fs.writeFileSync(p, s, 'utf8');
 console.log('WXML fixed');
 
 // Fix CSS: add flex-row style for priority
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxss';
 s = fs.readFileSync(p, 'utf8');
 var css = C + C + '.date-info-priority {' + C +
 '  display: flex;' + C +
 '  align-items: center;' + C +
 '}' + C +
 '.date-info-priority .pd {' + C +
 '  margin-right: 12rpx;' + C +
 '  flex-shrink: 0;' + C +
 '}' + C;
 s += css;
 fs.writeFileSync(p, s, 'utf8');
 console.log('CSS added');
