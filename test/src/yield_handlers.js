/**
 * Created by Aaron on 7/10/2015.
 */


import Promise from 'bluebird';
import assert from 'assert';

import {coroutine, addYieldHandler} from '../../';

coroutine.addYieldHandler( function( value ) {
    if( value === 13 ) {
        return Promise.resolve( 10 );
    }
} );

class MyModel {
    constructor( value ) {
        this._value = value;
    }

    fetch() {
        return Promise.resolve( `${this._value} result` );
    }
}

class MyOtherModel {

}

class MyObjectModel extends Object {
    constructor( value ) {
        super();

        this.value = Promise.resolve( value );
    }
}

coroutine.addYieldHandler( function( value ) {
    if( value instanceof MyModel ) {
        return value.fetch();
    }
} );

describe( 'yield with custom handler', function() {
    it( 'should provide a consistent interface for adding yield handlers', function() {
        assert.strictEqual( coroutine.addYieldHandler, addYieldHandler );
    } );

    it( 'should work with simple yields', function() {
        let test1 = async function() {
            let res = await 13;

            assert.strictEqual( res, 10 );
        };

        return test1();
    } );

    it( 'should work with nested yields', function() {
        let test2 = async function() {
            let res = await {
                k: 13,
                v: [13, 13]
            };

            assert.deepEqual( res, {k: 10, v: [10, 10]} );
        };

        return test2();
    } );

    it( 'should work with nested yields of class instances', function() {
        let test3 = async function() {
            let data = await {
                model1: new MyModel( 'something' ),
                model2: [new MyModel( 1 ), new MyModel( 2 )]
            };

            assert.deepEqual( data, {
                model1: 'something result',
                model2: ['1 result', '2 result']
            } );
        };

        return test3();
    } );

    it( 'should throw with yields of unknown types', function() {
        let test4 = async function() {
            try {
                let a = await new MyOtherModel();

                throw new Error( 'lol' );

            } catch( err ) {
                assert( err instanceof TypeError );
                assert( err.message.indexOf( 'yield' ) !== -1 );
            }
        };

        return test4();
    } );

    it( 'should silently ignore nested yields of unknown types', function() {
        let test5 = async function() {
            let a = await {
                model1: new MyOtherModel()
            };

            assert.deepEqual( a, {
                model1: {}
            } );

            assert( a.model1 instanceof MyOtherModel );
        };

        return test5();
    } );

    it( 'should consider classes that inherit from Object as objects', function() {
        let test6 = async function() {
            try {
                let a = await new MyObjectModel( 5 );

                assert.strictEqual( a.value, 5 );

            } catch( err ) {
                assert.ifError( err );

                throw err;
            }
        };

        return test6();
    } )
} );
