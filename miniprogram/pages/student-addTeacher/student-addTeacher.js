const db = wx.cloud.database();
const _ = db.command; // 关键：解决 _ is not defined 错误

Page({
  data: {
    userInfo: null,
    teacherId: '',         // 选中的老师ID
    teacherName: '',       // 选中的老师姓名
    inputRemark: '',       // 申请备注
    teacherList: [],       // 所有老师列表
    searchTeaId: '',       // 搜索的老师工号
    teacherInfo: null,     // 搜索到的老师信息
    showNoResult: false,   // 是否显示“无结果”提示
    friendStatus: 'none'   // 好友状态：none-无关系 pending-待审核 friend-已好友 refuse-已拒绝
  },

  onLoad(options) {
    // 1. 获取并校验学生身份
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.role || userInfo.role !== 'student') {
      wx.showToast({ title: '请先以学生身份登录', icon: 'none', duration: 2000 });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1500);
      return;
    }
    this.setData({ userInfo });

    // 2. 加载所有老师列表
    this.loadAllTeachers();
  },

  /**
   * 关键优化：页面显示时，重新校验好友状态（确保最新）
   */
  onShow() {
    const { teacherId } = this.data;
    if (teacherId) {
      this.checkFriendStatus(teacherId);
    }
  },

  // 加载所有老师列表（获取老师OpenID）
  loadAllTeachers() {
    wx.showLoading({ title: '加载老师列表...' });
    db.collection('user')
      .where({ role: 'teacher' })
      .field({ _id: true, username: true, teaId: true, avatarUrl: true, college: true, _openid: true })
      .get({
        success: (res) => {
          wx.hideLoading();
          this.setData({ teacherList: res.data });
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({ title: '加载老师失败', icon: 'none' });
          console.error('【加载老师列表失败】', err);
        }
      });
  },

  // 输入搜索的老师工号
  inputTeaId(e) {
    this.setData({ searchTeaId: e.detail.value.trim() });
  },

  // 搜索老师
  searchTeacher(e) {
    const teaId = e.detail.value.teaId?.trim() || this.data.searchTeaId;
    if (!teaId) {
      wx.showToast({ title: '请输入老师工号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '搜索中...' });
    db.collection('user')
      .where({ role: 'teacher', teaId: teaId })
      .field({ _id: true, username: true, teaId: true, avatarUrl: true, college: true, _openid: true })
      .get({
        success: (res) => {
          wx.hideLoading();
          if (res.data.length > 0) {
            const teacherInfo = res.data[0];
            this.setData({
              teacherInfo,
              teacherId: teacherInfo._id,
              teacherName: teacherInfo.username,
              showNoResult: false
            });
            // 校验好友状态（最新）
            this.checkFriendStatus(teacherInfo._id);
          } else {
            this.setData({
              teacherInfo: null,
              showNoResult: true,
              friendStatus: 'none'
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({ title: '搜索失败，请重试', icon: 'none' });
          console.error('【搜索老师失败】', err);
        }
      });
  },

  // 校验好友状态（优化：取最新申请记录，确保状态准确）
  checkFriendStatus(teacherId) {
    const { userInfo } = this.data;
    if (!teacherId || !userInfo) {
      this.setData({ friendStatus: 'none' });
      return;
    }

    db.collection('apply')
      .where({
        "fromInfo.studentId": userInfo._id,
        "toInfo.teacherId": teacherId,
        status: _.in(['pending', 'refuse', 'agree'])
      })
      .orderBy('createtime', 'desc') // 按时间倒序，取最新的申请记录
      .get({
        success: (res) => {
          if (res.data.length > 0) {
            const latestApply = res.data[0]; // 取最新状态
            console.log('当前最新申请状态：', latestApply.status);
            // 更新好友状态
            switch (latestApply.status) {
              case 'pending':
                this.setData({ friendStatus: 'pending' });
                break;
              case 'agree':
                this.setData({ friendStatus: 'friend' }); // 已同意，禁止申请
                break;
              case 'refuse':
                this.setData({ friendStatus: 'refuse' });
                break;
              default:
                this.setData({ friendStatus: 'none' });
            }
          } else {
            this.setData({ friendStatus: 'none' });
          }
        },
        fail: (err) => {
          console.error('【校验好友状态失败】', err);
          this.setData({ friendStatus: 'none' });
        }
      });
  },

  // 选择老师（补充OpenID传递，无内部注释）
  selectTeacher(e) {
    const { teacherid, teachername, teaid, avatarurl, college, openid } = e.currentTarget.dataset;
    const teacherInfo = {
      _id: teacherid,
      username: teachername,
      teaId: teaid,
      avatarUrl: avatarurl,
      college: college,
      _openid: openid
    };
    this.setData({
      teacherId: teacherid,
      teacherName: teachername,
      teacherInfo,
      showNoResult: false
    });
    // 校验好友状态（最新）
    this.checkFriendStatus(teacherid);
  },

  // 输入申请备注
  inputRemark(e) {
    this.setData({ inputRemark: e.detail.value });
  },

  // 发送添加申请（强化校验：杜绝已好友时发送申请）
  sendApply() {
    const { userInfo, teacherInfo, inputRemark, friendStatus } = this.data;

    // 1. 多层前置校验
    // 防护1：基础信息不全
    if (!userInfo || !userInfo._id || !teacherInfo || !teacherInfo._id) {
      wx.showToast({ title: '信息不完整，无法发送申请', icon: 'none' });
      return;
    }
    // 防护2：已好友/待审核状态，禁止发送
    if (friendStatus === 'pending' || friendStatus === 'friend') {
      const tipText = friendStatus === 'pending' ? '已发送申请，等待审核' : '已成为好友，无需重复申请';
      wx.showToast({ title: tipText, icon: 'none', duration: 1500 });
      return;
    }

    // 2. 构造申请数据
    const applyData = {
      fromInfo: {
        avatarUrl: userInfo.avatarUrl || '/images/my.png',
        username: userInfo.username || userInfo.studentId || '未知学生',
        studentId: userInfo._id
      },
      fromOpenid: userInfo._openid || '',
      toInfo: {
        avatarUrl: teacherInfo.avatarUrl || '/images/my.png',
        username: teacherInfo.username || '未知老师',
        teacherId: teacherInfo._id
      },
      toOpenid: teacherInfo._openid || '',
      applyRemark: inputRemark || '无备注',
      createtime: db.serverDate(),
      status: 'pending'
    };

    // 3. 提交申请
    wx.showLoading({ title: '发送申请中...' });
    db.collection('apply')
      .add({
        data: applyData,
        success: (res) => {
          wx.hideLoading();
          wx.showToast({ title: '申请发送成功', icon: 'success' });
          this.setData({ friendStatus: 'pending' }); // 强制更新状态
          setTimeout(() => wx.navigateBack(), 1500);
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({ title: '申请发送失败，请重试', icon: 'none' });
          console.error('【申请发送失败】', err);
        }
      });
  }
});