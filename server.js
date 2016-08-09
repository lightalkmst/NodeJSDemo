/////////////
//         //
// FORKING //
//         //
/////////////
var cluster = require ('cluster')

var log = x => console.log ('main (' + (cluster.isMaster ? 'm' : cluster.worker.id) + '): ' + x)

if (cluster.isMaster) {
  var cpuCount = require ('os').cpus ().length
  for (var i = 0; i < cpuCount; i++) cluster.fork ()

  cluster.on ('exit', p => {
    log ('Process ' + p.id + ' died')
    cluster.fork ()
    log ('New process started')
  })
}
else {
  ////////////////
  //            //
  // INITIALIZE //
  //            //
  ////////////////

  var http = require ('http')
  var fs = require ('fs')

  var express = require ('express') ()

  var request = require ('request')

  // my libraries
  var fp_lib = 'common/fp_lib.js'
  eval (fs.readFileSync (fp_lib, 'utf8'))

  var eval_dir = h =>
    F.p (fs.readdirSync (h)) (
        L.map (F['+'] (h))
        >> L.filter (F['!='] (fp_lib))
        >> L.map (h => fs.readFileSync (h, 'utf8'))
        // wrapper for eval required
        // operates on global scope if unwrapped
        >> L.iter (h => eval (h))
    )

  eval_dir ('common/')

  eval ('var cfg = ' + fs.readFileSync ('properties.cfg', 'utf8'))

  var mysql = require ('mysql').createConnection (cfg.db)

  //////////////////
  //              //
  // DEPENDENCIES //
  //              //
  //////////////////

  var min_for_prod = x => cfg.prod ? x : x.replace (/\.min\./, '.')

  var is_min = F.swap (S.contains) ('.min')

  var is_for_env = F.c () (is_min >> F['=='] (cfg.prod))

  /////////////
  //         //
  // ROUTING //
  //         //
  /////////////

  var get_header = x => ({
    'Content-Type': 'text/' + {
      css: 'css',
      html: 'html',
      js: 'javascript',
      'js.map': 'plain',
      plain: 'plain',
    } [x],
    'Expires': new Date ().toUTCString (),
  })

  var write = resp => (...r) => {
    resp.writeHead (r [0], get_header (r [1]))
    resp.write (r [2])
    resp.end ()
  }

  var rest = m => x => f => express [m] ('/' + x, f)

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

  eval_dir ('backend/')

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

  // coalesce and serve all app files in bundles, making sure chosen files are first and last
  L.iter (h => {
    var name = h[0]
    var dir = h[1]
    var first = L.map (min_for_prod) (h[2])
    var last = L.map (min_for_prod) (h[3])
    var js = ''
    fs.readdir (dir, (e, data) =>
      js = F.p (data) (
        L.filter (is_for_env)
        >> L.filter (h => L.forall (F['!='] (h)) (first))
        >> L.filter (h => L.forall (F['!='] (h)) (last))
        >> (l => [... first, ... l, ... last])
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
      var dirs = ['frontend/' + h, '.']
      var pass = F.before (1) (x => write (resp) (200, h, x))
      var fail = F.after (L.length (dirs)) (() => does_not_exist (req, resp))
      L.iter (h => fs.readFile (h + req.url, (e, data) =>
        !e
        ? pass (data)
        : fail ()
      )) (dirs)
    })
  }) (['js', 'html', 'css', 'js.map', 'jpg'])

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

  express.listen (cfg.port)
  log ('Server is ready')
}
