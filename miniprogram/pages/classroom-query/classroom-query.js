const db = wx.cloud.database();
const classroomCollection = db.collection('classroom_info');

Page({
  data: {
    classroomList: [] // 教室列表
  },

  onLoad(options) {
    this.getClassroomList();
  },

  /**
   * 拉取教室实时使用情况
   */
  getClassroomList() {
    wx.showLoading({ title: '加载中...' });
    classroomCollection.get({
      success: (res) => {
        this.setData({
          classroomList: res.data
        });
        wx.hideLoading();
      },
      fail: (err) => {
        console.error('拉取教室列表失败：', err);
        wx.hideLoading();
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      }
    });
  },

  /**
   * 跳转至教室申请页面（已匹配你的页面路径，核心修改）
   */
  gotoApplyPage(e) {
    console.log("申请按钮触发，教室数据：", e.currentTarget.dataset.classroom);
    const classroom = e.currentTarget.dataset.classroom;
    // 非空闲教室不可申请
    if (classroom.status !== 'idle') {
      wx.showToast({ title: '该教室当前不可申请', icon: 'none' });
      return;
    }
    // 跳转路径：匹配你的 classroom-apply 页面独立目录
    wx.navigateTo({
      url: `/pages/classroom-apply/classroom-apply?classroom=${encodeURIComponent(JSON.stringify(classroom))}`
    });
  },

  /**
   * 下拉刷新更新教室状态
   */
  onPullDownRefresh() {
    this.getClassroomList();
    wx.stopPullDownRefresh();
  }
});