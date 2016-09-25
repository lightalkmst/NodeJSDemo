/*
SUPPORTED FUNCTIONALITY (in order of implementation)

Functional programming library and library additions in /common
Logging
Clustering
MySQL connection pool and querying
Minification management for dev/prod environments
REST API subscription
User authentication and security with salt and pepper
Secured REST API subscription
Execution of code in /backend
JavaScript bundling
File serving
Config serving
Favicon serving
Root address redirection
Page Not Found handling

Bundled modules:
  fs (imported)
    file system operations
  F
    curried utility functions
  L
    curried array utility functions
  M
    curried object utility functions
  S
    curried string utility functions
  cluster (imported)
    process clustering
  http (imported)
    outbound http requests
  express/app/bodyParser (imported)
    REST API subscription
  request (imported)
    outbound http requests
  mysql (imported)
    MySQL connection pool and querying
  helmet (imported)
    security
  sessions (imported)
    client-side sessions
  crypto (imported)
    cryptography functions

Bundled functions/variables:
  cfg: map
    config object as defined in /properties.js
  eval_dir: string -> void
    calls eval on each file in the given directory
  get_logger: string -> string -> void
    prints to stdout the given filename and given message with the process id of the executing process
    intended use is to generate a file-specific logger by providing the first parameter to generate
  log: string -> void
    intended to be shadowed on a file basis by partial application of get_logger
  min_for_prod: string -> string
    adds or removes '.min' from the input string to conform to the environment designated by cfg.prod
  is_min: string -> bool
    checks if the input contains '.min'
  is_for_env: string -> bool
    specifies if the input string contains '.min' in conformance to the environment designated by cfg.prod
  get_header: string -> map
    returns the html headers expected for the given type
  write: ExpressJS.response -> (int * string * string)
    renders the given status code and message body to the client
  rest: (string * ((ExpressJS.request, ExpressJS.response) -> void)) ->
      string -> ((ExpressJS.request, ExpressJS.response) -> void) -> void
    wrapper for ExpressJS subscribers
    not intended for external use
  get: string -> ((ExpressJS.request, ExpressJS.response) -> void) -> void
    subscribes GET handler for path
  post: string -> ((ExpressJS.request, ExpressJS.response) -> void) -> void
    subscribes POST handler for path
  put: string -> ((ExpressJS.request, ExpressJS.response) -> void) -> void
    subscribes PUT handler for path
  del: string -> ((ExpressJS.request, ExpressJS.response) -> void) -> void
    subscribes DELETE handler for path
  all: string -> ((ExpressJS.request, ExpressJS.response) -> void) -> void
    subscribes handler for path for all types
  get_hash: string -> string -> string -> string
    returns the hash of the input
  set_register_handler: ((ExpressJS.request, ExpressJS.response) -> void) -> void
    uses the given handler on successful registration requests
  set_user_regex: regex -> void
    sets the username filter to the input regex
  set_login_handler: ((ExpressJS.request, ExpressJS.response) -> void) -> void
    uses the given handler on successful login requests
  set_logout_handler:((ExpressJS.request, ExpressJS.response) -> void) -> void
    uses the given handler on successful logout requests
  sec_get: string -> ((ExpressJS.request, ExpressJS.response) -> void) ->
      ((ExpressJS.request, ExpressJS.response) -> bool) -> void
    subscribes secured GET handler for path using the given predicate
  sec_post: string -> ((ExpressJS.request, ExpressJS.response) -> void) ->
      ((ExpressJS.request, ExpressJS.response) -> bool) -> void
    subscribes secured POST handler for path using the given predicate
  sec_put: string -> ((ExpressJS.request, ExpressJS.response) -> void) ->
      ((ExpressJS.request, ExpressJS.response) -> bool) -> void
    subscribes secured PUT handler for path using the given predicate
  sec_del: string -> ((ExpressJS.request, ExpressJS.response) -> void) ->
      ((ExpressJS.request, ExpressJS.response) -> bool) -> void
    subscribes secured DELETE handler for path using the given predicate
  sec_all: string -> ((ExpressJS.request, ExpressJS.response) -> void) ->
      ((ExpressJS.request, ExpressJS.response) -> bool) -> void
    subscribes secured handler for path for all types using the given predicate
  does_not_exit: ((ExpressJS.request, ExpressJS.response) -> void)
    renders 404.html to the client and logs the attempt

Bundled REST API:
  POST /register {user: string, pass: string}
  POST /login {user: string, pass: string}
  GET /logout

*/

