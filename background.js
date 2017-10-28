const Forwards = {}
const ForwardAccepts = {}
const ForwardConns = {}
const ReadBuffers = {}
const k_BUF_LIMIT = 4096 * 2
//const k_BUF_LIMIT = 1024
const SockState = {}
const ProxyLookup = {}

let opts = {
  autostart: false, // run when profile logs in / chrome starts
  background: false, // run even when you close the window

  // perhaps create presets around this
  forwards: [
    { proto:'TCP',
      disabled:true,
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
      disabled:false,
      description:'proxy to web server on another computer',
      src_addr:'0.0.0.0',
      src_port:8080,
      dst_addr:'192.168.1.129',
      dst_port:8887,
    }
  ]
}

chrome.sockets.tcp.onReceive.addListener( onReceive.bind(window, false) )
chrome.sockets.tcp.onReceiveError.addListener( onReceive.bind(window, true) )
chrome.sockets.tcpServer.onAccept.addListener( onAccept )

class ProxySocket {
  constructor(socka, sockb) {
    this.socka = socka
    this.sockb = sockb

    this.atob = new BufferedForwarder(this.socka, this.sockb)
    this.btoa = new BufferedForwarder(this.sockb, this.socka)

    ProxyLookup[this.socka] = this.atob
    ProxyLookup[this.sockb] = this.btoa
  }
}

class BufferedForwarder {
  constructor(src, dst) {
    // reads data of src and dumps on dst
    this.src = src
    this.dst = dst
    this.buf = new Deque()
    this.bufSz = 0
    this.loop()
  }

  onData(isErr, info) {
    console.assert(info.socketId === this.src)
    if (isErr) {
      SockState[info.socketId].connected = false
      console.log('(buffered-close)',this.src)
      this.buf.push(info)
    } else {
      this.bufSz += info.data.byteLength
      //console.log('(buffered)',this.src)
      this.buf.push( info.data )
    
      if (this.bufSz >= k_BUF_LIMIT) {
        if ( ! SockState[this.src].paused && ! SockState[this.src].pausechange ) {
          dopause( info.socketId, true )
        }
      }
    }
  }

  cleanup() {
    console.assert( this.bufSz === 0 )
    this.buf.clear()
    // both src and dst sockets are done for good ?
    console.log('cleanup',this.src,this.dst)
  }

  async loop() {
    while (true) {
      if (this.bufSz == 0) {
        // if have no incoming data, nothing to do
        await dosleep(0.1)
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
        this.bufSz-= data.byteLength
        SockState[this.dst].writing = true
        var send_res = await chromise.sockets.tcp.send( this.dst, data )
        console.log('(flushed)',this.src,'->',this.dst)
        SockState[this.dst].writing = false
        if (send_res.resultCode < 0) {
          console.error('send result code < 0',send_res.resultCode)
          debugger
        }
          
        if (this.bufSz < k_BUF_LIMIT) {
          if ( SockState[this.src].paused && ! SockState[this.src].pausechange ) {
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
  let reg = Forwards[info.socketId]
  console.log('sock accept',info.clientSocketId,'on forwarder',info.socketId)
  let sock = await chromise.sockets.tcp.create()
  SockState[sock.socketId] = {paused:false, type:'conn'}
  SockState[info.clientSocketId] = {paused:true, type:'accept', connected:true}
  SockState[sock.socketId].connecting = true
  let conn = await chromise.sockets.tcp.connect( sock.socketId, reg.defn.dst_addr, reg.defn.dst_port )
  SockState[sock.socketId].connecting = false
  SockState[sock.socketId].connected = true
  console.log('created conn sock',sock.socketId,'conn result',conn)
  ForwardAccepts[info.clientSocketId] = {reg:info.socketId, conn_id:sock.socketId}
  ForwardConns[sock.socketId] = {reg:info.socketId, accept_id:info.clientSocketId}
  new ProxySocket(sock.socketId, info.clientSocketId)
  dopause(info.clientSocketId, false)
}

async function setup_forward(defn) {
  if (defn.proto !== 'TCP') {
    return { error: 'unsupported protocol' }
  }
  if (defn.disabled) {
    return { error: 'disabled' }
  }
  let sock = await chromise.sockets.tcpServer.create()
  var state = {defn:defn, sock_id:sock.socketId}
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
  SockState[id].pausechange = true
  //console.warn('dopause',id,bool)
  
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
