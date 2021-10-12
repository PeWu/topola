(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.topola = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
Array.prototype.flat||Object.defineProperty(Array.prototype,"flat",{configurable:!0,value:function r(){var t=isNaN(arguments[0])?1:Number(arguments[0]);return t?Array.prototype.reduce.call(this,function(a,e){return Array.isArray(e)?a.push.apply(a,r.call(e,t-1)):a.push(e),a},[]):Array.prototype.slice.call(this)},writable:!0}),Array.prototype.flatMap||Object.defineProperty(Array.prototype,"flatMap",{configurable:!0,value:function(r){return Array.prototype.map.apply(this,arguments).flat()},writable:!0})

},{}],2:[function(require,module,exports){
// https://d3js.org/d3-array/ v2.12.1 Copyright 2021 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.d3 = global.d3 || {}));
}(this, (function (exports) { 'use strict';

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function bisector(f) {
  let delta = f;
  let compare = f;

  if (f.length === 1) {
    delta = (d, x) => f(d) - x;
    compare = ascendingComparator(f);
  }

  function left(a, x, lo, hi) {
    if (lo == null) lo = 0;
    if (hi == null) hi = a.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (compare(a[mid], x) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function right(a, x, lo, hi) {
    if (lo == null) lo = 0;
    if (hi == null) hi = a.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (compare(a[mid], x) > 0) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  function center(a, x, lo, hi) {
    if (lo == null) lo = 0;
    if (hi == null) hi = a.length;
    const i = left(a, x, lo, hi - 1);
    return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
  }

  return {left, center, right};
}

function ascendingComparator(f) {
  return (d, x) => ascending(f(d), x);
}

function number(x) {
  return x === null ? NaN : +x;
}

function* numbers(values, valueof) {
  if (valueof === undefined) {
    for (let value of values) {
      if (value != null && (value = +value) >= value) {
        yield value;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
        yield value;
      }
    }
  }
}

const ascendingBisect = bisector(ascending);
const bisectRight = ascendingBisect.right;
const bisectLeft = ascendingBisect.left;
const bisectCenter = bisector(number).center;

function count(values, valueof) {
  let count = 0;
  if (valueof === undefined) {
    for (let value of values) {
      if (value != null && (value = +value) >= value) {
        ++count;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
        ++count;
      }
    }
  }
  return count;
}

function length$1(array) {
  return array.length | 0;
}

function empty(length) {
  return !(length > 0);
}

function arrayify(values) {
  return typeof values !== "object" || "length" in values ? values : Array.from(values);
}

function reducer(reduce) {
  return values => reduce(...values);
}

function cross(...values) {
  const reduce = typeof values[values.length - 1] === "function" && reducer(values.pop());
  values = values.map(arrayify);
  const lengths = values.map(length$1);
  const j = values.length - 1;
  const index = new Array(j + 1).fill(0);
  const product = [];
  if (j < 0 || lengths.some(empty)) return product;
  while (true) {
    product.push(index.map((j, i) => values[i][j]));
    let i = j;
    while (++index[i] === lengths[i]) {
      if (i === 0) return reduce ? product.map(reduce) : product;
      index[i--] = 0;
    }
  }
}

function cumsum(values, valueof) {
  var sum = 0, index = 0;
  return Float64Array.from(values, valueof === undefined
    ? v => (sum += +v || 0)
    : v => (sum += +valueof(v, index++, values) || 0));
}

function descending(a, b) {
  return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
}

function variance(values, valueof) {
  let count = 0;
  let delta;
  let mean = 0;
  let sum = 0;
  if (valueof === undefined) {
    for (let value of values) {
      if (value != null && (value = +value) >= value) {
        delta = value - mean;
        mean += delta / ++count;
        sum += delta * (value - mean);
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
        delta = value - mean;
        mean += delta / ++count;
        sum += delta * (value - mean);
      }
    }
  }
  if (count > 1) return sum / (count - 1);
}

function deviation(values, valueof) {
  const v = variance(values, valueof);
  return v ? Math.sqrt(v) : v;
}

function extent(values, valueof) {
  let min;
  let max;
  if (valueof === undefined) {
    for (const value of values) {
      if (value != null) {
        if (min === undefined) {
          if (value >= value) min = max = value;
        } else {
          if (min > value) min = value;
          if (max < value) max = value;
        }
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null) {
        if (min === undefined) {
          if (value >= value) min = max = value;
        } else {
          if (min > value) min = value;
          if (max < value) max = value;
        }
      }
    }
  }
  return [min, max];
}

// https://github.com/python/cpython/blob/a74eea238f5baba15797e2e8b570d153bc8690a7/Modules/mathmodule.c#L1423
class Adder {
  constructor() {
    this._partials = new Float64Array(32);
    this._n = 0;
  }
  add(x) {
    const p = this._partials;
    let i = 0;
    for (let j = 0; j < this._n && j < 32; j++) {
      const y = p[j],
        hi = x + y,
        lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
      if (lo) p[i++] = lo;
      x = hi;
    }
    p[i] = x;
    this._n = i + 1;
    return this;
  }
  valueOf() {
    const p = this._partials;
    let n = this._n, x, y, lo, hi = 0;
    if (n > 0) {
      hi = p[--n];
      while (n > 0) {
        x = hi;
        y = p[--n];
        hi = x + y;
        lo = y - (hi - x);
        if (lo) break;
      }
      if (n > 0 && ((lo < 0 && p[n - 1] < 0) || (lo > 0 && p[n - 1] > 0))) {
        y = lo * 2;
        x = hi + y;
        if (y == x - hi) hi = x;
      }
    }
    return hi;
  }
}

function fsum(values, valueof) {
  const adder = new Adder();
  if (valueof === undefined) {
    for (let value of values) {
      if (value = +value) {
        adder.add(value);
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if (value = +valueof(value, ++index, values)) {
        adder.add(value);
      }
    }
  }
  return +adder;
}

function fcumsum(values, valueof) {
  const adder = new Adder();
  let index = -1;
  return Float64Array.from(values, valueof === undefined
      ? v => adder.add(+v || 0)
      : v => adder.add(+valueof(v, ++index, values) || 0)
  );
}

class InternMap extends Map {
  constructor(entries, key = keyof) {
    super();
    Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
    if (entries != null) for (const [key, value] of entries) this.set(key, value);
  }
  get(key) {
    return super.get(intern_get(this, key));
  }
  has(key) {
    return super.has(intern_get(this, key));
  }
  set(key, value) {
    return super.set(intern_set(this, key), value);
  }
  delete(key) {
    return super.delete(intern_delete(this, key));
  }
}

class InternSet extends Set {
  constructor(values, key = keyof) {
    super();
    Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
    if (values != null) for (const value of values) this.add(value);
  }
  has(value) {
    return super.has(intern_get(this, value));
  }
  add(value) {
    return super.add(intern_set(this, value));
  }
  delete(value) {
    return super.delete(intern_delete(this, value));
  }
}

function intern_get({_intern, _key}, value) {
  const key = _key(value);
  return _intern.has(key) ? _intern.get(key) : value;
}

function intern_set({_intern, _key}, value) {
  const key = _key(value);
  if (_intern.has(key)) return _intern.get(key);
  _intern.set(key, value);
  return value;
}

function intern_delete({_intern, _key}, value) {
  const key = _key(value);
  if (_intern.has(key)) {
    value = _intern.get(value);
    _intern.delete(key);
  }
  return value;
}

function keyof(value) {
  return value !== null && typeof value === "object" ? value.valueOf() : value;
}

function identity(x) {
  return x;
}

function group(values, ...keys) {
  return nest(values, identity, identity, keys);
}

function groups(values, ...keys) {
  return nest(values, Array.from, identity, keys);
}

function rollup(values, reduce, ...keys) {
  return nest(values, identity, reduce, keys);
}

function rollups(values, reduce, ...keys) {
  return nest(values, Array.from, reduce, keys);
}

function index(values, ...keys) {
  return nest(values, identity, unique, keys);
}

function indexes(values, ...keys) {
  return nest(values, Array.from, unique, keys);
}

function unique(values) {
  if (values.length !== 1) throw new Error("duplicate key");
  return values[0];
}

function nest(values, map, reduce, keys) {
  return (function regroup(values, i) {
    if (i >= keys.length) return reduce(values);
    const groups = new InternMap();
    const keyof = keys[i++];
    let index = -1;
    for (const value of values) {
      const key = keyof(value, ++index, values);
      const group = groups.get(key);
      if (group) group.push(value);
      else groups.set(key, [value]);
    }
    for (const [key, values] of groups) {
      groups.set(key, regroup(values, i));
    }
    return map(groups);
  })(values, 0);
}

function permute(source, keys) {
  return Array.from(keys, key => source[key]);
}

function sort(values, ...F) {
  if (typeof values[Symbol.iterator] !== "function") throw new TypeError("values is not iterable");
  values = Array.from(values);
  let [f = ascending] = F;
  if (f.length === 1 || F.length > 1) {
    const index = Uint32Array.from(values, (d, i) => i);
    if (F.length > 1) {
      F = F.map(f => values.map(f));
      index.sort((i, j) => {
        for (const f of F) {
          const c = ascending(f[i], f[j]);
          if (c) return c;
        }
      });
    } else {
      f = values.map(f);
      index.sort((i, j) => ascending(f[i], f[j]));
    }
    return permute(values, index);
  }
  return values.sort(f);
}

function groupSort(values, reduce, key) {
  return (reduce.length === 1
    ? sort(rollup(values, reduce, key), (([ak, av], [bk, bv]) => ascending(av, bv) || ascending(ak, bk)))
    : sort(group(values, key), (([ak, av], [bk, bv]) => reduce(av, bv) || ascending(ak, bk))))
    .map(([key]) => key);
}

var array = Array.prototype;

var slice = array.slice;

function constant(x) {
  return function() {
    return x;
  };
}

var e10 = Math.sqrt(50),
    e5 = Math.sqrt(10),
    e2 = Math.sqrt(2);

function ticks(start, stop, count) {
  var reverse,
      i = -1,
      n,
      ticks,
      step;

  stop = +stop, start = +start, count = +count;
  if (start === stop && count > 0) return [start];
  if (reverse = stop < start) n = start, start = stop, stop = n;
  if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

  if (step > 0) {
    let r0 = Math.round(start / step), r1 = Math.round(stop / step);
    if (r0 * step < start) ++r0;
    if (r1 * step > stop) --r1;
    ticks = new Array(n = r1 - r0 + 1);
    while (++i < n) ticks[i] = (r0 + i) * step;
  } else {
    step = -step;
    let r0 = Math.round(start * step), r1 = Math.round(stop * step);
    if (r0 / step < start) ++r0;
    if (r1 / step > stop) --r1;
    ticks = new Array(n = r1 - r0 + 1);
    while (++i < n) ticks[i] = (r0 + i) / step;
  }

  if (reverse) ticks.reverse();

  return ticks;
}

function tickIncrement(start, stop, count) {
  var step = (stop - start) / Math.max(0, count),
      power = Math.floor(Math.log(step) / Math.LN10),
      error = step / Math.pow(10, power);
  return power >= 0
      ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
      : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
}

function tickStep(start, stop, count) {
  var step0 = Math.abs(stop - start) / Math.max(0, count),
      step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
      error = step0 / step1;
  if (error >= e10) step1 *= 10;
  else if (error >= e5) step1 *= 5;
  else if (error >= e2) step1 *= 2;
  return stop < start ? -step1 : step1;
}

function nice(start, stop, count) {
  let prestep;
  while (true) {
    const step = tickIncrement(start, stop, count);
    if (step === prestep || step === 0 || !isFinite(step)) {
      return [start, stop];
    } else if (step > 0) {
      start = Math.floor(start / step) * step;
      stop = Math.ceil(stop / step) * step;
    } else if (step < 0) {
      start = Math.ceil(start * step) / step;
      stop = Math.floor(stop * step) / step;
    }
    prestep = step;
  }
}

function sturges(values) {
  return Math.ceil(Math.log(count(values)) / Math.LN2) + 1;
}

function bin() {
  var value = identity,
      domain = extent,
      threshold = sturges;

  function histogram(data) {
    if (!Array.isArray(data)) data = Array.from(data);

    var i,
        n = data.length,
        x,
        values = new Array(n);

    for (i = 0; i < n; ++i) {
      values[i] = value(data[i], i, data);
    }

    var xz = domain(values),
        x0 = xz[0],
        x1 = xz[1],
        tz = threshold(values, x0, x1);

    // Convert number of thresholds into uniform thresholds, and nice the
    // default domain accordingly.
    if (!Array.isArray(tz)) {
      const max = x1, tn = +tz;
      if (domain === extent) [x0, x1] = nice(x0, x1, tn);
      tz = ticks(x0, x1, tn);

      // If the last threshold is coincident with the domain’s upper bound, the
      // last bin will be zero-width. If the default domain is used, and this
      // last threshold is coincident with the maximum input value, we can
      // extend the niced upper bound by one tick to ensure uniform bin widths;
      // otherwise, we simply remove the last threshold. Note that we don’t
      // coerce values or the domain to numbers, and thus must be careful to
      // compare order (>=) rather than strict equality (===)!
      if (tz[tz.length - 1] >= x1) {
        if (max >= x1 && domain === extent) {
          const step = tickIncrement(x0, x1, tn);
          if (isFinite(step)) {
            if (step > 0) {
              x1 = (Math.floor(x1 / step) + 1) * step;
            } else if (step < 0) {
              x1 = (Math.ceil(x1 * -step) + 1) / -step;
            }
          }
        } else {
          tz.pop();
        }
      }
    }

    // Remove any thresholds outside the domain.
    var m = tz.length;
    while (tz[0] <= x0) tz.shift(), --m;
    while (tz[m - 1] > x1) tz.pop(), --m;

    var bins = new Array(m + 1),
        bin;

    // Initialize bins.
    for (i = 0; i <= m; ++i) {
      bin = bins[i] = [];
      bin.x0 = i > 0 ? tz[i - 1] : x0;
      bin.x1 = i < m ? tz[i] : x1;
    }

    // Assign data to bins by value, ignoring any outside the domain.
    for (i = 0; i < n; ++i) {
      x = values[i];
      if (x0 <= x && x <= x1) {
        bins[bisectRight(tz, x, 0, m)].push(data[i]);
      }
    }

    return bins;
  }

  histogram.value = function(_) {
    return arguments.length ? (value = typeof _ === "function" ? _ : constant(_), histogram) : value;
  };

  histogram.domain = function(_) {
    return arguments.length ? (domain = typeof _ === "function" ? _ : constant([_[0], _[1]]), histogram) : domain;
  };

  histogram.thresholds = function(_) {
    return arguments.length ? (threshold = typeof _ === "function" ? _ : Array.isArray(_) ? constant(slice.call(_)) : constant(_), histogram) : threshold;
  };

  return histogram;
}

function max(values, valueof) {
  let max;
  if (valueof === undefined) {
    for (const value of values) {
      if (value != null
          && (max < value || (max === undefined && value >= value))) {
        max = value;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null
          && (max < value || (max === undefined && value >= value))) {
        max = value;
      }
    }
  }
  return max;
}

function min(values, valueof) {
  let min;
  if (valueof === undefined) {
    for (const value of values) {
      if (value != null
          && (min > value || (min === undefined && value >= value))) {
        min = value;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null
          && (min > value || (min === undefined && value >= value))) {
        min = value;
      }
    }
  }
  return min;
}

// Based on https://github.com/mourner/quickselect
// ISC license, Copyright 2018 Vladimir Agafonkin.
function quickselect(array, k, left = 0, right = array.length - 1, compare = ascending) {
  while (right > left) {
    if (right - left > 600) {
      const n = right - left + 1;
      const m = k - left + 1;
      const z = Math.log(n);
      const s = 0.5 * Math.exp(2 * z / 3);
      const sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
      const newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
      const newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
      quickselect(array, k, newLeft, newRight, compare);
    }

    const t = array[k];
    let i = left;
    let j = right;

    swap(array, left, k);
    if (compare(array[right], t) > 0) swap(array, left, right);

    while (i < j) {
      swap(array, i, j), ++i, --j;
      while (compare(array[i], t) < 0) ++i;
      while (compare(array[j], t) > 0) --j;
    }

    if (compare(array[left], t) === 0) swap(array, left, j);
    else ++j, swap(array, j, right);

    if (j <= k) left = j + 1;
    if (k <= j) right = j - 1;
  }
  return array;
}

function swap(array, i, j) {
  const t = array[i];
  array[i] = array[j];
  array[j] = t;
}

function quantile(values, p, valueof) {
  values = Float64Array.from(numbers(values, valueof));
  if (!(n = values.length)) return;
  if ((p = +p) <= 0 || n < 2) return min(values);
  if (p >= 1) return max(values);
  var n,
      i = (n - 1) * p,
      i0 = Math.floor(i),
      value0 = max(quickselect(values, i0).subarray(0, i0 + 1)),
      value1 = min(values.subarray(i0 + 1));
  return value0 + (value1 - value0) * (i - i0);
}

function quantileSorted(values, p, valueof = number) {
  if (!(n = values.length)) return;
  if ((p = +p) <= 0 || n < 2) return +valueof(values[0], 0, values);
  if (p >= 1) return +valueof(values[n - 1], n - 1, values);
  var n,
      i = (n - 1) * p,
      i0 = Math.floor(i),
      value0 = +valueof(values[i0], i0, values),
      value1 = +valueof(values[i0 + 1], i0 + 1, values);
  return value0 + (value1 - value0) * (i - i0);
}

function freedmanDiaconis(values, min, max) {
  return Math.ceil((max - min) / (2 * (quantile(values, 0.75) - quantile(values, 0.25)) * Math.pow(count(values), -1 / 3)));
}

function scott(values, min, max) {
  return Math.ceil((max - min) / (3.5 * deviation(values) * Math.pow(count(values), -1 / 3)));
}

function maxIndex(values, valueof) {
  let max;
  let maxIndex = -1;
  let index = -1;
  if (valueof === undefined) {
    for (const value of values) {
      ++index;
      if (value != null
          && (max < value || (max === undefined && value >= value))) {
        max = value, maxIndex = index;
      }
    }
  } else {
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null
          && (max < value || (max === undefined && value >= value))) {
        max = value, maxIndex = index;
      }
    }
  }
  return maxIndex;
}

function mean(values, valueof) {
  let count = 0;
  let sum = 0;
  if (valueof === undefined) {
    for (let value of values) {
      if (value != null && (value = +value) >= value) {
        ++count, sum += value;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
        ++count, sum += value;
      }
    }
  }
  if (count) return sum / count;
}

function median(values, valueof) {
  return quantile(values, 0.5, valueof);
}

function* flatten(arrays) {
  for (const array of arrays) {
    yield* array;
  }
}

function merge(arrays) {
  return Array.from(flatten(arrays));
}

function minIndex(values, valueof) {
  let min;
  let minIndex = -1;
  let index = -1;
  if (valueof === undefined) {
    for (const value of values) {
      ++index;
      if (value != null
          && (min > value || (min === undefined && value >= value))) {
        min = value, minIndex = index;
      }
    }
  } else {
    for (let value of values) {
      if ((value = valueof(value, ++index, values)) != null
          && (min > value || (min === undefined && value >= value))) {
        min = value, minIndex = index;
      }
    }
  }
  return minIndex;
}

function pairs(values, pairof = pair) {
  const pairs = [];
  let previous;
  let first = false;
  for (const value of values) {
    if (first) pairs.push(pairof(previous, value));
    previous = value;
    first = true;
  }
  return pairs;
}

function pair(a, b) {
  return [a, b];
}

function range(start, stop, step) {
  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

  var i = -1,
      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
      range = new Array(n);

  while (++i < n) {
    range[i] = start + i * step;
  }

  return range;
}

function least(values, compare = ascending) {
  let min;
  let defined = false;
  if (compare.length === 1) {
    let minValue;
    for (const element of values) {
      const value = compare(element);
      if (defined
          ? ascending(value, minValue) < 0
          : ascending(value, value) === 0) {
        min = element;
        minValue = value;
        defined = true;
      }
    }
  } else {
    for (const value of values) {
      if (defined
          ? compare(value, min) < 0
          : compare(value, value) === 0) {
        min = value;
        defined = true;
      }
    }
  }
  return min;
}

function leastIndex(values, compare = ascending) {
  if (compare.length === 1) return minIndex(values, compare);
  let minValue;
  let min = -1;
  let index = -1;
  for (const value of values) {
    ++index;
    if (min < 0
        ? compare(value, value) === 0
        : compare(value, minValue) < 0) {
      minValue = value;
      min = index;
    }
  }
  return min;
}

function greatest(values, compare = ascending) {
  let max;
  let defined = false;
  if (compare.length === 1) {
    let maxValue;
    for (const element of values) {
      const value = compare(element);
      if (defined
          ? ascending(value, maxValue) > 0
          : ascending(value, value) === 0) {
        max = element;
        maxValue = value;
        defined = true;
      }
    }
  } else {
    for (const value of values) {
      if (defined
          ? compare(value, max) > 0
          : compare(value, value) === 0) {
        max = value;
        defined = true;
      }
    }
  }
  return max;
}

function greatestIndex(values, compare = ascending) {
  if (compare.length === 1) return maxIndex(values, compare);
  let maxValue;
  let max = -1;
  let index = -1;
  for (const value of values) {
    ++index;
    if (max < 0
        ? compare(value, value) === 0
        : compare(value, maxValue) > 0) {
      maxValue = value;
      max = index;
    }
  }
  return max;
}

function scan(values, compare) {
  const index = leastIndex(values, compare);
  return index < 0 ? undefined : index;
}

var shuffle = shuffler(Math.random);

function shuffler(random) {
  return function shuffle(array, i0 = 0, i1 = array.length) {
    let m = i1 - (i0 = +i0);
    while (m) {
      const i = random() * m-- | 0, t = array[m + i0];
      array[m + i0] = array[i + i0];
      array[i + i0] = t;
    }
    return array;
  };
}

function sum(values, valueof) {
  let sum = 0;
  if (valueof === undefined) {
    for (let value of values) {
      if (value = +value) {
        sum += value;
      }
    }
  } else {
    let index = -1;
    for (let value of values) {
      if (value = +valueof(value, ++index, values)) {
        sum += value;
      }
    }
  }
  return sum;
}

function transpose(matrix) {
  if (!(n = matrix.length)) return [];
  for (var i = -1, m = min(matrix, length), transpose = new Array(m); ++i < m;) {
    for (var j = -1, n, row = transpose[i] = new Array(n); ++j < n;) {
      row[j] = matrix[j][i];
    }
  }
  return transpose;
}

function length(d) {
  return d.length;
}

function zip() {
  return transpose(arguments);
}

function every(values, test) {
  if (typeof test !== "function") throw new TypeError("test is not a function");
  let index = -1;
  for (const value of values) {
    if (!test(value, ++index, values)) {
      return false;
    }
  }
  return true;
}

function some(values, test) {
  if (typeof test !== "function") throw new TypeError("test is not a function");
  let index = -1;
  for (const value of values) {
    if (test(value, ++index, values)) {
      return true;
    }
  }
  return false;
}

function filter(values, test) {
  if (typeof test !== "function") throw new TypeError("test is not a function");
  const array = [];
  let index = -1;
  for (const value of values) {
    if (test(value, ++index, values)) {
      array.push(value);
    }
  }
  return array;
}

function map(values, mapper) {
  if (typeof values[Symbol.iterator] !== "function") throw new TypeError("values is not iterable");
  if (typeof mapper !== "function") throw new TypeError("mapper is not a function");
  return Array.from(values, (value, index) => mapper(value, index, values));
}

function reduce(values, reducer, value) {
  if (typeof reducer !== "function") throw new TypeError("reducer is not a function");
  const iterator = values[Symbol.iterator]();
  let done, next, index = -1;
  if (arguments.length < 3) {
    ({done, value} = iterator.next());
    if (done) return;
    ++index;
  }
  while (({done, value: next} = iterator.next()), !done) {
    value = reducer(value, next, ++index, values);
  }
  return value;
}

function reverse(values) {
  if (typeof values[Symbol.iterator] !== "function") throw new TypeError("values is not iterable");
  return Array.from(values).reverse();
}

function difference(values, ...others) {
  values = new Set(values);
  for (const other of others) {
    for (const value of other) {
      values.delete(value);
    }
  }
  return values;
}

function disjoint(values, other) {
  const iterator = other[Symbol.iterator](), set = new Set();
  for (const v of values) {
    if (set.has(v)) return false;
    let value, done;
    while (({value, done} = iterator.next())) {
      if (done) break;
      if (Object.is(v, value)) return false;
      set.add(value);
    }
  }
  return true;
}

function set(values) {
  return values instanceof Set ? values : new Set(values);
}

function intersection(values, ...others) {
  values = new Set(values);
  others = others.map(set);
  out: for (const value of values) {
    for (const other of others) {
      if (!other.has(value)) {
        values.delete(value);
        continue out;
      }
    }
  }
  return values;
}

function superset(values, other) {
  const iterator = values[Symbol.iterator](), set = new Set();
  for (const o of other) {
    if (set.has(o)) continue;
    let value, done;
    while (({value, done} = iterator.next())) {
      if (done) return false;
      set.add(value);
      if (Object.is(o, value)) break;
    }
  }
  return true;
}

function subset(values, other) {
  return superset(other, values);
}

function union(...others) {
  const set = new Set();
  for (const other of others) {
    for (const o of other) {
      set.add(o);
    }
  }
  return set;
}

exports.Adder = Adder;
exports.InternMap = InternMap;
exports.InternSet = InternSet;
exports.ascending = ascending;
exports.bin = bin;
exports.bisect = bisectRight;
exports.bisectCenter = bisectCenter;
exports.bisectLeft = bisectLeft;
exports.bisectRight = bisectRight;
exports.bisector = bisector;
exports.count = count;
exports.cross = cross;
exports.cumsum = cumsum;
exports.descending = descending;
exports.deviation = deviation;
exports.difference = difference;
exports.disjoint = disjoint;
exports.every = every;
exports.extent = extent;
exports.fcumsum = fcumsum;
exports.filter = filter;
exports.fsum = fsum;
exports.greatest = greatest;
exports.greatestIndex = greatestIndex;
exports.group = group;
exports.groupSort = groupSort;
exports.groups = groups;
exports.histogram = bin;
exports.index = index;
exports.indexes = indexes;
exports.intersection = intersection;
exports.least = least;
exports.leastIndex = leastIndex;
exports.map = map;
exports.max = max;
exports.maxIndex = maxIndex;
exports.mean = mean;
exports.median = median;
exports.merge = merge;
exports.min = min;
exports.minIndex = minIndex;
exports.nice = nice;
exports.pairs = pairs;
exports.permute = permute;
exports.quantile = quantile;
exports.quantileSorted = quantileSorted;
exports.quickselect = quickselect;
exports.range = range;
exports.reduce = reduce;
exports.reverse = reverse;
exports.rollup = rollup;
exports.rollups = rollups;
exports.scan = scan;
exports.shuffle = shuffle;
exports.shuffler = shuffler;
exports.some = some;
exports.sort = sort;
exports.subset = subset;
exports.sum = sum;
exports.superset = superset;
exports.thresholdFreedmanDiaconis = freedmanDiaconis;
exports.thresholdScott = scott;
exports.thresholdSturges = sturges;
exports.tickIncrement = tickIncrement;
exports.tickStep = tickStep;
exports.ticks = ticks;
exports.transpose = transpose;
exports.union = union;
exports.variance = variance;
exports.zip = zip;

Object.defineProperty(exports, '__esModule', { value: true });

})));

},{}],3:[function(require,module,exports){
// https://d3js.org/d3-color/ v2.0.0 Copyright 2020 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

function define(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}

function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

function Color() {}

var darker = 0.7;
var brighter = 1 / darker;

var reI = "\\s*([+-]?\\d+)\\s*",
    reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
    reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
    reHex = /^#([0-9a-f]{3,8})$/,
    reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
    reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
    reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
    reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
    reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
    reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

var named = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32
};

define(Color, color, {
  copy: function(channels) {
    return Object.assign(new this.constructor, this, channels);
  },
  displayable: function() {
    return this.rgb().displayable();
  },
  hex: color_formatHex, // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});

function color_formatHex() {
  return this.rgb().formatHex();
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
  return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
      : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
      : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
      : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
      : null) // invalid hex
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
      : null;
}

function rgbn(n) {
  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
}

function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}

function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb;
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}

function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}

function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}

define(Rgb, rgb, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb: function() {
    return this;
  },
  displayable: function() {
    return (-0.5 <= this.r && this.r < 255.5)
        && (-0.5 <= this.g && this.g < 255.5)
        && (-0.5 <= this.b && this.b < 255.5)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex, // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));

function rgb_formatHex() {
  return "#" + hex(this.r) + hex(this.g) + hex(this.b);
}

function rgb_formatRgb() {
  var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
  return (a === 1 ? "rgb(" : "rgba(")
      + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
      + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
      + Math.max(0, Math.min(255, Math.round(this.b) || 0))
      + (a === 1 ? ")" : ", " + a + ")");
}

function hex(value) {
  value = Math.max(0, Math.min(255, Math.round(value) || 0));
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
  if (!o) return new Hsl;
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      h = NaN,
      s = max - min,
      l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
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

define(Hsl, hsl, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb: function() {
    var h = this.h % 360 + (this.h < 0) * 360,
        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
        l = this.l,
        m2 = l + (l < 0.5 ? l : 1 - l) * s,
        m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  displayable: function() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
        && (0 <= this.l && this.l <= 1)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl: function() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "hsl(" : "hsla(")
        + (this.h || 0) + ", "
        + (this.s || 0) * 100 + "%, "
        + (this.l || 0) * 100 + "%"
        + (a === 1 ? ")" : ", " + a + ")");
  }
}));

/* From FvD 13.37, CSS Color Module Level 3 */
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60
      : h < 180 ? m2
      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
      : m1) * 255;
}

const radians = Math.PI / 180;
const degrees = 180 / Math.PI;

// https://observablehq.com/@mbostock/lab-and-rgb
const K = 18,
    Xn = 0.96422,
    Yn = 1,
    Zn = 0.82521,
    t0 = 4 / 29,
    t1 = 6 / 29,
    t2 = 3 * t1 * t1,
    t3 = t1 * t1 * t1;

function labConvert(o) {
  if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
  if (o instanceof Hcl) return hcl2lab(o);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = rgb2lrgb(o.r),
      g = rgb2lrgb(o.g),
      b = rgb2lrgb(o.b),
      y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
  if (r === g && g === b) x = z = y; else {
    x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
    z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
  }
  return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
}

function gray(l, opacity) {
  return new Lab(l, 0, 0, opacity == null ? 1 : opacity);
}

function lab(l, a, b, opacity) {
  return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
}

function Lab(l, a, b, opacity) {
  this.l = +l;
  this.a = +a;
  this.b = +b;
  this.opacity = +opacity;
}

define(Lab, lab, extend(Color, {
  brighter: function(k) {
    return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  darker: function(k) {
    return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
  },
  rgb: function() {
    var y = (this.l + 16) / 116,
        x = isNaN(this.a) ? y : y + this.a / 500,
        z = isNaN(this.b) ? y : y - this.b / 200;
    x = Xn * lab2xyz(x);
    y = Yn * lab2xyz(y);
    z = Zn * lab2xyz(z);
    return new Rgb(
      lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
      lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
      lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
      this.opacity
    );
  }
}));

function xyz2lab(t) {
  return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
}

function lab2xyz(t) {
  return t > t1 ? t * t * t : t2 * (t - t0);
}

function lrgb2rgb(x) {
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
}

function rgb2lrgb(x) {
  return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function hclConvert(o) {
  if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
  if (!(o instanceof Lab)) o = labConvert(o);
  if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0 < o.l && o.l < 100 ? 0 : NaN, o.l, o.opacity);
  var h = Math.atan2(o.b, o.a) * degrees;
  return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
}

function lch(l, c, h, opacity) {
  return arguments.length === 1 ? hclConvert(l) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
}

function hcl(h, c, l, opacity) {
  return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
}

function Hcl(h, c, l, opacity) {
  this.h = +h;
  this.c = +c;
  this.l = +l;
  this.opacity = +opacity;
}

function hcl2lab(o) {
  if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
  var h = o.h * radians;
  return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
}

define(Hcl, hcl, extend(Color, {
  brighter: function(k) {
    return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
  },
  darker: function(k) {
    return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
  },
  rgb: function() {
    return hcl2lab(this).rgb();
  }
}));

var A = -0.14861,
    B = +1.78277,
    C = -0.29227,
    D = -0.90649,
    E = +1.97294,
    ED = E * D,
    EB = E * B,
    BC_DA = B * C - D * A;

function cubehelixConvert(o) {
  if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Rgb)) o = rgbConvert(o);
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
      bl = b - l,
      k = (E * (g - l) - C * bl) / D,
      s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
      h = s ? Math.atan2(k, bl) * degrees - 120 : NaN;
  return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
}

