var F = {
  /////////////
  //         //
  //  Basic  //
  //         //
  /////////////

	e: {},

  // 'a -> 'a
  id: x => x,

  // 'a -> unit -> 'a
  const: x => _ => x,

  // 'a -> unit
  noop: _ => undefined,

	// ('a -> 'b) -> unit
	exec: f => f (),

  // bool -> unit
  ex_if: x => {if (x) throw F.e},

  // yes, i know it's weak equality
  '=': x => y => x == y,
  '==': x => y => x == y,

  '===': x => y => x === y,

  '!=': x => y => x != y,
  '<>': x => y => x != y,

  '!==': x => y => x !== y,

  '!': x => ! x,
  '~': x => ! x,

  '+': x => y => x + y,

  '-': x => y => x - y,

  '*': x => y => x * y,

  '/': x => y => x / y,

  '%': x => y => x % y,

  '|': x => y => x | y,

  '||': x => y => x || y,

  '&': x => y => x & y,

  '&&': x => y => x && y,

  '^': x => y => x ^ y,

  '|>': x => f => f (x),
  '@@': x => f => f (x),

  '<|': f => x => f (x),

  '>>': f => g => x => f (g (x)),

  '<<': f => g => x => g (f (x)),

  /////////////////
  //             //
  //  Functions  //
  //             //
  /////////////////

	// ('a -> bool) -> ('a -> bool)
	neg: f => (...x) => ! f (...x),

	// (unit -> 'a) -> 'a
  try: (p, ...fs) => {
    var f = fs.shift()
    try {
      return f ()
    }
    catch (e) {
      if (p) {
        console.log (e)
      }
      return fs[0] ? F.try (p, ...fs) : undefined
    }
  },

  // (a' -> 'b -> 'c) -> 'b -> 'a -> 'c
  swap: f => x => y => f (y) (x),

  // int -> ('a -> 'b) -> unit
  delay: t => f => setTimeout (t, f),

  // ('a -> 'b) -> 'a -> 'a
  tap: f => x => (f (x), x),

  // note: all composition functions here are reverse composition

  // if JavaScript had operator overloading, i'd happily
  // use that and type it properly as
  // ('a -> 'b) -> ('b -> 'c) -> 'a -> 'c
  // but without an infix operator, it'd be verbose non-variadic
  rcomp: (...fs) => F.swap (L.fold (F['|>'])) (fs),

  // alternatively this operator overloading hack that i lifted from:
  // http://scott.sauyet.com/Javascript/Talk/Compose/2013-05-22/#slide-33
  c: _ => {
    var fs = []
    var valueOf = Function.prototype.valueOf
    Function.prototype.valueOf = function () {
      fs.push (this)
      return 1
    }
    return _ => {
      Function.prototype.valueOf = valueOf
			return F.rcomp (...fs)
    }
  },

  // adaptation of above
  p: x => {
  	var fs = []
    var valueOf = Function.prototype.valueOf
    Function.prototype.valueOf = function () {
      fs.push (this)
      return 1
    }
    return _ => {
      Function.prototype.valueOf = valueOf
			return F.rcomp (...fs) (x)
    }
  },

  // ('a -> 'b) -> ('a -> 'b)
  memoize: f => {
    var memo = {}
    return x => memo[x] == undefined ? memo[x] = f (x) : memo[x]
  },

  // int -> (unit -> unit) -> unit
  times: x => f => {for (var n = 0; n < x; n++) f ()},

	//
	after: n => f => (...args) => n != 1 ? (n--, undefined) : f (...args),

	//
	before: n => f => (...args) => n != 1 ? undefined : (n--, f (...args)),
}

