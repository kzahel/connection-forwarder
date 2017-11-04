document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener('click', minimize )
  window.onblur = minimize
})

function minimize() {
  chrome.app.window.current().minimize()
}
