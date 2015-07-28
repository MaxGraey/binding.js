var Binding = require('../lib/binding');

var SrcObject = function () {
    this.srcProp   = 0;
    this.srcString = '';
    //this.srcObject = {x: 0, y: 0};
}

var DstObject = function () {
    this.dstProp   = 0;
    this.dstString = '';
    //this.dstObject = {x: 0, y: 0};
}

SrcObject.prototype.constructor = SrcObject;
DstObject.prototype.constructor = DstObject;

var src = new SrcObject();
var dst = new DstObject();

/*Binding.on(src, 'srcProp', function (target, property, newValue) {
    dst.dstProp = newValue;
});*/

//Binding.off(src);

Binding.on(src, ['srcProp', 'srcString', 'srcObject'], function (target, property, newValue, oldValue) {
    switch (property) {
        case 'srcProp':
            dst.dstProp = newValue;
        break;
        case 'srcString':
            dst.dstString = newValue;
        break;
        /*case 'srcObject':
            dst.dstObject = newValue;
        break;*/
        default: break;
    }
});


/*Binding.on(src, 'srcString', function (key, value) {
    dst.dstString = value;
    console.log('dstString: ', value);
});*/


src.srcProp = 100;
src.srcString = 'foo';
//src.srcObject = {x: 1, y: 2};

console.log('src: ' + JSON.stringify(src));
console.log('dst: ' + JSON.stringify(dst));

var r = 0;


console.time('t');
for (var i = 0; i < 1000000; ++i) {
    src.srcProp = i;
    src.srcString = 'foo';
    //src.srcObject = {x: i, y: i + 1};
    r += dst.dstProp;
}
console.timeEnd('t');




var SrcObject2 = function () {
    this.srcProp = 0;
    this.srcString = '';
    this.object = {x:0, y:0};
}

var DstObject2 = function () {
    this.dstProp = 0;
    this.dstString = '';
    this.object = {x:0, y:0};
}

SrcObject2.prototype.constructor = SrcObject2;
DstObject2.prototype.constructor = DstObject2;



var src2 = new SrcObject2();
var dst2 = new DstObject2();


Object.observe(src2, function (changes) {
    for (var i = 0, len = changes.length; i < len; ++i) {
        var change = changes[i];
        console.log(change);
        switch (change.name) {
            case 'srcProp':
                dst2.dstProp = change.object.srcProp;
            break;
            case 'srcString':
                dst2.dstString = change.object.srcString;
            break;
            default: break;
        }
    }
}, ['update']);


src2.object.x = 1;

/*
console.time('t2');
for (var i = 0; i < 1000000; ++i) { // 112 ms
    src2.srcProp = i;
    src2.srcString = 'foo';
    r += dst2.dstProp;
}
console.timeEnd('t2');
*/