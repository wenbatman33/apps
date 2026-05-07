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
  const continueToggle = document.querySelector<HTMLInputElement>('#continue-toggle');
  const tileStageSelect = document.querySelector<HTMLSelectElement>('#tile-stage-select');
  const tilePreview = document.querySelector<HTMLDivElement>('#tile-preview');

  if (!stageButtons || !weaponButtons || !continueToggle || !tileStageSelect || !tilePreview) {
    return;
  }

  for (let stageId = 1; stageId <= 8; stageId += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `S${stageId}`;
    button.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('skyraider:set-stage', { detail: { stageId } }));
      tileStageSelect.value = String(stageId);
      renderTiles(tilePreview, stageId);
    });
    stageButtons.append(button);

    const option = document.createElement('option');
    option.value = String(stageId);
    option.textContent = `Stage ${stageId}`;
    tileStageSelect.append(option);
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

  tileStageSelect.addEventListener('change', () => {
    renderTiles(tilePreview, Number(tileStageSelect.value));
  });

  const savedWeapon = readSavedWeapon();
  setActiveWeaponButton(weaponButtons, savedWeapon);
  tileStageSelect.value = '1';
  renderTiles(tilePreview, 1);
}

function setActiveWeaponButton(container: HTMLDivElement, weapon: WeaponType): void {
  container.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-weapon') === weapon);
  });
}

function renderTiles(container: HTMLDivElement, stageId: number): void {
  container.replaceChildren();
  for (let index = 1; index <= 3; index += 1) {
    const image = document.createElement('img');
    image.src = `assets/ai/gpt2_tiles/stage-${stageId}-tile-${index}.png`;
    image.alt = `Stage ${stageId} background tile ${index}`;
    container.append(image);
  }
}

function readSavedWeapon(): WeaponType {
  const value = localStorage.getItem(DEV_WEAPON_KEY);
  return weapons.some((weapon) => weapon.id === value) ? (value as WeaponType) : 'vulcan';
}
