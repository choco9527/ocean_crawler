const Rembrandt = require('rembrandt') // 比较图片的库
const fs = require('fs').promises
const images = require('images')

function sleep(ms = 0) {
  return new Promise(resolve => {
    const t = setTimeout(() => {
      resolve()
      clearTimeout(t)
    }, ms)
  })
}

function randomNumber(min = 0, max = 0, Int = true) // random Int / Float
{
  return Int ? Math.floor(Math.random() * (max - min + 1) + min) :
    Math.random() * (max - min) + min
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
 * 点击并处理验证码 核心方法
 * 挪动滑块，逐张比较原图和移动后的图，取相似度最高时的位置
 * @param page
 * @param emit 触发出现验证码的函数
 * @returns {Promise<void>}
 */

async function calculateDistance(page, emit) {
  try {
    let originalImage = ''
    // 拦截请求
    await page.setRequestInterception(true)
    page.on('request', request => request.continue())
    page.on('response', async response => {
      if (response.headers()['content-type'] === 'image/jpeg') {
        originalImage = await response.buffer().catch(() => {
        })
      }
      if (originalImage) {
        // resize image
        images(originalImage).resize(340, 212).save("./img/origin.jpeg", {quality: 100});
        originalImage = await fs.readFile('./img/origin.jpeg')
      }

    })

    emit && await emit() // 触发造成图片加载的事件
    await sleep(2000)
    if (!originalImage) {
      console.log('没发现验证码')
      return
    }

    async function comparing() {
      await sleep(500)
      await page.waitForSelector('.captcha_verify_container') // 验证码容器完成加载

      const sliderElement = await page.$('.captcha_verify_slide--slidebar') // 滑动条
      const slider = await sliderElement.boundingBox()

      const sliderHandle = await page.$('.secsdk-captcha-drag-icon') // 滑块
      const handle = await sliderHandle.boundingBox()

      let currentPosition = 0
      let bestSlider = {
        position: 0,
        difference: 100
      }
      let worstSlider = {
        difference: 0
      }

      await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
      await page.mouse.down()

      // 缓慢移动并进行比较
      console.log('缓慢移动并进行比较')
      while (currentPosition < slider.width - handle.width / 2) {

        await page.mouse.move(
          handle.x + currentPosition,
          handle.y + handle.height / 2 + randomNumber(4, 10) - 5
        )

        let sliderContainer = await page.$('.captcha_verify_img--wrapper') // 给整个验证码截图
        let sliderImage = await sliderContainer.screenshot()
        await fs.writeFile('./img/moment.jpeg', sliderImage)

        const rembrandt = new Rembrandt({
          imageA: originalImage,
          imageB: sliderImage,
          thresholdType: Rembrandt.THRESHOLD_PERCENT
        })

        let result = await rembrandt.compare() // 比较

        let difference = result.percentageDifference * 100

        if (difference < bestSlider.difference) {
          bestSlider.difference = difference
          bestSlider.position = currentPosition
        }
        if (difference > worstSlider.difference) {
          worstSlider.difference = difference
        }
        currentPosition += 5
      }
      console.log(bestSlider);
      console.log(worstSlider) // 最差的

      await page.mouse.move(handle.x + bestSlider.position, handle.y + handle.height / 2, 300)
      await page.mouse.up()
      await sleep(1000)
    }

    await comparing()
    await sleep(1000)

    const con = await page.$('.captcha_verify_container')

    if (con) { // 还有容器表示验证失败
      console.log('验证失败! 重试')
      // await comparing()
    }
  } catch (e) {
    console.log('比较失败')
    throw e
  }
}


module.exports = {
  liveClick,
  analysisClick,
  getLivingData,
  getAnalysisLivingData,
  getLiveRoomData,
  sleep,
  calculateDistance
};
