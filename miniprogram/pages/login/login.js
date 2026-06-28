var app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    activeRole: 'student', // 默认选中学生身份
    account: '', // 学号/工号
    password: '', // 密码
    loginLoading: false // 登录加载状态
  },

  onLoad(options) {
    // 若已登录，直接跳转首页
    const storageUser = wx.getStorageSync('userInfo')
    if (storageUser) {
      this.redirectToIndex(storageUser.role)
    }
  },

  // 切换身份：学生/老师
  changeRole(e) {
    const role = e.currentTarget.dataset.role
    this.setData({
      activeRole: role,
      account: '', // 切换身份清空账号密码
      password: ''
    })
  },

  // 输入学号/工号
  inputAccount(e) {
    this.setData({
      account: e.detail.value.trim()
    })
  },

  // 输入密码
  inputPassword(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 账号密码登录（核心逻辑）
  accountLogin() {
    const { activeRole, account, password } = this.data
    const that = this

    // 1. 表单校验
    if (!account) {
      wx.showToast({ title: `请输入${activeRole === 'student' ? '学号' : '工号'}`, icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    // 2. 显示加载状态
    this.setData({ loginLoading: true })

    // 3. 数据库查询：根据身份+账号+密码匹配用户
    let queryCondition = {}
    // 学生：匹配 role=student + studentId=账号 + password=密码
    if (activeRole === 'student') {
      queryCondition = {
        role: 'student',
        studentId: account,
        password: password // 注：实际生产环境建议加密存储，此处为演示简化
      }
    }
    // 老师：匹配 role=teacher + teaId=账号 + password=密码
    else if (activeRole === 'teacher') {
      queryCondition = {
        role: 'teacher',
        teaId: account,
        password: password
      }
    }

    // 4. 执行查询
    db.collection('user')
      .where(queryCondition)
      .get({
        success: (res) => {
          that.setData({ loginLoading: false })
          // 5. 校验查询结果
          if (res.data.length > 0) {
            // 登录成功：存储用户信息
            const userInfo = res.data[0]
            // 同步到全局变量
            app.globalData.userInfo = userInfo
            // 同步到本地存储（持久化，重启小程序不丢失）
            wx.setStorageSync('userInfo', userInfo)
            // 提示并跳转首页
            wx.showToast({ title: '登录成功', icon: 'success' })
            that.redirectToIndex(userInfo.role)
          } else {
            // 登录失败：账号或密码错误
            wx.showToast({ title: `${activeRole === 'student' ? '学号' : '工号'}或密码错误`, icon: 'none' })
          }
        },
        fail: (err) => {
          that.setData({ loginLoading: false })
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          console.error('账号密码登录失败：', err)
        }
      })
  },

  // 跳转注册页面（携带当前选中身份）
  gotoRegister() {
    const { activeRole } = this.data
    wx.navigateTo({
      url: `/pages/register/register?role=${activeRole}`
    })
  },

  // 根据身份跳转对应首页
  redirectToIndex(role) {
    if (!role) {
      wx.showToast({ icon: 'none', title: '用户身份异常' })
      return
    }
    // 使用reLaunch清空页面栈，避免返回登录页
    if (role === 'student') {
      wx.reLaunch({ url: '/pages/my/my' })
    } else if (role === 'teacher') {
      wx.reLaunch({ url: '/pages/my/my' })
    }
  }
})