const BATTLE_MODE=new URLSearchParams(location.search).has('battle');
const W=720,H=BATTLE_MODE?1560:1280,BATTLE_Y=BATTLE_MODE?100:0;
const RULES=CampaignRules.settings;
const UNITS=CombatRules.units;
