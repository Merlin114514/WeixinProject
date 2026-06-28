export default class WxCanvas {
    constructor(canvasId, ctx, rect) {
      this.canvasId = canvasId;
      this.ctx = ctx;
      this.rect = rect;
      this.chart = null;
    }
  
    setChart(chart) {
      this.chart = chart;
    }
  
    getContext(contextType) {
      if (contextType === '2d') {
        return this.ctx || wx.createCanvasContext(this.canvasId);
      }
    }
  
    canvasToTempFilePath(opt) {
      if (this.ctx) {
        opt.canvas = this.ctx.canvas;
      } else {
        opt.canvasId = this.canvasId;
      }
      return wx.canvasToTempFilePath(opt, this.rect);
    }
  
    getBoundingClientRect() {
      return this.rect;
    }
  }