function cubehelix(h, s, l, opacity) {
  return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
}

function Cubehelix(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Cubehelix, cubehelix, extend(Color, {
  brighter: function(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  darker: function(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
  },
  rgb: function() {
    var h = isNaN(this.h) ? 0 : (this.h + 120) * radians,
        l = +this.l,
        a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
        cosh = Math.cos(h),
        sinh = Math.sin(h);
    return new Rgb(
      255 * (l + a * (A * cosh + B * sinh)),
      255 * (l + a * (C * cosh + D * sinh)),
      255 * (l + a * (E * cosh)),
      this.opacity
    );
  }
}));

exports.color = color;
exports.cubehelix = cubehelix;
exports.gray = gray;
exports.hcl = hcl;
exports.hsl = hsl;
exports.lab = lab;
exports.lch = lch;
exports.rgb = rgb;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{}],4:[function(require,module,exports){
// https://d3js.org/d3-dispatch/ v2.0.0 Copyright 2020 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

var noop = {value: () => {}};

function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}

function Dispatch(_) {
  this._ = _;
}

function parseTypenames(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}

Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames(typename + "", _),
        t,
        i = -1,
        n = T.length;

    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
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
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

exports.dispatch = dispatch;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{}],5:[function(require,module,exports){
// https://d3js.org/d3-ease/ v2.0.0 Copyright 2020 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

const linear = t => +t;

function quadIn(t) {
  return t * t;
}

function quadOut(t) {
  return t * (2 - t);
}

function quadInOut(t) {
  return ((t *= 2) <= 1 ? t * t : --t * (2 - t) + 1) / 2;
}

function cubicIn(t) {
  return t * t * t;
}

function cubicOut(t) {
  return --t * t * t + 1;
}

function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

var exponent = 3;

var polyIn = (function custom(e) {
  e = +e;

  function polyIn(t) {
    return Math.pow(t, e);
  }

  polyIn.exponent = custom;

  return polyIn;
})(exponent);

var polyOut = (function custom(e) {
  e = +e;

  function polyOut(t) {
    return 1 - Math.pow(1 - t, e);
  }

  polyOut.exponent = custom;

  return polyOut;
})(exponent);

var polyInOut = (function custom(e) {
  e = +e;

  function polyInOut(t) {
    return ((t *= 2) <= 1 ? Math.pow(t, e) : 2 - Math.pow(2 - t, e)) / 2;
  }

  polyInOut.exponent = custom;

  return polyInOut;
})(exponent);

var pi = Math.PI,
    halfPi = pi / 2;

function sinIn(t) {
  return (+t === 1) ? 1 : 1 - Math.cos(t * halfPi);
}

function sinOut(t) {
  return Math.sin(t * halfPi);
}

function sinInOut(t) {
  return (1 - Math.cos(pi * t)) / 2;
}

// tpmt is two power minus ten times t scaled to [0,1]
function tpmt(x) {
  return (Math.pow(2, -10 * x) - 0.0009765625) * 1.0009775171065494;
}

function expIn(t) {
  return tpmt(1 - +t);
}

function expOut(t) {
  return 1 - tpmt(t);
}

function expInOut(t) {
  return ((t *= 2) <= 1 ? tpmt(1 - t) : 2 - tpmt(t - 1)) / 2;
}

function circleIn(t) {
  return 1 - Math.sqrt(1 - t * t);
}

function circleOut(t) {
  return Math.sqrt(1 - --t * t);
}

function circleInOut(t) {
  return ((t *= 2) <= 1 ? 1 - Math.sqrt(1 - t * t) : Math.sqrt(1 - (t -= 2) * t) + 1) / 2;
}

var b1 = 4 / 11,
    b2 = 6 / 11,
    b3 = 8 / 11,
    b4 = 3 / 4,
    b5 = 9 / 11,
    b6 = 10 / 11,
    b7 = 15 / 16,
    b8 = 21 / 22,
    b9 = 63 / 64,
    b0 = 1 / b1 / b1;

function bounceIn(t) {
  return 1 - bounceOut(1 - t);
}

function bounceOut(t) {
  return (t = +t) < b1 ? b0 * t * t : t < b3 ? b0 * (t -= b2) * t + b4 : t < b6 ? b0 * (t -= b5) * t + b7 : b0 * (t -= b8) * t + b9;
}

function bounceInOut(t) {
  return ((t *= 2) <= 1 ? 1 - bounceOut(1 - t) : bounceOut(t - 1) + 1) / 2;
}

var overshoot = 1.70158;

var backIn = (function custom(s) {
  s = +s;

  function backIn(t) {
    return (t = +t) * t * (s * (t - 1) + t);
  }

  backIn.overshoot = custom;

  return backIn;
})(overshoot);

var backOut = (function custom(s) {
  s = +s;

  function backOut(t) {
    return --t * t * ((t + 1) * s + t) + 1;
  }

  backOut.overshoot = custom;

  return backOut;
})(overshoot);

var backInOut = (function custom(s) {
  s = +s;

  function backInOut(t) {
    return ((t *= 2) < 1 ? t * t * ((s + 1) * t - s) : (t -= 2) * t * ((s + 1) * t + s) + 2) / 2;
  }

  backInOut.overshoot = custom;

  return backInOut;
})(overshoot);

var tau = 2 * Math.PI,
    amplitude = 1,
    period = 0.3;

var elasticIn = (function custom(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

  function elasticIn(t) {
    return a * tpmt(-(--t)) * Math.sin((s - t) / p);
  }

  elasticIn.amplitude = function(a) { return custom(a, p * tau); };
  elasticIn.period = function(p) { return custom(a, p); };

  return elasticIn;
})(amplitude, period);

var elasticOut = (function custom(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

  function elasticOut(t) {
    return 1 - a * tpmt(t = +t) * Math.sin((t + s) / p);
  }

  elasticOut.amplitude = function(a) { return custom(a, p * tau); };
  elasticOut.period = function(p) { return custom(a, p); };

  return elasticOut;
})(amplitude, period);

var elasticInOut = (function custom(a, p) {
  var s = Math.asin(1 / (a = Math.max(1, a))) * (p /= tau);

  function elasticInOut(t) {
    return ((t = t * 2 - 1) < 0
        ? a * tpmt(-t) * Math.sin((s - t) / p)
        : 2 - a * tpmt(t) * Math.sin((s + t) / p)) / 2;
  }

  elasticInOut.amplitude = function(a) { return custom(a, p * tau); };
  elasticInOut.period = function(p) { return custom(a, p); };

  return elasticInOut;
})(amplitude, period);

exports.easeBack = backInOut;
exports.easeBackIn = backIn;
exports.easeBackInOut = backInOut;
exports.easeBackOut = backOut;
exports.easeBounce = bounceOut;
exports.easeBounceIn = bounceIn;
exports.easeBounceInOut = bounceInOut;
exports.easeBounceOut = bounceOut;
exports.easeCircle = circleInOut;
exports.easeCircleIn = circleIn;
exports.easeCircleInOut = circleInOut;
exports.easeCircleOut = circleOut;
exports.easeCubic = cubicInOut;
exports.easeCubicIn = cubicIn;
exports.easeCubicInOut = cubicInOut;
exports.easeCubicOut = cubicOut;
exports.easeElastic = elasticOut;
exports.easeElasticIn = elasticIn;
exports.easeElasticInOut = elasticInOut;
exports.easeElasticOut = elasticOut;
exports.easeExp = expInOut;
exports.easeExpIn = expIn;
exports.easeExpInOut = expInOut;
exports.easeExpOut = expOut;
exports.easeLinear = linear;
exports.easePoly = polyInOut;
exports.easePolyIn = polyIn;
exports.easePolyInOut = polyInOut;
exports.easePolyOut = polyOut;
exports.easeQuad = quadInOut;
exports.easeQuadIn = quadIn;
exports.easeQuadInOut = quadInOut;
exports.easeQuadOut = quadOut;
exports.easeSin = sinInOut;
exports.easeSinIn = sinIn;
exports.easeSinInOut = sinInOut;
exports.easeSinOut = sinOut;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{}],6:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.d3 = global.d3 || {})));
}(this, (function (exports) { 'use strict';

function count(node) {
  var sum = 0,
      children = node.children,
      i = children && children.length;
  if (!i) sum = 1;
  else while (--i >= 0) sum += children[i].value;
  node.value = sum;
}

function node_count() {
  return this.eachAfter(count);
}

function node_each(callback) {
  var node = this, current, next = [node], children, i, n;
  do {
    current = next.reverse(), next = [];
    while (node = current.pop()) {
      callback(node), children = node.children;
      if (children) for (i = 0, n = children.length; i < n; ++i) {
        next.push(children[i]);
      }
    }
  } while (next.length);
  return this;
}

function node_eachBefore(callback) {
  var node = this, nodes = [node], children, i;
  while (node = nodes.pop()) {
    callback(node), children = node.children;
    if (children) for (i = children.length - 1; i >= 0; --i) {
      nodes.push(children[i]);
    }
  }
  return this;
}

function node_eachAfter(callback) {
  var node = this, nodes = [node], next = [], children, i, n;
  while (node = nodes.pop()) {
    next.push(node), children = node.children;
    if (children) for (i = 0, n = children.length; i < n; ++i) {
      nodes.push(children[i]);
    }
  }
  while (node = next.pop()) {
    callback(node);
  }
  return this;
}

function node_sum(value) {
  return this.eachAfter(function(node) {
    var sum = +value(node.data) || 0,
        children = node.children,
        i = children && children.length;
    while (--i >= 0) sum += children[i].value;
    node.value = sum;
  });
}

function node_sort(compare) {
  return this.eachBefore(function(node) {
    if (node.children) {
      node.children.sort(compare);
    }
  });
}

function node_path(end) {
  var start = this,
      ancestor = leastCommonAncestor(start, end),
      nodes = [start];
  while (start !== ancestor) {
    start = start.parent;
    nodes.push(start);
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
  var aNodes = a.ancestors(),
      bNodes = b.ancestors(),
      c = null;
  a = aNodes.pop();
  b = bNodes.pop();
  while (a === b) {
    c = a;
    a = aNodes.pop();
    b = bNodes.pop();
  }
  return c;
}

function node_ancestors() {
  var node = this, nodes = [node];
  while (node = node.parent) {
    nodes.push(node);
  }
  return nodes;
}

function node_descendants() {
  var nodes = [];
  this.each(function(node) {
    nodes.push(node);
  });
  return nodes;
}

function node_leaves() {
  var leaves = [];
  this.eachBefore(function(node) {
    if (!node.children) {
      leaves.push(node);
    }
  });
  return leaves;
}

function node_links() {
  var root = this, links = [];
  root.each(function(node) {
    if (node !== root) { // Don’t include the root’s parent, if any.
      links.push({source: node.parent, target: node});
    }
  });
  return links;
}

function hierarchy(data, children) {
  var root = new Node(data),
      valued = +data.value && (root.value = data.value),
      node,
      nodes = [root],
      child,
      childs,
      i,
      n;

  if (children == null) children = defaultChildren;

  while (node = nodes.pop()) {
    if (valued) node.value = +node.data.value;
    if ((childs = children(node.data)) && (n = childs.length)) {
      node.children = new Array(n);
      for (i = n - 1; i >= 0; --i) {
        nodes.push(child = node.children[i] = new Node(childs[i]));
        child.parent = node;
        child.depth = node.depth + 1;
      }
    }
  }

  return root.eachBefore(computeHeight);
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
  do node.height = height;
  while ((node = node.parent) && (node.height < ++height));
}

function Node(data) {
  this.data = data;
  this.depth =
  this.height = 0;
  this.parent = null;
}

Node.prototype = hierarchy.prototype = {
  constructor: Node,
  count: node_count,
  each: node_each,
  eachAfter: node_eachAfter,
  eachBefore: node_eachBefore,
  sum: node_sum,
  sort: node_sort,
  path: node_path,
  ancestors: node_ancestors,
  descendants: node_descendants,
  leaves: node_leaves,
  links: node_links,
  copy: node_copy
};

var version = "2.1.1";

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};





var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var defaults$1 = Object.freeze({
  children: function children(data) {
    return data.children;
  },
  nodeSize: function nodeSize(node) {
    return node.data.size;
  },
  spacing: 0
});

// Create a layout function with customizable options. Per D3-style, the
// options can be set at any time using setter methods. The layout function
// will compute the tree node positions based on the options in effect at the
// time it is called.
function flextree(options) {
  var opts = Object.assign({}, defaults$1, options);
  function accessor(name$$1) {
    var opt = opts[name$$1];
    return typeof opt === 'function' ? opt : function () {
      return opt;
    };
  }

  function layout(tree) {
    var wtree = wrap(getWrapper(), tree, function (node) {
      return node.children;
    });
    wtree.update();
    return wtree.data;
  }

  function getFlexNode() {
    var nodeSize = accessor('nodeSize');
    var _spacing = accessor('spacing');
    return function (_hierarchy$prototype$) {
      inherits(FlexNode, _hierarchy$prototype$);

      function FlexNode(data) {
        classCallCheck(this, FlexNode);
        return possibleConstructorReturn(this, (FlexNode.__proto__ || Object.getPrototypeOf(FlexNode)).call(this, data));
      }

      createClass(FlexNode, [{
        key: 'copy',
        value: function copy() {
          var c = wrap(this.constructor, this, function (node) {
            return node.children;
          });
          c.each(function (node) {
            return node.data = node.data.data;
          });
          return c;
        }
      }, {
        key: 'spacing',
        value: function spacing(oNode) {
          return _spacing(this, oNode);
        }
      }, {
        key: 'size',
        get: function get$$1() {
          return nodeSize(this);
        }
      }, {
        key: 'nodes',
        get: function get$$1() {
          return this.descendants();
        }
      }, {
        key: 'xSize',
        get: function get$$1() {
          return this.size[0];
        }
      }, {
        key: 'ySize',
        get: function get$$1() {
          return this.size[1];
        }
      }, {
        key: 'top',
        get: function get$$1() {
          return this.y;
        }
      }, {
        key: 'bottom',
        get: function get$$1() {
          return this.y + this.ySize;
        }
      }, {
        key: 'left',
        get: function get$$1() {
          return this.x - this.xSize / 2;
        }
      }, {
        key: 'right',
        get: function get$$1() {
          return this.x + this.xSize / 2;
        }
      }, {
        key: 'root',
        get: function get$$1() {
          var ancs = this.ancestors();
          return ancs[ancs.length - 1];
        }
      }, {
        key: 'numChildren',
        get: function get$$1() {
          return this.hasChildren ? this.children.length : 0;
        }
      }, {
        key: 'hasChildren',
        get: function get$$1() {
          return !this.noChildren;
        }
      }, {
        key: 'noChildren',
        get: function get$$1() {
          return this.children === null;
        }
      }, {
        key: 'firstChild',
        get: function get$$1() {
          return this.hasChildren ? this.children[0] : null;
        }
      }, {
        key: 'lastChild',
        get: function get$$1() {
          return this.hasChildren ? this.children[this.numChildren - 1] : null;
        }
      }, {
        key: 'extents',
        get: function get$$1() {
          return (this.children || []).reduce(function (acc, kid) {
            return FlexNode.maxExtents(acc, kid.extents);
          }, this.nodeExtents);
        }
      }, {
        key: 'nodeExtents',
        get: function get$$1() {
          return {
            top: this.top,
            bottom: this.bottom,
            left: this.left,
            right: this.right
          };
        }
      }], [{
        key: 'maxExtents',
        value: function maxExtents(e0, e1) {
          return {
            top: Math.min(e0.top, e1.top),
            bottom: Math.max(e0.bottom, e1.bottom),
            left: Math.min(e0.left, e1.left),
            right: Math.max(e0.right, e1.right)
          };
        }
      }]);
      return FlexNode;
    }(hierarchy.prototype.constructor);
  }

  function getWrapper() {
    var FlexNode = getFlexNode();
    var nodeSize = accessor('nodeSize');
    var _spacing2 = accessor('spacing');
    return function (_FlexNode) {
      inherits(_class, _FlexNode);

      function _class(data) {
        classCallCheck(this, _class);

        var _this2 = possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this, data));

        Object.assign(_this2, {
          x: 0, y: 0,
          relX: 0, prelim: 0, shift: 0, change: 0,
          lExt: _this2, lExtRelX: 0, lThr: null,
          rExt: _this2, rExtRelX: 0, rThr: null
        });
        return _this2;
      }

      createClass(_class, [{
        key: 'spacing',
        value: function spacing(oNode) {
          return _spacing2(this.data, oNode.data);
        }
      }, {
        key: 'update',
        value: function update() {
          layoutChildren(this);
          resolveX(this);
          return this;
        }
      }, {
        key: 'size',
        get: function get$$1() {
          return nodeSize(this.data);
        }
      }, {
        key: 'x',
        get: function get$$1() {
          return this.data.x;
        },
        set: function set$$1(v) {
          this.data.x = v;
        }
      }, {
        key: 'y',
        get: function get$$1() {
          return this.data.y;
        },
        set: function set$$1(v) {
          this.data.y = v;
        }
      }]);
      return _class;
    }(FlexNode);
  }

  function wrap(FlexClass, treeData, children) {
    var _wrap = function _wrap(data, parent) {
      var node = new FlexClass(data);
      Object.assign(node, {
        parent: parent,
        depth: parent === null ? 0 : parent.depth + 1,
        height: 0,
        length: 1
      });
      var kidsData = children(data) || [];
      node.children = kidsData.length === 0 ? null : kidsData.map(function (kd) {
        return _wrap(kd, node);
      });
      if (node.children) {
        Object.assign(node, node.children.reduce(function (hl, kid) {
          return {
            height: Math.max(hl.height, kid.height + 1),
            length: hl.length + kid.length
          };
        }, node));
      }
      return node;
    };
    return _wrap(treeData, null);
  }

  Object.assign(layout, {
    nodeSize: function nodeSize(arg) {
      return arguments.length ? (opts.nodeSize = arg, layout) : opts.nodeSize;
    },
    spacing: function spacing(arg) {
      return arguments.length ? (opts.spacing = arg, layout) : opts.spacing;
    },
    children: function children(arg) {
      return arguments.length ? (opts.children = arg, layout) : opts.children;
    },
    hierarchy: function hierarchy(treeData, children) {
      var kids = typeof children === 'undefined' ? opts.children : children;
      return wrap(getFlexNode(), treeData, kids);
    },
    dump: function dump(tree) {
      var nodeSize = accessor('nodeSize');
      var _dump = function _dump(i0) {
        return function (node) {
          var i1 = i0 + '  ';
          var i2 = i0 + '    ';
          var x = node.x,
              y = node.y;

          var size = nodeSize(node);
          var kids = node.children || [];
          var kdumps = kids.length === 0 ? ' ' : ',' + i1 + 'children: [' + i2 + kids.map(_dump(i2)).join(i2) + i1 + '],' + i0;
          return '{ size: [' + size.join(', ') + '],' + i1 + 'x: ' + x + ', y: ' + y + kdumps + '},';
        };
      };
      return _dump('\n')(tree);
    }
  });
  return layout;
}
flextree.version = version;

var layoutChildren = function layoutChildren(w) {
  var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  w.y = y;
  (w.children || []).reduce(function (acc, kid) {
    var _acc = slicedToArray(acc, 2),
        i = _acc[0],
        lastLows = _acc[1];

    layoutChildren(kid, w.y + w.ySize);
    // The lowest vertical coordinate while extreme nodes still point
    // in current subtree.
    var lowY = (i === 0 ? kid.lExt : kid.rExt).bottom;
    if (i !== 0) separate(w, i, lastLows);
    var lows = updateLows(lowY, i, lastLows);
    return [i + 1, lows];
  }, [0, null]);
  shiftChange(w);
  positionRoot(w);
  return w;
};

// Resolves the relative coordinate properties - relX and prelim --
// to set the final, absolute x coordinate for each node. This also sets
// `prelim` to 0, so that `relX` for each node is its x-coordinate relative
// to its parent.
var resolveX = function resolveX(w, prevSum, parentX) {
  // A call to resolveX without arguments is assumed to be for the root of
  // the tree. This will set the root's x-coord to zero.
  if (typeof prevSum === 'undefined') {
    prevSum = -w.relX - w.prelim;
    parentX = 0;
  }
  var sum = prevSum + w.relX;
  w.relX = sum + w.prelim - parentX;
  w.prelim = 0;
  w.x = parentX + w.relX;
  (w.children || []).forEach(function (k) {
    return resolveX(k, sum, w.x);
  });
  return w;
};

// Process shift and change for all children, to add intermediate spacing to
// each child's modifier.
var shiftChange = function shiftChange(w) {
  (w.children || []).reduce(function (acc, child) {
    var _acc2 = slicedToArray(acc, 2),
        lastShiftSum = _acc2[0],
        lastChangeSum = _acc2[1];

    var shiftSum = lastShiftSum + child.shift;
    var changeSum = lastChangeSum + shiftSum + child.change;
    child.relX += changeSum;
    return [shiftSum, changeSum];
  }, [0, 0]);
};

// Separates the latest child from its previous sibling
/* eslint-disable complexity */
var separate = function separate(w, i, lows) {
  var lSib = w.children[i - 1];
  var curSubtree = w.children[i];
  var rContour = lSib;
  var rSumMods = lSib.relX;
  var lContour = curSubtree;
  var lSumMods = curSubtree.relX;
  var isFirst = true;
  while (rContour && lContour) {
    if (rContour.bottom > lows.lowY) lows = lows.next;
    // How far to the left of the right side of rContour is the left side
    // of lContour? First compute the center-to-center distance, then add
    // the "spacing"
    var dist = rSumMods + rContour.prelim - (lSumMods + lContour.prelim) + rContour.xSize / 2 + lContour.xSize / 2 + rContour.spacing(lContour);
    if (dist > 0 || dist < 0 && isFirst) {
      lSumMods += dist;
      // Move subtree by changing relX.
      moveSubtree$1(curSubtree, dist);
      distributeExtra(w, i, lows.index, dist);
    }
    isFirst = false;
    // Advance highest node(s) and sum(s) of modifiers
    var rightBottom = rContour.bottom;
    var leftBottom = lContour.bottom;
    if (rightBottom <= leftBottom) {
      rContour = nextRContour(rContour);
      if (rContour) rSumMods += rContour.relX;
    }
    if (rightBottom >= leftBottom) {
      lContour = nextLContour(lContour);
      if (lContour) lSumMods += lContour.relX;
    }
  }
  // Set threads and update extreme nodes. In the first case, the
  // current subtree is taller than the left siblings.
  if (!rContour && lContour) setLThr(w, i, lContour, lSumMods);
  // In the next case, the left siblings are taller than the current subtree
  else if (rContour && !lContour) setRThr(w, i, rContour, rSumMods);
};
/* eslint-enable complexity */

// Move subtree by changing relX.
var moveSubtree$1 = function moveSubtree(subtree, distance) {
  subtree.relX += distance;
  subtree.lExtRelX += distance;
  subtree.rExtRelX += distance;
};

var distributeExtra = function distributeExtra(w, curSubtreeI, leftSibI, dist) {
  var curSubtree = w.children[curSubtreeI];
  var n = curSubtreeI - leftSibI;
  // Are there intermediate children?
  if (n > 1) {
    var delta = dist / n;
    w.children[leftSibI + 1].shift += delta;
    curSubtree.shift -= delta;
    curSubtree.change -= dist - delta;
  }
};

var nextLContour = function nextLContour(w) {
  return w.hasChildren ? w.firstChild : w.lThr;
};

var nextRContour = function nextRContour(w) {
  return w.hasChildren ? w.lastChild : w.rThr;
};

var setLThr = function setLThr(w, i, lContour, lSumMods) {
  var firstChild = w.firstChild;
  var lExt = firstChild.lExt;
  var curSubtree = w.children[i];
  lExt.lThr = lContour;
  // Change relX so that the sum of modifier after following thread is correct.
  var diff = lSumMods - lContour.relX - firstChild.lExtRelX;
  lExt.relX += diff;
  // Change preliminary x coordinate so that the node does not move.
  lExt.prelim -= diff;
  // Update extreme node and its sum of modifiers.
  firstChild.lExt = curSubtree.lExt;
  firstChild.lExtRelX = curSubtree.lExtRelX;
};

// Mirror image of setLThr.
var setRThr = function setRThr(w, i, rContour, rSumMods) {
  var curSubtree = w.children[i];
  var rExt = curSubtree.rExt;
  var lSib = w.children[i - 1];
  rExt.rThr = rContour;
  var diff = rSumMods - rContour.relX - curSubtree.rExtRelX;
  rExt.relX += diff;
  rExt.prelim -= diff;
  curSubtree.rExt = lSib.rExt;
  curSubtree.rExtRelX = lSib.rExtRelX;
};

// Position root between children, taking into account their modifiers
var positionRoot = function positionRoot(w) {
  if (w.hasChildren) {
    var k0 = w.firstChild;
    var kf = w.lastChild;
    var prelim = (k0.prelim + k0.relX - k0.xSize / 2 + kf.relX + kf.prelim + kf.xSize / 2) / 2;
    Object.assign(w, {
      prelim: prelim,
      lExt: k0.lExt, lExtRelX: k0.lExtRelX,
      rExt: kf.rExt, rExtRelX: kf.rExtRelX
    });
  }
};

// Make/maintain a linked list of the indexes of left siblings and their
// lowest vertical coordinate.
var updateLows = function updateLows(lowY, index, lastLows) {
  // Remove siblings that are hidden by the new subtree.
  while (lastLows !== null && lowY >= lastLows.lowY) {
    lastLows = lastLows.next;
  } // Prepend the new subtree.
  return {
    lowY: lowY,
    index: index,
    next: lastLows
  };
};

exports.flextree = flextree;

Object.defineProperty(exports, '__esModule', { value: true });

})));


},{}],7:[function(require,module,exports){
// https://d3js.org/d3-hierarchy/ v2.0.0 Copyright 2020 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

function defaultSeparation(a, b) {
  return a.parent === b.parent ? 1 : 2;
}

function meanX(children) {
  return children.reduce(meanXReduce, 0) / children.length;
}

function meanXReduce(x, c) {
  return x + c.x;
}

function maxY(children) {
  return 1 + children.reduce(maxYReduce, 0);
}

function maxYReduce(y, c) {
  return Math.max(y, c.y);
}

function leafLeft(node) {
  var children;
  while (children = node.children) node = children[0];
  return node;
}

function leafRight(node) {
  var children;
  while (children = node.children) node = children[children.length - 1];
  return node;
}

function cluster() {
  var separation = defaultSeparation,
      dx = 1,
      dy = 1,
      nodeSize = false;

  function cluster(root) {
    var previousNode,
        x = 0;

    // First walk, computing the initial x & y values.
    root.eachAfter(function(node) {
      var children = node.children;
      if (children) {
        node.x = meanX(children);
        node.y = maxY(children);
      } else {
        node.x = previousNode ? x += separation(node, previousNode) : 0;
        node.y = 0;
        previousNode = node;
      }
    });

    var left = leafLeft(root),
        right = leafRight(root),
        x0 = left.x - separation(left, right) / 2,
        x1 = right.x + separation(right, left) / 2;

    // Second walk, normalizing x & y to the desired size.
    return root.eachAfter(nodeSize ? function(node) {
      node.x = (node.x - root.x) * dx;
      node.y = (root.y - node.y) * dy;
    } : function(node) {
      node.x = (node.x - x0) / (x1 - x0) * dx;
      node.y = (1 - (root.y ? node.y / root.y : 1)) * dy;
    });
  }

  cluster.separation = function(x) {
    return arguments.length ? (separation = x, cluster) : separation;
  };

  cluster.size = function(x) {
    return arguments.length ? (nodeSize = false, dx = +x[0], dy = +x[1], cluster) : (nodeSize ? null : [dx, dy]);
  };

  cluster.nodeSize = function(x) {
    return arguments.length ? (nodeSize = true, dx = +x[0], dy = +x[1], cluster) : (nodeSize ? [dx, dy] : null);
  };

  return cluster;
}

function count(node) {
  var sum = 0,
      children = node.children,
      i = children && children.length;
  if (!i) sum = 1;
  else while (--i >= 0) sum += children[i].value;
  node.value = sum;
}

function node_count() {
  return this.eachAfter(count);
}

function node_each(callback, that) {
  let index = -1;
  for (const node of this) {
    callback.call(that, node, ++index, this);
  }
  return this;
}

function node_eachBefore(callback, that) {
  var node = this, nodes = [node], children, i, index = -1;
  while (node = nodes.pop()) {
    callback.call(that, node, ++index, this);
    if (children = node.children) {
      for (i = children.length - 1; i >= 0; --i) {
        nodes.push(children[i]);
      }
    }
  }
  return this;
}

function node_eachAfter(callback, that) {
  var node = this, nodes = [node], next = [], children, i, n, index = -1;
  while (node = nodes.pop()) {
    next.push(node);
    if (children = node.children) {
      for (i = 0, n = children.length; i < n; ++i) {
        nodes.push(children[i]);
      }
    }
  }
  while (node = next.pop()) {
    callback.call(that, node, ++index, this);
  }
  return this;
}

function node_find(callback, that) {
  let index = -1;
  for (const node of this) {
    if (callback.call(that, node, ++index, this)) {
      return node;
    }
  }
}

function node_sum(value) {
  return this.eachAfter(function(node) {
    var sum = +value(node.data) || 0,
        children = node.children,
        i = children && children.length;
    while (--i >= 0) sum += children[i].value;
    node.value = sum;
  });
}

function node_sort(compare) {
  return this.eachBefore(function(node) {
    if (node.children) {
      node.children.sort(compare);
    }
  });
}

function node_path(end) {
  var start = this,
      ancestor = leastCommonAncestor(start, end),
      nodes = [start];
  while (start !== ancestor) {
    start = start.parent;
    nodes.push(start);
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
  var aNodes = a.ancestors(),
      bNodes = b.ancestors(),
      c = null;
  a = aNodes.pop();
  b = bNodes.pop();
  while (a === b) {
    c = a;
    a = aNodes.pop();
    b = bNodes.pop();
  }
  return c;
}

function node_ancestors() {
  var node = this, nodes = [node];
  while (node = node.parent) {
    nodes.push(node);
  }
  return nodes;
}

function node_descendants() {
  return Array.from(this);
}

function node_leaves() {
  var leaves = [];
  this.eachBefore(function(node) {
    if (!node.children) {
      leaves.push(node);
    }
  });
  return leaves;
}

function node_links() {
  var root = this, links = [];
  root.each(function(node) {
    if (node !== root) { // Don’t include the root’s parent, if any.
      links.push({source: node.parent, target: node});
    }
  });
  return links;
}

function* node_iterator() {
  var node = this, current, next = [node], children, i, n;
  do {
    current = next.reverse(), next = [];
    while (node = current.pop()) {
      yield node;
      if (children = node.children) {
        for (i = 0, n = children.length; i < n; ++i) {
          next.push(children[i]);
        }
      }
    }
  } while (next.length);
}

function hierarchy(data, children) {
  if (data instanceof Map) {
    data = [undefined, data];
    if (children === undefined) children = mapChildren;
  } else if (children === undefined) {
    children = objectChildren;
  }

  var root = new Node(data),
      node,
      nodes = [root],
      child,
      childs,
      i,
      n;

  while (node = nodes.pop()) {
    if ((childs = children(node.data)) && (n = (childs = Array.from(childs)).length)) {
      node.children = childs;
      for (i = n - 1; i >= 0; --i) {
        nodes.push(child = childs[i] = new Node(childs[i]));
        child.parent = node;
        child.depth = node.depth + 1;
      }
    }
  }

  return root.eachBefore(computeHeight);
}

function node_copy() {
  return hierarchy(this).eachBefore(copyData);
}

function objectChildren(d) {
  return d.children;
}

function mapChildren(d) {
  return Array.isArray(d) ? d[1] : null;
}

function copyData(node) {
  if (node.data.value !== undefined) node.value = node.data.value;
  node.data = node.data.data;
}

function computeHeight(node) {
  var height = 0;
  do node.height = height;
  while ((node = node.parent) && (node.height < ++height));
}

function Node(data) {
  this.data = data;
  this.depth =
  this.height = 0;
  this.parent = null;
}

Node.prototype = hierarchy.prototype = {
  constructor: Node,
  count: node_count,
  each: node_each,
  eachAfter: node_eachAfter,
  eachBefore: node_eachBefore,
  find: node_find,
  sum: node_sum,
  sort: node_sort,
  path: node_path,
  ancestors: node_ancestors,
  descendants: node_descendants,
  leaves: node_leaves,
  links: node_links,
  copy: node_copy,
  [Symbol.iterator]: node_iterator
};

function array(x) {
  return typeof x === "object" && "length" in x
    ? x // Array, TypedArray, NodeList, array-like
    : Array.from(x); // Map, Set, iterable, string, or anything else
}

function shuffle(array) {
  var m = array.length,
      t,
      i;

  while (m) {
    i = Math.random() * m-- | 0;
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

function enclose(circles) {
  var i = 0, n = (circles = shuffle(Array.from(circles))).length, B = [], p, e;

  while (i < n) {
    p = circles[i];
    if (e && enclosesWeak(e, p)) ++i;
    else e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }

  return e;
}

function extendBasis(B, p) {
  var i, j;

  if (enclosesWeakAll(p, B)) return [p];

  // If we get here then B must have at least one element.
  for (i = 0; i < B.length; ++i) {
    if (enclosesNot(p, B[i])
        && enclosesWeakAll(encloseBasis2(B[i], p), B)) {
      return [B[i], p];
    }
  }

  // If we get here then B must have at least two elements.
  for (i = 0; i < B.length - 1; ++i) {
    for (j = i + 1; j < B.length; ++j) {
      if (enclosesNot(encloseBasis2(B[i], B[j]), p)
          && enclosesNot(encloseBasis2(B[i], p), B[j])
          && enclosesNot(encloseBasis2(B[j], p), B[i])
          && enclosesWeakAll(encloseBasis3(B[i], B[j], p), B)) {
        return [B[i], B[j], p];
      }
    }
  }

  // If we get here then something is very wrong.
  throw new Error;
}

function enclosesNot(a, b) {
  var dr = a.r - b.r, dx = b.x - a.x, dy = b.y - a.y;
  return dr < 0 || dr * dr < dx * dx + dy * dy;
}

function enclosesWeak(a, b) {
  var dr = a.r - b.r + Math.max(a.r, b.r, 1) * 1e-9, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

function enclosesWeakAll(a, B) {
  for (var i = 0; i < B.length; ++i) {
    if (!enclosesWeak(a, B[i])) {
      return false;
    }
  }
  return true;
}

function encloseBasis(B) {
  switch (B.length) {
    case 1: return encloseBasis1(B[0]);
    case 2: return encloseBasis2(B[0], B[1]);
    case 3: return encloseBasis3(B[0], B[1], B[2]);
  }
}

function encloseBasis1(a) {
  return {
    x: a.x,
    y: a.y,
    r: a.r
  };
}

function encloseBasis2(a, b) {
  var x1 = a.x, y1 = a.y, r1 = a.r,
      x2 = b.x, y2 = b.y, r2 = b.r,
      x21 = x2 - x1, y21 = y2 - y1, r21 = r2 - r1,
      l = Math.sqrt(x21 * x21 + y21 * y21);
  return {
    x: (x1 + x2 + x21 / l * r21) / 2,
    y: (y1 + y2 + y21 / l * r21) / 2,
    r: (l + r1 + r2) / 2
  };
}

function encloseBasis3(a, b, c) {
  var x1 = a.x, y1 = a.y, r1 = a.r,
      x2 = b.x, y2 = b.y, r2 = b.r,
      x3 = c.x, y3 = c.y, r3 = c.r,
      a2 = x1 - x2,
      a3 = x1 - x3,
      b2 = y1 - y2,
      b3 = y1 - y3,
      c2 = r2 - r1,
      c3 = r3 - r1,
      d1 = x1 * x1 + y1 * y1 - r1 * r1,
      d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2,
      d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3,
      ab = a3 * b2 - a2 * b3,
      xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1,
      xb = (b3 * c2 - b2 * c3) / ab,
      ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1,
      yb = (a2 * c3 - a3 * c2) / ab,
      A = xb * xb + yb * yb - 1,
      B = 2 * (r1 + xa * xb + ya * yb),
      C = xa * xa + ya * ya - r1 * r1,
      r = -(A ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B);
  return {
    x: x1 + xa + xb * r,
    y: y1 + ya + yb * r,
    r: r
  };
}

function place(b, a, c) {
  var dx = b.x - a.x, x, a2,
      dy = b.y - a.y, y, b2,
      d2 = dx * dx + dy * dy;
  if (d2) {
    a2 = a.r + c.r, a2 *= a2;
    b2 = b.r + c.r, b2 *= b2;
    if (a2 > b2) {
      x = (d2 + b2 - a2) / (2 * d2);
      y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
      c.x = b.x - x * dx - y * dy;
      c.y = b.y - x * dy + y * dx;
    } else {
      x = (d2 + a2 - b2) / (2 * d2);
      y = Math.sqrt(Math.max(0, a2 / d2 - x * x));
      c.x = a.x + x * dx - y * dy;
      c.y = a.y + x * dy + y * dx;
    }
  } else {
    c.x = a.x + c.r;
    c.y = a.y;
  }
}

function intersects(a, b) {
  var dr = a.r + b.r - 1e-6, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

function score(node) {
  var a = node._,
      b = node.next._,
      ab = a.r + b.r,
      dx = (a.x * b.r + b.x * a.r) / ab,
      dy = (a.y * b.r + b.y * a.r) / ab;
  return dx * dx + dy * dy;
}

function Node$1(circle) {
  this._ = circle;
  this.next = null;
  this.previous = null;
}

function packEnclose(circles) {
  if (!(n = (circles = array(circles)).length)) return 0;

  var a, b, c, n, aa, ca, i, j, k, sj, sk;

  // Place the first circle.
  a = circles[0], a.x = 0, a.y = 0;
  if (!(n > 1)) return a.r;

  // Place the second circle.
  b = circles[1], a.x = -b.r, b.x = a.r, b.y = 0;
  if (!(n > 2)) return a.r + b.r;

  // Place the third circle.
  place(b, a, c = circles[2]);

  // Initialize the front-chain using the first three circles a, b and c.
  a = new Node$1(a), b = new Node$1(b), c = new Node$1(c);
  a.next = c.previous = b;
  b.next = a.previous = c;
  c.next = b.previous = a;

  // Attempt to place each remaining circle…
  pack: for (i = 3; i < n; ++i) {
    place(a._, b._, c = circles[i]), c = new Node$1(c);

    // Find the closest intersecting circle on the front-chain, if any.
    // “Closeness” is determined by linear distance along the front-chain.
    // “Ahead” or “behind” is likewise determined by linear distance.
    j = b.next, k = a.previous, sj = b._.r, sk = a._.r;
    do {
      if (sj <= sk) {
        if (intersects(j._, c._)) {
          b = j, a.next = b, b.previous = a, --i;
          continue pack;
        }
        sj += j._.r, j = j.next;
      } else {
        if (intersects(k._, c._)) {
          a = k, a.next = b, b.previous = a, --i;
          continue pack;
        }
        sk += k._.r, k = k.previous;
      }
    } while (j !== k.next);

    // Success! Insert the new circle c between a and b.
    c.previous = a, c.next = b, a.next = b.previous = b = c;

    // Compute the new closest circle pair to the centroid.
    aa = score(a);
    while ((c = c.next) !== b) {
      if ((ca = score(c)) < aa) {
        a = c, aa = ca;
      }
    }
    b = a.next;
  }

  // Compute the enclosing circle of the front chain.
  a = [b._], c = b; while ((c = c.next) !== b) a.push(c._); c = enclose(a);

  // Translate the circles to put the enclosing circle around the origin.
  for (i = 0; i < n; ++i) a = circles[i], a.x -= c.x, a.y -= c.y;

  return c.r;
}

function siblings(circles) {
  packEnclose(circles);
  return circles;
}

function optional(f) {
  return f == null ? null : required(f);
}

function required(f) {
  if (typeof f !== "function") throw new Error;
  return f;
}

function constantZero() {
  return 0;
}

function constant(x) {
  return function() {
    return x;
  };
}

function defaultRadius(d) {
  return Math.sqrt(d.value);
}

function index() {
  var radius = null,
      dx = 1,
      dy = 1,
      padding = constantZero;

  function pack(root) {
    root.x = dx / 2, root.y = dy / 2;
    if (radius) {
      root.eachBefore(radiusLeaf(radius))
          .eachAfter(packChildren(padding, 0.5))
          .eachBefore(translateChild(1));
    } else {
      root.eachBefore(radiusLeaf(defaultRadius))
          .eachAfter(packChildren(constantZero, 1))
          .eachAfter(packChildren(padding, root.r / Math.min(dx, dy)))
          .eachBefore(translateChild(Math.min(dx, dy) / (2 * root.r)));
    }
    return root;
  }

  pack.radius = function(x) {
    return arguments.length ? (radius = optional(x), pack) : radius;
  };

  pack.size = function(x) {
    return arguments.length ? (dx = +x[0], dy = +x[1], pack) : [dx, dy];
  };

  pack.padding = function(x) {
    return arguments.length ? (padding = typeof x === "function" ? x : constant(+x), pack) : padding;
  };

  return pack;
}

function radiusLeaf(radius) {
  return function(node) {
    if (!node.children) {
      node.r = Math.max(0, +radius(node) || 0);
    }
  };
}

function packChildren(padding, k) {
  return function(node) {
    if (children = node.children) {
      var children,
          i,
          n = children.length,
          r = padding(node) * k || 0,
          e;

      if (r) for (i = 0; i < n; ++i) children[i].r += r;
      e = packEnclose(children);
      if (r) for (i = 0; i < n; ++i) children[i].r -= r;
      node.r = e + r;
    }
  };
}

function translateChild(k) {
  return function(node) {
    var parent = node.parent;
    node.r *= k;
    if (parent) {
      node.x = parent.x + k * node.x;
      node.y = parent.y + k * node.y;
    }
  };
}

function roundNode(node) {
  node.x0 = Math.round(node.x0);
  node.y0 = Math.round(node.y0);
  node.x1 = Math.round(node.x1);
  node.y1 = Math.round(node.y1);
}

function treemapDice(parent, x0, y0, x1, y1) {
  var nodes = parent.children,
      node,
      i = -1,
      n = nodes.length,
      k = parent.value && (x1 - x0) / parent.value;

  while (++i < n) {
    node = nodes[i], node.y0 = y0, node.y1 = y1;
    node.x0 = x0, node.x1 = x0 += node.value * k;
  }
}

function partition() {
  var dx = 1,
      dy = 1,
      padding = 0,
      round = false;

  function partition(root) {
    var n = root.height + 1;
    root.x0 =
    root.y0 = padding;
    root.x1 = dx;
    root.y1 = dy / n;
    root.eachBefore(positionNode(dy, n));
    if (round) root.eachBefore(roundNode);
    return root;
  }

  function positionNode(dy, n) {
    return function(node) {
      if (node.children) {
        treemapDice(node, node.x0, dy * (node.depth + 1) / n, node.x1, dy * (node.depth + 2) / n);
      }
      var x0 = node.x0,
          y0 = node.y0,
          x1 = node.x1 - padding,
          y1 = node.y1 - padding;
      if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
      if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
      node.x0 = x0;
      node.y0 = y0;
      node.x1 = x1;
      node.y1 = y1;
    };
  }

  partition.round = function(x) {
    return arguments.length ? (round = !!x, partition) : round;
  };

  partition.size = function(x) {
    return arguments.length ? (dx = +x[0], dy = +x[1], partition) : [dx, dy];
  };

  partition.padding = function(x) {
    return arguments.length ? (padding = +x, partition) : padding;
  };

  return partition;
}

var preroot = {depth: -1},
    ambiguous = {};

function defaultId(d) {
  return d.id;
}

function defaultParentId(d) {
  return d.parentId;
}

function stratify() {
  var id = defaultId,
      parentId = defaultParentId;

  function stratify(data) {
    var nodes = Array.from(data),
        n = nodes.length,
        d,
        i,
        root,
        parent,
        node,
        nodeId,
        nodeKey,
        nodeByKey = new Map;

    for (i = 0; i < n; ++i) {
      d = nodes[i], node = nodes[i] = new Node(d);
      if ((nodeId = id(d, i, data)) != null && (nodeId += "")) {
        nodeKey = node.id = nodeId;
        nodeByKey.set(nodeKey, nodeByKey.has(nodeKey) ? ambiguous : node);
      }
      if ((nodeId = parentId(d, i, data)) != null && (nodeId += "")) {
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
        if (root) throw new Error("multiple roots");
        root = node;
      }
    }

    if (!root) throw new Error("no root");
    root.parent = preroot;
    root.eachBefore(function(node) { node.depth = node.parent.depth + 1; --n; }).eachBefore(computeHeight);
    root.parent = null;
    if (n > 0) throw new Error("cycle");

    return root;
  }

  stratify.id = function(x) {
    return arguments.length ? (id = required(x), stratify) : id;
  };

  stratify.parentId = function(x) {
    return arguments.length ? (parentId = required(x), stratify) : parentId;
  };

  return stratify;
}

function defaultSeparation$1(a, b) {
  return a.parent === b.parent ? 1 : 2;
}

// function radialSeparation(a, b) {
//   return (a.parent === b.parent ? 1 : 2) / a.depth;
// }

// This function is used to traverse the left contour of a subtree (or
// subforest). It returns the successor of v on this contour. This successor is
// either given by the leftmost child of v or by the thread of v. The function
// returns null if and only if v is on the highest level of its subtree.
function nextLeft(v) {
  var children = v.children;
  return children ? children[0] : v.t;
}

// This function works analogously to nextLeft.
function nextRight(v) {
  var children = v.children;
  return children ? children[children.length - 1] : v.t;
}

// Shifts the current subtree rooted at w+. This is done by increasing
// prelim(w+) and mod(w+) by shift.
function moveSubtree(wm, wp, shift) {
  var change = shift / (wp.i - wm.i);
  wp.c -= change;
  wp.s += shift;
  wm.c += change;
  wp.z += shift;
  wp.m += shift;
}

// All other shifts, applied to the smaller subtrees between w- and w+, are
// performed by this function. To prepare the shifts, we have to adjust
// change(w+), shift(w+), and change(w-).
function executeShifts(v) {
  var shift = 0,
      change = 0,
      children = v.children,
      i = children.length,
      w;
  while (--i >= 0) {
    w = children[i];
    w.z += shift;
    w.m += shift;
    shift += w.s + (change += w.c);
  }
}

// If vi-’s ancestor is a sibling of v, returns vi-’s ancestor. Otherwise,
// returns the specified (default) ancestor.
function nextAncestor(vim, v, ancestor) {
  return vim.a.parent === v.parent ? vim.a : ancestor;
}

function TreeNode(node, i) {
  this._ = node;
  this.parent = null;
  this.children = null;
  this.A = null; // default ancestor
  this.a = this; // ancestor
  this.z = 0; // prelim
  this.m = 0; // mod
  this.c = 0; // change
  this.s = 0; // shift
  this.t = null; // thread
  this.i = i; // number
}

TreeNode.prototype = Object.create(Node.prototype);

function treeRoot(root) {
  var tree = new TreeNode(root, 0),
      node,
      nodes = [tree],
      child,
      children,
      i,
      n;

  while (node = nodes.pop()) {
    if (children = node._.children) {
      node.children = new Array(n = children.length);
      for (i = n - 1; i >= 0; --i) {
        nodes.push(child = node.children[i] = new TreeNode(children[i], i));
        child.parent = node;
      }
    }
  }

  (tree.parent = new TreeNode(null, 0)).children = [tree];
  return tree;
}

// Node-link tree diagram using the Reingold-Tilford "tidy" algorithm
function tree() {
  var separation = defaultSeparation$1,
      dx = 1,
      dy = 1,
      nodeSize = null;

  function tree(root) {
    var t = treeRoot(root);

    // Compute the layout using Buchheim et al.’s algorithm.
    t.eachAfter(firstWalk), t.parent.m = -t.z;
    t.eachBefore(secondWalk);

    // If a fixed node size is specified, scale x and y.
    if (nodeSize) root.eachBefore(sizeNode);

    // If a fixed tree size is specified, scale x and y based on the extent.
    // Compute the left-most, right-most, and depth-most nodes for extents.
    else {
      var left = root,
          right = root,
          bottom = root;
      root.eachBefore(function(node) {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
        if (node.depth > bottom.depth) bottom = node;
      });
      var s = left === right ? 1 : separation(left, right) / 2,
          tx = s - left.x,
          kx = dx / (right.x + s + tx),
          ky = dy / (bottom.depth || 1);
      root.eachBefore(function(node) {
        node.x = (node.x + tx) * kx;
        node.y = node.depth * ky;
      });
    }

    return root;
  }

  // Computes a preliminary x-coordinate for v. Before that, FIRST WALK is
  // applied recursively to the children of v, as well as the function
  // APPORTION. After spacing out the children by calling EXECUTE SHIFTS, the
  // node v is placed to the midpoint of its outermost children.
  function firstWalk(v) {
    var children = v.children,
        siblings = v.parent.children,
        w = v.i ? siblings[v.i - 1] : null;
    if (children) {
      executeShifts(v);
      var midpoint = (children[0].z + children[children.length - 1].z) / 2;
      if (w) {
        v.z = w.z + separation(v._, w._);
        v.m = v.z - midpoint;
      } else {
        v.z = midpoint;
      }
    } else if (w) {
      v.z = w.z + separation(v._, w._);
    }
    v.parent.A = apportion(v, w, v.parent.A || siblings[0]);
  }

  // Computes all real x-coordinates by summing up the modifiers recursively.
  function secondWalk(v) {
    v._.x = v.z + v.parent.m;
    v.m += v.parent.m;
  }

  // The core of the algorithm. Here, a new subtree is combined with the
  // previous subtrees. Threads are used to traverse the inside and outside
  // contours of the left and right subtree up to the highest common level. The
  // vertices used for the traversals are vi+, vi-, vo-, and vo+, where the
  // superscript o means outside and i means inside, the subscript - means left
  // subtree and + means right subtree. For summing up the modifiers along the
  // contour, we use respective variables si+, si-, so-, and so+. Whenever two
  // nodes of the inside contours conflict, we compute the left one of the
  // greatest uncommon ancestors using the function ANCESTOR and call MOVE
  // SUBTREE to shift the subtree and prepare the shifts of smaller subtrees.
  // Finally, we add a new thread (if necessary).
  function apportion(v, w, ancestor) {
    if (w) {
      var vip = v,
          vop = v,
          vim = w,
          vom = vip.parent.children[0],
          sip = vip.m,
          sop = vop.m,
          sim = vim.m,
          som = vom.m,
          shift;
      while (vim = nextRight(vim), vip = nextLeft(vip), vim && vip) {
        vom = nextLeft(vom);
        vop = nextRight(vop);
        vop.a = v;
        shift = vim.z + sim - vip.z - sip + separation(vim._, vip._);
        if (shift > 0) {
          moveSubtree(nextAncestor(vim, v, ancestor), v, shift);
          sip += shift;
          sop += shift;
        }
        sim += vim.m;
        sip += vip.m;
        som += vom.m;
        sop += vop.m;
      }
      if (vim && !nextRight(vop)) {
        vop.t = vim;
        vop.m += sim - sop;
      }
      if (vip && !nextLeft(vom)) {
        vom.t = vip;
        vom.m += sip - som;
        ancestor = v;
      }
    }
    return ancestor;
  }

  function sizeNode(node) {
    node.x *= dx;
    node.y = node.depth * dy;
  }

  tree.separation = function(x) {
    return arguments.length ? (separation = x, tree) : separation;
  };

  tree.size = function(x) {
    return arguments.length ? (nodeSize = false, dx = +x[0], dy = +x[1], tree) : (nodeSize ? null : [dx, dy]);
  };

  tree.nodeSize = function(x) {
    return arguments.length ? (nodeSize = true, dx = +x[0], dy = +x[1], tree) : (nodeSize ? [dx, dy] : null);
  };

  return tree;
}

function treemapSlice(parent, x0, y0, x1, y1) {
  var nodes = parent.children,
      node,
      i = -1,
      n = nodes.length,
      k = parent.value && (y1 - y0) / parent.value;

  while (++i < n) {
    node = nodes[i], node.x0 = x0, node.x1 = x1;
    node.y0 = y0, node.y1 = y0 += node.value * k;
  }
}

var phi = (1 + Math.sqrt(5)) / 2;

function squarifyRatio(ratio, parent, x0, y0, x1, y1) {
  var rows = [],
      nodes = parent.children,
      row,
      nodeValue,
      i0 = 0,
      i1 = 0,
      n = nodes.length,
      dx, dy,
      value = parent.value,
      sumValue,
      minValue,
      maxValue,
      newRatio,
      minRatio,
      alpha,
      beta;

  while (i0 < n) {
    dx = x1 - x0, dy = y1 - y0;

    // Find the next non-empty node.
    do sumValue = nodes[i1++].value; while (!sumValue && i1 < n);
    minValue = maxValue = sumValue;
    alpha = Math.max(dy / dx, dx / dy) / (value * ratio);
    beta = sumValue * sumValue * alpha;
    minRatio = Math.max(maxValue / beta, beta / minValue);

    // Keep adding nodes while the aspect ratio maintains or improves.
    for (; i1 < n; ++i1) {
      sumValue += nodeValue = nodes[i1].value;
      if (nodeValue < minValue) minValue = nodeValue;
      if (nodeValue > maxValue) maxValue = nodeValue;
      beta = sumValue * sumValue * alpha;
      newRatio = Math.max(maxValue / beta, beta / minValue);
      if (newRatio > minRatio) { sumValue -= nodeValue; break; }
      minRatio = newRatio;
    }

    // Position and record the row orientation.
    rows.push(row = {value: sumValue, dice: dx < dy, children: nodes.slice(i0, i1)});
    if (row.dice) treemapDice(row, x0, y0, x1, value ? y0 += dy * sumValue / value : y1);
    else treemapSlice(row, x0, y0, value ? x0 += dx * sumValue / value : x1, y1);
    value -= sumValue, i0 = i1;
  }

  return rows;
}

var squarify = (function custom(ratio) {

  function squarify(parent, x0, y0, x1, y1) {
    squarifyRatio(ratio, parent, x0, y0, x1, y1);
  }

  squarify.ratio = function(x) {
    return custom((x = +x) > 1 ? x : 1);
  };

  return squarify;
})(phi);

function index$1() {
  var tile = squarify,
      round = false,
      dx = 1,
      dy = 1,
      paddingStack = [0],
      paddingInner = constantZero,
      paddingTop = constantZero,
      paddingRight = constantZero,
      paddingBottom = constantZero,
      paddingLeft = constantZero;

  function treemap(root) {
    root.x0 =
    root.y0 = 0;
    root.x1 = dx;
    root.y1 = dy;
    root.eachBefore(positionNode);
    paddingStack = [0];
    if (round) root.eachBefore(roundNode);
    return root;
  }

  function positionNode(node) {
    var p = paddingStack[node.depth],
        x0 = node.x0 + p,
        y0 = node.y0 + p,
        x1 = node.x1 - p,
        y1 = node.y1 - p;
    if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
    if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
    node.x0 = x0;
    node.y0 = y0;
    node.x1 = x1;
    node.y1 = y1;
    if (node.children) {
      p = paddingStack[node.depth + 1] = paddingInner(node) / 2;
      x0 += paddingLeft(node) - p;
      y0 += paddingTop(node) - p;
      x1 -= paddingRight(node) - p;
      y1 -= paddingBottom(node) - p;
      if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
      if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
      tile(node, x0, y0, x1, y1);
    }
  }

  treemap.round = function(x) {
    return arguments.length ? (round = !!x, treemap) : round;
  };

  treemap.size = function(x) {
    return arguments.length ? (dx = +x[0], dy = +x[1], treemap) : [dx, dy];
  };

  treemap.tile = function(x) {
    return arguments.length ? (tile = required(x), treemap) : tile;
  };

  treemap.padding = function(x) {
    return arguments.length ? treemap.paddingInner(x).paddingOuter(x) : treemap.paddingInner();
  };

  treemap.paddingInner = function(x) {
    return arguments.length ? (paddingInner = typeof x === "function" ? x : constant(+x), treemap) : paddingInner;
  };

  treemap.paddingOuter = function(x) {
    return arguments.length ? treemap.paddingTop(x).paddingRight(x).paddingBottom(x).paddingLeft(x) : treemap.paddingTop();
  };

  treemap.paddingTop = function(x) {
    return arguments.length ? (paddingTop = typeof x === "function" ? x : constant(+x), treemap) : paddingTop;
  };

  treemap.paddingRight = function(x) {
    return arguments.length ? (paddingRight = typeof x === "function" ? x : constant(+x), treemap) : paddingRight;
  };

  treemap.paddingBottom = function(x) {
    return arguments.length ? (paddingBottom = typeof x === "function" ? x : constant(+x), treemap) : paddingBottom;
  };

  treemap.paddingLeft = function(x) {
    return arguments.length ? (paddingLeft = typeof x === "function" ? x : constant(+x), treemap) : paddingLeft;
  };

  return treemap;
}

function binary(parent, x0, y0, x1, y1) {
  var nodes = parent.children,
      i, n = nodes.length,
      sum, sums = new Array(n + 1);

  for (sums[0] = sum = i = 0; i < n; ++i) {
    sums[i + 1] = sum += nodes[i].value;
  }

  partition(0, n, parent.value, x0, y0, x1, y1);

  function partition(i, j, value, x0, y0, x1, y1) {
    if (i >= j - 1) {
      var node = nodes[i];
      node.x0 = x0, node.y0 = y0;
      node.x1 = x1, node.y1 = y1;
      return;
    }

    var valueOffset = sums[i],
        valueTarget = (value / 2) + valueOffset,
        k = i + 1,
        hi = j - 1;

    while (k < hi) {
      var mid = k + hi >>> 1;
      if (sums[mid] < valueTarget) k = mid + 1;
      else hi = mid;
    }

    if ((valueTarget - sums[k - 1]) < (sums[k] - valueTarget) && i + 1 < k) --k;

    var valueLeft = sums[k] - valueOffset,
        valueRight = value - valueLeft;

    if ((x1 - x0) > (y1 - y0)) {
      var xk = value ? (x0 * valueRight + x1 * valueLeft) / value : x1;
      partition(i, k, valueLeft, x0, y0, xk, y1);
      partition(k, j, valueRight, xk, y0, x1, y1);
    } else {
      var yk = value ? (y0 * valueRight + y1 * valueLeft) / value : y1;
      partition(i, k, valueLeft, x0, y0, x1, yk);
      partition(k, j, valueRight, x0, yk, x1, y1);
    }
  }
}

function sliceDice(parent, x0, y0, x1, y1) {
  (parent.depth & 1 ? treemapSlice : treemapDice)(parent, x0, y0, x1, y1);
}

var resquarify = (function custom(ratio) {

  function resquarify(parent, x0, y0, x1, y1) {
    if ((rows = parent._squarify) && (rows.ratio === ratio)) {
      var rows,
          row,
          nodes,
          i,
          j = -1,
          n,
          m = rows.length,
          value = parent.value;

      while (++j < m) {
        row = rows[j], nodes = row.children;
        for (i = row.value = 0, n = nodes.length; i < n; ++i) row.value += nodes[i].value;
        if (row.dice) treemapDice(row, x0, y0, x1, value ? y0 += (y1 - y0) * row.value / value : y1);
        else treemapSlice(row, x0, y0, value ? x0 += (x1 - x0) * row.value / value : x1, y1);
        value -= row.value;
      }
    } else {
      parent._squarify = rows = squarifyRatio(ratio, parent, x0, y0, x1, y1);
      rows.ratio = ratio;
    }
  }

  resquarify.ratio = function(x) {
    return custom((x = +x) > 1 ? x : 1);
  };

  return resquarify;
})(phi);

exports.cluster = cluster;
exports.hierarchy = hierarchy;
exports.pack = index;
exports.packEnclose = enclose;
exports.packSiblings = siblings;
exports.partition = partition;
exports.stratify = stratify;
exports.tree = tree;
exports.treemap = index$1;
exports.treemapBinary = binary;
exports.treemapDice = treemapDice;
exports.treemapResquarify = resquarify;
exports.treemapSlice = treemapSlice;
exports.treemapSliceDice = sliceDice;
exports.treemapSquarify = squarify;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{}],8:[function(require,module,exports){
// https://d3js.org/d3-interpolate/ v2.0.1 Copyright 2020 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-color')) :
typeof define === 'function' && define.amd ? define(['exports', 'd3-color'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}, global.d3));
}(this, function (exports, d3Color) { 'use strict';

function basis(t1, v0, v1, v2, v3) {
  var t2 = t1 * t1, t3 = t2 * t1;
  return ((1 - 3 * t1 + 3 * t2 - t3) * v0
      + (4 - 6 * t2 + 3 * t3) * v1
      + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2
      + t3 * v3) / 6;
}

function basis$1(values) {
  var n = values.length - 1;
  return function(t) {
    var i = t <= 0 ? (t = 0) : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n),
        v1 = values[i],
        v2 = values[i + 1],
        v0 = i > 0 ? values[i - 1] : 2 * v1 - v2,
        v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
}

function basisClosed(values) {
  var n = values.length;
  return function(t) {
    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n),
        v0 = values[(i + n - 1) % n],
        v1 = values[i % n],
        v2 = values[(i + 1) % n],
        v3 = values[(i + 2) % n];
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
}

var constant = x => () => x;

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

function hue(a, b) {
  var d = b - a;
  return d ? linear(a, d > 180 || d < -180 ? d - 360 * Math.round(d / 360) : d) : constant(isNaN(a) ? b : a);
}

function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant(isNaN(a) ? b : a);
}

var rgb = (function rgbGamma(y) {
  var color = gamma(y);

  function rgb(start, end) {
    var r = color((start = d3Color.rgb(start)).r, (end = d3Color.rgb(end)).r),
        g = color(start.g, end.g),
        b = color(start.b, end.b),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }

  rgb.gamma = rgbGamma;

  return rgb;
})(1);

function rgbSpline(spline) {
  return function(colors) {
    var n = colors.length,
        r = new Array(n),
        g = new Array(n),
        b = new Array(n),
        i, color;
    for (i = 0; i < n; ++i) {
      color = d3Color.rgb(colors[i]);
      r[i] = color.r || 0;
      g[i] = color.g || 0;
      b[i] = color.b || 0;
    }
    r = spline(r);
    g = spline(g);
    b = spline(b);
    color.opacity = 1;
    return function(t) {
      color.r = r(t);
      color.g = g(t);
      color.b = b(t);
      return color + "";
    };
  };
}

var rgbBasis = rgbSpline(basis$1);
var rgbBasisClosed = rgbSpline(basisClosed);

function numberArray(a, b) {
  if (!b) b = [];
  var n = a ? Math.min(b.length, a.length) : 0,
      c = b.slice(),
      i;
  return function(t) {
    for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
    return c;
  };
}

function isNumberArray(x) {
  return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

function array(a, b) {
  return (isNumberArray(b) ? numberArray : genericArray)(a, b);
}

function genericArray(a, b) {
  var nb = b ? b.length : 0,
      na = a ? Math.min(nb, a.length) : 0,
      x = new Array(na),
      c = new Array(nb),
      i;

  for (i = 0; i < na; ++i) x[i] = value(a[i], b[i]);
  for (; i < nb; ++i) c[i] = b[i];

  return function(t) {
    for (i = 0; i < na; ++i) c[i] = x[i](t);
    return c;
  };
}

function date(a, b) {
  var d = new Date;
  return a = +a, b = +b, function(t) {
    return d.setTime(a * (1 - t) + b * t), d;
  };
}

function number(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
}

function object(a, b) {
  var i = {},
      c = {},
      k;

  if (a === null || typeof a !== "object") a = {};
  if (b === null || typeof b !== "object") b = {};

  for (k in b) {
    if (k in a) {
      i[k] = value(a[k], b[k]);
    } else {
      c[k] = b[k];
    }
  }

  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
}

var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
    reB = new RegExp(reA.source, "g");

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

function string(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
      am, // current match in a
      bm, // current match in b
      bs, // string preceding current number in b, if any
      i = -1, // index in s
      s = [], // string constants and placeholders
      q = []; // number interpolators

  // Coerce inputs to strings.
  a = a + "", b = b + "";

  // Interpolate pairs of numbers in a & b.
  while ((am = reA.exec(a))
      && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) { // a string precedes the next number in b
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
      if (s[i]) s[i] += bm; // coalesce with previous string
      else s[++i] = bm;
    } else { // interpolate non-matching numbers
      s[++i] = null;
      q.push({i: i, x: number(am, bm)});
    }
    bi = reB.lastIndex;
  }

  // Add remains of b.
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs; // coalesce with previous string
    else s[++i] = bs;
  }

  // Special optimization for only a single match.
  // Otherwise, interpolate each of the numbers and rejoin the string.
  return s.length < 2 ? (q[0]
      ? one(q[0].x)
      : zero(b))
      : (b = q.length, function(t) {
          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        });
}

function value(a, b) {
  var t = typeof b, c;
  return b == null || t === "boolean" ? constant(b)
      : (t === "number" ? number
      : t === "string" ? ((c = d3Color.color(b)) ? (b = c, rgb) : string)
      : b instanceof d3Color.color ? rgb
      : b instanceof Date ? date
      : isNumberArray(b) ? numberArray
      : Array.isArray(b) ? genericArray
      : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
      : number)(a, b);
}

function discrete(range) {
  var n = range.length;
  return function(t) {
    return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
  };
}

function hue$1(a, b) {
  var i = hue(+a, +b);
  return function(t) {
    var x = i(t);
    return x - 360 * Math.floor(x / 360);
  };
}

function round(a, b) {
  return a = +a, b = +b, function(t) {
    return Math.round(a * (1 - t) + b * t);
  };
}

var degrees = 180 / Math.PI;

var identity = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};

function decompose(a, b, c, d, e, f) {
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
    scaleX: scaleX,
    scaleY: scaleY
  };
}

var svgNode;

/* eslint-disable no-undef */
function parseCss(value) {
  const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m.isIdentity ? identity : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
}

function parseSvg(value) {
  if (value == null) return identity;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}

function interpolateTransform(parse, pxComma, pxParen, degParen) {

  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }

  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({i: i - 4, x: number(xa, xb)}, {i: i - 2, x: number(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: number(xa, xb)}, {i: i - 2, x: number(ya, yb)});
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }

  return function(a, b) {
    var s = [], // string constants and placeholders
        q = []; // number interpolators
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null; // gc
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}

var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

var epsilon2 = 1e-12;

function cosh(x) {
  return ((x = Math.exp(x)) + 1 / x) / 2;
}

function sinh(x) {
  return ((x = Math.exp(x)) - 1 / x) / 2;
}

function tanh(x) {
  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
}

var zoom = (function zoomRho(rho, rho2, rho4) {

  // p0 = [ux0, uy0, w0]
  // p1 = [ux1, uy1, w1]
  function zoom(p0, p1) {
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2],
        ux1 = p1[0], uy1 = p1[1], w1 = p1[2],
        dx = ux1 - ux0,
        dy = uy1 - uy0,
        d2 = dx * dx + dy * dy,
        i,
        S;

    // Special case for u0 ≅ u1.
    if (d2 < epsilon2) {
      S = Math.log(w1 / w0) / rho;
      i = function(t) {
        return [
          ux0 + t * dx,
          uy0 + t * dy,
          w0 * Math.exp(rho * t * S)
        ];
      };
    }

    // General case.
    else {
      var d1 = Math.sqrt(d2),
          b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
          b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1),
          r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
          r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / rho;
      i = function(t) {
        var s = t * S,
            coshr0 = cosh(r0),
            u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
        return [
          ux0 + u * dx,
          uy0 + u * dy,
          w0 * coshr0 / cosh(rho * s + r0)
        ];
      };
    }

    i.duration = S * 1000 * rho / Math.SQRT2;

    return i;
  }

  zoom.rho = function(_) {
    var _1 = Math.max(1e-3, +_), _2 = _1 * _1, _4 = _2 * _2;
    return zoomRho(_1, _2, _4);
  };

  return zoom;
})(Math.SQRT2, 2, 4);

function hsl(hue) {
  return function(start, end) {
    var h = hue((start = d3Color.hsl(start)).h, (end = d3Color.hsl(end)).h),
        s = nogamma(start.s, end.s),
        l = nogamma(start.l, end.l),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.h = h(t);
      start.s = s(t);
      start.l = l(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }
}

var hsl$1 = hsl(hue);
var hslLong = hsl(nogamma);

function lab(start, end) {
  var l = nogamma((start = d3Color.lab(start)).l, (end = d3Color.lab(end)).l),
      a = nogamma(start.a, end.a),
      b = nogamma(start.b, end.b),
      opacity = nogamma(start.opacity, end.opacity);
  return function(t) {
    start.l = l(t);
    start.a = a(t);
    start.b = b(t);
    start.opacity = opacity(t);
    return start + "";
  };
}

function hcl(hue) {
  return function(start, end) {
    var h = hue((start = d3Color.hcl(start)).h, (end = d3Color.hcl(end)).h),
        c = nogamma(start.c, end.c),
        l = nogamma(start.l, end.l),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.h = h(t);
      start.c = c(t);
      start.l = l(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }
}

var hcl$1 = hcl(hue);
var hclLong = hcl(nogamma);

function cubehelix(hue) {
  return (function cubehelixGamma(y) {
    y = +y;

    function cubehelix(start, end) {
      var h = hue((start = d3Color.cubehelix(start)).h, (end = d3Color.cubehelix(end)).h),
          s = nogamma(start.s, end.s),
          l = nogamma(start.l, end.l),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.h = h(t);
        start.s = s(t);
        start.l = l(Math.pow(t, y));
        start.opacity = opacity(t);
        return start + "";
      };
    }

    cubehelix.gamma = cubehelixGamma;

    return cubehelix;
  })(1);
}

var cubehelix$1 = cubehelix(hue);
var cubehelixLong = cubehelix(nogamma);

function piecewise(interpolate, values) {
  if (values === undefined) values = interpolate, interpolate = value;
  var i = 0, n = values.length - 1, v = values[0], I = new Array(n < 0 ? 0 : n);
  while (i < n) I[i] = interpolate(v, v = values[++i]);
  return function(t) {
    var i = Math.max(0, Math.min(n - 1, Math.floor(t *= n)));
    return I[i](t - i);
  };
}

function quantize(interpolator, n) {
  var samples = new Array(n);
  for (var i = 0; i < n; ++i) samples[i] = interpolator(i / (n - 1));
  return samples;
}

exports.interpolate = value;
exports.interpolateArray = array;
exports.interpolateBasis = basis$1;
exports.interpolateBasisClosed = basisClosed;
exports.interpolateCubehelix = cubehelix$1;
exports.interpolateCubehelixLong = cubehelixLong;
exports.interpolateDate = date;
exports.interpolateDiscrete = discrete;
exports.interpolateHcl = hcl$1;
exports.interpolateHclLong = hclLong;
exports.interpolateHsl = hsl$1;
exports.interpolateHslLong = hslLong;
exports.interpolateHue = hue$1;
exports.interpolateLab = lab;
exports.interpolateNumber = number;
exports.interpolateNumberArray = numberArray;
exports.interpolateObject = object;
exports.interpolateRgb = rgb;
exports.interpolateRgbBasis = rgbBasis;
exports.interpolateRgbBasisClosed = rgbBasisClosed;
exports.interpolateRound = round;
exports.interpolateString = string;
exports.interpolateTransformCss = interpolateTransformCss;
exports.interpolateTransformSvg = interpolateTransformSvg;
exports.interpolateZoom = zoom;
exports.piecewise = piecewise;
exports.quantize = quantize;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{"d3-color":3}],9:[function(require,module,exports){
// https://d3js.org/d3-selection/ v2.0.0 Copyright 2020 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

function namespace(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
}

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

function creator(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
}

function none() {}

function selector(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
}

function selection_select(select) {
  if (typeof select !== "function") select = selector(select);

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

function array(x) {
  return typeof x === "object" && "length" in x
    ? x // Array, TypedArray, NodeList, array-like
    : Array.from(x); // Map, Set, iterable, string, or anything else
}

function empty() {
  return [];
}

function selectorAll(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

function arrayAll(select) {
  return function() {
    var group = select.apply(this, arguments);
    return group == null ? [] : array(group);
  };
}

function selection_selectAll(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll(select);

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

function matcher(selector) {
  return function() {
    return this.matches(selector);
  };
}

function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

var find = Array.prototype.find;

function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}

function childFirst() {
  return this.firstElementChild;
}

function selection_selectChild(match) {
  return this.select(match == null ? childFirst
      : childFind(typeof match === "function" ? match : childMatcher(match)));
}

var filter = Array.prototype.filter;

function children() {
  return this.children;
}

function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}

function selection_selectChildren(match) {
  return this.selectAll(match == null ? children
      : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}

function selection_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection(subgroups, this._parents);
}

function sparse(update) {
  return new Array(update.length);
}

function selection_enter() {
  return new Selection(this._enter || this._groups.map(sparse), this._parents);
}

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

function constant(x) {
  return function() {
    return x;
  };
}

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = new Map,
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
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

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
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

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
      exit[i] = node;
    }
  }
}

function datum(node) {
  return node.__data__;
}

function selection_data(value, key) {
  if (!arguments.length) return Array.from(this, datum);

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = array(value.call(parent, parent && parent.__data__, j, parents)),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}

function selection_exit() {
  return new Selection(this._exit || this._groups.map(sparse), this._parents);
}

function selection_join(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
  if (onupdate != null) update = onupdate(update);
  if (onexit == null) exit.remove(); else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}

function selection_merge(selection) {
  if (!(selection instanceof Selection)) throw new Error("invalid merge");

  for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
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

function selection_order() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
}

function selection_sort(compare) {
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

function selection_call() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}

function selection_nodes() {
  return Array.from(this);
}

function selection_node() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
}

function selection_size() {
  let size = 0;
  for (const node of this) ++size; // eslint-disable-line no-unused-vars
  return size;
}

function selection_empty() {
  return !this.node();
}

function selection_each(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
}

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

function selection_attr(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)
      : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
}

