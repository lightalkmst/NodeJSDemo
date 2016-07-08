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
      >> L.map (h => [h[0].split ('.'), h[1]])
      >> L.iter (h => {
        var k = h[0].pop ()
        var cfg =
          L.fold (a => h =>
            a[h] == undefined
            ? a[h] = {}
            : a[h]
          ) (ans) (h[0])
        cfg[k] = eval (h[1])
      })
    )
    return ans
  }, _ => ({}))

//////////////////
//              //
// DEPENDENCIES //
//              //
//////////////////
var dl_file = file => src => request (src).pipe (fs.createWriteStream (file))

dl_file ('frontend/js/angular.js') ('https://code.angularjs.org/' + cfg.ng_vers + '/angular.min.js')

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
}

var rest = r => x => (f, g) => {
  app [r] ('/' + x, (req, resp) =>
    F.try (true, _ => {
      var r = f (req, resp)
      resp.writeHead (r[0], headers[r[1]] ())
      resp.write (r[2])
      resp.end ()
    }, _ => {
      log ('Failed to serve request ' + req.url)
      resp.writeHead (500, headers.html ())
      resp.write ('<span style="font-size: 20">500 Internal Server Error</span>')
      resp.end ()
    })
  )
}

var get_rest = rest ('get')

var post_rest = rest ('post')

var put_rest = rest ('put')

var del_rest = rest ('delete')

//////////////
//          //
// HANDLERS //
//          //
//////////////
var does_not_exist = (req, resp) => {
  log ('Failed attempt to access nonexistent resource ' + req.url)
  return [404, 'html', '<span style="font-size: 20">404 Page Does Not Exist</span>']
}

get_rest ('*.js') ((req, resp) =>
  F.try (false, _ =>
    [200, 'js', fs.readFileSync ('common' + req.url)]
  , _ =>
    [200, 'js', fs.readFileSync ('frontend/js' + req.url)]
  , _ =>
    does_not_exist (req, resp)
  )
)

get_rest ('*') (does_not_exist)

app.listen (8080)
log ('Server is ready')
