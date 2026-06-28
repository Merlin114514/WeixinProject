// 初始化云开发
const db = wx.cloud.database();

Page({
  data: {
    startInputVal: '', // 起点输入框内容
    endInputVal: '',   // 终点输入框内容
    startLat: '',      // 起点纬度
    startLon: '',      // 起点经度
    endLat: '',        // 终点纬度
    endLon: '',        // 终点经度
    distance: '',      // 计算出的距离
    polyline: [],      // 起点→终点连线（导航路线）
    centerLat: 23.450357, // 地图中心纬度（兜底）
    centerLon: 113.494604, // 地图中心经度（兜底）
    commonPlaces: [],   // 从云数据库自动拉取的地点列表
    markers: [], // 存储地图标记点（显示地点图片）

    // 新增：路径规划相关数据
    modeList: [ // 出行方式列表
      { type: 'walk', name: '步行' },
      { type: 'ride', name: '骑行' },
      { type: 'drive', name: '自驾' }
    ],
    activeMode: 'walk', // 默认选中步行
    planList: [ // 规划类型列表
      { type: 'minTime', name: '最短时间' },
      { type: 'minWalk', name: '最少步行' }
    ],
    activePlan: 'minTime', // 默认选中最短时间
    planResult: { show: false } // 规划结果
  },

  /**
   * 页面加载：初始化云+拉取数据库所有地点
   */
  onLoad(options) {
    // 1. 初始化云开发（必须）
    if (!wx.cloud) {
      wx.showToast({
        title: '请升级微信以支持云开发',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    wx.cloud.init({ traceUser: true });

    // 2. 从云数据库campus_poi拉取所有地点
    this.getPlacesFromCloud();
  },

  /**
   * 从云数据库campus_poi获取所有地点数据（核心修改：修复标记点无效问题）
   */
  getPlacesFromCloud() {
    const that = this;
    // 调用云数据库，获取campus_poi的所有记录
    db.collection('campus_poi')
      .get({
        success: (res) => {
          // 处理数据库数据：提取所需字段 + 严格校验经纬度
          const cloudPlaces = res.data.map(item => {
            // 转换经纬度为数字，并兜底无效值
            let lat = item.latitude ? Number(item.latitude) : NaN;
            let lon = item.longitude ? Number(item.longitude) : NaN;
            // 若经纬度无效，使用地图中心兜底值
            if (isNaN(lat)) lat = 23.450357;
            if (isNaN(lon)) lon = 113.494604;

            return {
              name: item.name || '未知地点', // 地点名称兜底
              lat: lat,
              lon: lon,
              iconPath: item.iconPath // 提取图片路径
            };
          });

          // 过滤掉无效地点（避免生成无效标记点）
          const validCloudPlaces = cloudPlaces.filter(item => {
            return !isNaN(item.lat) && !isNaN(item.lon) && item.name;
          });

          // 生成合法的地图标记点（解决MarkerStyle/position无效问题）
          const markers = validCloudPlaces.map((item, index) => ({
            id: index + 1, // 唯一ID，必填
            latitude: item.lat, // 有效数字纬度，必填
            longitude: item.lon, // 有效数字经度，必填
            iconPath: item.iconPath || "/images/default-poi.png", // 图片兜底，避免无效路径
            width: 40, // 固定宽度，合法值
            height: 40, // 固定高度，合法值
            // 可选：添加标记点标题（鼠标点击时显示）
            title: item.name
          }));

          // 赋值数据
          that.setData({
            commonPlaces: validCloudPlaces,
            markers: markers
          });

          // 提示拉取成功（显示有效地点数量）
          wx.showToast({
            title: `成功加载${validCloudPlaces.length}个有效地点`,
            icon: 'success',
            duration: 1500
          });
        },
        fail: (err) => {
          console.error('云数据库拉取失败：', err);
          wx.showToast({
            title: '地点数据加载失败',
            icon: 'none',
            duration: 2000
          });
        }
      });
  },

  /**
   * 起点输入框输入事件
   */
  onStartInput(e) {
    this.setData({
      startInputVal: e.detail.value.trim()
    });
  },

  /**
   * 终点输入框输入事件
   */
  onEndInput(e) {
    this.setData({
      endInputVal: e.detail.value.trim()
    });
  },

  // 新增：选择出行方式
  selectMode(e) {
    this.setData({
      activeMode: e.currentTarget.dataset.type
    });
  },

  // 新增：选择规划类型
  selectPlan(e) {
    this.setData({
      activePlan: e.currentTarget.dataset.type
    });
  },

  /**
   * 确定按钮点击：匹配经纬度 + 计算距离 + 渲染起点→终点连线 + 新增路径规划
   */
  onConfirm() {
    const { startInputVal, endInputVal, commonPlaces, activeMode, activePlan, modeList, planList } = this.data;

    // 1. 校验输入是否为空
    if (!startInputVal || !endInputVal) {
      wx.showToast({
        title: '起点和终点不能为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 2. 匹配起点和终点经纬度
    const startPlace = commonPlaces.find(item => item.name === startInputVal);
    const endPlace = commonPlaces.find(item => item.name === endInputVal);

    // 3. 校验地点是否有效
    if (!startPlace) {
      wx.showToast({
        title: `未找到起点：${startInputVal}`,
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (!endPlace) {
      wx.showToast({
        title: `未找到终点：${endInputVal}`,
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 4. 保存起点、终点经纬度（关键：用于连线）
    const startLat = startPlace.lat;
    const startLon = startPlace.lon;
    const endLat = endPlace.lat;
    const endLon = endPlace.lon;

    this.setData({
      startLat,
      startLon,
      endLat,
      endLon,
      // 地图中心设为起点终点中间位置，方便查看完整连线
      centerLat: (startLat + endLat) / 2,
      centerLon: (startLon + endLon) / 2
    }, () => {
      // 5. 计算距离（原有功能保留）
      const distanceMeters = this.calculateDistance(startLat, startLon, endLat, endLon);
      let distanceText = '';
      if (distanceMeters < 1000) {
        distanceText = `${Math.round(distanceMeters)}米`;
      } else {
        distanceText = `${(distanceMeters / 1000).toFixed(1)}千米`;
      }

      // 6. 生成【起点→终点】连线（原有功能保留，优化配置）
      const polyline = [{
        points: [
          { longitude: startLon, latitude: startLat }, // 起点坐标
          { longitude: endLon, latitude: endLat }      // 终点坐标
        ],
        color: "#007AFF", // 蓝色连线
        width: 8,         // 线宽加大
        dottedLine: false, // 实线显示
        arrowLine: true,  // 显示箭头（明确方向）
        borderColor: "#FFFFFF", // 白色边框
        borderWidth: 2    // 边框宽度
      }];

      // 新增：7. 路径规划计算（最短时间/最少步行）
      // 7.1 出行方式速度配置（km/h）
      const speedMap = {
        walk: 5,    // 步行：5公里/小时
        ride: 15,   // 骑行：15公里/小时
        drive: 60   // 自驾：60公里/小时（城市道路估算）
      };
      // 7.2 获取当前选中的出行方式名称和速度
      const currentMode = modeList.find(item => item.type === activeMode);
      const currentPlan = planList.find(item => item.type === activePlan);
      const speed = speedMap[activeMode];
      // 7.3 计算预计时间
      const distanceKm = distanceMeters / 1000; // 转换为公里
      const timeHour = distanceKm / speed; // 小时
      let timeText = '';
      if (timeHour < 1) {
        timeText = `${Math.round(timeHour * 60)}分钟`; // 小于1小时显示分钟
      } else {
        timeText = `${timeHour.toFixed(1)}小时`; // 大于1小时显示小时
      }
      // 7.4 规划描述（根据规划类型生成）
      let desc = '';
      if (activePlan === 'minTime') {
        desc = `选择${currentMode.name}方式，预计耗时最短（${timeText}）`;
      } else {
        desc = `优先步行方式，步行距离最短（${distanceText}）`;
      }
      // 7.5 组装规划结果
      const planResult = {
        show: true,
        modeName: currentMode.name,
        planName: currentPlan.name,
        timeText: timeText,
        desc: desc
      };

      // 8. 更新所有数据（原有距离+连线 + 新增规划结果）
      this.setData({
        distance: distanceText,
        polyline: polyline,
        planResult: planResult // 新增规划结果
      });

      // 提示成功（同时显示距离）
      wx.showToast({
        title: `计算成功：${distanceText}`,
        icon: 'success',
        duration: 2000
      });
    });
  },

  /**
   * 球面距离计算（Haversine公式，原有功能保留）
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371000; // 地球半径（米）
    // 角度转弧度
    const radLat1 = lat1 * Math.PI / 180;
    const radLat2 = lat2 * Math.PI / 180;
    const radLon1 = lon1 * Math.PI / 180;
    const radLon2 = lon2 * Math.PI / 180;

    // 纬度差、经度差
    const deltaLat = radLat2 - radLat1;
    const deltaLon = radLon2 - radLon1;

    // Haversine公式核心
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(radLat1) * Math.cos(radLat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c; // 返回距离（米）
  }
});