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

var create_component = x => m1 => m2 => {
  var html = ''
  m1.template || $.ajax ({
      url: '/' + x + '.html',
      success: data => html = data,
      async: false
  })
  return app[x] =
    ng.core.Component (M.extend (m1) ({
      selector: x,
      template: m1.template || html,
    }))
      .Class (M.extend (m2) ({
        constructor: m2.constructor != {}.constructor ? m2.constructor : [function () {}],
    }))
}

;(app => {
  ng.router.Routes (L.map (h => ({path: '/' + h, component: app[h], name: h})) (M.keys (app)))
    (create_component ('app') ({
      directives: [ng.router.ROUTER_DIRECTIVES],
      providers: [ng.router.ROUTER_PROVIDERS],
    }) ({}))

  ng.platformBrowserDynamic.bootstrap (app.app, [ng.router.ROUTER_PROVIDERS])
}) (window.app || (window.app = {}))
