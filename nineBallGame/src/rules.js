// 9 號球簡化規則（引擎無關）
export function lowestBallOnTable(balls) {
  let min = Infinity;
  for (const b of balls) {
    if (b.number === 0) continue;
    if (!b.pocketed && b.number < min) min = b.number;
  }
  return min === Infinity ? null : min;
}

export function judgeShot(ctx) {
  const { firstHit, pocketed, cueOffTable, targetBall } = ctx;
  const cuePocketed = pocketed.includes(0);
  const nineSunk = pocketed.includes(9);

  let foul = false;
  if (firstHit === null) foul = true;
  else if (firstHit !== targetBall) foul = true;
  if (cuePocketed || cueOffTable) foul = true;

  const legal = !foul;
  const winGame = nineSunk && legal;
  const legalPot = legal && pocketed.some(n => n !== 0);
  const continueTurn = legalPot && !winGame;

  return {
    foul, legal, winGame,
    continueTurn,
    nineSunkOnFoul: nineSunk && !legal,
  };
}
