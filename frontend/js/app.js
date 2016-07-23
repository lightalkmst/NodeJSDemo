// angular 2
(function(app) {
  app.AppComponent =
    ng.core.Component({
      selector: 'my-app',
      template: '<h1>My First Angular 2 App</h1>'
    })
    .Class({
      constructor: function() {}
    });
})(window.app || (window.app = {}));
(app => {
  document.addEventListener ('DOMContentLoaded', () => {
    ng.platformBrowserDynamic.bootstrap (app.AppComponent)
  })
}) (window.app || (window.app = {}))

// angular 1
// angular.module ('app', [
//   'ngRoute',
// ])
//   .config ([
//     '$routeProvider',
//     ($routeProvider) => {
//       $.get ('/js_file_list', data => {
//         F.p (data.split ('\n')) (
//           L.filter (F.id)
//           >> L.filter (h => h.includes ('_st_ctrl.js'))
//           >> L.map (h => h.slice (0, h.indexOf ('_st_ctrl.js')))
//           >> L.iter (h => {
//             $routeProvider.when ('/' + h, {
//               templateUrl: h + '.html',
//               controller: h + '_st_ctrl',
//             })
//           })
//         )
//       })
//     }
//   ])
