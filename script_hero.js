document.addEventListener("DOMContentLoaded", () => {
  const panel = document.querySelector("#home .panel");
  if (!panel) return;

  /* zajistí správné souřadnice bez zásahu do CSS */
  panel.style.position = "relative";

  const hero = document.createElement("img");
  hero.src = "img/hero.gif";
  Object.assign(hero.style, {
    position: "absolute",
    width: "64px",
    height: "64px",
    pointerEvents: "none",
    zIndex: 3
  });

  const coin = document.createElement("img");
  coin.src = "img/coin.gif";
  Object.assign(coin.style, {
    position: "absolute",
    width: "64px",
    height: "64px",
    pointerEvents: "none",
    zIndex: 3
  });

  panel.appendChild(hero);
  panel.appendChild(coin);

  let t = 0;
  const speed = 0.002;
  let coinVisible = true;

  function resetCoin() {
    coinVisible = true;
    coin.style.display = "block";
  }

  function update() {
    const w = panel.clientWidth - 64;
    const h = panel.clientHeight - 64;

    const phase = (t % 4);

    let x = 0, y = 0;

    if (phase < 1) {                 // top
      x = w * phase;
      y = 0;
    } else if (phase < 2) {          // right
      x = w;
      y = h * (phase - 1);
    } else if (phase < 3) {          // bottom
      x = w * (1 - (phase - 2));
      y = h;
    } else {                          // left
      x = 0;
      y = h * (1 - (phase - 3));
    }

    hero.style.left = `${x}px`;
    hero.style.top = `${y}px`;

    /* mince – dole uprostřed */
    const coinX = w / 2;
    const coinY = h;

    coin.style.left = `${coinX}px`;
    coin.style.top = `${coinY}px`;

    /* kolize */
    if (coinVisible) {
      const dx = Math.abs(x - coinX);
      const dy = Math.abs(y - coinY);

      if (dx < 40 && dy < 40) {
        coinVisible = false;
        coin.style.display = "none";
      }
    }

    /* reset po jednom kole */
    if (t >= 4) {
      t = 0;
      resetCoin();
    }

    t += speed;
    requestAnimationFrame(update);
  }

  update();
});
