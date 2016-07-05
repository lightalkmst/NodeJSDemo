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
      >> L.filter (h => h)
      >> L.map (h => h.split (' '))
      >> L.map (h => [h[0].split ('.'), h[2]])
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

// eval (fs.readFileSync ('common/fp_lib.js', 'utf8'))

/////////////
//         //
// ROUTING //
//         //
/////////////
var serve_file = x =>
  app.get ('/' + x, (req, resp) => {
    resp.writeHead (200, {'Content-Type': 'text/plain'})
    resp.write (fs.readFileSync ('frontend/' + x.split ('.') [1] + '/' + x))
    resp.end ()
  })

serve_file ('index.html')

app.listen (8080)
