'use strict'
/*
    MIT License

    Copyright (c) 2021 Andrew S (Andrews54757@gmail.com)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

/**
 * A 2d bounding box represented by a point and sizes.
 * @typedef {Object} BoundsPS
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * A 2d bounding box represented by min/max points.
 * @typedef {Object} BoundsMM
 * @property {number} minX
 * @property {number} minY
 * @property {number} maxX
 * @property {number} maxY
 */

/**
 * An object representing a 2d bounding box.
 * @typedef {BoundsPS|BoundsMM} Bounds
 */

/**
 * Represents an entry
 * @typedef {Object} Entry
 */

/**
 * Represents an entry's cache object
 * @typedef {Object} EntryCache
 */

/**
 * Callback function used in .forEach() calls
 * @callback ForEachCallback
 * @param {Entry} entry - Entry
 */

/**
 * Callback function used in .every() calls
 * @callback EveryCallback
 * @param {Entry} entry - Entry
 * @returns {boolean} - Return true to continue iteration, false to cancel.
 */

const HashGrid = require('./HashGrid.js')

/**
 * HashBounds
 *
 * Stores/Organizes arbitrary objects with 2d bounding box data in the form of a spatial grid tree that is quick to query.
 * It is particularily efficient when objects have varying sizes. Constant time insertion and removal, and n log n search.
 */
class HashBounds {
  /**
    * Initialize a HashBounds instance
    * @param {number} minSize - The size of the smallest grid cell.
    * @param {number} levelCount - Specifies the number of levels/depth. Each additional level has a grid size twice as large then the previous in one axis, 4x size in area.
    * @param {Bounds=} initialBounds - Optionally specifies the bounds used to pre-initilize the datastructure. These bounds are not enforced.
    * @param {number=} id - Optionally specify a unique ID of the hash.
    *
    * @throws Error if levelCount is smaller than 1
    */
  constructor (minSize, levelCount, initialBounds, id) {
    if (levelCount < 1) {
      throw new Error('Level count must be at least 1!')
    }
    this.ID = id === undefined ? HashBounds.LAST_ID++ : id

    this.MIN_SIZE = minSize
    this.MIN_SIZE_INV = 1 / this.MIN_SIZE
    this.LEVEL_COUNT = levelCount
    this.INITIAL_BOUNDS = initialBounds || {}
    HashBounds.convertBounds(this.INITIAL_BOUNDS)
    this.LEVELS = []
    this.BASE = undefined
    this.LOG2CACHE = undefined
    this.QUERYID = 0
    this.setupLog2()
    this.init()
  }

  /**
    * Returns an incremented number used to filter non-unique entries during search queries.
    * @returns {number}
    */
  getQueryID () {
    if (this.QUERYID >= 4294967295) {
      this.QUERYID = -1
      this.forEach((obj) => {})
    }
    return this.QUERYID++
  }

  /**
    * Initializes a dictionary of ceiled log2 values that are frequently used by the data structure
    */
  setupLog2 () {
    const pow = Math.pow(2, this.LEVEL_COUNT - 2) + 1
    this.LOG2CACHE = new Uint8Array(pow)
    for (let i = 0; i < pow; ++i) {
      // Interesting tidbit: equivalent to place of most significant bit of numerical representation.
      this.LOG2CACHE[i] = Math.ceil(Math.log2(i))
    }
  }

  /**
    * Initializes the basic hierarchical structure of levels.
    */
  createLevels () {
    // Initialize the levels
    for (let level = 0; level < this.LEVEL_COUNT; level++) {
      this.LEVELS[level] = new HashGrid(this.MIN_SIZE * Math.pow(2, level), level, this.INITIAL_BOUNDS)
    }

    // Set the inter-grid references
    for (let level = 0; level < this.LEVEL_COUNT; level++) {
      this.LEVELS[level].PREV_GRID = level > 0 ? this.LEVELS[level - 1] : undefined
      this.LEVELS[level].NEXT_GRID = level < this.LEVEL_COUNT - 1 ? this.LEVELS[level + 1] : undefined
    }

    // Set the base (largest grid)
    this.BASE = this.LEVELS[this.LEVEL_COUNT - 1]
  }

  /**
    * Pre-initializes an area according to some bounds
    */
  initializeArea (initialBounds) {
    this.LEVELS[0].initializeArea(initialBounds)
  }

  /**
    * Initializes the data structure and pre-initializes area if applicable
    */
  init () {
    this.createLevels()
    this.initializeArea(this.INITIAL_BOUNDS)
  }

  /**
    * Clear the data structure and reinitialize it.
    */
  clear () {
    this.LEVELS = []
    this.ID = HashBounds.LAST_ID++
    this.init()
  }

