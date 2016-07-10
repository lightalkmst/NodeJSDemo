var http = require ('http')
var fs = require ('fs')

var express = require ('express')
var app = express ()

var request = require ('request')

var log = x => console.log ('main: ' + x)

// my library
eval (fs.readFileSync ('common/fp_lib.js', 'utf8'))

////////////
//        //
// CONFIG //
//        //
////////////
var cfg =
  F.try (true, _ => {
    var ans = {}
    F.p (fs.readFileSync ('main.cfg', 'utf8')) (
      (x => x.split ('\n'))
      >> L.filter (F.id)
      >> L.map (h => {
        var i = h.indexOf ('=')
        return [h.slice (0, i), h.slice (i + 1, -1)]
      })
      >> L.map (L.map (h => h.trim ()))
      >> L.map (h => [h [0].split ('.'), h [1]])
      >> L.iter (h => {
        var k = h [0].pop ()
        var cfg =
          L.fold (a => h =>
            a[h] == undefined
            ? a[h] = {}
            : a[h]
          ) (ans) (h [0])
        cfg[k] = eval (h [1])
      })
    )
    return ans
  }) || {}

//////////////////
//              //
// DEPENDENCIES //
//              //
//////////////////
var dl_file = file => src => request (src).pipe (fs.createWriteStream (file))

L.iter (h => dl_file (h [0]) (h [1])) ([[
  'frontend/js/angular.min.js',
  'https://code.angularjs.org/' + cfg.ng_vers + '/angular.min.js'
], [
  'frontend/js.map/angular.min.js.map',
  'https://code.angularjs.org/' + cfg.ng_vers + '/angular.min.js.map'
], [
  'frontend/js/angular-route.min.js',
  'https://code.angularjs.org/' + cfg.ng_vers + '/angular-route.min.js'
], [
  'frontend/js.map/angular-route.min.js.map',
  'https://code.angularjs.org/' + cfg.ng_vers + '/angular-route.min.js.map'
], [
  'frontend/js/jquery.min.js',
   'https://code.jquery.com/jquery-' + cfg.jq_vers + '.min.js'
]])

//
// New stuff goes here
// v v v



// ^ ^ ^
// New stuff goes here
//

/////////////
//         //
// ROUTING //
//         //
/////////////
var headers = {
  css: _ => ({
    'Content-Type': 'text/css',
    'Expires': new Date ().toUTCString ()
  }),
  html: _ => ({
    'Content-Type': 'text/html',
    'Expires': new Date ().toUTCString ()
  }),
  js: _ => ({
    'Content-Type': 'text/javascript',
    'Expires': new Date ().toUTCString ()
  }),
  'js.map': _ => ({
    'Content-Type': 'text/plain',
    'Expires': new Date ().toUTCString ()
  }),
  plain: _ => ({
    'Content-Type': 'text/plain',
    'Expires': new Date ().toUTCString ()
  }),
}

var write = resp => (...r) => {
  resp.writeHead (r [0], headers[r [1]] ())
  resp.write (r [2])
  resp.end ()
}

var rest = m => x => f => app [m] ('/' + x, f)

var get = rest ('get')

var post = rest ('post')

var put = rest ('put')

var del = rest ('delete')

//////////////
//          //
// REST API //
//          //
//////////////

get ('js_file_list') ((req, resp) => {
  var dirs = ['common/', 'frontend/js/']
  var files = ''
  var f = F.after (2) (_ => write (resp) (200, 'plain', files))
  L.iter (h =>
    fs.readdir (h, (e, data) => {
      files += L.reduce (F['+']) (L.map (h => h + '\n') (data))
      f ()
    })
  ) (dirs)
})

//
// New stuff goes here
// v v v



// ^ ^ ^
// New stuff goes here
//

//////////////////
//              //
// FILE SERVING //
//              //
//////////////////
var does_not_exist = (req, resp) => {
  log ('Failed attempt to access nonexistent resource ' + req.url)
  write (resp) (404, 'html', '<span style="font-size: 20">404 Page Does Not Exist</span>')
}

get ('*.js') ((req, resp) =>
  fs.readFile ('common' + req.url, (e, data) =>
    !e
    ? write (resp) (200, 'js', data)
    : fs.readFile ('frontend/js' + req.url, (e, data) =>
      !e
      ? write (resp) (200, 'js', data)
      : does_not_exist (req, resp)
    )
  )
)

L.iter (h =>
  get ('*.' + h) ((req, resp) =>
    fs.readFile ('frontend/' + h + req.url, (e, data) =>
      !e
      ? write (resp) (200, h, data)
      : does_not_exist (req, resp)
    )
  )
) (['html', 'css', 'js.map'])

get ('/') ((req, resp) =>
  fs.readFile ('frontend/html/index.html', (e, data) =>
    !e
    ? write (resp) (200, 'html', data)
    : does_not_exist (req, resp)
  )
)

get ('*') (does_not_exist)

app.listen (8080)
log ('Server is ready')
