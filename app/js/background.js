console.log('background.js')
const Forwards = {}
const k_BUF_LIMIT = 4096 * 16
const SockState = {}
const ProxyLookup = {}

chrome.sockets.tcp.onReceive.addListener( onReceive.bind(window, false) )
chrome.sockets.tcp.onReceiveError.addListener( onReceive.bind(window, true) )
chrome.sockets.tcpServer.onAccept.addListener( onAccept )

function locateForward(id) {
  for (let lsock in Forwards) {
    let lrule = Forwards[lsock].defn
    if (lrule.id == id) {
      return parseInt(lsock)
    }
  }
}

class ProxySocket {
  constructor(fwdid, socka, sockb) {
    this.fwdid = fwdid
    this.socka = socka
    this.sockb = sockb

    this.atob = new BufferedForwarder(this, this.socka, this.sockb)
    this.btoa = new BufferedForwarder(this, this.sockb, this.socka)

    ProxyLookup[this.socka] = this.atob
    ProxyLookup[this.sockb] = this.btoa
  }
  shutdown() {
    // force shutdowns
    chrome.sockets.tcp.disconnect(this.atob.src)
    chrome.sockets.tcp.disconnect(this.atob.dst)
  }
  cleanup(forwarder) {
    if (this.atob.finished && this.btoa.finished) {
      delete SockState[this.socka]
      delete SockState[this.sockb]
      chrome.sockets.tcp.close(this.socka)
      chrome.sockets.tcp.close(this.sockb)
      let state = Forwards[this.fwdid]
      delete state.active[this.sockb]
    }
  }
}

class BufferedForwarder {
  constructor(prox, src, dst) {
    // reads data of src and dumps on dst
    this.prox = prox
    this.src = src
    this.dst = dst
    this.buf = new Deque()
    this.bufSz = 0
    this.finished = false
    this.flushloop()
    //this._resolve = null // weird, if i set this, cant assign to it??
  }

  onData(isErr, info) {
    var resolve = this._resolve
    this._resolve = null
    console.assert(info.socketId === this.src)
    if (isErr) {
      SockState[this.src].connected = false
      // https://bugs.chromium.org/p/chromium/issues/detail?id=124952
      // how does this work with half-open conns?
      console.log('(buffered-close)',this.src,info.resultCode)
      this.buf.push(info)
    } else {
      this.bufSz += info.data.byteLength
      //console.log('(buffered)',this.src)
      this.buf.push( info.data )
    
      if (this.bufSz >= k_BUF_LIMIT) {
        if ( ! SockState[this.src].paused && ! SockState[this.src].pausechange) {
          dopause( this.src, true )
        }
      }
    }
    if (resolve) {
      resolve()
    }
  }

  cleanup() {
    this.buf.clear()
    this.finished = true
    this.prox.cleanup(this)
  }

  stateChange() {
    return new Promise( resolve => {
      this._resolve = resolve
    } )
  }

  async flushloop() {
    while (true) {
      if (! SockState[this.dst].connected) {
        this.cleanup()
        break
      }
      let pf = this.buf.peekFront()
      if (this.bufSz == 0 && !(pf && pf.resultCode)) {
        // if have no incoming data, nothing to do
        await this.stateChange() // edge triggered, better
        //await dosleep(100) // slower
        continue
      }
      
      var data = this.buf.shift()
      if (data.resultCode) {
        SockState[this.dst].disconnecting = true
        console.log('disconnecting',this.dst)
        await chromise.sockets.tcp.disconnect( this.dst )
        SockState[this.dst].connected = false
        SockState[this.dst].disconnecting = false
        this.cleanup()
        break
      } else {
        this.bufSz -= data.byteLength
        SockState[this.dst].writing = true
        console.assert( SockState[this.dst].connected )
        try {
          // its possible the receiving end abruptly closes the
          // connection. we have no way of knowing beforehand
          var send_res = await chromise.sockets.tcp.send( this.dst, data )
        } catch (e) {
          console.log('sock send err',this.dst,e.message)
          SockState[this.dst].connected = false
          continue
        }
        //console.log('(flushed)',this.src,'->',this.dst)
        SockState[this.dst].writing = false
        if (send_res.resultCode < 0) {
          console.error('send result code < 0',send_res.resultCode)
          debugger
        }
          
        if (this.bufSz < k_BUF_LIMIT) {
          if ( SockState[this.src].paused &&
               ! SockState[this.src].pausechange ) {
            await dopause(this.src,false)
          }
        }
      }
    }
  }
}

async function stop_forwarding_all() {
  for (let lsock in Forwards) {
    lsock = parseInt(lsock)
    var res = await stop_forward(lsock)
    console.log('stop forward result',res)
  }
  return 'all stopped'
}

async function start_forwarding_all() {
  let storage = globalState.storage
  for (let rule of storage.rules) {
    if (! rule.disabled && globalState.storage.settings.forwardingEnabled) {
      // verify that the address / interface exists still ?
      // its ok if the rule already exists (re-open settings in background mode)
      if (locateForward(rule.id)) {
        console.log('rule already active')
        continue
      }
      var res = await setup_forward(rule)
      console.log('setup forward result',res)
    }
  }
  return 'all started'
}

async function go() {
  await start_forwarding_all()
  return 'went!'
}

function onReceive(isErr, info) {
  let prox = ProxyLookup[info.socketId]
  if (! prox) return // somebody else owns this socket
  prox.onData(isErr, info)
}

