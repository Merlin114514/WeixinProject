const db = wx.cloud.database();
const _ = db.command;
const app = getApp();

Page({
  data: {
    msgList: [],
    friendOpenid: '',
    friendAvatar: '',
    friendName: '',
    myOpenid: '',
    myAvatar: '',
    myName: '',
    inputContent: '',
    scrollToView: '',
    msgPage: 0,
    pageSize: 20,
    msgWatch: null
  },

  onLoad(options) {
    console.log('聊天页接收参数：', options);
    const { friendOpenid, friendAvatar, friendName } = options;
    if (!friendOpenid) {
      wx.showToast({ title: '聊天对象无效', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }

    // 获取当前用户的OpenID
    const myInfo = wx.getStorageSync('userInfo') || app.globalData.userInfo;
    if (!myInfo || !myInfo._openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }

    // 初始化数据
    this.setData({
      friendOpenid: friendOpenid,
      friendAvatar: decodeURIComponent(friendAvatar || '/images/default-avatar.png'),
      friendName: decodeURIComponent(friendName || '未知用户'),
      myOpenid: myInfo._openid,
      myAvatar: myInfo.avatarUrl || myInfo.avatar || '/images/default-avatar.png',
      myName: myInfo.username || '我'
    }, () => {
      this.loadHistoryMsg();
      this.watchNewMsg();
      this.markMsgAsRead();
    });
  },

  // 确保输入内容正确同步
  onInputChange(e) {
    const inputValue = e.detail.value || '';
    console.log('输入内容同步：', inputValue);
    this.setData({
      inputContent: inputValue
    }, () => {
      console.log('inputContent更新后：', this.data.inputContent);
    });
  },

  // 修复：强化消息追加逻辑，确保消息不消失
  async sendMsg() {
    console.log('发送按钮已点击，进入sendMsg函数');
    // 手动去除首尾空格，替代WXML中的trim()
    let content = this.data.inputContent || '';
    content = content.trim();

    // 空消息校验
    if (!content) {
      wx.showToast({ title: '请输入消息内容', icon: 'none' });
      return;
    }

    // 核心参数校验
    const { myOpenid, friendOpenid, msgList } = this.data;
    if (!myOpenid || !friendOpenid) {
      wx.showToast({ title: '用户/聊天对象信息异常', icon: 'none' });
      console.error('异常信息：', { myOpenid, friendOpenid });
      return;
    }

    // 构造发送数据
    const sendData = {
      content: content,
      createTime: new Date().getTime(),
      fromOpenid: myOpenid,
      toOpenid: friendOpenid,
      isRead: false,
      msgType: 'text',
      fileID: ''
    };

    try {
      console.log('准备写入数据库：', sendData);
      // 写入数据库
      const addRes = await db.collection('message').add({
        data: sendData
      });
      console.log('消息写入成功：', addRes);

      // 关键修复1：深拷贝原有消息列表，避免引用问题导致消息丢失
      const oldMsgList = JSON.parse(JSON.stringify(msgList));
      // 构造新消息（携带数据库返回的唯一ID）
      const newMsg = { ...sendData, _id: addRes._id };
      // 关键修复2：强制追加新消息到原有列表，确保100%留存
      const newMsgList = [...oldMsgList, newMsg];

      this.setData({
        msgList: newMsgList, // 替换为新的完整列表，而非临时追加
        inputContent: '' // 清空输入框
      }, () => {
        console.log('消息追加后，完整列表：', this.data.msgList); // 验证列表是否包含新消息
        this.scrollToLatestMsg(); // 滚动到最新消息，确保用户可见
      });

      wx.showToast({ title: '发送成功', icon: 'success', duration: 1000 });
    } catch (err) {
      console.error('发送失败详情：', err);
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  // 滚动到最新消息
  scrollToLatestMsg() {
    const { msgList } = this.data;
    if (msgList.length === 0) return;
    const lastIndex = msgList.length - 1;
    this.setData({
      scrollToView: `msg-${lastIndex}`
    });
    // 额外：强制刷新滚动，确保消息在可视区域
    wx.nextTick(() => {
      const query = wx.createSelectorQuery().in(this);
      query.select(`#msg-${lastIndex}`).boundingClientRect();
      query.exec((res) => {
        if (res[0]) console.log('最新消息位置：', res[0]);
      });
    });
  },

  // 原有功能：加载历史消息
  async loadHistoryMsg() {
    const { myOpenid, friendOpenid, msgPage, pageSize } = this.data;
    try {
      const res = await db.collection('message')
        .where({
          _or: [
            { fromOpenid: myOpenid, toOpenid: friendOpenid },
            { fromOpenid: friendOpenid, toOpenid: myOpenid }
          ]
        })
        .orderBy('createTime', 'asc')
        .skip(msgPage * pageSize)
        .limit(pageSize)
        .get();

      if (res.data.length > 0) {
        // 关键修复：历史消息也采用深拷贝追加，防止丢失
        const oldMsgList = JSON.parse(JSON.stringify(this.data.msgList));
        this.setData({
          msgList: [...oldMsgList, ...res.data],
          msgPage: this.data.msgPage + 1
        }, () => {
          this.scrollToLatestMsg();
        });
      }
    } catch (err) {
      console.error('加载历史消息失败：', err);
    }
  },

  // 原有功能：实时监听消息（优化过滤逻辑，防止误删消息）
  watchNewMsg() {
    const { myOpenid, friendOpenid } = this.data;
    this.data.msgWatch = db.collection('message')
      .where({
        _or: [
          { fromOpenid: myOpenid, toOpenid: friendOpenid },
          { fromOpenid: friendOpenid, toOpenid: myOpenid }
        ]
      })
      .orderBy('createTime', 'asc')
      .watch({
        onChange: (snapshot) => {
          const oldMsgList = JSON.parse(JSON.stringify(this.data.msgList));
          // 优化过滤：更严谨判断消息是否已存在
          const newDocs = snapshot.docs.filter(newMsg => {
            return !oldMsgList.some(oldMsg => oldMsg._id === newMsg._id);
          });
          if (newDocs.length > 0) {
            // 追加新消息，不覆盖原有列表
            this.setData({
              msgList: [...oldMsgList, ...newDocs]
            }, () => {
              this.scrollToLatestMsg();
            });
          }
        },
        onError: (err) => console.error('监听失败：', err)
      });
  },

  // 原有功能：标记消息已读
  markMsgAsRead() {
    const { myOpenid, friendOpenid } = this.data;
    db.collection('message').where({
      fromOpenid: friendOpenid,
      toOpenid: myOpenid,
      isRead: false
    }).update({
      data: { isRead: true }
    }).catch(err => console.error('标记已读失败：', err));
  },

  // 原有功能：格式化消息时间
  formatMsgTime(timeStamp) {
    if (!timeStamp) return '未知时间';
    const date = new Date(timeStamp);
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const msgDay = new Date(date.setHours(0, 0, 0, 0));

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return msgDay.getTime() === today.getTime()
      ? `${hours}:${minutes}`
      : `${month}-${day} ${hours}:${minutes}`;
  },

  // 原有功能：加载更多消息
  loadMoreMsg() {
    this.loadHistoryMsg();
  },

  // 原有功能：页面卸载关闭监听
  onUnload() {
    if (this.data.msgWatch) {
      this.data.msgWatch.close();
    }
  }
});