#!/usr/bin/env node
/*
 * 下班打卡后给"新工作单位天数"+1。
 * 每天只加一次（用上海时区的日期做去重），加到 target 封顶。
 * 由 .github/workflows/bump-job-days.yml 在收到手机发来的
 * repository_dispatch(dingtalk-checkout) 事件时调用。
 */
const fs = require('fs');
const path = 'assets/data/progress.json';

const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const job = data.job || (data.job = {});

// 上海时区当天日期，格式 YYYY-MM-DD
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

if (job.lastBump === today) {
  console.log('已在 ' + today + ' 打过卡，跳过。当前天数：' + job.days);
  process.exit(0);
}

const target = typeof job.target === 'number' ? job.target : 365;
job.days = Math.min(target, (typeof job.days === 'number' ? job.days : 0) + 1);
job.lastBump = today;

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('天数 +1 => ' + job.days + '（' + today + '）');
