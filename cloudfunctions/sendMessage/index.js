const cloud = require('wx-server-sdk')
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  })

const db = cloud.database()

exports.main = async (event, context) => {
  const { fromOpenid, toOpenid, content, msgType, fileID } = event
  try {
    // 格式化发送时间
    const createTime = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // 存入消息到数据库
    const msgRes = await db.collection('message').add({
      data: {
        fromOpenid,
        toOpenid,
        content,
        msgType,
        fileID: fileID || '',
        createTime,
        isRead: false
      }
    })

    // 查询发送者信息（用于接收端展示）
    const senderRes = await db.collection('user')
      .where({ _openid: fromOpenid })
      .field({ username: true, avatarUrl: true })
      .get()

    return {
      code: 0,
      msg: '消息发送成功',
      data: {
        msgId: msgRes._id,
        createTime,
        senderInfo: senderRes.data[0]
      }
    }
  } catch (err) {
    console.error('消息发送失败：', err)
    return { code: -1, msg: '消息发送失败', errMsg: err.message }
  }
}