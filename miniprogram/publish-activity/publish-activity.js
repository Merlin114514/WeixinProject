// publish-activity/publish-activity.js
const app = getApp();
const db = wx.cloud.database();
const activitiesCollection = db.collection('campus_activities');

Page({
  data: {
    typeList: [
      { name: '学术讲座', type: 'lecture' },
      { name: '运动比赛', type: 'sports' },
      { name: '其他活动', type: 'other' }
    ],
    typeIndex: 0,
    selectedType: {},
    // 拆分日期+时间（解决datetime模式兼容问题）
    startDate: '',     // 开始日期（如：2025-12-31）
    startTimePart: '', // 开始时间（如：14:00）
    endDate: '',       // 结束日期
    endTimePart: '',   // 结束时间
    startTime: '',     // 拼接后完整开始时间（如：2025-12-31 14:00）
    endTime: '',       // 拼接后完整结束时间
    imageUrl: ''
  },

  onLoad(options) {
    this.setData({
      selectedType: this.data.typeList[0]
    });
  },

  onTypeChange(e) {
    const index = e.detail.value;
    const selectedType = this.data.typeList[index];
    this.setData({
      typeIndex: index,
      selectedType: selectedType
    });
  },

  /**
   * 开始日期选择（mode=date，低版本稳定）
   */
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    });
    this.updateStartTime(); // 自动拼接完整时间
  },

  /**
   * 开始时间选择（mode=time，低版本稳定）
   */
  onStartTimePartChange(e) {
    this.setData({
      startTimePart: e.detail.value
    });
    this.updateStartTime(); // 自动拼接完整时间
  },

  /**
   * 拼接完整开始时间
   */
  updateStartTime() {
    const { startDate, startTimePart } = this.data;
    if (startDate && startTimePart) {
      this.setData({
        startTime: `${startDate} ${startTimePart}`
      });
    } else {
      this.setData({
        startTime: ''
      });
    }
  },

  /**
   * 结束日期选择（mode=date，低版本稳定）
   */
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    });
    this.updateEndTime(); // 自动拼接完整时间
  },

  /**
   * 结束时间选择（mode=time，低版本稳定）
   */
  onEndTimePartChange(e) {
    this.setData({
      endTimePart: e.detail.value
    });
    this.updateEndTime(); // 自动拼接完整时间
  },

  /**
   * 拼接完整结束时间
   */
  updateEndTime() {
    const { endDate, endTimePart } = this.data;
    if (endDate && endTimePart) {
      this.setData({
        endTime: `${endDate} ${endTimePart}`
      });
    } else {
      this.setData({
        endTime: ''
      });
    }
  },

  uploadImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        wx.showLoading({ title: '图片上传中...' });

        wx.cloud.uploadFile({
          cloudPath: `activity-imgs/${Date.now()}-${Math.random().toString(36).substr(2, 10)}.png`,
          filePath: tempFilePath,
          success: (uploadRes) => {
            this.setData({
              imageUrl: uploadRes.fileID
            });
            wx.showToast({ title: '图片上传成功', icon: 'success' });
          },
          fail: (err) => {
            wx.showToast({ title: '图片上传失败', icon: 'none' });
            console.error('图片上传失败：', err);
          },
          complete: () => {
            wx.hideLoading();
          }
        });
      },
      fail: (err) => {
        console.error('选择图片失败：', err);
      }
    });
  },

  formSubmit(e) {
    const formData = e.detail.value;
    const { selectedType, startTime, endTime, imageUrl } = this.data;

    // 表单校验
    if (!formData.title) {
      wx.showToast({ title: '请输入活动标题', icon: 'none' });
      return;
    }
    if (!selectedType || !selectedType.type) {
      wx.showToast({ title: '请选择活动类型', icon: 'none' });
      return;
    }
    if (!startTime) {
      wx.showToast({ title: '请选择开始时间', icon: 'none' });
      return;
    }
    if (!endTime) {
      wx.showToast({ title: '请选择结束时间', icon: 'none' });
      return;
    }
    if (!formData.location) {
      wx.showToast({ title: '请输入活动地点', icon: 'none' });
      return;
    }
    if (!formData.desc) {
      wx.showToast({ title: '请输入活动简介', icon: 'none' });
      return;
    }
    if (!formData.maxCount || formData.maxCount < 1) {
      wx.showToast({ title: '请输入有效的最大名额（≥1）', icon: 'none' });
      return;
    }
    if (new Date(startTime).getTime() >= new Date(endTime).getTime()) {
      wx.showToast({ title: '结束时间需晚于开始时间', icon: 'none' });
      return;
    }

    // 构造活动数据（匹配数据库）
    const activityData = {
      id: `act${Date.now().toString().slice(-4)}`,
      title: formData.title,
      type: selectedType.type,
      typeName: selectedType.name,
      createTime: new Date().toLocaleDateString().replace(/\//g, '-'),
      startTime: startTime,
      endTime: endTime,
      time: `${startTime} - ${endTime}`,
      location: formData.location,
      desc: formData.desc,
      image: imageUrl || '',
      maxCount: parseInt(formData.maxCount),
      registerCount: 0,
      registerUsers: []
    };

    // 提交到数据库
    wx.showLoading({ title: '活动发布中...' });
    activitiesCollection.add({
      data: activityData,
      success: () => {
        wx.showToast({ title: '活动发布成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack({ delta: 1, fail: () => wx.redirectTo({ url: '/pages/activity/activity' }) });
        }, 1000);
      },
      fail: (err) => {
        wx.showToast({ title: '活动发布失败', icon: 'none' });
        console.error('发布失败原因：', err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
});