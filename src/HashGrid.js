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

import TreeBucket from './TreeBucket.js'

/**
 * HashGrid.
 *
 * A doubly linked 2d spatial hash/grid which stores TreeBuckets. Multiple grids are typically used by HashBounds.
 * Allows for constant time insertion and deletion by using Math.floor(X / gridSize).
 */
export default class HashGrid {
  /**
    * HashGrid constructor
    * @param {number} bucketSize - The size of the buckets
    * @param {number} level - The level/index of the grid. Higher levels have double the bucketSize than the preceding.
    */
  constructor (bucketSize, level) {
    this.BUCKETSIZE = bucketSize
    this.BUCKETSIZE_INV = 1 / this.BUCKETSIZE
    this.LEVEL = level
    this.PREV_GRID = undefined // Smaller grid
    this.NEXT_GRID = undefined // Larger grid
    this.BUCKET_GRID = []
  }

  /**
    * Pre-initializes buckets in a 2d bounding box. While these bounds are not strictly enforced for entries, pre-initialization will increase performance.
    * @param {Bounds} initialBounds - Bounds to initialize area with.
    */
  initializeArea (initialBounds) {
    const maxSizeX = Math.ceil(initialBounds.maxX * this.BUCKETSIZE_INV)
    const maxSizeY = Math.ceil(initialBounds.maxY * this.BUCKETSIZE_INV)
    const minSizeX = Math.floor(initialBounds.minX * this.BUCKETSIZE_INV)
    const minSizeY = Math.floor(initialBounds.minY * this.BUCKETSIZE_INV)

    for (let bucketX = minSizeX; bucketX < maxSizeX; ++bucketX) {
      for (let bucketY = minSizeY; bucketY < maxSizeY; ++bucketY) {
        this.createBucket(bucketX, bucketY)
      }
    }
  }

  /**
    * Deletes a bucket from the bucket grid.
    * @param {number} bucketX
    * @param {number} bucketY
    */
  deleteBucket (bucketX, bucketY) {
    const map2 = this.BUCKET_GRID[bucketX]
    delete map2[bucketY]
    if (map2.length === 0) {
      delete this.BUCKET_GRID[bucketX]
    }
  }

  /**
    * Inserts a bucket into the bucket grid.
    * @param {number} bucketX
    * @param {number} bucketY
    * @param {TreeBucket} bucket
    */
  setBucket (bucketX, bucketY, bucket) {
    let map2 = this.BUCKET_GRID[bucketX]
    if (map2 === undefined) {
      map2 = []
      this.BUCKET_GRID[bucketX] = map2
    }
    map2[bucketY] = bucket
  }

  /**
    * Gets a bucket from the bucket grid
    * @param {number} bucketX
    * @param {number} bucketY
    * @returns {TreeBucket}
    */
  getBucket (bucketX, bucketY) {
    const map2 = this.BUCKET_GRID[bucketX]
    return map2 === undefined ? undefined : map2[bucketY]
  }

  /**
    * Creates, initializes, and returns a bucket at a certain position. Any parent buckets will be created.
    * @param {number} bucketX
    * @param {number} bucketY
    * @returns {TreeBucket}
    */
  createBucket (bucketX, bucketY) {
    // Create the bucket
    const bucket = new TreeBucket(bucketX, bucketY, this.BUCKETSIZE)
    // Set into grid
    this.setBucket(bucketX, bucketY, bucket)

    // Check if next (larger) grid exists
    if (this.NEXT_GRID !== undefined) {
      const x2 = Math.floor(bucketX / 2)
      const y2 = Math.floor(bucketY / 2)
      const index = (bucketY - y2 * 2) * 2 + bucketX - x2 * 2

      let parentbucket = this.NEXT_GRID.getBucket(x2, y2)
      if (parentbucket === undefined) {
        // Recursively create parents if non existant
        parentbucket = this.NEXT_GRID.createBucket(x2, y2)
      }

      // Set references
      bucket.PARENT = parentbucket
      parentbucket.CHILDREN[index] = bucket
      parentbucket.updateQuadCache()
    }
    return bucket
  }

  /**
    * Prunes empty buckets.
    */
  prune () {
    this.BUCKET_GRID.forEach((dataX) => {
      return dataX.forEach((bucket) => {
        if (bucket.COUNTER === 0) { this.pruneBucket(bucket) }
      })
    })
  }

