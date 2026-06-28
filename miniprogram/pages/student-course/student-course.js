// 学生课表JS（student-course.js）- 显示所有课程 + 点击弹窗详情
wx.cloud.init({ traceUser: true });
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    weekList: [
      { week: 1, name: "周一" },
      { week: 2, name: "周二" },
      { week: 3, name: "周三" },
      { week: 4, name: "周四" },
      { week: 5, name: "周五" },
      { week: 6, name: "周六" },
      { week: 7, name: "周日" }
    ],
    periodList: [
      "1-2节（08:00-09:40）",
      "3-4节（10:00-11:40）",
      "5-6节（14:30-16:10）",
      "7-8节（16:30-18:10）",
      "9-10节（19:00-20:40）"
    ],
    currentWeek: 1,
    studentCourseList: [],
    periodCourses: [], // 按时间段分组后的所有课程
    showDetail: false, // 课程详情弹窗开关
    currentCourse: {}  // 当前选中的课程详情
  },

  onLoad(options) {
    const that = this;
    // 无需再校验学生身份（若需要保留校验，可继续保留原有逻辑）
    const storageUser = wx.getStorageSync('userInfo') || {};
    that.setData({ studentInfo: storageUser }, () => {
      that.getStudentCourse();
    });
  },

  // 查询当前星期的所有课程（无筛选，显示数据库中对应星期的全部课程）
  getStudentCourse() {
    const that = this;
    const { currentWeek, periodList } = that.data;

    // 仅按星期筛选，显示该星期的所有课程
    db.collection('teacher_course_schedule')
      .where({
        week_day: Number(currentWeek)
      })
      .get({
        success: (res) => {
          const courses = res.data;
          // 按时间段分组
          const periodCourses = periodList.map(period => {
            return courses.filter(course => course.class_period === period);
          });
          that.setData({
            studentCourseList: courses,
            periodCourses: periodCourses
          });
        },
        fail: (err) => {
          console.error('查询失败：', err);
          wx.showToast({ title: '课表加载失败', icon: 'none' });
        }
      });
  },

  // 切换星期
  switchWeek(e) {
    const week = e.currentTarget.dataset.week;
    this.setData({
      currentWeek: week
    }, () => {
      this.getStudentCourse();
    });
  },

  // 显示课程详情弹窗
  showCourseDetail(e) {
    const course = e.currentTarget.dataset.course;
    this.setData({
      currentCourse: course, // 传递当前课程数据
      showDetail: true       // 打开弹窗
    });
  },

  // 关闭课程详情弹窗
  closeDetail() {
    this.setData({
      showDetail: false,
      currentCourse: {}
    });
  }
});