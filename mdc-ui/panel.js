console.log('panel.js')
function settings() {
  chrome.runtime.getBackgroundPage( bg => {
    bg.open_options()
  } )
  chrome.app.window.get('panel').minimize()
}
function close() {
  chrome.app.window.get('panel').minimize()
}
async function quit() {
  chrome.runtime.getBackgroundPage( bg => {
    bg.quit()
  })
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector('#settings').addEventListener('click',settings)
  document.querySelector('#close').addEventListener('click',close)
  document.querySelector('#quit').addEventListener('click',quit)
})

window.onblur = function() {
  chrome.runtime.getBackgroundPage( bg => bg.onblur(window) )
}
