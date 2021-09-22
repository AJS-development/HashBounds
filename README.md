[![NPM](https://img.shields.io/badge/Module-Npm-blue.svg)](https://www.npmjs.com/package/hashbounds)
[![Demo](https://cloud.githubusercontent.com/assets/13282284/23081424/b7cd5f16-f522-11e6-8fe9-dfdde154340d.png)](https://threeletters.github.io/HashBounds/dist/visual/)

# HashBounds

Collision detection optimized 2d datastructure for usage in games. Particularily useful when:
* Objects have varying sizes
* Objects are continually moving
* Map size is not determinable/fixed at start

# Usage

> npm install hashbounds

```js
const HashBounds = require("hashbounds");

// Initialize hashbounds with min grid size of 16 and 3 levels and pre-initialize buckets in 1000x1000 map.
let myData = new HashBounds(16, 3, {
    x: 0,
    y: 0,
    width: 1000,
    height: 1000
});

// You don't have to pre-initialize buckets
myData = new HashBounds(16, 3);

// An entry is some sort of object
const entry = {
    foo: "bar"
}
// Insert an entry
myData.insert(entry, {
    x: 0,
    y: 0,
    width: 10,
    height: 10
});

// Get array at bounds
myData.toArray({ x: 0, y: 0, width: 5, height: 5 }).length // 1

// Iterate at bounds
myData.forEach({ x: 0, y: 0, width: 5, height: 5 }, (item)=>{

});

// Iterate at bounds cancellable
myData.every({ x: 0, y: 0, width: 5, height: 5 }, (item)=>{
    return true; // True to continue iteration
});

// Update the entry's bounds
myData.update(entry, {
    x: 10,
    y: 10,
    width: 3,
    height: 4
});

// You can also use min/max format for all bounds.
myData.update(entry, {
    minX: 10,
    minY: 10,
    maxX: 13,
    maxY: 14
});

// Remove entry
myData.remove(entry);

```

# API
