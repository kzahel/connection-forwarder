const Forwards = {}
const k_BUF_LIMIT = 4096 * 16
//const k_BUF_LIMIT = 1024
const SockState = {}
const ProxyLookup = {}

let opts = {
  autostart: false, // run when profile logs in / chrome starts
  background: false, // run even when you close the window

  forwards: [
    { proto:'TCP',
      disabled:false,
      description:'ssh to termux',
      src_addr:'0.0.0.0',
      src_port:2222,
      dst_addr:'100.115.92.2',
      dst_port:8022
    },
    { proto:'TCP',
      disabled:true,
      description:'python3 http.server inside termux',
      src_addr:'0.0.0.0',
      src_port:8000,
      dst_addr:'100.115.92.2',
      dst_port:8000
    },
    { proto:'TCP',
      disabled:true,
      description:'proxy to web server on another computer',
      src_addr:'0.0.0.0',
      src_port:8080,
      dst_addr:'192.168.1.129',
      dst_port:8887,
    },
    { proto:'TCP',
      disabled:true,
      description:'proxy to web server on another computer',
      src_addr:'0.0.0.0',
      src_port:8081,
      dst_addr:'192.168.1.109',
      dst_port:8887,
    }
  ]
}

chrome.sockets.tcp.onReceive.addListener( onReceive.bind(window, false) )
chrome.sockets.tcp.onReceiveError.addListener( onReceive.bind(window, true) )
chrome.sockets.tcpServer.onAccept.addListener( onAccept )

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

async function go() {
  const ifaces = await chromise.system.network.getNetworkInterfaces()
  //console.log('ifaces',ifaces)
  for (let iface of ifaces) {
    //console.log(iface.address)
    if (iface.address == '100.115.92.1') {
      // android thing
    }
  }

  for (let rule of opts.forwards) {
    if (! rule.disabled) {
      var res = await setup_forward(rule)
      console.log('setup forward result',res)
    }
  }
}

function onReceive(isErr, info) {
  let prox = ProxyLookup[info.socketId]
  prox.onData(isErr, info)
}

async function onAccept(info) {
  let fwdid = info.socketId
  let state = Forwards[fwdid]
  let accept_id = info.clientSocketId
  console.log('sock accept',accept_id,'on forwarder',fwdid)
  let sock = await chromise.sockets.tcp.create()
  let conn_id = sock.socketId
  SockState[conn_id] = {paused:false, type:'conn'}
  SockState[accept_id] = {paused:true, type:'accept', connected:true}
  SockState[conn_id].connecting = true
  let conn = await chromise.sockets.tcp.connect( conn_id, state.defn.dst_addr, state.defn.dst_port )
  SockState[conn_id].connecting = false
  SockState[conn_id].connected = true
  console.log('created conn sock',conn_id,'conn result',conn)
  let prox = new ProxySocket(fwdid, conn_id, accept_id)
  state.active[prox.sockb] = prox
  dopause(accept_id, false)
}

async function stop_forward(id) {
  
}

async function setup_forward(defn) {
  if (defn.proto !== 'TCP') {
    return { error: 'unsupported protocol' }
  }
  if (defn.disabled) {
    return { error: 'disabled' }
  }
  let sock = await chromise.sockets.tcpServer.create()
  let state = {defn:defn, sock_id:sock.socketId, active:{}}
  Forwards[sock.socketId] = state
  var res = await chromise.sockets.tcpServer.listen(sock.socketId, defn.src_addr, defn.src_port)
  if (res < 0) {
    return 'error'
  }
  await chromise.sockets.tcpServer.setPaused( sock.socketId, false )
  state.listening = true
  await ensure_firewall()
  return state
}

async function ensure_firewall() {
  // chromeos only opens a firewall port if an app window is present and not hidden
  if (chrome.app.window.get('panel')) {
    return
  }
  let win_opts = {
    id:'panel',
    type:'panel',
    resizable:false,
    //hidden:true,
    frame:'none'
  }
  
  let win = await chromise.app.window.create('panel.html',win_opts)
  win.outerBounds.setSize(200,200)
  win.minimize()
  function onrestore() {
    console.log('window restore...')
  }
  win.onRestored.addListener( onrestore )
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

function onblur(window) {
  const panel = chrome.app.window.get('panel')
  if (! panel.minimized) 
    panel.minimize()
}

go()
