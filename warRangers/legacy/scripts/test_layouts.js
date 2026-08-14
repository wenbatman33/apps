#!/usr/bin/env node
const assert=require('node:assert/strict');
const fs=require('node:fs');
const layouts=require('../src/levelLayouts.js');

assert.equal(layouts.levels.length,5,'目前只保留五關完整戰役');
assert.deepEqual(layouts.levels.map(level=>level.id),[1,2,3,4,5],'五關編號必須連續');

for(const level of layouts.levels){
  const ids=new Set(level.nodes.map(node=>node.id));
  assert.equal(ids.size,level.nodes.length,`${level.name} 節點不可重複`);
  assert.equal(level.nodes.filter(node=>node.type==='base').length,2,`${level.name} 必須有雙方主城`);
  assert.ok(level.routes.length>=level.nodes.length-1,`${level.name} 路網不可缺線或孤立`);
  for(const node of level.nodes){
    assert.ok(node.x>=0&&node.x<=layouts.MAP.width&&node.y>=0&&node.y<=layouts.MAP.height,`${level.name} ${node.id} 超出背景`);
    assert.ok(level.walkable.has(`${node.cell.c},${node.cell.r}`),`${level.name} ${node.id} 不在道路格`);
  }
  for(const route of level.routes){
    assert.ok(ids.has(route.from)&&ids.has(route.to),`${level.name} ${route.id} 端點不存在`);
    assert.ok(route.halfWidth>=22,`${level.name} ${route.id} 安全道路太窄`);
    assert.ok(layouts.routeLength(route)>=70,`${level.name} ${route.id} 路線過短`);
    for(let i=0;i<route.cells.length;i++){
      const cell=route.cells[i],cellKey=`${cell.c},${cell.r}`;
      assert.ok(level.walkable.has(cellKey),`${level.name} ${route.id} 走到非道路格 ${cellKey}`);
      if(level.obstacleTiles.has(cellKey))assert.ok(level.bridgeTiles.has(cellKey),`${level.name} ${route.id} 跨河未放橋 ${cellKey}`);
      if(i){const previous=route.cells[i-1];assert.equal(Math.abs(previous.c-cell.c)+Math.abs(previous.r-cell.r),1,`${level.name} ${route.id} 出現跳格`);}
    }
  }
  const report=layouts.validateLevel(level,2);
  assert.equal(report.violations,0,`${level.name} 發現越界：\n${report.errors.slice(0,8).join('\n')}`);
  assert.ok(report.minClearance>=5,`${level.name} 最小安全餘量不足：${report.minClearance}px`);
}

const total=layouts.validateAll();
assert.equal(total.violations,0,'全五關必須維持 0 越界');
assert.ok(total.samples>100000,'必須對全路網進行高密度採樣');
assert.ok(total.bridges>=30,'五關必須有足夠且實際使用的橋格');

for(const file of ['../src/layoutPreview.js','../src/levelLayouts.js','../src/campaignRules.js']){
  const code=fs.readFileSync(require.resolve(file),'utf8');
  assert.doesNotMatch(code,/add\.graphics|generateTexture|createCanvas|add\.rectangle|add\.circle|add\.polygon|<svg/i,`${file} 不得以程式繪圖假造素材`);
}

console.log(JSON.stringify(total,null,2));
