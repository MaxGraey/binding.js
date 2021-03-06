/**
 * @fileoverview Bind and watch any changes of object
 * @author Maxim Shaydo aka Max Graey <maxgraey@gmail.com>
 * @version 0.0.12
 */


(function (global) {
    'use strict';

    /**
     * Enum for data binding type.
     * @namespace Binding
     */
    var Binding = {};

    /**
     * One way binding
     * @constant
     */
    Binding.OneWay = 0;
    /**
     * Two way binding
     * @constant
     */
    //Binding.TwoWay = 1;
    /**
     * One time binding
     * @constant
     */
    //Binding.Once   = 2;



    /**************/
    /* poly-fills */
    /**************/

    /** @private */
    var filter = Array.prototype.filter.call.bind(Array.prototype.filter);

    /** @private */
    var MutationObserver = global.MutationObserver ||
                           global.WebKitMutationObserver ||
                           global.MozMutationObserver ||
                           global.OMutationObserver ||
                           global.MsMutationObserver;

    /** @private */
    var isArray = Array.isArray || function isArray(arr) {
        return arr !== undefined && arr.constructor === Array;
    };

    var setImmediate = global.setImmediate || (function () {
        var queue = [];
        var addEventListener = global.addEventListener || global.attachEvent;
        var canPost = typeof window !== 'undefined' && global.postMessage && addEventListener;

        if (canPost) {
            var message = global.addEventListener ? 'message' : 'onmessage';
            addEventListener(message, function (event) {
                if (event.source === window && event.data === 'immediate-message-id') {
                    event.stopPropagation();
                    if (queue.length > 0) {
                        var callback = queue.shift();
                        callback();
                    }
                }
            }, true);
        }

        return function (callback) {
            if (canPost) {
                queue.push(callback);
                global.postMessage('immediate-message-id', '*');
            } else {
                setTimeout(callback, 0);
            }
        };
    })();

    /**
     * WeakMap polyfill based on Andrea Giammarchi's solution
     * @private
     */
    var WeakMap = global.WeakMap || function () {
        var id = '_id:' + Math.random(), i = 0;

        function WeakMap() {
            Object.defineProperty(this, id, { value: id + i++ });
        }

        Object.defineProperties(WeakMap.prototype, {
            'has': { value: function (key) { return !!key[this[id]]; }},
            'get': { value: function (key) { return   key[this[id]]; }},
            'set': {
                value: function (key, value) {
                    Object.defineProperty(key, this[id], {
                        configurable: true,
                        value: value
                    });
                }
            },
            'delete': {
                value: function (key) {
                    var r = this.has(key);
                    if (r) { delete key[this[id]]; }
                    return r;
                }
            }
        });

        return WeakMap;
    };


    /****************************/
    /* private utillity methods */
    /****************************/

    /** @private */
    var observers_  = new WeakMap();
    var spacesExpr_ = /\s+/;
    var defaultObserveOptions_ = {
        subtree: true,
        childList: true,
        characterData: true,
        characterDataOldValue: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: undefined
    };



    /** @private */
    function asyncWrap(callback, skipImmutables) {
        // for node.js
        if (typeof module !== 'undefined' && module.exports && process) {
            return function (target, property, newValue, oldValue) {
                if (skipImmutables && (newValue == oldValue || newValue === !!oldValue)) {
                    //console.log('skipeed');
                    return;
                }

                process.nextTick(function () {
                    callback(target, property, newValue, oldValue);
                });
            };
        } else {
            return function (target, property, newValue, oldValue) {
                if (skipImmutables && (newValue == oldValue || newValue === !!oldValue)) {
                    //console.log('skipeed');
                    return;
                }

                setImmediate(function () {
                    callback(target, property, newValue, oldValue);
                });
            };
        }
    }

    /** @private */
    function hasPropertyAccessors(object, property) { // has get or set
        var descriptor = Object.getOwnPropertyDescriptor(object, property);
        return !!descriptor && (!!descriptor.get || !!descriptor.set);
    }

     /** @private */
    function isPropertyConfigurable(propertyDescriptor) { // has get or set
        return !!propertyDescriptor && propertyDescriptor.configurable;
    }


    /** @private */
    function isHtmlElement(obj) {
        return (
            typeof HTMLElement === 'object' ?
                 obj instanceof HTMLElement :
                 typeof obj === 'object' && obj &&
                    obj.nodeType === 1 && typeof obj.nodeName === 'string'
        );
    }

    /** @private */
    function emptyProperties(properties) {
        return (typeof properties === 'undefined' || !properties ||
            (isArray(properties) && properties.length === 0));
    }

    /** @private */
    function descriptorForProperty(object, property, callback) {
        var descriptor = {
            oldValue: object[property],
            get: function () {
                return descriptor.oldValue;
            },
            set: function (value) {
                callback(object, property, value, descriptor.oldValue);
                descriptor.oldValue = value;
            },
            configurable: true,
            enumerable: true
        };

        return descriptor;
    }

    /** @private */
    function descriptorForAccessingProperty(object, property, callback) {
        var originalDesc = Object.getOwnPropertyDescriptor(object, property);
        var setter = function () {};
        var getter = function () {};

        if (!isPropertyConfigurable(originalDesc)) {
            throw new TypeError('The propery ' + property + ' is not configurable');
        }

        if (originalDesc) {
            if (typeof originalDesc.set === 'function') {
                setter = originalDesc.set;
            }

            if (typeof originalDesc.get === 'function') {
                getter = originalDesc.get;
            }
        }

        var descriptor = {
            oldValue: getter.call(object),
            get: getter,
            set: function (value) {
                var result = setter.call(object, value);
                callback(object, property, value, descriptor.oldValue);
                descriptor.oldValue = value;
                return result;
            },
            configurable: true,
            enumerable: true
        };

        return descriptor;
    }

    /** @private */
    function bindProperty(object, property, callback) {
        if (!(property in object)) {
            return;
        }

        var descriptor;
        if (hasPropertyAccessors(object, property)) {
            descriptor = descriptorForAccessingProperty(object, property, callback);
        } else {
            descriptor = descriptorForProperty(object, property, callback);
        }

        Object.defineProperty(object, property, descriptor);
    }

    /** @private */
    function unbindProperty(object, property) {
        if (object.hasOwnProperty(property)) {
            var value = object[property];
            delete object[property];
            object[property] = value;
        }
    }

    /** @private */
    function bindProperties(object, properties, callback) {
        if (emptyProperties(properties)) {
            properties = Object.keys(object);
        }

        for (var i = 0, len = properties.length; i < len; ++i) {
            bindProperty(object, properties[i], callback);
        }
    }

    /** @private */
    function unbindProperties(object, properties) {
        if (emptyProperties(properties)) {
            properties = Object.keys(object);
        }

        for (var i = 0, len = properties.length; i < len; ++i) {
            unbindProperty(object, properties[i]);
        }
    }

    /** @private */
    function validateArguments(object, callback) {
        if (typeof callback === 'undefined') {
            throw new ReferenceError('callback is not defined');
        }

        if (typeof object === 'undefined' || !object) {
           return false;
        }

        return true;
    }

    /** @private */
    function bindHtmlElementProperties(object, properties, callback, options) {
        if (!MutationObserver) {
            throw new Error('MutationObserver is not supported in your browser!');
        }

        var skipImmutables = options.skipImmutables;
        var handleEvents   = options.handleEvents;

        if (typeof handleEvents === 'undefined') {
            handleEvents = true;
        }

        if (typeof properties === 'string') {
            var expr = /\s+/;
            if (expr.test(properties)) {
                properties = properties.split(expr);
            } else {
                properties = [properties];
            }
        }

        if (isArray(properties) && properties.length === 0) {
            properties = undefined;
        }

        // add event changes
        if (handleEvents) {
            object.addEventListener('click', function (event) {
                callback(object, event.type, event, null);
            }, false);

            switch (object.nodeName) {
                case 'INPUT':
                case 'SELECT':
                    object.addEventListener('change', function (event) {
                        callback(object, event.type, event, null);
                    }, false);
                break;
                case 'TEXTAREA':
                    object.addEventListener('input', function (event) {
                        callback(object, event.type, event, null);
                    }, false);
                break;
            }
        }

        var observer = new MutationObserver(function (mutations) {
            var i, len;
            for (i = 0, len = mutations.length; i < len; ++i) {
                var mutation = mutations[i];
                //console.log(mutation);

                var property = mutation.type;
                var newValue = mutation.target.nodeValue;

                if (mutation.attributeName) {
                    property = mutation.attributeName;
                    newValue = object[property];

                    if (newValue && newValue.length) {
                        var value = {};
                        for (i = 0, len = value.length; i < len; ++i) {
                            var attribure    = newValue[i];
                            value[attribure] = newValue[attribure];
                        }
                        newValue = value;
                    }
                }

                if (skipImmutables && (newValue == mutation.oldValue || newValue === !!mutation.oldValue)) {
                    //console.log('skipeed');
                    return ;
                }

                callback(object, property, newValue, mutation.oldValue);
            }
        });

        var mutableOptions = Object.create(defaultObserveOptions_);

        mutableOptions.attributeFilter = properties;
        observer.observe(object, mutableOptions);
        observers_.set(object, { observer: observer, options: mutableOptions });
    }

    /** @private */
    function unbindHtmlElementProperties(object, properties) {
        var observerAndOptions = observers_.get(object);
        var observer = observerAndOptions.observer;
        var options  = observerAndOptions.options;

        observer.disconnect();
        if (emptyProperties(properties)) {
            observers_.delete(object);
        } else {
            if (typeof properties === 'string') {
                if (spacesExpr_.test(properties)) {
                    properties = properties.split(spacesExpr_);
                } else {
                    properties = [properties];
                }
            }

            var len = properties.length;
            var attributeFilter = options.attributeFilter;

            if (!attributeFilter) {
                attributeFilter = [];
                for (var attributeName in object) {
                    attributeFilter.push(attributeName);
                }
            }

            options.attributeFilter = filter(attributeFilter, function (property) {
                for (var i = 0; i < len; ++i) {
                    return (property !== properties[i]);
                }
            });

            observer.observe(object, options);
        }
    }

    /******************/
    /* Public methods */
    /******************/

    /**
     * The Binding.on definition.
     * @memberof Binding
     * @param {object} object Object target.
     * @param {?string|string[]} [properties] The name of property or array of names of property on which you wish to monitor changes.
     * @param {function} callback A function to call when the specified property's value changes.
     * @param {object}  [options] - options.
     * @param {number}  [options.bindingType] - Binding enum.
     * @param {boolean} [options.deep=false] - recursive watch all sub-object properties.
     * @param {boolean} [options.async=false] - asynchronous callback mode.
     * @param {boolean} [options.skipImmutables=true] - skip immutables changes in async mode.
     * @param {boolean} [options.handleEvents=true] - listen some DOMElement events (experimental)
     *
     * @return {boolean} True if callback is exectly asynchronous otherwise False.
     * @throws {Error|ReferenceError}
     */
    Binding.on = function (object, properties, callback, options) {
        if (!validateArguments(object, callback)) {
            return false;
        }

        if (typeof options !== 'object') {
            options = {};
        }

        var skipImmutables = options.skipImmutables;
        if (typeof skipImmutables === 'undefined') {
            skipImmutables = true;
        }

        var allProps    = (typeof properties === 'undefined' || !properties || !properties.length);
        var deep        = !!options.deep && allProps;
        var async       = !!options.async;
        var bindingType = options.bindingType || Binding.OneWay;

        if (async) {
            callback = asyncWrap(callback, skipImmutables);
        }

        if (isHtmlElement(object)) {
            bindHtmlElementProperties(object, properties, callback, options);
            return true;
        }

        // fast javascript object observing
        if (typeof properties === 'string') {
            if (spacesExpr_.test(properties)) {
                bindProperties(object, properties.split(spacesExpr_), callback);
            } else {
                var property = properties;
                bindProperty(object, property, callback);
            }
        } else if (isArray(properties)) {
            bindProperties(object, properties, callback);
        }

        return async;
    };

    /**
     * The Binding.off definition.
     * @memberof Binding
     * @param {object} object Object target.
     * @param {?string|string[]} [properties] The name of property or array of names of property on which you wish to monitor changes.
     */
    Binding.off = function (object, properties) {
        if (typeof object === 'undefined' || !object) {
            return;
        }

        if (isHtmlElement(object)) {
            unbindHtmlElementProperties(object, properties);
        } else {
            if (typeof properties === 'string') {
                if (spacesExpr_.test(properties)) {
                    unbindProperties(object, properties.split(spacesExpr_));
                } else {
                    var property = properties;
                    unbindProperty(object, property);
                }
            } else {
                unbindProperties(object, properties);
            }
        }
    };

    if (typeof module !== 'undefined' && module) {
        module.exports = Binding;
    } else if (typeof exports !== 'undefined') {
        exports.Binding = Binding;
    } else {
        global.Binding = Binding;
    }

})(typeof global !== 'undefined' && global && typeof module !== 'undefined' && module ? global : this || window);
