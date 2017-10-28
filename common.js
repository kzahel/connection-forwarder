var reload = chrome.runtime.reload

// https://cs.chromium.org/chromium/src/net/base/net_error_list.h?sq=package:chromium&l=111
const common_socket_err_codes = {
  '100': 'CONNECTION_CLOSED',
  '101': 'CONNECTION_RESET',
  '102': 'CONNECTION_REFUSED'
}

function dosleep(t) {
  return new Promise(resolve => {
    setTimeout( resolve, t*1000 )
  })
}
