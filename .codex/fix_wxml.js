 var fs = require('fs');
 
 // 3. collaboration: 超管 -> 管理员/创建者
 var p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\packageCombo\\collaboration\\collaboration.wxml';
 var s = fs.readFileSync(p, 'utf8');
 s = s.replace('超管设置', '管理员设置');
 s = s.replace('转让超管', '转让管理员');
 s = s.replace("item.role === 'owner' ? '超管' :", "item.role === 'owner' ? '创建者' :");
 fs.writeFileSync(p, s, 'utf8');
 console.log('3. collaboration.wxml done');
 
 // 4. collaboration.wxss: 转让管理员加橙色警告
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\packageCombo\\collaboration\\collaboration.wxss';
 s = fs.readFileSync(p, 'utf8');
 var newRule = '.setting-item.warning .setting-label {\n  color: #e65100;\n}\n';
 s = s + '\n' + newRule;
 fs.writeFileSync(p, s, 'utf8');
 console.log('4. collaboration.wxss warning style added');
 
 // 5. app.wxss: 统一卡片圆角
 p = 'E:\\WechatDevelop\\TimeGreen Path Todo\\app.wxss';
 s = fs.readFileSync(p, 'utf8');
 s = s.replace('border-radius: 16rpx;', 'border-radius: 32rpx;');
 fs.writeFileSync(p, s, 'utf8');
 console.log('5. app.wxss card radius unified');
 
 console.log('All done');
