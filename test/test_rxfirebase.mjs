/* eslint babel/object-shorthand: off */
import {expect, sinon} from './chai.mjs';
import Rx from 'rxjs/Rx';

import {extend} from '../src/index.mjs';

describe('extend', function() {
  let firebase;

  beforeEach(function() {
    const Auth = function() {};
    const Query = function() {};

    firebase = {
      auth: {Auth},
      database: {Query}
    };

    firebase.auth.Auth.prototype = {
      onAuthStateChanged: sinon.stub()
    };
    firebase.database.Query.prototype = {
      on: sinon.stub(),
      off: sinon.spy()
    };

    extend(firebase, Rx.Observable);
  });

  it('should extend firebase auth', function() {
    expect(firebase.auth.Auth.prototype.observeAuthState).to.be.a('function');
  });

  describe('Auth.observeAuthState', function() {
    let unsub, observable;

    beforeEach(function() {
      unsub = sinon.spy();
      firebase.auth.Auth.prototype.onAuthStateChanged.returns(unsub);

      observable = new firebase.auth.Auth().observeAuthState();
    });

    it('should return an observable', function() {
      expect(observable.subscribe).to.be.a('function');
    });

    it('should subscribe to onAuthStateChanged on subscription', function() {
      const sub = observable.subscribe();
      const authObserver = firebase.auth.Auth.prototype.onAuthStateChanged.lastCall.args[0];

      expect(firebase.auth.Auth.prototype.onAuthStateChanged).to.have.been.calledOnce;
      expect(authObserver.next).to.be.a('function');
      expect(authObserver.error).to.be.a('function');
      expect(authObserver.complete).to.be.a('function');
      expect(sub.unsubscribe).to.be.a('function');
    });

    it('should emit auth changes', function() {
      const user = {uid: 'bob'};
      const promise = observable.take(3).toArray().toPromise();
      const authObserver = firebase.auth.Auth.prototype.onAuthStateChanged.lastCall.args[0];

      authObserver.next(null);
      authObserver.next(user);
      authObserver.next(null);

      return promise.then(
        result => expect(result).to.eql([null, user, null])
      );
    });

    it('should clean up on unsubscribe', function() {
      observable.subscribe().unsubscribe();
      expect(unsub).to.have.been.calledOnce;
    });

  });

  describe('Query.observe', function() {
    let query, observable;

    beforeEach(function() {
      query = new firebase.database.Query();
      observable = query.observe('child_added');
    });

    it('should return an observable', function() {
      expect(observable.subscribe).to.be.a('function');
    });

    it('should subscribe to change and error event', function() {
      observable.subscribe();

      expect(query.on).to.have.been.calledOnce;
      expect(query.on).to.have.been.calledWithExactly('child_added', sinon.match.func, sinon.match.func);
    });

    it('should emit snapshot value', function() {
      const promise = observable.take(2).toArray().toPromise();
      const next = query.on.lastCall.args[1];
      const snapshot1 = makeSnapShot('someKey', {some: 'value'});
      const snapshot2 = makeSnapShot('someOtherKey', 'literalValue');

      next(snapshot1);
      next(snapshot2, 'someKey');

      return promise.then(values => {
        expect(values).to.have.length(2);

        expect(values[0].$key).to.equal('someKey');
        expect(values[0].$ref).to.equal(snapshot1.ref);
        expect(values[0].$prev).to.equal(undefined);
        expect(values[0].$eventType).to.equal('child_added');
        expect(values[0].some).to.equal('value');
        expect(JSON.stringify(values[0])).to.equal('{"some":"value"}');

        expect(values[1].$key).to.equal('someOtherKey');
        expect(values[1].$ref).to.equal(snapshot2.ref);
        expect(values[1].$prev).to.equal('someKey');
        expect(values[1].$eventType).to.equal('child_added');
        expect(values[1].$value).to.equal('literalValue');
        expect(`${values[1]}`).to.equal('literalValue');
        expect(JSON.stringify({val: values[1]})).to.equal('{"val":"literalValue"}');
      });
    });

    it('should emit snapshot literal value without toString method', function() {
      const promise = query.observe('child_added', {toString: false}).take(1).toPromise();
      const next = query.on.lastCall.args[1];
      const snapshot2 = makeSnapShot('someOtherKey', 'literalValue');

      next(snapshot2, 'someKey');

      return promise.then(value => {
        expect(`${value}`).to.equal('[object Object]');
        expect(JSON.stringify({val: value})).to.equal('{"val":"literalValue"}');
      });
    });

    it('should emit snapshot literal value without toJSON method', function() {
      const promise = query.observe('child_added', {toJSON: false}).take(1).toPromise();
      const next = query.on.lastCall.args[1];
      const snapshot2 = makeSnapShot('someOtherKey', 'literalValue');

      next(snapshot2, 'someKey');

      return promise.then(value => {
        expect(`${value}`).to.equal('literalValue');
        expect(JSON.stringify({val: value})).to.equal('{"val":{"$value":"literalValue"}}');
      });
    });

    it('should emit snapshot', function() {
      const promise = query.observe('child_added', {unpack: false}).take(2).toArray().toPromise();
      const next = query.on.lastCall.args[1];
      const snapshot1 = makeSnapShot('someKey', {some: 'value'});
      const snapshot2 = makeSnapShot('someOtherKey', 'literalValue');

      next(snapshot1);
      next(snapshot2, 'someKey');

      return promise.then(values => {
        expect(values).to.have.length(2);

        expect(values[0].$key).to.equal('someKey');
        expect(values[0].$ref).to.equal(snapshot1.ref);
        expect(values[0].$prev).to.equal(undefined);
        expect(values[0].$eventType).to.equal('child_added');
        expect(values[0].val()).to.eql({some: 'value'});

        expect(values[1].$key).to.equal('someOtherKey');
        expect(values[1].$ref).to.equal(snapshot2.ref);
        expect(values[1].$prev).to.equal('someKey');
        expect(values[1].$eventType).to.equal('child_added');
        expect(values[1].val()).to.equal('literalValue');
      });
    });

    it('should emit error', function() {
      const promise = observable.take(1).toPromise();
      const error = query.on.lastCall.args[2];
      const err = new Error('err');

      error(err);

      return promise.catch(
        e => expect(e).to.equal(err)
      );
    });

    it('should unsubscribe', function() {
      const sub = observable.subscribe();
      const next = query.on.lastCall.args[1];

      sub.unsubscribe();

      expect(query.off).to.have.been.calledOnce;
      expect(query.off).to.have.been.calledWithExactly('child_added', next);
    });

    it('should unsubscribe on error', function() {
      const promise = observable.toPromise();
      const next = query.on.lastCall.args[1];
      const error = query.on.lastCall.args[2];
      const err = new Error('err');

      error(err);

      return promise.catch(() => {
        expect(query.off).to.have.been.calledOnce;
        expect(query.off).to.have.been.calledWithExactly('child_added', next);
      });
    });

  });

  describe('Query.observeChildren', function() {
    let query, unpack, added, removed, moved, changed, close;

    beforeEach(function() {
      added = new Rx.Subject();
      removed = new Rx.Subject();
      moved = new Rx.Subject();
      changed = new Rx.Subject();

      query = new firebase.database.Query();
      sinon.stub(query, 'observe');

      query.observe.withArgs('child_added', unpack).returns(added);
      query.observe.withArgs('child_removed', unpack).returns(removed);
      query.observe.withArgs('child_moved', unpack).returns(moved);
      query.observe.withArgs('child_changed', unpack).returns(changed);

      close = () => {
        added.complete();
        removed.complete();
        moved.complete();
        changed.complete();
      };
    });

    it('should observe child_* events', function() {
      query.observeChildren();

      expect(query.observe).to.have.callCount(4);
      expect(query.observe).to.have.been.calledWithExactly('child_added', undefined);
      expect(query.observe).to.have.been.calledWithExactly('child_removed', undefined);
      expect(query.observe).to.have.been.calledWithExactly('child_moved', undefined);
      expect(query.observe).to.have.been.calledWithExactly('child_changed', undefined);
    });

    it('should sync child_* events with an array', function() {
      const promise = query.observeChildren().toPromise();

      added.next(makeValue('key1', 'baacon'));
      added.next(makeValue('key2', 'eggs', 'key1'));
      added.next(makeValue('key3', 'eggs', 'key2'));
      added.next(makeValue('key4', 'bread', 'key3'));
      removed.next(makeValue('key3', 'eggs', 'key2'));
      moved.next(makeValue('key4', 'bread'));
      changed.next(makeValue('key1', 'bacon', 'key4'));

      close();

      return promise.then(
        result => expect(result.map(v => v.$value).join(',')).to.eql('bread,bacon,eggs')
      );
    });

  });
});

function makeSnapShot(key, val) {
  return {
    key,
    ref: {},
    val: () => val
  };
}

function makeValue($key, $value, $prev) {
  return {$key, $prev, $value};
}