  /**
    * Removes empty buckets.
    */
  prune () {
    this.LEVELS[0].prune()
  }

  /**
    * Updates the entry when its bounds have changed.
    * @param {Entry} entry - The entry to update.
    * @param {Bounds} bounds - The 2d bounding box of the entry.
    * @returns {boolean} A boolean value that is true to indicate something has changed
    *
    * @throws Will throw an error if the entry is not present.
    */
  update (entry, bounds) {
    if (!this.contains(entry)) {
      throw new Error('ERR: Entry is not in this hash!')
    }
    HashBounds.convertBounds(bounds)
    const cache = this.getHashCache(entry)
    const prev = cache.cachedIndex
    const level = this.getLevel(bounds, cache)

    if (prev !== level) {
      this.LEVELS[prev].remove(cache)
      this.LEVELS[level].insert(entry, bounds, cache)
      return true
    } else {
      return this.LEVELS[level].update(entry, bounds, cache)
    }
  }

  /**
    * Gets the level index the entry should belong to with the appropriate bounding box.
    * @param {Bounds} bounds - The 2d bounding box of the entry.
    * @param {EntryCache} entryCache - Cache object
    *
    * @returns {number} The index of the level.
    */
  getLevel (bounds, entryCache) {
    if (entryCache.cacheWidth === bounds.width && entryCache.cacheHeight === bounds.height) {
      return entryCache.cachedIndex
    }

    const i = Math.ceil(Math.max(bounds.width, bounds.height) * this.MIN_SIZE_INV)
    const index = i >= this.LOG2CACHE.length ? this.LEVEL_COUNT - 1 : this.LOG2CACHE[i]

    entryCache.cachedIndex = index
    entryCache.cacheWidth = bounds.width
    entryCache.cacheHeight = bounds.height

    return index
  }

  /**
    * Inserts a entry with a specified 2d bounding box.
    * @param {Entry} entry - The entry to insert.
    * @param {Bounds} bounds - The 2d bounding box of the entry.
    *
    * @throws Will throw an error if the entry is already present.
    */
  insert (entry, bounds) {
    if (this.contains(entry)) {
      throw new Error('ERR: An entry cannot be already in this hash!') // check if it already is inserted
    } else {
      if (entry._HashBounds === undefined) entry._HashBounds = {}
      if (entry._HashBounds[this.ID] === undefined) {
        entry._HashBounds[this.ID] = {
          k1x: 0,
          k1y: 0,
          k2x: 0,
          k2y: 0,
          indexes: [0, 0, 0, 0],
          cachedIndex: 0,
          cacheWidth: 0,
          cacheHeight: 0,
          hashID: this.ID,
          isInHash: false
        }
        entry._HashBoundsTempCheck = -1
      }
    }

    HashBounds.convertBounds(bounds)
    const cache = this.getHashCache(entry)
    cache.isInHash = true
    this.LEVELS[this.getLevel(bounds, cache)].insert(entry, bounds, cache)
  }

  /**
    * Removes an entry.
    * @param {Entry} entry - The entry to remove.
    *
    * @throws Will throw an error if the entry is not present.
    */
  remove (entry) {
    if (!this.contains(entry)) throw new Error('ERR: Entry is not in this hash!')
    const cache = this.getHashCache(entry)
    this.LEVELS[cache.cachedIndex].remove(cache)
    cache.isInHash = false
  }

  /**
    * Returns true if the entry is present.
    * @param {Entry} entry
    * @returns {Boolean}
    */
  contains (entry) {
    return entry._HashBounds !== undefined && entry._HashBounds[this.ID] !== undefined && entry._HashBounds[this.ID].isInHash
  }

  /**
    * Returns the cache object from a entry
    * @param {Entry} entry
    * @returns {EntryCache}
    */
  getHashCache (entry) {
    return entry._HashBounds[this.ID]
  }

  /**
    * Retrieves an array of unique entries that may overlap with a 2d bounding box.
    * @param {Bounds=} bounds - A 2d bounding box to search.
    * @returns {Array} An array of entries.
    */
  toArray (bounds) {
    if (bounds !== undefined) { HashBounds.convertBounds(bounds) }

    const arr = []
    this.BASE.every(bounds, (obj) => {
      arr.push(obj)
      return true
    }, this.getQueryID())

    return arr
  }

  /**
    * Iterates through unique entries that may overlap with a 2d bounding box. Iteration may be stopped.
    *
    * Similar to Array.every
    *
    * @param {Bounds=} bounds - A 2d bounding box to search.
    * @param {EveryCallback} call - A callback function with the first argument indicating the entry. Return true to continue iteration, return false to stop.
    * @returns {boolean} Returns false if cancelled.
    */
  every (bounds, call) {
    if (call === undefined) {
      call = bounds
      bounds = undefined
    } else if (bounds !== undefined) { HashBounds.convertBounds(bounds) }

    return this.BASE.every(bounds, call, this.getQueryID())
  }

