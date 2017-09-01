/**
 * rx-firebase - Firebase RxJS extensions.
 */
import syncList from 'rx-firebase/sync-list.js';

/**
 * Extends firebase.auth.Auth and firebase.database.Query with methods returning
 * Observable instead of taking callback function.
 *
 * @param  {firebase}   firebase
 * @param  {Observable} Observable A ES stage 1 Observable extended with the
 *                                 "map", "merge" and "scan" operator.
 */
export function extend(firebase, Observable) {

  /**
   * Create an observable emitting user status change.
   *
   * Note: This is creating a cold observable; it will only start watching auth
   * when subscribing to it.
   *
   * @example
   * firebaseApp.auth().observeAuthState().subscribe(
   *   user => console.log('UID: ' + user.uid)
   * );
   *
   * @return {Observable}
   */
  firebase.auth.Auth.prototype.observeAuthState = function() {
    return new Observable(this.onAuthStateChanged.bind(this));
  };

  /**
   * Create a (cold) observable emitting changes over a firebase data reference
   * or query.
   *
   * The values are unpacked by default. Literal values are unpacked into
   * a "$value" property with toString and toJSON returning the literal the
   * "$value" property.
   *
   * Options:
   *
   * - "unpack": set to false to not unpack.
   * - "toString": set to false to not provide toString to unpacked literal
   * values.
   * - "toJSON": set to false to not provide toJSON to unpacked literal values.
   *
   * @example
   * firebaseApp.database().ref('/some/data').observe('value').subscribe(
   *   value => console.log('some data value: ' + value)
   * )
   *
   * @param   {string}     eventType "value", "child_added", "child_removed",
   *                                 "child_changed" or "child_moved".
   * @options {Object}     options   unpacking options.
   * @return  {Observable}
   */
  firebase.database.Query.prototype.observe = function(eventType, options) {
    options = Object.assign({
      toString: true,
      toJSON: true
    }, options);

    if (options.unpack === true || options.unpack === undefined) {
      options.unpack = snapshot => snapshot.val();
    } else if (options.unpack === false) {
      options.unpack = snapshot => snapshot;
    }

    return new Observable(observer => {
      const handler = (snapshot, prev) => observer.next(
        unpackSnapShot(snapshot, prev, eventType, options)
      );
      const onError = err => observer.error(err);

      this.on(eventType, handler, onError);

      return () => this.off(eventType, handler);
    });
  };

  /**
   * Create a (cold) observable emitting a firebase data reference
   * sorted array of its children snapshot.
   *
   * @example
   * const ref = firebaseApp.database().ref('/some/data');
   *
   * ref.push().setWithPriority({name: 'first'}, 1);
   * ref.push().setWithPriority({name: 'second'}, 2);
   * ref('/some/data').orderByPriority().observeChildren().subscribe(
   *   list => console.log(list);
   * );
   * // Output:
   * // [{name: 'first'}]
   * // [{name: 'first'}, {name: 'second'}]
   * //
   * // (you could use RxJS `debounce` operator to only emit the list if it's
   * // stable).
   * const otherRef = firebaseApp.database().ref('/some/other/data');
   *
   * otherRef.push().setWithPriority('first', 1);
   * otherRef.push().setWithPriority('second', 2);
   * otherRef('/some/data').orderByPriority().observeChildren().subscribe(
   *   list => console.log(list);
   * );
   * // Output:
   * // [{$value: 'first'}]
   * // [{$value: 'first'}, {$value: 'second'}]
   *
   * @param  {boolean|function} unpack Should the snapshot be unpacked to their values?
   * @return {Observable}              Emit the sorted array of children each time one is updated.
   */
  firebase.database.Query.prototype.observeChildren = function(options) {
    // Each child event will be mapped to function to edit the sync-list.
    //
    // Insert a node
    const seed = syncList();

    const addChild = this.observe('child_added', options).map(ss => list => list.push(ss));
    // Replace a node with a new ss
    const resetChild = this.observe('child_changed', options).map(ss => list => list.update(ss));
    // Replace a node with a new ss at a different index
    const moveChild = this.observe('child_moved', options).map(ss => list => list.move(ss));
    // Remove a node
    const removeChild = this.observe('child_removed', options).map(ss => list => list.remove(ss));

    return addChild.merge(resetChild).merge(moveChild).merge(removeChild).scan(
      (list, fn) => fn(list), seed
    ).startWith(seed);
  };
}

function unpackSnapShot(snapShot, prev, eventType, options) {
  const val = options.unpack(snapShot);

  return Object.defineProperties(wrapValue(val, options), {
    $prev: {value: prev},
    $eventType: {value: eventType},
    $key: {value: snapShot.key},
    $ref: {value: snapShot.ref}
  });
}

function wrapValue(val, options) {
  if (Object.isExtensible(val)) {
    return val;
  }

  const props = {};

  if (options.toString) {
    props.toString = {
      value() {
        return this.$value.toString();
      },
      writable: true
    };
  }

  if (options.toJSON) {
    props.toJSON = {
      value() {
        return this.$value;
      },
      writable: true
    };
  }

  return Object.defineProperties({$value: val}, props);
}
