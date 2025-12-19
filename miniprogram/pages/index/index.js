Page({
    data: {
      // 轮播图数据（保留原有内容）
      swiperList: [
        { url: 'cloud://cloud1-9g5j215id54c25fb.636c-cloud1-9g5j215id54c25fb-1364415873/wen/swiper1.png' },
        { url: 'cloud://cloud1-9g5j215id54c25fb.636c-cloud1-9g5j215id54c25fb-1364415873/wen/swiper2.png' },
        { url: 'cloud://cloud1-9g5j215id54c25fb.636c-cloud1-9g5j215id54c25fb-1364415873/wen/swiper3.png' }
      ],
      // 课程列表相关数据
      courseList: [],    // 存储加载的课程列表
      totalCount: 0,     // 课程总数量（显示“我的课程(XX)”）
      page: 1,           // 分页页码，初始为1（进入页面加载第1页）
      pageSize: 4,       // 每次加载4条课程
      hasMore: true      // 是否还有更多课程可加载
    },
  
    // 页面加载时执行（仅加载1次第1页数据）
    onLoad() {
      console.log('首页加载完成');
      this.initCloudEnv();
      this.getCourseTotal();
      this.getCourseList(); // 进入页面仅加载1次第1页数据
    },
  
    // 页面触底时自动执行（下滑到底触发加载更多）
    onReachBottom() {
      if (!this.data.hasMore) {
        wx.showToast({
          title: '已加载全部课程',
          icon: 'none',
          duration: 1000
        });
        return;
      }
      // 页码+1，加载下一页
      this.setData({
        page: this.data.page + 1
      }, () => {
        this.getCourseList();
      });
    },
  
    // 初始化云环境（双重保障）
    initCloudEnv() {
      if (!wx.cloud) {
        wx.showToast({
          title: '当前基础库不支持云开发',
          icon: 'none'
        });
        return;
      }
      wx.cloud.init({
        env: 'cloud1-9g5j215id54c25fb', // 你的云环境ID
        traceUser: true
      });
    },
  
    // 跳转同步课堂（ketang页面）
    navToKetang() {
      wx.navigateTo({
        url: '/pages/ketang/ketang'
      });
    },
  
    // 跳转加入课程（kecheng页面）
    navToKecheng() {
      wx.navigateTo({
        url: '/pages/kecheng/kecheng'
      });
    },
  
    // 跳转精品内容（neirong页面）
    navToNeirong() {
      wx.navigateTo({
        url: '/pages/neirong/neirong'
      });
    },
  
    // 获取wen集合的课程总数
    getCourseTotal() {
      const db = wx.cloud.database({
        env: 'cloud1-9g5j215id54c25fb'
      });
      db.collection('wen').count()
        .then(res => {
          this.setData({
            totalCount: res.total
          });
        })
        .catch(err => {
          console.error('获取课程总数失败：', err);
          wx.showToast({
            title: '获取课程总数失败',
            icon: 'none'
          });
        });
    },
  
    // 分页加载wen集合的课程列表（每次4条，数据累加）
    getCourseList() {
      wx.showLoading({
        title: '加载中...',
        mask: true
      });
      const db = wx.cloud.database({
        env: 'cloud1-9g5j215id54c25fb'
      });
      db.collection('wen')
        .skip((this.data.page - 1) * this.data.pageSize) // 跳过已加载的页数（比如第2页跳过 1*4=4条）
        .limit(this.data.pageSize) // 每次加载4条
        .get()
        .then(res => {
          wx.hideLoading();
          const newCourses = res.data;
          // 数据累加：原有数据 + 新数据
          this.setData({
            courseList: [...this.data.courseList, ...newCourses],
            // 若返回数据少于pageSize，说明没有更多数据了
            hasMore: newCourses.length === this.data.pageSize
          });
        })
        .catch(err => {
          wx.hideLoading();
          console.error('获取课程列表失败：', err);
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        });
    },
  
    // 跳转课程详情页（携带当前课程数据）
    navToCourseDetail(e) {
      const course = e.currentTarget.dataset.course;
      if (!course || !course._id) {
        wx.showToast({
          title: '课程数据异常',
          icon: 'none'
        });
        return;
      }
      wx.navigateTo({
        url: `/pages/courseDetail/courseDetail?course=${encodeURIComponent(JSON.stringify(course))}`
      });
    },
  
    // 查看全部课程（可选）
    navToAllCourse() {
      wx.navigateTo({
        url: '/pages/allCourse/allCourse'
      });
    },
  
    // 课程项内的“成绩”按钮跳转
    navToScore() {
      wx.showToast({
        title: '跳转到成绩页面',
        icon: 'none'
      });
    },
  
    // 课程项内的“作业考试”按钮跳转
    navToExam() {
      wx.showToast({
        title: '跳转到作业考试页面',
        icon: 'none'
      });
    },
  
    // 课程项内的“问答”按钮跳转
    navToQa() {
      wx.showToast({
        title: '跳转到问答页面',
        icon: 'none'
      });
    }
  });