function defaultView(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
}

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

function selection_style(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove : typeof value === "function"
            ? styleFunction
            : styleConstant)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
}

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

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

function selection_property(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
}

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

function selection_classed(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
}

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

function selection_text(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction
          : textConstant)(value))
      : this.node().textContent;
}

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

function selection_html(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
}

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

function selection_raise() {
  return this.each(raise);
}

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

function selection_lower() {
  return this.each(lower);
}

function selection_append(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
}

function constantNull() {
  return null;
}

function selection_insert(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
}

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

function selection_remove() {
  return this.each(remove);
}

function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_clone(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}

function selection_datum(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
}

function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
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
    o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

function selection_on(typename, value, options) {
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

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
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

function selection_dispatch(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
}

function* selection_iterator() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}

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
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};

function select(selector) {
  return typeof selector === "string"
      ? new Selection([[document.querySelector(selector)]], [document.documentElement])
      : new Selection([[selector]], root);
}

function create(name) {
  return select(creator(name).call(document.documentElement));
}

var nextId = 0;

function local() {
  return new Local;
}

function Local() {
  this._ = "@" + (++nextId).toString(36);
}

Local.prototype = local.prototype = {
  constructor: Local,
  get: function(node) {
    var id = this._;
    while (!(id in node)) if (!(node = node.parentNode)) return;
    return node[id];
  },
  set: function(node, value) {
    return node[this._] = value;
  },
  remove: function(node) {
    return this._ in node && delete node[this._];
  },
  toString: function() {
    return this._;
  }
};

