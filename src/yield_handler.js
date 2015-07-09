/**
 * Created by Aaron on 7/3/2015.
 */

import Promise from 'bluebird';

let strictPromises = false;

export function strict( enable = true ) {
    strictPromises = !!enable;
}

export function isThenable( obj ) {
    return obj !== void 0 && obj !== null && (obj instanceof Promise || typeof obj.then === 'function');
}

export function isGenerator( obj ) {
    return 'function' === typeof obj.next && 'function' === typeof obj.throw;
}

export function isGeneratorFunction( obj ) {
    if( !obj.constructor ) {
        return false;

    } else if( 'GeneratorFunction' === obj.constructor.name ||
               'GeneratorFunction' === obj.constructor.displayName ) {
        return true;

    } else {
        return isGenerator( obj.constructor.prototype );
    }
}

class YieldException extends TypeError {
}

function objectToPromise( obj ) {
    var results = new obj.constructor();
    var promises = [];

    for( let key of Object.keys( obj ) ) {
        let promise = toPromise.call( this, obj[key] );

        if( promise && isThenable( promise ) ) {
            results[key] = void 0;

            promises.push( promise.then( function( res ) {
                results[key] = res;
            } ) );

        } else {
            results[key] = obj[key];
        }
    }

    return Promise.all( promises ).return( results );
}

function resolveGenerator( gen ) {
    return new Promise( ( resolve, reject ) => {

        //Just in case
        if( typeof gen === 'function' ) {
            gen = gen();
        }

        if( !gen || !isGenerator( gen ) ) {
            return Promise.resolve( gen );

        } else {
            let next = ret => {
                if( ret.done ) {
                    return resolve( ret.value );

                } else {
                    var value = toPromise.call( this, ret.value );

                    if( isThenable( value ) ) {
                        return value.then( onFulfilled ).catch( onRejected );

                    } else {
                        let err = new TypeError( `You may only yield a function, promise, generator, array, or object, but the following object was passed: "${ret.value}"` );

                        return onRejected( err );
                    }
                }
            };

            function onFulfilled( res ) {
                try {
                    next( gen.next( res ) );

                } catch( e ) {
                    return reject( e );
                }
            }

            function onRejected( err ) {
                try {
                    next( gen.throw( err ) );

                } catch( e ) {
                    return reject( e );
                }
            }

            onFulfilled();
        }
    } );
}

function toPromise( value ) {
    if( isThenable( value ) ) {
        return value;

    } else if( Array.isArray( value ) ) {
        return Promise.all( value.map( toPromise, this ) );

    } else if( typeof value === 'object' && value !== null ) {
        if( isGenerator( value ) ) {
            return resolveGenerator.call( this, value );

        } else {
            return objectToPromise.call( this, value );
        }

    } else if( typeof value === 'function' ) {
        if( isGeneratorFunction( value ) ) {
            return Promise.coroutine( value )();

        } else {
            //Thunks
            return new Promise( ( resolve, reject ) => {
                try {
                    value.call( this, ( err, res ) => {
                        if( err ) {
                            reject( err );

                        } else {
                            resolve( res );
                        }
                    } );

                } catch( err ) {
                    reject( err );
                }
            } );
        }

    } else if( strictPromises ) {
        throw new YieldException( `You may only yield a function, promise, generator, array, or object, but the following object was passed: "${value}"` );

    } else {
        return Promise.resolve( value );
    }
}

let addedYieldHandler = false;

if( !addedYieldHandler ) {
    Promise.coroutine.addYieldHandler( function( value ) {
        try {
            return toPromise.call( this, value );

        } catch( err ) {
            if( err instanceof YieldException ) {
                return void 0;

            } else {
                return Promise.reject( err );
            }
        }
    } );

    addedYieldHandler = true;
}
