/****
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Aaron Trent
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 ****/
'use strict';

exports.__esModule = true;
exports.wrap = exports.isPromise = undefined;
exports.isThenable = isThenable;
exports.isGenerator = isGenerator;
exports.isGeneratorFunction = isGeneratorFunction;
exports.toPromise = toPromise;
exports.addYieldHandler = addYieldHandler;
exports.coroutine = coroutine;

var _bluebird = require( 'bluebird' );

var _bluebird2 = _interopRequireDefault( _bluebird );

function _interopRequireDefault( obj ) {
    return obj && obj.__esModule ? obj : {default: obj};
}

var Promise = _bluebird2.default;
/**
 * Created by Aaron on 7/3/2015.
 */

var yieldHandlers = [];

function isThenable( obj ) {
    return obj && typeof obj.then === 'function';
}

var isPromise = exports.isPromise = isThenable;

var hasBuffer = typeof Buffer === 'function';

function isGenerator( obj ) {
    return 'function' === typeof obj.next && 'function' === typeof obj.throw;
}

function isGeneratorFunction( obj ) {
    var constructor = obj.constructor;

    if( !constructor ) {
        return false;
    } else if( 'GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName ) {
        return true;
    } else {
        var prototype = constructor.prototype;

        return 'function' === typeof prototype.next && 'function' === typeof prototype.throw;
    }
}

function objectToPromise( obj ) {
    var keys = Object.keys( obj );
    var length = keys.length | 0;

    var result = new obj.constructor();
    var values = new Array( length );

    var i = -1;

    while( ++i < length ) {
        var key = keys[i];

        result[key] = void 0;

        values[i] = toPromise.call( this, obj[key] );
    }

    return Promise.all( values ).then( function( res ) {
        var i = res.length | 0;

        while( --i >= 0 ) {
            result[keys[i]] = res[i];
        }

        return result;
    } );
}

function resolveGenerator( gen ) {
    return new Promise( function( resolve, reject ) {
        function next( ret ) {
            if( ret.done ) {
                resolve( ret.value );
            } else {
                var value = ret.value;

                if( value && typeof value.then === 'function' ) {
                    value.then( onFulfilled, onRejected );

                    return null;
                } else {
                    value = toPromise.call( this, value );

                    if( value && typeof value.then === 'function' ) {
                        value.then( onFulfilled, onRejected );

                        return null;
                    } else {
                        onRejected(
                            new TypeError(               'You may only yield a function, promise, generator, array, or object, but the following object was passed: "'
                                           + ret.value + '"' ) );
                    }
                }
            }
        }

        function onFulfilled( res ) {
            try {
                next( gen.next( res ) );
            } catch( e ) {
                reject( e );
            }

            return null;
        }

        function onRejected( err ) {
            try {
                next( gen.throw( err ) );
            } catch( e ) {
                reject( e );
            }

            return null;
        }

        onFulfilled();
    } );
}

function arrayFromIterable( iter ) {
    var results = [];
    var ret = iter.next();

    while( !ret.done ) {
        results.push( ret.value );

        ret = iter.next();
    }

    return results;
}

var arrayFrom = typeof Array.from === 'function' ? Array.from : arrayFromIterable;

function arrayToPromise( value ) {
    var length = value.length | 0;

    var results = new Array( length );

    while( --length >= 0 ) {
        results[length] = toPromise.call( this, value[length] );
    }

    return Promise.all( results );
}

//This is separated out so it can be optimized independently to the calling function.
function processThunkArgs( args ) {
    var length = args.length | 0;

    if( length >= 3 ) {
        var res = new Array( --length );

        for( var i = 0; i < length; ) {
            res[i] = args[++i]; //It's a good thing this isn't undefined behavior in JavaScript
        }

        return res;
    }

    return args[1];
}

function thunkToPromise( value ) {
    var _this = this;

    return new Promise( function( resolve, reject ) {
        try {
            value.call( _this, function( err ) {
                if( err ) {
                    reject( err );
                } else {
                    resolve( processThunkArgs( arguments ) );
                }
            } );
        } catch( err ) {
            reject( err );
        }
    } );
}

function isReadableStream( stream ) {
    return stream.readable || typeof stream.read === 'function' || typeof stream._read === 'function'
           || typeof stream.pipe === 'function' || typeof stream._transform === 'function';
}

function isWritableStream( stream ) {
    return stream.writable || typeof stream.write === 'function' || typeof stream._write === 'function';
}

