// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 自动匹配当前环境
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 1. 批量更新老师数据：添加 password: 123456
    const teacherRes = await db.collection('user')
      .where({
        role: 'teacher' // 筛选所有老师
      })
      .update({
        data: {
          password: '123456' // 统一设置密码
        }
      });

    // 2. 批量更新学生数据：添加 password: 123456
    const studentRes = await db.collection('user')
      .where({
        role: 'student' // 筛选所有学生
      })
      .update({
        data: {
          password: '123456' // 统一设置密码
        }
      });

    // 3. 返回更新结果
    return {
      code: 0,
      msg: '批量添加密码成功',
      teacherUpdateCount: teacherRes.stats.updated, // 老师更新条数
      studentUpdateCount: studentRes.stats.updated // 学生更新条数
    };
  } catch (err) {
    console.error('批量添加密码失败：', err);
    return {
      code: -1,
      msg: '批量添加密码失败',
      error: err.message
    };
  }
};