function sourceEvent(event) {
  let sourceEvent;
  while (sourceEvent = event.sourceEvent) event = sourceEvent;
  return event;
}

function pointer(event, node) {
  event = sourceEvent(event);
  if (node === undefined) node = event.currentTarget;
  if (node) {
    var svg = node.ownerSVGElement || node;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }
    if (node.getBoundingClientRect) {
      var rect = node.getBoundingClientRect();
      return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
    }
  }
  return [event.pageX, event.pageY];
}

function pointers(events, node) {
  if (events.target) { // i.e., instanceof Event, not TouchList or iterable
    events = sourceEvent(events);
    if (node === undefined) node = events.currentTarget;
    events = events.touches || [events];
  }
  return Array.from(events, event => pointer(event, node));
}

function selectAll(selector) {
  return typeof selector === "string"
      ? new Selection([document.querySelectorAll(selector)], [document.documentElement])
      : new Selection([selector == null ? [] : array(selector)], root);
}

exports.create = create;
exports.creator = creator;
exports.local = local;
exports.matcher = matcher;
exports.namespace = namespace;
exports.namespaces = namespaces;
exports.pointer = pointer;
exports.pointers = pointers;
exports.select = select;
exports.selectAll = selectAll;
exports.selection = selection;
exports.selector = selector;
exports.selectorAll = selectorAll;
exports.style = styleValue;
exports.window = defaultView;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{}],10:[function(require,module,exports){
// https://d3js.org/d3-timer/ v2.0.0 Copyright 2020 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

var frame = 0, // is an animation frame pending?
    timeout = 0, // is a timeout pending?
    interval = 0, // are any timers active?
    pokeDelay = 1000, // how frequently we check for clock skew
    taskHead,
    taskTail,
    clockLast = 0,
    clockNow = 0,
    clockSkew = 0,
    clock = typeof performance === "object" && performance.now ? performance : Date,
    setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}

function clearNow() {
  clockNow = 0;
}

function Timer() {
  this._call =
  this._time =
  this._next = null;
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
  var t = new Timer;
  t.restart(callback, delay, time);
  return t;
}

function timerFlush() {
  now(); // Get the current time, if not already set.
  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
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
  var now = clock.now(), delay = now - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
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
  if (frame) return; // Soonest alarm already set, or will be.
  if (timeout) timeout = clearTimeout(timeout);
  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
  if (delay > 24) {
    if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

function timeout$1(callback, delay, time) {
  var t = new Timer;
  delay = delay == null ? 0 : +delay;
  t.restart(elapsed => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
}

function interval$1(callback, delay, time) {
  var t = new Timer, total = delay;
  if (delay == null) return t.restart(callback, delay, time), t;
  t._restart = t.restart;
  t.restart = function(callback, delay, time) {
    delay = +delay, time = time == null ? now() : +time;
    t._restart(function tick(elapsed) {
      elapsed += total;
      t._restart(tick, total += delay, time);
      callback(elapsed);
    }, delay, time);
  };
  t.restart(callback, delay, time);
  return t;
}

exports.interval = interval$1;
exports.now = now;
exports.timeout = timeout$1;
exports.timer = timer;
exports.timerFlush = timerFlush;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{}],11:[function(require,module,exports){
// https://d3js.org/d3-transition/ v2.0.0 Copyright 2020 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-selection'), require('d3-dispatch'), require('d3-timer'), require('d3-interpolate'), require('d3-color'), require('d3-ease')) :
typeof define === 'function' && define.amd ? define(['exports', 'd3-selection', 'd3-dispatch', 'd3-timer', 'd3-interpolate', 'd3-color', 'd3-ease'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}, global.d3, global.d3, global.d3, global.d3, global.d3, global.d3));
}(this, function (exports, d3Selection, d3Dispatch, d3Timer, d3Interpolate, d3Color, d3Ease) { 'use strict';

var emptyOn = d3Dispatch.dispatch("start", "end", "cancel", "interrupt");
var emptyTween = [];

var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;

function schedule(node, name, id, index, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id in schedules) return;
  create(node, id, {
    name: name,
    index: index, // For context during callback.
    group: group, // For context during callback.
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

function init(node, id) {
  var schedule = get(node, id);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}

function set(node, id) {
  var schedule = get(node, id);
  if (schedule.state > STARTED) throw new Error("too late; already running");
  return schedule;
}

function get(node, id) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
  return schedule;
}

function create(node, id, self) {
  var schedules = node.__transition,
      tween;

  // Initialize the self timer when the transition is created.
  // Note the actual delay is not known until the first callback!
  schedules[id] = self;
  self.timer = d3Timer.timer(schedule, 0, self.time);

  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start, self.delay, self.time);

    // If the elapsed delay is less than our first sleep, start immediately.
    if (self.delay <= elapsed) start(elapsed - self.delay);
  }

  function start(elapsed) {
    var i, j, n, o;

    // If the state is not SCHEDULED, then we previously errored on start.
    if (self.state !== SCHEDULED) return stop();

    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;

      // While this element already has a starting transition during this frame,
      // defer starting an interrupting transition until that transition has a
      // chance to tick (and possibly end); see d3/d3-transition#54!
      if (o.state === STARTED) return d3Timer.timeout(start);

      // Interrupt the active transition, if any.
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }

      // Cancel any pre-empted transitions.
      else if (+i < id) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }

    // Defer the first tick to end of the current frame; see d3/d3#1576.
    // Note the transition may be canceled after start and before the first tick!
    // Note this must be scheduled before the start event; see d3/d3-transition#16!
    // Assuming this is successful, subsequent callbacks go straight to tick.
    d3Timer.timeout(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });

    // Dispatch the start event.
    // Note this must be done before the tween are initialized.
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return; // interrupted
    self.state = STARTED;

    // Initialize the tween, deleting null tween.
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }

  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
        i = -1,
        n = tween.length;

    while (++i < n) {
      tween[i].call(node, t);
    }

    // Dispatch the end event.
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }

  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id];
    for (var i in schedules) return; // eslint-disable-line no-unused-vars
    delete node.__transition;
  }
}

function interrupt(node, name) {
  var schedules = node.__transition,
      schedule,
      active,
      empty = true,
      i;

  if (!schedules) return;

  name = name == null ? null : name + "";

  for (i in schedules) {
    if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
    active = schedule.state > STARTING && schedule.state < ENDING;
    schedule.state = ENDED;
    schedule.timer.stop();
    schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
    delete schedules[i];
  }

  if (empty) delete node.__transition;
}

function selection_interrupt(name) {
  return this.each(function() {
    interrupt(this, name);
  });
}

function tweenRemove(id, name) {
  var tween0, tween1;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
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

function tweenFunction(id, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
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

function transition_tween(name, value) {
  var id = this._id;

  name += "";

  if (arguments.length < 2) {
    var tween = get(this.node(), id).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }

  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
}

function tweenValue(transition, name, value) {
  var id = transition._id;

  transition.each(function() {
    var schedule = set(this, id);
    (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get(node, id).value[name];
  };
}

function interpolate(a, b) {
  var c;
  return (typeof b === "number" ? d3Interpolate.interpolateNumber
      : b instanceof d3Color.color ? d3Interpolate.interpolateRgb
      : (c = d3Color.color(b)) ? (b = c, d3Interpolate.interpolateRgb)
      : d3Interpolate.interpolateString)(a, b);
}

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

function attrConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrConstantNS(fullname, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function attrFunctionNS(fullname, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function transition_attr(name, value) {
  var fullname = d3Selection.namespace(name), i = fullname === "transform" ? d3Interpolate.interpolateTransformSvg : interpolate;
  return this.attrTween(name, typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value))
      : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname)
      : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
}

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

function transition_attrTween(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  var fullname = d3Selection.namespace(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}

function delayFunction(id, value) {
  return function() {
    init(this, id).delay = +value.apply(this, arguments);
  };
}

function delayConstant(id, value) {
  return value = +value, function() {
    init(this, id).delay = value;
  };
}

function transition_delay(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? delayFunction
          : delayConstant)(id, value))
      : get(this.node(), id).delay;
}

function durationFunction(id, value) {
  return function() {
    set(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set(this, id).duration = value;
  };
}

function transition_duration(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? durationFunction
          : durationConstant)(id, value))
      : get(this.node(), id).duration;
}

function easeConstant(id, value) {
  if (typeof value !== "function") throw new Error;
  return function() {
    set(this, id).ease = value;
  };
}

function transition_ease(value) {
  var id = this._id;

  return arguments.length
      ? this.each(easeConstant(id, value))
      : get(this.node(), id).ease;
}

function easeVarying(id, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error;
    set(this, id).ease = v;
  };
}

function transition_easeVarying(value) {
  if (typeof value !== "function") throw new Error;
  return this.each(easeVarying(this._id, value));
}

function transition_filter(match) {
  if (typeof match !== "function") match = d3Selection.matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Transition(subgroups, this._parents, this._name, this._id);
}

function transition_merge(transition) {
  if (transition._id !== this._id) throw new Error;

  for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
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

function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}

function onFunction(id, name, listener) {
  var on0, on1, sit = start(name) ? init : set;
  return function() {
    var schedule = sit(this, id),
        on = schedule.on;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

    schedule.on = on1;
  };
}

function transition_on(name, listener) {
  var id = this._id;

  return arguments.length < 2
      ? get(this.node(), id).on.on(name)
      : this.each(onFunction(id, name, listener));
}

function removeFunction(id) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id) return;
    if (parent) parent.removeChild(this);
  };
}

function transition_remove() {
  return this.on("end.remove", removeFunction(this._id));
}

function transition_select(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = d3Selection.selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule(subgroup[i], name, id, i, subgroup, get(node, id));
      }
    }
  }

  return new Transition(subgroups, this._parents, name, id);
}

function transition_selectAll(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = d3Selection.selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
          if (child = children[k]) {
            schedule(child, name, id, k, children, inherit);
          }
        }
        subgroups.push(children);
        parents.push(node);
      }
    }
  }

  return new Transition(subgroups, parents, name, id);
}

var Selection = d3Selection.selection.prototype.constructor;

function transition_selection() {
  return new Selection(this._groups, this._parents);
}

function styleNull(name, interpolate) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = d3Selection.style(this, name),
        string1 = (this.style.removeProperty(name), d3Selection.style(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, string10 = string1);
  };
}

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = d3Selection.style(this, name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function styleFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = d3Selection.style(this, name),
        value1 = value(this),
        string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), d3Selection.style(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function styleMaybeRemove(id, name) {
  var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
  return function() {
    var schedule = set(this, id),
        on = schedule.on,
        listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : undefined;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

    schedule.on = on1;
  };
}

function transition_style(name, value, priority) {
  var i = (name += "") === "transform" ? d3Interpolate.interpolateTransformCss : interpolate;
  return value == null ? this
      .styleTween(name, styleNull(name, i))
      .on("end.style." + name, styleRemove(name))
    : typeof value === "function" ? this
      .styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value)))
      .each(styleMaybeRemove(this._id, name))
    : this
      .styleTween(name, styleConstant(name, i, value), priority)
      .on("end.style." + name, null);
}

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

function transition_styleTween(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}

function transition_text(value) {
  return this.tween("text", typeof value === "function"
      ? textFunction(tweenValue(this, "text", value))
      : textConstant(value == null ? "" : value + ""));
}

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

function transition_textTween(value) {
  var key = "text";
  if (arguments.length < 1) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, textTween(value));
}

function transition_transition() {
  var name = this._name,
      id0 = this._id,
      id1 = newId();

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit = get(node, id0);
        schedule(node, name, id1, i, group, {
          time: inherit.time + inherit.delay + inherit.duration,
          delay: 0,
          duration: inherit.duration,
          ease: inherit.ease
        });
      }
    }
  }

  return new Transition(groups, this._parents, name, id1);
}

function transition_end() {
  var on0, on1, that = this, id = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = {value: reject},
        end = {value: function() { if (--size === 0) resolve(); }};

    that.each(function() {
      var schedule = set(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }

      schedule.on = on1;
    });

    // The selection was empty, resolve end immediately
    if (size === 0) resolve();
  });
}

var id = 0;

function Transition(groups, parents, name, id) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id;
}

function transition(name) {
  return d3Selection.selection().transition(name);
}

function newId() {
  return ++id;
}

var selection_prototype = d3Selection.selection.prototype;

Transition.prototype = transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  textTween: transition_textTween,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease,
  easeVarying: transition_easeVarying,
  end: transition_end,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};

var defaultTiming = {
  time: null, // Set on use.
  delay: 0,
  duration: 250,
  ease: d3Ease.easeCubicInOut
};

