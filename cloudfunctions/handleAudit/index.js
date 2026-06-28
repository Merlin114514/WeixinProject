// cloudfunctions/handleAudit/index.js
// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  })
const db = cloud.database()
const applyCollection = db.collection('apply')
const activitiesCollection = db.collection('campus_activities')
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { applyId, status } = event;

    // 1. 获取申请信息
    const applyRes = await applyCollection.doc(applyId).get();
    if (!applyRes.data) {
      return { success: false, msg: '申请记录不存在' };
    }

    const { activityId, studentOpenid } = applyRes.data;

    // 2. 更新申请状态
    await applyCollection.doc(applyId).update({
      data: {
        applyStatus: status === 'agree' ? 'agree' : 'refuse'
      }
    });

    // 3. 若同意，更新活动的报名人数和报名列表
    if (status === 'agree') {
      await activitiesCollection.doc(activityId).update({
        data: {
          registerCount: _.inc(1), // 报名人数+1
          registerUsers: _.push(studentOpenid) // 添加学生openid到报名列表
        }
      });
    }

    return { success: true };
  } catch (err) {
    console.error('处理审核失败', err);
    return { success: false, msg: '系统错误，请稍后重试' };
  }
};