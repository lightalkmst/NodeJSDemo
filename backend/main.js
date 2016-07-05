var http = require ('http')
// file system
var fs = require ('fs')

eval (fs.readFileSync ('../common/clib.js', 'utf8'))


////////////
//        //
// ROUTER //
//        //
////////////
http.createServer ((request, response) => {
  response.writeHead (200, {'Content-Type': 'text/plain'})
  response.write ('Hello World')
  response.end ()
})
  .listen (8888)
