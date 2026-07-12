 var fs = require('fs');
 var C = String.fromCharCode(13, 10);
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 var s = fs.readFileSync(p, 'utf8');
 
 // Remove priority-detail-row wrapper and closing </view>
 s = s.replace('<view class="priority-detail-row">' + C + '        <view class="pd priority-detail-{{todo.priority}}"></view>' + C + '        ', '');
 s = s.replace(C + '      </view>' + C + '    </view>', C + '    </view>');
 
 // Add date-info-priority class
 s = s.replace('class="date-info"', 'class="date-info date-info-priority"');
 
 fs.writeFileSync(p, s, 'utf8');
 var t = fs.readFileSync(p, 'utf8');
 console.log('Has wrapper:', t.includes('priority-detail-row'));
 console.log('Has class:', t.includes('date-info-priority'));
