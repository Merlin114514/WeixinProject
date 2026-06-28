// 云函数入口文件（getOpenid/index.js）
const cloud = require('wx-server-sdk')


cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  })

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    // 保留原有返回值，确保小程序端兼容
    return {
      code: 0, // 新增：成功状态码，便于小程序端判断
      msg: 'OpenID获取成功',
      openid: wxContext.OPENID,
      appid: wxContext.APPID
    }
  } catch (err) {
    // 优化2：捕获异常，返回明确的错误信息，便于排查问题
    console.error('获取OpenID异常：', err)
    return {
      code: -1, // 新增：失败状态码
      msg: 'OpenID获取失败',
      openid: null
    }
  }
}