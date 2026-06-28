// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云开发（环境ID需替换为你的实际环境ID）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 自动获取当前环境（推荐），或手动填写：'your-env-id'
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 1. 获取微信上下文（用户OpenID，可选）
    const wxContext = cloud.getWXContext();

    // 2. 接收客户端传递的参数
    const {
      studentId,
      studentName,
      studentRole,
      teacherId,
      teacherName,
      applyRemark
    } = event;

    // 3. 服务器端校验参数（避免客户端传递无效数据）
    if (!studentId || !studentName || !teacherId || !teacherName) {
      return {
        code: -1,
        msg: '参数缺失，申请发送失败',
        data: null
      };
    }

    // 4. 构造申请数据（服务器端生成关键信息，防止篡改）
    const applyData = {
      studentId: studentId,
      studentName: studentName,
      studentRole: studentRole || 'student',
      teacherId: teacherId,
      teacherName: teacherName,
      applyRemark: applyRemark || '无备注',
      applyTime: db.serverDate(), // 云服务器时间，绝对准确
      applyStatus: 'pending', // 待审核
      isRead: false,
      _openid: wxContext.OPENID // 绑定用户OpenID，便于后续查询
    };

    // 5. 插入数据到teacherApply集合
    const res = await db.collection('teacherApply').add({
      data: applyData
    });

    // 6. 返回成功结果
    return {
      code: 0,
      msg: '申请发送成功',
      data: {
        applyId: res._id // 返回申请ID
      }
    };

  } catch (err) {
    // 异常捕获
    console.error('【云函数发送申请失败】', err);
    return {
      code: -2,
      msg: '服务器异常，申请发送失败',
      data: null,
      error: err.message
    };
  }
};