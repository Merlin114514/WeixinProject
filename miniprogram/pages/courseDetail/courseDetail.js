Page({
    data: {
      course: {}
    },
  
    onLoad(options) {
      try {
        // 解析从首页传递的课程数据
        const course = JSON.parse(decodeURIComponent(options.course));
        this.setData({
          course: {
            ...course,
            teacher: course.add_id || "未知老师",    // 对应数据库add_id（老师）
            courseNo: course.add_class || "未知课程号",// 对应数据库add_class（课程号）
            taskBadge: true
          }
        });
      } catch (err) {
        console.error('解析课程数据失败：', err);
        wx.showToast({ title: '课程加载失败', icon: 'none' });
        // 加载失败返回首页
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1500);
      }
    },
  
    // 返回首页（保留tabBar）
    backToIndex() {
      wx.switchTab({ url: '/pages/index/index' });
    },
  
    // 功能按钮跳转（如需保留tabBar，建议改用switchTab/reLaunch）
    toResource() {
      wx.reLaunch({ url: '/pages/resource/resource' });
    },
    toTask() {
      wx.reLaunch({ url: '/pages/task/task' });
    },
    toExam() {
      wx.reLaunch({ url: '/pages/exam/exam' });
    },
    toClass() {
      wx.reLaunch({ url: '/pages/class/class' });
    },
    toQa() {
      wx.reLaunch({ url: '/pages/qa/qa' });
    },
    toGroup() {
      wx.reLaunch({ url: '/pages/group/group' });
    },
    toChat() {
      wx.reLaunch({ url: '/pages/chat/chat' });
    },
    toPractice() {
      wx.reLaunch({ url: '/pages/practice/practice' });
    },
    toScore() {
      wx.reLaunch({ url: '/pages/score/score' });
    }
  });