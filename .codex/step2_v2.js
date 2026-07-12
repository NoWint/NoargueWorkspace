 var fs = require('fs');
 var NL = '\n';
 
 // 1. todo.wxss
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo\\todo.wxss';
 var s = fs.readFileSync(p, 'utf8');
 s += NL + '.todo-item-wrapper[data-priority]:not([data-priority="p2"])::before {' + NL;
 s += '  content: \'\';' + NL;
 s += '  position: absolute;' + NL;
 s += '  left: 0;' + NL;
 s += '  top: 20rpx;' + NL;
 s += '  width: 6rpx;' + NL;
 s += '  height: 48rpx;' + NL;
 s += '  border-radius: 0 4rpx 4rpx 0;' + NL;
 s += '  z-index: 5;' + NL;
 s += '}' + NL;
 s += '.todo-item-wrapper[data-priority="p1"]::before { background: #e34d59; }' + NL;
 s += '.todo-item-wrapper[data-priority="p3"]::before { background: #ff9800; }' + NL;
 s += '.todo-item-wrapper[data-priority="p4"]::before { background: #999; }' + NL;
 fs.writeFileSync(p, s, 'utf8');
 console.log('1. todo.wxss done');
 
 // 2. add-todo.wxss
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\add-todo\\add-todo.wxss';
 s = fs.readFileSync(p, 'utf8');
 s += NL + '.priority-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-left: 24rpx; }' + NL;
 s += '.quadrant { display: flex; flex-direction: column; align-items: center; gap: 6rpx; padding: 20rpx 12rpx; background: #f5f5f5; border-radius: 24rpx; transition: all 0.3s ease; }' + NL;
 s += '.quadrant.active { background: #ccebda; }' + NL;
 s += '.priority-dot { width: 20rpx; height: 20rpx; border-radius: 50%; }' + NL;
 s += '.dot-p1 { background: #e34d59; } .dot-p2 { background: #2196F3; } .dot-p3 { background: #ff9800; } .dot-p4 { background: #999; }' + NL;
 s += '.ql { font-size: 26rpx; font-weight: 500; color: #333; }' + NL;
 s += '.qd { font-size: 20rpx; color: #999; }' + NL;
 s += '.quadrant.active .ql { color: #00b26a; }' + NL;
 s += '.quadrant.active .qd { color: #00b26a; }' + NL;
 fs.writeFileSync(p, s, 'utf8');
 console.log('2. add-todo.wxss done');
 
 // 3. todo-detail.wxss
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\pages\\todo-detail\\todo-detail.wxss';
 s = fs.readFileSync(p, 'utf8');
 s += NL + '.priority-detail-row { display: flex; align-items: center; gap: 12rpx; }' + NL;
 s += '.pd { width: 20rpx; height: 20rpx; border-radius: 50%; flex-shrink: 0; }' + NL;
 s += '.pd.priority-detail-p1 { background: #e34d59; }' + NL;
 s += '.pd.priority-detail-p3 { background: #ff9800; }' + NL;
 s += '.pd.priority-detail-p4 { background: #999; }' + NL;
 fs.writeFileSync(p, s, 'utf8');
 console.log('3. todo-detail.wxss done');
 
 console.log('CSS FILES DONE - continue with step3 for wxml/js');
