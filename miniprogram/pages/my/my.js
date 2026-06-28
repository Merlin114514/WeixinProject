const db = wx.cloud.database();

Page({
  data: {
    userInfo: null,
    tempAvatarPath: '',
    studentFuncs: [
      { icon: "/images/wodekebiao.png", name: "课表查询", path: "/pages/student-course/student-course" },
      { icon: "/images/ditu.png", name: "‌POI搜索", path: "/pages/map/map" },
      { icon: "/images/sc.png", name: "教室申请", path: "/pages/classroom-query/classroom-query" },
      { icon: "/images/pyq.png", name: "我的朋友圈", path: "/pages/community/community" },
      { icon: "/images/xx.png", name: "聊天列表", path: "/pages/student-chatlist/student-chatlist" },
      { icon: "/images/hd1.png", name: "我的活动", path: "/pages/activity/activity" },
      { icon: "/images/teacher-avatar1.png", name: "添加老师", path: "/pages/student-addTeacher/student-addTeacher" },
      { icon: "/images/ai-chat.png", name: "AI智能问答", path: "/pages/ai-chat/ai-chat" },
      { icon: "/images/Map.png", name: "校园导航", path: "/pages/campus-nav/campus-nav" }
    ],
    teacherFuncs: [
      { icon: "/images/wodekebiao.png", name: "课程查询", path: "/pages/teacher-course/teacher-course" },
      { icon: "/images/xs.png", name: "教室审核", path: "/pages/audit-list/audit-list" },
      { icon: "/images/hd.png", name: "活动发布", path: "/publish-activity/publish-activity" },
      { icon: "/images/xx.png", name: "聊天列表", path: "/pages/teacher-chatList/teacher-chatList" },
      { icon: "/images/weixin.png", name: "好友申请", path: "/pages/teacher-applyList/teacher-applyList" },
      { icon: "/images/sz.png", name: "个人设置", path: "/pages/teachershezhi/teachershezhi" },
      { icon: "/images/ditu.png", name: "‌POI搜索", path: "/pages/map/map" },
      { icon: "/images/ai-chat.png", name: "AI智能问答", path: "/pages/ai-chat/ai-chat" },
      { icon: "/images/Map.png", name: "校园导航", path: "/pages/campus-nav/campus-nav" }
    ]
  },

  onLoad() {
    this.loadUserInfoAndAvatar(); // 重构为单独方法，便于刷新
  },

  // 新增：加载用户信息（优先从数据库拉取最新头像，确保实时性）
  loadUserInfoAndAvatar() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.role) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    // 从数据库拉取最新用户信息（重点：获取最新头像Url）
    db.collection('user').doc(userInfo._id).get({
      success: (res) => {
        const latestUserInfo = res.data;
        // 同步到本地缓存和页面数据
        wx.setStorageSync('userInfo', latestUserInfo);
        this.setData({
          userInfo: latestUserInfo // 强制刷新页面数据
        });
      },
      fail: () => {
        // 数据库查询失败时，使用本地缓存兜底，确保页面正常显示
        this.setData({ userInfo });
      }
    });
  },

  // 头像上传（原有逻辑不变，仅适配字段）
  chooseAvatar() {
    if (!this.data.userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        that.setData({ tempAvatarPath: tempFilePath });
        wx.showLoading({ title: '上传中...' });
        that.uploadAvatar(tempFilePath);
      }
    });
  },

  // 头像上传至云存储（核心修改：适配数据库 avatarUrl 字段）
  uploadAvatar(tempFilePath) {
    const that = this;
    const userInfo = that.data.userInfo;
    const cloudPath = `avatar/${userInfo._id}-${Date.now()}.png`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath,
      success: res => {
        // 关键修改：更新数据库的 avatarUrl 字段（与数据库保持一致）
        db.collection('user').doc(userInfo._id).update({
          data: { avatarUrl: res.fileID }, // 替换为 avatarUrl，匹配数据库
          success: () => {
            // 同步更新本地缓存和页面数据（字段统一为 avatarUrl）
            const newUserInfo = {
              ...userInfo,
              avatarUrl: res.fileID // 同步更新头像字段
            };
            wx.setStorageSync('userInfo', newUserInfo);
            // 强制刷新页面数据，实现头像实时更新
            that.setData({
              userInfo: newUserInfo,
              tempAvatarPath: ''
            });
            wx.hideLoading();
            wx.showToast({ title: '上传成功', icon: 'success' });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '更新头像失败', icon: 'none' });
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        console.error('上传失败：', err);
        wx.showToast({ title: '头像上传失败', icon: 'none' });
      }
    });
  },

  // 功能跳转逻辑（原有逻辑不变，自动兼容新增的校园导航按钮）
  clickFunc(e) {
    const { path, name } = e.currentTarget.dataset;
    if (!path) {
      wx.showToast({ title: '页面路径未配置', icon: 'none' });
      return;
    }
    if (name === '好友申请') {
      wx.reLaunch({ url: path });
    } else {
      wx.navigateTo({
        url: path,
        fail: () => {
          wx.redirectTo({ url: path, fail: () => {
            wx.showToast({ title: '跳转失败，检查页面路径', icon: 'none' });
          }})
        }
      });
    }
  },

  // 退出登录（原有逻辑不变）
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  }
});