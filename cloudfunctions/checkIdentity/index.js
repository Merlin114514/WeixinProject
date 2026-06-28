const cloud = require('wx-server-sdk')
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV // 自动匹配当前环境
  });
const db = cloud.database()

exports.main = async (event, context) => {
  const { openid } = event
  try {
    // 查询用户是否已注册
    const userRes = await db.collection('user')
      .where({ _openid: openid })
      .get()

    if (userRes.data.length === 0) {
      // 未注册用户
      return { code: -1, msg: '用户未注册' }
    } else {
      // 已注册用户，返回身份信息
      const userInfo = userRes.data[0]
      return {
        code: 0,
        msg: '身份校验成功',
        data: {
          role: userInfo.role,
          username: userInfo.username,
          avatarUrl: userInfo.avatarUrl,
          studentId: userInfo.studentId || '',
          teaId: userInfo.teaId || ''
        }
      }
    }
  } catch (err) {
    console.error('身份校验失败：', err)
    return { code: -2, msg: '身份校验失败', errMsg: err.message }
  }
}