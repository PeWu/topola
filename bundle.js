var topola = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/tree-crawl/dist/tree-crawl.js
  var require_tree_crawl = __commonJS({
    "node_modules/tree-crawl/dist/tree-crawl.js"(exports, module) {
      (function(global, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.crawl = factory();
      })(exports, function() {
        "use strict";
        function Context(flags, cursor) {
          this.flags = flags;
          this.cursor = cursor;
        }
        Context.prototype = {
          skip: function skip() {
            this.flags.skip = true;
          },
          break: function _break() {
            this.flags.break = true;
          },
          remove: function remove2() {
            this.flags.remove = true;
          },
          replace: function replace(node) {
            this.flags.replace = node;
          },
          get parent() {
            return this.cursor.parent;
          },
          get depth() {
            return this.cursor.depth;
          },
          get level() {
            return this.cursor.depth + 1;
          },
          get index() {
            return this.cursor.index;
          }
        };
        function ContextFactory(flags, cursor) {
          return new Context(flags, cursor);
        }
        function Stack(initial) {
          this.xs = [initial];
          this.top = 0;
        }
        Stack.prototype = {
          push: function push(x) {
            this.top++;
            if (this.top < this.xs.length) {
              this.xs[this.top] = x;
            } else {
              this.xs.push(x);
            }
          },
          pushArrayReverse: function pushArrayReverse(xs) {
            for (var i = xs.length - 1; i >= 0; i--) {
              this.push(xs[i]);
            }
          },
          pop: function pop() {
            var x = this.peek();
            this.top--;
            return x;
          },
          peek: function peek() {
            return this.xs[this.top];
          },
          isEmpty: function isEmpty() {
            return -1 === this.top;
          }
        };
        function QueueFactory(initial) {
          return new Stack(initial);
        }
        function DfsCursor() {
          this.depth = 0;
          this.stack = QueueFactory({ node: null, index: -1 });
        }
        DfsCursor.prototype = {
          moveDown: function moveDown(node) {
            this.depth++;
            this.stack.push({ node, index: 0 });
          },
          moveUp: function moveUp() {
            this.depth--;
            this.stack.pop();
          },
          moveNext: function moveNext() {
            this.stack.peek().index++;
          },
          get parent() {
            return this.stack.peek().node;
          },
          get index() {
            return this.stack.peek().index;
          }
        };
        function CursorFactory() {
          return new DfsCursor();
        }
        function Flags() {
          this.break = false;
          this.skip = false;
          this.remove = false;
          this.replace = null;
        }
        Flags.prototype = {
          reset: function reset() {
            this.break = false;
            this.skip = false;
            this.remove = false;
            this.replace = null;
          }
        };
        function FlagsFactory() {
          return new Flags();
        }
        function isNotEmpty(xs) {
          return xs && 0 !== xs.length;
        }
        function dfsPre(root2, iteratee, getChildren) {
          var flags = FlagsFactory();
          var cursor = CursorFactory();
          var context = ContextFactory(flags, cursor);
          var stack = QueueFactory(root2);
          var dummy = Object.assign({}, root2);
          while (!stack.isEmpty()) {
            var node = stack.pop();
            if (node === dummy) {
              cursor.moveUp();
              continue;
            }
            flags.reset();
            iteratee(node, context);
            if (flags.break) break;
            if (flags.remove) continue;
            cursor.moveNext();
            if (!flags.skip) {
              if (flags.replace) {
                node = flags.replace;
              }
              var children2 = getChildren(node);
              if (isNotEmpty(children2)) {
                stack.push(dummy);
                stack.pushArrayReverse(children2);
                cursor.moveDown(node);
              }
            }
          }
        }
        function dfsPost(root2, iteratee, getChildren) {
          var flags = FlagsFactory();
          var cursor = CursorFactory();
          var context = ContextFactory(flags, cursor);
          var stack = QueueFactory(root2);
          var ancestors = QueueFactory(null);
          while (!stack.isEmpty()) {
            var node = stack.peek();
            var parent = ancestors.peek();
            var children2 = getChildren(node);
            flags.reset();
            if (node === parent || !isNotEmpty(children2)) {
              if (node === parent) {
                ancestors.pop();
                cursor.moveUp();
              }
              stack.pop();
              iteratee(node, context);
              if (flags.break) break;
              if (flags.remove) continue;
              cursor.moveNext();
            } else {
              ancestors.push(node);
              cursor.moveDown(node);
              stack.pushArrayReverse(children2);
            }
          }
        }
        var THRESHOLD = 32768;
        function Queue(initial) {
          this.xs = [initial];
          this.top = 0;
          this.maxLength = 0;
        }
        Queue.prototype = {
          enqueue: function enqueue(x) {
            this.xs.push(x);
          },
          enqueueMultiple: function enqueueMultiple(xs) {
            for (var i = 0, len = xs.length; i < len; i++) {
              this.enqueue(xs[i]);
            }
          },
          dequeue: function dequeue() {
            var x = this.peek();
            this.top++;
            if (this.top === THRESHOLD) {
              this.xs = this.xs.slice(this.top);
              this.top = 0;
            }
            return x;
          },
          peek: function peek() {
            return this.xs[this.top];
          },
          isEmpty: function isEmpty() {
            return this.top === this.xs.length;
          }
        };
        function QueueFactory$1(initial) {
          return new Queue(initial);
        }
        function BfsCursor() {
          this.depth = 0;
          this.index = -1;
          this.queue = QueueFactory$1({ node: null, arity: 1 });
          this.levelNodes = 1;
          this.nextLevelNodes = 0;
        }
        BfsCursor.prototype = {
          store: function store(node, arity) {
            this.queue.enqueue({ node, arity });
            this.nextLevelNodes += arity;
          },
          moveNext: function moveNext() {
            this.index++;
          },
          moveForward: function moveForward() {
            this.queue.peek().arity--;
            this.levelNodes--;
            if (0 === this.queue.peek().arity) {
              this.index = 0;
              this.queue.dequeue();
            }
            if (0 === this.levelNodes) {
              this.depth++;
              this.levelNodes = this.nextLevelNodes;
              this.nextLevelNodes = 0;
            }
          },
          get parent() {
            return this.queue.peek().node;
          }
        };
        function CursorFactory$1() {
          return new BfsCursor();
        }
        function bfs(root2, iteratee, getChildren) {
          var flags = FlagsFactory();
          var cursor = CursorFactory$1();
          var context = ContextFactory(flags, cursor);
          var queue = QueueFactory$1(root2);
          while (!queue.isEmpty()) {
            var node = queue.dequeue();
            flags.reset();
            iteratee(node, context);
            if (flags.break) break;
            if (!flags.remove) {
              cursor.moveNext();
              if (flags.replace) {
                node = flags.replace;
              }
              if (!flags.skip) {
                var children2 = getChildren(node);
                if (isNotEmpty(children2)) {
                  queue.enqueueMultiple(children2);
                  cursor.store(node, children2.length);
                }
              }
            }
            cursor.moveForward();
          }
        }
        var defaultGetChildren = function defaultGetChildren2(node) {
          return node.children;
        };
        function crawl(root2, iteratee, options) {
          if (null == root2) return;
          options = options || {};
          var order = options.order || "pre";
          var getChildren = options.getChildren || defaultGetChildren;
          if ("pre" === order) {
            dfsPre(root2, iteratee, getChildren);
          } else if ("post" === order) {
            dfsPost(root2, iteratee, getChildren);
          } else if ("bfs" === order) {
            bfs(root2, iteratee, getChildren);
          }
        }
        return crawl;
      });
    }
  });

  // node_modules/parse-gedcom/d3ize.js
  var require_d3ize = __commonJS({
    "node_modules/parse-gedcom/d3ize.js"(exports, module) {
      function hasTag(val) {
        return function(node) {
          return node.tag === val;
        };
      }
      function d3ize(tree) {
        var peopleNodes = tree.filter(hasTag("INDI")).map(toNode);
        var families = tree.filter(hasTag("FAM"));
        var familyNodes = families.map(toNode);
        var links = families.reduce(function(memo, family) {
          return memo.concat(familyLinks(family));
        }, []);
        var allNodes = peopleNodes.concat(familyNodes);
        var indexedNodes = allNodes.reduce(function(memo, node, i) {
          memo[node.id] = i;
          return memo;
        }, {});
        links = links.map(idToIndex(indexedNodes));
        return {
          nodes: allNodes,
          links
        };
      }
      function getName2(p) {
        if (p.tag === "INDI") {
          var nameNode = (p.tree.filter(hasTag("NAME")) || [])[0];
          if (nameNode) {
            return nameNode.data.replace(/\//g, "");
          } else {
            return "?";
          }
        } else {
          return "Family";
        }
      }
      function toNode(p) {
        p.id = p.pointer;
        p.name = getName2(p);
        return p;
      }
      function idToIndex(indexedNodes) {
        return function(link) {
          function getIndexed(id2) {
            return indexedNodes[id2];
          }
          return {
            source: getIndexed(link.source),
            target: getIndexed(link.target)
          };
        };
      }
      function familyLinks(family) {
        var memberLinks = family.tree.filter(function(member) {
          return member.data && member.data[0] === "@";
        }).map(function(member) {
          return {
            source: family.pointer,
            target: member.data
          };
        });
        return memberLinks;
      }
      module.exports = d3ize;
    }
  });

  // node_modules/parse-gedcom/index.js
  var require_parse_gedcom = __commonJS({
    "node_modules/parse-gedcom/index.js"(exports, module) {
      var crawl = require_tree_crawl();
      var lineRe = /\s*(0|[1-9]+[0-9]*) (@[^@]+@ |)([A-Za-z0-9_]+)( [^\n\r]*|)/;
      function parse(input) {
        var start2 = { root: { tree: [] }, level: 0 };
        start2.pointer = start2.root;
        var data = input.split("\n").map(mapLine).filter(function(_) {
          return _;
        }).reduce(buildTree, start2).root;
        crawl(data, cleanUp, { getChildren });
        return data.tree;
        function buildTree(memo, data2) {
          if (data2.level === memo.level) {
            memo.pointer.tree.push(data2);
          } else if (data2.level > memo.level) {
            var up = memo.pointer;
            memo.pointer = memo.pointer.tree[memo.pointer.tree.length - 1];
            memo.pointer.tree.push(data2);
            memo.pointer.up = up;
            memo.level = data2.level;
          } else if (data2.level < memo.level) {
            while (data2.level <= memo.pointer.level && memo.pointer.up) {
              memo.pointer = memo.pointer.up;
            }
            memo.pointer.tree.push(data2);
            memo.level = data2.level;
          }
          return memo;
        }
        function mapLine(data2) {
          var match = data2.match(lineRe);
          if (!match) return null;
          return {
            level: parseInt(match[1], 10),
            pointer: match[2].trim(),
            tag: match[3].trim(),
            data: match[4].trimLeft(),
            tree: []
          };
        }
        function cleanUp(node) {
          delete node.up;
          delete node.level;
        }
        function getChildren(node) {
          return node.tree;
        }
      }
      module.exports.parse = parse;
      module.exports.d3ize = require_d3ize();
    }
  });

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    AncestorChart: () => AncestorChart,
    ChartColors: () => ChartColors,
    ChartUtil: () => ChartUtil,
    CircleRenderer: () => CircleRenderer,
    CompositeRenderer: () => CompositeRenderer,
    DUMMY_ROOT_NODE_ID: () => DUMMY_ROOT_NODE_ID,
    DescendantChart: () => DescendantChart,
    DetailedRenderer: () => DetailedRenderer,
    ExpanderDirection: () => ExpanderDirection,
    ExpanderState: () => ExpanderState,
    FancyChart: () => FancyChart,
    H_SPACING: () => H_SPACING,
    HourglassChart: () => HourglassChart,
    JsonDataProvider: () => JsonDataProvider,
    KinshipChart: () => KinshipChart,
    RelativesChart: () => RelativesChart,
    SimpleRenderer: () => SimpleRenderer,
    V_SPACING: () => V_SPACING,
    createChart: () => createChart,
    formatDate: () => formatDate,
    formatDateOrRange: () => formatDateOrRange,
    gedcomEntriesToJson: () => gedcomEntriesToJson,
    gedcomToJson: () => gedcomToJson,
    getAncestorsTree: () => getAncestorsTree,
    getChartInfo: () => getChartInfo,
    getChartInfoWithoutMargin: () => getChartInfoWithoutMargin,
    getDate: () => getDate,
    getFamPositionHorizontal: () => getFamPositionHorizontal,
    getFamPositionVertical: () => getFamPositionVertical,
    getLength: () => getLength,
    getVSize: () => getVSize,
    layOutDescendants: () => layOutDescendants,
    linkId: () => linkId
  });

  // node_modules/array-flat-polyfill/index.mjs
  Array.prototype.flat || Object.defineProperty(Array.prototype, "flat", { configurable: true, value: function r() {
    var t = isNaN(arguments[0]) ? 1 : Number(arguments[0]);
    return t ? Array.prototype.reduce.call(this, function(a, e) {
      return Array.isArray(e) ? a.push.apply(a, r.call(e, t - 1)) : a.push(e), a;
    }, []) : Array.prototype.slice.call(this);
  }, writable: true }), Array.prototype.flatMap || Object.defineProperty(Array.prototype, "flatMap", { configurable: true, value: function(r2) {
    return Array.prototype.map.apply(this, arguments).flat();
  }, writable: true });

  // src/api.ts
  var ExpanderState = /* @__PURE__ */ ((ExpanderState2) => {
    ExpanderState2[ExpanderState2["PLUS"] = 0] = "PLUS";
    ExpanderState2[ExpanderState2["MINUS"] = 1] = "MINUS";
    return ExpanderState2;
  })(ExpanderState || {});
  var ExpanderDirection = /* @__PURE__ */ ((ExpanderDirection2) => {
    ExpanderDirection2[ExpanderDirection2["INDI"] = 0] = "INDI";
    ExpanderDirection2[ExpanderDirection2["SPOUSE"] = 1] = "SPOUSE";
    ExpanderDirection2[ExpanderDirection2["FAMILY"] = 2] = "FAMILY";
    return ExpanderDirection2;
  })(ExpanderDirection || {});
  var ChartColors = /* @__PURE__ */ ((ChartColors2) => {
    ChartColors2[ChartColors2["NO_COLOR"] = 0] = "NO_COLOR";
    ChartColors2[ChartColors2["COLOR_BY_GENERATION"] = 1] = "COLOR_BY_GENERATION";
    ChartColors2[ChartColors2["COLOR_BY_SEX"] = 2] = "COLOR_BY_SEX";
    return ChartColors2;
  })(ChartColors || {});

  // node_modules/d3-selection/src/namespaces.js
  var xhtml = "http://www.w3.org/1999/xhtml";
  var namespaces_default = {
    svg: "http://www.w3.org/2000/svg",
    xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  // node_modules/d3-selection/src/namespace.js
  function namespace_default(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces_default.hasOwnProperty(prefix) ? { space: namespaces_default[prefix], local: name } : name;
  }

  // node_modules/d3-selection/src/creator.js
  function creatorInherit(name) {
    return function() {
      var document2 = this.ownerDocument, uri = this.namespaceURI;
      return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
    };
  }
  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }
  function creator_default(name) {
    var fullname = namespace_default(name);
    return (fullname.local ? creatorFixed : creatorInherit)(fullname);
  }

  // node_modules/d3-selection/src/selector.js
  function none() {
  }
  function selector_default(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  // node_modules/d3-selection/src/selection/select.js
  function select_default(select) {
    if (typeof select !== "function") select = selector_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/d3-selection/src/array.js
  function array(x) {
    return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
  }

  // node_modules/d3-selection/src/selectorAll.js
  function empty() {
    return [];
  }
  function selectorAll_default(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  // node_modules/d3-selection/src/selection/selectAll.js
  function arrayAll(select) {
    return function() {
      return array(select.apply(this, arguments));
    };
  }
  function selectAll_default(select) {
    if (typeof select === "function") select = arrayAll(select);
    else select = selectorAll_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }
    return new Selection(subgroups, parents);
  }

  // node_modules/d3-selection/src/matcher.js
  function matcher_default(selector) {
    return function() {
      return this.matches(selector);
    };
  }
  function childMatcher(selector) {
    return function(node) {
      return node.matches(selector);
    };
  }

  // node_modules/d3-selection/src/selection/selectChild.js
  var find = Array.prototype.find;
  function childFind(match) {
    return function() {
      return find.call(this.children, match);
    };
  }
  function childFirst() {
    return this.firstElementChild;
  }
  function selectChild_default(match) {
    return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/d3-selection/src/selection/selectChildren.js
  var filter = Array.prototype.filter;
  function children() {
    return Array.from(this.children);
  }
  function childrenFilter(match) {
    return function() {
      return filter.call(this.children, match);
    };
  }
  function selectChildren_default(match) {
    return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/d3-selection/src/selection/filter.js
  function filter_default(match) {
    if (typeof match !== "function") match = matcher_default(match);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/d3-selection/src/selection/sparse.js
  function sparse_default(update) {
    return new Array(update.length);
  }

  // node_modules/d3-selection/src/selection/enter.js
  function enter_default() {
    return new Selection(this._enter || this._groups.map(sparse_default), this._parents);
  }
  function EnterNode(parent, datum2) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum2;
  }
  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) {
      return this._parent.insertBefore(child, this._next);
    },
    insertBefore: function(child, next) {
      return this._parent.insertBefore(child, next);
    },
    querySelector: function(selector) {
      return this._parent.querySelector(selector);
    },
    querySelectorAll: function(selector) {
      return this._parent.querySelectorAll(selector);
    }
  };

  // node_modules/d3-selection/src/constant.js
  function constant_default(x) {
    return function() {
      return x;
    };
  }

  // node_modules/d3-selection/src/selection/data.js
  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0, node, groupLength = group.length, dataLength = data.length;
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }
  function bindKey(parent, group, enter, update, exit, data, key) {
    var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
        if (nodeByKeyValue.has(keyValue)) {
          exit[i] = node;
        } else {
          nodeByKeyValue.set(keyValue, node);
        }
      }
    }
    for (i = 0; i < dataLength; ++i) {
      keyValue = key.call(parent, data[i], i, data) + "";
      if (node = nodeByKeyValue.get(keyValue)) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue.delete(keyValue);
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
        exit[i] = node;
      }
    }
  }
  function datum(node) {
    return node.__data__;
  }
  function data_default(value, key) {
    if (!arguments.length) return Array.from(this, datum);
    var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
    if (typeof value !== "function") value = constant_default(value);
    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
          previous._next = next || null;
        }
      }
    }
    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }
  function arraylike(data) {
    return typeof data === "object" && "length" in data ? data : Array.from(data);
  }

  // node_modules/d3-selection/src/selection/exit.js
  function exit_default() {
    return new Selection(this._exit || this._groups.map(sparse_default), this._parents);
  }

  // node_modules/d3-selection/src/selection/join.js
  function join_default(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    if (typeof onenter === "function") {
      enter = onenter(enter);
      if (enter) enter = enter.selection();
    } else {
      enter = enter.append(onenter + "");
    }
    if (onupdate != null) {
      update = onupdate(update);
      if (update) update = update.selection();
    }
    if (onexit == null) exit.remove();
    else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  // node_modules/d3-selection/src/selection/merge.js
  function merge_default(context) {
    var selection2 = context.selection ? context.selection() : context;
    for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Selection(merges, this._parents);
  }

  // node_modules/d3-selection/src/selection/order.js
  function order_default() {
    for (var groups = this._groups, j = -1, m = groups.length; ++j < m; ) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  }

  // node_modules/d3-selection/src/selection/sort.js
  function sort_default(compare) {
    if (!compare) compare = ascending;
    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }
    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }
    return new Selection(sortgroups, this._parents).order();
  }
  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  // node_modules/d3-selection/src/selection/call.js
  function call_default() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  // node_modules/d3-selection/src/selection/nodes.js
  function nodes_default() {
    return Array.from(this);
  }

  // node_modules/d3-selection/src/selection/node.js
  function node_default() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }
    return null;
  }

  // node_modules/d3-selection/src/selection/size.js
  function size_default() {
    let size = 0;
    for (const node of this) ++size;
    return size;
  }

  // node_modules/d3-selection/src/selection/empty.js
  function empty_default() {
    return !this.node();
  }

  // node_modules/d3-selection/src/selection/each.js
  function each_default(callback) {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }
    return this;
  }

  // node_modules/d3-selection/src/selection/attr.js
  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }
  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }
  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }
  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }
  function attr_default(name, value) {
    var fullname = namespace_default(name);
    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
    }
    return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
  }

  // node_modules/d3-selection/src/window.js
  function window_default(node) {
    return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
  }

  // node_modules/d3-selection/src/selection/style.js
  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }
  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }
  function style_default(name, value, priority) {
    return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
  }
  function styleValue(node, name) {
    return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  // node_modules/d3-selection/src/selection/property.js
  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }
  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }
  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }
  function property_default(name, value) {
    return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
  }

  // node_modules/d3-selection/src/selection/classed.js
  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }
  function classList(node) {
    return node.classList || new ClassList(node);
  }
  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }
  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };
  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }
  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }
  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }
  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }
  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }
  function classed_default(name, value) {
    var names = classArray(name + "");
    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }
    return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
  }

  // node_modules/d3-selection/src/selection/text.js
  function textRemove() {
    this.textContent = "";
  }
  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }
  function text_default(value) {
    return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
  }

  // node_modules/d3-selection/src/selection/html.js
  function htmlRemove() {
    this.innerHTML = "";
  }
  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }
  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }
  function html_default(value) {
    return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
  }

  // node_modules/d3-selection/src/selection/raise.js
  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }
  function raise_default() {
    return this.each(raise);
  }

  // node_modules/d3-selection/src/selection/lower.js
  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function lower_default() {
    return this.each(lower);
  }

  // node_modules/d3-selection/src/selection/append.js
  function append_default(name) {
    var create2 = typeof name === "function" ? name : creator_default(name);
    return this.select(function() {
      return this.appendChild(create2.apply(this, arguments));
    });
  }

  // node_modules/d3-selection/src/selection/insert.js
  function constantNull() {
    return null;
  }
  function insert_default(name, before) {
    var create2 = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
    return this.select(function() {
      return this.insertBefore(create2.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  // node_modules/d3-selection/src/selection/remove.js
  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }
  function remove_default() {
    return this.each(remove);
  }

  // node_modules/d3-selection/src/selection/clone.js
  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function clone_default(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  // node_modules/d3-selection/src/selection/datum.js
  function datum_default(value) {
    return arguments.length ? this.property("__data__", value) : this.node().__data__;
  }

  // node_modules/d3-selection/src/selection/on.js
  function contextListener(listener) {
    return function(event) {
      listener.call(this, event, this.__data__);
    };
  }
  function parseTypenames(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return { type: t, name };
    });
  }
  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }
  function onAdd(typename, value, options) {
    return function() {
      var on = this.__on, o, listener = contextListener(value);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
          this.addEventListener(o.type, o.listener = listener, o.options = options);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, options);
      o = { type: typename.type, name: typename.name, value, listener, options };
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }
  function on_default(typename, value, options) {
    var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;
    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }
    on = value ? onAdd : onRemove;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
    return this;
  }

  // node_modules/d3-selection/src/selection/dispatch.js
  function dispatchEvent(node, type, params) {
    var window2 = window_default(node), event = window2.CustomEvent;
    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window2.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }
    node.dispatchEvent(event);
  }
  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }
  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }
  function dispatch_default(type, params) {
    return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
  }

  // node_modules/d3-selection/src/selection/iterator.js
  function* iterator_default() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) yield node;
      }
    }
  }

  // node_modules/d3-selection/src/selection/index.js
  var root = [null];
  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }
  function selection() {
    return new Selection([[document.documentElement]], root);
  }
  function selection_selection() {
    return this;
  }
  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: select_default,
    selectAll: selectAll_default,
    selectChild: selectChild_default,
    selectChildren: selectChildren_default,
    filter: filter_default,
    data: data_default,
    enter: enter_default,
    exit: exit_default,
    join: join_default,
    merge: merge_default,
    selection: selection_selection,
    order: order_default,
    sort: sort_default,
    call: call_default,
    nodes: nodes_default,
    node: node_default,
    size: size_default,
    empty: empty_default,
    each: each_default,
    attr: attr_default,
    style: style_default,
    property: property_default,
    classed: classed_default,
    text: text_default,
    html: html_default,
    raise: raise_default,
    lower: lower_default,
    append: append_default,
    insert: insert_default,
    remove: remove_default,
    clone: clone_default,
    datum: datum_default,
    on: on_default,
    dispatch: dispatch_default,
    [Symbol.iterator]: iterator_default
  };
  var selection_default = selection;

  // node_modules/d3-selection/src/select.js
  function select_default2(selector) {
    return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/count.js
  function count(node) {
    var sum = 0, children2 = node.children, i = children2 && children2.length;
    if (!i) sum = 1;
    else while (--i >= 0) sum += children2[i].value;
    node.value = sum;
  }
  function count_default() {
    return this.eachAfter(count);
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/each.js
  function each_default2(callback) {
    var node = this, current, next = [node], children2, i, n;
    do {
      current = next.reverse(), next = [];
      while (node = current.pop()) {
        callback(node), children2 = node.children;
        if (children2) for (i = 0, n = children2.length; i < n; ++i) {
          next.push(children2[i]);
        }
      }
    } while (next.length);
    return this;
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/eachBefore.js
  function eachBefore_default(callback) {
    var node = this, nodes = [node], children2, i;
    while (node = nodes.pop()) {
      callback(node), children2 = node.children;
      if (children2) for (i = children2.length - 1; i >= 0; --i) {
        nodes.push(children2[i]);
      }
    }
    return this;
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/eachAfter.js
  function eachAfter_default(callback) {
    var node = this, nodes = [node], next = [], children2, i, n;
    while (node = nodes.pop()) {
      next.push(node), children2 = node.children;
      if (children2) for (i = 0, n = children2.length; i < n; ++i) {
        nodes.push(children2[i]);
      }
    }
    while (node = next.pop()) {
      callback(node);
    }
    return this;
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/sum.js
  function sum_default(value) {
    return this.eachAfter(function(node) {
      var sum = +value(node.data) || 0, children2 = node.children, i = children2 && children2.length;
      while (--i >= 0) sum += children2[i].value;
      node.value = sum;
    });
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/sort.js
  function sort_default2(compare) {
    return this.eachBefore(function(node) {
      if (node.children) {
        node.children.sort(compare);
      }
    });
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/path.js
  function path_default(end) {
    var start2 = this, ancestor = leastCommonAncestor(start2, end), nodes = [start2];
    while (start2 !== ancestor) {
      start2 = start2.parent;
      nodes.push(start2);
    }
    var k = nodes.length;
    while (end !== ancestor) {
      nodes.splice(k, 0, end);
      end = end.parent;
    }
    return nodes;
  }
  function leastCommonAncestor(a, b) {
    if (a === b) return a;
    var aNodes = a.ancestors(), bNodes = b.ancestors(), c = null;
    a = aNodes.pop();
    b = bNodes.pop();
    while (a === b) {
      c = a;
      a = aNodes.pop();
      b = bNodes.pop();
    }
    return c;
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/ancestors.js
  function ancestors_default() {
    var node = this, nodes = [node];
    while (node = node.parent) {
      nodes.push(node);
    }
    return nodes;
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/descendants.js
  function descendants_default() {
    var nodes = [];
    this.each(function(node) {
      nodes.push(node);
    });
    return nodes;
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/leaves.js
  function leaves_default() {
    var leaves = [];
    this.eachBefore(function(node) {
      if (!node.children) {
        leaves.push(node);
      }
    });
    return leaves;
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/links.js
  function links_default() {
    var root2 = this, links = [];
    root2.each(function(node) {
      if (node !== root2) {
        links.push({ source: node.parent, target: node });
      }
    });
    return links;
  }

  // node_modules/d3-flextree/node_modules/d3-hierarchy/src/hierarchy/index.js
  function hierarchy(data, children2) {
    var root2 = new Node(data), valued = +data.value && (root2.value = data.value), node, nodes = [root2], child, childs, i, n;
    if (children2 == null) children2 = defaultChildren;
    while (node = nodes.pop()) {
      if (valued) node.value = +node.data.value;
      if ((childs = children2(node.data)) && (n = childs.length)) {
        node.children = new Array(n);
        for (i = n - 1; i >= 0; --i) {
          nodes.push(child = node.children[i] = new Node(childs[i]));
          child.parent = node;
          child.depth = node.depth + 1;
        }
      }
    }
    return root2.eachBefore(computeHeight);
  }
  function node_copy() {
    return hierarchy(this).eachBefore(copyData);
  }
  function defaultChildren(d) {
    return d.children;
  }
  function copyData(node) {
    node.data = node.data.data;
  }
  function computeHeight(node) {
    var height = 0;
    do
      node.height = height;
    while ((node = node.parent) && node.height < ++height);
  }
  function Node(data) {
    this.data = data;
    this.depth = this.height = 0;
    this.parent = null;
  }
  Node.prototype = hierarchy.prototype = {
    constructor: Node,
    count: count_default,
    each: each_default2,
    eachAfter: eachAfter_default,
    eachBefore: eachBefore_default,
    sum: sum_default,
    sort: sort_default2,
    path: path_default,
    ancestors: ancestors_default,
    descendants: descendants_default,
    leaves: leaves_default,
    links: links_default,
    copy: node_copy
  };

  // node_modules/d3-flextree/package.json
  var version = "2.1.1";

  // node_modules/d3-flextree/src/flextree.js
  var defaults = Object.freeze({
    children: (data) => data.children,
    nodeSize: (node) => node.data.size,
    spacing: 0
  });
  function flextree(options) {
    const opts = Object.assign({}, defaults, options);
    function accessor(name) {
      const opt = opts[name];
      return typeof opt === "function" ? opt : () => opt;
    }
    function layout(tree) {
      const wtree = wrap(getWrapper(), tree, (node) => node.children);
      wtree.update();
      return wtree.data;
    }
    function getFlexNode() {
      const nodeSize = accessor("nodeSize");
      const spacing = accessor("spacing");
      return class FlexNode extends hierarchy.prototype.constructor {
        constructor(data) {
          super(data);
        }
        copy() {
          const c = wrap(this.constructor, this, (node) => node.children);
          c.each((node) => node.data = node.data.data);
          return c;
        }
        get size() {
          return nodeSize(this);
        }
        spacing(oNode) {
          return spacing(this, oNode);
        }
        get nodes() {
          return this.descendants();
        }
        get xSize() {
          return this.size[0];
        }
        get ySize() {
          return this.size[1];
        }
        get top() {
          return this.y;
        }
        get bottom() {
          return this.y + this.ySize;
        }
        get left() {
          return this.x - this.xSize / 2;
        }
        get right() {
          return this.x + this.xSize / 2;
        }
        get root() {
          const ancs = this.ancestors();
          return ancs[ancs.length - 1];
        }
        get numChildren() {
          return this.hasChildren ? this.children.length : 0;
        }
        get hasChildren() {
          return !this.noChildren;
        }
        get noChildren() {
          return this.children === null;
        }
        get firstChild() {
          return this.hasChildren ? this.children[0] : null;
        }
        get lastChild() {
          return this.hasChildren ? this.children[this.numChildren - 1] : null;
        }
        get extents() {
          return (this.children || []).reduce(
            (acc, kid) => FlexNode.maxExtents(acc, kid.extents),
            this.nodeExtents
          );
        }
        get nodeExtents() {
          return {
            top: this.top,
            bottom: this.bottom,
            left: this.left,
            right: this.right
          };
        }
        static maxExtents(e0, e1) {
          return {
            top: Math.min(e0.top, e1.top),
            bottom: Math.max(e0.bottom, e1.bottom),
            left: Math.min(e0.left, e1.left),
            right: Math.max(e0.right, e1.right)
          };
        }
      };
    }
    function getWrapper() {
      const FlexNode = getFlexNode();
      const nodeSize = accessor("nodeSize");
      const spacing = accessor("spacing");
      return class extends FlexNode {
        constructor(data) {
          super(data);
          Object.assign(this, {
            x: 0,
            y: 0,
            relX: 0,
            prelim: 0,
            shift: 0,
            change: 0,
            lExt: this,
            lExtRelX: 0,
            lThr: null,
            rExt: this,
            rExtRelX: 0,
            rThr: null
          });
        }
        get size() {
          return nodeSize(this.data);
        }
        spacing(oNode) {
          return spacing(this.data, oNode.data);
        }
        get x() {
          return this.data.x;
        }
        set x(v) {
          this.data.x = v;
        }
        get y() {
          return this.data.y;
        }
        set y(v) {
          this.data.y = v;
        }
        update() {
          layoutChildren(this);
          resolveX(this);
          return this;
        }
      };
    }
    function wrap(FlexClass, treeData, children2) {
      const _wrap = (data, parent) => {
        const node = new FlexClass(data);
        Object.assign(node, {
          parent,
          depth: parent === null ? 0 : parent.depth + 1,
          height: 0,
          length: 1
        });
        const kidsData = children2(data) || [];
        node.children = kidsData.length === 0 ? null : kidsData.map((kd) => _wrap(kd, node));
        if (node.children) {
          Object.assign(node, node.children.reduce(
            (hl, kid) => ({
              height: Math.max(hl.height, kid.height + 1),
              length: hl.length + kid.length
            }),
            node
          ));
        }
        return node;
      };
      return _wrap(treeData, null);
    }
    Object.assign(layout, {
      nodeSize(arg) {
        return arguments.length ? (opts.nodeSize = arg, layout) : opts.nodeSize;
      },
      spacing(arg) {
        return arguments.length ? (opts.spacing = arg, layout) : opts.spacing;
      },
      children(arg) {
        return arguments.length ? (opts.children = arg, layout) : opts.children;
      },
      hierarchy(treeData, children2) {
        const kids = typeof children2 === "undefined" ? opts.children : children2;
        return wrap(getFlexNode(), treeData, kids);
      },
      dump(tree) {
        const nodeSize = accessor("nodeSize");
        const _dump = (i0) => (node) => {
          const i1 = i0 + "  ";
          const i2 = i0 + "    ";
          const { x, y } = node;
          const size = nodeSize(node);
          const kids = node.children || [];
          const kdumps = kids.length === 0 ? " " : `,${i1}children: [${i2}${kids.map(_dump(i2)).join(i2)}${i1}],${i0}`;
          return `{ size: [${size.join(", ")}],${i1}x: ${x}, y: ${y}${kdumps}},`;
        };
        return _dump("\n")(tree);
      }
    });
    return layout;
  }
  flextree.version = version;
  var layoutChildren = (w, y = 0) => {
    w.y = y;
    (w.children || []).reduce((acc, kid) => {
      const [i, lastLows] = acc;
      layoutChildren(kid, w.y + w.ySize);
      const lowY = (i === 0 ? kid.lExt : kid.rExt).bottom;
      if (i !== 0) separate(w, i, lastLows);
      const lows = updateLows(lowY, i, lastLows);
      return [i + 1, lows];
    }, [0, null]);
    shiftChange(w);
    positionRoot(w);
    return w;
  };
  var resolveX = (w, prevSum, parentX) => {
    if (typeof prevSum === "undefined") {
      prevSum = -w.relX - w.prelim;
      parentX = 0;
    }
    const sum = prevSum + w.relX;
    w.relX = sum + w.prelim - parentX;
    w.prelim = 0;
    w.x = parentX + w.relX;
    (w.children || []).forEach((k) => resolveX(k, sum, w.x));
    return w;
  };
  var shiftChange = (w) => {
    (w.children || []).reduce((acc, child) => {
      const [lastShiftSum, lastChangeSum] = acc;
      const shiftSum = lastShiftSum + child.shift;
      const changeSum = lastChangeSum + shiftSum + child.change;
      child.relX += changeSum;
      return [shiftSum, changeSum];
    }, [0, 0]);
  };
  var separate = (w, i, lows) => {
    const lSib = w.children[i - 1];
    const curSubtree = w.children[i];
    let rContour = lSib;
    let rSumMods = lSib.relX;
    let lContour = curSubtree;
    let lSumMods = curSubtree.relX;
    let isFirst = true;
    while (rContour && lContour) {
      if (rContour.bottom > lows.lowY) lows = lows.next;
      const dist = rSumMods + rContour.prelim - (lSumMods + lContour.prelim) + rContour.xSize / 2 + lContour.xSize / 2 + rContour.spacing(lContour);
      if (dist > 0 || dist < 0 && isFirst) {
        lSumMods += dist;
        moveSubtree(curSubtree, dist);
        distributeExtra(w, i, lows.index, dist);
      }
      isFirst = false;
      const rightBottom = rContour.bottom;
      const leftBottom = lContour.bottom;
      if (rightBottom <= leftBottom) {
        rContour = nextRContour(rContour);
        if (rContour) rSumMods += rContour.relX;
      }
      if (rightBottom >= leftBottom) {
        lContour = nextLContour(lContour);
        if (lContour) lSumMods += lContour.relX;
      }
    }
    if (!rContour && lContour) setLThr(w, i, lContour, lSumMods);
    else if (rContour && !lContour) setRThr(w, i, rContour, rSumMods);
  };
  var moveSubtree = (subtree, distance) => {
    subtree.relX += distance;
    subtree.lExtRelX += distance;
    subtree.rExtRelX += distance;
  };
  var distributeExtra = (w, curSubtreeI, leftSibI, dist) => {
    const curSubtree = w.children[curSubtreeI];
    const n = curSubtreeI - leftSibI;
    if (n > 1) {
      const delta = dist / n;
      w.children[leftSibI + 1].shift += delta;
      curSubtree.shift -= delta;
      curSubtree.change -= dist - delta;
    }
  };
  var nextLContour = (w) => {
    return w.hasChildren ? w.firstChild : w.lThr;
  };
  var nextRContour = (w) => {
    return w.hasChildren ? w.lastChild : w.rThr;
  };
  var setLThr = (w, i, lContour, lSumMods) => {
    const firstChild = w.firstChild;
    const lExt = firstChild.lExt;
    const curSubtree = w.children[i];
    lExt.lThr = lContour;
    const diff = lSumMods - lContour.relX - firstChild.lExtRelX;
    lExt.relX += diff;
    lExt.prelim -= diff;
    firstChild.lExt = curSubtree.lExt;
    firstChild.lExtRelX = curSubtree.lExtRelX;
  };
  var setRThr = (w, i, rContour, rSumMods) => {
    const curSubtree = w.children[i];
    const rExt = curSubtree.rExt;
    const lSib = w.children[i - 1];
    rExt.rThr = rContour;
    const diff = rSumMods - rContour.relX - curSubtree.rExtRelX;
    rExt.relX += diff;
    rExt.prelim -= diff;
    curSubtree.rExt = lSib.rExt;
    curSubtree.rExtRelX = lSib.rExtRelX;
  };
  var positionRoot = (w) => {
    if (w.hasChildren) {
      const k0 = w.firstChild;
      const kf = w.lastChild;
      const prelim = (k0.prelim + k0.relX - k0.xSize / 2 + kf.relX + kf.prelim + kf.xSize / 2) / 2;
      Object.assign(w, {
        prelim,
        lExt: k0.lExt,
        lExtRelX: k0.lExtRelX,
        rExt: kf.rExt,
        rExtRelX: kf.rExtRelX
      });
    }
  };
  var updateLows = (lowY, index, lastLows) => {
    while (lastLows !== null && lowY >= lastLows.lowY)
      lastLows = lastLows.next;
    return {
      lowY,
      index,
      next: lastLows
    };
  };

  // node_modules/d3-array/src/max.js
  function max(values, valueof) {
    let max2;
    if (valueof === void 0) {
      for (const value of values) {
        if (value != null && (max2 < value || max2 === void 0 && value >= value)) {
          max2 = value;
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null && (max2 < value || max2 === void 0 && value >= value)) {
          max2 = value;
        }
      }
    }
    return max2;
  }

  // node_modules/d3-array/src/min.js
  function min(values, valueof) {
    let min2;
    if (valueof === void 0) {
      for (const value of values) {
        if (value != null && (min2 > value || min2 === void 0 && value >= value)) {
          min2 = value;
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null && (min2 > value || min2 === void 0 && value >= value)) {
          min2 = value;
        }
      }
    }
    return min2;
  }

  // node_modules/d3-dispatch/src/dispatch.js
  var noop = { value: () => {
  } };
  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }
  function Dispatch(_) {
    this._ = _;
  }
  function parseTypenames2(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return { type: t, name };
    });
  }
  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._, T = parseTypenames2(typename + "", _), t, i = -1, n = T.length;
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }
      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };
  function get(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }
  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({ name, value: callback });
    return type;
  }
  var dispatch_default2 = dispatch;

  // node_modules/d3-timer/src/timer.js
  var frame = 0;
  var timeout = 0;
  var interval = 0;
  var pokeDelay = 1e3;
  var taskHead;
  var taskTail;
  var clockLast = 0;
  var clockNow = 0;
  var clockSkew = 0;
  var clock = typeof performance === "object" && performance.now ? performance : Date;
  var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
    setTimeout(f, 17);
  };
  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }
  function clearNow() {
    clockNow = 0;
  }
  function Timer() {
    this._call = this._time = this._next = null;
  }
  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;
        else taskHead = this;
        taskTail = this;
      }
      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };
  function timer(callback, delay, time) {
    var t = new Timer();
    t.restart(callback, delay, time);
    return t;
  }
  function timerFlush() {
    now();
    ++frame;
    var t = taskHead, e;
    while (t) {
      if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
      t = t._next;
    }
    --frame;
  }
  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout = 0;
    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }
  function poke() {
    var now2 = clock.now(), delay = now2 - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now2;
  }
  function nap() {
    var t0, t1 = taskHead, t2, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }
    taskTail = t0;
    sleep(time);
  }
  function sleep(time) {
    if (frame) return;
    if (timeout) timeout = clearTimeout(timeout);
    var delay = time - clockNow;
    if (delay > 24) {
      if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval) interval = clearInterval(interval);
    } else {
      if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  // node_modules/d3-timer/src/timeout.js
  function timeout_default(callback, delay, time) {
    var t = new Timer();
    delay = delay == null ? 0 : +delay;
    t.restart((elapsed) => {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  // node_modules/d3-transition/src/transition/schedule.js
  var emptyOn = dispatch_default2("start", "end", "cancel", "interrupt");
  var emptyTween = [];
  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;
  function schedule_default(node, name, id2, index, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};
    else if (id2 in schedules) return;
    create(node, id2, {
      name,
      index,
      // For context during callback.
      group,
      // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }
  function init(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }
  function set2(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }
  function get2(node, id2) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id2])) throw new Error("transition not found");
    return schedule;
  }
  function create(node, id2, self) {
    var schedules = node.__transition, tween;
    schedules[id2] = self;
    self.timer = timer(schedule, 0, self.time);
    function schedule(elapsed) {
      self.state = SCHEDULED;
      self.timer.restart(start2, self.delay, self.time);
      if (self.delay <= elapsed) start2(elapsed - self.delay);
    }
    function start2(elapsed) {
      var i, j, n, o;
      if (self.state !== SCHEDULED) return stop();
      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self.name) continue;
        if (o.state === STARTED) return timeout_default(start2);
        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        } else if (+i < id2) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("cancel", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }
      }
      timeout_default(function() {
        if (self.state === STARTED) {
          self.state = RUNNING;
          self.timer.restart(tick, self.delay, self.time);
          tick(elapsed);
        }
      });
      self.state = STARTING;
      self.on.call("start", node, node.__data__, self.index, self.group);
      if (self.state !== STARTING) return;
      self.state = STARTED;
      tween = new Array(n = self.tween.length);
      for (i = 0, j = -1; i < n; ++i) {
        if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
          tween[++j] = o;
        }
      }
      tween.length = j + 1;
    }
    function tick(elapsed) {
      var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1), i = -1, n = tween.length;
      while (++i < n) {
        tween[i].call(node, t);
      }
      if (self.state === ENDING) {
        self.on.call("end", node, node.__data__, self.index, self.group);
        stop();
      }
    }
    function stop() {
      self.state = ENDED;
      self.timer.stop();
      delete schedules[id2];
      for (var i in schedules) return;
      delete node.__transition;
    }
  }

  // node_modules/d3-transition/src/interrupt.js
  function interrupt_default(node, name) {
    var schedules = node.__transition, schedule, active, empty2 = true, i;
    if (!schedules) return;
    name = name == null ? null : name + "";
    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name) {
        empty2 = false;
        continue;
      }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }
    if (empty2) delete node.__transition;
  }

  // node_modules/d3-transition/src/selection/interrupt.js
  function interrupt_default2(name) {
    return this.each(function() {
      interrupt_default(this, name);
    });
  }

  // node_modules/d3-color/src/define.js
  function define_default(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }
  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  // node_modules/d3-color/src/color.js
  function Color() {
  }
  var darker = 0.7;
  var brighter = 1 / darker;
  var reI = "\\s*([+-]?\\d+)\\s*";
  var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
  var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
  var reHex = /^#([0-9a-f]{3,8})$/;
  var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
  var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
  var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
  var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
  var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
  var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
  var named = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  };
  define_default(Color, color, {
    copy(channels) {
      return Object.assign(new this.constructor(), this, channels);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: color_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHex8: color_formatHex8,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });
  function color_formatHex() {
    return this.rgb().formatHex();
  }
  function color_formatHex8() {
    return this.rgb().formatHex8();
  }
  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }
  function color_formatRgb() {
    return this.rgb().formatRgb();
  }
  function color(format) {
    var m, l;
    format = (format + "").trim().toLowerCase();
    return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
  }
  function rgbn(n) {
    return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
  }
  function rgba(r2, g, b, a) {
    if (a <= 0) r2 = g = b = NaN;
    return new Rgb(r2, g, b, a);
  }
  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb();
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }
  function rgb(r2, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r2) : new Rgb(r2, g, b, opacity == null ? 1 : opacity);
  }
  function Rgb(r2, g, b, opacity) {
    this.r = +r2;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }
  define_default(Rgb, rgb, extend(Color, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatHex8: rgb_formatHex8,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));
  function rgb_formatHex() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
  }
  function rgb_formatHex8() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function rgb_formatRgb() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
  }
  function clampa(opacity) {
    return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
  }
  function clampi(value) {
    return Math.max(0, Math.min(255, Math.round(value) || 0));
  }
  function hex(value) {
    value = clampi(value);
    return (value < 16 ? "0" : "") + value.toString(16);
  }
  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }
  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl();
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r2 = o.r / 255, g = o.g / 255, b = o.b / 255, min2 = Math.min(r2, g, b), max2 = Math.max(r2, g, b), h = NaN, s = max2 - min2, l = (max2 + min2) / 2;
    if (s) {
      if (r2 === max2) h = (g - b) / s + (g < b) * 6;
      else if (g === max2) h = (b - r2) / s + 2;
      else h = (r2 - g) / s + 4;
      s /= l < 0.5 ? max2 + min2 : 2 - max2 - min2;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }
  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }
  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }
  define_default(Hsl, hsl, extend(Color, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb() {
      var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    clamp() {
      return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
    }
  }));
  function clamph(value) {
    value = (value || 0) % 360;
    return value < 0 ? value + 360 : value;
  }
  function clampt(value) {
    return Math.max(0, Math.min(1, value || 0));
  }
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
  }

  // node_modules/d3-interpolate/src/basis.js
  function basis(t1, v0, v1, v2, v3) {
    var t2 = t1 * t1, t3 = t2 * t1;
    return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
  }
  function basis_default(values) {
    var n = values.length - 1;
    return function(t) {
      var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  // node_modules/d3-interpolate/src/basisClosed.js
  function basisClosed_default(values) {
    var n = values.length;
    return function(t) {
      var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  // node_modules/d3-interpolate/src/constant.js
  var constant_default2 = (x) => () => x;

  // node_modules/d3-interpolate/src/color.js
  function linear(a, d) {
    return function(t) {
      return a + t * d;
    };
  }
  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
      return Math.pow(a + t * b, y);
    };
  }
  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y) : constant_default2(isNaN(a) ? b : a);
    };
  }
  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant_default2(isNaN(a) ? b : a);
  }

  // node_modules/d3-interpolate/src/rgb.js
  var rgb_default = function rgbGamma(y) {
    var color2 = gamma(y);
    function rgb2(start2, end) {
      var r2 = color2((start2 = rgb(start2)).r, (end = rgb(end)).r), g = color2(start2.g, end.g), b = color2(start2.b, end.b), opacity = nogamma(start2.opacity, end.opacity);
      return function(t) {
        start2.r = r2(t);
        start2.g = g(t);
        start2.b = b(t);
        start2.opacity = opacity(t);
        return start2 + "";
      };
    }
    rgb2.gamma = rgbGamma;
    return rgb2;
  }(1);
  function rgbSpline(spline) {
    return function(colors) {
      var n = colors.length, r2 = new Array(n), g = new Array(n), b = new Array(n), i, color2;
      for (i = 0; i < n; ++i) {
        color2 = rgb(colors[i]);
        r2[i] = color2.r || 0;
        g[i] = color2.g || 0;
        b[i] = color2.b || 0;
      }
      r2 = spline(r2);
      g = spline(g);
      b = spline(b);
      color2.opacity = 1;
      return function(t) {
        color2.r = r2(t);
        color2.g = g(t);
        color2.b = b(t);
        return color2 + "";
      };
    };
  }
  var rgbBasis = rgbSpline(basis_default);
  var rgbBasisClosed = rgbSpline(basisClosed_default);

  // node_modules/d3-interpolate/src/number.js
  function number_default(a, b) {
    return a = +a, b = +b, function(t) {
      return a * (1 - t) + b * t;
    };
  }

  // node_modules/d3-interpolate/src/string.js
  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
  var reB = new RegExp(reA.source, "g");
  function zero(b) {
    return function() {
      return b;
    };
  }
  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }
  function string_default(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
    a = a + "", b = b + "";
    while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) {
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs;
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) {
        if (s[i]) s[i] += bm;
        else s[++i] = bm;
      } else {
        s[++i] = null;
        q.push({ i, x: number_default(am, bm) });
      }
      bi = reB.lastIndex;
    }
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs;
      else s[++i] = bs;
    }
    return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
      for (var i2 = 0, o; i2 < b; ++i2) s[(o = q[i2]).i] = o.x(t);
      return s.join("");
    });
  }

  // node_modules/d3-interpolate/src/transform/decompose.js
  var degrees = 180 / Math.PI;
  var identity = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function decompose_default(a, b, c, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
    if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX,
      scaleY
    };
  }

  // node_modules/d3-interpolate/src/transform/parse.js
  var svgNode;
  function parseCss(value) {
    const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
    return m.isIdentity ? identity : decompose_default(m.a, m.b, m.c, m.d, m.e, m.f);
  }
  function parseSvg(value) {
    if (value == null) return identity;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
    value = value.matrix;
    return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  // node_modules/d3-interpolate/src/transform/index.js
  function interpolateTransform(parse, pxComma, pxParen, degParen) {
    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }
    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }
    function rotate(a, b, s, q) {
      if (a !== b) {
        if (a - b > 180) b += 360;
        else if (b - a > 180) a += 360;
        q.push({ i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number_default(a, b) });
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }
    function skewX(a, b, s, q) {
      if (a !== b) {
        q.push({ i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number_default(a, b) });
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }
    function scale(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }
    return function(a, b) {
      var s = [], q = [];
      a = parse(a), b = parse(b);
      translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
      rotate(a.rotate, b.rotate, s, q);
      skewX(a.skewX, b.skewX, s, q);
      scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
      a = b = null;
      return function(t) {
        var i = -1, n = q.length, o;
        while (++i < n) s[(o = q[i]).i] = o.x(t);
        return s.join("");
      };
    };
  }
  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  // node_modules/d3-transition/src/transition/tween.js
  function tweenRemove(id2, name) {
    var tween0, tween1;
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }
      schedule.tween = tween1;
    };
  }
  function tweenFunction(id2, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error();
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t = { name, value }, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1[i] = t;
            break;
          }
        }
        if (i === n) tween1.push(t);
      }
      schedule.tween = tween1;
    };
  }
  function tween_default(name, value) {
    var id2 = this._id;
    name += "";
    if (arguments.length < 2) {
      var tween = get2(this.node(), id2).tween;
      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name) {
          return t.value;
        }
      }
      return null;
    }
    return this.each((value == null ? tweenRemove : tweenFunction)(id2, name, value));
  }
  function tweenValue(transition2, name, value) {
    var id2 = transition2._id;
    transition2.each(function() {
      var schedule = set2(this, id2);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });
    return function(node) {
      return get2(node, id2).value[name];
    };
  }

  // node_modules/d3-transition/src/transition/interpolate.js
  function interpolate_default(a, b) {
    var c;
    return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c = color(b)) ? (b = c, rgb_default) : string_default)(a, b);
  }

  // node_modules/d3-transition/src/transition/attr.js
  function attrRemove2(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS2(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant2(name, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function attrConstantNS2(fullname, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function attrFunction2(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function attrFunctionNS2(fullname, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function attr_default2(name, value) {
    var fullname = namespace_default(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
    return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS2 : attrFunction2)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS2 : attrRemove2)(fullname) : (fullname.local ? attrConstantNS2 : attrConstant2)(fullname, i, value));
  }

  // node_modules/d3-transition/src/transition/attrTween.js
  function attrInterpolate(name, i) {
    return function(t) {
      this.setAttribute(name, i.call(this, t));
    };
  }
  function attrInterpolateNS(fullname, i) {
    return function(t) {
      this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
    };
  }
  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween(name, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween_default(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    var fullname = namespace_default(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  // node_modules/d3-transition/src/transition/delay.js
  function delayFunction(id2, value) {
    return function() {
      init(this, id2).delay = +value.apply(this, arguments);
    };
  }
  function delayConstant(id2, value) {
    return value = +value, function() {
      init(this, id2).delay = value;
    };
  }
  function delay_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id2, value)) : get2(this.node(), id2).delay;
  }

  // node_modules/d3-transition/src/transition/duration.js
  function durationFunction(id2, value) {
    return function() {
      set2(this, id2).duration = +value.apply(this, arguments);
    };
  }
  function durationConstant(id2, value) {
    return value = +value, function() {
      set2(this, id2).duration = value;
    };
  }
  function duration_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id2, value)) : get2(this.node(), id2).duration;
  }

  // node_modules/d3-transition/src/transition/ease.js
  function easeConstant(id2, value) {
    if (typeof value !== "function") throw new Error();
    return function() {
      set2(this, id2).ease = value;
    };
  }
  function ease_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each(easeConstant(id2, value)) : get2(this.node(), id2).ease;
  }

  // node_modules/d3-transition/src/transition/easeVarying.js
  function easeVarying(id2, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (typeof v !== "function") throw new Error();
      set2(this, id2).ease = v;
    };
  }
  function easeVarying_default(value) {
    if (typeof value !== "function") throw new Error();
    return this.each(easeVarying(this._id, value));
  }

  // node_modules/d3-transition/src/transition/filter.js
  function filter_default2(match) {
    if (typeof match !== "function") match = matcher_default(match);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  // node_modules/d3-transition/src/transition/merge.js
  function merge_default2(transition2) {
    if (transition2._id !== this._id) throw new Error();
    for (var groups0 = this._groups, groups1 = transition2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Transition(merges, this._parents, this._name, this._id);
  }

  // node_modules/d3-transition/src/transition/on.js
  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function(t) {
      var i = t.indexOf(".");
      if (i >= 0) t = t.slice(0, i);
      return !t || t === "start";
    });
  }
  function onFunction(id2, name, listener) {
    var on0, on1, sit = start(name) ? init : set2;
    return function() {
      var schedule = sit(this, id2), on = schedule.on;
      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
      schedule.on = on1;
    };
  }
  function on_default2(name, listener) {
    var id2 = this._id;
    return arguments.length < 2 ? get2(this.node(), id2).on.on(name) : this.each(onFunction(id2, name, listener));
  }

  // node_modules/d3-transition/src/transition/remove.js
  function removeFunction(id2) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition) if (+i !== id2) return;
      if (parent) parent.removeChild(this);
    };
  }
  function remove_default2() {
    return this.on("end.remove", removeFunction(this._id));
  }

  // node_modules/d3-transition/src/transition/select.js
  function select_default3(select) {
    var name = this._name, id2 = this._id;
    if (typeof select !== "function") select = selector_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule_default(subgroup[i], name, id2, i, subgroup, get2(node, id2));
        }
      }
    }
    return new Transition(subgroups, this._parents, name, id2);
  }

  // node_modules/d3-transition/src/transition/selectAll.js
  function selectAll_default2(select) {
    var name = this._name, id2 = this._id;
    if (typeof select !== "function") select = selectorAll_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children2 = select.call(node, node.__data__, i, group), child, inherit2 = get2(node, id2), k = 0, l = children2.length; k < l; ++k) {
            if (child = children2[k]) {
              schedule_default(child, name, id2, k, children2, inherit2);
            }
          }
          subgroups.push(children2);
          parents.push(node);
        }
      }
    }
    return new Transition(subgroups, parents, name, id2);
  }

  // node_modules/d3-transition/src/transition/selection.js
  var Selection2 = selection_default.prototype.constructor;
  function selection_default2() {
    return new Selection2(this._groups, this._parents);
  }

  // node_modules/d3-transition/src/transition/style.js
  function styleNull(name, interpolate) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }
  function styleRemove2(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant2(name, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = styleValue(this, name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function styleFunction2(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function styleMaybeRemove(id2, name) {
    var on0, on1, listener0, key = "style." + name, event = "end." + key, remove2;
    return function() {
      var schedule = set2(this, id2), on = schedule.on, listener = schedule.value[key] == null ? remove2 || (remove2 = styleRemove2(name)) : void 0;
      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
      schedule.on = on1;
    };
  }
  function style_default2(name, value, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
    return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove2(name)) : typeof value === "function" ? this.styleTween(name, styleFunction2(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant2(name, i, value), priority).on("end.style." + name, null);
  }

  // node_modules/d3-transition/src/transition/styleTween.js
  function styleInterpolate(name, i, priority) {
    return function(t) {
      this.style.setProperty(name, i.call(this, t), priority);
    };
  }
  function styleTween(name, value, priority) {
    var t, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
      return t;
    }
    tween._value = value;
    return tween;
  }
  function styleTween_default(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  // node_modules/d3-transition/src/transition/text.js
  function textConstant2(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction2(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }
  function text_default2(value) {
    return this.tween("text", typeof value === "function" ? textFunction2(tweenValue(this, "text", value)) : textConstant2(value == null ? "" : value + ""));
  }

  // node_modules/d3-transition/src/transition/textTween.js
  function textInterpolate(i) {
    return function(t) {
      this.textContent = i.call(this, t);
    };
  }
  function textTween(value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function textTween_default(value) {
    var key = "text";
    if (arguments.length < 1) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, textTween(value));
  }

  // node_modules/d3-transition/src/transition/transition.js
  function transition_default() {
    var name = this._name, id0 = this._id, id1 = newId();
    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit2 = get2(node, id0);
          schedule_default(node, name, id1, i, group, {
            time: inherit2.time + inherit2.delay + inherit2.duration,
            delay: 0,
            duration: inherit2.duration,
            ease: inherit2.ease
          });
        }
      }
    }
    return new Transition(groups, this._parents, name, id1);
  }

  // node_modules/d3-transition/src/transition/end.js
  function end_default() {
    var on0, on1, that = this, id2 = that._id, size = that.size();
    return new Promise(function(resolve, reject) {
      var cancel = { value: reject }, end = { value: function() {
        if (--size === 0) resolve();
      } };
      that.each(function() {
        var schedule = set2(this, id2), on = schedule.on;
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }
        schedule.on = on1;
      });
      if (size === 0) resolve();
    });
  }

  // node_modules/d3-transition/src/transition/index.js
  var id = 0;
  function Transition(groups, parents, name, id2) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id2;
  }
  function transition(name) {
    return selection_default().transition(name);
  }
  function newId() {
    return ++id;
  }
  var selection_prototype = selection_default.prototype;
  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: select_default3,
    selectAll: selectAll_default2,
    selectChild: selection_prototype.selectChild,
    selectChildren: selection_prototype.selectChildren,
    filter: filter_default2,
    merge: merge_default2,
    selection: selection_default2,
    transition: transition_default,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: on_default2,
    attr: attr_default2,
    attrTween: attrTween_default,
    style: style_default2,
    styleTween: styleTween_default,
    text: text_default2,
    textTween: textTween_default,
    remove: remove_default2,
    tween: tween_default,
    delay: delay_default,
    duration: duration_default,
    ease: ease_default,
    easeVarying: easeVarying_default,
    end: end_default,
    [Symbol.iterator]: selection_prototype[Symbol.iterator]
  };

  // node_modules/d3-ease/src/cubic.js
  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  // node_modules/d3-transition/src/selection/transition.js
  var defaultTiming = {
    time: null,
    // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };
  function inherit(node, id2) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id2])) {
      if (!(node = node.parentNode)) {
        throw new Error(`transition ${id2} not found`);
      }
    }
    return timing;
  }
  function transition_default2(name) {
    var id2, timing;
    if (name instanceof Transition) {
      id2 = name._id, name = name._name;
    } else {
      id2 = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
    }
    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule_default(node, name, id2, i, group, timing || inherit(node, id2));
        }
      }
    }
    return new Transition(groups, this._parents, name, id2);
  }

  // node_modules/d3-transition/src/selection/index.js
  selection_default.prototype.interrupt = interrupt_default2;
  selection_default.prototype.transition = transition_default2;

  // src/composite-renderer.ts
  var CompositeRenderer = class {
    constructor(options) {
      this.options = options;
    }
    getPreferredFamSize(id2) {
      return [0, 0];
    }
    setPreferredIndiSize(indi) {
      if (!indi) {
        return;
      }
      [indi.width, indi.height] = this.getPreferredIndiSize(indi.id);
    }
    updateNodes(nodes) {
      const indiVSizePerDepth = /* @__PURE__ */ new Map();
      nodes.forEach((node) => {
        this.setPreferredIndiSize(node.data.indi);
        this.setPreferredIndiSize(node.data.spouse);
        const family = node.data.family;
        if (family) {
          [family.width, family.height] = this.getPreferredFamSize(family.id);
        }
        const depth = node.depth;
        const maxIndiVSize = max([
          getIndiVSize(node.data, !!this.options.horizontal),
          indiVSizePerDepth.get(depth)
        ]);
        indiVSizePerDepth.set(depth, maxIndiVSize);
      });
      nodes.forEach((node) => {
        if (this.options.horizontal) {
          if (node.data.indi) {
            node.data.indi.width = indiVSizePerDepth.get(node.depth);
          }
          if (node.data.spouse) {
            node.data.spouse.width = indiVSizePerDepth.get(node.depth);
          }
        } else {
          if (node.data.indi) {
            node.data.indi.height = indiVSizePerDepth.get(node.depth);
          }
          if (node.data.spouse) {
            node.data.spouse.height = indiVSizePerDepth.get(node.depth);
          }
        }
        const vSize = getVSize(node.data, !!this.options.horizontal);
        const hSize = getHSize(node.data, !!this.options.horizontal);
        [node.data.width, node.data.height] = this.options.horizontal ? [vSize, hSize] : [hSize, vSize];
      });
    }
    getFamilyAnchor(node) {
      if (this.options.horizontal) {
        const x2 = -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
        const famYOffset = node.family ? max([-getFamPositionHorizontal(node), 0]) : 0;
        const y2 = -(node.indi && node.spouse ? node.height / 2 - node.indi.height : 0) + famYOffset;
        return [x2, y2];
      }
      const famXOffset = node.family ? max([-getFamPositionVertical(node), 0]) : 0;
      const x = -(node.indi && node.spouse ? node.width / 2 - node.indi.width : 0) + famXOffset;
      const y = -node.height / 2 + getIndiVSize(node, this.options.horizontal) / 2;
      return [x, y];
    }
    getSpouseAnchor(node) {
      if (this.options.horizontal) {
        const x2 = -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
        const y2 = node.indi ? node.indi.height / 2 : 0;
        return [x2, y2];
      }
      const x = node.indi ? node.indi.width / 2 : 0;
      const y = -node.height / 2 + getIndiVSize(node, !!this.options.horizontal) / 2;
      return [x, y];
    }
    getIndiAnchor(node) {
      if (this.options.horizontal) {
        const x2 = -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
        const y2 = node.spouse ? -node.spouse.height / 2 : 0;
        return [x2, y2];
      }
      const x = node.spouse ? -node.spouse.width / 2 : 0;
      const y = -node.height / 2 + getIndiVSize(node, !!this.options.horizontal) / 2;
      return [x, y];
    }
  };
  function getFamPositionVertical(node) {
    const indiWidth = node.indi ? node.indi.width : 0;
    const spouseWidth = node.spouse ? node.spouse.width : 0;
    const familyWidth = node.family.width;
    if (!node.indi || !node.spouse || indiWidth + spouseWidth <= familyWidth) {
      return (indiWidth + spouseWidth - familyWidth) / 2;
    }
    if (familyWidth / 2 >= spouseWidth) {
      return indiWidth + spouseWidth - familyWidth;
    }
    if (familyWidth / 2 >= indiWidth) {
      return 0;
    }
    return indiWidth - familyWidth / 2;
  }
  function getFamPositionHorizontal(node) {
    const indiHeight = node.indi ? node.indi.height : 0;
    const spouseHeight = node.spouse ? node.spouse.height : 0;
    const familyHeight = node.family.height;
    if (!node.indi || !node.spouse) {
      return (indiHeight + spouseHeight - familyHeight) / 2;
    }
    return indiHeight - familyHeight / 2;
  }
  function getHSize(node, horizontal) {
    if (horizontal) {
      return (node.indi ? node.indi.height : 0) + (node.spouse ? node.spouse.height : 0);
    }
    const indiHSize = (node.indi ? node.indi.width : 0) + (node.spouse ? node.spouse.width : 0);
    return max([indiHSize, node.family ? node.family.width : 0]);
  }
  function getFamVSize(node, horizontal) {
    if (horizontal) {
      return node.family ? node.family.width : 0;
    }
    return node.family ? node.family.height : 0;
  }
  function getIndiVSize(node, horizontal) {
    if (horizontal) {
      return max([
        node.indi ? node.indi.width : 0,
        node.spouse ? node.spouse.width : 0
      ]);
    }
    return max([
      node.indi ? node.indi.height : 0,
      node.spouse ? node.spouse.height : 0
    ]);
  }
  function getVSize(node, horizontal) {
    return getIndiVSize(node, horizontal) + getFamVSize(node, horizontal);
  }

  // src/chart-util.ts
  var H_SPACING = 15;
  var V_SPACING = 34;
  var MARGIN = 15;
  var HIDE_TIME_MS = 200;
  var MOVE_TIME_MS = 500;
  function getExpanderCss() {
    return `
.expander {
  fill: white;
  stroke: black;
  stroke-width: 2px;
  cursor: pointer;
}`;
  }
  function linkId(node) {
    if (!node.parent) {
      return `${node.id}:A`;
    }
    const [child, parent] = node.data.generation > node.parent.data.generation ? [node.data, node.parent.data] : [node.parent.data, node.data];
    if (child.additionalMarriage) {
      return `${child.id}:A`;
    }
    return `${parent.id}:${child.id}`;
  }
  function getChartInfo(nodes) {
    const x0 = min(nodes, (d) => d.x - d.data.width / 2) - MARGIN;
    const y0 = min(nodes, (d) => d.y - d.data.height / 2) - MARGIN;
    const x1 = max(nodes, (d) => d.x + d.data.width / 2) + MARGIN;
    const y1 = max(nodes, (d) => d.y + d.data.height / 2) + MARGIN;
    return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
  }
  function getChartInfoWithoutMargin(nodes) {
    const x0 = min(nodes, (d) => d.x - d.data.width / 2);
    const y0 = min(nodes, (d) => d.y - d.data.height / 2);
    const x1 = max(nodes, (d) => d.x + d.data.width / 2);
    const y1 = max(nodes, (d) => d.y + d.data.height / 2);
    return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
  }
  var ChartUtil = class {
    constructor(options) {
      this.options = options;
    }
    /** Creates a path from parent to the child node (horizontal layout). */
    linkHorizontal(s, d) {
      const sAnchor = this.options.renderer.getFamilyAnchor(s.data);
      const dAnchor = s.id === d.data.spouseParentNodeId ? this.options.renderer.getSpouseAnchor(d.data) : this.options.renderer.getIndiAnchor(d.data);
      const [sx, sy] = [s.x + sAnchor[0], s.y + sAnchor[1]];
      const [dx, dy] = [d.x + dAnchor[0], d.y + dAnchor[1]];
      const midX = (s.x + s.data.width / 2 + d.x - d.data.width / 2) / 2;
      return `M ${sx} ${sy}
            L ${midX} ${sy},
              ${midX} ${dy},
              ${dx} ${dy}`;
    }
    /** Creates a path from parent to the child node (vertical layout). */
    linkVertical(s, d) {
      const sAnchor = this.options.renderer.getFamilyAnchor(s.data);
      const dAnchor = s.id === d.data.spouseParentNodeId ? this.options.renderer.getSpouseAnchor(d.data) : this.options.renderer.getIndiAnchor(d.data);
      const [sx, sy] = [s.x + sAnchor[0], s.y + sAnchor[1]];
      const [dx, dy] = [d.x + dAnchor[0], d.y + dAnchor[1]];
      const midY = s.y + s.data.height / 2 + V_SPACING / 2;
      return `M ${sx} ${sy}
            L ${sx} ${midY},
              ${dx} ${midY},
              ${dx} ${dy}`;
    }
    linkAdditionalMarriage(node) {
      const nodeIndex = node.parent.children.findIndex(
        (n) => n.data.id === node.data.id
      );
      const siblingNode = node.parent.children[nodeIndex - 1];
      const sAnchor = this.options.renderer.getIndiAnchor(node.data);
      const dAnchor = this.options.renderer.getIndiAnchor(siblingNode.data);
      const [sx, sy] = [node.x + sAnchor[0], node.y + sAnchor[1]];
      const [dx, dy] = [siblingNode.x + dAnchor[0], siblingNode.y + dAnchor[1]];
      return `M ${sx}, ${sy}
            L ${dx}, ${dy}`;
    }
    updateSvgDimensions(chartInfo) {
      const svg = select_default2(this.options.svgSelector);
      const group = svg.select("g");
      const transition2 = this.options.animate ? group.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS) : group;
      transition2.attr(
        "transform",
        `translate(${chartInfo.origin[0]}, ${chartInfo.origin[1]})`
      );
    }
    layOutChart(root2, layoutOptions = {}) {
      const svg = select_default2(this.options.svgSelector);
      if (svg.select("style").empty()) {
        svg.append("style").text(this.options.renderer.getCss() + getExpanderCss());
      }
      root2.each((node) => {
        node.data.generation = node.depth * (layoutOptions.flipVertically ? -1 : 1) + (this.options.baseGeneration || 0);
      });
      this.options.renderer.updateNodes(root2.descendants());
      const vSizePerDepth = /* @__PURE__ */ new Map();
      root2.each((node) => {
        const depth = node.depth;
        const maxVSize = max([
          this.options.horizontal ? node.data.width : node.data.height,
          vSizePerDepth.get(depth)
        ]);
        vSizePerDepth.set(depth, maxVSize);
      });
      root2.each((node) => {
        const vSize = vSizePerDepth.get(node.depth);
        if (this.options.horizontal) {
          node.data.width = vSize;
        } else {
          node.data.height = vSize;
        }
      });
      const vSpacing = layoutOptions.vSpacing !== void 0 ? layoutOptions.vSpacing : V_SPACING;
      const hSpacing = layoutOptions.hSpacing !== void 0 ? layoutOptions.hSpacing : H_SPACING;
      const treemap = flextree().nodeSize((node) => {
        if (this.options.horizontal) {
          const maxChildSize2 = max(node.children || [], (n) => n.data.width) || 0;
          return [
            node.data.height,
            (maxChildSize2 + node.data.width) / 2 + vSpacing
          ];
        }
        const maxChildSize = max(node.children || [], (n) => n.data.height) || 0;
        return [
          node.data.width,
          (maxChildSize + node.data.height) / 2 + vSpacing
        ];
      }).spacing((a, b) => hSpacing);
      const nodes = treemap(root2).descendants();
      nodes.forEach((node) => {
        if (layoutOptions.flipVertically) {
          node.y = -node.y;
        }
        if (this.options.horizontal) {
          [node.x, node.y] = [node.y, node.x];
        }
      });
      return nodes;
    }
    renderChart(nodes) {
      const svg = this.getSvgForRendering();
      const nodeAnimation = this.renderNodes(nodes, svg);
      const linkAnimation = this.renderLinks(nodes, svg);
      const expanderAnimation = this.renderControls(nodes, svg);
      return Promise.all([
        nodeAnimation,
        linkAnimation,
        expanderAnimation
      ]);
    }
    renderNodes(nodes, svg) {
      const animationPromise = new Promise((resolve) => {
        const boundNodes = svg.select("g").selectAll("g.node").data(nodes, (d) => d.id);
        const nodeEnter = boundNodes.enter().append("g");
        let transitionsPending = boundNodes.exit().size() + boundNodes.size() + nodeEnter.size();
        const transitionDone = () => {
          transitionsPending--;
          if (transitionsPending === 0) {
            resolve();
          }
        };
        if (!this.options.animate || transitionsPending === 0) {
          resolve();
        }
        nodeEnter.merge(boundNodes).attr("class", (node) => `node generation${node.data.generation}`);
        nodeEnter.attr(
          "transform",
          (node) => `translate(${node.x - node.data.width / 2}, ${node.y - node.data.height / 2})`
        );
        if (this.options.animate) {
          nodeEnter.style("opacity", 0).transition().delay(HIDE_TIME_MS + MOVE_TIME_MS).duration(HIDE_TIME_MS).style("opacity", 1).on("end", transitionDone);
        }
        const updateTransition = this.options.animate ? boundNodes.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS).on("end", transitionDone) : boundNodes;
        updateTransition.attr(
          "transform",
          (node) => `translate(${node.x - node.data.width / 2}, ${node.y - node.data.height / 2})`
        );
        this.options.renderer.render(nodeEnter, boundNodes);
        if (this.options.animate) {
          boundNodes.exit().transition().duration(HIDE_TIME_MS).style("opacity", 0).remove().on("end", transitionDone);
        } else {
          boundNodes.exit().remove();
        }
      });
      return animationPromise;
    }
    renderLinks(nodes, svg) {
      const animationPromise = new Promise((resolve) => {
        const link = (parent, child) => {
          if (child.data.additionalMarriage) {
            return this.linkAdditionalMarriage(child);
          }
          const flipVertically = parent.data.generation > child.data.generation;
          if (this.options.horizontal) {
            if (flipVertically) {
              return this.linkHorizontal(child, parent);
            }
            return this.linkHorizontal(parent, child);
          }
          if (flipVertically) {
            return this.linkVertical(child, parent);
          }
          return this.linkVertical(parent, child);
        };
        const links = nodes.filter(
          (n) => !!n.parent || n.data.additionalMarriage
        );
        const boundLinks = svg.select("g").selectAll("path.link").data(links, linkId);
        const path = boundLinks.enter().insert("path", "g").attr(
          "class",
          (node) => node.data.additionalMarriage ? "link additional-marriage" : "link"
        ).attr("d", (node) => link(node.parent, node));
        let transitionsPending = boundLinks.exit().size() + boundLinks.size() + path.size();
        const transitionDone = () => {
          transitionsPending--;
          if (transitionsPending === 0) {
            resolve();
          }
        };
        if (!this.options.animate || transitionsPending === 0) {
          resolve();
        }
        const linkTransition = this.options.animate ? boundLinks.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS).on("end", transitionDone) : boundLinks;
        linkTransition.attr("d", (node) => link(node.parent, node));
        if (this.options.animate) {
          path.style("opacity", 0).transition().delay(2 * HIDE_TIME_MS + MOVE_TIME_MS).duration(0).style("opacity", 1).on("end", transitionDone);
        }
        if (this.options.animate) {
          boundLinks.exit().transition().duration(0).style("opacity", 0).remove().on("end", transitionDone);
        } else {
          boundLinks.exit().remove();
        }
      });
      return animationPromise;
    }
    renderExpander(nodes, stateGetter, clickCallback) {
      nodes = nodes.filter((node) => stateGetter(node) !== void 0);
      nodes.on("click", (event, data) => {
        clickCallback?.(data.id);
      });
      nodes.append("rect").attr("width", 12).attr("height", 12);
      nodes.append("line").attr("x1", 3).attr("y1", 6).attr("x2", 9).attr("y2", 6).attr("stroke", "black");
      nodes.filter((node) => stateGetter(node) === 0 /* PLUS */).append("line").attr("x1", 6).attr("y1", 3).attr("x2", 6).attr("y2", 9).attr("stroke", "black");
    }
    renderFamilyControls(nodes) {
      const boundNodes = nodes.selectAll("g.familyExpander").data((node) => node.data.family?.expander !== void 0 ? [node] : []);
      const nodeEnter = boundNodes.enter().append("g").attr("class", "familyExpander expander");
      const merged = nodeEnter.merge(boundNodes);
      const updateTransition = this.options.animate ? merged.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS) : merged;
      updateTransition.attr("transform", (node) => {
        const anchor = this.options.renderer.getFamilyAnchor(node.data);
        return `translate(${anchor[0] - 6}, ${-node.data.height / 2 + getVSize(node.data, !!this.options.horizontal)})`;
      });
      this.renderExpander(
        merged,
        (node) => node.data.family?.expander,
        (id2) => this.options.expanderCallback?.(id2, 2 /* FAMILY */)
      );
      boundNodes.exit().remove();
    }
    renderIndiControls(nodes) {
      const boundNodes = nodes.selectAll("g.indiExpander").data((node) => node.data.indi?.expander !== void 0 ? [node] : []);
      const nodeEnter = boundNodes.enter().append("g").attr("class", "indiExpander expander");
      const merged = nodeEnter.merge(boundNodes);
      const updateTransition = this.options.animate ? merged.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS) : merged;
      updateTransition.attr("transform", (node) => {
        const anchor = this.options.renderer.getIndiAnchor(node.data);
        return `translate(${anchor[0] - 6}, ${-node.data.height / 2 - 12})`;
      });
      this.renderExpander(
        merged,
        (node) => node.data.indi?.expander,
        (id2) => this.options.expanderCallback?.(id2, 0 /* INDI */)
      );
      boundNodes.exit().remove();
    }
    renderSpouseControls(nodes) {
      const boundNodes = nodes.selectAll("g.spouseExpander").data((node) => node.data.spouse?.expander !== void 0 ? [node] : []);
      const nodeEnter = boundNodes.enter().append("g").attr("class", "spouseExpander expander");
      const merged = nodeEnter.merge(boundNodes);
      const updateTransition = this.options.animate ? merged.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS) : merged;
      updateTransition.attr("transform", (node) => {
        const anchor = this.options.renderer.getSpouseAnchor(node.data);
        return `translate(${anchor[0] - 6}, ${-node.data.height / 2 - 12})`;
      });
      this.renderExpander(
        merged,
        (node) => node.data.spouse?.expander,
        (id2) => this.options.expanderCallback?.(id2, 1 /* SPOUSE */)
      );
      boundNodes.exit().remove();
    }
    renderControls(nodes, svg) {
      if (!this.options.expanders) {
        return Promise.resolve();
      }
      const animationPromise = new Promise((resolve) => {
        const boundNodes = svg.select("g").selectAll("g.controls").data(nodes, (d) => d.id);
        const nodeEnter = boundNodes.enter().append("g").attr("class", "controls");
        nodeEnter.attr(
          "transform",
          (node) => `translate(${node.x}, ${node.y})`
        );
        let transitionsPending = boundNodes.exit().size() + boundNodes.size() + nodeEnter.size();
        const transitionDone = () => {
          transitionsPending--;
          if (transitionsPending === 0) {
            resolve();
          }
        };
        if (!this.options.animate || transitionsPending === 0) {
          resolve();
        }
        const updateTransition = this.options.animate ? boundNodes.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS).on("end", transitionDone) : boundNodes;
        updateTransition.attr(
          "transform",
          (node) => `translate(${node.x}, ${node.y})`
        );
        if (this.options.animate) {
          nodeEnter.style("opacity", 0).transition().delay(HIDE_TIME_MS + MOVE_TIME_MS).duration(HIDE_TIME_MS).style("opacity", 1).on("end", transitionDone);
        }
        const merged = nodeEnter.merge(boundNodes);
        this.renderFamilyControls(merged);
        this.renderIndiControls(merged);
        this.renderSpouseControls(merged);
        if (this.options.animate) {
          boundNodes.exit().transition().duration(HIDE_TIME_MS).style("opacity", 0).remove().on("end", transitionDone);
        } else {
          boundNodes.exit().remove();
        }
      });
      return animationPromise;
    }
    getSvgForRendering() {
      const svg = select_default2(this.options.svgSelector);
      if (svg.select("g").empty()) {
        svg.append("g");
      }
      return svg;
    }
  };

  // node_modules/d3-hierarchy/src/hierarchy/count.js
  function count2(node) {
    var sum = 0, children2 = node.children, i = children2 && children2.length;
    if (!i) sum = 1;
    else while (--i >= 0) sum += children2[i].value;
    node.value = sum;
  }
  function count_default2() {
    return this.eachAfter(count2);
  }

  // node_modules/d3-hierarchy/src/hierarchy/each.js
  function each_default3(callback, that) {
    let index = -1;
    for (const node of this) {
      callback.call(that, node, ++index, this);
    }
    return this;
  }

  // node_modules/d3-hierarchy/src/hierarchy/eachBefore.js
  function eachBefore_default2(callback, that) {
    var node = this, nodes = [node], children2, i, index = -1;
    while (node = nodes.pop()) {
      callback.call(that, node, ++index, this);
      if (children2 = node.children) {
        for (i = children2.length - 1; i >= 0; --i) {
          nodes.push(children2[i]);
        }
      }
    }
    return this;
  }

  // node_modules/d3-hierarchy/src/hierarchy/eachAfter.js
  function eachAfter_default2(callback, that) {
    var node = this, nodes = [node], next = [], children2, i, n, index = -1;
    while (node = nodes.pop()) {
      next.push(node);
      if (children2 = node.children) {
        for (i = 0, n = children2.length; i < n; ++i) {
          nodes.push(children2[i]);
        }
      }
    }
    while (node = next.pop()) {
      callback.call(that, node, ++index, this);
    }
    return this;
  }

  // node_modules/d3-hierarchy/src/hierarchy/find.js
  function find_default(callback, that) {
    let index = -1;
    for (const node of this) {
      if (callback.call(that, node, ++index, this)) {
        return node;
      }
    }
  }

  // node_modules/d3-hierarchy/src/hierarchy/sum.js
  function sum_default2(value) {
    return this.eachAfter(function(node) {
      var sum = +value(node.data) || 0, children2 = node.children, i = children2 && children2.length;
      while (--i >= 0) sum += children2[i].value;
      node.value = sum;
    });
  }

  // node_modules/d3-hierarchy/src/hierarchy/sort.js
  function sort_default3(compare) {
    return this.eachBefore(function(node) {
      if (node.children) {
        node.children.sort(compare);
      }
    });
  }

  // node_modules/d3-hierarchy/src/hierarchy/path.js
  function path_default2(end) {
    var start2 = this, ancestor = leastCommonAncestor2(start2, end), nodes = [start2];
    while (start2 !== ancestor) {
      start2 = start2.parent;
      nodes.push(start2);
    }
    var k = nodes.length;
    while (end !== ancestor) {
      nodes.splice(k, 0, end);
      end = end.parent;
    }
    return nodes;
  }
  function leastCommonAncestor2(a, b) {
    if (a === b) return a;
    var aNodes = a.ancestors(), bNodes = b.ancestors(), c = null;
    a = aNodes.pop();
    b = bNodes.pop();
    while (a === b) {
      c = a;
      a = aNodes.pop();
      b = bNodes.pop();
    }
    return c;
  }

  // node_modules/d3-hierarchy/src/hierarchy/ancestors.js
  function ancestors_default2() {
    var node = this, nodes = [node];
    while (node = node.parent) {
      nodes.push(node);
    }
    return nodes;
  }

  // node_modules/d3-hierarchy/src/hierarchy/descendants.js
  function descendants_default2() {
    return Array.from(this);
  }

  // node_modules/d3-hierarchy/src/hierarchy/leaves.js
  function leaves_default2() {
    var leaves = [];
    this.eachBefore(function(node) {
      if (!node.children) {
        leaves.push(node);
      }
    });
    return leaves;
  }

  // node_modules/d3-hierarchy/src/hierarchy/links.js
  function links_default2() {
    var root2 = this, links = [];
    root2.each(function(node) {
      if (node !== root2) {
        links.push({ source: node.parent, target: node });
      }
    });
    return links;
  }

  // node_modules/d3-hierarchy/src/hierarchy/iterator.js
  function* iterator_default2() {
    var node = this, current, next = [node], children2, i, n;
    do {
      current = next.reverse(), next = [];
      while (node = current.pop()) {
        yield node;
        if (children2 = node.children) {
          for (i = 0, n = children2.length; i < n; ++i) {
            next.push(children2[i]);
          }
        }
      }
    } while (next.length);
  }

  // node_modules/d3-hierarchy/src/hierarchy/index.js
  function hierarchy2(data, children2) {
    if (data instanceof Map) {
      data = [void 0, data];
      if (children2 === void 0) children2 = mapChildren;
    } else if (children2 === void 0) {
      children2 = objectChildren;
    }
    var root2 = new Node2(data), node, nodes = [root2], child, childs, i, n;
    while (node = nodes.pop()) {
      if ((childs = children2(node.data)) && (n = (childs = Array.from(childs)).length)) {
        node.children = childs;
        for (i = n - 1; i >= 0; --i) {
          nodes.push(child = childs[i] = new Node2(childs[i]));
          child.parent = node;
          child.depth = node.depth + 1;
        }
      }
    }
    return root2.eachBefore(computeHeight2);
  }
  function node_copy2() {
    return hierarchy2(this).eachBefore(copyData2);
  }
  function objectChildren(d) {
    return d.children;
  }
  function mapChildren(d) {
    return Array.isArray(d) ? d[1] : null;
  }
  function copyData2(node) {
    if (node.data.value !== void 0) node.value = node.data.value;
    node.data = node.data.data;
  }
  function computeHeight2(node) {
    var height = 0;
    do
      node.height = height;
    while ((node = node.parent) && node.height < ++height);
  }
  function Node2(data) {
    this.data = data;
    this.depth = this.height = 0;
    this.parent = null;
  }
  Node2.prototype = hierarchy2.prototype = {
    constructor: Node2,
    count: count_default2,
    each: each_default3,
    eachAfter: eachAfter_default2,
    eachBefore: eachBefore_default2,
    find: find_default,
    sum: sum_default2,
    sort: sort_default3,
    path: path_default2,
    ancestors: ancestors_default2,
    descendants: descendants_default2,
    leaves: leaves_default2,
    links: links_default2,
    copy: node_copy2,
    [Symbol.iterator]: iterator_default2
  };

  // node_modules/d3-hierarchy/src/accessors.js
  function optional(f) {
    return f == null ? null : required(f);
  }
  function required(f) {
    if (typeof f !== "function") throw new Error();
    return f;
  }

  // node_modules/d3-hierarchy/src/stratify.js
  var preroot = { depth: -1 };
  var ambiguous = {};
  var imputed = {};
  function defaultId(d) {
    return d.id;
  }
  function defaultParentId(d) {
    return d.parentId;
  }
  function stratify_default() {
    var id2 = defaultId, parentId = defaultParentId, path;
    function stratify(data) {
      var nodes = Array.from(data), currentId = id2, currentParentId = parentId, n, d, i, root2, parent, node, nodeId, nodeKey, nodeByKey = /* @__PURE__ */ new Map();
      if (path != null) {
        const I = nodes.map((d2, i2) => normalize(path(d2, i2, data)));
        const P = I.map(parentof);
        const S = new Set(I).add("");
        for (const i2 of P) {
          if (!S.has(i2)) {
            S.add(i2);
            I.push(i2);
            P.push(parentof(i2));
            nodes.push(imputed);
          }
        }
        currentId = (_, i2) => I[i2];
        currentParentId = (_, i2) => P[i2];
      }
      for (i = 0, n = nodes.length; i < n; ++i) {
        d = nodes[i], node = nodes[i] = new Node2(d);
        if ((nodeId = currentId(d, i, data)) != null && (nodeId += "")) {
          nodeKey = node.id = nodeId;
          nodeByKey.set(nodeKey, nodeByKey.has(nodeKey) ? ambiguous : node);
        }
        if ((nodeId = currentParentId(d, i, data)) != null && (nodeId += "")) {
          node.parent = nodeId;
        }
      }
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        if (nodeId = node.parent) {
          parent = nodeByKey.get(nodeId);
          if (!parent) throw new Error("missing: " + nodeId);
          if (parent === ambiguous) throw new Error("ambiguous: " + nodeId);
          if (parent.children) parent.children.push(node);
          else parent.children = [node];
          node.parent = parent;
        } else {
          if (root2) throw new Error("multiple roots");
          root2 = node;
        }
      }
      if (!root2) throw new Error("no root");
      if (path != null) {
        while (root2.data === imputed && root2.children.length === 1) {
          root2 = root2.children[0], --n;
        }
        for (let i2 = nodes.length - 1; i2 >= 0; --i2) {
          node = nodes[i2];
          if (node.data !== imputed) break;
          node.data = null;
        }
      }
      root2.parent = preroot;
      root2.eachBefore(function(node2) {
        node2.depth = node2.parent.depth + 1;
        --n;
      }).eachBefore(computeHeight2);
      root2.parent = null;
      if (n > 0) throw new Error("cycle");
      return root2;
    }
    stratify.id = function(x) {
      return arguments.length ? (id2 = optional(x), stratify) : id2;
    };
    stratify.parentId = function(x) {
      return arguments.length ? (parentId = optional(x), stratify) : parentId;
    };
    stratify.path = function(x) {
      return arguments.length ? (path = optional(x), stratify) : path;
    };
    return stratify;
  }
  function normalize(path) {
    path = `${path}`;
    let i = path.length;
    if (slash(path, i - 1) && !slash(path, i - 2)) path = path.slice(0, -1);
    return path[0] === "/" ? path : `/${path}`;
  }
  function parentof(path) {
    let i = path.length;
    if (i < 2) return "";
    while (--i > 1) if (slash(path, i)) break;
    return path.slice(0, i);
  }
  function slash(path, i) {
    if (path[i] === "/") {
      let k = 0;
      while (i > 0 && path[--i] === "\\") ++k;
      if ((k & 1) === 0) return true;
    }
    return false;
  }

  // src/id-generator.ts
  var IdGenerator = class {
    constructor() {
      this.ids = /* @__PURE__ */ new Map();
    }
    /**
     * Returns the given identifier if it wasn't used before. Otherwise, appends
     * a number to the given identifier to make it unique.
     */
    getId(id2) {
      if (this.ids.has(id2)) {
        const num = this.ids.get(id2);
        this.ids.set(id2, num + 1);
        return `${id2}:${num}`;
      }
      this.ids.set(id2, 1);
      return id2;
    }
  };

  // src/ancestor-chart.ts
  function getAncestorsTree(options) {
    const ancestorChartOptions = { ...options };
    const startIndiFamilies = options.startIndi ? options.data.getIndi(options.startIndi).getFamiliesAsSpouse() : [];
    if (startIndiFamilies.length) {
      ancestorChartOptions.startFam = startIndiFamilies[0];
      delete ancestorChartOptions.startIndi;
      const fam = options.data.getFam(startIndiFamilies[0]);
      if (fam.getMother() === options.startIndi) {
        ancestorChartOptions.swapStartSpouses = true;
      }
    }
    const ancestors = new AncestorChart(ancestorChartOptions);
    const ancestorsRoot = ancestors.createHierarchy();
    if (startIndiFamilies.length > 1 && ancestorsRoot.children && ancestorsRoot.children.length > 1) {
      ancestorsRoot.children.pop();
      delete ancestorsRoot.data.spouseParentNodeId;
    }
    return ancestorsRoot;
  }
  var AncestorChart = class {
    constructor(options) {
      this.options = options;
      this.util = new ChartUtil(options);
    }
    /** Creates a d3 hierarchy from the input data. */
    createHierarchy() {
      const parents = [];
      const stack = [];
      const idGenerator = this.options.idGenerator || new IdGenerator();
      if (this.options.startIndi) {
        const indi = this.options.data.getIndi(this.options.startIndi);
        const famc = indi.getFamilyAsChild();
        const id2 = famc ? idGenerator.getId(famc) : void 0;
        if (famc) {
          stack.push({
            id: famc,
            parentId: this.options.startIndi,
            family: { id: famc }
          });
        }
        const parent = {
          id: this.options.startIndi,
          indi: { id: this.options.startIndi }
        };
        if (id2) {
          parent.indiParentNodeId = id2;
        }
        parents.push(parent);
      } else {
        stack.push({
          id: idGenerator.getId(this.options.startFam),
          family: { id: this.options.startFam }
        });
      }
      while (stack.length) {
        const entry = stack.pop();
        const fam = this.options.data.getFam(entry.family.id);
        if (!fam) {
          continue;
        }
        const [father, mother] = entry.family.id === this.options.startFam && this.options.swapStartSpouses ? [fam.getMother(), fam.getFather()] : [fam.getFather(), fam.getMother()];
        if (!father && !mother) {
          continue;
        }
        if (mother) {
          entry.spouse = { id: mother };
          const indi = this.options.data.getIndi(mother);
          const famc = indi.getFamilyAsChild();
          if (famc) {
            if (this.options.collapsedSpouse?.has(entry.id)) {
              entry.spouse.expander = 0 /* PLUS */;
            } else {
              const id2 = idGenerator.getId(famc);
              entry.spouseParentNodeId = id2;
              entry.spouse.expander = 1 /* MINUS */;
              stack.push({
                id: id2,
                parentId: entry.id,
                family: { id: famc }
              });
            }
          }
        }
        if (father) {
          entry.indi = { id: father };
          const indi = this.options.data.getIndi(father);
          const famc = indi.getFamilyAsChild();
          if (famc) {
            if (this.options.collapsedIndi?.has(entry.id)) {
              entry.indi.expander = 0 /* PLUS */;
            } else {
              const id2 = idGenerator.getId(famc);
              entry.indiParentNodeId = id2;
              entry.indi.expander = 1 /* MINUS */;
              stack.push({
                id: id2,
                parentId: entry.id,
                family: { id: famc }
              });
            }
          }
        }
        parents.push(entry);
      }
      return stratify_default()(parents);
    }
    /**
     * Renders the tree, calling the provided renderer to draw boxes for
     * individuals.
     */
    render() {
      const root2 = this.createHierarchy();
      const nodes = this.util.layOutChart(root2, { flipVertically: true });
      const animationPromise = this.util.renderChart(nodes);
      const info = getChartInfo(nodes);
      this.util.updateSvgDimensions(info);
      return Object.assign(info, { animationPromise });
    }
  };

  // src/circle-renderer.ts
  var CircleRenderer = class {
    constructor(options) {
      this.options = options;
    }
    getFamilyAnchor(node) {
      return [0, 0];
    }
    getIndiAnchor(node) {
      return [0, 0];
    }
    getSpouseAnchor(node) {
      return [0, 0];
    }
    updateNodes(nodes) {
      nodes.forEach((node) => {
        [node.data.width, node.data.height] = node.data.family ? [120, 120] : [80, 80];
      });
    }
    getName(entry) {
      if (!entry) {
        return "";
      }
      const indi = this.options.data.getIndi(entry.id);
      const firstName = indi.getFirstName();
      return firstName ? firstName.split(" ")[0] : "";
    }
    render(enter, update) {
      enter = enter.append("g").attr("class", "circle");
      update = update.select("g");
      enter.append("circle").attr("r", (node) => node.data.width / 2).attr("cx", (node) => node.data.width / 2).attr("cy", (node) => node.data.height / 2);
      enter.filter((node) => !!node.data.family).append("text").attr("text-anchor", "middle").attr(
        "transform",
        (node) => `translate(${node.data.width / 2}, ${node.data.height / 2 - 4})`
      ).text((node) => this.getName(node.data.indi));
      enter.filter((node) => !!node.data.family).append("text").attr("text-anchor", "middle").attr(
        "transform",
        (node) => `translate(${node.data.width / 2}, ${node.data.height / 2 + 14})`
      ).text((node) => this.getName(node.data.spouse));
      enter.filter((node) => !node.data.family).append("text").attr("text-anchor", "middle").attr(
        "transform",
        (node) => `translate(${node.data.width / 2}, ${node.data.height / 2 + 4})`
      ).text((node) => this.getName(node.data.indi));
    }
    getCss() {
      return `
    circle {
      fill: white;
      stroke: #040;
      stroke-width: 5px;
    }
    .circle text {
      font-family: Montserrat, verdana, arial, sans-serif;
      font-size: 12px;
    }
    .background {
      stroke: none;
    }
    `;
    }
  };

  // src/data.ts
  var JsonIndiDetails = class {
    constructor(json) {
      this.json = json;
    }
    getId() {
      return this.json.id;
    }
    getFamiliesAsSpouse() {
      return this.json.fams || [];
    }
    getFamilyAsChild() {
      return this.json.famc || null;
    }
    getFirstName() {
      return this.json.firstName || null;
    }
    getLastName() {
      return this.json.lastName || null;
    }
    getBirthDate() {
      return this.json.birth || null;
    }
    getMaidenName() {
      return this.json.maidenName || null;
    }
    getNumberOfChildren() {
      return this.json.numberOfChildren || null;
    }
    getNumberOfMarriages() {
      return this.json.numberOfMarriages || null;
    }
    getBirthPlace() {
      return this.json.birth && this.json.birth.place || null;
    }
    getDeathDate() {
      return this.json.death || null;
    }
    getDeathPlace() {
      return this.json.death && this.json.death.place || null;
    }
    isConfirmedDeath() {
      return !!this.json.death && !!this.json.death.confirmed;
    }
    getSex() {
      return this.json.sex || null;
    }
    getImageUrl() {
      return this.json.images && this.json.images.length > 0 && this.json.images[0].url || null;
    }
    getImages() {
      return this.json.images || null;
    }
    getNotes() {
      return this.json.notes || null;
    }
    getEvents() {
      return this.json.events || null;
    }
    showId() {
      return !this.json.hideId;
    }
    showSex() {
      return !this.json.hideSex;
    }
  };
  var JsonFamDetails = class {
    constructor(json) {
      this.json = json;
    }
    getId() {
      return this.json.id;
    }
    getFather() {
      return this.json.husb || null;
    }
    getMother() {
      return this.json.wife || null;
    }
    getChildren() {
      return this.json.children || [];
    }
    getMarriageDate() {
      return this.json.marriage || null;
    }
    getMarriagePlace() {
      return this.json.marriage && this.json.marriage.place || null;
    }
  };
  var JsonDataProvider = class {
    constructor(json) {
      this.json = json;
      this.indis = /* @__PURE__ */ new Map();
      this.fams = /* @__PURE__ */ new Map();
      json.indis.forEach(
        (indi) => this.indis.set(indi.id, new JsonIndiDetails(indi))
      );
      json.fams.forEach((fam) => this.fams.set(fam.id, new JsonFamDetails(fam)));
    }
    getIndi(id2) {
      return this.indis.get(id2) || null;
    }
    getFam(id2) {
      return this.fams.get(id2) || null;
    }
  };

  // src/date-format.ts
  var MONTHS_EN = /* @__PURE__ */ new Map([
    [1, "Jan"],
    [2, "Feb"],
    [3, "Mar"],
    [4, "Apr"],
    [5, "May"],
    [6, "Jun"],
    [7, "Jul"],
    [8, "Aug"],
    [9, "Sep"],
    [10, "Oct"],
    [11, "Nov"],
    [12, "Dec"]
  ]);
  var QUALIFIERS_I18N = /* @__PURE__ */ new Map([
    [
      "bg",
      /* @__PURE__ */ new Map([
        ["cal", "\u043F\u0440\u0438\u0431\u043B."],
        ["abt", "\u043E\u043A."],
        ["est", "\u043E\u0446."],
        ["before", "\u043F\u0440\u0435\u0434\u0438"],
        ["after", "\u0441\u043B\u0435\u0434"]
      ])
    ],
    [
      "cs",
      /* @__PURE__ */ new Map([
        ["cal", "vypo\u010Dt."],
        ["abt", "okolo"],
        ["est", "odhadem"],
        ["before", "p\u0159ed"],
        ["after", "po"]
      ])
    ],
    [
      "de",
      /* @__PURE__ */ new Map([
        ["cal", "errech."],
        ["abt", "etwa"],
        ["est", "gesch\xE4t."],
        ["before", "vor"],
        ["after", "nach"]
      ])
    ],
    [
      "fr",
      /* @__PURE__ */ new Map([
        ["cal", "calc."],
        ["abt", "vers"],
        ["est", "est."],
        ["before", "avant"],
        ["after", "apr\xE8s"]
      ])
    ],
    [
      "it",
      /* @__PURE__ */ new Map([
        ["cal", "calc."],
        ["abt", "circa il"],
        ["est", "stim."],
        ["before", "prima del"],
        ["after", "dopo del"]
      ])
    ],
    [
      "pl",
      /* @__PURE__ */ new Map([
        ["cal", "wyl."],
        ["abt", "ok."],
        ["est", "szac."],
        ["before", "przed"],
        ["after", "po"]
      ])
    ],
    [
      "ru",
      /* @__PURE__ */ new Map([
        ["cal", "\u0432\u044B\u0447."],
        ["abt", "\u043E\u043A."],
        ["est", "\u043E\u0446\u0435\u043D."],
        ["before", "\u0434\u043E"],
        ["after", "\u043F\u043E\u0441\u043B\u0435"]
      ])
    ]
  ]);
  var shortMonthCache = /* @__PURE__ */ new Map();
  function getShortMonth(month, locale) {
    if (!Intl || !Intl.DateTimeFormat) {
      return MONTHS_EN.get(month);
    }
    const cacheKey = `${month}|${locale || ""}`;
    if (shortMonthCache.has(cacheKey)) {
      return shortMonthCache.get(cacheKey);
    }
    const result = new Intl.DateTimeFormat(locale, { month: "short" }).format(
      new Date(2e3, month - 1)
    );
    shortMonthCache.set(cacheKey, result);
    return result;
  }
  function getQualifier(qualifier, locale) {
    const language = locale && locale.split(/[-_]/)[0];
    const languageMap = language && QUALIFIERS_I18N.get(language);
    return languageMap ? languageMap.get(qualifier) : qualifier;
  }
  function formatDateOnly(day, month, year, locale) {
    if (!day && !month && !year) {
      return "";
    }
    if (!Intl || !Intl.DateTimeFormat || !locale || locale === "en") {
      return [day, month && getShortMonth(month, locale), year].join(" ");
    }
    const format = {
      day: day ? "numeric" : void 0,
      month: month ? "short" : void 0,
      year: year ? "numeric" : void 0
    };
    return new Intl.DateTimeFormat(locale, format).format(
      new Date(year ?? 2e3, month ? month - 1 : 1, day ?? 1)
    );
  }
  function formatDate(date, locale) {
    return [
      date.qualifier && getQualifier(date.qualifier, locale),
      formatDateOnly(date.day, date.month, date.year, locale),
      date.text
    ].join(" ");
  }
  function formatDateOrRange(dateOrRange, locale) {
    if (dateOrRange.date) {
      return formatDate(dateOrRange.date, locale);
    }
    if (!dateOrRange.dateRange) {
      return "";
    }
    const from = dateOrRange.dateRange.from && formatDate(dateOrRange.dateRange.from, locale);
    const to = dateOrRange.dateRange.to && formatDate(dateOrRange.dateRange.to, locale);
    if (from && to) {
      return `${from} .. ${to}`;
    }
    if (from) {
      return `${getQualifier("after", locale)} ${from}`;
    }
    if (to) {
      return `${getQualifier("before", locale)} ${to}`;
    }
    return "";
  }

  // src/descendant-chart.ts
  var DUMMY_ROOT_NODE_ID = "DUMMY_ROOT_NODE";
  function layOutDescendants(options, layoutOptions = {}) {
    const descendants = new DescendantChart(options);
    const descendantsRoot = descendants.createHierarchy();
    return removeDummyNode(
      new ChartUtil(options).layOutChart(descendantsRoot, layoutOptions)
    );
  }
  function removeDummyNode(allNodes) {
    if (allNodes[0].id !== DUMMY_ROOT_NODE_ID) {
      return allNodes;
    }
    const nodes = allNodes.slice(1);
    const dx = -nodes[0].x;
    const dy = -nodes[0].y;
    nodes.forEach((node) => {
      if (node.parent && node.parent.id === DUMMY_ROOT_NODE_ID && !node.data.additionalMarriage) {
        node.parent = null;
      }
      node.x += dx;
      node.y += dy;
      node.data.generation--;
    });
    return nodes;
  }
  function getSpouse(indiId, fam) {
    if (fam.getFather() === indiId) {
      return fam.getMother();
    }
    return fam.getFather();
  }
  var DescendantChart = class {
    constructor(options) {
      this.options = options;
      this.util = new ChartUtil(options);
    }
    getNodes(id2) {
      const indi = this.options.data.getIndi(id2);
      const famIds = indi.getFamiliesAsSpouse();
      if (!famIds.length) {
        return [
          {
            id: id2,
            indi: {
              id: id2
            }
          }
        ];
      }
      const nodes = famIds.map((famId) => {
        const entry = {
          id: famId,
          indi: {
            id: id2
          },
          family: {
            id: famId
          }
        };
        const fam = this.options.data.getFam(famId);
        const spouse = getSpouse(id2, fam);
        if (spouse) {
          entry.spouse = { id: spouse };
        }
        return entry;
      });
      nodes.slice(1).forEach((node) => {
        node.additionalMarriage = true;
      });
      return nodes;
    }
    getFamNode(famId) {
      const node = { id: famId, family: { id: famId } };
      const fam = this.options.data.getFam(famId);
      const father = fam.getFather();
      if (father) {
        node.indi = { id: father };
      }
      const mother = fam.getMother();
      if (mother) {
        node.spouse = { id: mother };
      }
      return node;
    }
    /** Creates a d3 hierarchy from the input data. */
    createHierarchy() {
      const parents = [];
      const nodes = this.options.startIndi ? this.getNodes(this.options.startIndi) : [this.getFamNode(this.options.startFam)];
      const idGenerator = this.options.idGenerator || new IdGenerator();
      nodes.forEach((node) => node.id = idGenerator.getId(node.id));
      if (nodes.length > 1) {
        const dummyNode = {
          id: DUMMY_ROOT_NODE_ID,
          height: 1,
          width: 1
        };
        parents.push(dummyNode);
        nodes.forEach((node) => node.parentId = dummyNode.id);
      }
      parents.push(...nodes);
      const stack = [];
      nodes.forEach((node) => {
        if (node.family) {
          stack.push(node);
        }
      });
      while (stack.length) {
        const entry = stack.pop();
        const fam = this.options.data.getFam(entry.family.id);
        const children2 = fam.getChildren();
        const collapsed = this.options.collapsedFamily?.has(entry.id);
        if (children2.length) {
          entry.family.expander = collapsed ? 0 /* PLUS */ : 1 /* MINUS */;
        }
        if (!collapsed) {
          children2.forEach((childId) => {
            const childNodes = this.getNodes(childId);
            childNodes.forEach((node) => {
              node.parentId = entry.id;
              if (node.family) {
                node.id = `${idGenerator.getId(node.family.id)}`;
                stack.push(node);
              }
            });
            parents.push(...childNodes);
          });
        }
      }
      return stratify_default()(parents);
    }
    /**
     * Renders the tree, calling the provided renderer to draw boxes for
     * individuals.
     */
    render() {
      const root2 = this.createHierarchy();
      const nodes = removeDummyNode(this.util.layOutChart(root2));
      const animationPromise = this.util.renderChart(nodes);
      const info = getChartInfo(nodes);
      this.util.updateSvgDimensions(info);
      return Object.assign(info, { animationPromise });
    }
  };

  // src/fancy-chart.ts
  function branch(x1, y1, x2, y2) {
    const yMid = y2 + 110;
    if (x2 > x1 + 100) {
      return `
      M ${x1 + 10}       ${y1}
      C ${x1 + 10}       ${yMid + 25}
        ${x1 + 45}       ${yMid + 10}
        ${(x1 + x2) / 2} ${yMid + 5}
        ${x2 - 45}       ${yMid}
        ${x2 + 2}        ${yMid - 25}
        ${x2 + 2}        ${y2}
      L ${x2 - 2}        ${y2}
      C ${x2 - 2}        ${yMid - 25}
        ${x2 - 45}       ${yMid - 10}
        ${(x1 + x2) / 2} ${yMid - 5}
        ${x1 + 45}       ${yMid}
        ${x1 - 10}       ${yMid + 25}
        ${x1 - 10}       ${y1}`;
    }
    if (x2 < x1 - 100) {
      return `
      M ${x1 - 10}       ${y1}
      C ${x1 - 10}       ${yMid + 25}
        ${x1 - 45}       ${yMid + 10}
        ${(x1 + x2) / 2} ${yMid + 5}
        ${x2 + 45}       ${yMid}
        ${x2 - 2}        ${yMid - 25}
        ${x2 - 2}        ${y2}
      L ${x2 + 2}        ${y2}
      C ${x2 + 2}        ${yMid - 25}
        ${x2 + 45}       ${yMid - 10}
        ${(x1 + x2) / 2} ${yMid - 5}
        ${x1 - 45}       ${yMid}
        ${x1 + 10}       ${yMid + 25}
        ${x1 + 10}       ${y1}`;
    }
    return `
    M ${x1 + 10}       ${y1}
    C ${x1 + 10}       ${yMid + 25}
      ${x2 + 2}        ${yMid - 25}
      ${x2 + 2}        ${y2}
    L ${x2 - 2}        ${y2}
    C ${x2 - 2}        ${yMid - 25}
      ${x1 - 10}       ${yMid + 25}
      ${x1 - 10}       ${y1}`;
  }
  var FancyChart = class {
    constructor(options) {
      this.options = options;
      this.util = new ChartUtil(options);
    }
    /** Creates a path from parent to the child node (vertical layout). */
    linkVertical(s, d) {
      const sAnchor = this.options.renderer.getFamilyAnchor(s.data);
      const dAnchor = s.id === d.data.spouseParentNodeId ? this.options.renderer.getSpouseAnchor(d.data) : this.options.renderer.getIndiAnchor(d.data);
      const [sx, sy] = [s.x + sAnchor[0], s.y + sAnchor[1]];
      const [dx, dy] = [d.x + dAnchor[0], d.y + dAnchor[1]];
      return branch(dx, dy, sx, sy);
    }
    linkAdditionalMarriage(node) {
      const nodeIndex = node.parent.children.findIndex((n) => n.id === node.id);
      const siblingNode = node.parent.children[nodeIndex - 1];
      const sAnchor = this.options.renderer.getIndiAnchor(node.data);
      const dAnchor = this.options.renderer.getIndiAnchor(siblingNode.data);
      const [sx, sy] = [node.x + sAnchor[0], node.y + sAnchor[1]];
      const [dx, dy] = [siblingNode.x + dAnchor[0], siblingNode.y + dAnchor[1]];
      return `M ${sx}, ${sy + 2}
              L ${dx}, ${dy + 10}
              ${dx}, ${dy - 10}
              ${sx}, ${sy - 2}`;
    }
    renderBackground(chartInfo, svg) {
      svg.select("g").append("rect").attr("x", -chartInfo.origin[0]).attr("y", -chartInfo.origin[1]).attr("width", chartInfo.size[0]).attr("height", chartInfo.origin[1]).attr("fill", "#cff");
      svg.select("g").append("rect").attr("x", -chartInfo.origin[0]).attr("y", 0).attr("width", chartInfo.size[0]).attr("height", chartInfo.size[1] - chartInfo.origin[1]).attr("fill", "#494");
    }
    renderLeaves(nodes, svg) {
      const gradient = svg.select("g").append("radialGradient").attr("id", "gradient");
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#8f8");
      gradient.append("stop").attr("offset", "80%").attr("stop-color", "#8f8").attr("stop-opacity", 0.5);
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#8f8").attr("stop-opacity", 0);
      const backgroundNodes = nodes.filter(
        (n) => n.parent && n.parent.id !== DUMMY_ROOT_NODE_ID
      );
      const minGeneration = min(backgroundNodes, (node) => node.data.generation) || 0;
      const sizeFunction = (node) => 280 - 180 / Math.sqrt(1 + node.data.generation - minGeneration);
      {
        const boundNodes = svg.select("g").selectAll("g.background").data(backgroundNodes, (d) => d.id);
        const enter = boundNodes.enter().append("g");
        enter.merge(boundNodes).attr("class", "background").attr(
          "transform",
          (node) => `translate(${node.x - node.data.width / 2}, ${node.y - node.data.height / 2})`
        );
        const background = enter.append("g").attr("class", "background");
        background.append("circle").attr("class", "background").attr("r", sizeFunction).attr("cx", (node) => node.data.width / 2).attr("cy", (node) => node.data.height / 2).style("fill", "#493");
      }
      {
        const boundNodes = svg.select("g").selectAll("g.background2").data(backgroundNodes, (d) => d.id);
        const enter = boundNodes.enter().append("g");
        enter.merge(boundNodes).attr("class", "background2").attr(
          "transform",
          (node) => `translate(${node.x - node.data.width / 2}, ${node.y - node.data.height / 2})`
        );
        const background = enter.append("g").attr("class", "background2");
        background.append("circle").attr("class", "background").attr("r", sizeFunction).attr("cx", (node) => node.data.width / 2).attr("cy", (node) => node.data.height / 2).style("fill", "url(#gradient)");
      }
    }
    renderLinks(nodes, svg) {
      const link = (parent, child) => {
        if (child.data.additionalMarriage) {
          return this.linkAdditionalMarriage(child);
        }
        return this.linkVertical(child, parent);
      };
      const links = nodes.filter((n) => !!n.parent);
      svg.select("g").selectAll("path.branch").data(links, linkId).enter().append("path").attr(
        "class",
        (node) => node.data.additionalMarriage ? "branch additional-marriage" : "branch"
      ).attr("d", (node) => link(node.parent, node));
    }
    renderTreeTrunk(nodes, svg) {
      const trunkNodes = nodes.filter(
        (n) => !n.parent || n.parent.id === DUMMY_ROOT_NODE_ID
      );
      svg.select("g").selectAll("g.trunk").data(trunkNodes, (d) => d.id).enter().append("g").attr("class", "trunk").attr("transform", (node) => `translate(${node.x}, ${node.y})`).append("path").attr(
        "d",
        `
          M 10 20
          L 10 40
          C 10 60 10 90 40 90
          L -40 90
          C -10 90 -10 60 -10 40
          L -10 20`
      );
    }
    render() {
      const nodes = layOutDescendants(this.options, {
        flipVertically: true,
        vSpacing: 100
      });
      const info = getChartInfo(nodes);
      info.origin[0] += 150;
      info.origin[1] += 150;
      info.size[0] += 300;
      info.size[1] += 250;
      const svg = this.util.getSvgForRendering();
      svg.append("style").text(`
      .branch, .trunk {
        fill: #632;
        stroke: #632;
      }`);
      this.renderBackground(info, svg);
      this.renderLeaves(nodes, svg);
      this.renderLinks(nodes, svg);
      this.renderTreeTrunk(nodes, svg);
      this.util.renderNodes(nodes, svg);
      this.util.updateSvgDimensions(info);
      return Object.assign(info, { animationPromise: Promise.resolve() });
    }
  };

  // src/detailed-renderer.ts
  var INDI_MIN_HEIGHT = 44;
  var INDI_MIN_WIDTH = 64;
  var IMAGE_WIDTH = 70;
  var IMAGE_HEIGHT = 90;
  var DETAILS_HEIGHT = 14;
  var ANIMATION_DELAY_MS = 200;
  var ANIMATION_DURATION_MS = 500;
  var textLengthCache = /* @__PURE__ */ new Map();
  function getLength(text, textClass) {
    const cacheKey = `${text}|${textClass}`;
    if (textLengthCache.has(cacheKey)) {
      return textLengthCache.get(cacheKey);
    }
    const g = select_default2("svg").append("g").attr("class", "detailed node");
    const x = g.append("text").attr("class", textClass).text(text);
    const length = x.node().getComputedTextLength();
    g.remove();
    textLengthCache.set(cacheKey, length);
    return length;
  }
  var SEX_SYMBOLS = /* @__PURE__ */ new Map([
    ["F", "\u2640"],
    ["M", "\u2642"]
  ]);
  var DetailedRenderer = class extends CompositeRenderer {
    constructor(options) {
      super(options);
      this.options = options;
    }
    getColoringClass() {
      switch (this.options.colors) {
        case 0 /* NO_COLOR */:
          return "nocolor";
        case 2 /* COLOR_BY_SEX */:
          return "bysex";
        default:
          return "bygeneration";
      }
    }
    /** Extracts lines of details for a person. */
    getIndiDetails(indi) {
      const detailsList = [];
      const birthDate = indi.getBirthDate() && formatDateOrRange(indi.getBirthDate(), this.options.locale);
      const birthPlace = indi.getBirthPlace();
      const deathDate = indi.getDeathDate() && formatDateOrRange(indi.getDeathDate(), this.options.locale);
      const deathPlace = indi.getDeathPlace();
      if (birthDate) {
        detailsList.push({ symbol: "", text: birthDate });
      }
      if (birthPlace) {
        detailsList.push({ symbol: "", text: birthPlace });
      }
      if (birthDate || birthPlace) {
        detailsList[0].symbol = "*";
      }
      const listIndex = detailsList.length;
      if (deathDate) {
        detailsList.push({ symbol: "", text: deathDate });
      }
      if (deathPlace) {
        detailsList.push({ symbol: "", text: deathPlace });
      }
      if (deathDate || deathPlace) {
        detailsList[listIndex].symbol = "+";
      } else if (indi.isConfirmedDeath()) {
        detailsList.push({ symbol: "+", text: "" });
      }
      return detailsList;
    }
    /** Extracts lines of details for a family. */
    getFamDetails(fam) {
      const detailsList = [];
      const marriageDate = fam.getMarriageDate() && formatDateOrRange(fam.getMarriageDate(), this.options.locale);
      const marriagePlace = fam.getMarriagePlace();
      if (marriageDate) {
        detailsList.push({ symbol: "", text: marriageDate });
      }
      if (marriagePlace) {
        detailsList.push({ symbol: "", text: marriagePlace });
      }
      if (marriageDate || marriagePlace) {
        detailsList[0].symbol = "\u26AD";
      }
      return detailsList;
    }
    getPreferredIndiSize(id2) {
      const indi = this.options.data.getIndi(id2);
      const details = this.getIndiDetails(indi);
      const idAndSexHeight = indi.showId() || indi.showSex() ? DETAILS_HEIGHT : 0;
      const height = max([
        INDI_MIN_HEIGHT + details.length * DETAILS_HEIGHT + idAndSexHeight,
        indi.getImageUrl() ? IMAGE_HEIGHT : 0
      ]);
      const maxDetailsWidth = max(
        details.map((x) => getLength(x.text, "details"))
      );
      const width = max([
        maxDetailsWidth + 22,
        getLength(indi.getFirstName() || "", "name") + 8,
        getLength(indi.getLastName() || "", "name") + 8,
        getLength(id2, "id") + 32,
        INDI_MIN_WIDTH
      ]) + (indi.getImageUrl() ? IMAGE_WIDTH : 0);
      return [width, height];
    }
    getPreferredFamSize(id2) {
      const fam = this.options.data.getFam(id2);
      const details = this.getFamDetails(fam);
      if (!details.length) {
        return [0, 0];
      }
      const height = 10 + details.length * DETAILS_HEIGHT;
      const maxDetailsWidth = max(
        details.map((x) => getLength(x.text, "details"))
      );
      const width = maxDetailsWidth + 22;
      return [width, height];
    }
    render(enter, update) {
      enter = enter.append("g").attr("class", "detailed");
      update = update.select("g");
      const indiUpdate = enter.merge(update).selectAll("g.indi").data(
        (node) => {
          const result = [];
          const famXOffset = !this.options.horizontal && node.data.family ? max([-getFamPositionVertical(node.data), 0]) : 0;
          const famYOffset = this.options.horizontal && node.data.family ? max([-getFamPositionHorizontal(node.data), 0]) : 0;
          if (node.data.indi) {
            result.push({
              indi: node.data.indi,
              generation: node.data.generation,
              xOffset: famXOffset,
              yOffset: 0
            });
          }
          if (node.data.spouse) {
            result.push({
              indi: node.data.spouse,
              generation: node.data.generation,
              xOffset: !this.options.horizontal && node.data.indi ? node.data.indi.width + famXOffset : 0,
              yOffset: this.options.horizontal && node.data.indi ? node.data.indi.height + famYOffset : 0
            });
          }
          return result;
        },
        (data) => data.indi.id
      );
      const indiEnter = indiUpdate.enter().append("g").attr("class", "indi");
      this.transition(indiEnter.merge(indiUpdate)).attr(
        "transform",
        (node) => `translate(${node.xOffset}, ${node.yOffset})`
      );
      this.renderIndi(indiEnter, indiUpdate);
      const familyEnter = enter.select(function(node) {
        return node.data.family ? this : null;
      }).append("g").attr("class", "family");
      const familyUpdate = update.select(function(node) {
        return node.data.family ? this : null;
      }).select("g.family");
      this.transition(familyEnter.merge(familyUpdate)).attr(
        "transform",
        (node) => this.getFamTransform(node.data)
      );
      this.renderFamily(familyEnter, familyUpdate);
    }
    getCss() {
      return `
.detailed text {
  font-family: Montserrat, verdana, arial, sans-serif;
  fill: black;
}

.detailed .name {
  font-size: 12px;
  font-weight: bold;
}

.link {
  fill: none;
  stroke: #000;
  stroke-width: 1px;
}

.additional-marriage {
  stroke-dasharray: 2;
}

.detailed rect {
  stroke: black;
}

.detailed {
  stroke-width: 2px;
}

.detailed .details {
  font-size: 10px;
}

.detailed .id {
  font-size: 10px;
  font-style: italic;
}

.detailed rect.nocolor {
  fill: #ffffff;
}

.detailed rect.bysex {
  fill: #eeeeee;
}

.detailed rect.bysex.male {
  fill: #dbffff;
}

.detailed rect.bysex.female {
  fill: #ffdbed;
}

.detailed rect.bygeneration {
  fill: #ffffdd;
}

.generation-11 .detailed rect.bygeneration, .generation1 .detailed rect.bygeneration {
  fill: #edffdb;
}

.generation-10 .detailed rect.bygeneration, .generation2 .detailed rect.bygeneration {
  fill: #dbffdb;
}

.generation-9 .detailed rect.bygeneration, .generation3 .detailed rect.bygeneration {
  fill: #dbffed;
}

.generation-8 .detailed rect.bygeneration, .generation4 .detailed rect.bygeneration {
  fill: #dbffff;
}

.generation-7 .detailed rect.bygeneration, .generation5 .detailed rect.bygeneration {
  fill: #dbedff;
}

.generation-6 .detailed rect.bygeneration, .generation6 .detailed rect.bygeneration {
  fill: #dbdbff;
}

.generation-5 .detailed rect.bygeneration, .generation7 .detailed rect.bygeneration {
  fill: #eddbff;
}

.generation-4 .detailed rect.bygeneration, .generation8 .detailed rect.bygeneration {
  fill: #ffdbff;
}

.generation-3 .detailed rect.bygeneration, .generation9 .detailed rect.bygeneration {
  fill: #ffdbed;
}

.generation-2 .detailed rect.bygeneration, .generation10 .detailed rect.bygeneration {
  fill: #ffdbdb;
}

.generation-1 .detailed rect.bygeneration, .generation11 .detailed rect.bygeneration {
  fill: #ffeddb;
}`;
    }
    transition(selection2) {
      return this.options.animate ? selection2.transition().delay(ANIMATION_DELAY_MS).duration(ANIMATION_DURATION_MS) : selection2;
    }
    getFamTransform(node) {
      if (this.options.horizontal) {
        return `translate(${node.indi && node.indi.width || node.spouse.width}, ${max([getFamPositionHorizontal(node), 0])})`;
      }
      return `translate(${max([getFamPositionVertical(node), 0])}, ${node.indi && node.indi.height || node.spouse.height})`;
    }
    getSexClass(indiId) {
      const sex = this.options.data.getIndi(indiId)?.getSex();
      switch (sex) {
        case "M":
          return "male";
        case "F":
          return "female";
        default:
          return "";
      }
    }
    renderIndi(enter, update) {
      if (this.options.indiHrefFunc) {
        enter = enter.append("a").attr("href", (data) => this.options.indiHrefFunc(data.indi.id));
        update = update.select("a");
      }
      if (this.options.indiCallback) {
        enter.on(
          "click",
          (event, data) => this.options.indiCallback({
            id: data.indi.id,
            generation: data.generation
          })
        );
      }
      const background = enter.append("rect").attr("rx", 5).attr("stroke-width", 0).attr(
        "class",
        (node) => `background ${this.getColoringClass()} ${this.getSexClass(
          node.indi.id
        )}`
      ).merge(update.select("rect.background"));
      const transition2 = this.transition(background);
      transition2.attr("width", (node) => node.indi.width);
      transition2.attr("height", (node) => node.indi.height);
      const getClipId = (id3) => `clip-${id3}`;
      enter.append("clipPath").attr("id", (node) => getClipId(node.indi.id)).append("rect").attr("rx", 5).merge(update.select("clipPath rect")).attr("width", (node) => node.indi.width).attr("height", (node) => node.indi.height);
      const getIndi = (data) => this.options.data.getIndi(data.indi.id);
      const getDetailsWidth = (data) => data.indi.width - (getIndi(data).getImageUrl() ? IMAGE_WIDTH : 0);
      enter.append("text").attr("text-anchor", "middle").attr("class", "name").attr(
        "transform",
        (node) => `translate(${getDetailsWidth(node) / 2}, 17)`
      ).text((node) => getIndi(node).getFirstName());
      enter.append("text").attr("text-anchor", "middle").attr("class", "name").attr(
        "transform",
        (node) => `translate(${getDetailsWidth(node) / 2}, 33)`
      ).text((node) => getIndi(node).getLastName());
      const details = /* @__PURE__ */ new Map();
      enter.each((node) => {
        const indi = getIndi(node);
        const detailsList = this.getIndiDetails(indi);
        details.set(node.indi.id, detailsList);
      });
      const maxDetails = max(Array.from(details.values(), (v) => v.length));
      for (let i = 0; i < maxDetails; ++i) {
        const lineGroup = enter.filter(
          (data) => details.get(data.indi.id).length > i
        );
        lineGroup.append("text").attr("text-anchor", "middle").attr("class", "details").attr("transform", `translate(9, ${49 + i * DETAILS_HEIGHT})`).text((data) => details.get(data.indi.id)[i].symbol);
        lineGroup.append("text").attr("class", "details").attr("transform", `translate(15, ${49 + i * DETAILS_HEIGHT})`).text((data) => details.get(data.indi.id)[i].text);
      }
      const id2 = enter.append("text").attr("class", "id").text((data) => getIndi(data).showId() ? data.indi.id : "").merge(update.select("text.id"));
      this.transition(id2).attr(
        "transform",
        (data) => `translate(9, ${data.indi.height - 5})`
      );
      const sex = enter.append("text").attr("class", "details sex").attr("text-anchor", "end").text((data) => {
        const sexSymbol = SEX_SYMBOLS.get(getIndi(data).getSex() || "") || "";
        return getIndi(data).showSex() ? sexSymbol : "";
      }).merge(update.select("text.sex"));
      this.transition(sex).attr(
        "transform",
        (data) => `translate(${getDetailsWidth(data) - 5}, ${data.indi.height - 5})`
      );
      enter.filter((data) => !!getIndi(data).getImageUrl()).append("image").attr("width", IMAGE_WIDTH).attr("height", (data) => data.indi.height).attr("preserveAspectRatio", "xMidYMin").attr(
        "transform",
        (data) => `translate(${data.indi.width - IMAGE_WIDTH}, 0)`
      ).attr("clip-path", (data) => `url(#${getClipId(data.indi.id)})`).attr("href", (data) => getIndi(data).getImageUrl());
      const border = enter.append("rect").attr("rx", 5).attr("fill-opacity", 0).attr("class", "border").merge(update.select("rect.border"));
      const borderTransition = this.transition(border);
      borderTransition.attr("width", (data) => data.indi.width);
      borderTransition.attr("height", (data) => data.indi.height);
    }
    renderFamily(enter, update) {
      if (this.options.famHrefFunc) {
        enter = enter.append("a").attr(
          "href",
          (node) => this.options.famHrefFunc(node.data.family.id)
        );
      }
      if (this.options.famCallback) {
        enter.on(
          "click",
          (event, node) => this.options.famCallback({
            id: node.data.family.id,
            generation: node.data.generation
          })
        );
      }
      const details = /* @__PURE__ */ new Map();
      enter.each((node) => {
        const famId = node.data.family.id;
        const fam = this.options.data.getFam(famId);
        const detailsList = this.getFamDetails(fam);
        details.set(famId, detailsList);
      });
      const maxDetails = max(Array.from(details.values(), (v) => v.length));
      enter.filter((node) => {
        const detail = details.get(node.data.family.id);
        return 0 < detail.length;
      }).append("rect").attr("class", this.getColoringClass()).attr("rx", 5).attr("ry", 5).attr("width", (node) => node.data.family.width).attr("height", (node) => node.data.family.height);
      for (let i = 0; i < maxDetails; ++i) {
        const lineGroup = enter.filter(
          (node) => details.get(node.data.family.id).length > i
        );
        lineGroup.append("text").attr("text-anchor", "middle").attr("class", "details").attr("transform", `translate(9, ${16 + i * DETAILS_HEIGHT})`).text((node) => details.get(node.data.family.id)[i].symbol);
        lineGroup.append("text").attr("text-anchor", "start").attr("class", "details").attr("transform", `translate(15, ${16 + i * DETAILS_HEIGHT})`).text((node) => details.get(node.data.family.id)[i].text);
      }
    }
  };

  // src/gedcom.ts
  var import_parse_gedcom = __toESM(require_parse_gedcom());
  function findTag(tree, tag) {
    return tree.find((entry) => entry.tag === tag);
  }
  function findTags(tree, tag) {
    return tree.filter((entry) => entry.tag === tag);
  }
  function pointerToId(pointer) {
    return pointer.substring(1, pointer.length - 1);
  }
  function extractName(name) {
    const arr = name.split("/");
    if (arr.length === 1) {
      return { firstName: arr[0].trim() };
    }
    return { firstName: arr[0].trim(), lastName: arr[1].trim() };
  }
  var MONTHS = /* @__PURE__ */ new Map([
    ["jan", 1],
    ["feb", 2],
    ["mar", 3],
    ["apr", 4],
    ["may", 5],
    ["jun", 6],
    ["jul", 7],
    ["aug", 8],
    ["sep", 9],
    ["oct", 10],
    ["nov", 11],
    ["dec", 12]
  ]);
  function parseDate(parts) {
    if (!parts || !parts.length) {
      return void 0;
    }
    const result = {};
    if (parts[0].startsWith("(") && parts[parts.length - 1].endsWith(")")) {
      parts[0] = parts[0].substring(1);
      const lastPart = parts[parts.length - 1];
      parts[parts.length - 1] = lastPart.substring(0, lastPart.length - 1);
    }
    const fullText = parts.join(" ");
    const firstPart = parts[0].toLowerCase();
    if (firstPart === "cal" || firstPart === "abt" || firstPart === "est") {
      result.qualifier = firstPart;
      parts = parts.slice(1);
    }
    if (parts.length && parts[parts.length - 1].match(/^\d{1,4}$/)) {
      result.year = Number(parts[parts.length - 1]);
      parts = parts.slice(0, parts.length - 1);
    }
    if (parts.length) {
      const lastPart = parts[parts.length - 1].toLowerCase();
      if (MONTHS.has(lastPart)) {
        result.month = MONTHS.get(lastPart);
        parts = parts.slice(0, parts.length - 1);
      }
    }
    if (parts.length && parts[0].match(/^\d\d?$/)) {
      result.day = Number(parts[0]);
      parts = parts.slice(0, parts.length - 1);
    }
    if (parts.length) {
      return { text: fullText };
    }
    return result;
  }
  function getDate(gedcomDate) {
    const parts = gedcomDate.replace(/@.*@/, "").trim().split(" ");
    const firstPart = parts[0].toLowerCase();
    if (firstPart.startsWith("bet")) {
      const i = parts.findIndex((x) => x.toLowerCase() === "and");
      const from = parseDate(parts.slice(1, i));
      const to = parseDate(parts.slice(i + 1));
      const dateRange = {};
      if (from) {
        dateRange.from = from;
      }
      if (to) {
        dateRange.to = to;
      }
      return { dateRange };
    }
    if (firstPart.startsWith("bef") || firstPart.startsWith("aft")) {
      const date2 = parseDate(parts.slice(1));
      if (!date2) {
        return void 0;
      }
      if (firstPart.startsWith("bef")) {
        return { dateRange: { to: date2 } };
      }
      return { dateRange: { from: date2 } };
    }
    const date = parseDate(parts);
    if (date) {
      return { date };
    }
    return void 0;
  }
  function createNotes(notesTag) {
    if (!notesTag || notesTag.tag !== "NOTE") return void 0;
    return findTags(notesTag.tree, "CONT").filter((x) => x.data).reduce((a, i) => a.concat(i.data), [notesTag.data]);
  }
  function createEvent(entry) {
    if (!entry) {
      return void 0;
    }
    const typeTag = findTag(entry.tree, "TYPE");
    const dateTag = findTag(entry.tree, "DATE");
    const placeTag = findTag(entry.tree, "PLAC");
    const date = dateTag && dateTag.data && getDate(dateTag.data);
    const place = placeTag && placeTag.data;
    if (date || place) {
      const result = date || {};
      if (place) {
        result.place = place;
      }
      result.confirmed = true;
      if (typeTag) {
        result.type = typeTag.data;
      }
      const notes = createNotes(findTag(entry.tree, "NOTE"));
      if (notes) {
        result.notes = notes;
      }
      return result;
    }
    if (entry.data && entry.data.toLowerCase() === "y") {
      return { confirmed: true };
    }
    return void 0;
  }
  function createIndi(entry, objects, existingIds) {
    const id2 = pointerToId(entry.pointer);
    const fams = findTags(entry.tree, "FAMS").map((entry2) => pointerToId(entry2.data)).filter((id3) => existingIds.has(id3));
    const indi = { id: id2, fams };
    const nameTags = findTags(entry.tree, "NAME");
    const isMaiden = (nameTag) => {
      const type = findTag(nameTag.tree, "TYPE");
      return type !== void 0 && type.data === "maiden";
    };
    const main = nameTags.find((x) => !isMaiden(x));
    const maiden = nameTags.find(isMaiden);
    if (main) {
      const { firstName, lastName } = extractName(main.data);
      if (firstName) {
        indi.firstName = firstName;
      }
      if (lastName) {
        indi.lastName = lastName;
      }
    }
    if (maiden) {
      const { firstName, lastName } = extractName(maiden.data);
      if (lastName) {
        indi.maidenName = lastName;
      }
      if (firstName && !indi.firstName) {
        indi.firstName = firstName;
      }
    }
    const nchiTag = findTag(entry.tree, "NCHI");
    if (nchiTag) {
      indi.numberOfChildren = +nchiTag.data;
    }
    const nmrTag = findTag(entry.tree, "NMR");
    if (nmrTag) {
      indi.numberOfMarriages = +nmrTag.data;
    }
    const sexTag = findTag(entry.tree, "SEX");
    if (sexTag) {
      indi.sex = sexTag.data;
    }
    const famcTag = findTag(entry.tree, "FAMC");
    if (famcTag) {
      const id3 = pointerToId(famcTag.data);
      if (existingIds.has(id3)) {
        indi.famc = id3;
      }
    }
    const objeTags = findTags(entry.tree, "OBJE");
    if (objeTags.length > 0) {
      const getFileTag = (tag) => {
        const realObjeTag = tag.data ? objects.get(pointerToId(tag.data)) : tag;
        if (!realObjeTag) return void 0;
        const file = findTag(realObjeTag.tree, "FILE");
        const title = findTag(realObjeTag.tree, "TITL");
        if (!file) return void 0;
        return {
          url: file.data,
          title: title && title.data
        };
      };
      indi.images = objeTags.map(getFileTag).filter((x) => x !== void 0);
    }
    const birth = createEvent(findTag(entry.tree, "BIRT"));
    if (birth) {
      indi.birth = birth;
    }
    const death = createEvent(findTag(entry.tree, "DEAT"));
    if (death) {
      indi.death = death;
    }
    const notes = createNotes(findTag(entry.tree, "NOTE"));
    if (notes) {
      indi.notes = notes;
    }
    indi.events = findTags(entry.tree, "EVEN").map(createEvent).filter((x) => x !== null);
    return indi;
  }
  function createFam(entry, existingIds) {
    const id2 = pointerToId(entry.pointer);
    const children2 = findTags(entry.tree, "CHIL").map((entry2) => pointerToId(entry2.data)).filter((id3) => existingIds.has(id3));
    const fam = { id: id2, children: children2 };
    const husbTag = findTag(entry.tree, "HUSB");
    if (husbTag) {
      const id3 = pointerToId(husbTag.data);
      if (existingIds.has(id3)) {
        fam.husb = pointerToId(husbTag.data);
      }
    }
    const wifeTag = findTag(entry.tree, "WIFE");
    if (wifeTag) {
      const id3 = pointerToId(wifeTag.data);
      if (existingIds.has(id3)) {
        fam.wife = pointerToId(wifeTag.data);
      }
    }
    const marriage = createEvent(findTag(entry.tree, "MARR"));
    if (marriage) {
      fam.marriage = marriage;
    }
    return fam;
  }
  function createMap(entries) {
    return new Map(entries.map((entry) => [pointerToId(entry.pointer), entry]));
  }
  function gedcomToJson(gedcomContents) {
    return gedcomEntriesToJson((0, import_parse_gedcom.parse)(gedcomContents));
  }
  function gedcomEntriesToJson(gedcom) {
    const objects = createMap(findTags(gedcom, "OBJE"));
    const existingIds = new Set(
      gedcom.map((entry) => pointerToId(entry.pointer)).filter((id2) => !!id2)
    );
    const indis = findTags(gedcom, "INDI").map(
      (entry) => createIndi(entry, objects, existingIds)
    );
    const fams = findTags(gedcom, "FAM").map(
      (entry) => createFam(entry, existingIds)
    );
    return { indis, fams };
  }

  // src/hourglass-chart.ts
  var HourglassChart = class {
    constructor(options) {
      this.options = options;
      this.util = new ChartUtil(options);
    }
    render() {
      const ancestorsRoot = getAncestorsTree(this.options);
      const ancestorNodes = this.util.layOutChart(ancestorsRoot, {
        flipVertically: true
      });
      const descendantNodes = layOutDescendants(this.options);
      if (ancestorNodes[0].data.indi?.expander !== void 0) {
        descendantNodes[0].data.indi.expander = ancestorNodes[0].data.indi?.expander;
      }
      if (ancestorNodes[0].data.spouse?.expander !== void 0) {
        descendantNodes[0].data.spouse.expander = ancestorNodes[0].data.spouse?.expander;
      }
      const nodes = ancestorNodes.slice(1).concat(descendantNodes);
      const animationPromise = this.util.renderChart(nodes);
      const info = getChartInfo(nodes);
      this.util.updateSvgDimensions(info);
      return Object.assign(info, { animationPromise });
    }
  };

  // src/kinship/api.ts
  var ChildNodes = class _ChildNodes {
    constructor(overrides = {}) {
      this.indiParents = [];
      this.indiSiblings = [];
      this.spouseParents = [];
      this.spouseSiblings = [];
      this.children = [];
      Object.assign(this, overrides);
    }
    static {
      this.EMPTY = new _ChildNodes();
    }
    get(type) {
      switch (type) {
        case 0 /* IndiParents */:
          return this.indiParents;
        case 1 /* IndiSiblings */:
          return this.indiSiblings;
        case 2 /* SpouseParents */:
          return this.spouseParents;
        case 3 /* SpouseSiblings */:
          return this.spouseSiblings;
        case 4 /* Children */:
          return this.children;
      }
    }
    getAll() {
      return [].concat(
        this.indiSiblings,
        this.indiParents,
        this.children,
        this.spouseParents,
        this.spouseSiblings
      );
    }
  };
  function otherSideLinkType(type) {
    switch (type) {
      case 0 /* IndiParents */:
        return 4 /* Children */;
      case 1 /* IndiSiblings */:
        return 1 /* IndiSiblings */;
      case 2 /* SpouseParents */:
        return 4 /* Children */;
      case 3 /* SpouseSiblings */:
        return 1 /* IndiSiblings */;
      case 4 /* Children */:
        return 0 /* IndiParents */;
    }
  }

  // src/utils.ts
  function nonEmpty(array2) {
    return !!(array2 && array2.length);
  }
  function last(array2) {
    return array2[array2.length - 1];
  }
  function points2pathd(points) {
    let result = `M ${points[0].x} ${points[0].y} L`;
    for (const s of points.slice(1)) {
      result += ` ${s.x} ${s.y}`;
    }
    return result;
  }

  // src/kinship/renderer.ts
  var LINKS_BASE_OFFSET = 17;
  var PARENT_LINK_ANCHOR_X_OFFSET = 15;
  var SIBLING_LINK_ANCHOR_Y_OFFSET = 5;
  var SIBLING_LINK_STARTER_LENGTH = 7;
  var LINKS_SEPARATION = 6;
  var LINK_STUB_CIRCLE_R = 3;
  var KinshipChartRenderer = class {
    constructor(options) {
      this.options = options;
      this.util = new ChartUtil(this.options);
    }
    layOut(upRoot, downRoot) {
      const svg = this.util.getSvgForRendering();
      if (svg.select("style").empty()) {
        svg.append("style").text(this.options.renderer.getCss());
      }
      return [
        this.util.layOutChart(upRoot, { flipVertically: true }),
        this.util.layOutChart(downRoot)
      ];
    }
    render(upNodes, downNodes, rootsCount) {
      const allNodes = upNodes.concat(downNodes);
      const allNodesDeduped = allNodes.slice(1);
      upNodes.forEach((node) => this.setLinkYs(node, true));
      downNodes.forEach((node) => this.setLinkYs(node, false));
      const animationPromise = this.util.renderNodes(
        allNodesDeduped,
        this.util.getSvgForRendering()
      );
      this.renderLinks(allNodes);
      if (rootsCount > 1) {
        this.renderRootDummyAdditionalMarriageLinkStub(allNodes[0]);
      }
      const info = getChartInfo(allNodesDeduped);
      this.util.updateSvgDimensions(info);
      return Object.assign(info, { animationPromise });
    }
    renderLinks(nodes) {
      const svgg = this.util.getSvgForRendering().select("g");
      const keyFn = (d) => d.data.id;
      const boundLinkNodes = svgg.selectAll("path.internode-link").data(
        nodes.filter((n) => !!n.parent),
        keyFn
      );
      boundLinkNodes.enter().insert("path", "g").attr("class", (node) => this.cssClassForLink(node)).merge(boundLinkNodes).attr("d", (node) => {
        const linkPoints = node.data.primaryMarriage ? this.additionalMarriageLinkPoints(node) : this.linkPoints(node.parent, node, node.data.linkFromParentType);
        return points2pathd(linkPoints);
      });
      boundLinkNodes.exit().remove();
      const boundLinkStubNodes = svgg.selectAll("g.link-stubs").data(
        nodes.filter(
          (n) => n.data.duplicateOf || n.data.duplicated || n.data.primaryMarriage
        ),
        keyFn
      );
      const linkStubNodesEnter = boundLinkStubNodes.enter().insert("g", "g").attr("class", "link-stubs");
      boundLinkStubNodes.exit().remove();
      const boundLinkStubs = linkStubNodesEnter.merge(boundLinkStubNodes).selectAll("g").data(
        (node) => this.nodeToLinkStubRenderInfos(node),
        (d) => d.linkType.toString()
      );
      boundLinkStubs.enter().append("g").call(
        (g) => g.append("path").attr("class", (d) => this.cssClassForLinkStub(d.linkType)).merge(boundLinkStubs.select("path.link-stub")).attr("d", (d) => points2pathd(d.points))
      ).call(
        (g) => g.append("circle").attr("r", LINK_STUB_CIRCLE_R).style("stroke", "black").style("fill", "none").merge(boundLinkStubs.select("circle")).attr(
          "transform",
          (d) => `translate(${last(d.points).x}, ${last(d.points).y + LINK_STUB_CIRCLE_R * d.treeDir})`
        )
      );
      boundLinkStubs.exit().remove();
    }
    cssClassForLink(fromNode) {
      if (fromNode.data.primaryMarriage) {
        return "link internode-link additional-marriage";
      }
      return "link internode-link " + this.cssClassForLinkType(fromNode.data.linkFromParentType);
    }
    cssClassForLinkStub(linkType) {
      return "link link-stub " + this.cssClassForLinkType(linkType);
    }
    cssClassForLinkType(linkType) {
      switch (linkType) {
        case 0 /* IndiParents */:
        case 2 /* SpouseParents */:
          return "parents-link";
        case 1 /* IndiSiblings */:
        case 3 /* SpouseSiblings */:
          return "siblings-link";
        case 4 /* Children */:
          return "children-link";
      }
    }
    nodeToLinkStubRenderInfos(node) {
      return node.data.linkStubs.map((linkType) => {
        const isUpTree = node.y < node.parent.y;
        const treeDir = isUpTree ? -1 : 1;
        const anchorPoints = this.linkAnchorPoints(node, linkType, isUpTree);
        const y = node.data.linkYs.children - (2 * LINKS_SEPARATION + 2 * LINK_STUB_CIRCLE_R) * treeDir;
        return {
          treeDir,
          linkType,
          points: [...anchorPoints, { x: last(anchorPoints).x, y }]
        };
      });
    }
    getLinkY(node, type) {
      switch (type) {
        case 0 /* IndiParents */:
          return node.data.linkYs.indi;
        case 1 /* IndiSiblings */:
          return node.data.linkYs.indi;
        case 2 /* SpouseParents */:
          return node.data.linkYs.spouse;
        case 3 /* SpouseSiblings */:
          return node.data.linkYs.spouse;
        case 4 /* Children */:
          return node.data.linkYs.children;
      }
    }
    setLinkYs(node, isUpTree) {
      const treeDir = isUpTree ? -1 : 1;
      const base = node.y + (node.data.height / 2 + LINKS_BASE_OFFSET) * treeDir;
      const offset = LINKS_SEPARATION * treeDir;
      const [indiOffsetDir, spouseOffsetDir] = this.calcLinkOffsetDirs(node);
      node.data.linkYs = {
        indi: base + offset * indiOffsetDir,
        spouse: base + offset * spouseOffsetDir,
        children: base
      };
    }
    /***
     * Calculates indi (indiParent and indiSiblings) and spouse (spouseParent and spouseSiblings)
     * links offset directions, so they don't merge/collide with children links and with each other.
     ***/
    calcLinkOffsetDirs(node) {
      const childNodes = node.data.childNodes;
      if (childNodes.children.length) {
        const indiParentLinkAnchorX = this.linkAnchorPoints(
          node,
          0 /* IndiParents */,
          true
        )[0].x;
        const spouseParentLinkAnchorX = this.linkAnchorPoints(
          node,
          2 /* SpouseParents */,
          true
        )[0].x;
        const childrenLinksX = {
          min: this.findMinXOfChildNodesAnchors(node, childNodes.children),
          max: this.findMaxXOfChildNodesAnchors(node, childNodes.children)
        };
        if (childrenLinksX.min < indiParentLinkAnchorX && childrenLinksX.max > spouseParentLinkAnchorX) {
          return [-1, -1];
        } else if (childrenLinksX.min < indiParentLinkAnchorX) {
          return [-1, 1];
        } else if (childrenLinksX.max > spouseParentLinkAnchorX) {
          return [1, -1];
        }
      } else if ((childNodes.indiParents.length || childNodes.indiSiblings.length) && (childNodes.spouseParents.length || childNodes.spouseSiblings.length)) {
        const indiParentLinkAnchorX = this.linkAnchorPoints(
          node,
          0 /* IndiParents */,
          true
        )[0].x;
        const spouseLinksMinX = this.findMinXOfChildNodesAnchors(
          node,
          childNodes.spouseSiblings.concat(childNodes.spouseParents)
        );
        if (spouseLinksMinX < indiParentLinkAnchorX) {
          return [-1, 1];
        }
      }
      return [1, -1];
    }
    findMinXOfChildNodesAnchors(parentNode, childNodes) {
      return this.findExtremeXOfChildNodesAnchors(parentNode, childNodes, true);
    }
    findMaxXOfChildNodesAnchors(parentNode, childNodes) {
      return this.findExtremeXOfChildNodesAnchors(parentNode, childNodes, false);
    }
    findExtremeXOfChildNodesAnchors(parentNode, childNodes, isMin) {
      const extremeFindingFunction = isMin ? min : max;
      const dir = isMin ? -1 : 1;
      const childNodesSet = new Set(childNodes);
      return extremeFindingFunction(
        parentNode.children.filter((n) => childNodesSet.has(n.data)),
        (n) => n.x + dir * n.data.width / 2
      ) + dir * SIBLING_LINK_STARTER_LENGTH;
    }
    linkPoints(from, to, type) {
      const isUpTree = from.y > to.y;
      const pointsFrom = this.linkAnchorPoints(from, type, isUpTree);
      const pointsTo = this.linkAnchorPoints(
        to,
        otherSideLinkType(type),
        !isUpTree
      ).reverse();
      const y = this.getLinkY(from, type);
      return [
        ...pointsFrom,
        { x: pointsFrom[pointsFrom.length - 1].x, y },
        { x: pointsTo[0].x, y },
        ...pointsTo
      ];
    }
    additionalMarriageLinkPoints(node) {
      const nodeIndex = node.parent.children.findIndex(
        (n) => n.data.id === node.data.id
      );
      const prevSiblingNode = node.parent.children[nodeIndex - 1];
      const y = this.indiMidY(node);
      return [
        { x: prevSiblingNode.x, y },
        { x: node.x, y }
      ];
    }
    linkAnchorPoints(node, type, top) {
      const [x, y] = [node.x, node.y];
      const [w, h] = [node.data.width, node.data.height];
      const leftEdge = x - w / 2;
      const rightEdge = x + w / 2;
      const [indiW, spouseW, familyW] = [
        node.data.indi,
        node.data.spouse,
        node.data.family
      ].map((e) => e ? e.width : 0);
      const indisW = indiW + spouseW;
      const indisLeftEdge = x - w / 2 + (familyW > indisW ? (familyW - indisW) / 2 : 0);
      const indisRightEdge = indisLeftEdge + indisW;
      const siblingAnchorY = this.indiMidY(node) + SIBLING_LINK_ANCHOR_Y_OFFSET * (top ? -1 : 1);
      switch (type) {
        case 0 /* IndiParents */:
          return [
            { x: indisLeftEdge + PARENT_LINK_ANCHOR_X_OFFSET, y: y - h / 2 }
          ];
        case 2 /* SpouseParents */:
          return [
            { x: indisRightEdge - PARENT_LINK_ANCHOR_X_OFFSET, y: y - h / 2 }
          ];
        case 1 /* IndiSiblings */:
          return [
            { x: indisLeftEdge, y: siblingAnchorY },
            {
              x: (familyW > indisW && !top ? leftEdge : indisLeftEdge) - SIBLING_LINK_STARTER_LENGTH,
              y: siblingAnchorY
            }
          ];
        case 3 /* SpouseSiblings */:
          return [
            { x: indisRightEdge, y: siblingAnchorY },
            {
              x: (familyW > indisW && !top ? rightEdge : indisRightEdge) + SIBLING_LINK_STARTER_LENGTH,
              y: siblingAnchorY
            }
          ];
        case 4 /* Children */:
          return [
            { x: indisLeftEdge + (node.data.spouse ? indiW : indiW / 2), y }
          ];
      }
    }
    indiMidY(node) {
      return node.y - node.data.height / 2 + node.data.indi.height / 2;
    }
    renderRootDummyAdditionalMarriageLinkStub(root2) {
      const svgg = this.util.getSvgForRendering().select("g");
      const y = this.indiMidY(root2);
      const x = root2.data.width / 2 + 20;
      const r2 = 3;
      svgg.selectAll(".root-dummy-additional-marriage").remove();
      svgg.insert("g", "g").attr("class", "root-dummy-additional-marriage").call(
        (g) => g.append("path").attr("d", `M 0 ${y} L ${x} ${y}`).attr("class", "link additional-marriage")
      ).call(
        (g) => g.append("circle").attr("transform", `translate(${x + r2}, ${y})`).attr("r", r2).style("stroke", "black").style("fill", "black")
      );
    }
  };

  // src/kinship/hierarchy-filter.ts
  var HierarchyFilter = class _HierarchyFilter {
    constructor(overrides = {}) {
      this.indiParents = true;
      this.indiSiblings = true;
      this.spouseParents = true;
      this.spouseSiblings = true;
      this.children = true;
      this.modify(overrides);
    }
    static allAccepting() {
      return new _HierarchyFilter();
    }
    static allRejecting() {
      return new _HierarchyFilter().modify({
        indiParents: false,
        indiSiblings: false,
        spouseParents: false,
        spouseSiblings: false,
        children: false
      });
    }
    modify(overrides) {
      Object.assign(this, overrides);
      return this;
    }
  };

  // src/kinship/hierarchy-creator.ts
  var HierarchyCreator = class _HierarchyCreator {
    constructor(data, startEntryId) {
      this.data = data;
      // If startEntryId field is a fam id, then startFamIndi field can indicate which spouse in this family is the starting point of the hierarchy
      this.queuedNodesById = /* @__PURE__ */ new Map();
      this.idGenerator = new IdGenerator();
      [this.startEntryId, this.startFamIndi] = this.expandStartId(startEntryId);
    }
    static {
      this.UP_FILTER = HierarchyFilter.allRejecting().modify({
        indiParents: true,
        spouseParents: true,
        indiSiblings: true,
        spouseSiblings: true
      });
    }
    static {
      this.DOWN_FILTER = HierarchyFilter.allRejecting().modify({
        children: true
      });
    }
    static {
      this.ALL_ACCEPTING_FILTER = HierarchyFilter.allAccepting();
    }
    static createHierarchy(data, startEntryId) {
      return new _HierarchyCreator(data, startEntryId).createHierarchy();
    }
    // Convert entry id to values of startEntryId and startFamIndi fields
    expandStartId(startEntryId) {
      if (startEntryId.isFam) return [startEntryId, null];
      const indi = this.data.getIndi(startEntryId.id);
      if (!indi) throw new Error("Invalid startId");
      const famsIds = indi.getFamiliesAsSpouse();
      if (famsIds.length) return [EntryId.fam(famsIds[0]), startEntryId.id];
      return [startEntryId, null];
    }
    createHierarchy() {
      const upRoot = this.idToNode(this.startEntryId, null, null, false);
      const downRoot = this.idToNode(this.startEntryId, null, null, false);
      if (!upRoot || !downRoot) throw new Error("Invalid root node");
      if (this.startFamIndi) {
        upRoot.indi = { id: this.startFamIndi };
        downRoot.indi = { id: this.startFamIndi };
      }
      const queue = [upRoot, downRoot];
      while (queue.length) {
        const node = queue.shift();
        const filter2 = node === upRoot ? _HierarchyCreator.UP_FILTER : node === downRoot ? _HierarchyCreator.DOWN_FILTER : _HierarchyCreator.ALL_ACCEPTING_FILTER;
        this.fillNodeData(node, filter2);
        for (const childNode of node.childNodes.getAll()) {
          queue.push(childNode);
        }
      }
      const getChildNodes = (node) => {
        const childNodes = node.childNodes.getAll();
        return childNodes.length ? childNodes : null;
      };
      return {
        upRoot: hierarchy2(upRoot, getChildNodes),
        downRoot: hierarchy2(downRoot, getChildNodes)
      };
    }
    fillNodeData(node, filter2) {
      if (this.isFamNode(node)) {
        const fam = this.data.getFam(node.id);
        const [indiId, spouseId] = node.indi && node.indi.id === fam.getMother() ? [fam.getMother(), fam.getFather()] : [fam.getFather(), fam.getMother()];
        Object.assign(node, {
          id: this.idGenerator.getId(node.id),
          indi: indiId && { id: indiId },
          spouse: spouseId && { id: spouseId }
        });
        if (!node.duplicateOf && !node.duplicated) {
          node.childNodes = this.childNodesForFam(fam, node, filter2);
        }
      } else {
        const indi = this.data.getIndi(node.id);
        Object.assign(node, {
          id: this.idGenerator.getId(node.id),
          indi: { id: indi.getId() }
        });
        if (!node.duplicateOf && !node.duplicated) {
          node.childNodes = this.childNodesForIndi(indi, node, filter2);
        }
      }
      node.linkStubs = this.createLinkStubs(node);
    }
    childNodesForFam(fam, parentNode, filter2) {
      const indi = parentNode.indi ? this.data.getIndi(parentNode.indi.id) : null;
      const spouse = parentNode.spouse ? this.data.getIndi(parentNode.spouse.id) : null;
      const [indiParentsFamsIds, indiSiblingsIds] = this.getParentsAndSiblings(indi);
      const [spouseParentsFamsIds, spouseSiblingsIds] = this.getParentsAndSiblings(spouse);
      const childrenIds = fam.getChildren();
      return new ChildNodes({
        indiParents: filter2.indiParents ? this.famAsSpouseIdsToNodes(
          indiParentsFamsIds,
          parentNode,
          0 /* IndiParents */
        ) : [],
        indiSiblings: filter2.indiSiblings ? this.indiIdsToFamAsSpouseNodes(
          indiSiblingsIds,
          parentNode,
          1 /* IndiSiblings */
        ) : [],
        spouseParents: filter2.spouseParents ? this.famAsSpouseIdsToNodes(
          spouseParentsFamsIds,
          parentNode,
          2 /* SpouseParents */
        ) : [],
        spouseSiblings: filter2.spouseSiblings ? this.indiIdsToFamAsSpouseNodes(
          spouseSiblingsIds,
          parentNode,
          3 /* SpouseSiblings */
        ) : [],
        children: filter2.children ? this.indiIdsToFamAsSpouseNodes(
          childrenIds,
          parentNode,
          4 /* Children */
        ) : []
      });
    }
    childNodesForIndi(indi, parentNode, filter2) {
      const [indiParentsFamsIds, indiSiblingsIds] = this.getParentsAndSiblings(indi);
      return new ChildNodes({
        indiParents: filter2.indiParents ? this.famAsSpouseIdsToNodes(
          indiParentsFamsIds,
          parentNode,
          0 /* IndiParents */
        ) : [],
        indiSiblings: filter2.indiSiblings ? this.indiIdsToFamAsSpouseNodes(
          indiSiblingsIds,
          parentNode,
          1 /* IndiSiblings */
        ) : []
      });
    }
    areParentsAndSiblingsPresent(indiId) {
      const indi = indiId && this.data.getIndi(indiId);
      const famcId = indi && indi.getFamilyAsChild();
      const famc = famcId && this.data.getFam(famcId);
      if (!famc) return [false, false];
      return [
        !!(famc.getFather() || famc.getMother()),
        famc.getChildren().length > 1
      ];
    }
    getParentsAndSiblings(indi) {
      const indiFamcId = indi && indi.getFamilyAsChild();
      const indiFamc = this.data.getFam(indiFamcId);
      if (!indiFamc) return [[], []];
      const father = this.data.getIndi(indiFamc.getFather());
      const mother = this.data.getIndi(indiFamc.getMother());
      const parentFamsIds = [].concat(
        father ? father.getFamiliesAsSpouse() : [],
        mother ? mother.getFamiliesAsSpouse() : []
      ).filter((id2) => id2 !== indiFamcId);
      parentFamsIds.unshift(indiFamcId);
      const siblingsIds = Array.from(indiFamc.getChildren());
      siblingsIds.splice(siblingsIds.indexOf(indi.getId()), 1);
      return [parentFamsIds, siblingsIds];
    }
    indiIdsToFamAsSpouseNodes(indiIds, parentNode, childNodeType) {
      return indiIds.flatMap(
        (id2) => this.indiIdToFamAsSpouseNodes(id2, parentNode, childNodeType)
      );
    }
    indiIdToFamAsSpouseNodes(indiId, parentNode, childNodeType) {
      if (this.isChildNodeTypeForbidden(childNodeType, parentNode)) return [];
      const famsIds = this.data.getIndi(indiId).getFamiliesAsSpouse();
      if (!famsIds.length) {
        const node = this.idToNode(
          EntryId.indi(indiId),
          parentNode,
          childNodeType
        );
        return node ? [node] : [];
      }
      const famsNodes = famsIds.map((id2) => {
        return {
          id: id2,
          indi: { id: indiId },
          family: { id: id2 },
          parentNode,
          linkFromParentType: childNodeType,
          childNodes: ChildNodes.EMPTY,
          linkStubs: []
        };
      });
      famsNodes.forEach((node, i) => {
        if (i !== 0) node.primaryMarriage = famsNodes[0];
        const duplicateOf = this.queuedNodesById.get(node.id);
        if (duplicateOf) {
          node.duplicateOf = duplicateOf;
          duplicateOf.duplicated = true;
        } else this.queuedNodesById.set(node.id, node);
      });
      return famsNodes;
    }
    famAsSpouseIdsToNodes(famsIds, parentNode, childNodeType) {
      const nodes = this.idsToNodes(
        famsIds.map(EntryId.fam),
        parentNode,
        childNodeType
      );
      nodes.slice(1).forEach((node) => node.primaryMarriage = nodes[0]);
      return nodes;
    }
    idsToNodes(entryIds, parentNode, childNodeType, duplicateCheck = true) {
      return entryIds.map(
        (entryId) => this.idToNode(entryId, parentNode, childNodeType, duplicateCheck)
      ).filter((node) => node != null);
    }
    idToNode(entryId, parentNode, childNodeType, duplicateCheck = true) {
      if (this.isChildNodeTypeForbidden(childNodeType, parentNode)) return null;
      const { id: id2, isFam } = entryId;
      if (isFam) {
        const fam = this.data.getFam(id2);
        if (!fam || !fam.getFather() && !fam.getMother()) return null;
      }
      const duplicateOf = this.queuedNodesById.get(id2);
      const node = {
        id: id2,
        parentNode,
        linkFromParentType: childNodeType,
        childNodes: ChildNodes.EMPTY,
        linkStubs: []
      };
      if (isFam) node.family = { id: id2 };
      if (duplicateCheck && duplicateOf) {
        node.duplicateOf = duplicateOf;
        duplicateOf.duplicated = true;
      }
      if (!duplicateOf) this.queuedNodesById.set(id2, node);
      return node;
    }
    createLinkStubs(node) {
      if (!this.isFamNode(node) || !node.duplicateOf && !node.duplicated && !node.primaryMarriage) {
        return [];
      }
      const fam = this.data.getFam(node.family.id);
      const [indiParentsPresent, indiSiblingsPresent] = this.areParentsAndSiblingsPresent(node.indi ? node.indi.id : null);
      const [spouseParentsPresent, spouseSiblingsPresent] = this.areParentsAndSiblingsPresent(node.spouse ? node.spouse.id : null);
      const childrenPresent = nonEmpty(fam.getChildren());
      return [
        indiParentsPresent ? [0 /* IndiParents */] : [],
        indiSiblingsPresent ? [1 /* IndiSiblings */] : [],
        spouseParentsPresent ? [2 /* SpouseParents */] : [],
        spouseSiblingsPresent ? [3 /* SpouseSiblings */] : [],
        childrenPresent ? [4 /* Children */] : []
      ].flat().filter(
        (linkType) => !this.isChildNodeTypeForbidden(linkType, node) && !node.childNodes.get(linkType).length
      );
    }
    isChildNodeTypeForbidden(childNodeType, parentNode) {
      if (childNodeType === null || !parentNode) return false;
      switch (otherSideLinkType(parentNode.linkFromParentType)) {
        case 0 /* IndiParents */:
        case 1 /* IndiSiblings */:
          if (childNodeType === 0 /* IndiParents */ || childNodeType === 1 /* IndiSiblings */) {
            return true;
          }
          break;
        case 4 /* Children */:
          if (!parentNode.primaryMarriage && childNodeType === 4 /* Children */) {
            return true;
          }
          break;
      }
      if (parentNode.primaryMarriage) {
        const indiId = parentNode.indi.id;
        const spouseId = parentNode.spouse.id;
        const pmIndiId = parentNode.primaryMarriage.indi.id;
        const pmSpouseId = parentNode.primaryMarriage.spouse.id;
        if (indiId === pmIndiId || indiId === pmSpouseId) {
          if (childNodeType === 0 /* IndiParents */ || childNodeType === 1 /* IndiSiblings */) {
            return true;
          }
        } else if (spouseId === pmIndiId || spouseId === pmSpouseId) {
          if (childNodeType === 2 /* SpouseParents */ || childNodeType === 3 /* SpouseSiblings */) {
            return true;
          }
        }
      }
      return false;
    }
    isFamNode(node) {
      return !!node.family;
    }
  };
  var EntryId = class _EntryId {
    static indi(id2) {
      return new _EntryId(id2, null);
    }
    static fam(id2) {
      return new _EntryId(null, id2);
    }
    constructor(indiId, famId) {
      if (!indiId && !famId) throw new Error("Invalid EntryId");
      this.id = indiId || famId;
      this.isFam = !!famId;
    }
  };
  function getRootsCount(upRoot, data) {
    const upIndi = upRoot.data.indi && data.getIndi(upRoot.data.indi.id);
    const upSpouse = upRoot.data.spouse && data.getIndi(upRoot.data.spouse.id);
    return (upIndi ? upIndi.getFamiliesAsSpouse().length : 0) + (upSpouse ? upSpouse.getFamiliesAsSpouse().length - 1 : 0);
  }

  // src/kinship-chart.ts
  var KinshipChart = class {
    constructor(options) {
      this.options = options;
      this.renderer = new KinshipChartRenderer(this.options);
    }
    render() {
      const hierarchy3 = HierarchyCreator.createHierarchy(
        this.options.data,
        new EntryId(
          this.options.startIndi || null,
          this.options.startFam || null
        )
      );
      const [upNodes, downNodes] = this.renderer.layOut(
        hierarchy3.upRoot,
        hierarchy3.downRoot
      );
      upNodes.concat(downNodes).forEach((node) => {
        this.setChildNodesGenerationNumber(node);
      });
      return this.renderer.render(
        upNodes,
        downNodes,
        getRootsCount(hierarchy3.upRoot, this.options.data)
      );
    }
    setChildNodesGenerationNumber(node) {
      const childNodes = this.getChildNodesByType(node);
      const setGenerationNumber = (childNodes2, value) => childNodes2.forEach(
        (n) => n.data.generation = node.data.generation + value
      );
      setGenerationNumber(childNodes.indiParents, -1);
      setGenerationNumber(childNodes.indiSiblings, 0);
      setGenerationNumber(childNodes.spouseParents, -1);
      setGenerationNumber(childNodes.spouseSiblings, 0);
      setGenerationNumber(childNodes.children, 1);
    }
    getChildNodesByType(node) {
      if (!node || !node.children) return EMPTY_HIERARCHY_TREE_NODES;
      const childNodesById = new Map(
        node.children.map(
          (n) => [n.data.id, n]
        )
      );
      const nodeToHNode = (n) => childNodesById.get(n.id);
      const childNodes = node.data.childNodes;
      return {
        indiParents: childNodes.indiParents.map(nodeToHNode),
        indiSiblings: childNodes.indiSiblings.map(nodeToHNode),
        spouseParents: childNodes.spouseParents.map(nodeToHNode),
        spouseSiblings: childNodes.spouseSiblings.map(nodeToHNode),
        children: childNodes.children.map(nodeToHNode)
      };
    }
  };
  var EMPTY_HIERARCHY_TREE_NODES = {
    indiParents: [],
    indiSiblings: [],
    spouseParents: [],
    spouseSiblings: [],
    children: []
  };

  // src/relatives-chart.ts
  var FilterChildFam = class {
    constructor(fam, childId) {
      this.fam = fam;
      this.childId = childId;
    }
    getId() {
      return this.fam.getId();
    }
    getFather() {
      return this.fam.getFather();
    }
    getMother() {
      return this.fam.getMother();
    }
    getChildren() {
      const children2 = [...this.fam.getChildren()];
      const index = children2.indexOf(this.childId);
      if (index !== -1) {
        children2.splice(index, 1);
      }
      return children2;
    }
  };
  var FilterChildData = class {
    constructor(data, childId) {
      this.data = data;
      this.childId = childId;
    }
    getIndi(id2) {
      return this.data.getIndi(id2);
    }
    getFam(id2) {
      return new FilterChildFam(this.data.getFam(id2), this.childId);
    }
  };
  var RelativesChart = class {
    constructor(inputOptions) {
      this.options = { ...inputOptions };
      this.options.idGenerator = this.options.idGenerator || new IdGenerator();
      this.util = new ChartUtil(this.options);
    }
    layOutAncestorDescendants(ancestorsRoot, focusedNode) {
      const ancestorData = /* @__PURE__ */ new Map();
      ancestorsRoot.eachAfter((node) => {
        if (!node.parent) {
          return;
        }
        const descendantOptions = { ...this.options };
        descendantOptions.startFam = node.data.family.id;
        delete descendantOptions.startIndi;
        const child = node.id === node.parent.data.spouseParentNodeId ? node.parent.data.spouse.id : node.parent.data.indi.id;
        descendantOptions.data = new FilterChildData(
          descendantOptions.data,
          child
        );
        descendantOptions.baseGeneration = (this.options.baseGeneration || 0) - node.depth;
        const descendantNodes = layOutDescendants(descendantOptions);
        node.data.id = descendantNodes[0].id;
        if (node.data.indi?.expander !== void 0) {
          descendantNodes[0].data.indi.expander = node.data.indi.expander;
        }
        if (node.data.spouse?.expander !== void 0) {
          descendantNodes[0].data.spouse.expander = node.data.spouse.expander;
        }
        const chartInfo = getChartInfoWithoutMargin(descendantNodes);
        const parentData = (node.children || []).map(
          (childNode) => ancestorData.get(childNode.data.id)
        );
        const parentHeight = parentData.map((data2) => data2.height).reduce((a, b) => a + b + V_SPACING, 0);
        const data = {
          descendantNodes,
          width: chartInfo.size[0],
          height: chartInfo.size[1] + parentHeight,
          x: chartInfo.origin[0],
          y: chartInfo.origin[1] + parentHeight
        };
        ancestorData.set(node.data.id, data);
      });
      ancestorsRoot.each((node) => {
        if (!node.parent) {
          return;
        }
        const data = ancestorData.get(node.data.id);
        const parentData = ancestorData.get(node.parent.data.id);
        data.left = parentData && !parentData.middle ? !!parentData.left : node.parent.data.indiParentNodeId === node.id;
        data.middle = (!parentData || !!parentData.middle) && node.parent.children.length === 1;
      });
      ancestorsRoot.each((node) => {
        const data = ancestorData.get(node.data.id);
        const thisNode = data ? data.descendantNodes[0] : focusedNode;
        (node.children || []).forEach((child) => {
          const childNode = ancestorData.get(child.data.id).descendantNodes[0];
          childNode.parent = thisNode;
        });
        if (node.data.indiParentNodeId && node.children) {
          thisNode.data.indiParentNodeId = node.children.find(
            (childNode) => childNode.id === node.data.indiParentNodeId
          ).data.id;
        }
        if (node.data.spouseParentNodeId && node.children) {
          thisNode.data.spouseParentNodeId = node.children.find(
            (childNode) => childNode.id === node.data.spouseParentNodeId
          ).data.id;
        }
      });
      ancestorsRoot.each((node) => {
        const nodeData = ancestorData.get(node.data.id);
        const thisNode = nodeData ? nodeData.descendantNodes[0] : focusedNode;
        const indiParent = node.children && node.children.find((child) => child.id === node.data.indiParentNodeId);
        const spouseParent = node.children && node.children.find(
          (child) => child.id === node.data.spouseParentNodeId
        );
        const nodeX = thisNode.x;
        const nodeY = thisNode.y;
        const nodeWidth = thisNode.data.width;
        const nodeHeight = thisNode.data.height;
        const indiWidth = thisNode.data.indi ? thisNode.data.indi.width : 0;
        const spouseWidth = thisNode.data.spouse ? thisNode.data.spouse.width : 0;
        if (indiParent) {
          const data = ancestorData.get(indiParent.data.id);
          const parentNode = data.descendantNodes[0];
          const parentData = parentNode.data;
          const spouseTreeHeight = spouseParent ? ancestorData.get(spouseParent.data.id).height + V_SPACING : 0;
          const dx = nodeX + data.x - nodeWidth / 2 + indiWidth / 2 + (data.left ? -data.width - H_SPACING : H_SPACING);
          const dy = nodeY + data.y - nodeHeight / 2 - data.height + (data.left ? -V_SPACING : -spouseTreeHeight - V_SPACING);
          data.descendantNodes.forEach((node2) => {
            node2.x += dx;
            node2.y += dy;
          });
          const middleX = indiWidth / 2 - nodeWidth / 2 + parentData.width / 2 - (parentData.indi ? parentData.indi.width : parentData.spouse.width);
          if (data.middle) {
            parentNode.x = 0;
          } else if (!nodeData || nodeData.middle) {
            parentNode.x = -nodeWidth / 2 - parentData.width / 2 + indiWidth - H_SPACING / 2;
          } else if (data.left) {
            parentNode.x = nodeX + min([
              nodeWidth / 2 - parentData.width / 2 - spouseWidth / 2 - H_SPACING,
              middleX
            ]);
          } else {
            parentNode.x = nodeX + max([parentData.width / 2 - nodeWidth / 2, middleX]);
          }
        }
        if (spouseParent) {
          const data = ancestorData.get(spouseParent.data.id);
          const parentNode = data.descendantNodes[0];
          const parentData = parentNode.data;
          const indiTreeHeight = indiParent ? ancestorData.get(indiParent.data.id).height + V_SPACING : 0;
          const dx = nodeX + data.x + nodeWidth / 2 - spouseWidth / 2 + (data.left ? -data.width - H_SPACING : H_SPACING);
          const dy = nodeY + data.y - nodeHeight / 2 - data.height + (data.left ? -indiTreeHeight - V_SPACING : -V_SPACING);
          data.descendantNodes.forEach((node2) => {
            node2.x += dx;
            node2.y += dy;
          });
          const middleX = nodeWidth / 2 - spouseWidth / 2 + parentData.width / 2 - (parentData.indi ? parentData.indi.width : parentData.spouse.width);
          if (data.middle) {
            parentNode.x = 0;
          } else if (!nodeData || nodeData.middle) {
            parentNode.x = nodeWidth / 2 + parentData.width / 2 - spouseWidth + H_SPACING / 2;
          } else if (data.left) {
            parentNode.x = nodeX + min([nodeWidth / 2 - parentData.width / 2, middleX]);
          } else {
            parentNode.x = nodeX + max([
              parentData.width / 2 - nodeWidth / 2 + indiWidth / 2 + H_SPACING,
              middleX
            ]);
          }
        }
      });
      return Array.from(ancestorData.values()).map((data) => data.descendantNodes).reduce((a, b) => a.concat(b), []);
    }
    render() {
      const descendantNodes = layOutDescendants(this.options);
      const ancestorOptions = Object.assign({}, this.options, {
        idGenerator: void 0
      });
      const ancestorsRoot = getAncestorsTree(ancestorOptions);
      if (ancestorsRoot.data.indi?.expander !== void 0) {
        descendantNodes[0].data.indi.expander = ancestorsRoot.data.indi?.expander;
      }
      if (ancestorsRoot.data.spouse?.expander !== void 0) {
        descendantNodes[0].data.spouse.expander = ancestorsRoot.data.spouse?.expander;
      }
      const ancestorDescentants = this.layOutAncestorDescendants(
        ancestorsRoot,
        descendantNodes[0]
      );
      const nodes = descendantNodes.concat(ancestorDescentants);
      const animationPromise = this.util.renderChart(nodes);
      const info = getChartInfo(nodes);
      this.util.updateSvgDimensions(info);
      return Object.assign(info, { animationPromise });
    }
  };

  // src/simple-api.ts
  var DEFAULT_SVG_SELECTOR = "svg";
  function createChartOptions(chartOptions, renderOptions, options) {
    const data = new JsonDataProvider(chartOptions.json);
    const indiHrefFunc = chartOptions.indiUrl ? (id2) => chartOptions.indiUrl.replace("${id}", id2) : void 0;
    const famHrefFunc = chartOptions.famUrl ? (id2) => chartOptions.famUrl.replace("${id}", id2) : void 0;
    if (!renderOptions.startIndi && !renderOptions.startFam) {
      renderOptions.startIndi = chartOptions.json.indis[0].id;
    }
    const animate = !options.initialRender && chartOptions.animate;
    const rendererOptions = { data };
    if (indiHrefFunc) {
      rendererOptions.indiHrefFunc = indiHrefFunc;
    }
    if (famHrefFunc) {
      rendererOptions.famHrefFunc = famHrefFunc;
    }
    if (chartOptions.indiCallback) {
      rendererOptions.indiCallback = chartOptions.indiCallback;
    }
    if (chartOptions.famCallback) {
      rendererOptions.famCallback = chartOptions.famCallback;
    }
    if (chartOptions.horizontal !== void 0) {
      rendererOptions.horizontal = chartOptions.horizontal;
    }
    if (chartOptions.colors !== void 0) {
      rendererOptions.colors = chartOptions.colors;
    }
    if (animate !== void 0) {
      rendererOptions.animate = animate;
    }
    if (chartOptions.locale) {
      rendererOptions.locale = chartOptions.locale;
    }
    const renderer = new chartOptions.renderer(rendererOptions);
    const resultChartOptions = {
      data,
      renderer,
      svgSelector: chartOptions.svgSelector || DEFAULT_SVG_SELECTOR
    };
    if (renderOptions.startIndi) {
      resultChartOptions.startIndi = renderOptions.startIndi;
    }
    if (renderOptions.startFam) {
      resultChartOptions.startFam = renderOptions.startFam;
    }
    if (chartOptions.horizontal !== void 0) {
      resultChartOptions.horizontal = chartOptions.horizontal;
    }
    if (renderOptions.baseGeneration !== void 0) {
      resultChartOptions.baseGeneration = renderOptions.baseGeneration;
    }
    if (animate !== void 0) {
      resultChartOptions.animate = animate;
    }
    if (chartOptions.expanders !== void 0) {
      resultChartOptions.expanders = chartOptions.expanders;
    }
    return resultChartOptions;
  }
  var SimpleChartHandle = class {
    constructor(options) {
      this.options = options;
      this.initialRender = true;
      this.collapsedIndi = /* @__PURE__ */ new Set();
      this.collapsedSpouse = /* @__PURE__ */ new Set();
      this.collapsedFamily = /* @__PURE__ */ new Set();
    }
    render(renderOptions = {}) {
      this.chartOptions = createChartOptions(this.options, renderOptions, {
        initialRender: this.initialRender
      });
      this.chartOptions.collapsedFamily = this.collapsedFamily;
      this.chartOptions.collapsedIndi = this.collapsedIndi;
      this.chartOptions.collapsedSpouse = this.collapsedSpouse;
      this.chartOptions.expanderCallback = (id2, direction) => this.expanderCallback(id2, direction, renderOptions);
      this.initialRender = false;
      const chart = new this.options.chartType(this.chartOptions);
      const info = chart.render();
      if (this.options.updateSvgSize !== false) {
        select_default2(this.chartOptions.svgSelector).attr("width", info.size[0]).attr("height", info.size[1]);
      }
      return info;
    }
    expanderCallback(id2, direction, renderOptions) {
      const set3 = direction === 2 /* FAMILY */ ? this.collapsedFamily : direction === 0 /* INDI */ ? this.collapsedIndi : this.collapsedSpouse;
      if (set3.has(id2)) {
        set3.delete(id2);
      } else {
        set3.add(id2);
      }
      this.render(renderOptions);
    }
    /**
     * Updates the chart input data.
     * This is useful when the data is dynamically loaded and a different subset
     * of data will be displayed.
     */
    setData(json) {
      this.options.json = json;
    }
  };
  function createChart(options) {
    return new SimpleChartHandle(options);
  }

  // src/simple-renderer.ts
  var MIN_HEIGHT = 27;
  var MIN_WIDTH = 50;
  function getLength2(text) {
    const g = select_default2("svg").append("g").attr("class", "simple node");
    const x = g.append("text").attr("class", "name").text(text);
    const w = x.node().getComputedTextLength();
    g.remove();
    return w;
  }
  function getName(indi) {
    return [indi.getFirstName() || "", indi.getLastName() || ""].join(" ");
  }
  function getYears(indi) {
    const birthDate = indi.getBirthDate();
    const birthYear = birthDate && birthDate.date && birthDate.date.year;
    const deathDate = indi.getDeathDate();
    const deathYear = deathDate && deathDate.date && deathDate.date.year;
    if (!birthYear && !deathYear) {
      return "";
    }
    return `${birthYear || ""} \u2013 ${deathYear || ""}`;
  }
  var SimpleRenderer = class extends CompositeRenderer {
    constructor(options) {
      super(options);
      this.options = options;
    }
    getPreferredIndiSize(id2) {
      const indi = this.options.data.getIndi(id2);
      const years = getYears(indi);
      const width = Math.max(
        getLength2(getName(indi)) + 8,
        getLength2(years),
        MIN_WIDTH
      );
      const height = years ? MIN_HEIGHT + 14 : MIN_HEIGHT;
      return [width, height];
    }
    render(enter, update) {
      const selection2 = enter.merge(update).append("g").attr("class", "simple");
      this.renderIndi(selection2, (node) => node.indi);
      const spouseSelection = selection2.filter((node) => !!node.data.spouse).append("g").attr(
        "transform",
        (node) => this.options.horizontal ? `translate(0, ${node.data.indi.height})` : `translate(${node.data.indi.width}, 0)`
      );
      this.renderIndi(spouseSelection, (node) => node.spouse);
    }
    getCss() {
      return `
.simple text {
  font-family: Montserrat, verdana, arial, sans-serif;
  font-size: 12px;
}

.simple .name {
  font-weight: bold;
}

.simple rect {
  fill: #fff;
  stroke: black;
}

.link {
  fill: none;
  stroke: #000;
  stroke-width: 1px;
}

.additional-marriage {
  stroke-dasharray: 2;
}`;
    }
    renderIndi(selection2, indiFunc) {
      const group = this.options.indiHrefFunc ? selection2.append("a").attr(
        "href",
        (node) => this.options.indiHrefFunc(indiFunc(node.data).id)
      ) : selection2;
      group.append("rect").attr("width", (node) => indiFunc(node.data).width).attr("height", (node) => indiFunc(node.data).height);
      group.append("text").attr("text-anchor", "middle").attr("class", "name").attr(
        "transform",
        (node) => `translate(${indiFunc(node.data).width / 2}, 17)`
      ).text(
        (node) => getName(this.options.data.getIndi(indiFunc(node.data).id))
      );
      group.append("text").attr("text-anchor", "middle").attr("class", "details").attr(
        "transform",
        (node) => `translate(${indiFunc(node.data).width / 2}, 33)`
      ).text(
        (node) => getYears(this.options.data.getIndi(indiFunc(node.data).id))
      );
    }
  };
  return __toCommonJS(index_exports);
})();
