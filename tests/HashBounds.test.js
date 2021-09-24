import HashBounds from '../src/HashBounds'
import Twister from './twister'
import Quadtree from '../dist/visual/quadtree'

describe('HashBounds Bounding Box Methods', () => {
  test('ConvertBounds Min/Max Input', () => {
    const bounds = {
      minX: -10,
      minY: -10,
      maxX: 10,
      maxY: 10
    }
    HashBounds.convertBounds(bounds)
    expect(bounds.TYPE).toBe(2)
    expect(bounds.x).toBe(bounds.minX)
    expect(bounds.y).toBe(bounds.minY)
    expect(bounds.width).toBe(bounds.maxX - bounds.minX)
    expect(bounds.height).toBe(bounds.maxY - bounds.minY)
  })
  test('ConvertBounds Pos/Width Input', () => {
    const bounds = {
      x: -10,
      y: -10,
      width: 20,
      height: 20
    }
    HashBounds.convertBounds(bounds)
    expect(bounds.TYPE).toBe(1)
    expect(bounds.minX).toBe(bounds.x)
    expect(bounds.minY).toBe(bounds.y)
    expect(bounds.maxX).toBe(bounds.x + bounds.width)
    expect(bounds.maxY).toBe(bounds.y + bounds.height)
  })
  test('ConvertBounds Invalid Input', () => {
    const bounds = {
      TYPE: 100
    }
    expect(() => {
      HashBounds.convertBounds(bounds)
    }).toThrow()
  })

  test('truncateBounds()', () => {
    const max = 10 * 16
    const min = -10 * 16
    const bounds = {
      minX: min,
      minY: min,
      maxX: max,
      maxY: max
    }
    const obj = {
      x: max - 5,
      y: max - 5,
      width: 10,
      height: 10
    }
    const obj2 = {
      minX: max - 5,
      minY: max - 5,
      maxX: max + 5,
      maxY: max + 5
    }

    const obj3 = {
      x: min - 5,
      y: min - 5,
      width: 10,
      height: 10
    }
    const obj4 = {
      minX: min - 5,
      minY: min - 5,
      maxX: min + 5,
      maxY: min + 5
    }
    expect(() => {
      HashBounds.truncateBounds(obj, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
    }).toThrow()
    HashBounds.convertBounds(bounds)
    HashBounds.convertBounds(obj)
    HashBounds.convertBounds(obj2)
    HashBounds.convertBounds(obj3)
    HashBounds.convertBounds(obj4)

    expect(HashBounds.boundsContains(obj, bounds)).not.toBeTruthy()
    expect(HashBounds.boundsContains(obj2, bounds)).not.toBeTruthy()
    expect(HashBounds.boundsContains(obj3, bounds)).not.toBeTruthy()
    expect(HashBounds.boundsContains(obj4, bounds)).not.toBeTruthy()
    HashBounds.truncateBounds(obj, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
    HashBounds.convertBounds(obj)
    HashBounds.truncateBounds(obj2, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
    HashBounds.convertBounds(obj2)
    HashBounds.truncateBounds(obj3, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
    HashBounds.convertBounds(obj3)
    HashBounds.truncateBounds(obj4, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
    HashBounds.convertBounds(obj4)
    expect(HashBounds.boundsContains(obj, bounds)).toBeTruthy()
    expect(HashBounds.boundsContains(obj2, bounds)).toBeTruthy()
    expect(HashBounds.boundsContains(obj3, bounds)).toBeTruthy()
    expect(HashBounds.boundsContains(obj4, bounds)).toBeTruthy()
  })
})

describe('Creating a HashBounds instance with no preinitialization', () => {
  test('Constructor with minSize and level == 0', () => {
    expect(() => {
      return new HashBounds(16, 0)
    }).toThrow()
  })
  test('Constructor with minSize and level == 1', () => {
    const hash = new HashBounds(16, 1)
    expect(hash.LEVELS.length).toBe(1)
    expect(hash.BASE.BUCKETSIZE).toBe(16)
  })
  test('Constructor with minSize and level == 2', () => {
    const hash = new HashBounds(16, 2)
    expect(hash.LEVELS.length).toBe(2)
    expect(hash.BASE.BUCKETSIZE).toBe(32)
    expect(hash.BASE.PREV_GRID.BUCKETSIZE).toBe(16)
  })

  test("ID's should be different", () => {
    const hash = new HashBounds(16, 2)
    const hash2 = new HashBounds(16, 2)
    expect(hash.ID).not.toBe(hash2.ID)
  })

  test("Configured ID's", () => {
    const hash = new HashBounds(16, 2, undefined, 420)
    expect(hash.ID).toBe(420)
  })
})

describe('Creating a HashBounds instance with preinitialization', () => {
  test('Constructor with minSize and level == 1', () => {
    const max = 5
    const hash = new HashBounds(16, 1, {
      x: -16 * max,
      y: -16 * max,
      width: 16 * max * 2,
      height: 16 * max * 2
    })

    for (let x = -max; x <= max; x++) {
      for (let y = -max; y <= max; y++) {
        expect(hash.BASE.BUCKET_GRID[x][y]).toBeDefined()
      }
    }

    const max2 = max + 1
    expect(hash.BASE.BUCKET_GRID[-max2]).not.toBeDefined()
    expect(hash.BASE.BUCKET_GRID[max2]).not.toBeDefined()
    expect(hash.BASE.BUCKET_GRID[-max][-max2]).not.toBeDefined()
    expect(hash.BASE.BUCKET_GRID[-max][max2]).not.toBeDefined()
    expect(hash.BASE.BUCKET_GRID[max][-max2]).not.toBeDefined()
    expect(hash.BASE.BUCKET_GRID[max][max2]).not.toBeDefined()
  })
  test('Constructor with minSize and level == 2', () => {
    let max = 5
    let min = -5
    const hash = new HashBounds(16, 2, {
      minX: 16 * min,
      minY: 16 * min,
      maxX: 16 * max,
      maxY: 16 * max
    })

    for (let level = 0; level < 2; level++) {
      for (let x = min; x <= max; x++) {
        for (let y = min; y <= max; y++) {
          expect(hash.LEVELS[level].BUCKET_GRID[x][y]).toBeDefined()
        }
      }

      expect(hash.LEVELS[level].BUCKET_GRID[min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max + 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[min][min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[min][max + 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max][min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max][max + 1]).not.toBeDefined()

      max = Math.floor(max / 2)
      min = Math.floor(min / 2)
    }
  })
  test('Constructor with minSize and level == 5', () => {
    let max = 50
    let min = -50
    const hash = new HashBounds(16, 5, {
      minX: 16 * min,
      minY: 16 * min,
      maxX: 16 * max,
      maxY: 16 * max
    })

    for (let level = 0; level < 5; level++) {
      for (let x = min; x <= max; x++) {
        for (let y = min; y <= max; y++) {
          expect(hash.LEVELS[level].BUCKET_GRID[x][y]).toBeDefined()
        }
      }

      expect(hash.LEVELS[level].BUCKET_GRID[min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max + 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[min][min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[min][max + 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max][min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max][max + 1]).not.toBeDefined()

      max = Math.floor(max / 2)
      min = Math.floor(min / 2)
    }
  })
})

describe('HashBounds 1000 psuedorandom entries - Insertion', () => {
  const max = 40 * 16
  const min = -40 * 16
  const size = max - min
  const minSize = 5
  const maxSize = 80
  const bounds = {
    minX: min,
    minY: min,
    maxX: max,
    maxY: max
  }
  const hash = new HashBounds(16, 3, bounds)
  const objects = []
  const random = new Twister(29482)
  let tempCounterId = 1
  for (let i = 0; i < 1000; i++) {
    objects.push({
      id: i,
      x: Math.floor(random.random() * size + min),
      y: Math.floor(random.random() * size + min),
      width: Math.floor(random.random() * (maxSize - minSize)) + minSize,
      height: Math.floor(random.random() * (maxSize - minSize)) + minSize

    })
  }

  const tree = new Quadtree({
    x: min,
    y: min,
    width: max + maxSize,
    height: max + maxSize
  }, 10, 4)

  objects.forEach((object) => {
    tree.insert(object)
  })
  expect(() => {
    objects.forEach((object) => {
      hash.insert(object, object)
    })
  }).not.toThrow()

  test('Invalid Insertion', () => {
    expect(() => {
      hash.insert(objects[0], objects[0])
    }).toThrow()
  })

  test('Brute force count', () => {
    tempCounterId++
    let counter = 0
    hash.LEVELS.forEach((level) => {
      for (const x in level.BUCKET_GRID) {
        const dataX = level.BUCKET_GRID[x]
        for (const y in dataX) {
          const bucket = dataX[y]
          bucket.ITEM_LIST.forEach((item) => {
            if (item._TEMP_COUNTER === tempCounterId) return
            counter++
            item._TEMP_COUNTER = tempCounterId
          })
        }
      }
    })

    expect(counter).toBe(1000)
  })

  test('Every no bounds', () => {
    let counter = 0
    expect(hash.every((obj) => {
      counter++
      return false
    })).not.toBeTruthy()
    expect(counter).toBe(1)

    counter = 0
    expect(hash.every((obj) => {
      counter++
      return true
    })).toBeTruthy()
    expect(counter).toBe(1000)

    counter = 0
    expect(hash.every(undefined, (obj) => {
      counter++
      return true
    })).toBeTruthy()
    expect(counter).toBe(1000)
  })

  test('forEach no bounds', () => {
    let counter = 0
    hash.forEach((obj) => {
      counter++
    })
    expect(counter).toBe(1000)

    counter = 0
    hash.forEach(undefined, (obj) => {
      counter++
      return true
    })
    expect(counter).toBe(1000)
  })

  test('contains()', () => {
    objects.forEach((object) => {
      expect(hash.contains(object)).toBeTruthy()
    })
  })

  test('toArray all', () => {
    expect(hash.toArray().length).toBe(1000)
  })

  test('toArray all with bounds', () => {
    expect(hash.toArray(bounds).length).toBe(1000)
  })

  test('toArray all with large bounds', () => {
    const bounds2 = {
      minX: min * 1.5,
      minY: min * 1.5,
      maxX: max * 1.5,
      maxY: max * 1.5
    }
    expect(hash.toArray(bounds2).length).toBe(1000)
  })

  test('Collision checking with boundsOverlap - brute force', () => {
    let collides = 0
    let ticks = 0
    objects.forEach((obj) => {
      obj.collidesWith = []
      objects.forEach((obj2) => {
        ticks++
        if (obj === obj2) return
        if (HashBounds.boundsOverlap(obj, obj2)) {
          collides++
          obj.collidesWith.push(obj2.id)
        }
      })
      obj.collidesWith.sort()
    })
    expect(collides).toBe(4238)
    expect(ticks).toBe(1000 * 1000)
  })

  test('Collision checking with boundsOverlap - quadtree', () => {
    let collides = 0
    let ticks = 0
    objects.forEach((obj) => {
      obj.collidesWith_tree = []
      tree.retrieve(obj, (obj2) => {
        ticks++
        if (obj === obj2) return true
        if (HashBounds.boundsOverlap(obj, obj2)) {
          collides++
          obj.collidesWith_tree.push(obj2.id)
        }
        return true
      })

      obj.collidesWith_tree.sort()
    })
    expect(collides).toBe(4238)
    expect(ticks).toBe(226378)
    // 1000000 / 226378 - 4.41739038
  })

  test('Collision checking with forEach', () => {
    let collides = 0
    let ticks = 0
    objects.forEach((obj) => {
      obj.collidesWith2 = []
      hash.forEach(obj, (obj2) => {
        ticks++
        if (obj === obj2) return
        if (HashBounds.boundsOverlap(obj, obj2)) {
          collides++
          obj.collidesWith2.push(obj2.id)
        }
      })
      obj.collidesWith2.sort()
    })
    expect(collides).toBe(4238)
    expect(ticks).toBe(13161)
    // 1000000 / 13161 - 76 times
  })

  test('Collision checking with every', () => {
    let collides = 0
    let ticks = 0
    objects.forEach((obj) => {
      obj.collidesWith3 = []
      hash.every(obj, (obj2) => {
        ticks++
        if (obj === obj2) return true
        if (HashBounds.boundsOverlap(obj, obj2)) {
          collides++
          obj.collidesWith3.push(obj2.id)
          return false
        }
        return true
      })
      obj.collidesWith3.sort()
    })
    expect(collides).toBe(961)
    expect(ticks).toBe(2927)
    // 1000000 / 2927 - 342 times
  })

  test('Collision checking verify', () => {
    objects.forEach((obj) => {
      const str = obj.collidesWith.join(',')
      expect(obj.collidesWith_tree.join(',')).toBe(str)
      expect(obj.collidesWith2.join(',')).toBe(str)
      if (obj.collidesWith3.length === 0) {
        expect(obj.collidesWith.length).toBe(0)
      } else {
        expect(obj.collidesWith.includes(obj.collidesWith3[0])).toBeTruthy()
      }
    })
  })
})

describe('HashBounds 1000 psuedorandom entries - Update', () => {
  const max = 40 * 16
  const min = -40 * 16
  const size = max - min
  const minSize = 5
  const maxSize = 80
  const bounds = {
    minX: min,
    minY: min,
    maxX: max,
    maxY: max
  }
  const hash = new HashBounds(16, 3, bounds)
  const objects = []
  const random = new Twister(29482)
  let tempCounterId = 1
  for (let i = 0; i < 1000; i++) {
    objects.push({
      id: i,
      x: Math.floor(random.random() * size + min),
      y: Math.floor(random.random() * size + min),
      width: Math.floor(random.random() * (maxSize - minSize)) + minSize,
      height: Math.floor(random.random() * (maxSize - minSize)) + minSize

    })
  }

  const tree = new Quadtree({
    x: min,
    y: min,
    width: max + maxSize,
    height: max + maxSize
  }, 10, 4)

  objects.forEach((object) => {
    tree.insert(object)
  })
  expect(() => {
    objects.forEach((object) => {
      hash.insert(object, object)
    })
  }).not.toThrow()
  expect(() => {
    objects.forEach((object) => {
      object.x = Math.floor(random.random() * size + min)
      object.y = Math.floor(random.random() * size + min)
      object.width = Math.floor(random.random() * (maxSize - minSize)) + minSize
      object.height = Math.floor(random.random() * (maxSize - minSize)) + minSize
    })
  }).not.toThrow()
  expect(() => {
    objects.forEach((object) => {
      hash.update(object, object)
    })
  }).not.toThrow()

  expect(() => {
    tree.clear()
    objects.forEach((object) => {
      tree.insert(object)
    })
  }).not.toThrow()

  test('Update invalid', () => {
    expect(() => {
      hash.update({

      }, {})
    }).toThrow()
  })

  test('Update no change', () => {
    expect(hash.update(objects[0], objects[0])).not.toBeTruthy()
  })

  test('Brute force count', () => {
    tempCounterId++
    let counter = 0
    hash.LEVELS.forEach((level) => {
      for (const x in level.BUCKET_GRID) {
        const dataX = level.BUCKET_GRID[x]
        for (const y in dataX) {
          const bucket = dataX[y]
          bucket.ITEM_LIST.forEach((item) => {
            if (item._TEMP_COUNTER === tempCounterId) return
            counter++
            item._TEMP_COUNTER = tempCounterId
          })
        }
      }
    })

    expect(counter).toBe(1000)
  })

  test('contains()', () => {
    objects.forEach((object) => {
      expect(hash.contains(object)).toBeTruthy()
    })
  })

  test('toArray all', () => {
    expect(hash.toArray().length).toBe(1000)
  })

  test('toArray all with bounds', () => {
    expect(hash.toArray(bounds).length).toBe(1000)
  })

  test('Collision checking with boundsOverlap - brute force', () => {
    let collides = 0
    let ticks = 0
    objects.forEach((obj) => {
      obj.collidesWith = []
      objects.forEach((obj2) => {
        ticks++
        if (obj === obj2) return
        if (HashBounds.boundsOverlap(obj, obj2)) {
          collides++
          obj.collidesWith.push(obj2.id)
        }
      })
      obj.collidesWith.sort()
    })
    expect(collides).toBe(4088)
    expect(ticks).toBe(1000 * 1000)
  })

  test('Collision checking with boundsOverlap - quadtree', () => {
    let collides = 0
    let ticks = 0
    objects.forEach((obj) => {
      obj.collidesWith_tree = []
      tree.retrieve(obj, (obj2) => {
        ticks++
        if (obj === obj2) return true
        if (HashBounds.boundsOverlap(obj, obj2)) {
          collides++
          obj.collidesWith_tree.push(obj2.id)
        }
        return true
      })

      obj.collidesWith_tree.sort()
    })
    expect(collides).toBe(4088)
    expect(ticks).toBe(233333)
    // 1000000 / 226378 - 4.41739038
  })

  test('Collision checking with forEach', () => {
    let collides = 0
    let ticks = 0
    objects.forEach((obj) => {
      obj.collidesWith2 = []
      hash.forEach(obj, (obj2) => {
        ticks++
        if (obj === obj2) return
        if (HashBounds.boundsOverlap(obj, obj2)) {
          collides++
          obj.collidesWith2.push(obj2.id)
        }
      })
      obj.collidesWith2.sort()
    })
    expect(collides).toBe(4088)
    expect(ticks).toBe(13199)
    // 1000000 / 13161 - 76 times
  })

  test('Collision checking with every', () => {
    let collides = 0
    let ticks = 0
    objects.forEach((obj) => {
      obj.collidesWith3 = []
      hash.every(obj, (obj2) => {
        ticks++
        if (obj === obj2) return true
        if (HashBounds.boundsOverlap(obj, obj2)) {
          collides++
          obj.collidesWith3.push(obj2.id)
          return false
        }
        return true
      })
      obj.collidesWith3.sort()
    })
    expect(collides).toBe(963)
    expect(ticks).toBe(2961)
    // 1000000 / 2927 - 342 times
  })

  test('Collision checking verify', () => {
    objects.forEach((obj) => {
      const str = obj.collidesWith.join(',')
      expect(obj.collidesWith_tree.join(',')).toBe(str)
      expect(obj.collidesWith2.join(',')).toBe(str)
      if (obj.collidesWith3.length === 0) {
        expect(obj.collidesWith.length).toBe(0)
      } else {
        expect(obj.collidesWith.includes(obj.collidesWith3[0])).toBeTruthy()
      }
    })
  })

  test('Prune hash', () => {
    hash.prune()

    hash.LEVELS.forEach((level) => {
      for (const x in level.BUCKET_GRID) {
        const dataX = level.BUCKET_GRID[x]
        for (const y in dataX) {
          const bucket = dataX[y]
          expect(bucket.COUNTER).not.toBe(0)
        }
      }
    })
  })
})

describe('HashBounds 1000 psuedorandom entries - Remove', () => {
  const max = 40 * 16
  const min = -40 * 16
  const size = max - min
  const minSize = 5
  const maxSize = 80
  const bounds = {
    minX: min,
    minY: min,
    maxX: max,
    maxY: max
  }
  const hash = new HashBounds(16, 3, bounds)
  const objects = []
  const random = new Twister(29482)
  for (let i = 0; i < 1000; i++) {
    objects.push({
      id: i,
      x: Math.floor(random.random() * size + min),
      y: Math.floor(random.random() * size + min),
      width: Math.floor(random.random() * (maxSize - minSize)) + minSize,
      height: Math.floor(random.random() * (maxSize - minSize)) + minSize

    })
  }

  const tree = new Quadtree({
    x: min,
    y: min,
    width: max + maxSize,
    height: max + maxSize
  }, 10, 4)

  objects.forEach((object) => {
    tree.insert(object)
  })
  expect(() => {
    objects.forEach((object) => {
      hash.insert(object, object)
    })
  }).not.toThrow()

  expect(() => {
    objects.forEach((obj) => {
      hash.remove(obj)
    })
  }).not.toThrow()

  test('Remove invalid', () => {
    expect(() => {
      hash.remove(objects[0])
    }).toThrow()
  })

  test('Brute force empty check', () => {
    let count = 0
    hash.LEVELS.forEach((level) => {
      for (const x in level.BUCKET_GRID) {
        const dataX = level.BUCKET_GRID[x]
        for (const y in dataX) {
          const bucket = dataX[y]
          count++
          expect(bucket.COUNTER).toBe(0)
        }
      }
    })
    expect(count).not.toBe(0)
  })

  test('Prune empty hash', () => {
    hash.prune()

    hash.LEVELS.forEach((level) => {
      const len = Object.keys(level.BUCKET_GRID).length
      expect(len).toBe(0)
    })
  })

  test('Insert again', () => {
    objects.forEach((object) => {
      hash.insert(object, object)
    })
    expect(hash.toArray().length).toBe(1000)
  })
})

describe('HashBounds Query ID reset', () => {
  const max = 40 * 16
  const min = -40 * 16
  const bounds = {
    minX: min,
    minY: min,
    maxX: max,
    maxY: max
  }
  const hash = new HashBounds(16, 3, bounds)
  const obj = {
    x: 10,
    y: 10,
    width: 10,
    height: 10
  }
  hash.insert(obj, obj)

  expect(hash.toArray().length).toBe(1)

  hash.QUERYID = 4294967294
  test('Test Query ID overflow', () => {
    expect(hash.toArray().length).toBe(1)
    expect(obj._HashBoundsTempCheck).toBe(4294967294)
    expect(hash.toArray().length).toBe(1)
    expect(obj._HashBoundsTempCheck).toBe(0)
    expect(hash.QUERYID).toBe(1)
    expect(hash.toArray().length).toBe(1)
    expect(obj._HashBoundsTempCheck).toBe(1)
    expect(hash.QUERYID).toBe(2)
  })
})
describe('HashBounds other', () => {
  test('clear()', () => {
    let max = 5
    let min = -5
    const hash = new HashBounds(16, 2, {
      minX: 16 * min,
      minY: 16 * min,
      maxX: 16 * max,
      maxY: 16 * max
    })
    const obj = {
      x: 10,
      y: 10,
      width: 10,
      height: 10
    }

    const prevId = hash.ID
    hash.insert(obj, obj)
    expect(hash.contains(obj)).toBeTruthy()

    for (let level = 0; level < 2; level++) {
      for (let x = min; x <= max; x++) {
        for (let y = min; y <= max; y++) {
          expect(hash.LEVELS[level].BUCKET_GRID[x][y]).toBeDefined()
        }
      }

      expect(hash.LEVELS[level].BUCKET_GRID[min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max + 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[min][min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[min][max + 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max][min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max][max + 1]).not.toBeDefined()

      max = Math.floor(max / 2)
      min = Math.floor(min / 2)
    }

    hash.clear()

    max = 5
    min = -5

    for (let level = 0; level < 2; level++) {
      for (let x = min; x <= max; x++) {
        for (let y = min; y <= max; y++) {
          expect(hash.LEVELS[level].BUCKET_GRID[x][y]).toBeDefined()
        }
      }

      expect(hash.LEVELS[level].BUCKET_GRID[min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max + 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[min][min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[min][max + 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max][min - 1]).not.toBeDefined()
      expect(hash.LEVELS[level].BUCKET_GRID[max][max + 1]).not.toBeDefined()

      max = Math.floor(max / 2)
      min = Math.floor(min / 2)
    }
    expect(hash.contains(obj)).not.toBeTruthy()
    expect(hash.ID).not.toBe(prevId)
  })

  test('boundsFitInHash()', () => {
    const max = 10 * 16
    const min = -10 * 16
    const bounds = {
      minX: min,
      minY: min,
      maxX: max,
      maxY: max
    }
    const hash = new HashBounds(16, 3, bounds)
    const obj = {
      x: 10,
      y: 10,
      width: 10,
      height: 10
    }

    const obj2 = {
      x: max,
      y: max,
      width: 10,
      height: 10
    }
    expect(hash.boundsFitsInHash(obj)).toBeTruthy()
    expect(hash.boundsFitsInHash(obj2)).not.toBeTruthy()
  })
})
