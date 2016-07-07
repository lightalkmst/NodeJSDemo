var http = require ('http')
var fs = require ('fs')

var express = require ('express')
var app = express ()

// my library
eval (fs.readFileSync ('common/fp_lib.js', 'utf8'))

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
  })

/////////////
//         //
// ROUTING //
//         //
/////////////
var get_file = x =>
  app.get ('/' + x, (req, resp) => {
    F.try (_ => {
      resp.writeHead (200, {'Content-Type': 'text/plain'})
      resp.write (fs.readFileSync ('frontend/' + x.split ('.') [1] + '/' + x))
      resp.end ()
    })
  })

var rest = r => x => f => {
  app [r] ('/' + x, (req, resp) => {
    F.try (_ => {
      resp.writeHead (200, {'Content-Type': 'text/plain'})
      resp.write (f (req, resp))
      resp.end ()
    })
  })
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

app.listen (8080)
