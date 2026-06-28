const db = wx.cloud.database();
const applyCollection = db.collection('classroom_apply');
const app = getApp();

Page({
  data: {
    applyList: [] // 我的申请列表
  },

  onLoad(options) {
    this.getMyApplyList();
  },

  /**
   * 获取当前学生的所有申请记录
   */
  getMyApplyList() {
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    if (!openid) {
      wx.showToast({ title: '未获取到用户信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载中...' });
    // 根据学生OpenID查询，按提交时间倒序排列
    applyCollection.where({
      studentOpenid: openid
    }).orderBy('applyTime', 'desc').get({
      success: (res) => {
        // 转换审核状态为中文显示
        const applyList = res.data.map(item => ({
          ...item,
          auditStatusText: item.auditStatus === 'pending' ? '待审核' : (item.auditStatus === 'approved' ? '已同意' : '已驳回')
        }));
        this.setData({ applyList });
        wx.hideLoading();
      },
      fail: (err) => {
        console.error('拉取申请列表失败：', err);
        wx.hideLoading();
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      }
    });
  },

  /**
   * （可选）跳转至申请详情页面（若你有该页面，已匹配独立路径）
   */
  gotoApplyDetail(e) {
    const apply = e.currentTarget.dataset.apply;
    wx.navigateTo({
      url: `/pages/apply-detail/apply-detail?apply=${encodeURIComponent(JSON.stringify(apply))}`
    });
  },

  /**
   * 下拉刷新更新申请状态
   */
  onPullDownRefresh() {
    this.getMyApplyList();
    wx.stopPullDownRefresh();
  }
});