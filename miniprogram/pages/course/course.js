Page({
    data: {
      currentWeek: 1,
      courseData: [],
      ec: {
        lazyLoad: true
      }
    },
  
    onReady() {
      this.ecComponent = this.selectComponent('#courseChart');
      this.getCourseData();
    },
  
    changeWeek(e) {
      const week = e.currentTarget.dataset.week;
      if (week < 1) return;
      this.setData({ currentWeek: week }, () => {
        this.getCourseData();
      });
    },
  
    getCourseData() {
      wx.showLoading({ title: '加载课表中...' });
      wx.cloud.callFunction({
        name: 'getMyCourse',
        data: { week: this.data.currentWeek },
        success: (res) => {
          wx.hideLoading();
          if (res.result && res.result.code === 200) {
            this.setData({ courseData: res.result.data });
            this.renderCourseChart();
          } else {
            wx.showToast({ title: res.result?.msg || '暂无课表数据', icon: 'none' });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({ title: '课表加载失败', icon: 'none' });
          console.error('云函数调用错误：', err);
        }
      });
    },
  
    renderCourseChart() {
      if (!this.ecComponent || this.data.courseData.length === 0) return;
  
      this.ecComponent.init((canvas, width, height, dpr) => {
        const echarts = this.ecComponent.echarts;
        const chart = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr
        });
        canvas.setChart(chart);
  
        const option = {
          grid: {
            left: 80,
            top: 40,
            right: 20,
            bottom: 20,
            containLabel: true
          },
          xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { fontSize: 14, color: '#333' }
          },
          yAxis: {
            type: 'category',
            data: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { fontSize: 14, color: '#333' }
          },
          series: [{
            type: 'custom',
            renderItem: (params, api) => {
              // 修正：匹配数据库的courselname字段
              const course = this.data.courseData.find(item => 
                item.day === params.dataIndex + 1 && 
                item.section.split('-')[0] == params.value
              );
              if (!course) return {};
  
              const x = api.coord([params.dataIndex, params.value])[0];
              const y = api.coord([params.dataIndex, params.value])[1];
              const sectionCount = course.section.split('-')[1] - course.section.split('-')[0] + 1;
  
              return {
                type: 'rect',
                shape: {
                  x: x - 40,
                  y: y - 10,
                  width: 80,
                  height: 20 * sectionCount
                },
                style: {
                  fill: '#409eff',
                  borderRadius: 4
                },
                label: {
                  show: true,
                  position: 'center',
                  // 修正：字段名改为courselname
                  formatter: `${course.courselname}\n${course.classroom}`,
                  fontSize: 12,
                  color: '#fff'
                }
              };
            },
            data: Array(7).fill().map(() => Array(10).fill(1))
          }]
        };
  
        chart.setOption(option);
        return chart;
      });
    }
  });