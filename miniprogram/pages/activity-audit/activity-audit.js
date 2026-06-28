// pages/activity-audit/activity-audit.js
const app = getApp();
const db = wx.cloud.database();
const activitiesCollection = db.collection('campus_activities');
const applyCollection = db.collection('apply');

Page({
  data: {
    auditActivities: []
  },

  onLoad() {
    this.getAuditActivities();
  },

  // 获取当前老师发布的活动及对应待审核申请
  getAuditActivities() {
    wx.showLoading({ title: '加载中...' });
    const teacherOpenid = app.globalData.userInfo?.openid;

    // 校验老师登录状态
    if (!teacherOpenid) {
      wx.showToast({ title: '请先登录教师账号', icon: 'none' });
      wx.hideLoading();
      return;
    }

    // 仅获取当前老师发布的活动（通过creatorOpenid筛选）
    activitiesCollection.where({
      creatorOpenid: teacherOpenid // 匹配活动发布者的openid
    }).get({
      success: (activityRes) => {
        const activities = activityRes.data.map(item => ({
          ...item,
          time: `${item.startTime || ''} - ${item.endTime || ''}`
        }));

        const auditActivities = [];
        let count = 0;

        if (activities.length === 0) {
          this.setData({ auditActivities: [] });
          wx.hideLoading();
          return;
        }

        // 遍历每个老师发布的活动，查询对应的待审核申请
        activities.forEach(activity => {
          applyCollection.where({
            activityId: activity._id, // 关键：匹配活动的数据库主键_id
            applyStatus: 'pending'    // 仅查待审核状态的申请
          }).get({
            success: (applyRes) => {
              auditActivities.push({
                activity,
                applies: applyRes.data
              });
              count++;
              if (count === activities.length) {
                this.setData({ auditActivities });
              }
            },
            fail: (err) => {
              console.error('获取申请失败', err);
              count++;
              if (count === activities.length) {
                this.setData({ auditActivities });
              }
            }
          });
        });
      },
      fail: (err) => {
        wx.showToast({ title: '加载活动失败', icon: 'none' });
        console.error(err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 处理审核操作
  handleAudit(e) {
    const applyId = e.currentTarget.dataset.applyid;
    const status = e.currentTarget.dataset.status;

    if (!applyId) {
      wx.showToast({ title: '申请ID无效', icon: 'none' });
      return;
    }

    // 更新申请状态
    applyCollection.doc(applyId).update({
      data: {
        applyStatus: status === 'agree' ? 'approved' : 'rejected',
        auditTime: new Date().toLocaleString()
      },
      success: () => {
        wx.showToast({ title: status === 'agree' ? '审核通过' : '审核拒绝' });
        this.getAuditActivities(); // 刷新列表
      },
      fail: (err) => {
        wx.showToast({ title: '审核操作失败', icon: 'none' });
        console.error(err);
      }
    });
  }
});