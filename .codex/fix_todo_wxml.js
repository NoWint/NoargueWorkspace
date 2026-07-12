 var fs = require('fs');
 
 // 1. todo.wxml - insert priority bar between star badge and t-cell
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxml';
 var s = fs.readFileSync(p, 'utf8');
 
 // Insert priority bar right before <t-cell
 // The star badge closes at </view>, then <t-cell opens
 var priorityBar = '          <view wx:if="{{todo.priority && todo.priority !== \'p2\'}}" \r\n';
 priorityBar += '                class="priority-bar priority-bar-{{todo.priority}}">\r\n';
 priorityBar += '          </view>\r\n';
 
 s = s.replace(
   '          </view>\r\n          <t-cell\r\n',
   '          </view>\r\n' + priorityBar + '          <t-cell\r\n'
 );
 
 fs.writeFileSync(p, s, 'utf8');
 console.log('1. todo.wxml fixed');
 
 // 2. todo.wxss - replace priority-indicator with priority-bar styles
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxss';
 s = fs.readFileSync(p, 'utf8');
 
 // Remove any old priority-indicator styles
 s = s.replace(/\.priority-indicator[\s\S]*?flex-shrink: 0;\s*\}/g, '');
 s = s.replace(/\.priority-indicator[\s\S]*?\}/g, '');
 
 // Add priority-bar styles
 var css = '\r\n.priority-bar {\r\n';
 css += '  position: absolute;\r\n';
 css += '  left: 0;\r\n';
 css += '  top: 20rpx;\r\n';
 css += '  width: 6rpx;\r\n';
 css += '  height: 48rpx;\r\n';
 css += '  border-radius: 0 4rpx 4rpx 0;\r\n';
 css += '  z-index: 5;\r\n';
 css += '}\r\n';
 css += '.priority-bar.priority-bar-p1 { background: #e34d59; }\r\n';
 css += '.priority-bar.priority-bar-p3 { background: #ff9800; }\r\n';
 css += '.priority-bar.priority-bar-p4 { background: #999; }\r\n';
 s += css;
 
 fs.writeFileSync(p, s, 'utf8');
 console.log('2. todo.wxss fixed');
 
 console.log('TODO PAGE FIXED');
