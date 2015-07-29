/**
 * @fileoverview Bind and watch any changes of object
 * @author Maxim Shaydo aka Max Graey <maxgraey@gmail.com>
 * @version 0.0.7
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
    var MutationObserver = global.MutationObserver || 
                           global.WebKitMutationObserver || 
                           global.MozMutationObserver || 
                           global.OMutationObserver || 
                           global.MsMutationObserver;
    
    /** @private */
    var isArray = Array.isArray || function isArray(arr) {
        return arr !== undefined && arr.constructor == Array;
    };
    
    /** @private */
    var WeakMap = global.WeakMap || function () {
        // "memory-safer" alternative to Polymer WeakMap
        // probably less performant but it's OK
        // since deleting is really a rare case with WM anyway
        // (C) Andrea Giammarchi - MIT Style License
        function WeakMap() {
            defineProperty(this, id, { value: id + i++ });
        }
        
        var defineProperty = Object.defineProperty,
            id = '__wm:' + Math.random(),
            wm = WeakMap.prototype,
            i  = 0;
        
        defineProperty(wm, 'get', {
            value: function (key) {
                return key[this[id]];
            }
        });
        
        defineProperty(wm, 'set', {
            value: function (key, value) {
                defineProperty(key, this[id], {
                    configurable: true,
                    value: value
                });
            }
        });
        
        defineProperty(wm, 'has', {
            value: function (key) {
                return this[id] in key;
            }
        });
        
        defineProperty(wm, 'delete', {
            value: function (key) {
                var r = this.has(key);
                if (r) { delete key[this[id]]; }
                return r;
            }
        });
        
        return WeakMap;
    };
    
    
    /****************************/
    /* private utillity methods */
    /****************************/
    
    /** @private */
    var _observers  = new WeakMap();
    var _spacesExpr = /\s+/;
    var _defaultObserveOptions = {
        subtree: true,
        childList: true,
        characterData: true,
        characterDataOldValue: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: null
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
        } else if (global.setImmediate) {
            return function (target, property, newValue, oldValue) {
                if (skipImmutables && (newValue == oldValue || newValue === !!oldValue)) {
                    //console.log('skipeed');
                    return;
                }
                
                setImmediate(function () {
                    callback(target, property, newValue, oldValue);
                });
            };
        } else {
            return function (target, property, newValue, oldValue) {
                if (skipImmutables && (newValue == oldValue || newValue === !!oldValue)) {
                    //console.log('skipeed');
                    return;
                }
                
                setTimeout(function () {
                    callback(target, property, newValue, oldValue);
                }, 0);
            };
        }
    }
    
    /** @private */
    /*function getPropertyObject(object, property) { // has get or set
        return Object.getOwnPropertyDescriptor(object, property);
    }*/
    
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
    function bindProperty(object, property, callback) {
        var descriptor = {
            _value: object[property],
            get: function () {
                return descriptor._value;
            },
            set: function (newval) {
                var oldval = descriptor._value;
                descriptor._value = newval;
                callback(object, property, newval, oldval);
            },
            configurable: true,
            enumerable: true
        };
            
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
    function htmlElementBinding(object, properties, callback, options) {
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
            for (var i = 0, len = mutations.length; i < len; ++i) {
                var mutation = mutations[i];
                //console.log(mutation);
                
                var property = mutation.type;
                var newValue = mutation.target.nodeValue;

                if (mutation.attributeName) {
                    property = mutation.attributeName;
                    newValue = object[property];
                    
                    if (newValue && newValue.length) {
                        var value = {};
                        for (var i = 0, len = value.length; i < len; ++i) {
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
        
        var options = Object.create(_defaultObserveOptions);
        
        options.attributeFilter = properties;
        observer.observe(object, options);
        _observers.set(object, { observer: observer, options: options });
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
            htmlElementBinding(object, properties, callback, options);
            return true;
        }
        
        // fast javascript object observing 
        if (typeof properties === 'string') {
            if (_spacesExpr.test(properties)) {
                bindProperties(object, properties.split(_spacesExpr), callback);
            } else {
                var property = properties;
                bindProperty(object, property, callback);
            }
        } else if (isArray(properties)) {
            bindProperties(object, properties, callback);
        }
        
        return async;
    }
    
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
            var observerAndOptions = _observers.get(object);
            var observer = observerAndOptions.observer;
            var options  = observerAndOptions.options;
            
            observer.disconnect();
            if (emptyProperties(properties)) {
                _observers.delete(object);
            } else {
                if (typeof properties === 'string') {
                    if (_spacesExpr.test(properties)) {
                        properties = properties.split(_spacesExpr);
                    } else {
                        properties = [properties];
                    }
                }
                
                var len = properties.length;
                var attributeFilter = options.attributeFilter;
                
                if (!attributeFilter) {
                    attributeFilter = [];
                    //attributeFilter = object.attributes;
                    
                    // FIXME: HTMLElement#attributes return only manualset attributes but not all (global+specified)
                    var attributes = object.attributes;
                    for (var i = 0, len = attributes.length; i < len; ++i) {
                        attributeFilter.push(attributes[i].nodeName);
                    }
                }
                
                console.log(attributeFilter, properties);
                
                options.attributeFilter = attributeFilter.filter(function (property) {
                    for (var i = 0; i < len; ++i) {
                        return (property !== properties[i]);
                    }
                });
                
                observer.observe(object, options);
            }
        } else {
            if (typeof properties === 'string') {
                if (_spacesExpr.test(properties)) {
                    unbindProperties(object, properties.split(_spacesExpr));
                } else {
                    var property = properties;
                    unbindProperty(object, property);
                }
            } else {
                unbindProperties(object, properties);
            }
        }
    }
    
    if (typeof module !== 'undefined' && module) {
        module.exports = Binding;
    } else if (typeof exports !== 'undefined') {
        exports.Binding = Binding;
    } else {
        global.Binding = Binding;
    }
    
})(typeof global !== 'undefined' && global && typeof module !== 'undefined' && module ? global : this || window);