#!/usr/bin/env node
import path from 'node:path'
import fs from 'node:fs'

/* Run this script in the `example` folder, creating `example/sandbox` */

function createFixture (filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, 'test')
}

fs.rmSync('sandbox', { recursive: true, force: true })

;[1, 2, 3, 4, 5].forEach(function (number) {
  const fileName = path.join('sandbox', 'file' + number + '.test')
  createFixture(fileName)
})
;[1, 2, 3, 4, 5].forEach(function (number) {
  const fileName = path.join('sandbox/zolder', 'file' + number + '.test')
  createFixture(fileName)
})

const someFiles = [
  'sandbox/[#f1ipping4nn0y1ing].file.NAME--23[$1$$!].mkv',
  'sandbox/[#f1ipping4nn0y1ing].file.NAME--3[$2$$!].mkv',
  'sandbox/[#f1ipping4nn0y1ing].file.NAME--13[$3$$!].mkv',
  'sandbox/[ag]_Annoying_filename_-_3_[38881CD1].mp4',
  'sandbox/[eg]_Annoying_filename_-_13_[38881CD2].mp4',
  'sandbox/[fg]_Annoying_filename_-_23_[38881CD3].mp4',
  'sandbox/loads.of.full.stops.every.where.mp4',
  'sandbox/video-sample-00001.mp4',
  "sandbox/sample clip - part 1.avi",
  'sandbox/zolder/[#f1ipping4nn0y1ing].file.NAME--23[$1$$!].mkv',
  'sandbox/zolder/[#f1ipping4nn0y1ing].file.NAME--3[$2$$!].mkv',
  'sandbox/zolder/[#f1ipping4nn0y1ing].file.NAME--13[$3$$!].mkv',
  'sandbox/zolder/[ag]_Annoying_filename_-_3_[38881CD1].mp4',
  'sandbox/zolder/[eg]_Annoying_filename_-_13_[38881CD2].mp4',
  'sandbox/zolder/[fg]_Annoying_filename_-_23_[38881CD3].mp4',
  'sandbox/zolder/loads.of.full.stops.every.where.mp4',
  'sandbox/zolder/video-sample-00001.mp4',
  "sandbox/zolder/sample clip - part 2.avi",
  'sandbox/second-folder/one.txt',
  'sandbox/second-folder/two.txt',
  'sandbox/second-folder/three.txt',
  'sandbox/second-folder/sub-second-folder/one.txt',
  'sandbox/second-folder/sub-second-folder/two.txt',
  'sandbox/second-folder/sub-second-folder/three.txt',
  'sandbox/second-folder/sub-second-folder2/one.txt',
  'sandbox/second-folder/sub-second-folder2/two.txt',
  'sandbox/second-folder/sub-second-folder2/three.txt',
  'sandbox/pics/pic1.jpg',
  'sandbox/pics/pic2.jpg',
  'sandbox/pics/pics/pic3.jpg',
  'sandbox/pics/pics/pic4.jpg',
  'sandbox/spaces/a file.txt',
  'sandbox/spaces/file b here .txt',
  'sandbox/spaces/a  spacey - file .txt',
  'sandbox/data1.csv',
  'sandbox/data2 (checked by reviewer).csv',
  'sandbox/data3.xls',
  'sandbox/dates/20180716_180000.jpg',
  'sandbox/dates/20180717_210000.jpg',
  'sandbox/alphanumeric/10002-A.pdf',
  'sandbox/alphanumeric/10230-C.pdf'
]
someFiles.forEach(createFixture)
