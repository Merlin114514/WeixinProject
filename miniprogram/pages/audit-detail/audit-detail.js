const db = wx.cloud.database();
const app = getApp();

Page({
  data: {
    applyDetail: {}, // 申请详情数据
    applyId: '',     // 申请ID
    hasData: false   // 标记是否有有效数据（代替WXML的Object.keys）
  },

  /**
   * 页面加载：接收申请ID并查询详情
   */
  onLoad(options) {
    // 接收你传递的申请ID
    const applyId = options.applyId;
    console.log("你传递的申请ID：", applyId);

    // 校验ID有效性
    if (!applyId) {
      wx.showToast({ title: '申请ID无效，即将返回列表', icon: 'none', duration: 1500 });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 存储ID并查询详情
    this.setData({ applyId: applyId });
    this.getApplyDetail(applyId);
  },

  /**
   * 核心：查询申请详情（匹配你的classroom_apply集合）
   */
  getApplyDetail(applyId) {
    const that = this;
    // 显示加载提示
    wx.showLoading({ title: '加载详情中...', mask: true });

    // 查询你的数据库集合
    db.collection('classroom_apply').doc(applyId).get({
      success(res) {
        wx.hideLoading();
        console.log("你的申请详情数据：", res.data);

        // 计算是否有有效数据，存入hasData
        const hasData = Object.keys(res.data).length > 0;
        // 更新页面数据，确保WXML能拿到
        that.setData({
          applyDetail: res.data,
          hasData: hasData // 关键：传递渲染标记
        });
      },
      fail(err) {
        wx.hideLoading();
        console.error("查询申请详情失败：", err);
        wx.showToast({ title: '加载详情失败，即将返回列表', icon: 'none', duration: 1500 });
        // 失败后返回列表
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  },

  /**
   * 同意申请：更新你的数据库审核状态
   */
  approveApply() {
    const { applyId } = this.data;

    // 二次确认
    wx.showModal({
      title: '确认操作',
      content: '是否确定同意该教室申请？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({ title: '审核中...', mask: true });

          // 更新你数据库的classroom_apply集合
          db.collection('classroom_apply').doc(applyId).update({
            data: {
              auditStatus: 'approved', // 你的审核状态字段
              auditTime: db.serverDate() // 审核时间（服务器时间）
            },
            success() {
              wx.hideLoading();
              wx.showToast({ title: '审核通过', icon: 'success', duration: 1500 });
              // 延迟返回列表，刷新数据
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            },
            fail(err) {
              wx.hideLoading();
              console.error("同意申请失败：", err);
              wx.showToast({ title: '审核失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  /**
   * 驳回申请：更新你的数据库审核状态
   */
  rejectApply() {
    const { applyId } = this.data;

    // 二次确认
    wx.showModal({
      title: '确认操作',
      content: '是否确定驳回该教室申请？',
      success(res) {
        if (res.confirm) {
          wx.showLoading({ title: '审核中...', mask: true });

          // 更新你数据库的classroom_apply集合
          db.collection('classroom_apply').doc(applyId).update({
            data: {
              auditStatus: 'rejected', // 你的审核状态字段
              auditTime: db.serverDate() // 审核时间（服务器时间）
            },
            success() {
              wx.hideLoading();
              wx.showToast({ title: '已驳回申请', icon: 'success', duration: 1500 });
              // 延迟返回列表，刷新数据
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            },
            fail(err) {
              wx.hideLoading();
              console.error("驳回申请失败：", err);
              wx.showToast({ title: '审核失败', icon: 'none' });
            }
          });
        }
      }
    });
  }
});