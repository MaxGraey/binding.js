/**
 * @fileoverview Bind and watch any changes of object
 * @author Maxim Shaydo aka Max Graey <maxgraey@gmail.com>
 * @version 0.0.1
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
    
    /** @private */
    var _observers = {}; // TODO change _observers to WeakMap object
    
    /** @private */
    var MutationObserver = global.MutationObserver || 
                           global.WebKitMutationObserver || 
                           global.MozMutationObserver || 
                           global.OMutationObserver || 
                           global.MsMutationObserver;
    
    /** @private */
    function asyncWrap(callback, skipImmutables) {
        // for node.js
        if (typeof module !== 'undefined' && module.exports && process) {
            return function (target, property, newValue, oldValue) {
                if (skipImmutables && (newValue == oldValue || (newValue === !!oldValue))) {
                    //console.log('skipeed');
                    return;
                }
                
                process.nextTick(function () {
                    callback(target, property, newValue, oldValue);
                });
            };
        } else if (global.setImmediate) {
            return function (target, property, newValue, oldValue) {
                if (skipImmutables && (newValue == oldValue || (newValue === !!oldValue))) {
                    //console.log('skipeed');
                    return;
                }
                
                global.setImmediate(function () {
                    callback(target, property, newValue, oldValue);
                });
            };
        }
    }
    
    /** @private */
    function _getPropertyObject(object, property) { // has get or set
        return Object.getOwnPropertyDescriptor(object, property);
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
    function _bindProperty(object, property, callback) {
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
    function _unbindProperty(object, property) {
        if (object.hasOwnProperty(property)) {
            var value = object[property];
            delete object[property];
            object[property] = value;
        }
    }
    
    /** @private */
    function _bindProperties(object, properties, callback) {
        if (typeof properties === 'undefined' || !properties || 
            (Array.isArray(properties) && properties.length === 0)) {
            properties = Object.keys(object);
        }
        
        for (var i = 0, len = properties.length; i < len; ++i) {
            _bindProperty(object, properties[i], callback);
        }
    }
    
    /** @private */
    function _unbindProperties(object, properties) {
        if (typeof properties === 'undefined' || !properties || 
            (Array.isArray(properties) && properties.length === 0)) {
            properties = Object.keys(object);
        }
        
        for (var i = 0, len = properties.length; i < len; ++i) {
            _unbindProperty(object, properties[i]);
        }
    }
    
    /** @private */
    function _validateArguments(object, callback) {
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
            // or just print to console and return ?
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
        
        if (Array.isArray(properties) && properties.length === 0) {
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

        var options = {
            subtree: true,
            childList: true,
            characterData: true,
            characterDataOldValue: true,
            attributes: true,
            attributeOldValue: true,
            attributeFilter: properties
        };

        var observer = _observers[object] = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                //console.log(mutation);
                
                var property = mutation.type;
                var value    = mutation.target.nodeValue;

                if (mutation.attributeName) {
                    property = mutation.attributeName;
                    value    = object[property];
                    
                    if (value && value.length) {
                        var newValue = {};
                        for (var i = 0, len = value.length; i < len; ++i) {
                            var attribure  = value[i];
                            newValue[attribure] = value[attribure];
                        }
                        value = newValue;
                    }
                }

                if (skipImmutables && (value == mutation.oldValue || (value === !!mutation.oldValue))) {
                    console.log('skipeed');
                    return ;
                }
                
                callback(object, property, value, mutation.oldValue);
            });
        });
        
        observer.observe(object, options);
    }

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
     * @param {boolean} [options.skipImmutables=true] - skip immutables changes in callback mode.
     * @param {boolean} [options.handleEvents=true] - listen DOMElement events
     *
     * @return {boolean} True if callback is exectly asynchronous otherwise False.
     * @throws {Error|ReferenceError}
     */
    Binding.on = function (object, properties, callback, options) {
        if (!_validateArguments(object, callback)) {
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
            var expr = /\s+/;
            if (expr.test(properties)) {
                _bindProperties(object, properties.split(expr), callback);
            } else {
                var property = properties;
                _bindProperty(object, property, callback);
            }
        } else if (Array.isArray(properties)) {
            _bindProperties(object, properties, callback);
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
        
        if (isDOMElement(object)) {
            _observers[object].disconnect();
        } else {
            if (typeof properties === 'string') {
                var expr = /\s+/;
                if (expr.test(properties)) {
                    _unbindProperties(object, properties.split(expr));
                } else {
                    var property = properties;
                    _unbindProperty(object, property);
                }
            } else {
                _unbindProperties(object, properties);
            }
        }
    }
    
    if (typeof module !== 'undefined' && module) {
        module.exports = Binding;
    } else {
        global.Binding = Binding;
    }
    
})(typeof global !== 'undefined' && global && typeof module !== 'undefined' && module ? global : this || window);