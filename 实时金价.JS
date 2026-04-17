// Variables used by Scriptable.
// icon-color: yellow; icon-glyph: coins;
// 上金所实时金价 - 动态布局版（支持深色模式）
// by ChatGPT + 奶思（颜色优化版）

const logoUrl = "https://is3-ssl.mzstatic.com/image/thumb/Purple116/v4/92/bf/e1/92bfe1ff-f0f2-b5cb-1758-8663cbd395f0/source/60x60bb.jpg"

// ========== 数据抓取 ==========
async function fetchData() {
  const now = Date.now() + 8 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60 * 1000
  const url = `https://api.jijinhao.com/quoteCenter/realTime.htm?codes=JO_71&_=${now}`
  const req = new Request(url)
  req.headers = {
    "user-agent": "Mozilla/5.0",
    "referer": "https://m.cngold.org/"
  }

  try {
    const text = await req.loadString()
    const match = text.match(/var\s+quote_json\s*=\s*(\{[\s\S]*\});?/)
    if (!match) return null
    const raw = JSON.parse(match[1])
    const data = raw["JO_71"]
    if (!data) return null

    const time = new Date(data.time)
    const fmt = (n) => n.toString().padStart(2, "0")
    const timeStr = `${time.getFullYear()}-${fmt(time.getMonth() + 1)}-${fmt(time.getDate())} ${fmt(time.getHours())}:${fmt(time.getMinutes())}:${fmt(time.getSeconds())}`

    return {
      name: data.showName,
      price: data.q63.toFixed(2),
      riseAndFall: (data.q70 >= 0 ? "+" : "") + data.q70.toFixed(2),
      ratio: (data.q80 >= 0 ? "+" : "") + data.q80.toFixed(2) + "%",
      time: timeStr,
      status: data.status
    }
  } catch (e) {
    console.error(e)
    return null
  }
}

// ========== 历史行情 ==========
async function fetchSGEQuotes() {
  const { startDate, endDate } = getBeijingDates()
  const url = `https://www.sge.com.cn/sjzx/quotation_daily_new?start_date=${startDate}&end_date=${endDate}&inst_ids=Au99.99`
  const req = new Request(url)
  const html = await req.loadString()

  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
  if (!tbodyMatch) return []
  const rows = tbodyMatch[1].match(/<tr[\s\S]*?<\/tr>/gi) || []
  const results = []

  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim()
    )
    if (cells.length >= 14) {
      results.push({
        日期: cells[1],
        收盘价: parseFloat(cells[6])
      })
    }
  }
  return results
}

// ========== 时间处理 ==========
function getBeijingDates() {
  const beijingNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const by = beijingNow.getUTCFullYear()
  const bm = beijingNow.getUTCMonth()
  const bd = beijingNow.getUTCDate()
  const beijingMidnightUtcMs = Date.UTC(by, bm, bd)
  const oneDayMs = 24 * 60 * 60 * 1000
  const yesterdayMs = beijingMidnightUtcMs
  const fifteenDaysAgoMs = beijingMidnightUtcMs - 15 * oneDayMs

  function fmt(ms) {
    const d = new Date(ms)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  }

  return { startDate: fmt(fifteenDaysAgoMs), endDate: fmt(yesterdayMs) }
}

