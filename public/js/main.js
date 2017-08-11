const app = new Vue({
  el: '#app',
  data: {
    userId: '',
    datasets: [],
    dataset: null,
    annLoaded: false,
    images: [],
    imageIdx: 0,
    image: new Image(),
    drawingRect: null,
    drawPos: {x: 0, y: 0},
    zoom: 0,
    canvasOnImageRatio: null,
    mode: 'draw',
    mouseOverAnn: null,
    log: [],
  },
  computed: {
    drawRatio() {
      return Math.pow(0.6, this.zoom);
    },
    currentImage() {
      return (this.images || [])[this.imageIdx] || {url: null, anns: [], done: false};
    },
    anns() {
      return (this.currentImage || {}).anns || [];
    },
  },
  watch: {
    mouseOverAnn() {
      this.render();
    },
    dataset() {
      if (this.dataset) {
        const ds = this.dataset;
        axios.get(`/api/datasets/${this.dataset.name}`)
             .then((res) => {
               if (this.dataset === ds) {
                 this.images = res.data.map((d) => {
                   return {
                     url: d.url,
                     anns: [],
                     done: false,
                   };
                 });
                 this.imageIdx = 0;
                 this.image.src = this.images[this.imageIdx].url;
                 this.annLoaded = false;

                 axios.get(`/api/datasets/${this.dataset.name}/anns/${this.userId}`)
                      .then((res) => {
                        const annImages = res.data;
                        for (const annImage of annImages) {
                          const image = this.images.find(image => image.url === annImage.url);
                          if (image) {
                            image.anns = annImage.anns;
                            image.done = true;
                          }
                        }
                        this.addLog('loaded');
                        this.annLoaded = true;
                        this.render();
                      });
               }
             });
      }
    },
    imageIdx() {
      if (this.images && this.images[this.imageIdx]) {
        this.image.src = this.images[this.imageIdx].url;
      }
    },
  },
  methods: {
    selectDataset(dataset) {
      if (dataset && !this.userId.match(/^[a-z0-9_]+$/)) {
        alert('Please input your name.\nLower case alphabets, numbers and _ are allowed in the name.');
        return;
      }
      if (this.dataset && !dataset) {
        this.save();
      }
      this.dataset = dataset;
    },
    render() {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const imageWidth = this.image.width;
      const imageHeight = this.image.height;
      const mainCanvasEl = this.$refs.mainCanvas;
      const coi = this.canvasOnImageRatio = Math.min(windowWidth / imageWidth, (windowHeight - 200) / imageHeight);
      const canvasWidth = Math.max(1, imageWidth * coi | 0);
      const canvasHeight = Math.max(1, imageHeight * coi | 0);
      mainCanvasEl.width = canvasWidth;
      mainCanvasEl.height = canvasHeight;
      const ratio = this.drawRatio;
      const ctx = this.$refs.mainCanvas.getContext('2d');

      ctx.clearRect(0, 0, ctx.width, ctx.height);

      ctx.drawImage(
        this.image,
        this.drawPos.x * imageWidth,
        this.drawPos.y * imageHeight,
        this.image.width * ratio,
        this.image.height * ratio,
        0, 0, canvasWidth, canvasHeight
      );

      if (this.mode === 'remove') {
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalAlpha = 1;
      }

      for (const ann of this.anns) {
        const rect = ann.rect;
        ctx.strokeStyle = `hsl(${0}, 100%, 50%)`;
        ctx.lineWidth = 1;
        const x = (rect[0] - this.drawPos.x) * imageWidth * coi / ratio;
        const y = (rect[1] - this.drawPos.y) * imageHeight * coi / ratio;
        const w = (rect[2] - this.drawPos.x) * imageWidth * coi / ratio - x;
        const h = (rect[3] - this.drawPos.y) * imageHeight * coi / ratio - y;
        ctx.strokeRect(x, y, w, h);
        if (this.mode === 'remove' && ann === this.mouseOverAnn) {
          ctx.fillStyle = `hsla(${0}, 100%, 50%, 0.2)`;
          ctx.fillRect(x, y, w, h);
        }
      }

      if (this.drawingRect) {
        ctx.strokeStyle = `hsl(${0}, 100%, 50%)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          this.drawingRect.x1,
          this.drawingRect.y1,
          this.drawingRect.x2 - this.drawingRect.x1,
          this.drawingRect.y2 - this.drawingRect.y1
        );
      }
    },
    mouseMove(pos) {
      const ratio = this.drawRatio / this.canvasOnImageRatio;
      const x = pos.x * ratio / this.image.width + this.drawPos.x;
      const y = pos.y * ratio / this.image.height + this.drawPos.y;
      this.mouseOverAnn = null;
      for (const ann of this.anns) {
        const rect = ann.rect;
        if (rect[0] <= x && rect[1] <= y && x < rect[2] && y < rect[3]) {
          this.mouseOverAnn = ann;
        }
      }
    },
    click(pos) {
      if (this.mode === 'remove' && this.mouseOverAnn) {
        this.anns.splice(this.anns.indexOf(this.mouseOverAnn), 1);
        this.render();
      }
    },
    dragBegin(pos) {
      this.drawingRect = {x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y};
      this.render();
    },
    dragMove(pos) {
      this.drawingRect.x2 = pos.x;
      this.drawingRect.y2 = pos.y;
      this.render();
    },
    dragEnd(pos) {
      const da = this.drawingRect;
      const ratio = this.drawRatio / this.canvasOnImageRatio;
      if (da.x1 !== da.x2 && da.y1 !== da.y2) {
        this.anns.push({
          rect: [
            Math.min(da.x1, da.x2) * ratio / this.image.width + this.drawPos.x,
            Math.min(da.y1, da.y2) * ratio / this.image.height + this.drawPos.y,
            Math.max(da.x1, da.x2) * ratio / this.image.width + this.drawPos.x,
            Math.max(da.y1, da.y2) * ratio / this.image.height + this.drawPos.y
          ]
        });
      }
      this.drawingRect = null;
      this.render();
    },
    scroll(dpos) {
      this.drawPos.x += dpos.dx / this.$refs.mainCanvas.width * this.drawRatio;
      this.drawPos.y += dpos.dy / this.$refs.mainCanvas.height * this.drawRatio;
      this.clipDrawArea();
      this.render();
    },
    zoomIn() {
      const oldRatio = this.drawRatio;
      this.zoom += 1;
      this.drawPos.x -= (this.drawRatio - oldRatio) / 2;
      this.drawPos.y -= (this.drawRatio - oldRatio) / 2;
      this.render();
    },
    zoomOut() {
      const oldRatio = this.drawRatio;
      this.zoom = Math.max(0, this.zoom - 1);
      this.drawPos.x -= (this.drawRatio - oldRatio) / 2;
      this.drawPos.y -= (this.drawRatio - oldRatio) / 2;
      this.clipDrawArea();
      this.render();
    },
    clipDrawArea() {
      if (this.drawPos.x < 0) this.drawPos.x = 0;
      if (this.drawPos.y < 0) this.drawPos.y = 0;
      const w = this.$refs.mainCanvas.width / this.canvasOnImageRatio * this.drawRatio / this.image.width;
      const h = this.$refs.mainCanvas.height / this.canvasOnImageRatio * this.drawRatio / this.image.height;
      if (this.drawPos.x + w > 1) this.drawPos.x = 1 - w;
      if (this.drawPos.y + h > 1) this.drawPos.y = 1 - h;
    },
    setMode(mode) {
      this.mode = mode;
      this.render();
    },
    toggleDone() {
      this.currentImage.done = !this.currentImage.done;
    },
    prev() {
      if (this.anns.length > 0 && !this.currentImage.done) {
        if (!confirm('This image is annotated, but it is not DONE.')) {
          return;
        }
      }
      this.imageIdx = Math.max(0, this.imageIdx - 1);
      this.save();
    },
    next() {
      if (this.anns.length > 0 && !this.currentImage.done) {
        if (!confirm('This image is annotated, but it is not DONE.')) {
          return;
        }
      }
      this.imageIdx = Math.min(this.images.length - 1, this.imageIdx + 1);
      this.save();
    },
    save() {
      if (!this.annLoaded) {
        return;
      }

      const data = [];
      for (const image of this.images) {
        if (image.done) {
          data.push({
            url: image.url,
            anns: image.anns
          });
        }
      }
      axios.put(
        `/api/datasets/${this.dataset.name}/anns/${this.userId}`,
        data
      ).then((res) => {
        this.addLog('saved');
      });
    },
    addLog(message) {
      const d = new Date();
      this.log.unshift(`[${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}]${message}`);
      this.log.splice(4, 1);
    },
  },
  mounted() {
    axios.get('/api/datasets')
         .then((res) => {
           this.datasets = res.data;
         });

    window.addEventListener(
      'resize',
      _.throttle(this.render, 100));
    listenCanvas(
      this.$refs.mainCanvas,
      this.mouseMove,
      this.click,
      this.dragBegin,
      this.dragMove,
      this.dragEnd,
      this.scroll
    );
    this.render();
    //this.image.src='http://www.html5.jp/canvas/img/drawImage1.png';
    this.image.onload = () => {
      this.render();
    };
  }
});

function listenCanvas(el, move, click, dragBegin, dragMove, dragEnd, scroll) {
  let state = 0;
  function getLocation(e) {
    const rect = el.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  window.addEventListener('mousedown', (e) => {
    if (e.target === el) {
      state = 1;
      dragBegin(getLocation(e));
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (state === 1) {
      state = 0;
      dragEnd(getLocation(e));
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (state === 1) {
      dragMove(getLocation(e));
    } else {
      move(getLocation(e));
    }
  });
  window.addEventListener('click', (e) => {
    if (e.target === el) {
      click(getLocation(e));
    }
  });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    scroll(Object.assign(getLocation(e), {
      dx: e.deltaX,
      dy: e.deltaY
    }));
  });
}
