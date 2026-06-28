// 老师课表JS - 不同老师登录显示个人课程 + 详情弹窗 + 新增课程
wx.cloud.init({ traceUser: true });
const db = wx.cloud.database();

Page({
  data: {
    // 星期配置
    weekList: [
      { week: 1, name: "周一" },
      { week: 2, name: "周二" },
      { week: 3, name: "周三" },
      { week: 4, name: "周四" },
      { week: 5, name: "周五" },
      { week: 6, name: "周六" },
      { week: 7, name: "周日" }
    ],
    // 时间段配置
    periodList: [
      "1-2节（08:00-09:40）",
      "3-4节（10:00-11:40）",
      "5-6节（14:30-16:10）",
      "7-8节（16:30-18:10）",
      "9-10节（19:00-20:40）"
    ],
    currentWeek: 1,          // 当前选中星期
    teacherCourseList: [],   // 老师个人当前星期课程
    periodCourses: [],       // 按时间段分组后的个人课程
    showDetail: false,       // 课程详情弹窗开关
    currentCourse: {},       // 当前选中课程详情
    showAddModal: false,     // 新增课程弹窗开关
    formData: {              // 新增课程表单数据
      week_index: 0,
      period_index: 0
    },
    teacherInfo: {}          // 当前登录老师信息（含_openid，用于筛选个人课程）
  },

  onLoad(options) {
    const that = this;
    // 1. 获取本地存储的老师登录信息
    const storageUser = wx.getStorageSync('userInfo');
    // 校验是否为老师账号
    if (!storageUser || storageUser.role !== 'teacher') {
      wx.showToast({ title: '非老师账号，无法访问', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    // 2. 存储老师信息并查询个人课程
    that.setData({ teacherInfo: storageUser }, () => {
      that.getTeacherCourse();
    });
  },

  /**
   * 核心：查询当前登录老师的个人课程（按_openid筛选，仅显示自己的课）
   */
  getTeacherCourse() {
    const that = this;
    const { teacherInfo, currentWeek, periodList } = that.data;
    // 当前老师的唯一标识（与数据库课程的tea_openid一致）
    const teacherOpenid = teacherInfo._openid;

    // 按「老师openid + 当前星期」筛选，确保只查自己的课程
    db.collection('teacher_course_schedule')
      .where({
        tea_openid: teacherOpenid,
        week_day: Number(currentWeek)
      })
      .get({
        success: (res) => {
          const courses = res.data;
          // 按时间段分组（供WXML遍历，无需调用函数）
          const periodCourses = periodList.map(period => {
            return courses.filter(course => course.class_period === period);
          });
          that.setData({
            teacherCourseList: courses,
            periodCourses: periodCourses
          });
        },
        fail: (err) => {
          console.error('个人课程查询失败：', err);
          wx.showToast({ title: '课程加载失败', icon: 'none' });
        }
      });
  },

  /**
   * 切换星期（刷新对应星期的个人课程）
   */
  switchWeek(e) {
    const week = e.currentTarget.dataset.week;
    this.setData({ currentWeek: week }, () => {
      this.getTeacherCourse();
    });
  },

  /**
   * 点击课程显示详情弹窗
   */
  showCourseDetail(e) {
    const course = e.currentTarget.dataset.course;
    this.setData({
      currentCourse: course,
      showDetail: true
    });
  },

  /**
   * 关闭课程详情弹窗
   */
  closeDetail() {
    this.setData({
      showDetail: false,
      currentCourse: {}
    });
  },

  /**
   * 显示新增课程弹窗
   */
  showAddModal() {
    this.setData({ showAddModal: true });
  },

  /**
   * 关闭新增课程弹窗（重置表单）
   */
  closeAddModal() {
    this.setData({
      showAddModal: false,
      formData: {
        week_index: 0,
        period_index: 0
      }
    });
  },

  /**
   * 新增课程 - 星期选择变更
   */
  onWeekChange(e) {
    this.setData({ 'formData.week_index': e.detail.value });
  },

  /**
   * 新增课程 - 时间段选择变更
   */
  onPeriodChange(e) {
    this.setData({ 'formData.period_index': e.detail.value });
  },

  /**
   * 提交新增课程（关联当前老师openid，确保后续能查询到）
   */
  submitCourse(e) {
    const that = this;
    const { teacherInfo, weekList, periodList, formData } = that.data;
    const { course_name, classroom } = e.detail.value;

    // 表单校验
    if (!course_name.trim() || !classroom.trim()) {
      wx.showToast({ title: '课程名称和教室不能为空', icon: 'none' });
      return;
    }

    // 构造课程数据（关联当前老师信息）
    const courseData = {
      tea_openid: teacherInfo._openid, // 绑定当前老师openid
      tea_id: teacherInfo.teaId || "未知工号",
      tea_name: teacherInfo.username || "未知老师",
      course_name: course_name.trim(),
      week_day: weekList[formData.week_index].week,
      class_period: periodList[formData.period_index],
      classroom: classroom.trim(),
      college: teacherInfo.college || "未知学院",
      create_time: new Date().toLocaleString('zh-CN')
    };

    // 存入数据库
    db.collection('teacher_course_schedule')
      .add({
        data: courseData,
        success: () => {
          wx.showToast({ title: '新增课程成功', icon: 'success' });
          that.closeAddModal();
          that.getTeacherCourse(); // 刷新个人课程列表
        },
        fail: (err) => {
          console.error('新增课程失败：', err);
          wx.showToast({ title: '新增课程失败，请重试', icon: 'none' });
        }
      });
  }
});