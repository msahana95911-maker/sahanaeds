const userClickClass = 'user-is-clicking';
const userTabClass = 'user-is-tabbing';

function isClicking () {
  document.body.classList.add(userClickClass);
  document.body.classList.remove(userTabClass);
}

function isTabbing (e) {
  const keyCode = e.keyCode || e.which;
  if (keyCode === 9) {
    document.body.classList.add(userTabClass);
    document.body.classList.remove(userClickClass);
  }
}

document.onmousedown = isClicking;
document.onkeydown = isTabbing;
