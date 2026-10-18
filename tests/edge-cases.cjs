const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/Deeer/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const act=a=>page.locator(`[data-action="${a}"]`).filter({visible:true});
 const account=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('xuye-studio-v1'));return s.accounts[s.user];});
 const go=async url=>{await page.goto('http://127.0.0.1:4173/#'+url);await page.waitForTimeout(100);};
 const buy=async plan=>{await go('/pricing');await page.locator(`[data-plan=${plan}]`).click();await page.locator('#pay-consent').check();await act('complete-payment').click();await page.keyboard.press('Escape');};
 await go('/');await act('login').click();await page.locator('#phone').fill('13900000000');await act('sms').click();await page.locator('#sms-code').fill('123456');await page.locator('#login-consent').check();await page.locator('#login-form button[type=submit]').click();
 await buy('pack');await buy('month');await go('/');await page.locator('#prompt').fill('季度品牌增长方案提案，业务资料待补充');await page.locator('#slide-count').selectOption('20');await page.locator('#theme').selectOption('navy');await page.locator('#create-form button[type=submit]').click();await page.waitForURL(/outline/);assert.equal(await page.locator('.outline-row').count(),20);assert(await act('outline-add').isDisabled());
 await page.evaluate(()=>{const b=document.querySelector('[data-action=generate]');b.click();b.click();});await page.waitForURL(/progress/);let a=await account();assert.equal(a.grants.reduce((n,g)=>n+g.reserved,0),1);assert.equal(a.grants.find(g=>g.type==='month').reserved,1);console.log('PASS 最早到期付费额度优先 / 20 页限制 / 重复生成不重复冻结');
 await page.waitForURL(/editor/,{timeout:12000});a=await account();assert.equal(a.grants.find(g=>g.type==='month').used,1);assert.equal(a.grants.find(g=>g.type==='pack').used,0);assert.equal(a.grants.find(g=>g.type==='trial').used,0);console.log('PASS 20 页深蓝主题成功生成且仅扣付费 1 次');
 for(let i=0;i<3;i++){await page.locator('#rewrite-instruction').fill('精简成简洁要点');await act('rewrite').click();}assert(await act('rewrite').isDisabled());console.log('PASS 单页改写达到 3 次后禁用');
 for(let i=0;i<2;i++){const promise=page.waitForEvent('download');await act('export').click();const d=await promise;await d.saveAs(path.join(__dirname,'artifacts',`paid-20-${i}.pptx`));}a=await account();assert.equal(a.grants.find(g=>g.type==='month').used,1);console.log('PASS 20 页导出两次均成功且不重复扣次');
 await go('/orders');const usedRow=page.locator('tr').filter({hasText:'30 天创作包'});await usedRow.locator('[data-action=refund]').click();assert.match(await page.locator('#modal-title').textContent(),/人工处理/);await page.keyboard.press('Escape');console.log('PASS 已使用订单不能整单自动退款');
 for(const width of [320,414]){await page.setViewportSize({width,height:900});await go('/');await page.screenshot({path:path.join(__dirname,'artifacts',`clean-home-${width}.png`),fullPage:true});}
 assert.deepEqual(errors,[]);await browser.close();console.log('DONE 5 boundary groups passed');
})().catch(e=>{console.error(e);process.exit(1);});
