/**
 * Created by Aaron on 7/11/2015.
 */

import Promise from 'bluebird';
import BluebirdCo from '../../';
import {wrap as coWrapBluebird} from '../co'
import {wrap} from 'co';

function makeArray( length ) {
    let res = [];

    for( let i = 0; i < length; i++ ) {
        res.push( Promise.resolve( i ) )
    }

    return res;
}

suite( 'very short arrays (2 elements)', function() {
    set( 'delay', 0 );
    set( 'iterations', 1000 );

    let co_version = wrap( function*() {
        return yield makeArray( 2 );
    } );

    let cob_version = coWrapBluebird( function*() {
        return yield makeArray( 2 );
    } );

    let bluebird_version = async function() {
        return await makeArray( 2 );
    };

    bench( 'co', function( next ) {
        co_version().then( next, console.error );
    } );

    bench( 'co with bluebird promises', function( next ) {
        cob_version().then( next, console.error );
    } );

    bench( 'bluebird-co', function( next ) {
        bluebird_version().then( next, console.error );
    } );
} );

suite( 'short arrays (10 elements)', function() {
    set( 'delay', 0 );
    set( 'iterations', 500 );

    let co_version = wrap( function*() {
        return yield makeArray( 10 );
    } );

    let cob_version = coWrapBluebird( function*() {
        return yield makeArray( 10 );
    } );

    let bluebird_version = async function() {
        return await makeArray( 10 );
    };

    bench( 'co', function( next ) {
        co_version().then( next, console.error );
    } );

    bench( 'co with bluebird promises', function( next ) {
        cob_version().then( next, console.error );
    } );

    bench( 'bluebird-co', function( next ) {
        bluebird_version().then( next, console.error );
    } );
} );

suite( 'long arrays (2000 elements)', function() {
    set( 'delay', 0 );

    let co_version = wrap( function*() {
        return yield makeArray( 2000 );
    } );

    let cob_version = coWrapBluebird( function*() {
        return yield makeArray( 2000 );
    } );

    let bluebird_version = async function() {
        return await makeArray( 2000 );
    };

    bench( 'co', function( next ) {
        co_version().then( next, console.error );
    } );

    bench( 'co with bluebird promises', function( next ) {
        cob_version().then( next, console.error );
    } );

    bench( 'bluebird-co', function( next ) {
        bluebird_version().then( next, console.error );
    } );
} );
