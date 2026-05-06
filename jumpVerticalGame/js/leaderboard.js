// Supabase 排行榜 client（REST API，不依赖 SDK）
(function(){
  const URL = 'https://igqpwzldgqocazlbawgo.supabase.co';
  const KEY = 'sb_publishable_TFd7Wcr2ZSNG6eaPEXDROg_0qt1wZTi';
  const TABLE = 'jumpup_scores';

  const cache = { }; // stage -> {ts, rows}
  const CACHE_MS = 15000;

  async function getTop(stage, limit){
    limit = limit || 10;
    const now = Date.now();
    if(cache[stage] && now - cache[stage].ts < CACHE_MS){
      return cache[stage].rows;
    }
    try{
      const url = `${URL}/rest/v1/${TABLE}?stage=eq.${stage}&select=name,score,created_at&order=score.desc,created_at.asc&limit=${limit}`;
      const resp = await fetch(url, {
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
      });
      if(!resp.ok) throw new Error('HTTP ' + resp.status);
      const rows = await resp.json();
      cache[stage] = { ts: now, rows };
      return rows;
    }catch(err){
      console.warn('[leaderboard] getTop fail', err);
      return cache[stage]?.rows || [];
    }
  }

  async function submit(stage, name, score){
    try{
      const resp = await fetch(`${URL}/rest/v1/${TABLE}`, {
        method:'POST',
        headers: {
          apikey: KEY,
          Authorization: 'Bearer ' + KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ stage, name: String(name).slice(0,16), score: Math.max(0, Math.floor(score)) })
      });
      if(!resp.ok){
        const t = await resp.text();
        throw new Error('HTTP ' + resp.status + ' ' + t);
      }
      delete cache[stage]; // 清缓存
      return true;
    }catch(err){
      console.warn('[leaderboard] submit fail', err);
      return false;
    }
  }

  window.Leaderboard = { getTop, submit };
})();
