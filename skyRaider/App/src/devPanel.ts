import type { WeaponType } from './game/types';

const DEV_WEAPON_KEY = 'skyraider:dev-weapon';
const weapons: Array<{ id: WeaponType; label: string; image: string }> = [
  { id: 'vulcan', label: 'Vulcan', image: 'assets/images/bullet-vulcan-v2.svg' },
  { id: 'laser', label: 'Laser', image: 'assets/images/bullet-laser.svg' },
  { id: 'plasma', label: 'Plasma Laser', image: 'assets/images/bullet-plasma.svg' },
];

export function setupDevPanel(): void {
  const stageButtons = document.querySelector<HTMLDivElement>('#stage-buttons');
  const weaponButtons = document.querySelector<HTMLDivElement>('#weapon-buttons');
  const powerButtons = document.querySelector<HTMLDivElement>('#power-buttons');
  const continueToggle = document.querySelector<HTMLInputElement>('#continue-toggle');

  if (!stageButtons || !weaponButtons || !powerButtons || !continueToggle) {
    return;
  }

  for (let level = 1; level <= 6; level += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `P${level}`;
    button.addEventListener('click', () => {
      window.dispatchEvent(
        new CustomEvent('skyraider:set-power', { detail: { power: level } }),
      );
    });
    powerButtons.append(button);
  }

  for (let stageId = 1; stageId <= 8; stageId += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `S${stageId}`;
    button.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('skyraider:set-stage', { detail: { stageId } }));
    });
    stageButtons.append(button);
  }

  for (const weapon of weapons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.weapon = weapon.id;
    button.innerHTML = `<img src="${weapon.image}" alt="" /><span>${weapon.label}</span>`;
    button.addEventListener('click', () => {
      setActiveWeaponButton(weaponButtons, weapon.id);
      localStorage.setItem(DEV_WEAPON_KEY, weapon.id);
      window.dispatchEvent(
        new CustomEvent('skyraider:set-weapon', { detail: { weapon: weapon.id } }),
      );
    });
    weaponButtons.append(button);
  }

  continueToggle.addEventListener('change', () => {
    window.dispatchEvent(
      new CustomEvent('skyraider:set-continue-mode', {
        detail: { enabled: continueToggle.checked },
      }),
    );
  });
  // 啟動時先依照 checkbox 當前狀態同步一次（避免 HTML 預設與 JS 預設不一致）
  window.dispatchEvent(
    new CustomEvent('skyraider:set-continue-mode', {
      detail: { enabled: continueToggle.checked },
    }),
  );

  const savedWeapon = readSavedWeapon();
  setActiveWeaponButton(weaponButtons, savedWeapon);
}

function setActiveWeaponButton(container: HTMLDivElement, weapon: WeaponType): void {
  container.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-weapon') === weapon);
  });
}

function readSavedWeapon(): WeaponType {
  const value = localStorage.getItem(DEV_WEAPON_KEY);
  return weapons.some((weapon) => weapon.id === value) ? (value as WeaponType) : 'vulcan';
}
