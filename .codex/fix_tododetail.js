 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 var s = fs.readFileSync(p, 'utf8');
 
 var insert = '    <view wx:if="{{todo.priority && todo.priority !== \'p2\'}}" class="date-info">\r\n';
 insert += '      <text class="label">优先级</text>\r\n';
 insert += '      <view class="priority-row">\r\n';
 insert += '        <view class="priority-detail-dot priority-detail-{{todo.priority}}"></view>\r\n';
 insert += '        <text class="value">{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}</text>\r\n';
 insert += '      </view>\r\n';
 insert += '    </view>\r\n\r\n';
 
 s = s.replace('    <!-- 标签显示部分 -->', insert + '    <!-- 标签显示部分 -->');
 fs.writeFileSync(p, s, 'utf8');
 console.log('todo-detail.wxml fixed');
 
 // Also add wxss styles
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxss';
 s = fs.readFileSync(p, 'utf8');
 var css = '\r\n.priority-row {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 12rpx;\r\n}\r\n';
 css += '.priority-detail-dot {\r\n  width: 20rpx;\r\n  height: 20rpx;\r\n  border-radius: 50%;\r\n  flex-shrink: 0;\r\n}\r\n';
 css += '.priority-detail-dot.priority-detail-p1 { background: #e34d59; }\r\n';
 css += '.priority-detail-dot.priority-detail-p3 { background: #ff9800; }\r\n';
 css += '.priority-detail-dot.priority-detail-p4 { background: #999; }\r\n';
 s += css;
 fs.writeFileSync(p, s, 'utf8');
 console.log('todo-detail.wxss styles added');
