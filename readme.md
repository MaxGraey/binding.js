Binding.js
===================
[ ![NPM Version](http://img.shields.io/npm/v/binding.js.svg?style=flat) ](https://www.npmjs.com/package/binding.js) [ ![Issues](https://img.shields.io/github/issues/MaxGraey/binding.js.svg) ](https://github.com/MaxGraey/binding.js/issues)  [ ![License](http://img.shields.io/npm/l/binding.js.svg?style=flat) ](http://opensource.org/licenses/BSD-3-Clause)

Bind and watch updating property or member changes of javascript object or DOM-element.



Features
--------
   - **Blazing fast over dirty-check and `Object.observe`**
   - **Atomic updates**
   - **Properties filter**
   - **Support DOM-elements**
   - **Sync with zero latency or async binding**
   - **No dependencies**
   - *Allowing properties not only fields (roadmap for v0.1.0)*
   - *Several per-property callbacks (roadmap for v0.1.0)*
   - *Nested object properties filter and observing (roadmap for v1.0.0)*
   - *One-way, two-way or once type of binding (roadmap for v1.0.0)*



| Solutions | Binding.js | [Object watching by Mozilla][moz] | [Object watching (polyfill)][poly] | [Object.observe][observe] |
|:----------------------------------:|:-----------:|:--------------------------:|:--------------------------:|:--------------:|
| Sync / Async | **Both** | Only sync | Only sync | Only async |
| Browser compatibility | **High** | Depricated | **High** | Low (yet) |
| Performance | **Very High** | - | Medium | Low |
| Support DOM | **Yes** | No | No | No |
| Properties filter | **Yes** | **Yes** | **Yes** | No |
| Change actions (update/add/remove) | Only Update | Only Update | Only Update | **All** |


Get started
-----------
[binding.js on node package manager][npm]

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
> Setup target object or prototype:
> ``` js
> var target = {
>    num:  0,
>    text: ''
>}
>```
> explicitly set watching some properties:
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
> or watching all properties (you can use: `[]`, `null`, `undefined` or `''`):
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
> after that we can change some properties: 
>```js
>target.num  = 100500
>target.text = 'bang!'
>```
> and get console output:
>```
>new value of num: 100500
>new value of text: bang!
>```

### Binding.off(object, properties)

#### Description
**`Binding.off`** removes a watchpoint set with the **`Binding.on`** method.

#### Usage
> Unbind only one watching property:
>```js
>Binding.off(target, 'text')
>```
> or unbind all watching properties:
>```js
>Binding.off(target)
>```

[moz]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/watch
[poly]: https://gist.github.com/eligrey/384583
[observe]: http://arv.github.io/ecmascript-object-observe
[npm]: https://www.npmjs.com/package/binding.js
