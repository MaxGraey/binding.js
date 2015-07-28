Binding.js
===================
Bind and watch updating property or member changes of javascript object or DOM-element.

----------

Features
--------
   - **Blazing fast over dirty-check and Object.observe**
   - **Atomic updates**
   - **Properties filter**
   - **Support dom elements**
   - **Allowing properties not only fields**
   - **Sync with zero latency or async binding**
   -  **No dependencies**
   -  *Nested object properties filter and observing (roadmap for v1.0)*
   - *One-way, two-way or once type of binding (roadmap for v1.0)*
   - *Several listeners (roadmap for v1.0)*

----------
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

####Description
**Binding.on** add watches for assignment to a properties named **properties** in **object**, calling **callback**(target, property, newValue, oldValue) whenever any property in properties list is set.

####Usage
#####Setup target object or prototype:
``` js
var target = {
	num:  0,
	text: ''
}
```
#####explicitly set watching some properties:
```js
Binding.on(target, ['text', 'num'], function (target, property, newValue, oldValue) {
    switch (property) {
        case 'text':
        console.log('new value of text:', newValue)
        break
        case 'num':
        console.log('new value of num:', newValue)
        break
    }
})
```
#####or watching all properties (you can use: [], null, undefined, ''):
```js
Binding.on(target, null, function (target, property, newValue, oldValue) {
    switch (property) {
        case 'text':
        console.log('new value of text:', newValue)
        break
        case 'num':
        console.log('new value of num:', newValue)
        break
    }
})
```
#####after that we can change some properties: 
```js
target.num  = 100500
target.text = 'bang!'
```

### Binding.off(object, properties)

####Description
**Binding.off** removes a watchpoint set with the **Binding.on** method.

####Usage
#####Unbind only one watching property:
```js
Binding.off(target, 'text')
```
#####or unbind all watching properties:
```js
Binding.off(target)
```

[npm]: https://www.npmjs.com/package/binding.js