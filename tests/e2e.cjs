const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
let playwright;try{playwright=require('playwright');}catch{playwright=require('C:/Users/Deeer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts');fs.mkdirSync(out,{recursive:true});
const results=[],errors=[];let browser;
const note=(label)=>{results.push({label,passed:true});console.log('PASS '+label);};
(async()=>{
  browser=await playwright.chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const button=a=>page.locator(`[data-action="${a}"]`).filter({visible:true});
  const getState=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('xuye-studio-v1')));
  const getAccount=async()=>{const s=await getState();return s.accounts[s.user];};
  const go=async url=>{await page.goto('http://127.0.0.1:4173/#'+url);await page.waitForTimeout(100);};
  await go('/');await page.waitForLoadState('networkidle');
  assert.match(await page.title(),/叙页/);note('首页加载与资源正常');
  await page.locator('#create-form button[type=submit]').click();await page.locator('#create-error').waitFor({state:'visible'});assert.match(await page.locator('#create-error').textContent(),/至少输入/);note('空输入校验');
  await button('inspiration').first().click();assert((await page.locator('#prompt').inputValue()).length>10);note('场景灵感填充');
  await page.locator('#create-form button[type=submit]').click();await page.locator('#modal[open]').waitFor();
  await page.locator('#phone').fill('123');await button('sms').click();assert.match(await page.locator('#login-error').textContent(),/11 位/);note('手机号格式校验');
  await page.locator('#phone').fill('13800000000');await button('sms').click();await page.locator('#sms-code').fill('000000');await page.locator('#login-form button[type=submit]').click();assert.match(await page.locator('#login-error').textContent(),/不正确/);note('演示验证码错误分支');
  await page.locator('#sms-code').fill('123456');await page.locator('#login-form button[type=submit]').click();assert.match(await page.locator('#login-error').textContent(),/勾选/);note('协议授权校验');
  await page.locator('#login-consent').check();await page.locator('#login-form button[type=submit]').click();await page.waitForURL(/outline/);assert.equal(await page.locator('.outline-row').count(),10);note('登录后续接创建与 10 页大纲');
  await page.locator('[data-outline][data-field=title]').nth(1).fill('核心工作进展（测试）');await page.reload();await page.locator('.outline-row').first().waitFor();assert.equal(await page.locator('[data-outline][data-field=title]').nth(1).inputValue(),'核心工作进展（测试）');note('大纲自动保存与刷新恢复');
  await button('outline-up').nth(1).click();assert.equal(await page.locator('[data-outline][data-field=title]').first().inputValue(),'核心工作进展（测试）');await button('outline-down').first().click();note('大纲上移与下移');
  await button('outline-add').click();assert.equal(await page.locator('.outline-row').count(),11);await button('generate').click();assert.match(await page.locator('#modal-title').textContent(),/增加一点空间/);await button('close-modal').click();await button('outline-delete').last().click();note('免费 10 页限制及大纲添加删除');
  await button('generate').click();await page.waitForURL(/progress/);let a=await getAccount();assert.equal(a.grants[0].reserved,1);assert.equal(a.grants[0].used,0);await button('cancel-job').click();await page.waitForURL(/outline/);a=await getAccount();assert.equal(a.grants[0].reserved,0);assert.equal(a.grants[0].used,0);note('取消生成释放冻结额度');
  await button('generate').click();await page.waitForURL(/progress/);await page.reload();await page.waitForURL(/editor/,{timeout:15000});a=await getAccount();assert.equal(a.grants[0].used,1);assert.equal(a.grants[0].reserved,0);assert.equal(a.projects[0].slides.length,10);note('任务刷新恢复与只结算一次');
  const projectId=a.projects[0].id;
  await page.screenshot({path:path.join(out,'editor-desktop.png'),fullPage:true});
  await button('select-slide').nth(1).click();await page.locator('#slide-title').fill('这是更新后的标题');await page.locator('#slide-body').fill('第一项工作进展\n第二项关键任务\n第三项行动建议');await page.locator('#slide-layout').selectOption('columns');assert.match(await page.locator('#slide-preview').textContent(),/更新后的标题/);await page.reload();await page.locator('#slide-title').waitFor();await button('select-slide').nth(1).click();assert.equal(await page.locator('#slide-title').inputValue(),'这是更新后的标题');note('标题正文布局编辑与持久化');
  await button('slide-down').click();assert.equal(await page.locator('#slide-title').inputValue(),'这是更新后的标题');await button('slide-up').click();note('编辑器页序调整');
  await page.locator('#rewrite-instruction').fill('精简为三个要点');await button('rewrite').click();assert.match(await page.locator('#slide-body').inputValue(),/^1\./);assert.match(await button('rewrite').textContent(),/剩余 2/);note('单页改写与次数限制');
  await button('history').click();await button('restore-version').first().click();assert.equal(await page.locator('#slide-body').inputValue(),'第一项工作进展\n第二项关键任务\n第三项行动建议');note('版本恢复');
  await button('present').click();await button('present-next').click();assert.match(await page.locator('#modal').textContent(),/3 \/ 10/);await page.keyboard.press('Escape');note('放映与键盘关闭弹窗');
  const downloadPromise=page.waitForEvent('download');await button('export').click();const download=await downloadPromise;await download.saveAs(path.join(out,'editable-sample.pptx'));assert((await fs.promises.stat(path.join(out,'editable-sample.pptx'))).size>10000);a=await getAccount();assert.equal(a.grants[0].used,1);note('真实 PPTX 导出且重复下载不扣次');
  await go('/projects');await button('rename').first().click();await page.locator('#new-title').fill('<img src=x onerror=alert(1)>测试');await page.locator('#rename-form button[type=submit]').click();assert.equal(await page.locator('.project-info img').count(),0);assert.match(await page.locator('.project-info h3').textContent(),/<img/);note('项目改名与 HTML 注入转义');
  await page.locator('#project-search').fill('不存在的词');assert.match(await page.locator('#project-results').textContent(),/没有找到/);await page.locator('#project-search').fill('');await button('filter').nth(1).click();assert.equal(await page.locator('.project-card').count(),1);note('项目搜索与状态筛选');
  await button('duplicate').first().click();await button('filter').first().click();assert.equal(await page.locator('.project-card').count(),2);await button('delete-project').first().click();assert.equal(await page.locator('.project-card').count(),1);await page.locator('#toast-action').click();assert.equal(await page.locator('.project-card').count(),2);note('复制大纲、单项目删除与撤销');
  await button('open').first().click();await page.waitForURL(/outline/);await button('generate').click();assert.match(await page.locator('#modal-title').textContent(),/空间/);await button('go-pricing').click();note('额度不足保留草稿并进入套餐');
  await page.locator('[data-plan=pack]').click();await button('complete-payment').click();assert.match(await page.locator('#pay-error').textContent(),/请先确认/);await page.locator('#pay-consent').check();await button('complete-payment').click();assert.match(await page.locator('#modal-title').textContent(),/已完成/);await page.keyboard.press('Escape');a=await getAccount();assert.equal(a.orders.length,1);assert.equal(a.orders[0].status,'paid');assert.equal(a.grants[1].total,3);note('模拟支付、确认校验与额度发放');
  await go('/orders');await button('refund').click();await page.locator('#refund-reason').fill('暂时没有使用需求');await page.locator('#refund-form button[type=submit]').click();a=await getAccount();assert.equal(a.orders[0].status,'refund_pending');assert.equal(a.grants[1].refundFrozen,true);await go('/admin');await button('approve-refund').click();a=await getAccount();assert.equal(a.orders[0].status,'refunded');assert.equal(a.grants[1].total,0);note('退款申请冻结与审核撤销额度');
  await go('/');await page.locator('[data-mode=upload]').click();await page.locator('#source-file').setInputFiles({name:'bad.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('not zip')});await page.waitForFunction(()=>document.querySelector('#upload-error')?.textContent.includes('格式不符'));note('伪造文件格式拒绝');
  await page.locator('#source-file').setInputFiles({name:'large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(10*1024*1024+1)});assert.match(await page.locator('#upload-error').textContent(),/10MB/);note('10MB 上传限制');
  await page.locator('#source-file').setInputFiles(path.join(__dirname,'fixture.docx'));await page.waitForFunction(()=>document.querySelector('#upload-zone')?.textContent.includes('已解析'));a=await getState();assert(a.draft.source.chars>10);note('DOCX 真实文本解析');
  await page.locator('#source-file').setInputFiles(path.join(__dirname,'fixture.pdf'));await page.waitForFunction(()=>document.querySelector('#upload-zone')?.textContent.includes('已解析'));a=await getState();assert.equal(a.draft.source.pages,2);note('PDF 真实文本解析');
  await page.locator('#source-file').setInputFiles(path.join(__dirname,'51-pages.pdf'));await page.waitForFunction(()=>document.querySelector('#upload-error')?.textContent.includes('50 页'));note('50 页 PDF 限制');
  await page.locator('#source-file').setInputFiles(path.join(__dirname,'empty.pdf'));await page.waitForFunction(()=>document.querySelector('#upload-error')?.textContent.includes('OCR'));note('扫描/无文本 PDF 的替代操作提示');
  await page.locator('#source-file').setInputFiles(path.join(__dirname,'fixture.docx'));await page.waitForFunction(()=>document.querySelector('#upload-zone')?.textContent.includes('已解析'));await page.locator('#create-form button[type=submit]').click();assert.match(await page.locator('#create-error').textContent(),/授权/);await page.locator('#source-consent').check();await page.locator('#create-form button[type=submit]').click();await page.waitForURL(/outline/);a=await getAccount();assert.equal(a.projects[0].sourceName,'fixture.docx');note('资料授权与文档大纲流程');
  for(const width of [320,375,414,768,1440]){
    await page.setViewportSize({width,height:900});
    for(const url of ['/','/projects','/pricing','/guide',`/outline/${a.projects[0].id}`,`/editor/${projectId}`]){
      await go(url);const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:innerWidth}));assert(dimensions.scroll<=dimensions.view,`${width}px ${url} overflow`);
    }
    await go('/');await page.screenshot({path:path.join(out,`home-${width}.png`),fullPage:true});note(`响应式 ${width}px 六页面无横向溢出`);
  }
  await page.setViewportSize({width:375,height:900});await go('/');await button('menu').click();await page.locator('.sidebar [data-nav="/projects"]').click();assert.equal(await page.locator('.sidebar.open').count(),0);assert.match(await page.locator('h1').textContent(),/我的项目/);note('手机导航开启、跳转与关闭');
  const isolated=await browser.newContext();const other=await isolated.newPage();await other.goto(`http://127.0.0.1:4173/#/editor/${projectId}`);await other.locator('.empty-state').waitFor();assert.match(await other.locator('.empty-state').textContent(),/找不到/);await isolated.close();note('独立浏览器上下文无法读取另一会话项目');
  assert.deepEqual(errors,[]);note('完整回归无未捕获 JavaScript 异常');
  fs.writeFileSync(path.join(out,'test-results.json'),JSON.stringify({passed:results.length,failed:0,results,errors},null,2));console.log(`DONE ${results.length} checks passed`);await browser.close();
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'test-results.json'),JSON.stringify({passed:results.length,failed:1,results,error:e.message,errors},null,2));await browser?.close();process.exit(1);});