var L = {
  /////////////
  //         //
  //  Lists  //
  //         //
  /////////////

	// all functions assume dense 0-indexed arrays

  // 'a -> 'a list -> 'a list
  cons: h => l => [h, ...l],

  // 'a list -> 'a
	head: l => F.ex_if (L.isEmpty (l)) || l[0],

  // 'a list -> 'a list
	tail: l => F.ex_if (L.isEmpty (l)) || l.slice (1),

  // 'a list -> int
  length: l => l.length,

  // 'a list -> bool
	isEmpty: l => l.length == 0,

  // int -> 'a list -> 'a
  nth: n => l => F.ex_if (n >= L.length (l)) || l[n],

  // int -> int -> int list
  range: x => y => {
  	var ans = []
    for (var n = x; n <= y; n++) ans.push (n)
    return ans
  },

  // int -> 'a -> 'a list
  create: n => x => L.init (n) (_ => x),

  // int -> (int -> 'a) -> 'a list
  init: n => f => L.map (f) (L.range (n)),

  // 'a list -> 'a list
  clone: l => l.concat (),

  // 'a list -> 'a list
  rev: l => L.clone (l).reverse (),

  // ('a -> unit) -> 'a list -> unit
  iter: f => L.iteri (_ => f),

  // (int -> 'a -> unit) -> 'a list -> unit
  iteri: f => l => {for (var i in l) f (i) (l[i])},

  // ('a -> 'b -> 'a) -> 'a -> 'b list -> 'a
	fold: f => a => l => (L.iter (h => a = f (a) (h)) (l), a),

  // ('a -> 'a -> 'a) -> 'a list -> 'a
  reduce: f => l => L.fold (f) (L.head (l)) (L.tail (l)),

  // ('a -> 'b -> 'a) -> 'a -> 'b list -> 'a list
  scan: f => a => l => {
  	var ans = []
    ans.push (a)
    L.iter (h => ans.push (a = f (a) (h))) (l)
    return ans
  },

  // ('a -> 'b) -> 'a list -> 'b list
	map: f => l => l.map (f),

  // (int -> 'a -> 'b) -> 'a list -> 'b list
  mapi: f => l => {
  	var ans = []
    L.iteri (i => h => ans.push (f (i) (h)))
    return ans
  },

  // ('a -> bool) -> 'a list -> 'a
  find: f => l => F.ex_if (! L.contains (f) (l)) || l.find (f),

  // ('a -> bool) -> 'a list -> 'a list
  filter: f => l => l.filter (f),

  // ('a -> bool) -> 'a list -> bool
  forall: f => l => l.every (f),

  // ('a -> bool) -> 'a list -> bool
  exists: f => l => l.some (f),

  // 'a -> 'a list -> bool
  contains: x => l => l.includes (x),

  // 'a list -> 'a list
  sort: l => l.concat ().sort (),

  // ('a -> bool) -> 'a list -> ('a list * 'a list)
  partition: f => l => [L.filter (f) (l), L.filter (h => ! f (h)) (l)],

  // 'a list -> 'a list
  uniq: l => {
  	var ans = []
    L.iter (h => L.contains (h) (a) && ans.push (h)) (l)
    return ans
  },

  // ('a * 'b) list -> 'a list * 'b list
  unzip: l => {
  	var ans = [[], []]
    L.iter (h => {
    	ans[0].push (h[0])
      ans[1].push (h[1])
    })
    return ans
  },

  ///////////////
  //           //
  //  2 Lists  //
  //           //
  ///////////////

  // 'a list -> 'a list -> 'a list
  append: l1 => l2 => l1.concat (l2),

  // 'a list -> 'b list -> bool
  unequal_length: l1 => l2 => l1.length == l2.length,

  // (int -> 'a -> 'b -> unit) -> 'a list -> 'b list -> unit
  iteri2: f => l1 => l2 => {
  	F.ex_if (L.unequal_length (l1) (l2))
    for (var i in l1) {
    	f (i) (l1[i]) (l2[i])
    }
  },

  // ('a -> 'b -> unit) -> 'a list -> 'b list -> unit
  iter2: f => L.iteri2 (_ => f),

  // ('a -> 'b -> 'c -> 'a) -> 'a -> 'b list -> 'c list -> 'a
  fold2: f => a => l1 => l2 => {
    L.iter2 (h1 => h2 => a = f (a) (l1[i]) (l2[i]))
    return a
  },

  // (int -> 'a -> 'b -> 'c) -> 'a list -> 'b list -> 'c list
  mapi2: f => l1 => l2 => {
  	var ans = []
    L.iteri2 (i => h1 => h2 => ans.push (f (i) (h1) (h2))) (l1) (l2)
    return ans
  },

  // ('a -> 'b -> 'c) -> 'a list -> 'b list -> 'c list
  map2: f => L.mapi2 (_ => f),

  // ('a -> 'b -> bool) -> 'a list -> 'b list -> bool
  forall2: f => L.fold (a => h1 => h2 => a && f (h1) (h2)) (true),

  // ('a -> 'b -> bool) -> 'a list -> 'b list -> bool
  exists2: f => L.fold (a => h1 => h2 => a || f (h1) (h2)) (false),

  // 'a list -> 'b list -> ('a * 'b) list
  zip: l1 => l2 => {
    var ans = []
    L.iter2 (h1 => h2 => ans.push ([h1, h2])) (l1) (l2)
    return ans
  },
}

