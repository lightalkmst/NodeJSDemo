// global variable scope
var env = {}

// get config from server
var cfg = {}
$.ajax ({
    url: '/cfg',
    success: data => cfg = data,
    async: false
})

// angular 2
;(app => {
  document.addEventListener ('DOMContentLoaded', () => {
    ng.platformBrowserDynamic.bootstrap (app.AppComponent)
  })
}) (window.app || (window.app = {}))

;(function(app) {
  app.AppComponent =
    ng.core.Component({
      selector: 'my-app',
      template: '<h1>My First Angular 2 App</h1>'
    })
    .Class({
      constructor: function() {}
    });
})(window.app || (window.app = {}));
