

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

module.exports = {liveClick,analysisClick, getLivingData, getAnalysisLivingData, getLiveRoomData, sleep};
