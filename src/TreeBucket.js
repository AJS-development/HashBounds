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
 * TreeBucket.
 *
 * The class that actually contains the data
 */
class TreeBucket {
  /**
    * Constructor for TreeBucket
    * @param {number} bucketX
    * @param {number} bucketY
    * @param {number} bucketSize
    */
  constructor (bucketX, bucketY, bucketSize) {
    this.PARENT = undefined

    this.CHILDREN = [undefined, undefined,
      undefined, undefined]

    this.BUCKET_SIZE = bucketSize
    this.COUNTER = 0
    this.BUCKET_X = bucketX
    this.BUCKET_Y = bucketY
    this.X = bucketX * bucketSize
    this.Y = bucketY * bucketSize
    this.MAX_X = this.X + bucketSize
    this.MAX_Y = this.Y + bucketSize

    this.HALFX = this.X + bucketSize / 2
    this.HALFY = this.Y + bucketSize / 2

    this.QUAD_CACHE = [[], [], [], [], [], [], [], [], []]

    this.ITEM_LIST = []
  }

  /**
    * Update QuadCache with appropriate child buckets.
    */
  updateQuadCache () {
    TreeBucket.QUADS.forEach((quad, i) => {
      const arr = []
      this.QUAD_CACHE[i] = arr

      quad.forEach((index) => {
        const child = this.CHILDREN[index]
        if (child !== undefined) {
          arr.push(child)
        }
      })
    })
  }

  /**
    * Increments a counter and propagates it upwards.
    */
  add () {
    if (this.COUNTER === 0 && this.PARENT !== undefined) this.PARENT.add()
    ++this.COUNTER
  }

  /**
    * Decrements a counter and propagates it upwards.
    */
  subtract () {
    --this.COUNTER
    if (this.COUNTER === 0 && this.PARENT !== undefined) this.PARENT.subtract()
  }

  /**
    * Returns the quads that collide with the bounding box. Returns -1 if bounds is completely enclosing bucket.
    * @param {Bounds} bounds
    * @returns {number}
    */
  getQuad (bounds) {
    if (this.QUAD_CACHE[0].length <= 1) {
      return 0
    }

    const minX = bounds.minX
    const minY = bounds.minY
    const maxX = bounds.maxX
    const maxY = bounds.maxY
    const minX2 = this.X
    const minY2 = this.Y
    const maxX2 = this.MAX_X
    const maxY2 = this.MAX_Y
    const halfX = this.HALFX
    const halfY = this.HALFY

    if (maxY <= halfY) {
      if (maxX <= halfX) return 1
      else if (minX >= halfX) return 2
      return 5
    } else if (minY >= halfY) {
      if (maxX <= halfX) return 3
      else if (minX >= halfX) return 4
      return 6
    }

    if (maxX <= halfX) {
      return 7
    } else if (minX >= halfX) {
      return 8
    }

    if (bounds.width < this.BUCKET_SIZE || bounds.height < this.BUCKET_SIZE || minX > minX2 || maxX < maxX2 || minY > minY2 || maxY < maxY2) {
      return 0
    }
    return -1 // too big
  }

  /**
    * Internal method that iterates through the items contained in the bucket while filtering non-unique entries.
    *
    * Similar to Array.every();
    * @param {EveryCallback} call
    * @param {number} QID
    * @returns {boolean}
    */
  _every (call, QID) {
    return this.ITEM_LIST.every((item) => {
      if (item._HashBoundsTempCheck !== QID) {
        item._HashBoundsTempCheck = QID
        return call(item)
      }
      return true
    })
  }

  /**
    * Recursive method that iterates through entries that may collide with the specified bounds.
    * @param {Bounds} bounds
    * @param {EveryCallback} call
    * @param {number} QID
    * @returns {boolean}
    */
  every (bounds, call, QID) {
    if (this.COUNTER === 0) return true
    const quads = this.getQuad(bounds)

    if (quads === -1) return this.everyAll(call, QID)

    if (!this._every(call, QID)) return false

    return this.QUAD_CACHE[quads].every((child) => {
      return child.every(bounds, call, QID)
    })
  }

  /**
    * Recursive method that iterates through all entries contained in this bucket and its children.
    * @param {EveryCallback} call
    * @param {number} QID
    * @returns {boolean}
    */
  everyAll (call, QID) {
    if (this.COUNTER === 0) return true

    if (!this._every(call, QID)) return false

    return this.QUAD_CACHE[0].every((child) => {
      return child.everyAll(call, QID)
    })
  }

  /**
    * Removes a entry
    * @param {EntryCache} entryCache
    * @param {number} indexKey
    */
  remove (entryCache, indexKey) {
    const index = entryCache.indexes[indexKey]
    const len1 = this.ITEM_LIST.length - 1
    if (index !== len1) {
      const swap = this.ITEM_LIST[index] = this.ITEM_LIST[len1]
      const cache2 = swap._HashBounds[entryCache.hashID]
      const swapKey = (this.BUCKET_X - cache2.k1x) * (cache2.k2y - cache2.k1y + 1) + this.BUCKET_Y - cache2.k1y
      cache2.indexes[swapKey] = index
    }
    this.ITEM_LIST.pop()
    if (len1 === 0) this.subtract()
  }

  /**
    * Sets a entry
    * @param {Entry} entry
    * @param {EntryCache} entryCache
    * @param {number} indexKey
    */
  set (entry, entryCache, indexKey) {
    const len = this.ITEM_LIST.length
    entryCache.indexes[indexKey] = len
    this.ITEM_LIST.push(entry)
    if (len === 0) this.add()
  }
}
TreeBucket.QUADS = [
  [0, 1, 2, 3],
  [0],
  [1],
  [2],
  [3],
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3]
]

module.exports = TreeBucket
