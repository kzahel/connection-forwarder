function open_settings() {
    chrome.app.window.create('settings.html', {id:'settings'})
    chrome.app.window.get('firewall').minimize()
}
document.querySelector('#open_settings').addEventListener('click',open_settings)

window.onblur = function() {
    chrome.runtime.getBackgroundPage( bg => bg.onblur(window) )
}
