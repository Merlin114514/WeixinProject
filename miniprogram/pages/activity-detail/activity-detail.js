// pages/activity-detail/activity-detail.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    activity: {}, // 活动详情
    isLogin: false // 标记当前是否已登录
  },

  onLoad(options) {
    // 1. 先获取活动ID（假设是通过options传递的）
    const activityId = options.id;
    if (!activityId) {
      wx.showToast({ title: '活动ID无效', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }

    // 2. 检查当前登录状态（核心：从app全局变量/本地缓存取登录信息）
    this.checkLoginStatus();

    // 3. 获取活动详情
    this.getActivityDetail(activityId);
  },

  /**
   * 核心：检查登录状态（修改这里确保能正确识别已登录用户）
   */
  checkLoginStatus() {
    // 方式1：从app.globalData取（推荐，登录后把用户信息存在app.globalData.userInfo）
    const userInfo = app.globalData.userInfo;
    
    // 方式2：从本地缓存取（如果是存在缓存里）
    // const userInfo = wx.getStorageSync('userInfo');

    this.setData({
      isLogin: !!userInfo // 如果有userInfo，标记为已登录
    });
  },

  /**
   * 获取活动详情（原有逻辑保留）
   */
  getActivityDetail(activityId) {
    db.collection('campus_activities').doc(activityId).get({
      success: (res) => {
        // 补充判断活动是否已结束（根据结束时间）
        const activity = res.data;
        const now = new Date().getTime();
        const endTime = new Date(activity.endTime).getTime();
        activity.isEnd = now > endTime; // 标记是否已结束

        this.setData({ activity });
      },
      fail: () => {
        wx.showToast({ title: '获取活动详情失败', icon: 'none' });
      }
    });
  },

  /**
   * 立即报名（修复登录判断逻辑）
   */
  submitApply() {
    // 先再次确认登录状态（避免页面加载后登录态变化）
    this.checkLoginStatus();
    if (!this.data.isLogin) {
      // 只有未登录时才提示重新登录
      wx.showToast({ title: '请先登录', icon: 'none' });
      // 跳转到登录页（根据你的登录页路径调整）
      setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 1000);
      return;
    }

    // 已登录，执行报名逻辑（原有逻辑保留）
    const { activity } = this.data;
    const userId = app.globalData.userInfo._openid; // 假设用户openid存在这里

    // 检查是否已报名（避免重复报名）
    if (activity.registerUsers?.includes(userId)) {
      wx.showToast({ title: '你已报名过该活动', icon: 'none' });
      return;
    }

    // 更新报名信息
    db.collection('campus_activities').doc(activity._id).update({
      data: {
        registerCount: activity.registerCount + 1,
        registerUsers: [...activity.registerUsers, userId]
      },
      success: () => {
        wx.showToast({ title: '报名成功', icon: 'success' });
        // 刷新活动详情
        this.getActivityDetail(activity._id);
      },
      fail: () => {
        wx.showToast({ title: '报名失败，请重试', icon: 'none' });
      }
    });
  }
});