////////////////
//            //
// INITIALIZE //
//            //
////////////////

var fs = require ('fs')

// my libraries
var fp_lib = 'common/fp_lib.js'
eval (fs.readFileSync (fp_lib, 'utf8'))

// config
var cfg = eval ('({' + fs.readFileSync ('properties.js', 'utf8') + '})')

var eval_dir = h =>
  F.p (fs.readdirSync (h)) (
      L.map (F['+'] (h))
      >> L.filter (F['!='] (fp_lib))
      >> L.map (h => fs.readFileSync (h, 'utf8'))
      >> L.fold (a => h => a + ';' + h) ('')
      >> F.eval
  )

/////////////
//         //
// FORKING //
//         //
/////////////
var cluster = require ('cluster')

var get_logger = file => x =>
  console.log (
    file + ' (' + (cluster.worker || {id: 'm'}).id + '): '
    + (typeof x == 'object' ? JSON.stringify (x) : x)
  )

var log = get_logger ('server.js')

if (cluster.isMaster) {
  var cpuCount = require ('os').cpus ().length
  for (var i = 0; i < cpuCount; i++) cluster.fork ()

  cluster.on ('exit', p => {
    log ('Process ' + p.id + ' died')
    cfg.prod && cluster.fork ()
    cfg.prod && log ('New process started')
  })
}
else {
  ////////////////
  //            //
  // INITIALIZE //
  //            //
  ////////////////

  var http = require ('http')

  var express = require ('express')
  var app = express ()
  var bodyParser = require ('body-parser')
  app.use (bodyParser.urlencoded ({extended: false}))
  app.use (bodyParser.json ())

  var request = require ('request')

  cfg.db = M.extend ({
    host: 'localhost',
    user: 'root',
    pass: '',
    database: 'mydb',
    multipleStatements: true,
  }) (cfg.db)

  var mysql = require ('mysql').createPool (cfg.db)

  //////////////////
  //              //
  // DEPENDENCIES //
  //              //
  //////////////////

  var min_for_prod = x => cfg.prod ? x : S.replace (/\.min\./) ('.') (x)

  var is_min = F.swap (S.contains) ('.min')

  var is_for_env = F.c () (is_min >> F['=='] (cfg.prod))

  eval_dir ('common/')

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

  var write = res => (...r) => {
    res.writeHead (r[0], get_header (r[1]))
    res.write (r[2])
    res.end ()
  }

  var rest = m => x => f => app[m] ('/' + x, f)

  var get = rest ('get')

  var post = rest ('post')

  var put = rest ('put')

  var del = rest ('delete')

  var all = rest ('all')

  //////////////
  //          //
  // SECURITY //
  //          //
  //////////////

  var helmet = require ('helmet')
  app.use (helmet ())

  var sessions = require ('client-sessions')
  app.use (sessions ({
    cookieName: 'session',
    secret: cfg.sessioning_secret, // should be a large unguessable string
    duration: 24 * 60 * 60 * 1000,
    cookie: {
      path: '/',
      maxAge: 60 * 1000,
      ephemeral: false,
      httpOnly: true,
      // SSL only
      secure: cfg.prod,
    },
  }))

  var crypto = require ('crypto')
  var get_hash = (user, pass, salt) => {
    var hash = crypto.createHash (cfg.cred.hash)
    hash.update (user)
    hash.update (pass)
    hash.update (salt)
    hash.update (cfg.cred.key)
    return hash.digest ('hex')
  }

  // this block subscribes the registration API
  // this function sets the application-specific registration handler
  var [set_register_handler, set_user_regex] = (() => {
    var regex = /^.{0,255}$/
    // set user profile
    var handler = (req, res, id) => {
      req.session.user = req.body.user
      write (res) (200, 'plain', JSON.stringify ({success: true}))
    }
    post ('register') ((req, res) => {
      var user = req.body.user
      var fail = s => write (res) (200, 'plain', JSON.stringify ({success: false, reason: s}))
      if (! S.match (regex) (user)) return fail ('Invalid username')

      var salt = crypto.randomBytes (252).toString ('hex').slice (0, 252) + new Date ().getMilliseconds ()
      mysql.query (`
        INSERT INTO creds
        SET user = ?, pass = ?, salt = ?
        ;
        SELECT LAST_INSERT_ID ()
        AS id
      `, [
        user,
        get_hash (user, req.body.pass, salt),
        salt,
      ], (e, data) => {
        ! e
        ? handler (req, res, data[1][0].id)
        :
          e.code == 'ER_DUP_ENTRY'
          ? fail ('Username is already in use')
          : (
            log ('Registration for user: ' + user + ' failed with code: ' + e.code),
            fail ('Unknown error')
          )
      })
    })
    return [f => handler = f, r => regex = r]
  }) ()

  // this block subscribes the login API
  // this function sets the application-specific login handler
  var set_login_handler = (() => {
    // set user profile
    var handler = (req, res, data) => {
      req.session.user = req.body.user
      write (res) (200, 'plain', JSON.stringify ({success: true}))
    }
    post ('login') ((req, res) => {
      var user = req.body.user
      var fail = s => write (res) (200, 'plain', JSON.stringify ({success: false, reason: s}))
      mysql.query (`
        SELECT *
        FROM creds
        WHERE user = ?
      `, [
        user,
      ], (e, data) => {
        ! e
        ?
          data[0]
          ? (
            get_hash (user, req.body.pass, data[0].salt) == data[0].pass
            ? handler (req, res, data[0])
            : fail ('The username/password combination does not exist')
          )
          : fail ('The username/password combination does not exist')
        : (
          log ('Authentication for user: ' + user + ' failed with code: ' + e.code),
          fail ('Unknown error')
        )
      })
    })
    return f => handler = f
  }) ()

  // this block subscribes the logout API
  // this function sets the application-specific logout handler
  var set_logout_handler = (() => {
    var handler = (req, res) => write (res) (200, 'plain', 'true') // remove user profile
    get ('logout') ((req, res) => {
      delete req.session.user
      handler (req, res)
    })
    return f => handler = f
  }) ()

  // secured versions of REST subscribers
  var [sec_get, sec_post, sec_put, sec_del, sec_all] = (() => {
    var file = fs.readFileSync ('frontend/html/401.html')
    // wraps REST subscriber to take additional auth predicate and fail if not passed, otherwise identical
    return L.map (rest => path => pred => f =>
      rest (path) ((req, res) =>
        req.session && pred (req.session)
        ? f (req, res)
        : (
          log ('Unauthorized attempt to access resource ' + req.url + ' by user: ' + (req.session.user || '-')),
          write (res) (401, 'html', file)
        )
    )) ([get, post, put, del, all])
  }) ()

  //////////////
  //          //
  // REST API //
  //          //
  //////////////

  var env = {}
  eval_dir ('backend/')

  //////////////////
  //              //
  // FILE SERVING //
  //              //
  //////////////////

  var does_not_exist = (() => {
    var file = fs.readFileSync ('frontend/html/404.html')
    return (req, res) => {
      log ('Attempted to access nonexistent resource ' + req.url)
      write (res) (404, 'html', file)
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
    get (name) ((req, res) => write (res) (200, 'js', js))
  }) ([
    ['common.js', 'common/', ['fp_lib.js'], []],
    ['app.js', 'frontend/js/', ['app.js'], []],
  ])

  // serve all other requested files
  L.iter (h => {
    get ('*.' + h) ((req, res) => {
      // check root and frontend folders
      var dirs = ['frontend/' + h, '.']
      var pass = F.before (1) (x => write (res) (200, h, x))
      var fail = F.after (L.length (dirs)) (() => does_not_exist (req, res))
      L.iter (h => fs.readFile (h + req.url, (e, data) =>
        ! e
        ? pass (data)
        : fail ()
      )) (dirs)
    })
  }) (['js', 'html', 'css', 'js.map', 'jpg'])

  // serve config
  get ('cfg') ((req, res) => write (res) (200, 'plain', JSON.stringify (cfg.frontend || {})))

  // serve favorites icon
  get ('favicon.ico') ((() => {
    var file = fs.readFileSync ('frontend/jpg/logo.jpg')
    return (req, res) => write (res) (404, 'html', file)
  }) ())

  // set root address to index.html
  get ('') ((req, res) =>
    fs.readFile (min_for_prod ('frontend/html/index.html'), (e, data) =>
      ! e
      ? write (res) (200, 'html', data)
      : does_not_exist (req, res)
    )
  )

  get ('*') (does_not_exist)

  app.listen (cfg.port || 8080)
  log ('Server is ready')
}
