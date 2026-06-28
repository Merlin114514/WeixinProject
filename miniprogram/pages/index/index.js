Page({
    data: {
      swiperList: [
        {url: 'index/1.jpg' },
        {url: 'index/2.png' },
        {url: 'index/3.jpg' }
      ],
      courseList: [],    
      totalCount: 0,     
      page: 1,           
      pageSize: 4,       
      hasMore: true      
    },
  
    onLoad() {
      console.log('首页加载完成');
      this.initCloudEnv();
      this.getCourseTotal();
      this.getCourseList();
    },
  
    onReachBottom() {
      if (!this.data.hasMore) {
        wx.showToast({ title: '已加载全部课程', icon: 'none', duration: 1000 });
        return;
      }
      this.setData({ page: this.data.page + 1 }, () => {
        this.getCourseList();
      });
    },
  
    initCloudEnv() {
      if (!wx.cloud) {
        wx.showToast({ title: '当前基础库不支持云开发', icon: 'none' });
        return;
      }
      wx.cloud.init({ env: 'cloud1-d5g28cuac626d2ff4', traceUser: true });
    },
  
    navToKetang() {
      wx.navigateTo({ url: '/pages/ketang/ketang' });
    },
  
    navToKecheng() {
      wx.navigateTo({ url: '/pages/kecheng/kecheng' });
    },
  
    navToNeirong() {
      wx.navigateTo({ url: '/pages/neirong/neirong' });
    },
  
    getCourseTotal() {
      const db = wx.cloud.database({ env: 'cloud1-d5g28cuac626d2ff4' });
      db.collection('wen').count().then(res => {
        this.setData({ totalCount: res.total });
      }).catch(err => {
        console.error('获取课程总数失败：', err);
        wx.showToast({ title: '获取课程总数失败', icon: 'none' });
      });
    },
  
    getCourseList() {
      wx.showLoading({ title: '加载中...', mask: true });
      const db = wx.cloud.database({ env: 'cloud1-d5g28cuac626d2ff4' });
      db.collection('wen')
        .skip((this.data.page - 1) * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()
        .then(res => {
          wx.hideLoading();
          const newCourses = res.data;
          this.setData({
            courseList: [...this.data.courseList, ...newCourses],
            hasMore: newCourses.length === this.data.pageSize
          });
        })
        .catch(err => {
          wx.hideLoading();
          console.error('获取课程列表失败：', err);
          wx.showToast({ title: '加载失败', icon: 'none' });
        });
    },
  
    navToCourseDetail(e) {
      const course = e.currentTarget.dataset.course;
      if (!course || !course._id) {
        wx.showToast({ title: '课程数据异常', icon: 'none' });
        return;
      }
      // 用reLaunch跳转（关闭所有页面，打开新页面，显示tabBar）
      wx.reLaunch({
        url: `/pages/courseDetail/courseDetail?course=${encodeURIComponent(JSON.stringify(course))}`
      });
    },
  
    navToAllCourse() {
      wx.navigateTo({ url: '/pages/allCourse/allCourse' });
    },
  
    navToScore() {
      wx.showToast({ title: '跳转到成绩页面', icon: 'none' });
    },
  
    navToExam() {
      wx.showToast({ title: '跳转到作业考试页面', icon: 'none' });
    },
  
    navToQa() {
      wx.showToast({ title: '跳转到问答页面', icon: 'none' });
    }
  });