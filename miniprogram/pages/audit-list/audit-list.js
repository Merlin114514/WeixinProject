const db = wx.cloud.database();
const app = getApp();

Page({
  data: {
    auditList: []
  },

  onLoad() {
    this.getPendingApplies(); // 加载你的数据库中待审核申请
  },

  onShow() {
    this.getPendingApplies(); // 页面显示时刷新
  },

  // 查询你数据库中“待审核+定向给王建国老师”的申请
  getPendingApplies() {
    const that = this;
    const targetTeacherOpenid = "o_teacher001"; // 你数据库中teacherOpenid的值

    wx.showLoading({ title: '加载申请中...', mask: true });

    // 查你实际的classroom_apply集合，用你数据库的字段
    db.collection('classroom_apply').where({
      auditStatus: 'pending', // 你的字段：待审核状态
      teacherOpenid: targetTeacherOpenid // 你的字段：定向老师的OpenID
    }).orderBy('applyTime', 'desc') // 你的字段：申请时间倒序
      .get({
        success(res) {
          wx.hideLoading();
          console.log("你的数据库中待审核申请：", res.data);
          that.setData({ auditList: res.data });

          if (res.data.length === 0) {
            wx.showToast({ title: '暂无待审核申请', icon: 'none' });
          }
        },
        fail(err) {
          wx.hideLoading();
          console.error("查询申请失败：", err);
          wx.showToast({ title: '加载申请失败', icon: 'none' });
        }
      });
  },

  // 跳转到你的audit-detail页面（匹配app.json路径）
  gotoAuditDetail(e) {
    const applyId = e.currentTarget.dataset.applyId; // 绑定的申请ID
    console.log("你要查看的申请ID：", applyId);

    if (!applyId) {
      wx.showToast({ title: '申请数据异常', icon: 'none' });
      return;
    }

    // 跳转路径匹配你app.json中的audit-detail
    wx.navigateTo({
      url: `/pages/audit-detail/audit-detail?applyId=${applyId}`
    });
  },

  onPullDownRefresh() {
    this.getPendingApplies();
    wx.stopPullDownRefresh();
  }
});