var M = {
	///////////
  //       //
  //  Map  //
  //       //
  ///////////

  // ('a, 'b) map -> bool
	isEmpty: m => m.keys ().length == 0,

  // ('a * 'b) list -> ('a * 'b) map
  create: l => {
  	var ans = {}
    L.iter (h => ans[h[0]] = h[1])
    return ans
  },

  // ('a, 'b) map -> 'a list
  keys: m => Object.keys (m),

  // ('a, 'b) map -> 'b list
  vals: m => {
  	var ans = []
    for (var k in m) {
    	ans.push (m[k])
    }
    return ans
  },

  // ('a, 'b) map -> ('a * 'b) list
  pairs: m => L.map (h => [h, m[h]]) (M.keys (m)),

  // ('a -> unit) -> ('b, 'a) map -> unit
  iter: f => m => {for (var k in m) f (m[k])},

  // ('a -> 'b -> unit) -> ('a, 'b) map -> unit
  iterk: f => m => {for (var i in m) f (k) (m[k])},

  // ('a -> 'b -> 'a) -> 'a -> ('c, 'b) list -> 'a
	fold: f => a => m => (L.iter (h => a = f (a) (h)) (M.vals (m)), a),

  // ('a -> 'a -> 'a) -> ('b, 'a) map -> 'a
  reduce: f => m => L.fold (f) (L.head (M.keys (m))) (L.tail (M.keys (m))),

  // ('a -> 'b -> 'a) -> 'a -> ('c, 'b) map -> 'a list
  scan: f => a => m => {
  	var ans = []
    ans.push (a)
    L.iter (h => ans.push (a = f (a) (h))) (M.vals (m))
    return ans
  },

  // ('a -> 'b -> 'c) -> ('a, 'b) map -> ('a, 'c) map
  mapk: f => m => {
  	var ans = {}
    for (var k in m) ans[k] = f (k) (m[k])
    return ans
  },

  // ('a -> 'b) -> ('c, 'a) map -> ('c, 'b) map
	map: f => m => {
  	var ans = {}
  	M.iterk (k => v => ans[k] = f (m[v])) (m)
    return ans
  },

  // ('a -> bool) -> ('b, 'a) map -> 'a
  find: f => m => F.ex_if (! L.contains (f) (M.vals (m))) || L.find (f) (M.vals (m)),

  // ('a -> bool) -> 'a list -> 'a list
  filter: f => m => {
  	var ans = {}
  	M.iterk (k => v => {if (f (k) (v)) ans[k] = m[v]}) (m)
    return ans
  },

  // ('a -> bool) -> ('b, 'a) map -> bool
  forall: f => m => L.forall (f) (M.vals (m)),

  // ('a -> bool) -> ('b, 'a) map -> bool
  exists: f => m => L.exists (f) (M.vals (m)),

  // 'a -> ('b, 'a) map -> bool
  contains: x => m => L.contains (x) (M.vals (m)),

  // ('a, 'b) map -> int
  length: m => L.length (M.keys (m)),

  // ('a -> bool) -> ('b, 'a) map -> (('b, 'a) map * ('b, 'a) map)
  partition: f => m => [M.filter (f) (m), M.filter (h => ! f (h)) (m)],

  // 'a -> ('a, 'b) map -> 'b list
  pluck: x => m => L.map (h => m[h]) (M.keys (m)),
}

var S = {
	// string -> int
	length: s => s.length,

	// int -> string -> string
	get: n => s => s[n],

	// int -> int -> string -> string
	substr: x => y => s => s.substring (x, y > -1 ? y : y + 1 + S.length (s)),

	concat: (...s) => L.fold (F['+']) ('') (...s),

	// string -> string -> int
	index: s1 => s2 => s1.indexOf (s2),

	// string -> string -> bool
	contains: s1 => s2 => s1.includes (s2),

	// string -> string -> int
	compare: s1 => s2 => s1.localeCompare (s2),

	// string -> regex -> string array
	match: s => r => s.match (r),

	// string -> regex -> string -> string
	replace: s1 => r => s2 => s1.replace (r, s2),

	// string -> string -> int
	rindex: s1 => s2 => s1.lastIndexOf (s2),

	// string -> regex -> int
	search: s => r => s.search (r),

	// string -> string/regex -> string array
	split: s => r => s.split (r),

	// string -> string
	lower: s => s.toLocaleLowerCase (),

	// string -> string
	upper: s => s.toLocaleUpperCase (),

	// string -> string
	trim: s => s.trim (),
}
