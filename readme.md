Binding.js
===================
[![npm:](https://img.shields.io/npm/v/binding.js.svg?style=flat-square)](https://www.npmjs.com/packages/binding.js)[![issues:](https://img.shields.io/github/issues/MaxGraey/binding.js.svg?style=flat-square)](https://github.com/MaxGraey/binding.js/issues)[![license:bsd-3-clause](https://img.shields.io/npm/l/binding.js.svg?style=flat-square)](http://opensource.org/licenses/BSD-3-Clause)

Bind and watch updating property or member changes of javascript object or DOM-element.


##### See [CHANGE.md] for changes


Features
--------
   - **Blazing fast over dirty-check and `Object.observe`**
   - **Atomic updates**
   - **Properties filter**
   - **Support watching DOM properties and attributes**
   - **Allowing properties with accessors**
   - **Sync with zero latency or async binding**
   - **Follows [semantic versioning](http://semver.org) for releases**
   - **No dependencies**
   - *Allowing static, instanced and prototype methods*
   - *Simplification interface (radmap for v0.1.0)*
   - *Several per-property callbacks (roadmap for v0.1.0)*
   - *Nested object properties filter and observing (roadmap for v1.0.0)*
   - *Drop MutationObservers and use more low-level methods*
   - *One-way, two-way or once type of binding (roadmap for v1.0.0)*


Get started
-----------
[binding.js on node package manager](https://www.npmjs.com/package/binding.js)

**node.js install:**
``` bash
npm install binding.js
```
**browser setup:**
``` js
<script src="binding.js"></script>
```

Syntax
-------------

### Binding.on(object, properties, callback, options)

#### Description
**`Binding.on`** add watches for assignment to a properties named `properties` in `object`, calling `callback(target, property, newValue, oldValue)` whenever any property in properties list is set.

#### Usage
>Setup target object or prototype:
>``` js
>var target = {
>    num:  0,
>    text: ''
>}```
>Begin watching one of property
>``` js
>Binding.on(target,'text', function (target, property, newValue, oldValue) {
>    console.log('new value of text:', newValue,' old value: ', oldValue)
>})
>```
>or explicitly set watching some properties:
>```js
>Binding.on(target, ['text', 'num'], function (target, property, newValue, oldValue) {
>    switch (property) {
>        case 'text':
>        console.log('new value of text:', newValue)
>        break
>        case 'num':
>        console.log('new value of num:', newValue)
>        break
>    }
>})
>```
>or watching all properties (you can use: `[]`, `null`, `undefined` or `''`):
>```js
>Binding.on(target, null, function (target, property, newValue, oldValue) {
>    switch (property) {
>        case 'text':
>        console.log('new value of text:', newValue)
>        break
>        case 'num':
>        console.log('new value of num:', newValue)
>        break
>    }
>})
>```
>after that we can change some properties:
>```js
>target.num  = 100500
>target.text = 'bang!'
>```
>and get console output:
>```
>new value of num: 100500
>new value of text: bang!
>```

### Binding.off(object, properties)

#### Description
**`Binding.off`** removes a watchpoint set with the **`Binding.on`** method.

#### Usage
>Unbind only one watching property:
>```js
>Binding.off(target, 'text')
>```
>or unbind all watching properties:
>```js
>Binding.off(target)
>```

[CHANGE.md]:https://github.com/MaxGraey/binding.js/blob/master/CHANGE.md
[moz]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/watch
[poly]: https://gist.github.com/eligrey/384583
[observe]: http://arv.github.io/ecmascript-object-observe