  /**
    * Prunes an empty bucket and its empty parents.
    * @param {TreeBucket} bucket
    */
  pruneBucket (bucket) {
    if (bucket.PARENT !== undefined) {
      if (bucket.PARENT.COUNTER === 0) {
        this.NEXT_GRID.pruneBucket(bucket.PARENT)
      } else {
        const index = (bucket.X % 2) * 2 + (bucket.Y % 2)
        bucket.PARENT.CHILDREN[index] = undefined
        bucket.PARENT.updateQuadCache()
      }
    }

    bucket.COUNTER = -1
    this.deleteBucket(bucket.X, bucket.Y)
  }

  /**
    * Updates a entry.
    * @param {Entry} entry
    * @param {Bounds} bounds
    * @param {EntryCache} entryCache
    * @returns {boolean} Returns true if there was a change.
    */
  update (entry, bounds, entryCache) {
    const x1 = bounds.minX
    const y1 = bounds.minY
    const x2 = bounds.maxX
    const y2 = bounds.maxY

    const k1x = Math.floor(x1 * this.BUCKETSIZE_INV)
    const k1y = Math.floor(y1 * this.BUCKETSIZE_INV)
    const k2x = Math.floor(x2 * this.BUCKETSIZE_INV)
    const k2y = Math.floor(y2 * this.BUCKETSIZE_INV)

    if (entryCache.k1x !== k1x || entryCache.k1y !== k1y || entryCache.k2x !== k2x || entryCache.k2y !== k2y) {
      this.remove(entryCache)
      this.insert(entry, bounds, entryCache, k1x, k1y, k2x, k2y)
      return true
    } else {
      return false
    }
  }

  /**
    * Inserts a entry.
    * @param {Entry} entry
    * @param {Bounds} bounds
    * @param {EntryCache} entryCache
    * @param {number=} k1x
    * @param {number=} k1y
    * @param {number=} k2x
    * @param {number=} k2y
    */
  insert (entry, bounds, entryCache, k1x, k1y, k2x, k2y) {
    const x1 = bounds.minX
    const y1 = bounds.minY
    const x2 = bounds.maxX
    const y2 = bounds.maxY

    // Calculate if not given
    if (k1x === undefined) {
      k1x = Math.floor(x1 * this.BUCKETSIZE_INV)
      k1y = Math.floor(y1 * this.BUCKETSIZE_INV)
      k2x = Math.floor(x2 * this.BUCKETSIZE_INV)
      k2y = Math.floor(y2 * this.BUCKETSIZE_INV)
    }

    entryCache.k1x = k1x
    entryCache.k1y = k1y
    entryCache.k2x = k2x
    entryCache.k2y = k2y
    const width = k2y - k1y + 1
    for (let x = k1x; x <= k2x; ++x) {
      const x2 = (x - k1x) * width - k1y
      for (let y = k1y; y <= k2y; ++y) {
        let bucket = this.getBucket(x, y)

        if (bucket === undefined) {
          bucket = this.createBucket(x, y)
        }

        bucket.set(entry, entryCache, x2 + y)
      }
    }
  }

  /**
    * Removes a entry.
    * @param {EntryCache} entryCache
    */
  remove (entryCache) {
    const k1x = entryCache.k1x
    const k1y = entryCache.k1y
    const k2x = entryCache.k2x
    const k2y = entryCache.k2y
    const width = k2y - k1y + 1
    for (let x = k1x; x <= k2x; ++x) {
      const x2 = (x - k1x) * width - k1y
      for (let y = k1y; y <= k2y; ++y) {
        this.getBucket(x, y).remove(entryCache, x2 + y)
      }
    }
  }

  /**
    * Iterates entries that may overlap with bounds. Cancellable.
    *
    * Similar to Array.every()
    * @param {Bounds|undefined} bounds
    * @param {EveryCallback} call
    * @param {number} QID
    * @returns {boolean}
    */
  every (bounds, call, QID) {
    if (bounds === undefined) {
      return this.BUCKET_GRID.every((dataX) => {
        return dataX.every((bucket) => {
          return bucket.everyAll(call, QID)
        })
      })
    }
    const x1 = bounds.minX
    const y1 = bounds.minY
    const x2 = bounds.maxX
    const y2 = bounds.maxY

    const k1x = Math.floor(x1 * this.BUCKETSIZE_INV)
    const k1y = Math.floor(y1 * this.BUCKETSIZE_INV)
    const k2x = Math.floor(x2 * this.BUCKETSIZE_INV)
    const k2y = Math.floor(y2 * this.BUCKETSIZE_INV)

    for (let x = k1x; x <= k2x; ++x) {
      for (let y = k1y; y <= k2y; ++y) {
        const bucket = this.getBucket(x, y)

        if (bucket !== undefined) {
          if (!bucket.every(bounds, call, QID)) return false
        }
      }
    }
    return true
  }
}
