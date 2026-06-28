import { getNowWeek } from '../../utils/util'

const courseCacheKey = "courses"
const courseColorCacheKey = "courseColor"

Page({
  /**
   * 页面的初始数据
   */
  data: {
    nowWeek: 1, // 当前周
    totalWeek: 18, // 周总数
    showSwitchWeek: false, // 显示选择周数弹窗
    weekDayCount: 7,
    startDate: '2023/02/20', // 开学日期
    weekIndexText: ['一', '二', '三', '四', '五', '六', '日'],
    nowMonth: 1, // 当前周的月份
    staticCourseList: [], // 备用静态数据
    courseList: [], // 渲染用的课程列表
    colorList: [
      "#116A7B",
      "#DD58D6",
      "#30A2FF",
      "#0079FF",
      "#F79327",
      "#47A992",
      "#7A3E3E",
      "#FF55BB",
      "#A0D8B3",
      "#539165",
      "#3A98B9",
      "#609966",
    ],
    courseColor: {},
    weekCalendar: [1, 2, 3, 4, 5, 6, 7],
    firstEntry: true,
    windowWidth: 0,
    todayMonth: 0,
    todayDay: 0,
    courseContainerHeight: 0, // 课程容器高度（不再拼接rpx字符串）
    timeList: [
      "09:00-09:40",  // 1节
      "09:41-10:20",  // 2节
      "10:40-11:20",  // 3节
      "11:21-12:00",  // 4节
      "12:30-13:10",  // 5节
      "13:11-13:50",  // 6节
      "14:00-14:40",  // 7节
      "14:41-15:20",  // 8节
      "15:30-16:10",  // 9节
      "16:11-16:50",  // 10节
      "17:00-17:40",  // 11节
      "17:41-18:20",  // 12节
      "19:00-19:40",  // 13节（新增晚上时段）
      "19:41-20:20",  // 14节（新增晚上时段）
      "20:30-21:10",  // 15节（新增晚上时段）
      "21:11-21:50"   // 16节（新增晚上时段）
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 封装异步逻辑，确保顺序执行
    this.initPageData();
  },

  /**
   * 页面初始化异步方法（统一管理顺序执行的逻辑）
   */
  async initPageData() {
    try {
      // 1. 获取设备信息
      const { windowWidth } = wx.getSystemInfoSync()
      this.setData({ windowWidth })

      // 2. 获取今日日期
      this.getTodayDate()

      // 3. 【关键】查询用户课程列表（等待查询完成）
      const queryCourseList = await this.callGetUserCourseList();

      // 4. 后续依赖方法（需在课程查询后执行）
      this.getNowWeek()
      this.getWeekDates()
      this.getData(queryCourseList) // 传入查询到的课程列表
      this.setCourseContainerHeight() // 最后计算容器高度
    } catch (err) {
      // 捕获初始化过程中的异常，保证页面不崩溃
      console.error('页面初始化失败', err);
      // 异常时使用静态数据兜底
      this.getNowWeek()
      this.getWeekDates()
      this.getData(this.data.staticCourseList)
      this.setCourseContainerHeight()
    }
  },

  /**
   * 调用云函数查询用户课程列表
   */
  callGetUserCourseList(year, semester) {
    // 封装为Promise，方便后续等待
    return new Promise((resolve, reject) => {
      wx.showLoading({
        title: '加载课程中...',
      });

      wx.cloud.callFunction({
        name: 'getUserCourseList',
        data: {
          year: year,
          semester: semester
        }
      }).then((cloudRes) => {
        wx.hideLoading();
        const result = cloudRes.result;
        if (result.success) {
          console.log('云函数查询课程成功', result.courseList);
          // 【修正】原有错误：将课程列表赋值给courseList（而非colorList）
          this.setData({
            staticCourseList: result.courseList // 同步到静态数据，供兜底使用
          });
          if (result.courseList.length === 0) {
            wx.showToast({
              title: result.message,
              icon: 'none'
            });
          }
          // 查询成功，返回课程列表（供后续方法使用）
          resolve(result.courseList);
        } else {
          wx.showToast({
            title: result.message,
            icon: 'error'
          });
          console.error('云函数查询课程失败', result.error);
          // 查询失败，抛出错误
          reject(new Error(result.message));
        }
      }).catch((err) => {
        wx.hideLoading();
        console.error('调用云函数失败', err);
        wx.showToast({
          title: '调用云函数失败',
          icon: 'error'
        });
        // 调用失败，抛出错误
        reject(err);
      });
    });
  },

  // 设置课程容器高度（适配16节课，移除rpx字符串拼接，直接传数值）
  setCourseContainerHeight() {
    const perSectionHeight = 120 // 每节高度（rpx）
    const totalHeight = this.data.timeList.length * perSectionHeight // 16*120=1920rpx
    this.setData({ courseContainerHeight: totalHeight }) // 直接存数值，wxml中拼接rpx
  },

  selectWeek() {
    this.setData({ showSwitchWeek: true })
  },

  switchWeek(e) {
    const week = e.currentTarget.dataset.week
    this.setData({ showSwitchWeek: false })
    this.switchWeekFn(week)
  },

  // 切换周数
  switchWeekFn(week) {
    this.setData({ nowWeek: week })
    this.getWeekDates()
  },

  hideSwitchWeek() {
    this.setData({ showSwitchWeek: false })
  },

  getWeekDates() {
    const startDate = new Date(this.data.startDate)
    const addTime = (this.data.nowWeek - 1) * 7 * 24 * 60 * 60 * 1000
    const firstDate = startDate.getTime() + addTime
    const { month: nowMonth } = this.getDateObject(new Date(firstDate))
    const weekCalendar = []
    for (let i = 0; i < this.data.weekDayCount; i++) {
      const date = new Date(firstDate + i * 24 * 60 * 60 * 1000)
      const { day } = this.getDateObject(date)
      weekCalendar.push(day)
    }
    this.setData({ nowMonth, weekCalendar })
  },

  getDateObject(date = new Date()) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return { year, month, day }
  },

  getNowWeek() {
    const nowWeek = getNowWeek(this.data.startDate, this.data.totalWeek)
    this.setData({ nowWeek: nowWeek || 1 }) // 容错处理，避免undefined
    this.getWeekDates()
  },

  /**
   * 加载课程数据（接收查询结果）
   */
  getData(queryCourseList) {
    // 使用云函数查询到的课程列表，无数据则用静态数据兜底
    const courseList = queryCourseList || this.data.staticCourseList;
    console.log('最终渲染的课程列表', courseList);
    
    // 设置渲染用的课程列表
    this.setData({ courseList })
    // 构建课程颜色映射
    this.buildCourseColor()
    
    // 保留原有缓存逻辑，如需启用可取消注释
    // wx.setStorageSync(courseCacheKey, courseList)
    // const courseColorCache = wx.getStorageSync(courseColorCacheKey)
    // if (!courseColorCache) {
    //   this.buildCourseColor()
    // } else {
    //   this.setData({ courseColor: courseColorCache })
    // }
  },

  // 手动更新数据（使用查询到的课程数据刷新）
  update() {
    // 重新查询课程并更新
    this.callGetUserCourseList()
      .then((courseList) => {
        this.setData({ courseList: courseList || this.data.staticCourseList })
        this.buildCourseColor()
        wx.setStorageSync(courseCacheKey, this.data.courseList)
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      })
      .catch(() => {
        // 更新失败时用现有数据兜底
        this.setData({ courseList: this.data.courseList })
        this.buildCourseColor()
        wx.showToast({
          title: '更新失败，使用本地数据',
          icon: 'none'
        })
      })
  },

  swiperSwitchWeek(e) {
    if (e.detail.source === '') {
      this.setData({ firstEntry: false })
      return
    }
    const index = e.detail.current
    this.switchWeekFn(index + 1)
  },

  // 优化颜色分配，避免索引越界（适配多课程）
  buildCourseColor() {
    const courseColor = {}
    const colorList = this.data.colorList
    const courseNames = [...new Set(this.data.courseList.map(item => item.name || ''))] // 课程名去重，容错空值
    
    courseNames.forEach((name, index) => {
      if (!name) return; // 跳过空课程名
      // 取模运算，循环使用颜色，避免索引越界
      courseColor[name] = colorList[index % colorList.length]
    })
    
    wx.setStorageSync(courseColorCacheKey, courseColor)
    this.setData({ courseColor })
  },

  // 获取今天日期
  getTodayDate() {
    const { month: todayMonth, day: todayDay } = this.getDateObject()
    this.setData({ todayMonth, todayDay })
  },

  // 修正参数传递，避免特殊字符导致跳转失败
  navCourseDetail(e) {
    const index = e.currentTarget.dataset.index
    const courseInfo = this.data.courseList[index]
    if (!courseInfo) return
    wx.navigateTo({
      url: `/pages/course-detail/index?info=${encodeURIComponent(JSON.stringify(courseInfo))}`,
    })
  }
})