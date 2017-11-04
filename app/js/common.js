/* this file available both in react-ui settings context and background page context */
var reload = chrome.runtime.reload
async function reset() {
  await chromise.storage.local.clear()
  reload()
}
const DEV = true

const constants = {
	android_ip: '100.115.92.2',
  PANEL: 'panel',
  SETTINGS: 'settings'
}

var OS
if (navigator.userAgent.match('OS X')) {
  OS = 'Mac'
} else if (navigator.userAgent.match("Windows")) {
  OS = "Win"
} else if (navigator.userAgent.match("CrOS")) {
  OS = "Chrome"
} else {
  OS = "Linux"
}

function updateDefaultSettings(d) {
  let setting_defaults = {
    forwardingEnabled: true,
    autostart: false,
    background: false,
    ipv6: false
  }
  for (let opt in setting_defaults) {
    if (d[opt] === undefined) {
      d[opt] = setting_defaults[opt]
    }
  }
}

// https://cs.chromium.org/chromium/src/net/base/net_error_list.h?sq=package:chromium&l=111
const k_common_socket_err_codes = {
  '100': 'CONNECTION_CLOSED',
  '101': 'CONNECTION_RESET',
  '102': 'CONNECTION_REFUSED'
}

function dosleep(t) {
  return new Promise(resolve => {
    setTimeout( resolve, t )
  })
}
