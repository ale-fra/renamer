import type { View, ViewWriteArgs } from 'renamer'

class MinimalView implements View {
  write (...[key, value, options]: ViewWriteArgs): void {
    console.log(key, value, options)
  }
}

export default MinimalView
