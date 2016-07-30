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
    F.p (fs.readFileSync ('properties.cfg', 'utf8')) (
      (x => x.split ('\n'))
      >> L.filter (F.id)
      >> L.filter (h => h[0] != '#')
      >> L.map (h => {
        var i = h.indexOf ('=')
        return [S.substr (h) (0) (i), S.substr (h) (i + 1) (-1)]
      })
      >> L.map (L.map (S.trim))
      >> L.map (h => [S.split (h [0]) ('.'), h [1]])
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

var min_for_prod = x => cfg.prod ? x : x.replace (/\.min\./, '.')

var is_for_env = F.c () (F.swap (S.contains) ('.min') >> F['=='] (cfg.prod))

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

var all = rest ('all')

//////////////
//          //
// REST API //
//          //
//////////////

var env = {}
//
// New stuff goes here
// v v v

// inject/eval stuff here

// ^ ^ ^
// New stuff goes here
//

//////////////////
//              //
// FILE SERVING //
//              //
//////////////////

var does_not_exist = (() => {
  var file = fs.readFileSync ('frontend/html/404.html')
  return (req, resp) => {
    log ('Attempted to access nonexistent resource ' + req.url)
    write (resp) (404, 'html', file)
  }
}) ()

// coalesce and serve all app files in a single request, making sure chosen file is first
L.iter (h => {
  var name = h[0]
  var dir = h[1]
  var first = L.map (min_for_prod) (h[2])
  var last = L.map (min_for_prod) (h[3])
  var js = ''
  fs.readdir (dir, (e, data) =>
    js = F.p (data) (
      L.filter (is_for_env)
      >> L.filter (h => L.forall (F['<>'] (h)) (first))
      >> L.filter (h => L.forall (F['<>'] (h)) (last))
      >> (l => [...first, ...l, ...last])
      >> L.map (h => fs.readFileSync (dir + h, 'utf8'))
      >> L.reduce (a => h => a + ';' + h)
    )
  )
  get (name) ((req, resp) => write (resp) (200, 'js', js))
}) ([
  ['common.js', 'common/', ['fp_lib.js'], []],
  ['app.js', 'frontend/js/', ['app.js'], []],
])

// serve all other requested files
L.iter (h => {
  get ('*.' + h) ((req, resp) => {
    // check root and frontend folders
    // use F.before() to enable async
    var dirs = ['frontend/' + h, '.']
    var pass = F.before (1) (x => write (resp) (200, h, x))
    var fail = F.after (L.length (dirs)) (() => does_not_exist (req, resp))
    L.iter (h => fs.readFile (h + req.url, (e, data) =>
      !e
      ? pass (data)
      : fail ()
    )) (dirs)
  })
}) (['js', 'html', 'css', 'js.map'])

// serve config
get ('cfg') ((req, resp) => write (resp) (200, 'plain', JSON.stringify (cfg.frontend || {})))

// set root address to index.html
get ('') ((req, resp) =>
  fs.readFile (min_for_prod ('frontend/html/index.html'), (e, data) =>
    !e
    ? write (resp) (200, 'html', data)
    : does_not_exist (req, resp)
  )
)

get ('*') (does_not_exist)

app.listen (8080)
log ('Server is ready')
