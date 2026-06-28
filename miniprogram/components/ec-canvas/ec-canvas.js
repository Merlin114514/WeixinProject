import * as echarts from './echarts';

Component({
  // 新增页面路径兼容，解决__route__未定义
  pageLifetimes: {
    show() {
      this.setData({
        pageRoute: getCurrentPages()[getCurrentPages().length - 1].route
      });
    }
  },

  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas-default'
    },
    width: {
      type: Number,
      value: 375
    },
    height: {
      type: Number,
      value: 400
    },
    option: {
      type: Object,
      value: {}
    }
  },

  data: {
    pageRoute: '' // 缓存页面路径，避免__route__未定义
  },

  methods: {
    init() {
      // 兜底：若当前组件上下文异常，用全局方式创建canvas
      const canvasContext = wx.createCanvasContext(
        this.data.canvasId, 
        this.data.pageRoute ? null : this
      );
      
      const canvas = {
        canvasId: this.data.canvasId,
        width: this.data.width,
        height: this.data.height,
        ctx: canvasContext,
        getContext: function (contextType) {
          return contextType === '2d' ? this.ctx : null;
        },
        setChart: function (chart) {
          this.chart = chart;
        }
      };

      // 初始化ECharts（强制适配小程序环境）
      const chart = echarts.init(canvas, null, {
        width: this.data.width,
        height: this.data.height,
        devicePixelRatio: wx.getSystemInfoSync().pixelRatio,
        // 禁用所有浏览器相关API，彻底杜绝addEventListener错误
        renderer: 'canvas',
        useDirtyRect: false
      });
      canvas.setChart(chart);

      if (this.data.option && Object.keys(this.data.option).length > 0) {
        chart.setOption(this.data.option);
      }

      this.chart = chart;
      return chart;
    }
  }
});