const db = wx.cloud.database();
const applyCollection = db.collection('classroom_apply');
const app = getApp();

Page({
  data: {
    classroom: {}, // 选中的教室
    studentInfo: {}, // 学生信息（自动填充）
    studentPhone: '', // 联系电话
    applyPersonCount: '', // 申请人数
    startDate: '', // 开始日期
    endDate: '', // 结束日期
    startTime: '', // 开始时间
    endTime: '', // 结束时间
    applyReason: '' // 申请用途
  },

  onLoad(options) {
    // 1. 接收并解析教室信息（保留原有逻辑）
    if (options.classroom) {
      try {
        const classroom = JSON.parse(decodeURIComponent(options.classroom));
        this.setData({ classroom: classroom || {} });
      } catch (e) {
        console.error('解析教室信息失败：', e);
        this.setData({ classroom: {} });
      }
    }

    // 2. 获取本地存储的学生信息（保留原有逻辑）
    const studentInfo = wx.getStorageSync('userInfo') || {};
    if (!studentInfo.studentId) {
      wx.showToast({ title: '未获取到学生信息，请先注册', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ studentInfo: studentInfo || {} });
  },

  // 输入联系电话（保留原有逻辑）
  onInputPhone(e) {
    this.setData({ studentPhone: e.detail.value.trim() });
  },

  // 处理申请人数输入（保留原有逻辑）
  onInputPersonCount(e) {
    this.setData({ applyPersonCount: e.detail.value.trim() });
  },

  // 选择开始日期（保留原有逻辑）
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value || '' });
    console.log("开始日期已同步：", this.data.startDate);
  },

  // 选择结束日期（保留原有逻辑）
  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value || '' });
    console.log("结束日期已同步：", this.data.endDate);
  },

  // 选择开始时间（保留原有逻辑）
  onStartTimeChange(e) {
    this.setData({ startTime: e.detail.value || '' });
  },

  // 选择结束时间（保留原有逻辑）
  onEndTimeChange(e) {
    this.setData({ endTime: e.detail.value || '' });
  },

  // 输入申请用途（保留原有逻辑）
  onInputReason(e) {
    this.setData({ applyReason: e.detail.value.trim() });
  },

  /**
   * 提交申请（保留原有功能，仅确保定向王建国老师）
   */
  submitApply() {
    const { classroom, studentInfo, studentPhone, applyPersonCount, startDate, endDate, startTime, endTime, applyReason } = this.data;
    const studentOpenid = app.globalData.openid || '';

    // 1. 表单必填项校验（保留原有逻辑）
    let missingField = '';
    if (!studentPhone) missingField = '联系电话';
    else if (!applyPersonCount) missingField = '申请人数';
    else if (!startDate) missingField = '开始日期';
    else if (!endDate) missingField = '结束日期';
    else if (!startTime) missingField = '开始时间';
    else if (!endTime) missingField = '结束时间';
    else if (!applyReason) missingField = '申请用途';
    else if (!classroom._id) missingField = '教室信息（请重新选择）';
    else if (!studentInfo.studentId) missingField = '申请人信息（请重新登录）';

    if (missingField) {
      wx.showToast({ title: `请填写${missingField}`, icon: 'none' });
      return;
    }

    // 2. 组装申请数据（保留原有字段，仅固定老师定向信息）
    const applyData = {
      studentId: studentInfo.studentId || '',
      studentName: studentInfo.username || '',
      studentOpenid: studentOpenid || '',
      studentPhone: studentPhone || '',
      applyPersonCount: applyPersonCount || '',
      classroomId: classroom._id || '',
      classroomNo: classroom.classroomNo || '',
      applyUseTime: [{
        startTime: `${startDate || ''} ${startTime || ''}`,
        endTime: `${endDate || ''} ${endTime || ''}`
      }],
      applyReason: applyReason || '',
      auditStatus: 'pending', // 待审核
      teacherId: 'TEA2025001', // 王建国老师工号（保留固定值）
      teacherName: '王建国', // 王建国老师姓名（保留固定值）
      teacherOpenid: 'o_teacher001', // 定向标识（关键：与老师端查询一致）
      applyTime: db.serverDate() // 服务器时间
    };

    console.log("学生端提交的申请数据：", applyData);

    // 3. 提交到云数据库（保留原有逻辑）
    wx.showLoading({ title: '提交中...' });
    applyCollection.add({
      data: applyData, // 明确传入数据，避免undefined
      success: (res) => {
        wx.hideLoading();
        wx.showToast({ title: '申请提交成功', icon: 'success' });
        setTimeout(() => wx.navigateBack({ delta: 1 }), 1500);
      },
      fail: (err) => {
        console.error('提交申请失败：', err);
        wx.hideLoading();
        wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      }
    });
  }
});