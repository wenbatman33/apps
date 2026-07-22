// 游戏排行榜 / 记录上传 client（使用后端 wengamebase API，与 jumpVerticalGame 同款）
// URL 范例：?uid=u42&wengame_token=abc123
// apiBase / Authorization 都从 localStorage CAMPAIGN_DATA 取得
(function () {
	const qs = new URLSearchParams(location.search);

	// 读取宿主站点的 CAMPAIGN_DATA（包含 api_path、authorization 等）
	function getCampaignData() {
		try {
			const raw = localStorage.getItem('CAMPAIGN_DATA');
			if (!raw) return {};
			return JSON.parse(raw) || {};
		} catch (err) {
			console.warn('[leaderboard] read CAMPAIGN_DATA fail', err);
			return {};
		}
	}

	function getApiBase() {
		// 优先级：URL apiBase 参数 > CAMPAIGN_DATA.api_path > 同源
		return qs.get('apiBase') || getCampaignData().api_path || '';
	}

	function getAuthHeader() {
		// Authorization 一律从 localStorage CAMPAIGN_DATA.authorization 取（加 Bearer 前缀）
		const auth = getCampaignData().authorization;
		return auth ? { Authorization: 'Bearer ' + auth } : {};
	}

	const HOST = {
		uid: qs.get('uid'),
		// wenGameToken 用 URL 上的 wengame_token（兼容旧的 token）
		token: qs.get('wengame_token') || qs.get('token'),
	};
	window.HOST_AUTH = HOST;

	const GAME_CODE = 'dashRun';
	let cacheByTab = {}; // { [tab]: { ts, rows } }
	let totalTimeCacheByTab = {}; // { [tab]: { ts, sec } }
	const CACHE_MS = 15000;

	function pad2(n) { return n < 10 ? '0' + n : '' + n; }
	function fmtDateTime(d, isEnd) {
		const yyyy = d.getFullYear();
		const mm = pad2(d.getMonth() + 1);
		const dd = pad2(d.getDate());
		return isEnd ? yyyy + '-' + mm + '-' + dd + ' 23:59:59' : yyyy + '-' + mm + '-' + dd + ' 00:00:00';
	}
	function fmtDate(d) {
		const yyyy = d.getFullYear();
		const mm = pad2(d.getMonth() + 1);
		const dd = pad2(d.getDate());
		return yyyy + '-' + mm + '-' + dd;
	}
	// tab: 'all' (总榜，不带日期) | 'today' | 'yesterday'
	// dateOnly=true 仅回 Y-m-d；false 回 Y-m-d H:i:s（含起讫时间）
	function getDateRange(tab, dateOnly) {
		const now = new Date();
		let day = null;
		if (tab === 'today') day = now;
		else if (tab === 'yesterday') day = new Date(now.getTime() - 86400000);
		else return {};
		if (dateOnly) {
			const d = fmtDate(day);
			return { startDate: d, endDate: d };
		}
		return { startDate: fmtDateTime(day, false), endDate: fmtDateTime(day, true) };
	}

	function buildUrl(path, params) {
		const base = getApiBase();
		const url = new URL(base + path, location.origin);
		if (params) {
			Object.entries(params).forEach(([k, v]) => {
				if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
			});
		}
		return url.toString();
	}

	// 解开后端通用 wrapper：{ data, statusCode, ... } 或直接物件
	function unwrap(data) {
		if (data && typeof data === 'object' && 'data' in data && 'statusCode' in data) {
			return data.data;
		}
		return data;
	}

	// 取得排行榜
	// opts: { tab: 'all'|'today'|'yesterday', limit: number }
	// 回传：[{ rank, memberID, gameAccount, bestScore, achievedAt }, ...]
	async function getTop(opts) {
		opts = opts || {};
		const tab = opts.tab || 'all';
		const limit = opts.limit || 10;
		const now = Date.now();
		const cached = cacheByTab[tab];
		if (cached && now - cached.ts < CACHE_MS) {
			return cached.rows;
		}
		try {
			const params = { gameCode: GAME_CODE, top: limit };
			// leaderboard 用 Y-m-d H:i:s
			const range = getDateRange(tab, false);
			if (range.startDate) params.startDate = range.startDate;
			if (range.endDate) params.endDate = range.endDate;
			const url = buildUrl('/game/webgame/leaderboard', params);
			console.log('[leaderboard] getTop ->', url, 'tab=', tab);
			const resp = await fetch(url, { headers: getAuthHeader() });
			if (!resp.ok) throw new Error('HTTP ' + resp.status);
			const json = await resp.json();
			const payload = unwrap(json) || {};
			const list = payload.list || [];
			cacheByTab[tab] = { ts: now, rows: list };
			return list;
		} catch (err) {
			console.warn('[leaderboard] getTop fail', err);
			return (cacheByTab[tab] && cacheByTab[tab].rows) || [];
		}
	}

	// 写入游戏记录
	// stage: 关卡/难度编号（会放到 rawValue），score: 分数，time: 游戏时长(ms)
	async function submit(stage, score, time) {
		const body = {
			gameCode: GAME_CODE,
			score: Math.max(0, Math.floor(score)),
			rawValue: Number(stage),
			time: Math.max(0, Math.floor(time || 0)),
			extData: { gameCode: GAME_CODE, stage: Number(stage) },
		};
		// wenGameToken 来自 URL wengame_token（若有才带）
		if (HOST.token) body.wenGameToken = HOST.token;

		const url = buildUrl('/game/wengamebase/savegamelog');
		const headers = { 'Content-Type': 'application/json', ...getAuthHeader() };
		console.log('[leaderboard] submit ->', url, 'body=', body, 'hasAuth=', !!headers.Authorization);

		try {
			const resp = await fetch(url, {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
			});
			if (!resp.ok) {
				const t = await resp.text();
				throw new Error('HTTP ' + resp.status + ' ' + t);
			}
			cacheByTab = {}; // 清除全部排行榜快取
			totalTimeCacheByTab = {}; // 同时清掉时长快取
			const json = await resp.json();
			console.log('[leaderboard] submit ok ->', json);
			return unwrap(json); // { isBest, score, rank }
		} catch (err) {
			console.warn('[leaderboard] submit fail', err);
			return null;
		}
	}

	// 取得当日/昨日累积游玩时长（秒）
	// tab: 'today' | 'yesterday'，'all' 不查
	async function getTotalTime(tab) {
		if (tab !== 'today' && tab !== 'yesterday') return null;
		const now = Date.now();
		const cached = totalTimeCacheByTab[tab];
		if (cached && now - cached.ts < CACHE_MS) {
			return cached.sec;
		}
		try {
			// memberperiodstats 用 Y-m-d
			const range = getDateRange(tab, true);
			const params = { gameCode: GAME_CODE };
			if (range.startDate) params.startDate = range.startDate;
			if (range.endDate) params.endDate = range.endDate;
			const url = buildUrl('/game/wengamebase/memberperiodstats', params);
			console.log('[leaderboard] getTotalTime ->', url, 'tab=', tab);
			const resp = await fetch(url, { headers: getAuthHeader() });
			if (!resp.ok) throw new Error('HTTP ' + resp.status);
			const json = await resp.json();
			const payload = unwrap(json);
			// 兼容回应可能是 { totalTime: number } 或直接 number
			let sec = 0;
			if (typeof payload === 'number') sec = payload;
			else if (payload && typeof payload.totalTime === 'number') sec = payload.totalTime;
			else if (payload && payload.totalTime != null) sec = Number(payload.totalTime) || 0;
			totalTimeCacheByTab[tab] = { ts: now, sec };
			return sec;
		} catch (err) {
			console.warn('[leaderboard] getTotalTime fail', err);
			return (totalTimeCacheByTab[tab] && totalTimeCacheByTab[tab].sec) || null;
		}
	}

	// 当前会员账号（从 CAMPAIGN_DATA.user_name 取，给 isCurrentMember=true 时替换显示）
	function getCurrentUserName() {
		return getCampaignData().user_name || '';
	}

	window.Leaderboard = { getTop, getTotalTime, submit, getCurrentUserName };
})();
