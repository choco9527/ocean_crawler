const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const getPixels = require("get-pixels")

const dotenv = require("dotenv")
dotenv.config()
const {
    getPath,
    mockClick,
    mockDrag,
    isHtml,
    _parsePostData,
    _grayData,
    _similarImg,
    randn_bm,
    K
} = require('./js/tools');

;(async () => {
    try {
        await openIt() // 打开页面
        let page = null

        // await listenIt() // 监听页面

        async function openIt() {

            console.log('正在启动 Chrome')

            const extendUrl = 'extension/yyds'
            const options = {
                headless: false,
                args: [`--disable-extensions-except=${getPath(extendUrl)}`, "--window-position=0,0", `--window-size=1280,800`],
                defaultViewport: {width: 1280, height: 800},
                // devtools: true,
                executablePath: process.env.CHROME_PATH,
                ignoreDefaultArgs: ["--enable-automation"]
            }
            const browser = await puppeteer.launch(options);
            const [p1] = await browser.pages()

            const urls = [
                'https://business.oceanengine.com',
                'https://business.oceanengine.com/login?appKey=51'
            ] // 巨量
            const url = urls[1]
            await p1.goto(url);
            // await p1.mouse.click(1040, 21) // 点击登录按钮
            await p1.evaluate(() => {
                document.addEventListener('click', function (e) {
                    console.log(e.pageX, e.pageY)
                })
            })
            await p1.waitFor(1000);
            // const [p1, p2, p3] = await browser.pages()

            if (process.env.EMAIL && process.env.PASS) { // 输入账号密码
                console.log(process.env.EMAIL);
                const x = 950
                await p1.mouse.click(x, 345) // 账号
                await p1.keyboard.type(process.env.EMAIL, {delay: 80})
                await p1.mouse.click(x ,393) // 密码
                await p1.keyboard.type(process.env.PASS, {delay: 80})

                await p1.mouse.click(820 ,455) // 协议

                await p1.mouse.click(x ,500) // 登录
            }
        }

        async function test(req) {
            console.log(page.url());
            await page.setRequestInterception(true) // 请求拦截
            const data = await _getImageData('img/test/smallyoumi.png')
            // console.log(data);
        }

        async function getPage() { // 进入登陆页
            pages = await browser.pages()
            for (let i = 0; i < pages.length; i++) {
                const p = pages[i]
                if (p.url() === 'about:blank') {
                    await p.close()
                }
                return Promise.resolve({page1, browser})
            }
        }

        async function listenIt() { // 循环获取 -> 监听页面
            if (!page) {
                // console.log('loadingPage-' + (Date.now() + '').slice(8, 10))
                const c = setTimeout(async () => {
                    await getPage()
                    await listenIt()
                    clearTimeout(c)
                }, 1000)
            }
        }

        const playingList = []

        async function response2page(req, data = {}) {
            await req.respond({
                status: 200,
                headers: {'Access-Control-Allow-Origin': '*',},
                contentType: 'application/json; charset=utf-8',
                body: JSON.stringify({code: 0, data}),
            })
            console.log('respond：' + JSON.stringify(data))
        }

        async function playing(gameType = '', req) { // loop playing
            if (!gameType) return
            const item = {gameType, intervalId: 0}

            for (let i = 0; i < playingList.length; i++) {
                const item = playingList[i]
                if (item.gameType === gameType) {
                    await response2page(req, {cmd: 'stop', msg: '停止'})
                    clearInterval(item.intervalId) // 关闭监听
                    playingList.splice(i, 1)
                    return
                }
            }

            if (playingList.length > 0) {
                await response2page(req, {cmd: 'elseGame', msg: '请先停止其他正在执行的操作'})
                return
            }

            if (!pageMap[gameType]) {
                await response2page(req, {cmd: 'noGame', msg: '暂不支持该类型操作'})
                return
            }

            await response2page(req, {cmd: 'start', msg: '开始'})

            item.intervalId = setInterval(async () => {
                console.time()
                const videoData = await _getVideoData()
                for (let i = 0; i < pageMap[gameType].length; i++) {
                    if (i === 0) console.log('———————    ———————')
                    const pItem = pageMap[gameType][i]
                    let compareData = []
                    if (!!pItem.img.data) {
                        compareData = pItem.img.data
                    } else {
                        compareData = await _getImageData(pItem.path)
                        pItem.img.data = compareData
                    }
                    let position
                    if (pItem.position) {
                        position = {}
                        for (const key in pItem.position) {
                            position[key] = ~~(pItem.position[key] / K)
                        }
                    }
                    const compareRes = _similarImg(videoData, compareData, position)
                    console.log(compareRes.simi);
                    if (compareRes.simi > pItem.simi) {
                        console.log(pItem.name);
                        if (pItem.clickMap) {
                            let index = Math.floor((randn_bm() * pItem.clickMap.length))
                            const {x, y} = pItem.clickMap[index]
                            await mockClick({page, x, y, clickTimes: pItem.clickTimes, r: pItem.r})
                        } else if (pItem.dragMap) {
                            let index = Math.floor((randn_bm() * pItem.dragMap.length))
                            const {x1, y1, x2, y2, duration} = pItem.dragMap[index]
                            await mockDrag({page, x1, y1, x2, y2, duration})
                        }
                    }
                }
                console.timeEnd()
            }, 3000)

            playingList.push(item)
        }

        async function _getVideoData() {
            return page.evaluate(async () => {
                const canvasEle = document.getElementById('yyds-canvas')
                const ctx = canvasEle.getContext('2d')
                ctx.imageSmoothingEnabled = false // 锐化
                let frame = ctx.getImageData(0, 0, canvasEle.width, canvasEle.height);
                const data = Array.from(frame.data)
                const arr = await window._grayData(data)
                // return Promise.resolve(data)
                return Promise.resolve(arr)
            });
        }

        async function _getImageData(path = '', scale = false) {
            if (!path) throw new Error('no path')
            return new Promise(resolve => {
                getPixels(getPath(path), (err, pixels) => {
                    if (err) throw new Error('Bad image path')
                    // resolve(Array.from(pixels.data))
                    resolve(_grayData(Array.from(pixels.data)))
                })
            })
        }


    } catch (e) {
        console.warn(e);
    }
})();