  /**
    * Iterates through unique entries that may overlap with a 2d bounding box. Iteration cannot be stopped.
    *
    * Similar to Array.forEach
    *
    * @param {Bounds=} bounds - A 2d bounding box to search.
    * @param {ForEachCallback} call - A callback function with the first argument indicating the entry.
    */
  forEach (bounds, call) {
    if (call === undefined) {
      call = bounds
      bounds = undefined
    } else if (bounds !== undefined) { HashBounds.convertBounds(bounds) }

    this.BASE.every(bounds, (obj) => {
      call(obj)
      return true
    }, this.getQueryID())
  }

  /**
    * Check if bounds exceeds the pre-initialized size of the datastructure
    * @param {Bounds} bounds
    * @returns {boolean}
    */
  boundsFitsInHash (bounds) {
    HashBounds.convertBounds(bounds)
    return HashBounds.boundsContains(bounds, this.INITIAL_BOUNDS)
  }
}
HashBounds.LAST_ID = 0

/**
    * Converts a min-max 2d bound to pos-size format in place
    * @param {Bounds} bounds
    */
HashBounds.mmToPS = function (bounds) {
  bounds.x = bounds.minX
  bounds.y = bounds.minY
  bounds.width = bounds.maxX - bounds.minX
  bounds.height = bounds.maxY - bounds.minY
}

/**
  * Converts a pos-size 2d bound to min-max format in place
  * @param {Bounds} bounds
  */
HashBounds.psToMM = function (bounds) {
  bounds.minX = bounds.x
  bounds.minY = bounds.y

  bounds.maxX = bounds.x + bounds.width
  bounds.maxY = bounds.y + bounds.height
}

/**
  * Checks if two 2d bounding boxes are overlapping.
  * @param {Bounds} bounds1
  * @param {Bounds} bounds2
  * @returns {boolean}
  */
HashBounds.boundsOverlap = function (bounds1, bounds2) {
  return !(bounds1.minX > bounds2.maxX || bounds1.minY > bounds2.maxY || bounds1.maxX < bounds2.minX || bounds1.maxY < bounds2.minY)
}

/**
  * Checks if one 2d bounding box is fully contained in another.
  * @param {Bounds} bounds1 - Inner box
  * @param {Bounds} bounds2 - Outer box
  * @returns {boolean}
  */
HashBounds.boundsContains = function (bounds1, bounds2) {
  return bounds1.minX >= bounds2.minX && bounds1.maxX <= bounds2.maxX && bounds1.minY >= bounds2.minY && bounds1.maxY <= bounds2.maxY
}

/**
  * Truncates bounds to fit a certain area
  * @param {Bounds} bounds
  * @param {number} minX
  * @param {number} minY
  * @param {number} maxX
  * @param {number} maxY
  * @throws Will throw error if bounds are unformatted.
  */
HashBounds.truncateBounds = function (bounds, minX, minY, maxX, maxY) {
  if (bounds.TYPE === 1) {
    bounds.x = Math.max(bounds.x, minX)
    bounds.y = Math.max(bounds.y, minY)

    if (bounds.x + bounds.width > maxX) {
      bounds.width = maxX - bounds.x
    }
    if (bounds.y + bounds.height > maxY) {
      bounds.height = maxY - bounds.y
    }
  } else if (bounds.TYPE === 2) {
    bounds.minX = Math.max(bounds.minX, minX)
    bounds.minY = Math.max(bounds.minY, minY)
    bounds.maxX = Math.min(bounds.maxX, maxX)
    bounds.maxY = Math.min(bounds.maxY, maxY)
  } else {
    throw new Error('ERR: Bound not formatted! Please make sure bounds were put through the convertBounds function')
  }
}

/**
  * Formats/converts 2d bounding boxes.
  * @param {Bounds} bounds
  * @throws Error if invalid
  */
HashBounds.convertBounds = function (bounds) {
  if (bounds.TYPE === undefined) {
    if (bounds.x !== undefined) {
      HashBounds.psToMM(bounds)
      bounds.TYPE = 1
    } else {
      HashBounds.mmToPS(bounds)
      bounds.TYPE = 2
    }
  } else if (bounds.TYPE === 1) {
    HashBounds.psToMM(bounds)
  } else if (bounds.TYPE === 2) {
    HashBounds.mmToPS(bounds)
  } else {
    throw new Error('Invalid bounds!')
  }
}

module.exports = HashBounds
