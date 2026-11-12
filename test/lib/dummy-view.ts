import type { View, ViewWriteArgs } from '../../index.ts'

class DummyView implements View {
  write (...args: ViewWriteArgs): void {}
}

export default DummyView