async function onAccept(info) {
  let fwdid = info.socketId
  let state = Forwards[fwdid]
  if (! state) return // somebody else owns this socket
  let accept_id = info.clientSocketId
  console.log('sock accept',accept_id,'on forwarder',fwdid)
  let sock = await chromise.sockets.tcp.create()
  let conn_id = sock.socketId
  SockState[conn_id] = {paused:false, type:'conn'}
  SockState[accept_id] = {paused:true, type:'accept', connected:true}
  SockState[conn_id].connecting = true
  var conn
  try {
    conn = await chromise.sockets.tcp.connect( conn_id, state.defn.dst_addr.address, state.defn.dst_port )
  } catch(e) {
    console.log('could not connect to dst addr',state.defn.dst_addr.address,e)
    await chromise.sockets.tcp.disconnect( accept_id )
    // this of course looks different -- user does not see
    // ECONNREFUSED they just see immediate disconnection.
    await chromise.sockets.tcp.close( accept_id )
    await chromise.sockets.tcp.close( conn_id )
    delete SockState[conn_id]
    delete SockState[accept_id]
    return
  }
  SockState[conn_id].connecting = false
  SockState[conn_id].connected = true
  console.log('created conn sock',conn_id,'conn result',conn)
  let prox = new ProxySocket(fwdid, conn_id, accept_id)
  state.active[prox.sockb] = prox
  dopause(accept_id, false)
}

async function stop_forward(id) {
  console.assert(typeof id === 'number')
  if (Forwards[id].changestate) {
    return {error:'currently changing state due to other action'}
  }
  Forwards[id].changestate = true
  // TODO: stop a forwarding rule
  for (let sockb in Forwards[id].active) {
    let prox = Forwards[id].active[sockb]
    prox.shutdown()
  }
  
  // TODO: delete all active sockets
  var resp
  resp = await chromise.sockets.tcpServer.disconnect(id)
  console.log('disconnect',resp)
  resp = await chromise.sockets.tcpServer.close(id)
  console.log('close',resp)
  Forwards[id].changestate = false
  delete Forwards[id]
  return {result:'shutdown_ok'}
}

async function setup_forward(defn) {
  console.log('setup forward',defn)
  if (defn.protocol !== 'TCP') {
    return { error: 'unsupported protocol' }
  }
  if (defn.disabled) {
    return { error: 'disabled' }
  }
  let sock = await chromise.sockets.tcpServer.create()
  let state = {defn:defn, sock_id:sock.socketId, active:{}}
  Forwards[sock.socketId] = state
  try {
    var res = await chromise.sockets.tcpServer.listen(sock.socketId, defn.src_addr.address, defn.src_port)
  } catch(e) {
    return {error:e}
  }
  if (res < 0) {
    return {error:res}
  }
  await chromise.sockets.tcpServer.setPaused( sock.socketId, false )
  state.listening = true
  return state
}

async function ensure_firewall(closingWindowId) {
  var wins = chrome.app.window.getAll()
  console.log('ensure firewall',wins)
  // chromeos only opens a firewall port if an app window is present and not hidden
  wins = wins.filter( win => win.id !=  closingWindowId )
  if (wins.length > 0) return

  let win_opts = {
    id:constants.PANEL,
    type:'panel',
    resizable:false,
    hidden:true,
    frame:'none',
//    outerBounds: {width:100,height:100}
  }
  if (OS !== 'Chrome') { delete win_opts.type }
  let win = await chromise.app.window.create('/panel.html',win_opts)
  win.onClosed.addListener( windowClosed.bind(null,win) )
  //await dosleep(1000)
  //win.outerBounds.setPosition(0,0)
  //win.outerBounds.setSize(250,50)
  //win.show()
  //await dosleep(1000)
  //win.minimize()
  function onrestore() {
    console.log('window restore...')
    win.close()
    open_settings()
  }
  win.onRestored.addListener( onrestore )

}

function windowExists(id) {
  let windows = chrome.app.window.getAll()
  for (let win of windows) {
    if (win && win.id === id) {
      return win
    }
  }
}

async function open_settings() {
  if (windowExists(constants.SETTINGS)) {
    return
  }
  let panel = windowExists(constants.PANEL)
  if (panel) panel.close()
  let win_opts = {
    id:constants.SETTINGS,
    hidden: true,
    outerBounds: { width: 400, height: 700 },
    type:'panel'
  }
  if (OS !== 'Chrome') { delete win_opts.type }

  let opts_page = '/settings.html'
  let win = await chromise.app.window.create(opts_page,win_opts)
  if (OS == 'Mac' && ! win) {
    await dosleep(500)
    win = await chrome.app.window.get(win_opts.id)
  }
  win.onClosed.addListener( windowClosed.bind(null,win) )
  win.outerBounds.setSize(win_opts.outerBounds.width,
                          win_opts.outerBounds.height)
  win.show()
}

async function dopause(id, bool) {
  console.assert( ! SockState[id].pausechange )
  console.assert( SockState[id].connected )
  SockState[id].pausechange = true
  //console.log('dopause',id,bool)
  
  return new Promise(resolve => {
    chrome.sockets.tcp.setPaused(id, bool, function(r) {
      var lasterr = chrome.runtime.lastError
      //console.warn('pause result done',id,r,lasterr)
      if (bool) {
        SockState[id].paused = true
        SockState[id].pausechange = false
      } else {
        SockState[id].paused = false
        SockState[id].pausechange = false
      }
      resolve()
    })
  })
}
