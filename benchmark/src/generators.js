/**
 * Created by Aaron on 7/11/2015.
 */

/**
 * Created by Aaron on 7/11/2015.
 */

import Promise from 'bluebird';
import BluebirdCo from '../../';
import {wrap} from 'co';

function* gen( iterations ) {
    for( let i = 0; i < iterations; i++ ) {
        yield Promise.resolve( i );
    }
}

//what even is this
function* gen_complex( iterations ) {
    let test3 = [];

    for( let i = 0; i < iterations; i++ ) {
        test3.push( Promise.resolve( i ) )
    }

    for( let i = 0; i < iterations; i++ ) {
        yield [yield Promise.resolve( i ), {
            test:  yield Promise.resolve( i ),
            test2: Promise.resolve( i + 1 ),
            test3: test3
        }];
    }
}

suite( 'simple generators (10 iterations)', function() {
    set( 'delay', 0 );
    set( 'iterations', 200 );

    let co_version = wrap( function*() {
        return yield gen( 10 );
    } );

    let bluebird_version = async function() {
        return await gen( 10 );
    };

    bench( 'co', function( next ) {
        co_version().then( next, console.error );
    } );

    bench( 'bluebird-co', function( next ) {
        bluebird_version().then( next, console.error );
    } );
} );

suite( 'long-running generators (1000 iterations)', function() {
    set( 'delay', 0 );

    let co_version = wrap( function*() {
        return yield gen( 1000 );
    } );

    let bluebird_version = async function() {
        return await gen( 1000 );
    };

    bench( 'co', function( next ) {
        co_version().then( next, console.error );
    } );

    bench( 'bluebird-co', function( next ) {
        bluebird_version().then( next, console.error );
    } );
} );

suite( 'complex generators (150 iterations * three layers)', function() {
    set( 'delay', 0 );
    set( 'iterations', 200 );

    let co_version = wrap( function*() {
        return yield gen_complex( 150 );
    } );

    let bluebird_version = async function() {
        return await gen_complex( 150 );
    };

    bench( 'co', function( next ) {
        co_version().then( next, console.error );
    } );

    bench( 'bluebird-co', function( next ) {
        bluebird_version().then( next, console.error );
    } );
} );
