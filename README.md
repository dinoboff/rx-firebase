# Rx Firebase

[![Build Status](https://travis-ci.org/dinoboff/rx-firebase.svg?branch=master)](https://travis-ci.org/dinoboff/rx-firebase)
[![Coverage Status](https://coveralls.io/repos/github/dinoboff/rx-firebase/badge.svg?branch=master)](https://coveralls.io/github/dinoboff/rx-firebase?branch=master)
[![Dependency Status](https://gemnasium.com/dinoboff/rx-firebase.svg)](https://gemnasium.com/dinoboff/rx-firebase)


Extends Firebase websocket client with RxJS methods.


## Install

```shell
npm install rx-firebase firebase@3 rxjs
```

## Usage

Extends firebase using RxJS (any ES stage 1 Observable supporting `map`, `merge`
 and `scan` operators could be used):
```javascript
const rxFirebase = require('rx-firebase');
const firebase = require('firebase');
const rx = require('rxjs');

rxFirebase.extend(firebase, rx.Observable);
```

You can then observe auth changes:
```javascript
firebase.auth().observeAuthState().subscribe(
  user => console.log(user)
)
```

Or observe database changes:
```javascript
const ref = firebaseApp.database().ref('/some/data');

ref('/some/data').observe('value').subscribe(
  val => console.log(val, `val: ${val}`);
);

ref.set('first');
// Output:
// {$value: 'first'} val: first

ref.set({some: 'thing'});
// Output:
// {some: 'thing'} val: [object Object]
```

It emits the DataSnapShot value as an object. If the value is a literal, it will
emit an object with the value assign to "$value" with "toString" and "toJSON"
methods pointing to "$value".

If you would like the observable to emit the snapshot itself:
```javascript
ref('/some/data').observe('value', {unpack: false});
```

In any case, the object will also include the "$key", "$ref", "prev" and
"$eventType" properties.

Finally, you can use `observeChildren` to emit an array
```javascript
const otherRef = firebaseApp.database().ref('/some/other/data');

otherRef.push().setWithPriority('first', 1);
otherRef.push().setWithPriority('second', 2);
otherRef.orderByPriority().observeChildren().subscribe(
  list => console.log(list, list.join(','));
);
// Output:
// [{$value: 'first'}] "first"
// [{$value: 'first'}, {$value: 'second'}] "first","second"
```

It observes the "child_*" changes to emit an ordered array. Note that you
cannot update the array to update the underlying data in the Firebase database.

Each item includes "$ref" and "$key" property referencing the item firebase
reference and key.
