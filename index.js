const puppeteer = require('puppeteer');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
// puppeteer.use(StealthPlugin())

const dotenv = require("dotenv")
dotenv.config()
const {sleep, liveClick, analysisClick, getLivingData, getAnalysisLivingData, getLiveRoomData} = require('./js/common');

// 最终需要的数据集合
const dataMap = {
        'getLiveRoomData': undefined,
        'getLivingData': undefined,
        'getAnalysisLivingData': undefined
    }

;(async () => {
    try {
        const page = await openBrowser() // 打开浏览器
        await login(page) // 登录
        await sleep(3000); // 等待3s进入首页 仅等待是不好确保的，需要做更细致的区分，此处简化
        console.log('监听需要的响应')
        await listen(page)
        await sleep(1000)
        console.log('触发事件如点击tab')
        await emit(page)
        await sleep(3000)
        console.log('查看数据')
        console.log(dataMap)

        async function openBrowser() {
            console.log('正在启动 Chrome')

            const options = {
                headless: true,
                args: ["--window-position=0,0", `--window-size=1280,800`],
                defaultViewport: {width: 1280, height: 800},
                // devtools: true,
                ignoreDefaultArgs: ["--enable-automation"]
            }
            const browser = await puppeteer.launch(options);
            const [p] = await browser.pages()
            return p // 递交page
        }

        async function login(p) {
            if (process.env.EMAIL && process.env.PASS) { // 输入账号密码
                console.log('正在登录巨量')
                const urls = [
                    'https://business.oceanengine.com/login?appKey=51' // 巨量登录页
                ]
                const url = urls[0]
                await p.goto(url);

                console.log(process.env.EMAIL);

                await sleep(3000); // 等待3s进入登录页

                // 使用坐标点击最稳妥
                const x = 950 // 纵坐标相同
                await p.mouse.click(x, 345) // 账号
                await p.keyboard.type(process.env.EMAIL, {delay: 80})
                await p.mouse.click(x, 393) // 密码
                await p.keyboard.type(process.env.PASS, {delay: 80})

                await p.mouse.click(820, 455) // 协议
                await p.mouse.click(x, 500) // 登录
            } else {
                throw new Error('没有账号密码')
            }
        }

        async function listen(p) {
            // 开启响应监听
            await p.on('response', async res => {
                const fnMap = {
                    getLiveRoomData, // 直播 -> 直播数据汇总
                    getLivingData, // 直播 -> 正在直播
                    getAnalysisLivingData // 分析 -> 直播分析 -> 直播间
                };
                Object.keys(dataMap).forEach(name => {
                    fnMap[name](res).then(data => {
                        if (data) dataMap[name] = data
                    })
                })
            })
        }

        async function emit(p) {
            await liveClick(p)
            await analysisClick(p)
        }

    } catch (e) {
        console.warn(e);
    }
})();
