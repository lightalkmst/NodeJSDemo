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

var log = x =>
  console.log (
    'main (' + (cluster.worker || {id: 'm'}).id + '): '
    + (typeof x == 'object' ? JSON.stringify (x) : x)
  )

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

  // this block subscribes the registration API
  // this function sets the application-specific registration handler
  var [set_register_handler, set_user_regex] = (() => {
    var regex = /^.{0,255}$/
    // set user profile
    var handler = (req, res, id) => {
      req.session.user = req.body.user
      write (res) (200, 'plain', JSON.stringify ({success: true}))
    }
    get ('register') ((req, res) => {
      var user = req.body.user
      var fail = s => write (res) (200, 'plain', JSON.stringify ({success: false, reason: s}))
      if (! S.match (regex) (user)) return fail ('Invalid username')

      var hash = crypto.createHash (cfg.cred.hash)
      var salt = crypto.randomBytes (252) + new Date ().getMilliseconds ()
      hash.update (user)
      hash.update (req.body.pass)
      hash.update (salt)
      hash.update (cfg.cred.private_key)
      mysql.query (`
        INSERT INTO creds
        SET user = ?, pass = ?, salt = ?
        ;
        SELECT LAST_INSERT_ID ()
        AS id
      `, [
        user,
        hash.digest ('hex'),
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
    get ('login') ((req, res) => {
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
          ? (() => {
            var hash = crypto.createHash (cfg.cred.hash)
            hash.update (user)
            hash.update (req.body.pass)
            hash.update (data[0].salt)
            hash.update (cfg.cred.private_key)
            hash.digest ('hex') == data[0].pass
            ? handler (req, res, data[0])
            : fail ('The username/password combination does not exist')
          }) ()
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
  var logout = (() => {
    var handler = (req, res) => write (res) (200, 'plain', 'true') // set user profile
    get ('login') ((req, res) => {
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
