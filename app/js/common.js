var reload = chrome.runtime.reload
const DEV = true

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
