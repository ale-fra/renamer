import path from 'node:path'

/* Adds the prefix `[DONE] ` to each file name. */
class Prefix {
  replace (filePath) {
    const file = path.parse(filePath)
    const newName = '[DONE] ' + file.base
    return path.join(file.dir, newName)
  }
}

export default Prefix
