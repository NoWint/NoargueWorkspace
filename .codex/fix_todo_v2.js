 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxml';
 var s = fs.readFileSync(p, 'utf8');
 
 var bar = '          <view wx:if="{{todo.priority && todo.priority !== \'p2\'}}"\n';
 bar += '                class="priority-bar priority-bar-{{todo.priority}}">\n';
 bar += '          </view>\n';
 
 var from = '          </view>\n          <t-cell\n';
 var to = bar + '          <t-cell\n';
 
 if (s.includes(from)) {
   s = s.replace(from, to);
   fs.writeFileSync(p, s, 'utf8');
   console.log('todo.wxml fixed');
 } else {
   console.log('Pattern not found!');
   // Debug
   var idx = s.indexOf('star-badge');
   var end = s.indexOf('</view>', idx) + 8;
   console.log('After star badge close:', JSON.stringify(s.slice(end, end + 30)));
 }
