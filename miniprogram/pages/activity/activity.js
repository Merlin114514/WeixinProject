// pages/activity/activity.js
const app = getApp();
const db = wx.cloud.database();
const activitiesCollection = db.collection('campus_activities');

Page({
  data: {
    tabs: [
      { name: '全部活动', type: 'all' },
      { name: '学术讲座', type: 'lecture' },
      { name: '运动比赛', type: 'sports' },
      { name: '其他活动', type: 'other' }
    ],
    currentTab: 0,
    allActivities: [],
    filterActivities: [],
    newActivity: []
  },

  onLoad() {
    this.getActivities();
  },

  // 获取所有活动
  getActivities() {
    wx.showLoading({ title: '加载中...' });
    activitiesCollection.get({
      success: (res) => {
        const allActivities = res.data.map(item => {
          const now = new Date().getTime();
          const formatEndTime = item.endTime?.startsWith('0') ? `20${item.endTime}` : item.endTime;
          const formatCreateTime = item.createTime?.startsWith('0') ? `20${item.createTime}` : item.createTime;
          const endTime = new Date(formatEndTime || '').getTime() || 0;
          const createTime = new Date(formatCreateTime || '').getTime() || 0;
          return {
            ...item,
            time: `${item.startTime || ''} - ${item.endTime || ''}`,
            isEnd: now > endTime,
            isNew: (now - createTime) <= 10 * 60 * 1000,
            registerCount: item.registerCount || 0,
            maxCount: item.maxCount || 0
          };
        });

        const newActivity = allActivities.filter(item => item.isNew);

        this.setData({
          allActivities,
          filterActivities: allActivities,
          newActivity
        });
      },
      fail: (err) => {
        wx.showToast({ title: '加载失败', icon: 'none' });
        console.error(err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 切换分类标签
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    const tabType = this.data.tabs[index].type;
    let filterActivities = [...this.data.allActivities];

    if (tabType !== 'all') {
      filterActivities = filterActivities.filter(item => item.type === tabType);
    }

    this.setData({
      currentTab: index,
      filterActivities
    });
  },

  // 跳转你的活动详情页（路径完全匹配你的app.json配置）
  goToDetail(e) {
    const activityId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${activityId}`,
      fail: (err) => {
        console.error('跳转详情页失败：', err);
        wx.showToast({ title: '页面跳转失败', icon: 'none' });
      }
    });
  }
});