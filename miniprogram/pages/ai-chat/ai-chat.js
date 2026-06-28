const db = wx.cloud.database()

Page({
  data: {
    chatList: [
      // 初始欢迎语
      { role: 'ai', content: '你好！我是校园AI助手，可解答教务、后勤等校园常见问题～' },
    ],
    inputValue: '', // 用户输入内容
    userAvatar: '/images/hsq.png' // 用户头像，默认值与你原有默认头像一致
  },

  // 页面初始化时获取用户头像
  onLoad(options) {
    this.updateUserAvatar();
  },

  // 页面每次显示时（如登录后返回该页面）更新头像（核心：实现实时更新）
  onShow() {
    this.updateUserAvatar();
  },

  // 统一更新用户头像的方法
  updateUserAvatar() {
    // 读取本地存储的用户信息
    const storageUser = wx.getStorageSync('userInfo');
    if (storageUser && storageUser.avatarUrl) {
      // 若存在用户信息且有头像，更新页面头像数据
      this.setData({
        userAvatar: storageUser.avatarUrl
      });
    } else {
      // 若不存在，重置为默认头像
      this.setData({
        userAvatar: '/images/hsq.png'
      });
    }
  },

  // 监听用户输入
  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 发送消息给百度AI（核心修改：调用云函数）
  sendMsg() {
    const { inputValue, chatList } = this.data;
    if (!inputValue.trim()) {
      wx.showToast({ title: '请输入问题', icon: 'none' });
      return;
    }

    // 1. 添加用户消息到聊天列表，先展示用户输入
    const newChatList = [...chatList, { role: 'user', content: inputValue.trim() }];
    this.setData({
      chatList: newChatList,
      inputValue: '' // 清空输入框
    });

    // 2. 调用云函数，请求百度AI
    wx.showLoading({ title: 'AI思考中...' });
    wx.cloud.callFunction({
      name: 'baiduAIChat', // 对应云函数名称
      data: {
        question: inputValue.trim() // 传递用户问题
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          // 添加AI回复到聊天列表
          const finalChatList = [...newChatList, { role: 'ai', content: res.result.aiReply }];
          this.setData({
            chatList: finalChatList
          });
          // 滚动到聊天底部
          this.scrollToBottom();
        } else {
          // AI调用失败，提示错误
          const errorChatList = [...newChatList, { role: 'ai', content: res.result.aiReply || 'AI服务异常，请重试～' }];
          this.setData({
            chatList: errorChatList
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error("调用云函数失败：", err);
        // 网络失败兜底
        const errorChatList = [...newChatList, { role: 'ai', content: '网络异常，无法连接AI服务～' }];
        this.setData({
          chatList: errorChatList
        });
      }
    });
  },

  // 滚动到聊天底部
  scrollToBottom() {
    const query = wx.createSelectorQuery().in(this);
    query.select('#chat-container').boundingClientRect(rect => {
      if (rect) {
        wx.pageScrollTo({
          scrollTop: rect.height,
          duration: 300
        });
      }
    }).exec();
  }
});