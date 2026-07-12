 var fs = require('fs');
 var CRLF = '\r\n';
 
 // 1. add-todo.wxml - insert priority grid before 附加图片
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.wxml';
 var s = fs.readFileSync(p, 'utf8');
 var priorityBlock = 
 '    <view class="form-item">' + CRLF +
 '      <text class="question-title">优先级</text>' + CRLF +
 '      <view class="priority-grid">' + CRLF +
 '        <view class="quadrant {{priority === \'p1\' ? \'active\' : \'\'}}" data-priority="p1" bindtap="setPriority">' + CRLF +
 '          <view class="priority-dot dot-p1"></view>' + CRLF +
 '          <text class="quadrant-label">P1 紧急重要</text>' + CRLF +
 '          <text class="quadrant-desc">马上做</text>' + CRLF +
 '        </view>' + CRLF +
 '        <view class="quadrant {{priority === \'p2\' ? \'active\' : \'\'}}" data-priority="p2" bindtap="setPriority">' + CRLF +
 '          <view class="priority-dot dot-p2"></view>' + CRLF +
 '          <text class="quadrant-label">P2 重要不紧急</text>' + CRLF +
 '          <text class="quadrant-desc">计划做</text>' + CRLF +
 '        </view>' + CRLF +
 '        <view class="quadrant {{priority === \'p3\' ? \'active\' : \'\'}}" data-priority="p3" bindtap="setPriority">' + CRLF +
 '          <view class="priority-dot dot-p3"></view>' + CRLF +
 '          <text class="quadrant-label">P3 紧急不重要</text>' + CRLF +
 '          <text class="quadrant-desc">快速处理</text>' + CRLF +
 '        </view>' + CRLF +
 '        <view class="quadrant {{priority === \'p4\' ? \'active\' : \'\'}}" data-priority="p4" bindtap="setPriority">' + CRLF +
 '          <view class="priority-dot dot-p4"></view>' + CRLF +
 '          <text class="quadrant-label">P4 不紧急不重要</text>' + CRLF +
 '          <text class="quadrant-desc">可做可不做</text>' + CRLF +
 '        </view>' + CRLF +
 '      </view>' + CRLF +
 '    </view>' + CRLF + CRLF;
 
 s = s.replace(
   '    <view class="form-item">' + CRLF + '      <text class="question-title">附加图片</text>',
   priorityBlock + '    <view class="form-item">' + CRLF + '      <text class="question-title">附加图片</text>'
 );
 fs.writeFileSync(p, s, 'utf8');
 console.log('1. add-todo.wxml updated');
 
 // 2. add-todo.wxss - add quadrant styles
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.wxss';
 s = fs.readFileSync(p, 'utf8');
 var quadrantCSS = 
 '.priority-grid {' + CRLF +
 '  display: grid;' + CRLF +
 '  grid-template-columns: 1fr 1fr;' + CRLF +
 '  gap: 16rpx;' + CRLF +
 '  margin-left: 24rpx;' + CRLF +
 '}' + CRLF +
 '.quadrant {' + CRLF +
 '  display: flex;' + CRLF +
 '  flex-direction: column;' + CRLF +
 '  align-items: center;' + CRLF +
 '  gap: 8rpx;' + CRLF +
 '  padding: 24rpx 16rpx;' + CRLF +
 '  background: #f5f5f5;' + CRLF +
 '  border-radius: 24rpx;' + CRLF +
 '  transition: all 0.3s ease;' + CRLF +
 '}' + CRLF +
 '.quadrant.active {' + CRLF +
 '  background: #ccebda;' + CRLF +
 '}' + CRLF +
 '.priority-dot {' + CRLF +
 '  width: 24rpx;' + CRLF +
 '  height: 24rpx;' + CRLF +
 '  border-radius: 50%;' + CRLF +
 '}' + CRLF +
 '.dot-p1 { background: #e34d59; }' + CRLF +
 '.dot-p2 { background: #2196F3; }' + CRLF +
 '.dot-p3 { background: #ff9800; }' + CRLF +
 '.dot-p4 { background: #999; }' + CRLF +
 '.quadrant-label {' + CRLF +
 '  font-size: 28rpx;' + CRLF +
 '  font-weight: 500;' + CRLF +
 '  color: #333;' + CRLF +
 '}' + CRLF +
 '.quadrant-desc {' + CRLF +
 '  font-size: 22rpx;' + CRLF +
 '  color: #999;' + CRLF +
 '}' + CRLF +
 '.quadrant.active .quadrant-label { color: #00b26a; }' + CRLF +
 '.quadrant.active .quadrant-desc { color: #00b26a; }' + CRLF + CRLF;
 s = s + quadrantCSS;
 fs.writeFileSync(p, s, 'utf8');
 console.log('2. add-todo.wxss updated');
 
 // 3. todo.wxml - add priority dot inside t-cell title
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxml';
 s = fs.readFileSync(p, 'utf8');
 // Find the t-cell title section and add priority dot before title
 // Looking for: title="{{todo.text}}" with priority indicator before it
 var titleLine = 'title="{{todo.text}}"';
 var titleIdx = s.indexOf(titleLine);
 if (titleIdx > -1) {
   // Find the start of this t-cell line
   var lineStart = s.lastIndexOf('\n', titleIdx) + 1;
   var priorityIndicator = 
     '          <view wx:if="{{todo.priority && todo.priority !== \'p2\'}}" ' + CRLF +
     '                class="priority-indicator priority-{{todo.priority}}">' + CRLF +
     '          </view>' + CRLF;
   s = s.slice(0, lineStart) + priorityIndicator + s.slice(lineStart);
 }
 fs.writeFileSync(p, s, 'utf8');
 console.log('3. todo.wxml updated');
 
 // 4. todo.wxss - add priority dot styles
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxss';
 s = fs.readFileSync(p, 'utf8');
 var dotCSS =
 '.priority-indicator {' + CRLF +
 '  width: 12rpx;' + CRLF +
 '  height: 12rpx;' + CRLF +
 '  border-radius: 50%;' + CRLF +
 '  display: inline-block;' + CRLF +
 '  margin-right: 12rpx;' + CRLF +
 '  flex-shrink: 0;' + CRLF +
 '}' + CRLF +
 '.priority-indicator.priority-p1 { background: #e34d59; }' + CRLF +
 '.priority-indicator.priority-p3 { background: #ff9800; }' + CRLF +
 '.priority-indicator.priority-p4 { background: #999; }' + CRLF + CRLF;
 s = s + dotCSS;
 fs.writeFileSync(p, s, 'utf8');
 console.log('4. todo.wxss updated');
 
 // 5. todo-detail.wxml - add priority display in detail
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 s = fs.readFileSync(p, 'utf8');
 // Find the tags section and add priority before it
 var tagSection = s.indexOf('class="tags-info"');
 if (tagSection > -1) {
   var priorityBlockDetail = 
     '    <view wx:if="{{todo.priority && todo.priority !== \'p2\'}}" class="date-info">' + CRLF +
     '      <text class="label">优先级</text>' + CRLF +
     '      <view class="priority-row">' + CRLF +
     '        <view class="priority-detail-dot priority-detail-{{todo.priority}}"></view>' + CRLF +
     '        <text class="value">{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}</text>' + CRLF +
     '      </view>' + CRLF +
     '    </view>' + CRLF + CRLF;
   s = s.slice(0, tagSection) + priorityBlockDetail + s.slice(tagSection);
 }
 fs.writeFileSync(p, s, 'utf8');
 console.log('5. todo-detail.wxml updated');
 
 // 6. todo-detail.wxss - add priority detail styles
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxss';
 s = fs.readFileSync(p, 'utf8');
 var detailCSS =
 '.priority-row {' + CRLF +
 '  display: flex;' + CRLF +
 '  align-items: center;' + CRLF +
 '  gap: 12rpx;' + CRLF +
 '}' + CRLF +
 '.priority-detail-dot {' + CRLF +
 '  width: 20rpx;' + CRLF +
 '  height: 20rpx;' + CRLF +
 '  border-radius: 50%;' + CRLF +
 '  flex-shrink: 0;' + CRLF +
 '}' + CRLF +
 '.priority-detail-dot.priority-detail-p1 { background: #e34d59; }' + CRLF +
 '.priority-detail-dot.priority-detail-p3 { background: #ff9800; }' + CRLF +
 '.priority-detail-dot.priority-detail-p4 { background: #999; }' + CRLF + CRLF;
 s = s + detailCSS;
 fs.writeFileSync(p, s, 'utf8');
 console.log('6. todo-detail.wxss updated');
 
 console.log('FRONTEND CHANGES DONE');
