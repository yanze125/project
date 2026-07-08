// 企业微信群机器人推送：无需后端的程序化消息通道

const WEBHOOK_PREFIX = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send'

export function isValidWebhook(url) {
  return typeof url === 'string' && url.startsWith(WEBHOOK_PREFIX)
}

// 返回 'ok'（确认成功）| 'blind'（no-cors 发出但读不到结果）| false（失败）
export async function pushWecom(webhook, text) {
  if (!isValidWebhook(webhook)) return false
  const body = JSON.stringify({ msgtype: 'text', text: { content: text } })
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })
    const data = await res.json()
    return data.errcode === 0 ? 'ok' : false
  } catch {
    // 跨域被拦：降级 no-cors 盲发（企微服务端按 body 内容解析，可送达）
    try {
      await fetch(webhook, { method: 'POST', mode: 'no-cors', body })
      return 'blind'
    } catch {
      return false
    }
  }
}
