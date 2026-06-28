// pages/community/community.js
const db = wx.cloud.database();
const _ = db.command;
const dynamicCollection = db.collection('community_dynamics');

Page({
  data: {
    dynamicList: [],        // 动态列表
    loading: false,         // 加载状态
    showPublishModal: false,// 发布弹窗显隐
    showCommentModal: false,// 评论弹窗显隐
    publishContent: '',     // 动态文本内容
    uploadImages: [],       // 已上传图片的fileID列表
    commentContent: '',     // 评论内容
    currentDynamicId: '',   // 当前操作的动态ID
    userOpenid: '',         // 当前用户OpenID
    userInfo: {             // 当前用户信息
      avatarUrl: '/images/avatar.png',
      nickName: '匿名用户'
    },
    currentComments: []     // 新增：存储当前弹窗的评论列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    var that = this;
    // 确保OpenID获取完成后再加载列表
    that.getUserOpenid().then(function() {
      that.loadDynamicList();
    }).catch(function() {
      that.loadDynamicList(); // 登录失败也加载列表（无用户信息）
    });
  },

  /**
   * 格式化时间（统一展示格式）
   */
  formatTime: function(time) {
    if (!time) return '刚刚';
    var date = new Date(time);
    var year = date.getFullYear();
    var month = (date.getMonth() + 1).toString().padStart(2, '0');
    var day = date.getDate().toString().padStart(2, '0');
    var hour = date.getHours().toString().padStart(2, '0');
    var minute = date.getMinutes().toString().padStart(2, '0');
    return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
  },

  /**
   * 获取用户OpenID（基础功能，返回Promise）
   */
  getUserOpenid: function() {
    var that = this;
    return new Promise(function(resolve, reject) {
      wx.cloud.callFunction({
        name: 'getOpenid',
        success: function(res) {
          var openid = res.result.openid;
          that.setData({ userOpenid: openid }, function() {
            // 获取用户微信头像/昵称
            that.getUserProfile();
            resolve(openid);
          });
        },
        fail: function(err) {
          console.error('获取OpenID失败：', err);
          wx.showToast({ title: '登录失败，请重试', icon: 'none' });
          reject(err);
        }
      });
    });
  },

  /**
   * 获取用户微信头像/昵称
   */
  getUserProfile: function() {
    var that = this;
    wx.getUserProfile({
      desc: '用于发布动态和评论展示个人信息',
      success: function(res) {
        that.setData({ userInfo: res.userInfo });
      },
      fail: function() {
        // 授权失败使用默认信息
        that.setData({
          userInfo: {
            avatarUrl: '/images/avatar.png',
            nickName: '匿名用户'
          }
        });
      }
    });
  },

  /**
   * 加载动态列表（核心，兼容字符串/数组格式评论）
   */
  loadDynamicList: function() {
    var that = this;
    that.setData({ loading: true });
  
    dynamicCollection
      .orderBy('publishTime', 'desc')
      .get({
        force: true, // 强制刷新，跳过缓存
        success: function(res) {
          var userOpenid = that.data.userOpenid;
          var rawData = res.data || [];
          var dynamicList = [];
  
          for (var i = 0; i < rawData.length; i++) {
            var item = rawData[i];
            // 解析评论（兼容字符串/数组）
            var comments = item.comments || [];
            if (typeof comments === 'string') {
              try {
                comments = JSON.parse(comments.replace(/'/g, '"'));
              } catch (e) {
                console.error('解析评论失败：', e);
                comments = [];
              }
            }
            comments = Array.isArray(comments) ? comments : [];
  
            // 格式化评论
            var formatComments = [];
            for (var j = 0; j < comments.length; j++) {
              var comment = comments[j];
              formatComments.push({
                avatar: comment.avatar || '/images/avatar.png',
                nickname: comment.nickname || '匿名用户',
                content: comment.content || '空评论',
                commentTime: that.formatTime(comment.commentTime) || '刚刚'
              });
            }
  
            // 组装动态数据
            dynamicList.push({
              ...item,
              comments: formatComments,
              commentCount: formatComments.length,
              likedUsers: Array.isArray(item.likedUsers) ? item.likedUsers : [],
              likeCount: Number(item.likeCount || 0),
              isLiked: userOpenid && item.likedUsers && item.likedUsers.indexOf(userOpenid) > -1,
              publishTime: that.formatTime(item.publishTime) || '刚刚'
            });
          }
  
          that.setData({
            dynamicList: dynamicList,
            loading: false
          }, function() {
            // 调试日志
            console.log('动态列表加载完成：', dynamicList);
            if (dynamicList.length > 0) {
              console.log('第一条动态评论数：', dynamicList[0].commentCount);
              console.log('第一条动态评论列表：', dynamicList[0].comments);
            }
          });
        },
        fail: function(err) {
          console.error('加载动态失败：', err);
          wx.showToast({ title: '加载失败，请重试', icon: 'none' });
          that.setData({ loading: false });
        }
      });
  },

  /**
   * 打开发布弹窗
   */
  openPublishModal: function() {
    this.setData({
      showPublishModal: true,
      publishContent: '',
      uploadImages: []
    });

    if (!this.data.userOpenid) {
      this.getUserOpenid();
    }
  },

  /**
   * 关闭发布弹窗
   */
  closePublishModal: function() {
    this.setData({ showPublishModal: false });
  },

  /**
   * 监听发布内容输入
   */
  onPublishContentInput: function(e) {
    this.setData({ publishContent: e.detail.value?.trim() || '' });
  },

  /**
   * 选择图片
   */
  chooseImage: function() {
    var uploadImages = this.data.uploadImages;
    var remainCount = 9 - uploadImages.length;

    if (remainCount <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }

    var that = this;
    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        that.uploadImagesToCloud(res.tempFilePaths);
      },
      fail: function(err) {
        console.error('选择图片失败：', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  /**
   * 上传图片到云存储
   */
  uploadImagesToCloud: function(tempFilePaths) {
    if (!tempFilePaths || tempFilePaths.length === 0) return;

    var that = this;
    wx.showLoading({ title: '上传图片中...' });
    var uploadPromises = [];

    for (var i = 0; i < tempFilePaths.length; i++) {
      (function(index) {
        var tempPath = tempFilePaths[index];
        var cloudPath = 'community/' + that.data.userOpenid + '_' + Date.now() + '_' + index + '.png';
        uploadPromises.push(new Promise(function(resolve, reject) {
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempPath,
            success: function(res) { resolve(res.fileID); },
            fail: function(err) { reject('第' + (index+1) + '张图片上传失败：' + err.errMsg); }
          });
        }));
      })(i);
    }

    Promise.all(uploadPromises)
      .then(function(fileIDs) {
        wx.hideLoading();
        var newUploadImages = that.data.uploadImages.concat(fileIDs);
        that.setData({ uploadImages: newUploadImages });
        wx.showToast({ title: '成功上传' + fileIDs.length + '张图片', icon: 'success' });
      })
      .catch(function(err) {
        wx.hideLoading();
        console.error('图片上传失败：', err);
        wx.showToast({ title: err || '图片上传失败', icon: 'none' });
      });
  },

  /**
   * 发布动态
   */
  publishDynamic: function() {
    var that = this;
    var publishContent = that.data.publishContent;
    var uploadImages = that.data.uploadImages;
    var userOpenid = that.data.userOpenid;
    var userInfo = that.data.userInfo;

    if (!userOpenid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!publishContent && uploadImages.length === 0) {
      wx.showToast({ title: '内容或图片不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });

    var dynamicData = {
      content: publishContent,
      images: uploadImages,
      avatar: userInfo.avatarUrl,
      nickname: userInfo.nickName,
      openid: userOpenid,
      publishTime: db.serverDate(),
      likeCount: 0,
      likedUsers: [],
      commentCount: 0,
      comments: []
    };

    dynamicCollection.add({
      data: dynamicData,
      success: function() {
        wx.hideLoading();
        wx.showToast({ title: '发布成功', icon: 'success' });
        that.closePublishModal();
        that.loadDynamicList();
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('发布失败：', err);
        wx.showToast({ title: '发布失败，请重试', icon: 'none' });
      }
    });
  },

  /**
   * 点赞/取消点赞
   */
  toggleLike: function(e) {
    var dynamicId = e.currentTarget.dataset.id;
    var that = this;
    var userOpenid = that.data.userOpenid;
    var dynamicList = that.data.dynamicList;

    if (!userOpenid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    var dynamic = null;
    for (var i = 0; i < dynamicList.length; i++) {
      if (dynamicList[i]._id === dynamicId) {
        dynamic = dynamicList[i];
        break;
      }
    }
    if (!dynamic) {
      wx.showToast({ title: '动态不存在', icon: 'none' });
      return;
    }

    var originalLikedUsers = Array.isArray(dynamic.likedUsers) ? dynamic.likedUsers : [];
    var newLikeCount = Number(dynamic.likeCount || 0);
    var newLikedUsers = originalLikedUsers.slice(0);
    var isLiked = dynamic.isLiked || false;

    if (isLiked) {
      // 取消点赞
      for (var j = 0; j < newLikedUsers.length; j++) {
        if (newLikedUsers[j] === userOpenid) {
          newLikedUsers.splice(j, 1);
          break;
        }
      }
      newLikeCount = Math.max(0, newLikeCount - 1);
      isLiked = false;
    } else {
      // 点赞
      var hasOpenid = false;
      for (var k = 0; k < newLikedUsers.length; k++) {
        if (newLikedUsers[k] === userOpenid) {
          hasOpenid = true;
          break;
        }
      }
      if (!hasOpenid) {
        newLikedUsers.push(userOpenid);
        newLikeCount += 1;
      }
      isLiked = true;
    }

    // 本地更新
    var updatedList = [];
    for (var l = 0; l < dynamicList.length; l++) {
      if (dynamicList[l]._id === dynamicId) {
        var newItem = dynamicList[l];
        newItem.likeCount = newLikeCount;
        newItem.likedUsers = newLikedUsers;
        newItem.isLiked = isLiked;
        updatedList.push(newItem);
      } else {
        updatedList.push(dynamicList[l]);
      }
    }
    that.setData({ dynamicList: updatedList });

    // 同步到数据库
    dynamicCollection.doc(dynamicId).update({
      data: {
        likeCount: isLiked ? _.inc(1) : _.inc(-1),
        likedUsers: isLiked ? _.push(userOpenid) : _.pull(userOpenid)
      },
      fail: function(err) {
        console.error('点赞更新失败：', err);
        that.loadDynamicList();
      }
    });
  },

  /**
   * 打开评论弹窗（核心：补充currentComments赋值）
   */
  openCommentModal: function(e) {
    var dynamicId = e.currentTarget.dataset.id;
    var that = this;
    var dynamicList = that.data.dynamicList;
    var currentDynamic = null;
    
    // 查找对应动态
    for (var i = 0; i < dynamicList.length; i++) {
      if (dynamicList[i]._id === dynamicId) {
        currentDynamic = dynamicList[i];
        break;
      }
    }
    var currentComments = currentDynamic ? (currentDynamic.comments || []) : [];

    that.setData({
      showCommentModal: true,
      commentContent: '',
      currentDynamicId: dynamicId,
      currentComments: currentComments // 关键：赋值评论列表
    });

    if (!that.data.userOpenid) {
      that.getUserOpenid();
    }
  },

  /**
   * 关闭评论弹窗
   */
  closeCommentModal: function() {
    this.setData({ 
      showCommentModal: false,
      currentComments: [] // 清空评论列表
    });
  },

  /**
   * 监听评论输入
   */
  onCommentContentInput: function(e) {
    this.setData({ commentContent: e.detail.value?.trim() || '' });
  },

  /**
   * 发送评论（重构：确保写入并刷新）
   */
  sendComment: function() {
    var that = this;
    var commentContent = that.data.commentContent;
    var currentDynamicId = that.data.currentDynamicId;
    var userOpenid = that.data.userOpenid;
    var userInfo = that.data.userInfo;

    // 基础校验
    if (!userOpenid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!commentContent) {
      wx.showToast({ title: '评论内容不能为空', icon: 'none' });
      return;
    }
    if (!currentDynamicId) {
      wx.showToast({ title: '未找到对应动态', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发送中...' });

    // 构造评论数据
    var newComment = {
      avatar: userInfo.avatarUrl || '/images/avatar.png',
      nickname: userInfo.nickName || '匿名用户',
      content: commentContent.trim(),
      openid: userOpenid,
      commentTime: new Date().toISOString()
    };

    // 先查询原动态
    dynamicCollection.doc(currentDynamicId).get({
      success: function(res) {
        var oldDynamic = res.data;
        var oldComments = oldDynamic.comments || [];
        
        // 解析原评论
        if (typeof oldComments === 'string') {
          try {
            oldComments = JSON.parse(oldComments.replace(/'/g, '"'));
          } catch (e) {
            oldComments = [];
          }
        }
        oldComments = Array.isArray(oldComments) ? oldComments : [];

        // 追加新评论
        var newComments = oldComments.concat(newComment);
        var newCommentCount = newComments.length;

        // 强制更新数据库
        dynamicCollection.doc(currentDynamicId).update({
          data: {
            comments: newComments,
            commentCount: newCommentCount
          },
          success: function() {
            wx.hideLoading();
            wx.showToast({ title: '评论成功', icon: 'success', duration: 1500 });
            
            // 格式化新评论
            var formatNewComment = {
              ...newComment,
              commentTime: that.formatTime(newComment.commentTime) || '刚刚'
            };
            
            // 更新弹窗评论列表
            var newCurrentComments = that.data.currentComments.concat(formatNewComment);
            that.setData({
              currentComments: newCurrentComments,
              commentContent: ''
            });

            // 强制刷新动态列表（确保页面显示）
            setTimeout(function() {
              that.loadDynamicList();
            }, 500);
          },
          fail: function(err) {
            wx.hideLoading();
            console.error('评论写入失败：', err);
            wx.showToast({ title: '评论失败(' + err.errMsg + ')', icon: 'none' });
          }
        });
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('查询动态失败：', err);
        wx.showToast({ title: '评论失败(' + err.errMsg + ')', icon: 'none' });
      }
    });
  },

  /**
   * 预览图片
   */
  previewImage: function(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.current,
      urls: e.currentTarget.dataset.imglist
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function() {
    var that = this;
    that.loadDynamicList();
    setTimeout(function() {
      wx.stopPullDownRefresh();
    }, 500);
  }
});