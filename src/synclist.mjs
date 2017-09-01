/**
 * rx-firebase/sync-list.js
 */

const meths = {
  findIndexByKey: {
    value(key) {
      return this.findIndex(s => s.$key === key);
    }
  },

  push: {
    value(snapshot) {
      if (!snapshot.$prev) {
        Array.prototype.unshift.call(this, snapshot);

        return this;
      }

      const index = this.findIndexByKey(snapshot.$prev);

      Array.prototype.splice.call(this, index + 1, 0, snapshot);

      return this;
    }
  },

  remove: {
    value(snapshot) {
      const index = this.findIndexByKey(snapshot.$key);

      if (index < 0) {
        return this;
      }

      Array.prototype.splice.call(this, index, 1);

      return this;
    }
  },

  update: {
    value(snapshot) {
      const index = this.findIndexByKey(snapshot.$key);

      if (index < 0) {
        return this.push(snapshot);
      }

      if (this[index].$prev !== snapshot.$prev) {
        Array.prototype.splice.call(this, index, 1);

        return this.push(snapshot);
      }

      Array.prototype.splice.call(this, index, 1, snapshot);

      return this;
    }
  },

  move: {
    value(snapshot) {
      return this.remove(snapshot).push(snapshot);
    }
  }
};

['copyWithin', 'fill', 'pop', 'reverse', 'shift', 'sort', 'splice', 'unshift'].reduce((meths, name) => {
  meths[name] = {
    value() {
      const copy = this.slice();

      return copy[name].apply(copy, arguments);
    }
  };

  return meths;
}, meths);

/**
 * Create a new sync list
 *
 * @return {array}
 */
export default function create() {
  const arr = [];

  Object.defineProperties(arr, meths);

  return arr;
}