function inherit(node, id) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id} not found`);
    }
  }
  return timing;
}

function selection_transition(name) {
  var id,
      timing;

  if (name instanceof Transition) {
    id = name._id, name = name._name;
  } else {
    id = newId(), (timing = defaultTiming).time = d3Timer.now(), name = name == null ? null : name + "";
  }

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule(node, name, id, i, group, timing || inherit(node, id));
      }
    }
  }

  return new Transition(groups, this._parents, name, id);
}

d3Selection.selection.prototype.interrupt = selection_interrupt;
d3Selection.selection.prototype.transition = selection_transition;

var root = [null];

function active(node, name) {
  var schedules = node.__transition,
      schedule,
      i;

  if (schedules) {
    name = name == null ? null : name + "";
    for (i in schedules) {
      if ((schedule = schedules[i]).state > SCHEDULED && schedule.name === name) {
        return new Transition([[node]], root, name, +i);
      }
    }
  }

  return null;
}

exports.active = active;
exports.interrupt = interrupt;
exports.transition = transition;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{"d3-color":3,"d3-dispatch":4,"d3-ease":5,"d3-interpolate":8,"d3-selection":9,"d3-timer":10}],12:[function(require,module,exports){
function hasTag(val) {
    return function(node) {
        return node.tag === val;
    };
}

function d3ize(tree) {
    var peopleNodes = tree
        .filter(hasTag('INDI'))
        .map(toNode);
    var families = tree.filter(hasTag('FAM'));
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
        links: links
    };
}

function getName(p) {
    if (p.tag === 'INDI') {
        var nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
        if (nameNode) {
            return nameNode.data.replace(/\//g, '');
        } else {
            return '?';
        }
    } else {
        return 'Family';
    }
}

function toNode(p) {
    p.id = p.pointer;
    p.name = getName(p);
    return p;
}

function idToIndex(indexedNodes) {
    return function(link) {
        function getIndexed(id) {
            return indexedNodes[id];
        }
        return {
            source: getIndexed(link.source),
            target: getIndexed(link.target)
        };
    };
}

function familyLinks(family) {
    var memberLinks = family.tree.filter(function(member) {
        // avoid connecting MARR, etc: things that are not
        // people.
        return member.data && member.data[0] === '@';
    }).map(function(member) {
        return {
            source: family.pointer,
            target: member.data
        };
    });
    return memberLinks;
}

module.exports = d3ize;

},{}],13:[function(require,module,exports){
var crawl = require('tree-crawl');

// from https://github.com/madprime/python-gedcom/blob/master/gedcom/__init__.py
// * Level must start with nonnegative int, no leading zeros.
// * Pointer optional, if it exists it must be flanked by '@'
// * Tag must be alphanumeric string
// * Value optional, consists of anything after a space to end of line
//   End of line defined by \n or \r
var lineRe = /\s*(0|[1-9]+[0-9]*) (@[^@]+@ |)([A-Za-z0-9_]+)( [^\n\r]*|)/;

function parse(input) {
    var start = { root: { tree: [] }, level: 0 };
    start.pointer = start.root;

    var data = input
        .split('\n')
        .map(mapLine)
        .filter(function(_) { return _; })
        .reduce(buildTree, start)
        .root;

    crawl(data, cleanUp, { getChildren });
    return data.tree;

    // the basic trick of this module is turning the suggested tree
    // structure of a GEDCOM file into a tree in JSON. This reduction
    // does that. The only real trick is the `.up` member of objects
    // that points to a level up in the structure. This we have to
    // censor before JSON.stringify since it creates circular references.
    function buildTree(memo, data) {
        if (data.level === memo.level) {
            memo.pointer.tree.push(data);
        } else if (data.level > memo.level) {
            var up = memo.pointer;
            memo.pointer = memo.pointer.tree[
                memo.pointer.tree.length - 1];
                memo.pointer.tree.push(data);
                memo.pointer.up = up;
                memo.level = data.level;
        } else if (data.level < memo.level) {
            // the jump up in the stack may be by more than one, so ascend
            // until we're at the right level.
            while (data.level <= memo.pointer.level && memo.pointer.up) {
                memo.pointer = memo.pointer.up;
            }
            memo.pointer.tree.push(data);
            memo.level = data.level;
        }
        return memo;
    }

    function mapLine(data) {
        var match = data.match(lineRe);
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
module.exports.d3ize = require('./d3ize');

},{"./d3ize":12,"tree-crawl":14}],14:[function(require,module,exports){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.crawl = factory());
}(this, (function () { 'use strict';

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
  remove: function remove() {
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
    this.stack.push({ node: node, index: 0 });
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

function dfsPre(root, iteratee, getChildren) {
  var flags = FlagsFactory();
  var cursor = CursorFactory();
  var context = ContextFactory(flags, cursor);
  var stack = QueueFactory(root);
  var dummy = Object.assign({}, root);
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
      var children = getChildren(node);
      if (isNotEmpty(children)) {
        stack.push(dummy);
        stack.pushArrayReverse(children);
        cursor.moveDown(node);
      }
    }
  }
}

function dfsPost(root, iteratee, getChildren) {
  var flags = FlagsFactory();
  var cursor = CursorFactory();
  var context = ContextFactory(flags, cursor);
  var stack = QueueFactory(root);
  var ancestors = QueueFactory(null);
  while (!stack.isEmpty()) {
    var node = stack.peek();
    var parent = ancestors.peek();
    var children = getChildren(node);
    flags.reset();
    if (node === parent || !isNotEmpty(children)) {
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
      stack.pushArrayReverse(children);
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
    this.queue.enqueue({ node: node, arity: arity });
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

function bfs(root, iteratee, getChildren) {
  var flags = FlagsFactory();
  var cursor = CursorFactory$1();
  var context = ContextFactory(flags, cursor);
  var queue = QueueFactory$1(root);
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
        var children = getChildren(node);
        if (isNotEmpty(children)) {
          queue.enqueueMultiple(children);
          cursor.store(node, children.length);
        }
      }
    }
    cursor.moveForward();
  }
}

var defaultGetChildren = function defaultGetChildren(node) {
  return node.children;
};
function crawl(root, iteratee, options) {
  if (null == root) return;
  options = options || {};
  var order = options.order || 'pre';
  var getChildren = options.getChildren || defaultGetChildren;
  if ('pre' === order) {
    dfsPre(root, iteratee, getChildren);
  } else if ('post' === order) {
    dfsPost(root, iteratee, getChildren);
  } else if ('bfs' === order) {
    bfs(root, iteratee, getChildren);
  }
}

return crawl;

})));

},{}],15:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AncestorChart = exports.getAncestorsTree = void 0;
var chart_util_1 = require("./chart-util");
var d3_hierarchy_1 = require("d3-hierarchy");
var id_generator_1 = require("./id-generator");
function getAncestorsTree(options) {
    var ancestorChartOptions = __assign({}, options);
    var startIndiFamilies = options.startIndi
        ? options.data.getIndi(options.startIndi).getFamiliesAsSpouse()
        : [];
    // If the start individual is set and this person has at least one spouse,
    // start with the family instead.
    if (startIndiFamilies.length) {
        ancestorChartOptions.startFam = startIndiFamilies[0];
        ancestorChartOptions.startIndi = undefined;
        var fam = options.data.getFam(startIndiFamilies[0]);
        if (fam.getMother() === options.startIndi) {
            ancestorChartOptions.swapStartSpouses = true;
        }
    }
    var ancestors = new AncestorChart(ancestorChartOptions);
    var ancestorsRoot = ancestors.createHierarchy();
    // Remove spouse's ancestors if there are multiple spouses
    // to avoid showing ancestors of just one spouse.
    if (startIndiFamilies.length > 1 &&
        ancestorsRoot.children &&
        ancestorsRoot.children.length > 1) {
        ancestorsRoot.children.pop();
        ancestorsRoot.data.spouseParentNodeId = undefined;
    }
    return ancestorsRoot;
}
exports.getAncestorsTree = getAncestorsTree;
/** Renders an ancestors chart. */
var AncestorChart = /** @class */ (function () {
    function AncestorChart(options) {
        this.options = options;
        this.util = new chart_util_1.ChartUtil(options);
    }
    /** Creates a d3 hierarchy from the input data. */
    AncestorChart.prototype.createHierarchy = function () {
        var parents = [];
        var stack = [];
        var idGenerator = this.options.idGenerator || new id_generator_1.IdGenerator();
        if (this.options.startIndi) {
            var indi = this.options.data.getIndi(this.options.startIndi);
            var famc = indi.getFamilyAsChild();
            var id = famc ? idGenerator.getId(famc) : undefined;
            if (famc) {
                stack.push({
                    id: famc,
                    parentId: this.options.startIndi,
                    family: { id: famc },
                });
            }
            parents.push({
                id: this.options.startIndi,
                indi: { id: this.options.startIndi },
                indiParentNodeId: id,
            });
        }
        else {
            stack.push({
                id: idGenerator.getId(this.options.startFam),
                family: { id: this.options.startFam },
            });
        }
        while (stack.length) {
            var entry = stack.pop();
            var fam = this.options.data.getFam(entry.family.id);
            if (!fam) {
                continue;
            }
            var _a = entry.family.id === this.options.startFam &&
                this.options.swapStartSpouses
                ? [fam.getMother(), fam.getFather()]
                : [fam.getFather(), fam.getMother()], father = _a[0], mother = _a[1];
            if (!father && !mother) {
                continue;
            }
            if (mother) {
                entry.spouse = { id: mother };
                var indi = this.options.data.getIndi(mother);
                var famc = indi.getFamilyAsChild();
                if (famc) {
                    var id = idGenerator.getId(famc);
                    entry.spouseParentNodeId = id;
                    stack.push({
                        id: id,
                        parentId: entry.id,
                        family: { id: famc },
                    });
                }
            }
            if (father) {
                entry.indi = { id: father };
                var indi = this.options.data.getIndi(father);
                var famc = indi.getFamilyAsChild();
                if (famc) {
                    var id = idGenerator.getId(famc);
                    entry.indiParentNodeId = id;
                    stack.push({
                        id: id,
                        parentId: entry.id,
                        family: { id: famc },
                    });
                }
            }
            parents.push(entry);
        }
        return d3_hierarchy_1.stratify()(parents);
    };
    /**
     * Renders the tree, calling the provided renderer to draw boxes for
     * individuals.
     */
    AncestorChart.prototype.render = function () {
        var root = this.createHierarchy();
        var nodes = this.util.layOutChart(root, { flipVertically: true });
        var animationPromise = this.util.renderChart(nodes);
        var info = chart_util_1.getChartInfo(nodes);
        this.util.updateSvgDimensions(info);
        return Object.assign(info, { animationPromise: animationPromise });
    };
    return AncestorChart;
}());
exports.AncestorChart = AncestorChart;

},{"./chart-util":17,"./id-generator":27,"d3-hierarchy":7}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartColors = void 0;
var ChartColors;
(function (ChartColors) {
    ChartColors[ChartColors["NO_COLOR"] = 0] = "NO_COLOR";
    ChartColors[ChartColors["COLOR_BY_GENERATION"] = 1] = "COLOR_BY_GENERATION";
    ChartColors[ChartColors["COLOR_BY_SEX"] = 2] = "COLOR_BY_SEX";
})(ChartColors = exports.ChartColors || (exports.ChartColors = {}));

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartUtil = exports.getChartInfoWithoutMargin = exports.getChartInfo = exports.linkId = exports.V_SPACING = exports.H_SPACING = void 0;
var d3_selection_1 = require("d3-selection");
var d3_flextree_1 = require("d3-flextree");
var d3_array_1 = require("d3-array");
require("d3-transition");
/** Horizontal distance between boxes. */
exports.H_SPACING = 15;
/** Vertical distance between boxes. */
exports.V_SPACING = 30;
/** Margin around the whole drawing. */
var MARGIN = 15;
var HIDE_TIME_MS = 200;
var MOVE_TIME_MS = 500;
/** Assigns an identifier to a link. */
function linkId(node) {
    if (!node.parent) {
        return node.id + ":A";
    }
    var _a = node.data.generation > node.parent.data.generation
        ? [node.data, node.parent.data]
        : [node.parent.data, node.data], child = _a[0], parent = _a[1];
    if (child.additionalMarriage) {
        return child.id + ":A";
    }
    return parent.id + ":" + child.id;
}
exports.linkId = linkId;
function getChartInfo(nodes) {
    // Calculate chart boundaries.
    var x0 = d3_array_1.min(nodes, function (d) { return d.x - d.data.width / 2; }) - MARGIN;
    var y0 = d3_array_1.min(nodes, function (d) { return d.y - d.data.height / 2; }) - MARGIN;
    var x1 = d3_array_1.max(nodes, function (d) { return d.x + d.data.width / 2; }) + MARGIN;
    var y1 = d3_array_1.max(nodes, function (d) { return d.y + d.data.height / 2; }) + MARGIN;
    return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
}
exports.getChartInfo = getChartInfo;
function getChartInfoWithoutMargin(nodes) {
    // Calculate chart boundaries.
    var x0 = d3_array_1.min(nodes, function (d) { return d.x - d.data.width / 2; });
    var y0 = d3_array_1.min(nodes, function (d) { return d.y - d.data.height / 2; });
    var x1 = d3_array_1.max(nodes, function (d) { return d.x + d.data.width / 2; });
    var y1 = d3_array_1.max(nodes, function (d) { return d.y + d.data.height / 2; });
    return { size: [x1 - x0, y1 - y0], origin: [-x0, -y0] };
}
exports.getChartInfoWithoutMargin = getChartInfoWithoutMargin;
/** Utility class with common code for all chart types. */
var ChartUtil = /** @class */ (function () {
    function ChartUtil(options) {
        this.options = options;
    }
    /** Creates a path from parent to the child node (horizontal layout). */
    ChartUtil.prototype.linkHorizontal = function (s, d) {
        var sAnchor = this.options.renderer.getFamilyAnchor(s.data);
        var dAnchor = s.id === d.data.spouseParentNodeId
            ? this.options.renderer.getSpouseAnchor(d.data)
            : this.options.renderer.getIndiAnchor(d.data);
        var _a = [s.x + sAnchor[0], s.y + sAnchor[1]], sx = _a[0], sy = _a[1];
        var _b = [d.x + dAnchor[0], d.y + dAnchor[1]], dx = _b[0], dy = _b[1];
        var midX = (s.x + s.data.width / 2 + d.x - d.data.width / 2) / 2;
        return "M " + sx + " " + sy + "\n            L " + midX + " " + sy + ",\n              " + midX + " " + dy + ",\n              " + dx + " " + dy;
    };
    /** Creates a path from parent to the child node (vertical layout). */
    ChartUtil.prototype.linkVertical = function (s, d) {
        var sAnchor = this.options.renderer.getFamilyAnchor(s.data);
        var dAnchor = s.id === d.data.spouseParentNodeId
            ? this.options.renderer.getSpouseAnchor(d.data)
            : this.options.renderer.getIndiAnchor(d.data);
        var _a = [s.x + sAnchor[0], s.y + sAnchor[1]], sx = _a[0], sy = _a[1];
        var _b = [d.x + dAnchor[0], d.y + dAnchor[1]], dx = _b[0], dy = _b[1];
        var midY = s.y + s.data.height / 2 + exports.V_SPACING / 2;
        return "M " + sx + " " + sy + "\n            L " + sx + " " + midY + ",\n              " + dx + " " + midY + ",\n              " + dx + " " + dy;
    };
    ChartUtil.prototype.linkAdditionalMarriage = function (node) {
        var nodeIndex = node.parent.children.findIndex(function (n) { return n.data.id === node.data.id; });
        // Assert nodeIndex > 0.
        var siblingNode = node.parent.children[nodeIndex - 1];
        var sAnchor = this.options.renderer.getIndiAnchor(node.data);
        var dAnchor = this.options.renderer.getIndiAnchor(siblingNode.data);
        var _a = [node.x + sAnchor[0], node.y + sAnchor[1]], sx = _a[0], sy = _a[1];
        var _b = [siblingNode.x + dAnchor[0], siblingNode.y + dAnchor[1]], dx = _b[0], dy = _b[1];
        return "M " + sx + ", " + sy + "\n            L " + dx + ", " + dy;
    };
    ChartUtil.prototype.updateSvgDimensions = function (chartInfo) {
        var svg = d3_selection_1.select(this.options.svgSelector);
        var group = svg.select('g');
        var transition = this.options.animate
            ? group.transition().delay(HIDE_TIME_MS).duration(MOVE_TIME_MS)
            : group;
        transition.attr('transform', "translate(" + chartInfo.origin[0] + ", " + chartInfo.origin[1] + ")");
    };
    ChartUtil.prototype.layOutChart = function (root, layoutOptions) {
        var _this = this;
        if (layoutOptions === void 0) { layoutOptions = {}; }
        // Add styles so that calculating text size is correct.
        var svg = d3_selection_1.select(this.options.svgSelector);
        if (svg.select('style').empty()) {
            svg.append('style').text(this.options.renderer.getCss());
        }
        // Assign generation number.
        root.each(function (node) {
            node.data.generation =
                node.depth * (layoutOptions.flipVertically ? -1 : 1) +
                    (_this.options.baseGeneration || 0);
        });
        // Set preferred sizes.
        this.options.renderer.updateNodes(root.descendants());
        var vSizePerDepth = new Map();
        root.each(function (node) {
            var depth = node.depth;
            var maxVSize = d3_array_1.max([
                _this.options.horizontal ? node.data.width : node.data.height,
                vSizePerDepth.get(depth),
            ]);
            vSizePerDepth.set(depth, maxVSize);
        });
        // Set sizes of whole nodes.
        root.each(function (node) {
            var vSize = vSizePerDepth.get(node.depth);
            if (_this.options.horizontal) {
                node.data.width = vSize;
            }
            else {
                node.data.height = vSize;
            }
        });
        var vSpacing = layoutOptions.vSpacing !== undefined ? layoutOptions.vSpacing : exports.V_SPACING;
        var hSpacing = layoutOptions.hSpacing !== undefined ? layoutOptions.hSpacing : exports.H_SPACING;
        // Assigns the x and y position for the nodes.
        var treemap = d3_flextree_1.flextree()
            .nodeSize(function (node) {
            if (_this.options.horizontal) {
                var maxChildSize_1 = d3_array_1.max(node.children || [], function (n) { return n.data.width; }) || 0;
                return [
                    node.data.height,
                    (maxChildSize_1 + node.data.width) / 2 + vSpacing,
                ];
            }
            var maxChildSize = d3_array_1.max(node.children || [], function (n) { return n.data.height; }) || 0;
            return [
                node.data.width,
                (maxChildSize + node.data.height) / 2 + vSpacing,
            ];
        })
            .spacing(function (a, b) { return hSpacing; });
        var nodes = treemap(root).descendants();
        // Swap x-y coordinates for horizontal layout.
        nodes.forEach(function (node) {
            var _a;
            if (layoutOptions.flipVertically) {
                node.y = -node.y;
            }
            if (_this.options.horizontal) {
                _a = [node.y, node.x], node.x = _a[0], node.y = _a[1];
            }
        });
        return nodes;
    };
    ChartUtil.prototype.renderChart = function (nodes) {
        var svg = this.getSvgForRendering();
        var nodeAnimation = this.renderNodes(nodes, svg);
        var linkAnimation = this.renderLinks(nodes, svg);
        return Promise.all([
            nodeAnimation,
            linkAnimation,
        ]);
    };
    ChartUtil.prototype.renderNodes = function (nodes, svg) {
        var _this = this;
        var animationPromise = new Promise(function (resolve) {
            var boundNodes = svg
                .select('g')
                .selectAll('g.node')
                .data(nodes, function (d) { return d.id; });
            var nodeEnter = boundNodes.enter().append('g');
            var transitionsPending = boundNodes.exit().size() + boundNodes.size() + nodeEnter.size();
            var transitionDone = function () {
                transitionsPending--;
                if (transitionsPending === 0) {
                    resolve();
                }
            };
            if (!_this.options.animate) {
                resolve();
            }
            nodeEnter
                .merge(boundNodes)
                .attr('class', function (node) { return "node generation" + node.data.generation; });
            nodeEnter.attr('transform', function (node) {
                return "translate(" + (node.x - node.data.width / 2) + ", " + (node.y - node.data.height / 2) + ")";
            });
            if (_this.options.animate) {
                nodeEnter
                    .style('opacity', 0)
                    .transition()
                    .delay(HIDE_TIME_MS + MOVE_TIME_MS)
                    .duration(HIDE_TIME_MS)
                    .style('opacity', 1)
                    .on('end', transitionDone);
            }
            var updateTransition = _this.options.animate
                ? boundNodes
                    .transition()
                    .delay(HIDE_TIME_MS)
                    .duration(MOVE_TIME_MS)
                    .on('end', transitionDone)
                : boundNodes;
            updateTransition.attr('transform', function (node) {
                return "translate(" + (node.x - node.data.width / 2) + ", " + (node.y - node.data.height / 2) + ")";
            });
            _this.options.renderer.render(nodeEnter, boundNodes);
            if (_this.options.animate) {
                boundNodes
                    .exit()
                    .transition()
                    .duration(HIDE_TIME_MS)
                    .style('opacity', 0)
                    .remove()
                    .on('end', transitionDone);
            }
            else {
                boundNodes.exit().remove();
            }
        });
        return animationPromise;
    };
    ChartUtil.prototype.renderLinks = function (nodes, svg) {
        var _this = this;
        var animationPromise = new Promise(function (resolve) {
            var link = function (parent, child) {
                if (child.data.additionalMarriage) {
                    return _this.linkAdditionalMarriage(child);
                }
                var flipVertically = parent.data.generation > child.data.generation;
                if (_this.options.horizontal) {
                    if (flipVertically) {
                        return _this.linkHorizontal(child, parent);
                    }
                    return _this.linkHorizontal(parent, child);
                }
                if (flipVertically) {
                    return _this.linkVertical(child, parent);
                }
                return _this.linkVertical(parent, child);
            };
            var links = nodes.filter(function (n) { return !!n.parent || n.data.additionalMarriage; });
            var boundLinks = svg
                .select('g')
                .selectAll('path.link')
                .data(links, linkId);
            var path = boundLinks
                .enter()
                .insert('path', 'g')
                .attr('class', function (node) {
                return node.data.additionalMarriage ? 'link additional-marriage' : 'link';
            })
                .attr('d', function (node) { return link(node.parent, node); });
            var transitionsPending = boundLinks.exit().size() + boundLinks.size() + path.size();
            var transitionDone = function () {
                transitionsPending--;
                if (transitionsPending === 0) {
                    resolve();
                }
            };
            if (!_this.options.animate) {
                resolve();
            }
            var linkTransition = _this.options.animate
                ? boundLinks
                    .transition()
                    .delay(HIDE_TIME_MS)
                    .duration(MOVE_TIME_MS)
                    .on('end', transitionDone)
                : boundLinks;
            linkTransition.attr('d', function (node) { return link(node.parent, node); });
            if (_this.options.animate) {
                path
                    .style('opacity', 0)
                    .transition()
                    .delay(2 * HIDE_TIME_MS + MOVE_TIME_MS)
                    .duration(0)
                    .style('opacity', 1)
                    .on('end', transitionDone);
            }
            if (_this.options.animate) {
                boundLinks
                    .exit()
                    .transition()
                    .duration(0)
                    .style('opacity', 0)
                    .remove()
                    .on('end', transitionDone);
            }
            else {
                boundLinks.exit().remove();
            }
        });
        return animationPromise;
    };
    ChartUtil.prototype.getSvgForRendering = function () {
        var svg = d3_selection_1.select(this.options.svgSelector);
        if (svg.select('g').empty()) {
            svg.append('g');
        }
        return svg;
    };
    return ChartUtil;
}());
exports.ChartUtil = ChartUtil;

},{"d3-array":2,"d3-flextree":6,"d3-selection":9,"d3-transition":11}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleRenderer = void 0;
/** Renders person or married couple inside a sircle. */
var CircleRenderer = /** @class */ (function () {
    function CircleRenderer(options) {
        this.options = options;
    }
    CircleRenderer.prototype.getFamilyAnchor = function (node) {
        return [0, 0];
    };
    CircleRenderer.prototype.getIndiAnchor = function (node) {
        return [0, 0];
    };
    CircleRenderer.prototype.getSpouseAnchor = function (node) {
        return [0, 0];
    };
    CircleRenderer.prototype.updateNodes = function (nodes) {
        nodes.forEach(function (node) {
            var _a;
            _a = node.data.family
                ? [120, 120]
                : [80, 80], node.data.width = _a[0], node.data.height = _a[1];
        });
    };
    CircleRenderer.prototype.getName = function (entry) {
        if (!entry) {
            return '';
        }
        var indi = this.options.data.getIndi(entry.id);
        var firstName = indi.getFirstName();
        return firstName ? firstName.split(' ')[0] : '';
    };
    CircleRenderer.prototype.render = function (enter, update) {
        var _this = this;
        enter = enter.append('g').attr('class', 'circle');
        update = update.select('g');
        enter
            .append('circle')
            .attr('r', function (node) { return node.data.width / 2; })
            .attr('cx', function (node) { return node.data.width / 2; })
            .attr('cy', function (node) { return node.data.height / 2; });
        enter
            .filter(function (node) { return !!node.data.family; })
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', function (node) {
            return "translate(" + node.data.width / 2 + ", " + (node.data.height / 2 - 4) + ")";
        })
            .text(function (node) { return _this.getName(node.data.indi); });
        enter
            .filter(function (node) { return !!node.data.family; })
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', function (node) {
            return "translate(" + node.data.width / 2 + ", " + (node.data.height / 2 + 14) + ")";
        })
            .text(function (node) { return _this.getName(node.data.spouse); });
        enter
            .filter(function (node) { return !node.data.family; })
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('transform', function (node) {
            return "translate(" + node.data.width / 2 + ", " + (node.data.height / 2 + 4) + ")";
        })
            .text(function (node) { return _this.getName(node.data.indi); });
    };
    CircleRenderer.prototype.getCss = function () {
        return "\n    circle {\n      fill: white;\n      stroke: #040;\n      stroke-width: 5px;\n    }\n    .circle text {\n      font-family: verdana, arial, sans-serif;\n      font-size: 12px;\n    }\n    .background {\n      stroke: none;\n    }\n    ";
    };
    return CircleRenderer;
}());
exports.CircleRenderer = CircleRenderer;

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFamPositionHorizontal = exports.getFamPositionVertical = exports.CompositeRenderer = void 0;
var d3_array_1 = require("d3-array");
/**
 * Common code for tree nodes that are composed of individual and family boxes.
 */
var CompositeRenderer = /** @class */ (function () {
    function CompositeRenderer(options) {
        this.options = options;
    }
    CompositeRenderer.prototype.getPreferredFamSize = function (id) {
        // No family box in the simple renderer.
        return [0, 0];
    };
    CompositeRenderer.prototype.setPreferredIndiSize = function (indi) {
        var _a;
        if (!indi) {
            return;
        }
        _a = this.getPreferredIndiSize(indi.id), indi.width = _a[0], indi.height = _a[1];
    };
    CompositeRenderer.prototype.updateNodes = function (nodes) {
        var _this = this;
        // Calculate individual vertical size per depth.
        var indiVSizePerDepth = new Map();
        nodes.forEach(function (node) {
            var _a;
            _this.setPreferredIndiSize(node.data.indi);
            _this.setPreferredIndiSize(node.data.spouse);
            var family = node.data.family;
            if (family) {
                _a = _this.getPreferredFamSize(family.id), family.width = _a[0], family.height = _a[1];
            }
            var depth = node.depth;
            var maxIndiVSize = d3_array_1.max([
                getIndiVSize(node.data, !!_this.options.horizontal),
                indiVSizePerDepth.get(depth),
            ]);
            indiVSizePerDepth.set(depth, maxIndiVSize);
        });
        // Set same width for each depth.
        nodes.forEach(function (node) {
            var _a;
            if (_this.options.horizontal) {
                if (node.data.indi) {
                    node.data.indi.width = indiVSizePerDepth.get(node.depth);
                }
                if (node.data.spouse) {
                    node.data.spouse.width = indiVSizePerDepth.get(node.depth);
                }
            }
            else {
                if (node.data.indi) {
                    node.data.indi.height = indiVSizePerDepth.get(node.depth);
                }
                if (node.data.spouse) {
                    node.data.spouse.height = indiVSizePerDepth.get(node.depth);
                }
            }
            var vSize = getVSize(node.data, !!_this.options.horizontal);
            var hSize = getHSize(node.data, !!_this.options.horizontal);
            _a = _this.options.horizontal
                ? [vSize, hSize]
                : [hSize, vSize], node.data.width = _a[0], node.data.height = _a[1];
        });
    };
    CompositeRenderer.prototype.getFamilyAnchor = function (node) {
        if (this.options.horizontal) {
            var x_1 = -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
            var famYOffset = node.family
                ? d3_array_1.max([-getFamPositionHorizontal(node), 0])
                : 0;
            var y_1 = -(node.indi && node.spouse ? node.height / 2 - node.indi.height : 0) +
                famYOffset;
            return [x_1, y_1];
        }
        var famXOffset = node.family
            ? d3_array_1.max([-getFamPositionVertical(node), 0])
            : 0;
        var x = -(node.indi && node.spouse ? node.width / 2 - node.indi.width : 0) +
            famXOffset;
        var y = -node.height / 2 + getIndiVSize(node, this.options.horizontal) / 2;
        return [x, y];
    };
    CompositeRenderer.prototype.getSpouseAnchor = function (node) {
        if (this.options.horizontal) {
            var x_2 = -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
            var y_2 = node.indi ? node.indi.height / 2 : 0;
            return [x_2, y_2];
        }
        var x = node.indi ? node.indi.width / 2 : 0;
        var y = -node.height / 2 + getIndiVSize(node, !!this.options.horizontal) / 2;
        return [x, y];
    };
    CompositeRenderer.prototype.getIndiAnchor = function (node) {
        if (this.options.horizontal) {
            var x_3 = -node.width / 2 + getIndiVSize(node, this.options.horizontal) / 2;
            var y_3 = node.spouse ? -node.spouse.height / 2 : 0;
            return [x_3, y_3];
        }
        var x = node.spouse ? -node.spouse.width / 2 : 0;
        var y = -node.height / 2 + getIndiVSize(node, !!this.options.horizontal) / 2;
        return [x, y];
    };
    return CompositeRenderer;
}());
exports.CompositeRenderer = CompositeRenderer;
/**
 * Returns the relative position of the family box for the vertical layout.
 */
function getFamPositionVertical(node) {
    var indiWidth = node.indi ? node.indi.width : 0;
    var spouseWidth = node.spouse ? node.spouse.width : 0;
    var familyWidth = node.family.width;
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
exports.getFamPositionVertical = getFamPositionVertical;
/**
 * Returns the relative position of the family box for the horizontal layout.
 */
function getFamPositionHorizontal(node) {
    var indiHeight = node.indi ? node.indi.height : 0;
    var spouseHeight = node.spouse ? node.spouse.height : 0;
    var familyHeight = node.family.height;
    if (!node.indi || !node.spouse) {
        return (indiHeight + spouseHeight - familyHeight) / 2;
    }
    return indiHeight - familyHeight / 2;
}
exports.getFamPositionHorizontal = getFamPositionHorizontal;
/** Returns the horizontal size. */
function getHSize(node, horizontal) {
    if (horizontal) {
        return ((node.indi ? node.indi.height : 0) +
            (node.spouse ? node.spouse.height : 0));
    }
    var indiHSize = (node.indi ? node.indi.width : 0) + (node.spouse ? node.spouse.width : 0);
    return d3_array_1.max([indiHSize, node.family ? node.family.width : 0]);
}
function getFamVSize(node, horizontal) {
    if (horizontal) {
        return node.family ? node.family.width : 0;
    }
    return node.family ? node.family.height : 0;
}
/** Returns the vertical size of individual boxes. */
function getIndiVSize(node, horizontal) {
    if (horizontal) {
        return d3_array_1.max([
            node.indi ? node.indi.width : 0,
            node.spouse ? node.spouse.width : 0,
        ]);
    }
    return d3_array_1.max([
        node.indi ? node.indi.height : 0,
        node.spouse ? node.spouse.height : 0,
    ]);
}
/** Returns the vertical size. */
function getVSize(node, horizontal) {
    return getIndiVSize(node, horizontal) + getFamVSize(node, horizontal);
}

},{"d3-array":2}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonDataProvider = void 0;
/** Details of an individual based on Json input. */
var JsonIndiDetails = /** @class */ (function () {
    function JsonIndiDetails(json) {
        this.json = json;
    }
    JsonIndiDetails.prototype.getId = function () {
        return this.json.id;
    };
    JsonIndiDetails.prototype.getFamiliesAsSpouse = function () {
        return this.json.fams || [];
    };
    JsonIndiDetails.prototype.getFamilyAsChild = function () {
        return this.json.famc || null;
    };
    JsonIndiDetails.prototype.getFirstName = function () {
        return this.json.firstName || null;
    };
    JsonIndiDetails.prototype.getLastName = function () {
        return this.json.lastName || null;
    };
    JsonIndiDetails.prototype.getBirthDate = function () {
        return this.json.birth || null;
    };
    JsonIndiDetails.prototype.getMaidenName = function () {
        return this.json.maidenName || null;
    };
    JsonIndiDetails.prototype.getNumberOfChildren = function () {
        return this.json.numberOfChildren || null;
    };
    JsonIndiDetails.prototype.getNumberOfMarriages = function () {
        return this.json.numberOfMarriages || null;
    };
    JsonIndiDetails.prototype.getBirthPlace = function () {
        return (this.json.birth && this.json.birth.place) || null;
    };
    JsonIndiDetails.prototype.getDeathDate = function () {
        return this.json.death || null;
    };
    JsonIndiDetails.prototype.getDeathPlace = function () {
        return (this.json.death && this.json.death.place) || null;
    };
    JsonIndiDetails.prototype.isConfirmedDeath = function () {
        return !!this.json.death && !!this.json.death.confirmed;
    };
    JsonIndiDetails.prototype.getSex = function () {
        return this.json.sex || null;
    };
    JsonIndiDetails.prototype.getImageUrl = function () {
        return ((this.json.images &&
            this.json.images.length > 0 &&
            this.json.images[0].url) ||
            null);
    };
    JsonIndiDetails.prototype.getImages = function () {
        return this.json.images || null;
    };
    JsonIndiDetails.prototype.getNotes = function () {
        return this.json.notes || null;
    };
    JsonIndiDetails.prototype.getEvents = function () {
        return this.json.events || null;
    };
    JsonIndiDetails.prototype.showId = function () {
        return !this.json.hideId;
    };
    return JsonIndiDetails;
}());
/** Details of a family based on Json input. */
var JsonFamDetails = /** @class */ (function () {
    function JsonFamDetails(json) {
        this.json = json;
    }
    JsonFamDetails.prototype.getId = function () {
        return this.json.id;
    };
    JsonFamDetails.prototype.getFather = function () {
        return this.json.husb || null;
    };
    JsonFamDetails.prototype.getMother = function () {
        return this.json.wife || null;
    };
    JsonFamDetails.prototype.getChildren = function () {
        return this.json.children || [];
    };
    JsonFamDetails.prototype.getMarriageDate = function () {
        return this.json.marriage || null;
    };
    JsonFamDetails.prototype.getMarriagePlace = function () {
        return (this.json.marriage && this.json.marriage.place) || null;
    };
    return JsonFamDetails;
}());
/** Implementation of the DataProvider interface based on Json input. */
var JsonDataProvider = /** @class */ (function () {
    function JsonDataProvider(json) {
        var _this = this;
        this.json = json;
        this.indis = new Map();
        this.fams = new Map();
        json.indis.forEach(function (indi) {
            return _this.indis.set(indi.id, new JsonIndiDetails(indi));
        });
        json.fams.forEach(function (fam) { return _this.fams.set(fam.id, new JsonFamDetails(fam)); });
    }
    JsonDataProvider.prototype.getIndi = function (id) {
        return this.indis.get(id) || null;
    };
    JsonDataProvider.prototype.getFam = function (id) {
        return this.fams.get(id) || null;
    };
    return JsonDataProvider;
}());
exports.JsonDataProvider = JsonDataProvider;

},{}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateOrRange = exports.formatDate = void 0;
/** Month in English is used as fallback if a requested translation is not found. */
var MONTHS_EN = new Map([
    [1, 'Jan'],
    [2, 'Feb'],
    [3, 'Mar'],
    [4, 'Apr'],
    [5, 'May'],
    [6, 'Jun'],
    [7, 'Jul'],
    [8, 'Aug'],
    [9, 'Sep'],
    [10, 'Oct'],
    [11, 'Nov'],
    [12, 'Dec'],
]);
/** Translations of the GEDCOM date qualifiers. */
var QUALIFIERS_I18N = new Map([
    [
        'cs',
        new Map([
            ['cal', 'vypočt.'],
            ['abt', 'o'],
            ['est', 'ocenil'],
            ['before', 'před'],
            ['after', 'po'],
        ]),
    ],
    [
        'de',
        new Map([
            ['cal', 'errech.'],
            ['abt', 'etwa'],
            ['est', 'geschät.'],
            ['before', 'vor'],
            ['after', 'nach'],
        ]),
    ],
    [
        'fr',
        new Map([
            ['cal', 'calc.'],
            ['abt', 'vers'],
            ['est', 'est.'],
            ['before', 'avant'],
            ['after', 'après'],
        ]),
    ],
    [
        'it',
        new Map([
            ['cal', 'calc.'],
            ['abt', 'circa il'],
            ['est', 'stim.'],
            ['before', 'prima del'],
            ['after', 'dopo del'],
        ]),
    ],
    [
        'pl',
        new Map([
            ['cal', 'wyl.'],
            ['abt', 'ok.'],
            ['est', 'szac.'],
            ['before', 'przed'],
            ['after', 'po'],
        ]),
    ],
    [
        'ru',
        new Map([
            ['cal', 'выч.'],
            ['abt', 'ок.'],
            ['est', 'оцен.'],
            ['before', 'до'],
            ['after', 'после'],
        ]),
    ],
]);
var shortMonthCache = new Map();
function getShortMonth(month, locale) {
    if (!Intl || !Intl.DateTimeFormat) {
        return MONTHS_EN.get(month);
    }
    var cacheKey = month + "|" + (locale || '');
    if (shortMonthCache.has(cacheKey)) {
        return shortMonthCache.get(cacheKey);
    }
    var result = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, month - 1));
    shortMonthCache.set(cacheKey, result);
    return result;
}
function getQualifier(qualifier, locale) {
    var language = locale && locale.split(/[-_]/)[0];
    var languageMap = language && QUALIFIERS_I18N.get(language);
    return languageMap ? languageMap.get(qualifier) : qualifier;
}
/**
 * Formats the date consisting of day, month and year.
 * All parts of the date are optional.
 */
function formatDateOnly(day, month, year, locale) {
    if (!day && !month && !year) {
        return '';
    }
    // Fall back to formatting the date manually in case of
    // - locale not provided
    // - English (to avoid formatting like 'Oct 11, 2009')
    // - Lack of i18n support in the browser
    if (!Intl || !Intl.DateTimeFormat || !locale || locale === 'en') {
        return [day, month && getShortMonth(month, locale), year].join(' ');
    }
    var format = {
        day: day ? 'numeric' : undefined,
        month: month ? 'short' : undefined,
        year: year ? 'numeric' : undefined,
    };
    return new Intl.DateTimeFormat(locale, format).format(new Date(year !== null && year !== void 0 ? year : 2000, month ? month - 1 : 1, day !== null && day !== void 0 ? day : 1));
}
/** Simple date formatter. */
function formatDate(date, locale) {
    return [
        date.qualifier && getQualifier(date.qualifier, locale),
        formatDateOnly(date.day, date.month, date.year, locale),
        date.text,
    ].join(' ');
}
exports.formatDate = formatDate;
/** Formats a DateOrRange object. */
function formatDateOrRange(dateOrRange, locale) {
    if (dateOrRange.date) {
        return formatDate(dateOrRange.date, locale);
    }
    if (!dateOrRange.dateRange) {
        return '';
    }
    var from = dateOrRange.dateRange.from && formatDate(dateOrRange.dateRange.from);
    var to = dateOrRange.dateRange.to && formatDate(dateOrRange.dateRange.to);
    if (from && to) {
        return from + " .. " + to;
    }
    if (from) {
        return getQualifier('after', locale) + " " + from;
    }
    if (to) {
        return getQualifier('before', locale) + " " + to;
    }
    return '';
}
exports.formatDateOrRange = formatDateOrRange;

},{}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescendantChart = exports.layOutDescendants = exports.DUMMY_ROOT_NODE_ID = void 0;
var d3_hierarchy_1 = require("d3-hierarchy");
var chart_util_1 = require("./chart-util");
var id_generator_1 = require("./id-generator");
exports.DUMMY_ROOT_NODE_ID = 'DUMMY_ROOT_NODE';
function layOutDescendants(options, layoutOptions) {
    if (layoutOptions === void 0) { layoutOptions = {}; }
    var descendants = new DescendantChart(options);
    var descendantsRoot = descendants.createHierarchy();
    return removeDummyNode(new chart_util_1.ChartUtil(options).layOutChart(descendantsRoot, layoutOptions));
}
exports.layOutDescendants = layOutDescendants;
/** Removes the dummy root node if it was added in createHierarchy(). */
function removeDummyNode(allNodes) {
    if (allNodes[0].id !== exports.DUMMY_ROOT_NODE_ID) {
        return allNodes;
    }
    var nodes = allNodes.slice(1);
    // Move first node to (0, 0) coordinates.
    var dx = -nodes[0].x;
    var dy = -nodes[0].y;
    nodes.forEach(function (node) {
        if (node.parent &&
            node.parent.id === exports.DUMMY_ROOT_NODE_ID &&
            !node.data.additionalMarriage) {
            node.parent = null;
        }
        node.x += dx;
        node.y += dy;
        node.data.generation--;
    });
    return nodes;
}
/** Returns the spouse of the given individual in the given family. */
function getSpouse(indiId, fam) {
    if (fam.getFather() === indiId) {
        return fam.getMother();
    }
    return fam.getFather();
}
/** Renders a descendants chart. */
var DescendantChart = /** @class */ (function () {
    function DescendantChart(options) {
        this.options = options;
        this.util = new chart_util_1.ChartUtil(options);
    }
    DescendantChart.prototype.getNodes = function (id) {
        var _this = this;
        var indi = this.options.data.getIndi(id);
        var famIds = indi.getFamiliesAsSpouse();
        if (!famIds.length) {
            // Single person.
            return [
                {
                    id: id,
                    indi: {
                        id: id,
                    },
                },
            ];
        }
        // Marriages.
        var nodes = famIds.map(function (famId) {
            var entry = {
                id: famId,
                indi: {
                    id: id,
                },
                family: {
                    id: famId,
                },
            };
            var fam = _this.options.data.getFam(famId);
            var spouse = getSpouse(id, fam);
            if (spouse) {
                entry.spouse = { id: spouse };
            }
            return entry;
        });
        nodes.slice(1).forEach(function (node) {
            node.additionalMarriage = true;
        });
        return nodes;
    };
    DescendantChart.prototype.getFamNode = function (famId) {
        var node = { id: famId, family: { id: famId } };
        var fam = this.options.data.getFam(famId);
        var father = fam.getFather();
        if (father) {
            node.indi = { id: father };
        }
        var mother = fam.getMother();
        if (mother) {
            node.spouse = { id: mother };
        }
        return node;
    };
    /** Creates a d3 hierarchy from the input data. */
    DescendantChart.prototype.createHierarchy = function () {
        var _this = this;
        var parents = [];
        var nodes = this.options.startIndi
            ? this.getNodes(this.options.startIndi)
            : [this.getFamNode(this.options.startFam)];
        var idGenerator = this.options.idGenerator || new id_generator_1.IdGenerator();
        nodes.forEach(function (node) { return (node.id = idGenerator.getId(node.id)); });
        // If there are multiple root nodes, i.e. the start individual has multiple
        // marriages, create a dummy root node.
        // After layout is complete, the dummy node will be removed.
        if (nodes.length > 1) {
            var dummyNode_1 = {
                id: exports.DUMMY_ROOT_NODE_ID,
                height: 1,
                width: 1,
            };
            parents.push(dummyNode_1);
            nodes.forEach(function (node) { return (node.parentId = dummyNode_1.id); });
        }
        parents.push.apply(parents, nodes);
        var stack = [];
        nodes.forEach(function (node) {
            if (node.family) {
                stack.push(node);
            }
        });
        var _loop_1 = function () {
            var entry = stack.pop();
            var fam = this_1.options.data.getFam(entry.family.id);
            var children = fam.getChildren();
            children.forEach(function (childId) {
                var childNodes = _this.getNodes(childId);
                childNodes.forEach(function (node) {
                    node.parentId = entry.id;
                    if (node.family) {
                        node.id = "" + idGenerator.getId(node.family.id);
                        stack.push(node);
                    }
                });
                parents.push.apply(parents, childNodes);
            });
        };
        var this_1 = this;
        while (stack.length) {
            _loop_1();
        }
        return d3_hierarchy_1.stratify()(parents);
    };
    /**
     * Renders the tree, calling the provided renderer to draw boxes for
     * individuals.
     */
    DescendantChart.prototype.render = function () {
        var root = this.createHierarchy();
        var nodes = removeDummyNode(this.util.layOutChart(root));
        var animationPromise = this.util.renderChart(nodes);
        var info = chart_util_1.getChartInfo(nodes);
        this.util.updateSvgDimensions(info);
        return Object.assign(info, { animationPromise: animationPromise });
    };
    return DescendantChart;
}());
exports.DescendantChart = DescendantChart;

},{"./chart-util":17,"./id-generator":27,"d3-hierarchy":7}],23:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetailedRenderer = exports.getLength = void 0;
var d3_selection_1 = require("d3-selection");
var _1 = require(".");
var date_format_1 = require("./date-format");
var d3_array_1 = require("d3-array");
require("d3-transition");
var composite_renderer_1 = require("./composite-renderer");
var INDI_MIN_HEIGHT = 58;
var INDI_MIN_WIDTH = 64;
var FAM_MIN_HEIGHT = 10;
var FAM_MIN_WIDTH = 15;
var IMAGE_WIDTH = 70;
/** Minimum box height when an image is present. */
var IMAGE_HEIGHT = 90;
var ANIMATION_DELAY_MS = 200;
var ANIMATION_DURATION_MS = 500;
var textLengthCache = new Map();
/** Calculates the length of the given text in pixels when rendered. */
function getLength(text, textClass) {
    var cacheKey = text + "|" + textClass;
    if (textLengthCache.has(cacheKey)) {
        return textLengthCache.get(cacheKey);
    }
    var g = d3_selection_1.select('svg').append('g').attr('class', 'detailed node');
    var x = g.append('text').attr('class', textClass).text(text);
    var length = x.node().getComputedTextLength();
    g.remove();
    textLengthCache.set(cacheKey, length);
    return length;
}
exports.getLength = getLength;
var SEX_SYMBOLS = new Map([
    ['F', '\u2640'],
    ['M', '\u2642'],
]);
/**
 * Renders some details about a person such as date and place of birth
 * and death.
 */
var DetailedRenderer = /** @class */ (function (_super) {
    __extends(DetailedRenderer, _super);
    function DetailedRenderer(options) {
        var _this = _super.call(this, options) || this;
        _this.options = options;
        return _this;
    }
    DetailedRenderer.prototype.getColoringClass = function () {
        switch (this.options.colors) {
            case _1.ChartColors.NO_COLOR:
                return 'nocolor';
            case _1.ChartColors.COLOR_BY_SEX:
                return 'bysex';
            default:
                return 'bygeneration';
        }
    };
    /** Extracts lines of details for a person. */
    DetailedRenderer.prototype.getIndiDetails = function (indi) {
        var detailsList = [];
        var birthDate = indi.getBirthDate() &&
            date_format_1.formatDateOrRange(indi.getBirthDate(), this.options.locale);
        var birthPlace = indi.getBirthPlace();
        var deathDate = indi.getDeathDate() &&
            date_format_1.formatDateOrRange(indi.getDeathDate(), this.options.locale);
        var deathPlace = indi.getDeathPlace();
        if (birthDate) {
            detailsList.push({ symbol: '', text: birthDate });
        }
        if (birthPlace) {
            detailsList.push({ symbol: '', text: birthPlace });
        }
        if (birthDate || birthPlace) {
            detailsList[0].symbol = '*';
        }
        var listIndex = detailsList.length;
        if (deathDate) {
            detailsList.push({ symbol: '', text: deathDate });
        }
        if (deathPlace) {
            detailsList.push({ symbol: '', text: deathPlace });
        }
        if (deathDate || deathPlace) {
            detailsList[listIndex].symbol = '+';
        }
        else if (indi.isConfirmedDeath()) {
            detailsList.push({ symbol: '+', text: '' });
        }
        return detailsList;
    };
    /** Extracts lines of details for a family. */
    DetailedRenderer.prototype.getFamDetails = function (fam) {
        var detailsList = [];
        var marriageDate = fam.getMarriageDate() &&
            date_format_1.formatDateOrRange(fam.getMarriageDate(), this.options.locale);
        var marriagePlace = fam.getMarriagePlace();
        if (marriageDate) {
            detailsList.push({ symbol: '', text: marriageDate });
        }
        if (marriagePlace) {
            detailsList.push({ symbol: '', text: marriagePlace });
        }
        if (marriageDate || marriagePlace) {
            detailsList[0].symbol = '\u26AD';
        }
        return detailsList;
    };
    DetailedRenderer.prototype.getPreferredIndiSize = function (id) {
        var indi = this.options.data.getIndi(id);
        var details = this.getIndiDetails(indi);
        var height = d3_array_1.max([
            INDI_MIN_HEIGHT + details.length * 14,
            indi.getImageUrl() ? IMAGE_HEIGHT : 0,
        ]);
        var maxDetailsWidth = d3_array_1.max(details.map(function (x) { return getLength(x.text, 'details'); }));
        var width = d3_array_1.max([
            maxDetailsWidth + 22,
            getLength(indi.getFirstName() || '', 'name') + 8,
            getLength(indi.getLastName() || '', 'name') + 8,
            getLength(id, 'id') + 32,
            INDI_MIN_WIDTH,
        ]) + (indi.getImageUrl() ? IMAGE_WIDTH : 0);
        return [width, height];
    };
    DetailedRenderer.prototype.getPreferredFamSize = function (id) {
        var fam = this.options.data.getFam(id);
        var details = this.getFamDetails(fam);
        var height = d3_array_1.max([10 + details.length * 14, FAM_MIN_HEIGHT]);
        var maxDetailsWidth = d3_array_1.max(details.map(function (x) { return getLength(x.text, 'details'); }));
        var width = d3_array_1.max([maxDetailsWidth + 22, FAM_MIN_WIDTH]);
        return [width, height];
    };
    DetailedRenderer.prototype.render = function (enter, update) {
        var _this = this;
        enter = enter.append('g').attr('class', 'detailed');
        update = update.select('g');
        var indiUpdate = enter
            .merge(update)
            .selectAll('g.indi')
            .data(function (node) {
            var result = [];
            var famXOffset = !_this.options.horizontal && node.data.family
                ? d3_array_1.max([-composite_renderer_1.getFamPositionVertical(node.data), 0])
                : 0;
            var famYOffset = _this.options.horizontal && node.data.family
                ? d3_array_1.max([-composite_renderer_1.getFamPositionHorizontal(node.data), 0])
                : 0;
            if (node.data.indi) {
                result.push({
                    indi: node.data.indi,
                    generation: node.data.generation,
                    xOffset: famXOffset,
                    yOffset: 0,
                });
            }
            if (node.data.spouse) {
                result.push({
                    indi: node.data.spouse,
                    generation: node.data.generation,
                    xOffset: !_this.options.horizontal && node.data.indi
                        ? node.data.indi.width + famXOffset
                        : 0,
                    yOffset: _this.options.horizontal && node.data.indi
                        ? node.data.indi.height + famYOffset
                        : 0,
                });
            }
            return result;
        }, function (data) { return data.indi.id; });
        var indiEnter = indiUpdate
            .enter()
            .append('g')
            .attr('class', 'indi');
        this.transition(indiEnter.merge(indiUpdate)).attr('transform', function (node) { return "translate(" + node.xOffset + ", " + node.yOffset + ")"; });
        this.renderIndi(indiEnter, indiUpdate);
        var familyEnter = enter
            .select(function (node) {
            return node.data.family ? this : null;
        })
            .append('g')
            .attr('class', 'family');
        var familyUpdate = update
            .select(function (node) {
            return node.data.family ? this : null;
        })
            .select('g.family');
        this.transition(familyEnter.merge(familyUpdate)).attr('transform', function (node) {
            return _this.getFamTransform(node.data);
        });
        this.renderFamily(familyEnter, familyUpdate);
    };
    DetailedRenderer.prototype.getCss = function () {
        return "\n.detailed text {\n  font-family: verdana, arial, sans-serif;\n  font-size: 12px;\n}\n\n.detailed .name {\n  font-weight: bold;\n}\n\n.link {\n  fill: none;\n  stroke: #000;\n  stroke-width: 1px;\n}\n\n.additional-marriage {\n  stroke-dasharray: 2;\n}\n\n.detailed rect {\n  stroke: black;\n}\n\n.detailed {\n  stroke-width: 2px;\n}\n\n.detailed .details {\n  font-size: 10px;\n}\n\n.detailed .id {\n  font-size: 10px;\n  font-style: italic;\n}\n\n.detailed rect.nocolor {\n  fill: #ffffff;\n}\n\n.detailed rect.bysex {\n  fill: #eeeeee;\n}\n\n.detailed rect.bysex.male {\n  fill: #dbffff;\n}\n\n.detailed rect.bysex.female {\n  fill: #ffdbed;\n}\n\n.detailed rect.bygeneration {\n  fill: #ffffdd;\n}\n\n.generation-11 .detailed rect.bygeneration, .generation1 .detailed rect.bygeneration {\n  fill: #edffdb;\n}\n\n.generation-10 .detailed rect.bygeneration, .generation2 .detailed rect.bygeneration {\n  fill: #dbffdb;\n}\n\n.generation-9 .detailed rect.bygeneration, .generation3 .detailed rect.bygeneration {\n  fill: #dbffed;\n}\n\n.generation-8 .detailed rect.bygeneration, .generation4 .detailed rect.bygeneration {\n  fill: #dbffff;\n}\n\n.generation-7 .detailed rect.bygeneration, .generation5 .detailed rect.bygeneration {\n  fill: #dbedff;\n}\n\n.generation-6 .detailed rect.bygeneration, .generation6 .detailed rect.bygeneration {\n  fill: #dbdbff;\n}\n\n.generation-5 .detailed rect.bygeneration, .generation7 .detailed rect.bygeneration {\n  fill: #eddbff;\n}\n\n.generation-4 .detailed rect.bygeneration, .generation8 .detailed rect.bygeneration {\n  fill: #ffdbff;\n}\n\n.generation-3 .detailed rect.bygeneration, .generation9 .detailed rect.bygeneration {\n  fill: #ffdbed;\n}\n\n.generation-2 .detailed rect.bygeneration, .generation10 .detailed rect.bygeneration {\n  fill: #ffdbdb;\n}\n\n.generation-1 .detailed rect.bygeneration, .generation11 .detailed rect.bygeneration {\n  fill: #ffeddb;\n}";
    };
    DetailedRenderer.prototype.transition = function (selection) {
        return this.options.animate
            ? selection
                .transition()
                .delay(ANIMATION_DELAY_MS)
                .duration(ANIMATION_DURATION_MS)
            : selection;
    };
    DetailedRenderer.prototype.getFamTransform = function (node) {
        if (this.options.horizontal) {
            return "translate(" + ((node.indi && node.indi.width) || node.spouse.width) + ", " + d3_array_1.max([composite_renderer_1.getFamPositionHorizontal(node), 0]) + ")";
        }
        return "translate(" + d3_array_1.max([composite_renderer_1.getFamPositionVertical(node), 0]) + ", " + ((node.indi && node.indi.height) || node.spouse.height) + ")";
    };
    DetailedRenderer.prototype.getSexClass = function (indiId) {
        var _a;
        var sex = (_a = this.options.data.getIndi(indiId)) === null || _a === void 0 ? void 0 : _a.getSex();
        switch (sex) {
            case 'M':
                return 'male';
            case 'F':
                return 'female';
            default:
                return '';
        }
    };
    DetailedRenderer.prototype.renderIndi = function (enter, update) {
        var _this = this;
        if (this.options.indiHrefFunc) {
            enter = enter
                .append('a')
                .attr('href', function (data) { return _this.options.indiHrefFunc(data.indi.id); });
            update = update.select('a');
        }
        if (this.options.indiCallback) {
            enter.on('click', function (event, data) {
                return _this.options.indiCallback({
                    id: data.indi.id,
                    generation: data.generation,
                });
            });
        }
        // Background.
        var background = enter
            .append('rect')
            .attr('rx', 5)
            .attr('stroke-width', 0)
            .attr('class', function (node) {
            return "background " + _this.getColoringClass() + " " + _this.getSexClass(node.indi.id);
        })
            .merge(update.select('rect.background'));
        this.transition(background)
            .attr('width', function (node) { return node.indi.width; })
            .attr('height', function (node) { return node.indi.height; });
        // Clip path.
        var getClipId = function (id) { return "clip-" + id; };
        enter
            .append('clipPath')
            .attr('id', function (node) { return getClipId(node.indi.id); })
            .append('rect')
            .attr('rx', 5)
            .merge(update.select('clipPath rect'))
            .attr('width', function (node) { return node.indi.width; })
            .attr('height', function (node) { return node.indi.height; });
        var getIndi = function (data) {
            return _this.options.data.getIndi(data.indi.id);
        };
        var getDetailsWidth = function (data) {
            return data.indi.width - (getIndi(data).getImageUrl() ? IMAGE_WIDTH : 0);
        };
        // Name.
        enter
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('class', 'name')
            .attr('transform', function (node) { return "translate(" + getDetailsWidth(node) / 2 + ", 17)"; })
            .text(function (node) { return getIndi(node).getFirstName(); });
        enter
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('class', 'name')
            .attr('transform', function (node) { return "translate(" + getDetailsWidth(node) / 2 + ", 33)"; })
            .text(function (node) { return getIndi(node).getLastName(); });
        // Extract details.
        var details = new Map();
        enter.each(function (node) {
            var indi = getIndi(node);
            var detailsList = _this.getIndiDetails(indi);
            details.set(node.indi.id, detailsList);
        });
        var maxDetails = d3_array_1.max(Array.from(details.values(), function (v) { return v.length; }));
        var _loop_1 = function (i) {
            var lineGroup = enter.filter(function (data) { return details.get(data.indi.id).length > i; });
            lineGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('class', 'details')
                .attr('transform', "translate(9, " + (49 + i * 14) + ")")
                .text(function (data) { return details.get(data.indi.id)[i].symbol; });
            lineGroup
                .append('text')
                .attr('class', 'details')
                .attr('transform', "translate(15, " + (49 + i * 14) + ")")
                .text(function (data) { return details.get(data.indi.id)[i].text; });
        };
        // Render details.
        for (var i = 0; i < maxDetails; ++i) {
            _loop_1(i);
        }
        // Render id.
        var id = enter
            .append('text')
            .attr('class', 'id')
            .text(function (data) { return (getIndi(data).showId() ? data.indi.id : ''); })
            .merge(update.select('text.id'));
        this.transition(id).attr('transform', function (data) { return "translate(9, " + (data.indi.height - 5) + ")"; });
        // Render sex.
        var sex = enter
            .append('text')
            .attr('class', 'details sex')
            .attr('text-anchor', 'end')
            .text(function (data) { return SEX_SYMBOLS.get(getIndi(data).getSex() || '') || ''; })
            .merge(update.select('text.sex'));
        this.transition(sex).attr('transform', function (data) {
            return "translate(" + (getDetailsWidth(data) - 5) + ", " + (data.indi.height - 5) + ")";
        });
        // Image.
        enter
            .filter(function (data) { return !!getIndi(data).getImageUrl(); })
            .append('image')
            .attr('width', IMAGE_WIDTH)
            .attr('height', function (data) { return data.indi.height; })
            .attr('preserveAspectRatio', 'xMidYMin')
            .attr('transform', function (data) { return "translate(" + (data.indi.width - IMAGE_WIDTH) + ", 0)"; })
            .attr('clip-path', function (data) { return "url(#" + getClipId(data.indi.id) + ")"; })
            .attr('href', function (data) { return getIndi(data).getImageUrl(); });
        // Border on top.
        var border = enter
            .append('rect')
            .attr('rx', 5)
            .attr('fill-opacity', 0)
            .attr('class', 'border')
            .merge(update.select('rect.border'));
        this.transition(border)
            .attr('width', function (data) { return data.indi.width; })
            .attr('height', function (data) { return data.indi.height; });
    };
    DetailedRenderer.prototype.renderFamily = function (enter, update) {
        var _this = this;
        if (this.options.famHrefFunc) {
            enter = enter
                .append('a')
                .attr('href', function (node) {
                return _this.options.famHrefFunc(node.data.family.id);
            });
        }
        if (this.options.famCallback) {
            enter.on('click', function (event, node) {
                return _this.options.famCallback({
                    id: node.data.family.id,
                    generation: node.data.generation,
                });
            });
        }
        // Box.
        enter
            .append('rect')
            .attr('class', this.getColoringClass())
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('width', function (node) { return node.data.family.width; })
            .attr('height', function (node) { return node.data.family.height; });
        // Extract details.
        var details = new Map();
        enter.each(function (node) {
            var famId = node.data.family.id;
            var fam = _this.options.data.getFam(famId);
            var detailsList = _this.getFamDetails(fam);
            details.set(famId, detailsList);
        });
        var maxDetails = d3_array_1.max(Array.from(details.values(), function (v) { return v.length; }));
        var _loop_2 = function (i) {
            var lineGroup = enter.filter(function (node) { return details.get(node.data.family.id).length > i; });
            lineGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('class', 'details')
                .attr('transform', "translate(9, " + (16 + i * 14) + ")")
                .text(function (node) { return details.get(node.data.family.id)[i].symbol; });
            lineGroup
                .append('text')
                .attr('text-anchor', 'start')
                .attr('class', 'details')
                .attr('transform', "translate(15, " + (16 + i * 14) + ")")
                .text(function (node) { return details.get(node.data.family.id)[i].text; });
        };
        // Render details.
        for (var i = 0; i < maxDetails; ++i) {
            _loop_2(i);
        }
    };
    return DetailedRenderer;
}(composite_renderer_1.CompositeRenderer));
exports.DetailedRenderer = DetailedRenderer;

},{".":28,"./composite-renderer":19,"./date-format":21,"d3-array":2,"d3-selection":9,"d3-transition":11}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FancyChart = void 0;
var d3_array_1 = require("d3-array");
var chart_util_1 = require("./chart-util");
var descendant_chart_1 = require("./descendant-chart");
/** Returns an SVG line definition for a tree branch between two points. */
function branch(x1, y1, x2, y2) {
    var yMid = y2 + 110;
    if (x2 > x1 + 100) {
        return "\n      M " + (x1 + 10) + "       " + y1 + "\n      C " + (x1 + 10) + "       " + (yMid + 25) + "\n        " + (x1 + 45) + "       " + (yMid + 10) + "\n        " + (x1 + x2) / 2 + " " + (yMid + 5) + "\n        " + (x2 - 45) + "       " + yMid + "\n        " + (x2 + 2) + "        " + (yMid - 25) + "\n        " + (x2 + 2) + "        " + y2 + "\n      L " + (x2 - 2) + "        " + y2 + "\n      C " + (x2 - 2) + "        " + (yMid - 25) + "\n        " + (x2 - 45) + "       " + (yMid - 10) + "\n        " + (x1 + x2) / 2 + " " + (yMid - 5) + "\n        " + (x1 + 45) + "       " + yMid + "\n        " + (x1 - 10) + "       " + (yMid + 25) + "\n        " + (x1 - 10) + "       " + y1;
    }
    if (x2 < x1 - 100) {
        return "\n      M " + (x1 - 10) + "       " + y1 + "\n      C " + (x1 - 10) + "       " + (yMid + 25) + "\n        " + (x1 - 45) + "       " + (yMid + 10) + "\n        " + (x1 + x2) / 2 + " " + (yMid + 5) + "\n        " + (x2 + 45) + "       " + yMid + "\n        " + (x2 - 2) + "        " + (yMid - 25) + "\n        " + (x2 - 2) + "        " + y2 + "\n      L " + (x2 + 2) + "        " + y2 + "\n      C " + (x2 + 2) + "        " + (yMid - 25) + "\n        " + (x2 + 45) + "       " + (yMid - 10) + "\n        " + (x1 + x2) / 2 + " " + (yMid - 5) + "\n        " + (x1 - 45) + "       " + yMid + "\n        " + (x1 + 10) + "       " + (yMid + 25) + "\n        " + (x1 + 10) + "       " + y1;
    }
    return "\n    M " + (x1 + 10) + "       " + y1 + "\n    C " + (x1 + 10) + "       " + (yMid + 25) + "\n      " + (x2 + 2) + "        " + (yMid - 25) + "\n      " + (x2 + 2) + "        " + y2 + "\n    L " + (x2 - 2) + "        " + y2 + "\n    C " + (x2 - 2) + "        " + (yMid - 25) + "\n      " + (x1 - 10) + "       " + (yMid + 25) + "\n      " + (x1 - 10) + "       " + y1;
}
/** Renders a fancy descendants tree chart. */
var FancyChart = /** @class */ (function () {
    function FancyChart(options) {
        this.options = options;
        this.util = new chart_util_1.ChartUtil(options);
    }
    /** Creates a path from parent to the child node (vertical layout). */
    FancyChart.prototype.linkVertical = function (s, d) {
        var sAnchor = this.options.renderer.getFamilyAnchor(s.data);
        var dAnchor = s.id === d.data.spouseParentNodeId
            ? this.options.renderer.getSpouseAnchor(d.data)
            : this.options.renderer.getIndiAnchor(d.data);
        var _a = [s.x + sAnchor[0], s.y + sAnchor[1]], sx = _a[0], sy = _a[1];
        var _b = [d.x + dAnchor[0], d.y + dAnchor[1]], dx = _b[0], dy = _b[1];
        return branch(dx, dy, sx, sy);
    };
    FancyChart.prototype.linkAdditionalMarriage = function (node) {
        var nodeIndex = node.parent.children.findIndex(function (n) { return n.id === node.id; });
        // Assert nodeIndex > 0.
        var siblingNode = node.parent.children[nodeIndex - 1];
        var sAnchor = this.options.renderer.getIndiAnchor(node.data);
        var dAnchor = this.options.renderer.getIndiAnchor(siblingNode.data);
        var _a = [node.x + sAnchor[0], node.y + sAnchor[1]], sx = _a[0], sy = _a[1];
        var _b = [siblingNode.x + dAnchor[0], siblingNode.y + dAnchor[1]], dx = _b[0], dy = _b[1];
        return "M " + sx + ", " + (sy + 2) + "\n              L " + dx + ", " + (dy + 10) + "\n              " + dx + ", " + (dy - 10) + "\n              " + sx + ", " + (sy - 2);
    };
    FancyChart.prototype.renderBackground = function (chartInfo, svg) {
        svg
            .select('g')
            .append('rect')
            .attr('x', -chartInfo.origin[0])
            .attr('y', -chartInfo.origin[1])
            .attr('width', chartInfo.size[0])
            .attr('height', chartInfo.origin[1])
            .attr('fill', '#cff');
        svg
            .select('g')
            .append('rect')
            .attr('x', -chartInfo.origin[0])
            .attr('y', 0)
            .attr('width', chartInfo.size[0])
            .attr('height', chartInfo.size[1] - chartInfo.origin[1])
            .attr('fill', '#494');
    };
    FancyChart.prototype.renderLeaves = function (nodes, svg) {
        var gradient = svg
            .select('g')
            .append('radialGradient')
            .attr('id', 'gradient');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', '#8f8');
        gradient
            .append('stop')
            .attr('offset', '80%')
            .attr('stop-color', '#8f8')
            .attr('stop-opacity', 0.5);
        gradient
            .append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#8f8')
            .attr('stop-opacity', 0);
        var backgroundNodes = nodes.filter(function (n) { return n.parent && n.parent.id !== descendant_chart_1.DUMMY_ROOT_NODE_ID; });
        var minGeneration = d3_array_1.min(backgroundNodes, function (node) { return node.data.generation; }) || 0;
        var sizeFunction = function (node) {
            return 280 - 180 / Math.sqrt(1 + node.data.generation - minGeneration);
        };
        {
            var boundNodes = svg
                .select('g')
                .selectAll('g.background')
                .data(backgroundNodes, function (d) { return d.id; });
            var enter = boundNodes.enter().append('g');
            enter
                .merge(boundNodes)
                .attr('class', 'background')
                .attr('transform', function (node) {
                return "translate(" + (node.x - node.data.width / 2) + ", " + (node.y - node.data.height / 2) + ")";
            });
            var background = enter.append('g').attr('class', 'background');
            background
                .append('circle')
                .attr('class', 'background')
                .attr('r', sizeFunction)
                .attr('cx', function (node) { return node.data.width / 2; })
                .attr('cy', function (node) { return node.data.height / 2; })
                .style('fill', '#493');
        }
        {
            var boundNodes = svg
                .select('g')
                .selectAll('g.background2')
                .data(backgroundNodes, function (d) { return d.id; });
            var enter = boundNodes.enter().append('g');
            enter
                .merge(boundNodes)
                .attr('class', 'background2')
                .attr('transform', function (node) {
                return "translate(" + (node.x - node.data.width / 2) + ", " + (node.y - node.data.height / 2) + ")";
            });
            var background = enter.append('g').attr('class', 'background2');
            background
                .append('circle')
                .attr('class', 'background')
                .attr('r', sizeFunction)
                .attr('cx', function (node) { return node.data.width / 2; })
                .attr('cy', function (node) { return node.data.height / 2; })
                .style('fill', 'url(#gradient)');
        }
    };
    FancyChart.prototype.renderLinks = function (nodes, svg) {
        var _this = this;
        var link = function (parent, child) {
            if (child.data.additionalMarriage) {
                return _this.linkAdditionalMarriage(child);
            }
            return _this.linkVertical(child, parent);
        };
        var links = nodes.filter(function (n) { return !!n.parent; });
        svg
            .select('g')
            .selectAll('path.branch')
            .data(links, chart_util_1.linkId)
            .enter()
            .append('path')
            .attr('class', function (node) {
            return node.data.additionalMarriage ? 'branch additional-marriage' : 'branch';
        })
            .attr('d', function (node) { return link(node.parent, node); });
    };
    FancyChart.prototype.renderTreeTrunk = function (nodes, svg) {
        var trunkNodes = nodes.filter(function (n) { return !n.parent || n.parent.id === descendant_chart_1.DUMMY_ROOT_NODE_ID; });
        svg
            .select('g')
            .selectAll('g.trunk')
            .data(trunkNodes, function (d) { return d.id; })
            .enter()
            .append('g')
            .attr('class', 'trunk')
            .attr('transform', function (node) { return "translate(" + node.x + ", " + node.y + ")"; })
            .append('path')
            .attr('d', "\n          M 10 20\n          L 10 40\n          C 10 60 10 90 40 90\n          L -40 90\n          C -10 90 -10 60 -10 40\n          L -10 20");
    };
    FancyChart.prototype.render = function () {
        var nodes = descendant_chart_1.layOutDescendants(this.options, {
            flipVertically: true,
            vSpacing: 100,
        });
        var info = chart_util_1.getChartInfo(nodes);
        info.origin[0] += 150;
        info.origin[1] += 150;
        info.size[0] += 300;
        info.size[1] += 250;
        var svg = this.util.getSvgForRendering();
        svg.append('style').text("\n      .branch, .trunk {\n        fill: #632;\n        stroke: #632;\n      }");
        this.renderBackground(info, svg);
        this.renderLeaves(nodes, svg);
        this.renderLinks(nodes, svg);
        this.renderTreeTrunk(nodes, svg);
        this.util.renderNodes(nodes, svg);
        this.util.updateSvgDimensions(info);
        return Object.assign(info, { animationPromise: Promise.resolve() });
    };
    return FancyChart;
}());
exports.FancyChart = FancyChart;

},{"./chart-util":17,"./descendant-chart":22,"d3-array":2}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gedcomEntriesToJson = exports.gedcomToJson = exports.getDate = void 0;
var parse_gedcom_1 = require("parse-gedcom");
/** Returns the first entry with the given tag or undefined if not found. */
function findTag(tree, tag) {
    return tree.find(function (entry) { return entry.tag === tag; });
}
/** Returns all entries with the given tag. */
function findTags(tree, tag) {
    return tree.filter(function (entry) { return entry.tag === tag; });
}
/**
 * Returns the identifier extracted from a pointer string.
 * E.g. '@I123@' -> 'I123'
 */
function pointerToId(pointer) {
    return pointer.substring(1, pointer.length - 1);
}
/** Extracts the first and last name from a GEDCOM name field. */
function extractName(name) {
    var arr = name.split('/');
    if (arr.length === 1) {
        return { firstName: arr[0].trim() };
    }
    return { firstName: arr[0].trim(), lastName: arr[1].trim() };
}
/** Maps month abbreviations used in GEDCOM to month numbers. */
var MONTHS = new Map([
    ['jan', 1],
    ['feb', 2],
    ['mar', 3],
    ['apr', 4],
    ['may', 5],
    ['jun', 6],
    ['jul', 7],
    ['aug', 8],
    ['sep', 9],
    ['oct', 10],
    ['nov', 11],
    ['dec', 12],
]);
/** Parses the GEDCOM date into the Date structure. */
function parseDate(parts) {
    if (!parts || !parts.length) {
        return undefined;
    }
    var result = {};
    var firstPart = parts[0].toLowerCase();
    if (firstPart.startsWith('(') && parts[parts.length - 1].endsWith(')')) {
        result.text = parts.join(' ');
        result.text = result.text.substring(1, result.text.length - 1);
        return result;
    }
    if (firstPart === 'cal' || firstPart === 'abt' || firstPart === 'est') {
        result.qualifier = firstPart;
        parts = parts.slice(1);
    }
    if (parts.length && parts[parts.length - 1].match(/^\d{1,4}$/)) {
        result.year = Number(parts[parts.length - 1]);
        parts = parts.slice(0, parts.length - 1);
    }
    if (parts.length) {
        var lastPart = parts[parts.length - 1].toLowerCase();
        if (MONTHS.has(lastPart)) {
            result.month = MONTHS.get(lastPart);
            parts = parts.slice(0, parts.length - 1);
        }
    }
    if (parts.length && parts[0].match(/^\d\d?$/)) {
        result.day = Number(parts[0]);
    }
    return result;
}
/** Parses a GEDCOM date or date range. */
function getDate(gedcomDate) {
    var parts = gedcomDate.replace(/@.*@/, '').trim().split(' ');
    var firstPart = parts[0].toLowerCase();
    if (firstPart.startsWith('bet')) {
        var i = parts.findIndex(function (x) { return x.toLowerCase() === 'and'; });
        var from = parseDate(parts.slice(1, i));
        var to = parseDate(parts.slice(i + 1));
        return { dateRange: { from: from, to: to } };
    }
    if (firstPart.startsWith('bef') || firstPart.startsWith('aft')) {
        var date_1 = parseDate(parts.slice(1));
        if (firstPart.startsWith('bef')) {
            return { dateRange: { to: date_1 } };
        }
        return { dateRange: { from: date_1 } };
    }
    var date = parseDate(parts);
    if (date) {
        return { date: date };
    }
    return undefined;
}
exports.getDate = getDate;
/**
 * tries to treat an input tag as NOTE and parsse all lines of notes
 */
function createNotes(notesTag) {
    if (!notesTag || notesTag.tag !== 'NOTE')
        return undefined;
    return findTags(notesTag.tree, 'CONT')
        .filter(function (x) { return x.data; })
        .reduce(function (a, i) { return a.concat(i.data); }, [notesTag.data]);
}
/**
 * Creates a JsonEvent object from a GEDCOM entry.
 * Used for BIRT, DEAT and MARR tags.
 */
function createEvent(entry) {
    if (!entry) {
        return undefined;
    }
    var typeTag = findTag(entry.tree, 'TYPE');
    var dateTag = findTag(entry.tree, 'DATE');
    var placeTag = findTag(entry.tree, 'PLAC');
    var date = dateTag && dateTag.data && getDate(dateTag.data);
    var place = placeTag && placeTag.data;
    if (date || place) {
        var result = date || {};
        if (place) {
            result.place = place;
        }
        result.confirmed = true;
        result.type = typeTag ? typeTag.data : undefined;
        result.notes = createNotes(findTag(entry.tree, 'NOTE'));
        return result;
    }
    if (entry.data && entry.data.toLowerCase() === 'y') {
        return { confirmed: true };
    }
    return undefined;
}
/** Creates a JsonIndi object from an INDI entry in GEDCOM. */
function createIndi(entry, objects) {
    var id = pointerToId(entry.pointer);
    var fams = findTags(entry.tree, 'FAMS').map(function (entry) {
        return pointerToId(entry.data);
    });
    var indi = { id: id, fams: fams };
    // Name.
    var nameTags = findTags(entry.tree, 'NAME');
    var isMaiden = function (nameTag) {
        var type = findTag(nameTag.tree, 'TYPE');
        return type !== undefined && type.data === 'maiden';
    };
    var main = nameTags.find(function (x) { return !isMaiden(x); });
    var maiden = nameTags.find(isMaiden);
    if (main) {
        var _a = extractName(main.data), firstName = _a.firstName, lastName = _a.lastName;
        if (firstName) {
            indi.firstName = firstName;
        }
        if (lastName) {
            indi.lastName = lastName;
        }
    }
    if (maiden) {
        var _b = extractName(maiden.data), firstName = _b.firstName, lastName = _b.lastName;
        if (lastName) {
            indi.maidenName = lastName;
        }
        if (firstName && !indi.firstName) {
            indi.firstName = firstName;
        }
    }
    // Number of children.
    var nchiTag = findTag(entry.tree, 'NCHI');
    if (nchiTag) {
        indi.numberOfChildren = +nchiTag.data;
    }
    // Number of marriages.
    var nmrTag = findTag(entry.tree, 'NMR');
    if (nmrTag) {
        indi.numberOfMarriages = +nmrTag.data;
    }
    // Sex.
    var sexTag = findTag(entry.tree, 'SEX');
    if (sexTag) {
        indi.sex = sexTag.data;
    }
    // Family with parents.
    var famcTag = findTag(entry.tree, 'FAMC');
    if (famcTag) {
        indi.famc = pointerToId(famcTag.data);
    }
    // Image URL.
    var objeTags = findTags(entry.tree, 'OBJE');
    if (objeTags.length > 0) {
        // Dereference OBJEct if needed.
        var getFileTag = function (tag) {
            var realObjeTag = tag.data ? objects.get(pointerToId(tag.data)) : tag;
            if (!realObjeTag)
                return undefined;
            var file = findTag(realObjeTag.tree, 'FILE');
            var title = findTag(realObjeTag.tree, 'TITL');
            if (!file)
                return undefined;
            return {
                url: file.data,
                title: title && title.data,
            };
        };
        indi.images = objeTags
            .map(getFileTag)
            .filter(function (x) { return x !== undefined; });
    }
    // Birth date and place.
    var birth = createEvent(findTag(entry.tree, 'BIRT'));
    if (birth) {
        indi.birth = birth;
    }
    // Death date and place.
    var death = createEvent(findTag(entry.tree, 'DEAT'));
    if (death) {
        indi.death = death;
    }
    // Notes.
    indi.notes = createNotes(findTag(entry.tree, 'NOTE'));
    // Events
    indi.events = findTags(entry.tree, 'EVEN')
        .map(createEvent)
        .filter(function (x) { return x !== null; });
    return indi;
}
/** Creates a JsonFam object from an FAM entry in GEDCOM. */
function createFam(entry) {
    var id = pointerToId(entry.pointer);
    var children = findTags(entry.tree, 'CHIL').map(function (entry) {
        return pointerToId(entry.data);
    });
    var fam = { id: id, children: children };
    // Husband.
    var husbTag = findTag(entry.tree, 'HUSB');
    if (husbTag) {
        fam.husb = pointerToId(husbTag.data);
    }
    // Wife.
    var wifeTag = findTag(entry.tree, 'WIFE');
    if (wifeTag) {
        fam.wife = pointerToId(wifeTag.data);
    }
    // Marriage
    var marriage = createEvent(findTag(entry.tree, 'MARR'));
    if (marriage) {
        fam.marriage = marriage;
    }
    return fam;
}
/** Creates a map from ID to entry from an array of entries. */
function createMap(entries) {
    return new Map(entries.map(function (entry) { return [pointerToId(entry.pointer), entry]; }));
}
/** Parses a GEDCOM file into a JsonGedcomData structure. */
function gedcomToJson(gedcomContents) {
    return gedcomEntriesToJson(parse_gedcom_1.parse(gedcomContents));
}
exports.gedcomToJson = gedcomToJson;
/** Converts parsed GEDCOM entries into a JsonGedcomData structure. */
function gedcomEntriesToJson(gedcom) {
    var objects = createMap(findTags(gedcom, 'OBJE'));
    var indis = findTags(gedcom, 'INDI').map(function (entry) {
        return createIndi(entry, objects);
    });
    var fams = findTags(gedcom, 'FAM').map(createFam);
    return { indis: indis, fams: fams };
}
exports.gedcomEntriesToJson = gedcomEntriesToJson;

},{"parse-gedcom":13}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HourglassChart = void 0;
var ancestor_chart_1 = require("./ancestor-chart");
var chart_util_1 = require("./chart-util");
var descendant_chart_1 = require("./descendant-chart");
/**
 * Renders an hourglass chart. It consists of an ancestor chart and
 * a descendant chart for a family.
 */
var HourglassChart = /** @class */ (function () {
    function HourglassChart(options) {
        this.options = options;
        this.util = new chart_util_1.ChartUtil(options);
    }
    HourglassChart.prototype.render = function () {
        var ancestorsRoot = ancestor_chart_1.getAncestorsTree(this.options);
        var ancestorNodes = this.util.layOutChart(ancestorsRoot, {
            flipVertically: true,
        });
        var descendantNodes = descendant_chart_1.layOutDescendants(this.options);
        // slice(1) removes the duplicated start node.
        var nodes = ancestorNodes.slice(1).concat(descendantNodes);
        var animationPromise = this.util.renderChart(nodes);
        var info = chart_util_1.getChartInfo(nodes);
        this.util.updateSvgDimensions(info);
        return Object.assign(info, { animationPromise: animationPromise });
    };
    return HourglassChart;
}());
exports.HourglassChart = HourglassChart;

},{"./ancestor-chart":15,"./chart-util":17,"./descendant-chart":22}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdGenerator = void 0;
/** Provides unique identifiers. */
var IdGenerator = /** @class */ (function () {
    function IdGenerator() {
        this.ids = new Map();
    }
    /**
     * Returns the given identifier if it wasn't used before. Otherwise, appends
     * a number to the given identifier to make it unique.
     */
    IdGenerator.prototype.getId = function (id) {
        if (this.ids.has(id)) {
            var num = this.ids.get(id);
            this.ids.set(id, num + 1);
            return id + ":" + num;
        }
        this.ids.set(id, 1);
        return id;
    };
    return IdGenerator;
}());
exports.IdGenerator = IdGenerator;

},{}],28:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
require("array-flat-polyfill");
__exportStar(require("./ancestor-chart"), exports);
__exportStar(require("./api"), exports);
__exportStar(require("./chart-util"), exports);
__exportStar(require("./circle-renderer"), exports);
__exportStar(require("./composite-renderer"), exports);
__exportStar(require("./data"), exports);
__exportStar(require("./date-format"), exports);
__exportStar(require("./fancy-chart"), exports);
__exportStar(require("./descendant-chart"), exports);
__exportStar(require("./detailed-renderer"), exports);
__exportStar(require("./gedcom"), exports);
__exportStar(require("./hourglass-chart"), exports);
__exportStar(require("./kinship-chart"), exports);
__exportStar(require("./relatives-chart"), exports);
__exportStar(require("./simple-api"), exports);
__exportStar(require("./simple-renderer"), exports);

},{"./ancestor-chart":15,"./api":16,"./chart-util":17,"./circle-renderer":18,"./composite-renderer":19,"./data":20,"./date-format":21,"./descendant-chart":22,"./detailed-renderer":23,"./fancy-chart":24,"./gedcom":25,"./hourglass-chart":26,"./kinship-chart":29,"./relatives-chart":34,"./simple-api":35,"./simple-renderer":36,"array-flat-polyfill":1}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KinshipChart = void 0;
var renderer_1 = require("./kinship/renderer");
var hierarchy_creator_1 = require("./kinship/hierarchy-creator");
var KinshipChart = /** @class */ (function () {
    function KinshipChart(options) {
        this.options = options;
        this.renderer = new renderer_1.KinshipChartRenderer(this.options);
    }
    KinshipChart.prototype.render = function () {
        var _this = this;
        var hierarchy = hierarchy_creator_1.HierarchyCreator.createHierarchy(this.options.data, new hierarchy_creator_1.EntryId(this.options.startIndi || null, this.options.startFam || null));
        var _a = this.renderer.layOut(hierarchy.upRoot, hierarchy.downRoot), upNodes = _a[0], downNodes = _a[1];
        upNodes.concat(downNodes).forEach(function (node) {
            _this.setChildNodesGenerationNumber(node);
        });
        return this.renderer.render(upNodes, downNodes, hierarchy_creator_1.getRootsCount(hierarchy.upRoot, this.options.data));
    };
    KinshipChart.prototype.setChildNodesGenerationNumber = function (node) {
        var childNodes = this.getChildNodesByType(node);
        var setGenerationNumber = function (childNodes, value) {
            return childNodes.forEach(function (n) { return (n.data.generation = node.data.generation + value); });
        };
        setGenerationNumber(childNodes.indiParents, -1);
        setGenerationNumber(childNodes.indiSiblings, 0);
        setGenerationNumber(childNodes.spouseParents, -1);
        setGenerationNumber(childNodes.spouseSiblings, 0);
        setGenerationNumber(childNodes.children, 1);
    };
    KinshipChart.prototype.getChildNodesByType = function (node) {
        if (!node || !node.children)
            return EMPTY_HIERARCHY_TREE_NODES;
        // Maps id to node object for all children of the input node
        var childNodesById = new Map(node.children.map(function (n) { return [n.data.id, n]; }));
        var nodeToHNode = function (n) {
            return childNodesById.get(n.id);
        };
        var childNodes = node.data.childNodes;
        return {
            indiParents: childNodes.indiParents.map(nodeToHNode),
            indiSiblings: childNodes.indiSiblings.map(nodeToHNode),
            spouseParents: childNodes.spouseParents.map(nodeToHNode),
            spouseSiblings: childNodes.spouseSiblings.map(nodeToHNode),
            children: childNodes.children.map(nodeToHNode),
        };
    };
    return KinshipChart;
}());
exports.KinshipChart = KinshipChart;
var EMPTY_HIERARCHY_TREE_NODES = {
    indiParents: [],
    indiSiblings: [],
    spouseParents: [],
    spouseSiblings: [],
    children: [],
};

},{"./kinship/hierarchy-creator":31,"./kinship/renderer":33}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otherSideLinkType = exports.LinkType = exports.ChildNodes = void 0;
var ChildNodes = /** @class */ (function () {
    function ChildNodes(overrides) {
        if (overrides === void 0) { overrides = {}; }
        this.indiParents = [];
        this.indiSiblings = [];
        this.spouseParents = [];
        this.spouseSiblings = [];
        this.children = [];
        Object.assign(this, overrides);
    }
    ChildNodes.prototype.get = function (type) {
        switch (type) {
            case LinkType.IndiParents:
                return this.indiParents;
            case LinkType.IndiSiblings:
                return this.indiSiblings;
            case LinkType.SpouseParents:
                return this.spouseParents;
            case LinkType.SpouseSiblings:
                return this.spouseSiblings;
            case LinkType.Children:
                return this.children;
        }
    };
    ChildNodes.prototype.getAll = function () {
        return [].concat(this.indiSiblings, this.indiParents, this.children, this.spouseParents, this.spouseSiblings);
    };
    ChildNodes.EMPTY = new ChildNodes();
    return ChildNodes;
}());
exports.ChildNodes = ChildNodes;
var LinkType;
(function (LinkType) {
    LinkType[LinkType["IndiParents"] = 0] = "IndiParents";
    LinkType[LinkType["IndiSiblings"] = 1] = "IndiSiblings";
    LinkType[LinkType["SpouseParents"] = 2] = "SpouseParents";
    LinkType[LinkType["SpouseSiblings"] = 3] = "SpouseSiblings";
    LinkType[LinkType["Children"] = 4] = "Children";
})(LinkType = exports.LinkType || (exports.LinkType = {}));
function otherSideLinkType(type) {
    switch (type) {
        case LinkType.IndiParents:
            return LinkType.Children;
        case LinkType.IndiSiblings:
            return LinkType.IndiSiblings;
        case LinkType.SpouseParents:
            return LinkType.Children;
        case LinkType.SpouseSiblings:
            return LinkType.IndiSiblings;
        case LinkType.Children:
            return LinkType.IndiParents;
    }
}
exports.otherSideLinkType = otherSideLinkType;

},{}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRootsCount = exports.EntryId = exports.HierarchyCreator = void 0;
var api_1 = require("./api");
var d3_hierarchy_1 = require("d3-hierarchy");
var hierarchy_filter_1 = require("./hierarchy-filter");
var id_generator_1 = require("../id-generator");
var utils_1 = require("../utils");
var HierarchyCreator = /** @class */ (function () {
    function HierarchyCreator(data, startEntryId) {
        var _a;
        this.data = data;
        this.queuedNodesById = new Map();
        this.idGenerator = new id_generator_1.IdGenerator();
        _a = this.expandStartId(startEntryId), this.startEntryId = _a[0], this.startFamIndi = _a[1];
    }
    HierarchyCreator.createHierarchy = function (data, startEntryId) {
        return new HierarchyCreator(data, startEntryId).createHierarchy();
    };
    // Convert entry id to values of startEntryId and startFamIndi fields
    HierarchyCreator.prototype.expandStartId = function (startEntryId) {
        if (startEntryId.isFam)
            return [startEntryId, null];
        var indi = this.data.getIndi(startEntryId.id);
        if (!indi)
            throw new Error('Invalid startId');
        var famsIds = indi.getFamiliesAsSpouse();
        if (famsIds.length)
            return [EntryId.fam(famsIds[0]), startEntryId.id];
        return [startEntryId, null];
    };
    HierarchyCreator.prototype.createHierarchy = function () {
        var upRoot = this.idToNode(this.startEntryId, null, null, false);
        var downRoot = this.idToNode(this.startEntryId, null, null, false);
        if (!upRoot || !downRoot)
            throw new Error('Invalid root node');
        if (this.startFamIndi) {
            upRoot.indi = { id: this.startFamIndi };
            downRoot.indi = { id: this.startFamIndi };
        }
        var queue = [upRoot, downRoot];
        while (queue.length) {
            var node = queue.shift();
            var filter = node === upRoot
                ? HierarchyCreator.UP_FILTER
                : node === downRoot
                    ? HierarchyCreator.DOWN_FILTER
                    : HierarchyCreator.ALL_ACCEPTING_FILTER; //TODO: Filter only on root node?
            this.fillNodeData(node, filter);
            for (var _i = 0, _a = node.childNodes.getAll(); _i < _a.length; _i++) {
                var childNode = _a[_i];
                queue.push(childNode);
            }
        }
        var getChildNodes = function (node) {
            var childNodes = node.childNodes.getAll();
            return childNodes.length ? childNodes : null;
        };
        return {
            upRoot: d3_hierarchy_1.hierarchy(upRoot, getChildNodes),
            downRoot: d3_hierarchy_1.hierarchy(downRoot, getChildNodes),
        };
    };
    HierarchyCreator.prototype.fillNodeData = function (node, filter) {
        if (this.isFamNode(node)) {
            var fam = this.data.getFam(node.id);
            var _a = node.indi && node.indi.id === fam.getMother()
                ? [fam.getMother(), fam.getFather()]
                : [fam.getFather(), fam.getMother()], indiId = _a[0], spouseId = _a[1];
            Object.assign(node, {
                id: this.idGenerator.getId(node.id),
                indi: indiId && { id: indiId },
                spouse: spouseId && { id: spouseId },
            });
            if (!node.duplicateOf && !node.duplicated) {
                node.childNodes = this.childNodesForFam(fam, node, filter);
            }
        }
        else {
            var indi = this.data.getIndi(node.id);
            Object.assign(node, {
                id: this.idGenerator.getId(node.id),
                indi: { id: indi.getId() },
            });
            if (!node.duplicateOf && !node.duplicated) {
                node.childNodes = this.childNodesForIndi(indi, node, filter);
            }
        }
        node.linkStubs = this.createLinkStubs(node);
    };
    HierarchyCreator.prototype.childNodesForFam = function (fam, parentNode, filter) {
        var indi = parentNode.indi ? this.data.getIndi(parentNode.indi.id) : null;
        var spouse = parentNode.spouse
            ? this.data.getIndi(parentNode.spouse.id)
            : null;
        var _a = this.getParentsAndSiblings(indi), indiParentsFamsIds = _a[0], indiSiblingsIds = _a[1];
        var _b = this.getParentsAndSiblings(spouse), spouseParentsFamsIds = _b[0], spouseSiblingsIds = _b[1];
        var childrenIds = fam.getChildren();
        return new api_1.ChildNodes({
            indiParents: filter.indiParents
                ? this.famAsSpouseIdsToNodes(indiParentsFamsIds, parentNode, api_1.LinkType.IndiParents)
                : [],
            indiSiblings: filter.indiSiblings
                ? this.indiIdsToFamAsSpouseNodes(indiSiblingsIds, parentNode, api_1.LinkType.IndiSiblings)
                : [],
            spouseParents: filter.spouseParents
                ? this.famAsSpouseIdsToNodes(spouseParentsFamsIds, parentNode, api_1.LinkType.SpouseParents)
                : [],
            spouseSiblings: filter.spouseSiblings
                ? this.indiIdsToFamAsSpouseNodes(spouseSiblingsIds, parentNode, api_1.LinkType.SpouseSiblings)
                : [],
            children: filter.children
                ? this.indiIdsToFamAsSpouseNodes(childrenIds, parentNode, api_1.LinkType.Children)
                : [],
        });
    };
    HierarchyCreator.prototype.childNodesForIndi = function (indi, parentNode, filter) {
        var _a = this.getParentsAndSiblings(indi), indiParentsFamsIds = _a[0], indiSiblingsIds = _a[1];
        return new api_1.ChildNodes({
            indiParents: filter.indiParents
                ? this.famAsSpouseIdsToNodes(indiParentsFamsIds, parentNode, api_1.LinkType.IndiParents)
                : [],
            indiSiblings: filter.indiSiblings
                ? this.indiIdsToFamAsSpouseNodes(indiSiblingsIds, parentNode, api_1.LinkType.IndiSiblings)
                : [],
        });
    };
    HierarchyCreator.prototype.areParentsAndSiblingsPresent = function (indiId) {
        var indi = indiId && this.data.getIndi(indiId);
        var famcId = indi && indi.getFamilyAsChild();
        var famc = famcId && this.data.getFam(famcId);
        if (!famc)
            return [false, false];
        return [
            !!(famc.getFather() || famc.getMother()),
            famc.getChildren().length > 1,
        ];
    };
    HierarchyCreator.prototype.getParentsAndSiblings = function (indi) {
        var indiFamcId = indi && indi.getFamilyAsChild();
        var indiFamc = this.data.getFam(indiFamcId);
        if (!indiFamc)
            return [[], []];
        var father = this.data.getIndi(indiFamc.getFather());
        var mother = this.data.getIndi(indiFamc.getMother());
        var parentFamsIds = []
            .concat(father ? father.getFamiliesAsSpouse() : [], mother ? mother.getFamiliesAsSpouse() : [])
            .filter(function (id) { return id !== indiFamcId; });
        parentFamsIds.unshift(indiFamcId);
        var siblingsIds = Array.from(indiFamc.getChildren());
        siblingsIds.splice(siblingsIds.indexOf(indi.getId()), 1); // Remove indi from indi's siblings
        return [parentFamsIds, siblingsIds];
    };
    HierarchyCreator.prototype.indiIdsToFamAsSpouseNodes = function (indiIds, parentNode, childNodeType) {
        var _this = this;
        return indiIds.flatMap(function (id) {
            return _this.indiIdToFamAsSpouseNodes(id, parentNode, childNodeType);
        });
    };
    HierarchyCreator.prototype.indiIdToFamAsSpouseNodes = function (indiId, parentNode, childNodeType) {
        var _this = this;
        if (this.isChildNodeTypeForbidden(childNodeType, parentNode))
            return [];
        var famsIds = this.data.getIndi(indiId).getFamiliesAsSpouse();
        if (!famsIds.length) {
            var node = this.idToNode(EntryId.indi(indiId), parentNode, childNodeType);
            return node ? [node] : [];
        }
        var famsNodes = famsIds.map(function (id) {
            return {
                id: id,
                indi: { id: indiId },
                family: { id: id },
                parentNode: parentNode,
                linkFromParentType: childNodeType,
                childNodes: api_1.ChildNodes.EMPTY,
                linkStubs: [],
            };
        });
        famsNodes.forEach(function (node, i) {
            if (i !== 0)
                node.primaryMarriage = famsNodes[0];
            var duplicateOf = _this.queuedNodesById.get(node.id);
            if (duplicateOf) {
                node.duplicateOf = duplicateOf;
                duplicateOf.duplicated = true;
            }
            else
                _this.queuedNodesById.set(node.id, node);
        });
        return famsNodes;
    };
    HierarchyCreator.prototype.famAsSpouseIdsToNodes = function (famsIds, parentNode, childNodeType) {
        var nodes = this.idsToNodes(famsIds.map(EntryId.fam), parentNode, childNodeType);
        nodes.slice(1).forEach(function (node) { return (node.primaryMarriage = nodes[0]); });
        return nodes;
    };
    HierarchyCreator.prototype.idsToNodes = function (entryIds, parentNode, childNodeType, duplicateCheck) {
        var _this = this;
        if (duplicateCheck === void 0) { duplicateCheck = true; }
        return entryIds
            .map(function (entryId) {
            return _this.idToNode(entryId, parentNode, childNodeType, duplicateCheck);
        })
            .filter(function (node) { return node != null; });
    };
    HierarchyCreator.prototype.idToNode = function (entryId, parentNode, childNodeType, duplicateCheck) {
        if (duplicateCheck === void 0) { duplicateCheck = true; }
        if (this.isChildNodeTypeForbidden(childNodeType, parentNode))
            return null;
        var id = entryId.id, isFam = entryId.isFam;
        if (isFam) {
            var fam = this.data.getFam(id);
            if (!fam || (!fam.getFather() && !fam.getMother()))
                return null; // Don't create fam nodes that are missing both husband and wife
        }
        var duplicateOf = this.queuedNodesById.get(id);
        var node = {
            id: id,
            parentNode: parentNode,
            linkFromParentType: childNodeType,
            childNodes: api_1.ChildNodes.EMPTY,
            linkStubs: [],
        };
        if (isFam)
            node.family = { id: id };
        if (duplicateCheck && duplicateOf) {
            node.duplicateOf = duplicateOf;
            duplicateOf.duplicated = true;
        }
        if (!duplicateOf)
            this.queuedNodesById.set(id, node);
        return node;
    };
    HierarchyCreator.prototype.createLinkStubs = function (node) {
        var _this = this;
        if (!this.isFamNode(node) ||
            (!node.duplicateOf && !node.duplicated && !node.primaryMarriage)) {
            return [];
        }
        var fam = this.data.getFam(node.family.id);
        var _a = this.areParentsAndSiblingsPresent(node.indi ? node.indi.id : null), indiParentsPresent = _a[0], indiSiblingsPresent = _a[1];
        var _b = this.areParentsAndSiblingsPresent(node.spouse ? node.spouse.id : null), spouseParentsPresent = _b[0], spouseSiblingsPresent = _b[1];
        var childrenPresent = utils_1.nonEmpty(fam.getChildren());
        return [
            indiParentsPresent ? [api_1.LinkType.IndiParents] : [],
            indiSiblingsPresent ? [api_1.LinkType.IndiSiblings] : [],
            spouseParentsPresent ? [api_1.LinkType.SpouseParents] : [],
            spouseSiblingsPresent ? [api_1.LinkType.SpouseSiblings] : [],
            childrenPresent ? [api_1.LinkType.Children] : [],
        ]
            .flat()
            .filter(function (linkType) {
            return !_this.isChildNodeTypeForbidden(linkType, node) &&
                !node.childNodes.get(linkType).length;
        });
    };
    HierarchyCreator.prototype.isChildNodeTypeForbidden = function (childNodeType, parentNode) {
        if (childNodeType === null || !parentNode)
            return false;
        switch (api_1.otherSideLinkType(parentNode.linkFromParentType)) {
            case api_1.LinkType.IndiParents:
            case api_1.LinkType.IndiSiblings:
                if (childNodeType === api_1.LinkType.IndiParents ||
                    childNodeType === api_1.LinkType.IndiSiblings) {
                    return true;
                }
                break;
            case api_1.LinkType.Children:
                if (!parentNode.primaryMarriage &&
                    childNodeType === api_1.LinkType.Children) {
                    return true;
                }
                break;
        }
        if (parentNode.primaryMarriage) {
            // Forbid indi/spouse from parentNode that is also indi/spouse in primaryMarriage from having parents and siblings, as they are already added to primaryMarriage node. This prevents drawing parents/siblings of a person for each marriage of this person.
            var indiId = parentNode.indi.id;
            var spouseId = parentNode.spouse.id;
            var pmIndiId = parentNode.primaryMarriage.indi.id;
            var pmSpouseId = parentNode.primaryMarriage.spouse.id;
            if (indiId === pmIndiId || indiId === pmSpouseId) {
                if (childNodeType === api_1.LinkType.IndiParents ||
                    childNodeType === api_1.LinkType.IndiSiblings) {
                    return true;
                }
            }
            else if (spouseId === pmIndiId || spouseId === pmSpouseId) {
                if (childNodeType === api_1.LinkType.SpouseParents ||
                    childNodeType === api_1.LinkType.SpouseSiblings) {
                    return true;
                }
            }
        }
        return false;
    };
    HierarchyCreator.prototype.isFamNode = function (node) {
        return !!node.family;
    };
    HierarchyCreator.UP_FILTER = hierarchy_filter_1.HierarchyFilter.allRejecting().modify({
        indiParents: true,
        spouseParents: true,
        indiSiblings: true,
        spouseSiblings: true,
    });
    HierarchyCreator.DOWN_FILTER = hierarchy_filter_1.HierarchyFilter.allRejecting().modify({
        children: true,
    });
    HierarchyCreator.ALL_ACCEPTING_FILTER = hierarchy_filter_1.HierarchyFilter.allAccepting();
    return HierarchyCreator;
}());
exports.HierarchyCreator = HierarchyCreator;
/* Id of indi or fam */
var EntryId = /** @class */ (function () {
    function EntryId(indiId, famId) {
        if (!indiId && !famId)
            throw new Error('Invalid EntryId');
        this.id = (indiId || famId);
        this.isFam = !!famId;
    }
    EntryId.indi = function (id) {
        return new EntryId(id, null);
    };
    EntryId.fam = function (id) {
        return new EntryId(null, id);
    };
    return EntryId;
}());
exports.EntryId = EntryId;
function getRootsCount(upRoot, data) {
    var upIndi = upRoot.data.indi && data.getIndi(upRoot.data.indi.id);
    var upSpouse = upRoot.data.spouse && data.getIndi(upRoot.data.spouse.id);
    return ((upIndi ? upIndi.getFamiliesAsSpouse().length : 0) +
        (upSpouse ? upSpouse.getFamiliesAsSpouse().length - 1 : 0));
}
exports.getRootsCount = getRootsCount;

},{"../id-generator":27,"../utils":37,"./api":30,"./hierarchy-filter":32,"d3-hierarchy":7}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchyFilter = void 0;
var HierarchyFilter = /** @class */ (function () {
    function HierarchyFilter(overrides) {
        if (overrides === void 0) { overrides = {}; }
        this.indiParents = true;
        this.indiSiblings = true;
        this.spouseParents = true;
        this.spouseSiblings = true;
        this.children = true;
        this.modify(overrides);
    }
    HierarchyFilter.allAccepting = function () {
        return new HierarchyFilter();
    };
    HierarchyFilter.allRejecting = function () {
        return new HierarchyFilter().modify({
            indiParents: false,
            indiSiblings: false,
            spouseParents: false,
            spouseSiblings: false,
            children: false,
        });
    };
    HierarchyFilter.prototype.modify = function (overrides) {
        Object.assign(this, overrides);
        return this;
    };
    return HierarchyFilter;
}());
exports.HierarchyFilter = HierarchyFilter;

},{}],33:[function(require,module,exports){
"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KinshipChartRenderer = void 0;
var d3_array_1 = require("d3-array");
var api_1 = require("./api");
var chart_util_1 = require("../chart-util");
var utils_1 = require("../utils");
var LINKS_BASE_OFFSET = 17;
var PARENT_LINK_ANCHOR_X_OFFSET = 15;
var SIBLING_LINK_ANCHOR_Y_OFFSET = 5;
var SIBLING_LINK_STARTER_LENGTH = 7;
var LINKS_SEPARATION = 6;
var LINK_STUB_CIRCLE_R = 3;
var KinshipChartRenderer = /** @class */ (function () {
    function KinshipChartRenderer(options) {
        this.options = options;
        this.util = new chart_util_1.ChartUtil(this.options);
    }
    KinshipChartRenderer.prototype.layOut = function (upRoot, downRoot) {
        var svg = this.util.getSvgForRendering();
        // Add styles so that calculating text size is correct.
        if (svg.select('style').empty()) {
            svg.append('style').text(this.options.renderer.getCss());
        }
        return [
            this.util.layOutChart(upRoot, { flipVertically: true }),
            this.util.layOutChart(downRoot),
        ];
    };
    KinshipChartRenderer.prototype.render = function (upNodes, downNodes, rootsCount) {
        var _this = this;
        var allNodes = upNodes.concat(downNodes);
        var allNodesDeduped = allNodes.slice(1); // Remove duplicate start/center node
        // Prepare for rendering
        upNodes.forEach(function (node) { return _this.setLinkYs(node, true); });
        downNodes.forEach(function (node) { return _this.setLinkYs(node, false); });
        // Render chart
        var animationPromise = this.util.renderNodes(allNodesDeduped, this.util.getSvgForRendering());
        this.renderLinks(allNodes);
        if (rootsCount > 1) {
            this.renderRootDummyAdditionalMarriageLinkStub(allNodes[0]);
        }
        var info = chart_util_1.getChartInfo(allNodesDeduped);
        this.util.updateSvgDimensions(info);
        return Object.assign(info, { animationPromise: animationPromise });
    };
    KinshipChartRenderer.prototype.renderLinks = function (nodes) {
        var _this = this;
        var svgg = this.util.getSvgForRendering().select('g');
        var keyFn = function (d) { return d.data.id; };
        // Render links
        var boundLinkNodes = svgg.selectAll('path.internode-link').data(nodes.filter(function (n) { return !!n.parent; }), keyFn);
        boundLinkNodes
            .enter()
            .insert('path', 'g')
            .attr('class', function (node) { return _this.cssClassForLink(node); })
            .merge(boundLinkNodes)
            .attr('d', function (node) {
            var linkPoints = node.data.primaryMarriage
                ? _this.additionalMarriageLinkPoints(node)
                : _this.linkPoints(node.parent, node, node.data.linkFromParentType);
            return utils_1.points2pathd(linkPoints);
        });
        boundLinkNodes.exit().remove();
        // Render link stubs container "g" element
        var boundLinkStubNodes = svgg.selectAll('g.link-stubs').data(nodes.filter(function (n) { return n.data.duplicateOf || n.data.duplicated || n.data.primaryMarriage; }), keyFn);
        var linkStubNodesEnter = boundLinkStubNodes
            .enter()
            .insert('g', 'g')
            .attr('class', 'link-stubs');
        boundLinkStubNodes.exit().remove();
        // Render link stubs
        var boundLinkStubs = linkStubNodesEnter
            .merge(boundLinkStubNodes)
            .selectAll('g')
            .data(function (node) { return _this.nodeToLinkStubRenderInfos(node); }, function (d) { return d.linkType.toString(); });
        boundLinkStubs
            .enter()
            .append('g')
            .call(function (g) {
            return g
                .append('path')
                .attr('class', function (d) { return _this.cssClassForLinkStub(d.linkType); })
                .merge(boundLinkStubs.select('path.link-stub'))
                .attr('d', function (d) { return utils_1.points2pathd(d.points); });
        })
            .call(function (g) {
            return g
                .append('circle')
                .attr('r', LINK_STUB_CIRCLE_R)
                .style('stroke', 'black')
                .style('fill', 'none')
                .merge(boundLinkStubs.select('circle'))
                .attr('transform', function (d) {
                return "translate(" + utils_1.last(d.points).x + ", " + (utils_1.last(d.points).y + LINK_STUB_CIRCLE_R * d.treeDir) + ")";
            });
        });
        boundLinkStubs.exit().remove();
    };
    KinshipChartRenderer.prototype.cssClassForLink = function (fromNode) {
        if (fromNode.data.primaryMarriage) {
            return 'link internode-link additional-marriage';
        }
        return ('link internode-link ' +
            this.cssClassForLinkType(fromNode.data.linkFromParentType));
    };
    KinshipChartRenderer.prototype.cssClassForLinkStub = function (linkType) {
        return 'link link-stub ' + this.cssClassForLinkType(linkType);
    };
    KinshipChartRenderer.prototype.cssClassForLinkType = function (linkType) {
        switch (linkType) {
            case api_1.LinkType.IndiParents:
            case api_1.LinkType.SpouseParents:
                return 'parents-link';
            case api_1.LinkType.IndiSiblings:
            case api_1.LinkType.SpouseSiblings:
                return 'siblings-link';
            case api_1.LinkType.Children:
                return 'children-link';
        }
    };
    KinshipChartRenderer.prototype.nodeToLinkStubRenderInfos = function (node) {
        var _this = this;
        return node.data.linkStubs.map(function (linkType) {
            var isUpTree = node.y < node.parent.y;
            var treeDir = isUpTree ? -1 : 1;
            var anchorPoints = _this.linkAnchorPoints(node, linkType, isUpTree);
            var y = node.data.linkYs.children -
                (2 * LINKS_SEPARATION + 2 * LINK_STUB_CIRCLE_R) * treeDir;
            return {
                treeDir: treeDir,
                linkType: linkType,
                points: __spreadArray(__spreadArray([], anchorPoints), [{ x: utils_1.last(anchorPoints).x, y: y }]),
            };
        });
    };
    KinshipChartRenderer.prototype.getLinkY = function (node, type) {
        switch (type) {
            case api_1.LinkType.IndiParents:
                return node.data.linkYs.indi;
            case api_1.LinkType.IndiSiblings:
                return node.data.linkYs.indi;
            case api_1.LinkType.SpouseParents:
                return node.data.linkYs.spouse;
            case api_1.LinkType.SpouseSiblings:
                return node.data.linkYs.spouse;
            case api_1.LinkType.Children:
                return node.data.linkYs.children;
        }
    };
    KinshipChartRenderer.prototype.setLinkYs = function (node, isUpTree) {
        var treeDir = isUpTree ? -1 : 1;
        var base = node.y + (node.data.height / 2 + LINKS_BASE_OFFSET) * treeDir;
        var offset = LINKS_SEPARATION * treeDir;
        var _a = this.calcLinkOffsetDirs(node), indiOffsetDir = _a[0], spouseOffsetDir = _a[1];
        node.data.linkYs = {
            indi: base + offset * indiOffsetDir,
            spouse: base + offset * spouseOffsetDir,
            children: base,
        };
    };
    /***
     * Calculates indi (indiParent and indiSiblings) and spouse (spouseParent and spouseSiblings)
     * links offset directions, so they don't merge/collide with children links and with each other.
     ***/
    KinshipChartRenderer.prototype.calcLinkOffsetDirs = function (node) {
        var childNodes = node.data.childNodes;
        if (childNodes.children.length) {
            // Check children-indi and children-spouse links collisions
            var indiParentLinkAnchorX = this.linkAnchorPoints(node, api_1.LinkType.IndiParents, true)[0].x;
            var spouseParentLinkAnchorX = this.linkAnchorPoints(node, api_1.LinkType.SpouseParents, true)[0].x;
            var childrenLinksX = {
                min: this.findMinXOfChildNodesAnchors(node, childNodes.children),
                max: this.findMaxXOfChildNodesAnchors(node, childNodes.children),
            };
            if (childrenLinksX.min < indiParentLinkAnchorX &&
                childrenLinksX.max > spouseParentLinkAnchorX) {
                return [-1, -1]; // This shouldn't happen! It can't happen with start node, because start node have children links going down and other links going up. It can't happen with non-start node, as there can't be outgoing indi, spouse and children links at the same time on non-start node. -- But.. It might be useful to not remove it, so that this function might be used when constructing links for other types of charts.
            }
            else if (childrenLinksX.min < indiParentLinkAnchorX) {
                return [-1, 1];
            }
            else if (childrenLinksX.max > spouseParentLinkAnchorX) {
                return [1, -1];
            }
        }
        else if ((childNodes.indiParents.length || childNodes.indiSiblings.length) &&
            (childNodes.spouseParents.length || childNodes.spouseSiblings.length)) {
            // Check indi-spouse links collision
            var indiParentLinkAnchorX = this.linkAnchorPoints(node, api_1.LinkType.IndiParents, true)[0].x;
            var spouseLinksMinX = this.findMinXOfChildNodesAnchors(node, childNodes.spouseSiblings.concat(childNodes.spouseParents));
            if (spouseLinksMinX < indiParentLinkAnchorX) {
                return [-1, 1];
            }
        }
        return [1, -1];
    };
    KinshipChartRenderer.prototype.findMinXOfChildNodesAnchors = function (parentNode, childNodes) {
        return this.findExtremeXOfChildNodesAnchors(parentNode, childNodes, true);
    };
    KinshipChartRenderer.prototype.findMaxXOfChildNodesAnchors = function (parentNode, childNodes) {
        return this.findExtremeXOfChildNodesAnchors(parentNode, childNodes, false);
    };
    KinshipChartRenderer.prototype.findExtremeXOfChildNodesAnchors = function (parentNode, childNodes, isMin) {
        var extremeFindingFunction = isMin ? d3_array_1.min : d3_array_1.max;
        var dir = isMin ? -1 : 1;
        var childNodesSet = new Set(childNodes);
        return (extremeFindingFunction(parentNode.children.filter(function (n) { return childNodesSet.has(n.data); }), function (n) { return n.x + (dir * n.data.width) / 2; }) +
            dir * SIBLING_LINK_STARTER_LENGTH);
    };
    KinshipChartRenderer.prototype.linkPoints = function (from, to, type) {
        var isUpTree = from.y > to.y;
        var pointsFrom = this.linkAnchorPoints(from, type, isUpTree);
        var pointsTo = this.linkAnchorPoints(to, api_1.otherSideLinkType(type), !isUpTree).reverse();
        var y = this.getLinkY(from, type);
        return __spreadArray(__spreadArray(__spreadArray([], pointsFrom), [
            { x: pointsFrom[pointsFrom.length - 1].x, y: y },
            { x: pointsTo[0].x, y: y }
        ]), pointsTo);
    };
    KinshipChartRenderer.prototype.additionalMarriageLinkPoints = function (node) {
        var nodeIndex = node.parent.children.findIndex(function (n) { return n.data.id === node.data.id; });
        var prevSiblingNode = node.parent.children[nodeIndex - 1];
        var y = this.indiMidY(node);
        return [
            { x: prevSiblingNode.x, y: y },
            { x: node.x, y: y },
        ];
    };
    KinshipChartRenderer.prototype.linkAnchorPoints = function (node, type, top) {
        var _a = [node.x, node.y], x = _a[0], y = _a[1];
        var _b = [node.data.width, node.data.height], w = _b[0], h = _b[1];
        var leftEdge = x - w / 2;
        var rightEdge = x + w / 2;
        var _c = [
            node.data.indi,
            node.data.spouse,
            node.data.family,
        ].map(function (e) { return (e ? e.width : 0); }), indiW = _c[0], spouseW = _c[1], familyW = _c[2];
        var indisW = indiW + spouseW;
        var indisLeftEdge = x - w / 2 + (familyW > indisW ? (familyW - indisW) / 2 : 0);
        var indisRightEdge = indisLeftEdge + indisW;
        var siblingAnchorY = this.indiMidY(node) + SIBLING_LINK_ANCHOR_Y_OFFSET * (top ? -1 : 1);
        switch (type) {
            case api_1.LinkType.IndiParents:
                return [
                    { x: indisLeftEdge + PARENT_LINK_ANCHOR_X_OFFSET, y: y - h / 2 },
                ];
            case api_1.LinkType.SpouseParents:
                return [
                    { x: indisRightEdge - PARENT_LINK_ANCHOR_X_OFFSET, y: y - h / 2 },
                ];
            case api_1.LinkType.IndiSiblings:
                return [
                    { x: indisLeftEdge, y: siblingAnchorY },
                    {
                        x: (familyW > indisW && !top ? leftEdge : indisLeftEdge) -
                            SIBLING_LINK_STARTER_LENGTH,
                        y: siblingAnchorY,
                    },
                ];
            case api_1.LinkType.SpouseSiblings:
                return [
                    { x: indisRightEdge, y: siblingAnchorY },
                    {
                        x: (familyW > indisW && !top ? rightEdge : indisRightEdge) +
                            SIBLING_LINK_STARTER_LENGTH,
                        y: siblingAnchorY,
                    },
                ];
            case api_1.LinkType.Children:
                return [
                    { x: indisLeftEdge + (node.data.spouse ? indiW : indiW / 2), y: y },
                ];
        }
    };
    KinshipChartRenderer.prototype.indiMidY = function (node) {
        return node.y - node.data.height / 2 + node.data.indi.height / 2;
    };
    KinshipChartRenderer.prototype.renderRootDummyAdditionalMarriageLinkStub = function (root) {
        var svgg = this.util.getSvgForRendering().select('g');
        var y = this.indiMidY(root);
        var x = root.data.width / 2 + 20;
        var r = 3;
        svgg.selectAll('.root-dummy-additional-marriage').remove();
        svgg
            .insert('g', 'g')
            .attr('class', 'root-dummy-additional-marriage')
            .call(function (g) {
            return g
                .append('path')
                .attr('d', "M 0 " + y + " L " + x + " " + y)
                .attr('class', 'link additional-marriage');
        })
            .call(function (g) {
            return g
                .append('circle')
                .attr('transform', "translate(" + (x + r) + ", " + y + ")")
                .attr('r', r)
                .style('stroke', 'black')
                .style('fill', 'black');
        });
    };
    return KinshipChartRenderer;
}());
exports.KinshipChartRenderer = KinshipChartRenderer;

},{"../chart-util":17,"../utils":37,"./api":30,"d3-array":2}],34:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelativesChart = void 0;
var ancestor_chart_1 = require("./ancestor-chart");
var id_generator_1 = require("./id-generator");
var descendant_chart_1 = require("./descendant-chart");
var d3_array_1 = require("d3-array");
var chart_util_1 = require("./chart-util");
/** A view of a family that hides one child individual. */
var FilterChildFam = /** @class */ (function () {
    function FilterChildFam(fam, childId) {
        this.fam = fam;
        this.childId = childId;
    }
    FilterChildFam.prototype.getId = function () {
        return this.fam.getId();
    };
    FilterChildFam.prototype.getFather = function () {
        return this.fam.getFather();
    };
    FilterChildFam.prototype.getMother = function () {
        return this.fam.getMother();
    };
    FilterChildFam.prototype.getChildren = function () {
        var children = __spreadArray([], this.fam.getChildren());
        var index = children.indexOf(this.childId);
        if (index !== -1) {
            children.splice(index, 1);
        }
        return children;
    };
    return FilterChildFam;
}());
/** Data provider proxy that filters out a specific child individual. */
var FilterChildData = /** @class */ (function () {
    function FilterChildData(data, childId) {
        this.data = data;
        this.childId = childId;
    }
    FilterChildData.prototype.getIndi = function (id) {
        return this.data.getIndi(id);
    };
    FilterChildData.prototype.getFam = function (id) {
        return new FilterChildFam(this.data.getFam(id), this.childId);
    };
    return FilterChildData;
}());
/** Chart layout showing all relatives of a person. */
var RelativesChart = /** @class */ (function () {
    function RelativesChart(options) {
        this.options = options;
        this.util = new chart_util_1.ChartUtil(options);
        this.options.idGenerator = this.options.idGenerator || new id_generator_1.IdGenerator();
    }
    RelativesChart.prototype.layOutAncestorDescendants = function (ancestorsRoot, focusedNode) {
        // let ancestorDescentants: Array<HierarchyPointNode<TreeNode>> = [];
        var _this = this;
        var ancestorData = new Map();
        ancestorsRoot.eachAfter(function (node) {
            if (!node.parent) {
                return;
            }
            var descendantOptions = __assign({}, _this.options);
            descendantOptions.startFam = node.data.family.id;
            descendantOptions.startIndi = undefined;
            var child = node.id === node.parent.data.spouseParentNodeId
                ? node.parent.data.spouse.id
                : node.parent.data.indi.id;
            descendantOptions.data = new FilterChildData(descendantOptions.data, child);
            descendantOptions.baseGeneration =
                (_this.options.baseGeneration || 0) - node.depth;
            var descendantNodes = descendant_chart_1.layOutDescendants(descendantOptions);
            // The id could be modified because of duplicates. This can happen when
            // drawing one family in multiple places of the chart).
            node.data.id = descendantNodes[0].id;
            var chartInfo = chart_util_1.getChartInfoWithoutMargin(descendantNodes);
            var parentData = (node.children || []).map(function (childNode) {
                return ancestorData.get(childNode.data.id);
            });
            var parentHeight = parentData
                .map(function (data) { return data.height; })
                .reduce(function (a, b) { return a + b + chart_util_1.V_SPACING; }, 0);
            var data = {
                descendantNodes: descendantNodes,
                width: chartInfo.size[0],
                height: chartInfo.size[1] + parentHeight,
                x: chartInfo.origin[0],
                y: chartInfo.origin[1] + parentHeight,
            };
            ancestorData.set(node.data.id, data);
        });
        ancestorsRoot.each(function (node) {
            if (!node.parent) {
                return;
            }
            var data = ancestorData.get(node.data.id);
            var parentData = ancestorData.get(node.parent.data.id);
            data.left =
                parentData && !parentData.middle
                    ? parentData.left
                    : node.parent.data.indiParentNodeId === node.id;
            data.middle =
                (!parentData || parentData.middle) &&
                    node.parent.children.length === 1;
        });
        ancestorsRoot.each(function (node) {
            var data = ancestorData.get(node.data.id);
            var thisNode = data ? data.descendantNodes[0] : focusedNode;
            (node.children || []).forEach(function (child) {
                var childNode = ancestorData.get(child.data.id).descendantNodes[0];
                childNode.parent = thisNode;
            });
            if (node.data.indiParentNodeId && node.children) {
                thisNode.data.indiParentNodeId = node.children.find(function (childNode) { return childNode.id === node.data.indiParentNodeId; }).data.id;
            }
            if (node.data.spouseParentNodeId && node.children) {
                thisNode.data.spouseParentNodeId = node.children.find(function (childNode) { return childNode.id === node.data.spouseParentNodeId; }).data.id;
            }
        });
        ancestorsRoot.each(function (node) {
            var nodeData = ancestorData.get(node.data.id);
            // Lay out the nodes produced by laying out descendants of ancestors
            // instead of the ancestor nodes from ancestorsRoot.
            var thisNode = nodeData ? nodeData.descendantNodes[0] : focusedNode;
            var indiParent = node.children &&
                node.children.find(function (child) { return child.id === node.data.indiParentNodeId; });
            var spouseParent = node.children &&
                node.children.find(function (child) { return child.id === node.data.spouseParentNodeId; });
            var nodeX = thisNode.x;
            var nodeY = thisNode.y;
            var nodeWidth = thisNode.data.width;
            var nodeHeight = thisNode.data.height;
            var indiWidth = thisNode.data.indi ? thisNode.data.indi.width : 0;
            var spouseWidth = thisNode.data.spouse
                ? thisNode.data.spouse.width
                : 0;
            // Lay out the individual's ancestors and their descendants.
            if (indiParent) {
                var data = ancestorData.get(indiParent.data.id);
                var parentNode = data.descendantNodes[0];
                var parentData = parentNode.data;
                var spouseTreeHeight = spouseParent
                    ? ancestorData.get(spouseParent.data.id).height + chart_util_1.V_SPACING
                    : 0;
                var dx_1 = nodeX +
                    data.x -
                    nodeWidth / 2 +
                    indiWidth / 2 +
                    (data.left ? -data.width - chart_util_1.H_SPACING : chart_util_1.H_SPACING);
                var dy_1 = nodeY +
                    data.y -
                    nodeHeight / 2 -
                    data.height +
                    (data.left ? -chart_util_1.V_SPACING : -spouseTreeHeight - chart_util_1.V_SPACING);
                // Move all nodes by (dx, dy). The ancestor node,
                // ie. data.descendantNodes[0] is now at (0, 0).
                data.descendantNodes.forEach(function (node) {
                    node.x += dx_1;
                    node.y += dy_1;
                });
                // Set the ancestor's horizontal position independently.
                var middleX = indiWidth / 2 -
                    nodeWidth / 2 +
                    parentData.width / 2 -
                    (parentData.indi
                        ? parentData.indi.width
                        : parentData.spouse.width);
                if (data.middle) {
                    parentNode.x = 0;
                }
                else if (!nodeData || nodeData.middle) {
                    parentNode.x =
                        -nodeWidth / 2 - parentData.width / 2 + indiWidth - chart_util_1.H_SPACING / 2;
                }
                else if (data.left) {
                    parentNode.x =
                        nodeX +
                            d3_array_1.min([
                                nodeWidth / 2 -
                                    parentData.width / 2 -
                                    spouseWidth / 2 -
                                    chart_util_1.H_SPACING,
                                middleX,
                            ]);
                }
                else {
                    parentNode.x =
                        nodeX + d3_array_1.max([parentData.width / 2 - nodeWidth / 2, middleX]);
                }
            }
            // Lay out the spouse's ancestors and their descendants.
            if (spouseParent) {
                var data = ancestorData.get(spouseParent.data.id);
                var parentNode = data.descendantNodes[0];
                var parentData = parentNode.data;
                var indiTreeHeight = indiParent
                    ? ancestorData.get(indiParent.data.id).height + chart_util_1.V_SPACING
                    : 0;
                var dx_2 = nodeX +
                    data.x +
                    nodeWidth / 2 -
                    spouseWidth / 2 +
                    (data.left ? -data.width - chart_util_1.H_SPACING : chart_util_1.H_SPACING);
                var dy_2 = nodeY +
                    data.y -
                    nodeHeight / 2 -
                    data.height +
                    (data.left ? -indiTreeHeight - chart_util_1.V_SPACING : -chart_util_1.V_SPACING);
                // Move all nodes by (dx, dy). The ancestor node,
                // ie. data.descendantNodes[0] is now at (0, 0).
                data.descendantNodes.forEach(function (node) {
                    node.x += dx_2;
                    node.y += dy_2;
                });
                // Set the ancestor's horizontal position independently.
                var middleX = nodeWidth / 2 -
                    spouseWidth / 2 +
                    parentData.width / 2 -
                    (parentData.indi
                        ? parentData.indi.width
                        : parentData.spouse.width);
                if (data.middle) {
                    parentNode.x = 0;
                }
                else if (!nodeData || nodeData.middle) {
                    parentNode.x =
                        nodeWidth / 2 + parentData.width / 2 - spouseWidth + chart_util_1.H_SPACING / 2;
                }
                else if (data.left) {
                    parentNode.x =
                        nodeX + d3_array_1.min([nodeWidth / 2 - parentData.width / 2, middleX]);
                }
                else {
                    parentNode.x =
                        nodeX +
                            d3_array_1.max([
                                parentData.width / 2 - nodeWidth / 2 + indiWidth / 2 + chart_util_1.H_SPACING,
                                middleX,
                            ]);
                }
            }
        });
        return Array.from(ancestorData.values())
            .map(function (data) { return data.descendantNodes; })
            .reduce(function (a, b) { return a.concat(b); }, []);
    };
    RelativesChart.prototype.render = function () {
        var descendantNodes = descendant_chart_1.layOutDescendants(this.options);
        // Don't use common id generator because these nodes will not be drawn.
        var ancestorOptions = Object.assign({}, this.options, {
            idGenerator: undefined,
        });
        var ancestorsRoot = ancestor_chart_1.getAncestorsTree(ancestorOptions);
        var ancestorDescentants = this.layOutAncestorDescendants(ancestorsRoot, descendantNodes[0]);
        var nodes = descendantNodes.concat(ancestorDescentants);
        var animationPromise = this.util.renderChart(nodes);
        var info = chart_util_1.getChartInfo(nodes);
        this.util.updateSvgDimensions(info);
        return Object.assign(info, { animationPromise: animationPromise });
    };
    return RelativesChart;
}());
exports.RelativesChart = RelativesChart;

},{"./ancestor-chart":15,"./chart-util":17,"./descendant-chart":22,"./id-generator":27,"d3-array":2}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChart = void 0;
var d3_selection_1 = require("d3-selection");
var data_1 = require("./data");
var DEFAULT_SVG_SELECTOR = 'svg';
function createChartOptions(chartOptions, renderOptions, options) {
    var data = new data_1.JsonDataProvider(chartOptions.json);
    var indiHrefFunc = chartOptions.indiUrl
        ? function (id) { return chartOptions.indiUrl.replace('${id}', id); }
        : undefined;
    var famHrefFunc = chartOptions.famUrl
        ? function (id) { return chartOptions.famUrl.replace('${id}', id); }
        : undefined;
    // If startIndi nor startFam is provided, select the first indi in the data.
    if (!renderOptions.startIndi && !renderOptions.startFam) {
        renderOptions.startIndi = chartOptions.json.indis[0].id;
    }
    var animate = !options.initialRender && chartOptions.animate;
    return {
        data: data,
        renderer: new chartOptions.renderer({
            data: data,
            indiHrefFunc: indiHrefFunc,
            famHrefFunc: famHrefFunc,
            indiCallback: chartOptions.indiCallback,
            famCallback: chartOptions.famCallback,
            horizontal: chartOptions.horizontal,
            colors: chartOptions.colors,
            animate: animate,
            locale: chartOptions.locale,
        }),
        startIndi: renderOptions.startIndi,
        startFam: renderOptions.startFam,
        svgSelector: chartOptions.svgSelector || DEFAULT_SVG_SELECTOR,
        horizontal: chartOptions.horizontal,
        baseGeneration: renderOptions.baseGeneration,
        animate: animate,
    };
}
var SimpleChartHandle = /** @class */ (function () {
    function SimpleChartHandle(options) {
        this.options = options;
        this.initialRender = true;
    }
    SimpleChartHandle.prototype.render = function (renderOptions) {
        if (renderOptions === void 0) { renderOptions = {}; }
        var chartOptions = createChartOptions(this.options, renderOptions, {
            initialRender: this.initialRender,
        });
        this.initialRender = false;
        var chart = new this.options.chartType(chartOptions);
        var info = chart.render();
        if (this.options.updateSvgSize !== false) {
            d3_selection_1.select(chartOptions.svgSelector)
                .attr('width', info.size[0])
                .attr('height', info.size[1]);
        }
        return info;
    };
    /**
     * Updates the chart input data.
     * This is useful when the data is dynamically loaded and a different subset
     * of data will be displayed.
     */
    SimpleChartHandle.prototype.setData = function (json) {
        this.options.json = json;
    };
    return SimpleChartHandle;
}());
function createChart(options) {
    return new SimpleChartHandle(options);
}
exports.createChart = createChart;

},{"./data":20,"d3-selection":9}],36:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleRenderer = void 0;
var d3_selection_1 = require("d3-selection");
var composite_renderer_1 = require("./composite-renderer");
var MIN_HEIGHT = 27;
var MIN_WIDTH = 50;
/** Calculates the length of the given text in pixels when rendered. */
function getLength(text) {
    var g = d3_selection_1.select('svg').append('g').attr('class', 'simple node');
    var x = g.append('text').attr('class', 'name').text(text);
    var w = x.node().getComputedTextLength();
    g.remove();
    return w;
}
function getName(indi) {
    return [indi.getFirstName() || '', indi.getLastName() || ''].join(' ');
}
function getYears(indi) {
    var birthDate = indi.getBirthDate();
    var birthYear = birthDate && birthDate.date && birthDate.date.year;
    var deathDate = indi.getDeathDate();
    var deathYear = deathDate && deathDate.date && deathDate.date.year;
    if (!birthYear && !deathYear) {
        return '';
    }
    return (birthYear || '') + " \u2013 " + (deathYear || '');
}
/**
 * Simple rendering of an individual box showing only the person's name and
 * years of birth and death.
 */
var SimpleRenderer = /** @class */ (function (_super) {
    __extends(SimpleRenderer, _super);
    function SimpleRenderer(options) {
        var _this = _super.call(this, options) || this;
        _this.options = options;
        return _this;
    }
    SimpleRenderer.prototype.getPreferredIndiSize = function (id) {
        var indi = this.options.data.getIndi(id);
        var years = getYears(indi);
        var width = Math.max(getLength(getName(indi)) + 8, getLength(years), MIN_WIDTH);
        var height = years ? MIN_HEIGHT + 14 : MIN_HEIGHT;
        return [width, height];
    };
    SimpleRenderer.prototype.render = function (enter, update) {
        var selection = enter.merge(update).append('g').attr('class', 'simple');
        this.renderIndi(selection, function (node) { return node.indi; });
        var spouseSelection = selection
            .filter(function (node) { return !!node.data.spouse; })
            .append('g')
            .attr('transform', function (node) { return "translate(0, " + node.data.indi.height + ")"; });
        this.renderIndi(spouseSelection, function (node) { return node.spouse; });
    };
    SimpleRenderer.prototype.getCss = function () {
        return "\n.simple text {\n  font: 12px sans-serif;\n}\n\n.simple .name {\n  font-weight: bold;\n}\n\n.simple rect {\n  fill: #fff;\n  stroke: black;\n}\n\n.link {\n  fill: none;\n  stroke: #000;\n  stroke-width: 1px;\n}\n\n.additional-marriage {\n  stroke-dasharray: 2;\n}";
    };
    SimpleRenderer.prototype.renderIndi = function (selection, indiFunc) {
        var _this = this;
        // Optionally add a link.
        var group = this.options.indiHrefFunc
            ? selection
                .append('a')
                .attr('href', function (node) {
                return _this.options.indiHrefFunc(indiFunc(node.data).id);
            })
            : selection;
        // Box.
        group
            .append('rect')
            .attr('width', function (node) { return indiFunc(node.data).width; })
            .attr('height', function (node) { return indiFunc(node.data).height; });
        // Text.
        group
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('class', 'name')
            .attr('transform', function (node) { return "translate(" + indiFunc(node.data).width / 2 + ", 17)"; })
            .text(function (node) {
            return getName(_this.options.data.getIndi(indiFunc(node.data).id));
        });
        group
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('class', 'details')
            .attr('transform', function (node) { return "translate(" + indiFunc(node.data).width / 2 + ", 33)"; })
            .text(function (node) {
            return getYears(_this.options.data.getIndi(indiFunc(node.data).id));
        });
    };
    return SimpleRenderer;
}(composite_renderer_1.CompositeRenderer));
exports.SimpleRenderer = SimpleRenderer;

},{"./composite-renderer":19,"d3-selection":9}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.points2pathd = exports.zip = exports.last = exports.nonEmpty = void 0;
function nonEmpty(array) {
    return !!(array && array.length);
}
exports.nonEmpty = nonEmpty;
function last(array) {
    return array[array.length - 1];
}
exports.last = last;
function zip(a, b) {
    return a.map(function (e, i) { return [e, b[i]]; });
}
exports.zip = zip;
function points2pathd(points) {
    var result = "M " + points[0].x + " " + points[0].y + " L";
    for (var _i = 0, _a = points.slice(1); _i < _a.length; _i++) {
        var s = _a[_i];
        result += " " + s.x + " " + s.y;
    }
    return result;
}
exports.points2pathd = points2pathd;

},{}]},{},[28])(28)
});
