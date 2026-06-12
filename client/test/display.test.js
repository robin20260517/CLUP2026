import test from 'node:test';
import assert from 'node:assert/strict';

test('match times are formatted in Armenia GMT+4 and cross midnight correctly', async () => {
  const display = await import('../src/utils/display.js').catch(() => ({}));

  assert.equal(typeof display.formatMatchDateTime, 'function');
  assert.equal(display.formatMatchDateTime('2026-06-12T19:00:00Z'), '6月12日 23:00');
  assert.equal(display.formatMatchDateTime('2026-06-12T21:00:00Z'), '6月13日 01:00');
});

test('common ESPN labels are translated for Chinese display', async () => {
  const display = await import('../src/utils/display.js').catch(() => ({}));

  assert.equal(display.translateTeam?.('South Korea'), '韩国');
  assert.equal(display.translateTeam?.('Bosnia-Herzegovina'), '波斯尼亚和黑塞哥维那');
  assert.equal(display.translateRound?.('Group Stage - 1'), '小组赛第1轮');
  assert.equal(display.translateModel?.('Tug-of-War Model'), '拉锯模型');
  assert.equal(display.translateStatus?.('FT'), '完赛');
});
