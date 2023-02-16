

function sleep(ms = 0) {
    return new Promise(resolve => {
        const t = setTimeout(() => {
            resolve()
            clearTimeout(t)
        }, ms)
    })
}

/**
 * 将response数据获取data并转换为对象
 * @param text
 * @returns {null|*}
 */
function parseBody(text) {
    try {
        if (text) {
            const body = JSON.parse(text)
            if (body.code === 0 && body.data) {
                return body.data
            }
        }
    } catch (e) {
        return null
    }
}

/**
 *  直播 -> 直播数据汇总
 * @param response
 * @returns {Promise<*>}
 */

async function getLiveRoomData(response) {
    const url = response.url()
    if (url.includes('room_data_overview_total')) {
        return parseBody(await response.text())
    }
}

/**
 * 直播 -> 正在直播
 * @param response
 * @returns {Promise<*>}
 */
async function getLivingData(response) {
    const url = response.url()
    if (url.includes('operate/live/ies_list')) {
        return parseBody(await response.text())
    }
}

/**
 * 分析 -> 直播分析 -> 直播间
 * @param response
 * @returns {Promise<*>}
 */
async function getAnalysisLivingData(response) {
    const url = response.url()
    if (url.includes('api/bm/live/bind_list')) {
        return parseBody(await response.text())
    }
}
const y1 = 30
const y2 = 120
/**
 * 直播tab点击
 * @param p page
 * @returns {Promise<void>}
 */
async function liveClick(p) {
    await p.mouse.click(316, y1) // 直播[tab]
    await sleep(1000)
    await p.mouse.click(390, y2) // 直播数据汇总
    await sleep(1000)
    await p.mouse.click(285, y2) // 正在直播
    await sleep(1000)
}

/**
 * 分析tab点击
 * @param p page
 * @returns {Promise<void>}
 */
async function analysisClick(p) {
    await p.mouse.click(372, y1) // 分析[tab]
    await sleep(2000)
    await p.mouse.click(85, 390) // 直播分析分析
    await sleep(2000)
}


/**
 * 计算按钮需要滑动的距离
 * */
async function calculateDistance(page) {
    const distance = await page.evaluate(() => {

        // 比较像素,找到缺口的大概位置
        function compare(document) {
            console.log('document', document);

            const ctx1 = document.querySelector('.captcha_verify_img_slide'); // 完成图片
            const ctx2 = document.querySelector('.captcha-verify-image');  // 带缺口图片
            const pixelDifference = 30; // 像素差
            let res = []; // 保存像素差较大的x坐标

            // 对比像素
            for(let i=57;i<260;i++){
                for(let j=1;j<160;j++) {
                    const imgData1 = ctx1.getContext("2d").getImageData(1*i,1*j,1,1)
                    const imgData2 = ctx2.getContext("2d").getImageData(1*i,1*j,1,1)
                    const data1 = imgData1.data;
                    const data2 = imgData2.data;
                    const res1=Math.abs(data1[0]-data2[0]);
                    const res2=Math.abs(data1[1]-data2[1]);
                    const res3=Math.abs(data1[2]-data2[2]);
                    if(!(res1 < pixelDifference && res2 < pixelDifference && res3 < pixelDifference)) {
                        if(!res.includes(i)) {
                            res.push(i);
                        }
                    }
                }
            }
            // 返回像素差最大值跟最小值，经过调试最小值往左小7像素，最大值往左54像素
            return {min:res[0]-7,max:res[res.length-1]-54}
        }
        return compare(document)
    })
    console.log('distance', distance);
    return distance;
}


module.exports = {liveClick,analysisClick, getLivingData, getAnalysisLivingData, getLiveRoomData, sleep,calculateDistance};
