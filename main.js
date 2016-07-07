var http = require ('http')
var fs = require ('fs')

var express = require ('express')
var app = express ()

var request = require ('request')

// my library
eval (fs.readFileSync ('common/fp_lib.js', 'utf8'))

var log = x => console.log ('main: ' + x)

////////////
//        //
// CONFIG //
//        //
////////////
var cfg =
  F.try (_ => {
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

/////////////
//         //
// ROUTING //
//         //
/////////////
var rest = r => x => (f, g) => {
  app [r] ('/' + x, (req, resp) => {
    F.try (_ => {
      resp.writeHead (200, {'Content-Type': 'text/plain'})
      resp.write (f (req, resp))
      resp.end ()
    }, g || (_ => {
      resp.writeHead (500, {'Content-Type': 'text/plain'})
      resp.write (undefined)
      resp.end ()
    }))
  })
}

var get_file = x => rest ('get') (x) (_ =>
  F.try (_ =>
    fs.readFileSync ('common/' + x)
  , _ =>
    fs.readFileSync ('frontend/' + x.split ('.') [1] + '/' + x)
  )
)

var get_rest = rest ('get')

var post_rest = rest ('post')

var put_rest = rest ('put')

var del_rest = rest ('delete')

//////////////
//          //
// HANDLERS //
//          //
//////////////
var host_file = file => src =>
  ! F.try (_ => fs.lstatSync (file).isFile (), _ => false)
  ? request (src).pipe (fs.createWriteStream (file))
  : undefined

host_file ('frontend/js/angular.js')
  ('https://ajax.googleapis.com/ajax/libs/angularjs/' + cfg.angular + '/angular.min.js')

get_file ('angular.js')

// get my library
// figure out where i can host it

get_file ('fp_lib.js')


app.listen (8080)
log ('Server is ready')
