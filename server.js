const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const app = new Koa();
const router = new Router();
const datasets = require('./datasets');
const store = require('./inMemoryStore');


app.use(bodyParser());

router
  .get('/api/datasets', function(ctx, next) {
    ctx.body = Object.keys(datasets).map((name) => {
      return {
        name: name
      };
    });
  })
  .get('/api/datasets/:name', function(ctx, next) {
    ctx.body = datasets[ctx.params.name].map((url) => {
      return {
        url: url,
      };
    });
  })
  .get('/api/datasets/:name/anns/:userId', function(ctx, next) {
    ctx.body = store.load(ctx.params.name);
  })
  .put('/api/datasets/:name/anns/:userId', function(ctx, next) {
    console.log(ctx.request.body);
    //store.save(ctx.params.name, ctx.request.body);
    ctx.body = {ok: true};
  })
  .get('/dataset/:name', function(ctx, next) {
    ctx.body = ctx.params.name;
  });

app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(require('koa-static')('./public'));


app.listen(3000);
