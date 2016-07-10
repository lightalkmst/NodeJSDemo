angular.module ('app', [
  'ngRoute',
])
  .config ([
    '$routeProvider',
    ($routeProvider) => {
      console.log ('routing')
      $.get ('/js_file_list', data => {
        F.p (data.split ('\n')) (
          L.filter (F.id)
          >> L.filter (h => h.includes ('_st_ctrl.js'))
          >> L.map (h => h.slice (0, h.indexOf ('_st_ctrl.js')))
          >> L.iter (h => {
            $routeProvider.when ('/' + h, {
              templateUrl: h + '.html',
              controller: h + '_st_ctrl',
            })
          })
        )
      })
    }
])

console.log (angular)
