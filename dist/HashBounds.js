/*
 Hashbounds: Collision detection optimized 2d datastructure for usage in games

 Author: Andrews54757
 License: MIT (https://github.com/ThreeLetters/HashBounds/blob/master/LICENSE)
 Source: https://github.com/ThreeLetters/HashBounds
 Build: v5.0.2
 Built on: 24/09/2021
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

/**
 * HashGrid.
 *
 * A doubly linked 2d spatial hash/grid which stores TreeBuckets. Multiple grids are typically used by HashBounds.
 * Allows for constant time insertion and deletion by using Math.floor(X / gridSize).
 */
class HashGrid {
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
    this.BUCKET_GRID = {}
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

    for (let bucketX = minSizeX; bucketX <= maxSizeX; ++bucketX) {
      for (let bucketY = minSizeY; bucketY <= maxSizeY; ++bucketY) {
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
    if (Object.keys(map2).length === 0) {
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
      map2 = {}
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
    for (const x in this.BUCKET_GRID) {
      const dataX = this.BUCKET_GRID[x]
      for (const y in dataX) {
        const bucket = dataX[y]
        if (bucket.COUNTER === 0) {
          this.pruneBucket(bucket)
        }
      }
    }
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
        const index = (bucket.BUCKET_X % 2) * 2 + (bucket.BUCKET_Y % 2)
        bucket.PARENT.CHILDREN[index] = undefined
        bucket.PARENT.updateQuadCache()
      }
    }

    bucket.COUNTER = -1
    this.deleteBucket(bucket.BUCKET_X, bucket.BUCKET_Y)
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
      for (const x in this.BUCKET_GRID) {
        const dataX = this.BUCKET_GRID[x]
        for (const y in dataX) {
          const bucket = dataX[y]
          if (!bucket.everyAll(call, QID)) {
            return false
          }
        }
      }
      return true
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
