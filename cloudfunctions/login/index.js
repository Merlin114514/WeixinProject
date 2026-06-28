// 1. 必须先引入wx-server-sdk并初始化
const cloud = require('wx-server-sdk');
// 初始化云环境（DYNAMIC_CURRENT_ENV表示使用当前小程序绑定的云环境）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 2. 云函数主逻辑
exports.main = async (event, context) => {
  try {
    // 获取微信上下文（包含openid）
    const wxContext = cloud.getWXContext();
    // 返回openid等信息给前端
    return {
      openid: wxContext.OPENID,
      errMsg: 'success'
    };
  } catch (err) {
    // 捕获错误并返回
    console.error('云函数执行错误：', err);
    return {
      errCode: -1,
      errMsg: '获取openid失败：' + err.message
    };
  }
};