// ========== Widget 创建 ==========
async function createWidget() {
  const info = await fetchData()
  const hisData = await fetchSGEQuotes()

  const w = new ListWidget()
  w.cornerRadius = 12

  // 背景（自动深浅模式）
  const gradient = new LinearGradient()
  gradient.colors = [
    Color.dynamic(new Color("#F2F2F7"), new Color("#1C1C1E")),
    Color.dynamic(new Color("#FFFFFF"), new Color("#2C2C2E"))
  ]
  gradient.locations = [0, 1]
  w.backgroundGradient = gradient

  // 颜色主题
  const textMain = Color.dynamic(new Color("#000000"), new Color("#FFFFFF"))
  const textGray = Color.dynamic(new Color("#555555"), new Color("#BBBBBB"))

  const family = config.widgetFamily

  // 小尺寸布局
  if (family === "small" || !family) {
    w.setPadding(6, 10, 10, 10)

    const logoReq = new Request(logoUrl)
    const logoImg = await logoReq.loadImage()
    const logo = w.addImage(logoImg)
    logo.imageSize = new Size(22, 22)
    logo.centerAlignImage()
    w.addSpacer(4)

    const title = w.addText("上金所实时金价")
    title.font = Font.boldSystemFont(16)
    title.textColor = textMain
    title.centerAlignText()
    w.addSpacer(6)

    const price = w.addText(info ? info.price : "--")
    price.font = Font.boldSystemFont(30)
    price.textColor = textMain
    price.centerAlignText()
    w.addSpacer(4)

    if (info) {
      const change = w.addText(`涨跌: ${info.riseAndFall} (${info.ratio})`)
      change.font = Font.systemFont(11)
      change.textColor = info.riseAndFall.startsWith("+") ? Color.red() : Color.green()
      change.centerAlignText()

      const t = w.addText("⏱ " + info.time)
      t.font = Font.systemFont(11)
      t.textColor = textGray
      t.centerAlignText()
    }
    return w
  }

  // 中尺寸布局
  w.setPadding(10, 15, 10, 15)
  const mainStack = w.addStack()
  mainStack.layoutHorizontally()
  mainStack.centerAlignContent()

  // 左边：实时数据
  const left = mainStack.addStack()
  left.layoutVertically()
  left.spacing = 4
  const logoReq = new Request(logoUrl)
  const logoImg = await logoReq.loadImage()

  const titleRow = left.addStack()
  titleRow.centerAlignContent()
  const logo = titleRow.addImage(logoImg)
  logo.imageSize = new Size(18, 18)
  logo.cornerRadius = 4
  titleRow.addSpacer(6)
  const title = titleRow.addText("上金所实时金价")
  title.font = Font.boldSystemFont(16)
  title.textColor = textMain

  const price = left.addText(info ? info.price : "--")
  price.font = Font.boldSystemFont(34)
  price.textColor = textMain

  const change = left.addText(`涨跌: ${info?.riseAndFall ?? "--"} (${info?.ratio ?? "--"})`)
  change.font = Font.systemFont(12)
  change.textColor = info?.riseAndFall?.startsWith("+") ? Color.red() : Color.green()

  const time = left.addText("⏱ " + (info?.time ?? "--"))
  time.font = Font.systemFont(11)
  time.textColor = textGray

  const statText =
    info?.status === 100 ? "开盘中" :
    info?.status === 110 ? "休市中" :
    info?.status === 120 ? "已收盘" : 
    (info?.status ?? "--")
  const status = left.addText("当前：" + statText)
  status.font = Font.systemFont(11)
  status.textColor = textGray

  mainStack.addSpacer()

  // 右边：历史数据（从前一天开始，最多显示6行，行距4）
  const right = mainStack.addStack()
  right.layoutVertically()
  right.spacing = 4
  const hisTitle = right.addText("近期收盘价")
  hisTitle.font = Font.boldSystemFont(13)
  hisTitle.textColor = textMain

  if (hisData && hisData.length > 0) {
    const infoDate = info && info.time ? info.time.split(" ")[0] : null
    let startIndex = 0
    if (infoDate && hisData[0] && (hisData[0]["日期"] ?? hisData[0].date) === infoDate) {
      startIndex = 1
    }

    const available = Math.max(0, hisData.length - startIndex)
    const showCount = Math.min(6, available)

    if (showCount === 0) {
      const noData = right.addText("暂无历史数据")
      noData.font = Font.systemFont(11)
      noData.textColor = textGray
    } else {
      for (let i = 0; i < showCount; i++) {
        const d = hisData[startIndex + i]
        const date = d["日期"] ?? d.date ?? ""
        const price = d["收盘价"] ?? d.close ?? ""
        const line = right.addText(`${date}：${price} 元/克`)
        line.font = Font.systemFont(11)
        line.textColor = textGray
      }
    }
  } else {
    const noData = right.addText("暂无历史数据")
    noData.font = Font.systemFont(11)
    noData.textColor = textGray
  }

  return w
}

// ========== 运行 ==========
let widget = await createWidget()
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentMedium()
}
Script.complete()
