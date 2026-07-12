 var fs = require('fs');
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 var s = fs.readFileSync(p, 'utf8');
 
 // Remove wrapper
 s = s.replace('<view class="priority-detail-row">\n        <view class="pd priority-detail-{{todo.priority}}"></view>\n        ', '');
 // Remove extra closing </view>
 s = s.replace('\n      </view>\n    </view>', '\n    </view>');
 // Add flex class
 s = s.replace('class="date-info"', 'class="date-info date-info-priority"');
 
 fs.writeFileSync(p, s, 'utf8');
 var t = fs.readFileSync(p, 'utf8');
 console.log('wrapper:', t.includes('priority-detail-row'));
 console.log('class:', t.includes('date-info-priority'));
