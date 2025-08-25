// メモリ使用量チェックスクリプト
console.log('=== Memory Usage Report ===');
const memUsage = process.memoryUsage();
console.log('RSS (Resident Set Size):', Math.round(memUsage.rss / 1024 / 1024), 'MB');
console.log('Heap Total:', Math.round(memUsage.heapTotal / 1024 / 1024), 'MB');
console.log('Heap Used:', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB');
console.log('External:', Math.round(memUsage.external / 1024 / 1024), 'MB');
console.log('Array Buffers:', Math.round(memUsage.arrayBuffers / 1024 / 1024), 'MB');

// Heap使用率計算
const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
console.log('Heap Usage Ratio:', heapUsagePercent + '%');

// V8 GC統計があれば表示
if (global.gc) {
  console.log('GC is available');
  const before = process.memoryUsage().heapUsed;
  global.gc();
  const after = process.memoryUsage().heapUsed;
  console.log('Memory freed by GC:', Math.round((before - after) / 1024 / 1024), 'MB');
}

// OS全体のメモリ情報
const os = require('os');
const totalMem = Math.round(os.totalmem() / 1024 / 1024);
const freeMem = Math.round(os.freemem() / 1024 / 1024);
const usedMem = totalMem - freeMem;
console.log('=== System Memory ===');
console.log('Total:', totalMem, 'MB');
console.log('Used:', usedMem, 'MB');
console.log('Free:', freeMem, 'MB');
console.log('System Usage:', Math.round((usedMem / totalMem) * 100) + '%');

process.exit(0);
