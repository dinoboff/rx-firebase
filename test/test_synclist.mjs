/* eslint max-nested-callbacks: off */
import {expect} from './chai';
import syncList from '../src/synclist';

function ss($key, $prev, other) {
  return {$key, $prev, other};
}

describe('sync-list', function() {
  let list;

  beforeEach(function() {
    list = syncList();
  });

  describe('create', function() {

    it('should create an extended array', function() {
      expect(list).to.be.an('array');
      expect(list.move).to.be.a('function');
      expect(list.remove).to.be.a('function');
      expect(list.update).to.be.a('function');
    });

    it('should not add enumerable properties', function() {
      expect(Object.keys(list)).to.eql([]);
    });

  });

  describe('push', function() {

    it('should keep list in order', function() {
      list.push(ss('bread'));
      list.push(ss('egglike', 'bread'));
      list.push(ss('eggs', 'bread'));   // 'egglike' should would get an update too
      list.push(ss('bacon', 'egglike'));

      expect(list.map(ss => ss.$key)).to.eql(['bread', 'eggs', 'egglike', 'bacon']);
    });

  });

  describe('remove', function() {

    it('should remove an element', function() {
      list.push(ss('bread'));
      list.push(ss('eggs', 'bread'));
      list.push(ss('bacon', 'eggs'));
      list.remove(ss('eggs', 'bread'));

      expect(list.map(ss => ss.$key)).to.eql(['bread', 'bacon']);
    });

    it('should fail gracefully', function() {
      list.push(ss('bread'));
      list.push(ss('bacon', 'bread'));
      list.remove(ss('eggs', 'bread'));

      expect(list.map(ss => ss.$key)).to.eql(['bread', 'bacon']);
    });

  });

  describe('update', function() {

    it('should replace an item', function() {
      list.push(ss('bread'));
      list.push(ss('eggs', 'bread'));
      list.push(ss('bacon', 'eggs'));
      list.update(ss('eggs', 'bread', 'foo'));
      expect(list.map(ss => ss.other)).to.eql([undefined, 'foo', undefined]);
    });

    it('should replace an item and move it', function() {
      list.push(ss('bread'));
      list.push(ss('eggs', 'bread'));
      list.push(ss('bacon', 'eggs'));
      list.update(ss('eggs', 'bacon', 'foo'));

      expect(list.map(ss => ss.$key)).to.eql(['bread', 'bacon', 'eggs']);
      expect(list.map(ss => ss.other)).to.eql([undefined, undefined, 'foo']);
    });

  });

  describe('move', function() {

    it('should move an item', function() {
      list.push(ss('bread'));
      list.push(ss('eggs', 'bread'));
      list.push(ss('bacon', 'eggs'));
      list.move(ss('eggs', 'bacon', 'foo'));

      expect(list.map(ss => ss.$key)).to.eql(['bread', 'bacon', 'eggs']);
      expect(list.map(ss => ss.other)).to.eql([undefined, undefined, 'foo']);
    });

  });

  [
    ['copyWithin', 0, 3],
    ['fill', 1],
    ['pop'],
    ['reverse'],
    ['shift'],
    ['sort'],
    ['splice', 0, 1],
    ['unshift', 1]
  ].forEach(function(options) {
    const name = options[0];
    const args = options.slice(1);

    describe(name, function() {

      it('should not mutate the list', function() {
        list.push(ss('bread'));
        list.push(ss('eggs', 'bread'));
        list.push(ss('bacon', 'eggs'));
        list[name].apply(list, args);

        expect(list.map(ss => ss.$key)).to.eql(['bread', 'eggs', 'bacon']);
      });

    });
  });

});
