// 素材載入
const BASE = "assets/png/";

export const IMG_LIST = {
  courtH: "court_01.png",
  boardH: "board.png",
  boardV: "board_vertical.png",
  centerLine: "court_center_line.png",
  centerBtnH: "court_center_btn_pause.png",
  centerBtnV: "court_center_btn_pause_vertical.png",
  pudLeft: "pud_left.png",
  pudRight: "pud_right.png",
  ballFrames: "ball_frames.png",
  ballShadow: "ball_shadow.png",
  ballHit: "ball_hit.png",
  goalLeft: "goal_posts_left.png",
  goalRight: "goal_posts_right.png",
  goalLights: "goal_posts_lights_2frames.png",
  numbers: "numbers_score.png",
  logo: "logo.png",
  textGoal: "text_goal.png",
  textWin: "text_win.png",
  textLose: "text_lose.png",
  stars: "stars.png",
  boardHeader: "board_header.png",
};

export const images = {};

export function loadAssets() {
  const promises = Object.entries(IMG_LIST).map(([key, file]) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { images[key] = img; resolve(); };
      img.onerror = () => { console.warn("載入失敗:", file); resolve(); };
      img.src = BASE + file;
    });
  });
  return Promise.all(promises);
}