function streamToPromise( stream, readable, writable ) {
    var encoding = stream.encoding;
    var objectMode = stream.objectMode;

    if( readable ) {
        var _ret = (function() {
            var parts = [];

            //special behavior for Node streams.
            encoding = encoding || stream._readableState && stream._readableState.encoding;

            return {
                v: new Promise( function( resolve, reject ) {
                    function onData( data ) {
                        if( objectMode || typeof data !== 'string' && hasBuffer && !Buffer.isBuffer( data ) ) {
                            objectMode = true;

                            data = toPromise.call( this, data );
                        }

                        parts.push( data );
                    }

                    function onEnd( err ) {
                        cleanup();

                        if( err ) {
                            reject( err );
                        } else {
                            Promise.all( parts ).then( function( results ) {
                                if( hasBuffer && !objectMode ) {
                                    var length = results.length | 0;

                                    if( typeof encoding === 'string' ) {
                                        while( --length >= 0 ) {
                                            var result = results[length];

                                            if( Buffer.isBuffer( result ) ) {
                                                results[length] = result.toString( encoding );
                                            }
                                        }

                                        resolve( results.join( '' ) );
                                    } else {
                                        while( --length >= 0 ) {
                                            var result = results[length];

                                            if( !Buffer.isBuffer( result ) ) {
                                                results[length] = new Buffer( result );
                                            }
                                        }

                                        resolve( Buffer.concat( results ) );
                                    }
                                } else if( objectMode ) {
                                    resolve( results );
                                } else {
                                    resolve( results.join( '' ) );
                                }
                            } );
                        }
                    }

                    function onClose() {
                        cleanup();
                        resolve( void 0 );
                    }

                    function cleanup() {
                        stream.removeListener( 'data', onData );
                        stream.removeListener( 'end', onEnd );
                        stream.removeListener( 'error', onEnd );
                        stream.removeListener( 'close', onClose );
                    }

                    stream.addListener( 'data', onData );
                    stream.addListener( 'end', onEnd );
                    stream.addListener( 'error', onEnd );
                    stream.addListener( 'close', onClose );
                } )
            };
        })();

        if( typeof _ret === "object" ) {
            return _ret.v;
        }
    } else {
        return new Promise( function( resolve, reject ) {
            function onFinish() {
                cleanup();
                resolve.apply( undefined, arguments );
            }

            function onError( err ) {
                cleanup();
                reject( err );
            }

            function cleanup() {
                stream.removeListener( 'finish', onFinish );
                stream.removeListener( 'error', onError );
            }

            stream.addListener( 'finish', onFinish );
            stream.addListener( 'error', onError );
        } );
    }
}

function toPromise( value ) {
    if( typeof value === 'object' && !!value ) {
        if( typeof value.then === 'function' ) {
            return value;
        } else if( Array.isArray( value ) ) {
            return arrayToPromise.call( this, value );
        } else if( 'function' === typeof value.next ) {
            if( 'function' === typeof value.throw ) {
                return resolveGenerator.call( this, value );
            } else {
                return arrayToPromise.call( this, arrayFrom( value ) );
            }
        } else {
            if( typeof value.addListener === 'function' && typeof value.removeListener === 'function' ) {
                var readable = isReadableStream( value );
                var writable = isWritableStream( value );

                if( readable || writable ) {
                    return streamToPromise.call( this, value, readable, writable );
                }
            }

            if( Object === value.constructor ) {
                return objectToPromise.call( this, value );
            }
        }
    } else if( typeof value === 'function' ) {
        if( isGeneratorFunction( value ) ) {
            return Promise.coroutine( value ).call( this );
        } else {
            return thunkToPromise.call( this, value );
        }
    }

    for( var i = 0, length = yieldHandlers.length | 0; i < length; ++i ) {
        var res = yieldHandlers[i].call( this, value );

        if( res && typeof res.then === 'function' ) {
            return res;
        }
    }

    return value;
}

function addYieldHandler( handler ) {
    if( typeof handler !== 'function' ) {
        throw new TypeError( 'yield handler is not a function' );
    } else {
        yieldHandlers.push( handler );
    }
}

function coroutine( fn ) {
    return Promise.coroutine( fn );
}

var wrap = exports.wrap = coroutine;

exports.default = {
    addYieldHandler:     addYieldHandler,
    isThenable:          isThenable,
    isPromise:           isPromise,
    isGenerator:         isGenerator,
    isGeneratorFunction: isGeneratorFunction,
    toPromise:           toPromise,
    coroutine:           coroutine,
    wrap:                wrap
};
