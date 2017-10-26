var reload = chrome.runtime.reload

let Forwards = {}
let ForwardAccepts = {}
let ForwardConns = {}

let opts = {
    autostart: false, // run when profile logs in / chrome starts
    background: false, // run even when you close the window

    // perhaps create presets around this
    forwards: [
        { proto:'TCP',
          src_addr:'0.0.0.0',
          src_port:2222,
          dst_addr:'100.115.92.2',
          dst_port:8022 }
    ]
}
    

async function go() {
    const ifaces = await chromise.system.network.getNetworkInterfaces()
    console.log('ifaces',ifaces)
    for (let iface of ifaces) {
        if (iface.address == '100.115.92.1') {
            // android thing
        }
    }

    var res = await setup_forward(opts.forwards[0])
    console.log('setup forward result',res)
}

chrome.sockets.tcp.onReceive.addListener( onReceive.bind(window, false) )
chrome.sockets.tcp.onReceiveError.addListener( onReceive.bind(window, true) )
chrome.sockets.tcpServer.onAccept.addListener( onAccept )

async function onReceive(isErr, info) {
    //console.log('onreceive',info)
    let conn_socket_id = ForwardConns[info.socketId]
    let accept_socket_id = ForwardAccepts[info.socketId]
    var dst_socket
    var reg
    if (conn_socket_id) {
        reg = Forwards[conn_socket_id]
        dst_socket = reg.accept_socket_id
    } else if (accept_socket_id) {
        reg = Forwards[accept_socket_id]
        dst_socket = reg.conn_socket_id
    }
    if (isErr) {
        // https://cs.chromium.org/chromium/src/net/base/net_error_list.h?sq=package:chromium&l=111
        if (info.resultCode) {
            // disconnect
            await chromise.sockets.tcp.disconnect( dst_socket )
            // remove from conn/accept list...
            // close the socket handles ...
        } else {
            console.warn('socket recv error',info)
        }
    } else {
        //console.log('data',info.socketId,'->',dst_socket)
        await chromise.sockets.tcp.send( dst_socket, info.data )
    }
}

async function onAccept(info) {
    let reg = Forwards[info.socketId]
    ForwardAccepts[info.clientSocketId] = info.socketId
    reg.accept_socket_id = info.clientSocketId
    console.log('sock accept',info.clientSocketId,'on forwarder',info.socketId)
    let sock = await chromise.sockets.tcp.create()
    let conn = await chromise.sockets.tcp.connect( sock.socketId, reg.defn.dst_addr, reg.defn.dst_port )
    console.log('created conn sock',sock.socketId,'conn result',conn)
    ForwardConns[sock.socketId] = info.socketId
    reg.conn_socket_id = sock.socketId
    await chromise.sockets.tcp.setPaused(info.clientSocketId, false)
}

async function setup_forward(defn) {
    if (defn.proto !== 'TCP') {
        return { error: 'unsupported protocol' }
    }
    let sock = await chromise.sockets.tcpServer.create() // TODO create with persistent:true
    Forwards[sock.socketId] = {sock_id:sock.socketId, defn:defn}
    console.log('created forwarder sock',sock)
    var res = await chromise.sockets.tcpServer.listen(sock.socketId, defn.src_addr, defn.src_port)
    console.log('listen res',res)
    if (res < 0) {
        return 'error'
    }
    await chrome.sockets.tcpServer.setPaused( sock.socketId, false )
    Forwards[sock.socketId].listening = true
    //await chromise.app.window.create('window.html',{state:'minimized'})
    let win_opts = {
        id:'panel',
        type:'panel',
        resizable:false,
//        hidden:true,
        frame:'none'
    }
    let win = await chromise.app.window.create('panel.html',win_opts)
    win.outerBounds.setSize(200,200)
    //win.show()
    win.minimize()
    function onrestore() {
        console.log('window restore...')
        //win.focus()
    }
    win.onRestored.addListener( onrestore )
    
    //await chromise.notifications.create('firewall',{iconUrl:'images/200ok-48.png',type:'list',title:'connection forwarder active',message:'ok',priority:2,items:[{title:'one',message:'message'}]})
}

function onblur(window) {
    console.log('blur',window)
    const panel = chrome.app.window.get('panel')
    if (! panel.minimized) 
        panel.minimize()
}

go()
