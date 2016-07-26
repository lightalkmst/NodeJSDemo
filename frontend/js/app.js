// angular app space
var app = {}

// global variable scope
var env = {}

// get config from server
var cfg = {}
$.ajax ({
  url: '/cfg',
  success: data => cfg = data,
  async: false,
})

cfg.prod && ng.core.enableProdMode ()

var create_component = m1 => m2 => {
  var html = ''
  m1.template || $.ajax ({
      url: '/' + m1.selector + '.html',
      success: data => html = data,
      async: false
  })
  return ng.core.Component (M.extend (m1) ({template: m1.template || html}))
    .Class (M.extend (m2) ({
      constructor: m2.constructor != {}.constructor ? m2.constructor : [function () {}]
    }))
}

;(app => {
  app.my_app =
    ng.router.Routes (L.map (h => ({path: '/' + h, component: app[h], name: h})) (M.keys (app)))
      (create_component ({
        selector: 'router',
        directives: [ng.router.ROUTER_DIRECTIVES],
        providers: [ng.router.ROUTER_PROVIDERS],
      }) ({}))

  ng.platformBrowserDynamic.bootstrap (app.my_app, [ng.router.ROUTER_PROVIDERS])
}) (window.app || (window.app = {}))
