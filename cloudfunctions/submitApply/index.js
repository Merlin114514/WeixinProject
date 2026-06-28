// cloudfunctions/submitApply/index.js
const cloud = require('wx-server-sdk')
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  })

const db = cloud.database()
const activitiesCollection = db.collection('campus_activities')
const applyCollection = db.collection('apply')

exports.main = async (event, context) => {
  try {
    const { activityId, studentOpenid } = event;

    // 检查活动是否存在、是否可报名
    const activityRes = await activitiesCollection.doc(activityId).get();
    if (!activityRes.data) {
      return { success: false, msg: '活动不存在' };
    }

    const activity = activityRes.data;
    const now = new Date().getTime();
    const formatEndTime = activity.endTime.startsWith('0') ? `20${activity.endTime}` : activity.endTime;
    const endTime = new Date(formatEndTime).getTime();

    if (now > endTime) {
      return { success: false, msg: '活动已结束，无法报名' };
    }

    if (activity.registerCount >= activity.maxCount) {
      return { success: false, msg: '活动名额已满，无法报名' };
    }

    // 检查是否已报名
    const applyRes = await applyCollection.where({
      activityId,
      studentOpenid
    }).get();

    if (applyRes.data.length > 0) {
      return { success: false, msg: '已提交报名申请，请勿重复报名' };
    }

    // 新增报名申请
    await applyCollection.add({
      data: {
        activityId,
        studentOpenid,
        applyStatus: 'pending',
        applyTime: new Date().toLocaleString()
      }
    });

    return { success: true, msg: '报名申请提交成功' };
  } catch (err) {
    console.error('提交报名申请失败', err);
    return { success: false, msg: '系统错误，请稍后重试' };
  }
};