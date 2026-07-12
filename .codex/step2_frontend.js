 var fs = require('fs');
 var CR = '\r\n';
 
 // 1. todo.wxml - add one attribute only
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxml';
 var s = fs.readFileSync(p, 'utf8');
 s = s.replace('        data-index="{{index}}"\n      >', '        data-index="{{index}}"\n        data-priority="{{todo.priority}}"\n      >');
 fs.writeFileSync(p, s, 'utf8');
 console.log('1. todo.wxml - added data-priority attribute');
 
 // 2. todo.wxss - add CSS for data-priority attribute
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxss';
 s = fs.readFileSync(p, 'utf8');
 s += CRLF + '.todo-item-wrapper[data-priority]:not([data-priority="p2"])::before {' + CRLF;
 s += '  content: \'\';' + CRLF;
 s += '  position: absolute;' + CRLF;
 s += '  left: 0;' + CRLF;
 s += '  top: 20rpx;' + CRLF;
 s += '  width: 6rpx;' + CRLF;
 s += '  height: 48rpx;' + CRLF;
 s += '  border-radius: 0 4rpx 4rpx 0;' + CRLF;
 s += '  z-index: 5;' + CRLF;
 s += '}' + CRLF;
 s += '.todo-item-wrapper[data-priority="p1"]::before { background: #e34d59; }' + CRLF;
 s += '.todo-item-wrapper[data-priority="p3"]::before { background: #ff9800; }' + CRLF;
 s += '.todo-item-wrapper[data-priority="p4"]::before { background: #999; }' + CRLF;
 fs.writeFileSync(p, s, 'utf8');
 console.log('2. todo.wxss - added CSS styles');
 
 // 3. add-todo.wxml - insert priority form-item before tags section
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.wxml';
 s = fs.readFileSync(p, 'utf8');
 var block = '    <view class="form-item">' + CRLF + '      <text class="question-title">优先级</text>' + CRLF;
 block += '      <view class="priority-grid">' + CRLF;
 block += '        <view class="quadrant {{priority === \'p1\' ? \'active\' : \'\'}}" data-priority="p1" bindtap="setPriority">' + CRLF;
 block += '          <view class="priority-dot dot-p1"></view><text class="ql">P1 紧急重要</text><text class="qd">马上做</text>' + CRLF;
 block += '        </view>' + CRLF;
 block += '        <view class="quadrant {{priority === \'p2\' ? \'active\' : \'\'}}" data-priority="p2" bindtap="setPriority">' + CRLF;
 block += '          <view class="priority-dot dot-p2"></view><text class="ql">P2 重要不紧急</text><text class="qd">计划做</text>' + CRLF;
 block += '        </view>' + CRLF;
 block += '        <view class="quadrant {{priority === \'p3\' ? \'active\' : \'\'}}" data-priority="p3" bindtap="setPriority">' + CRLF;
 block += '          <view class="priority-dot dot-p3"></view><text class="ql">P3 紧急不重要</text><text class="qd">快速处理</text>' + CRLF;
 block += '        </view>' + CRLF;
 block += '        <view class="quadrant {{priority === \'p4\' ? \'active\' : \'\'}}" data-priority="p4" bindtap="setPriority">' + CRLF;
 block += '          <view class="priority-dot dot-p4"></view><text class="ql">P4 不紧急不重要</text><text class="qd">可做可不做</text>' + CRLF;
 block += '        </view>' + CRLF;
 block += '      </view>' + CRLF;
 block += '    </view>' + CRLF + CRLF;
 s = s.replace('    <view class="form-item">\n      <text class="question-title">标签</text>', block + '    <view class="form-item">\n      <text class="question-title">标签</text>');
 fs.writeFileSync(p, s, 'utf8');
 console.log('3. add-todo.wxml - inserted priority grid');
 
 // 4. add-todo.wxss - add quadrant styles
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.wxss';
 s = fs.readFileSync(p, 'utf8');
 s += CRLF + '.priority-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-left: 24rpx; }' + CRLF;
 s += '.quadrant { display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 20rpx 12rpx; background: #f5f5f5; border-radius: 24rpx; transition: all 0.3s ease; }' + CRLF;
 s += '.quadrant.active { background: #ccebda; }' + CRLF;
 s += '.priority-dot { width: 20rpx; height: 20rpx; border-radius: 50%; }' + CRLF;
 s += '.dot-p1 { background: #e34d59; } .dot-p2 { background: #2196F3; } .dot-p3 { background: #ff9800; } .dot-p4 { background: #999; }' + CRLF;
 s += '.ql { font-size: 26rpx; font-weight: 500; color: #333; }' + CRLF;
 s += '.qd { font-size: 20rpx; color: #999; }' + CRLF;
 s += '.quadrant.active .ql { color: #00b26a; }' + CRLF;
 s += '.quadrant.active .qd { color: #00b26a; }' + CRLF;
 fs.writeFileSync(p, s, 'utf8');
 console.log('4. add-todo.wxss - added styles');
 
 // 5. add-todo.js - add priority data + setPriority + include in create
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.js';
 s = fs.readFileSync(p, 'utf8');
 s = s.replace('assignType: \'all\'', 'assignType: \'all\',\n    priority: \'p2\'');
 s = s.replace('setAssignType(e) {', 'setPriority(e) {\n    this.setData({ priority: e.currentTarget.dataset.priority });\n  },\n\n  setAssignType(e) {');
 s = s.replace('assignType: this.data.assignType', 'assignType: this.data.assignType,\n      priority: this.data.priority');
 fs.writeFileSync(p, s, 'utf8');
 console.log('5. add-todo.js - updated');
 
 // 6. todo.js - formatAllTodos add priority fallback
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.js';
 s = fs.readFileSync(p, 'utf8');
 var idx = s.indexOf('formatAllTodos');
 if (idx > -1) {
   var brace = s.indexOf('{', idx);
   var ret = s.indexOf('return', brace);
   var rbrace = s.indexOf('};', ret);
   var body = s.slice(ret, rbrace + 2);
   if (body.includes('priority:')) {
     body = body.replace('priority: todo.priority,', 'priority: todo.priority || \'p2\',');
   } else {
     body = body.replace('updatedAt: todo.updatedAt || null', 'updatedAt: todo.updatedAt || null,\n      priority: todo.priority || \'p2\'');
   }
   s = s.slice(0, ret) + body + s.slice(rbrace + 2);
 }
 fs.writeFileSync(p, s, 'utf8');
 console.log('6. todo.js - formatAllTodos priority fallback');
 
 // 7. todo-detail.wxml - insert priority line before tags section
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxml';
 s = fs.readFileSync(p, 'utf8');
 var detailBlock = '    <view wx:if="{{todo.priority && todo.priority !== \'p2\'}}" class="date-info">' + CRLF;
 detailBlock += '      <text class="label">优先级</text>' + CRLF;
 detailBlock += '      <view class="priority-detail-row">' + CRLF;
 detailBlock += '        <view class="pd priority-detail-{{todo.priority}}"></view>' + CRLF;
 detailBlock += '        <text class="value">{{todo.priority === \'p1\' ? \'P1 紧急重要\' : todo.priority === \'p3\' ? \'P3 紧急不重要\' : \'P4 不紧急不重要\'}}</text>' + CRLF;
 detailBlock += '      </view>' + CRLF;
 detailBlock += '    </view>' + CRLF + CRLF;
 s = s.replace('    <!-- 标签显示部分 -->', detailBlock + '    <!-- 标签显示部分 -->');
 fs.writeFileSync(p, s, 'utf8');
 console.log('7. todo-detail.wxml - inserted priority display');
 
 // 8. todo-detail.wxss - add priority display styles
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxss';
 s = fs.readFileSync(p, 'utf8');
 s += CRLF + '.priority-detail-row { display: flex; align-items: center; gap: 12rpx; }' + CRLF;
 s += '.pd { width: 20rpx; height: 20rpx; border-radius: 50%; flex-shrink: 0; }' + CRLF;
 s += '.pd.priority-detail-p1 { background: #e34d59; }' + CRLF;
 s += '.pd.priority-detail-p3 { background: #ff9800; }' + CRLF;
 s += '.pd.priority-detail-p4 { background: #999; }' + CRLF;
 fs.writeFileSync(p, s, 'utf8');
 console.log('8. todo-detail.wxss - added styles');
 
 console.log('FRONTEND DONE');
