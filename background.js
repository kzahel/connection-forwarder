var reload = chrome.runtime.reload
let Forwards = {}
let ForwardAccepts = {}
let ForwardConns = {}

async function go() {
    const ifaces = await chromise.system.network.getNetworkInterfaces()
    console.log('ifaces',ifaces)
    for (let iface of ifaces) {
        if (iface.address = '100.115.92.1') {
            // android thing
        }
    }

    setup_forward(2222, 8022)
    //setup_forward(2222, 8000)
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
    let conn = await chromise.sockets.tcp.connect( sock.socketId, '100.115.92.2', reg.dst_port )
    console.log('created conn sock',sock.socketId,'conn result',conn)
    ForwardConns[sock.socketId] = info.socketId
    reg.conn_socket_id = sock.socketId
    await chromise.sockets.tcp.setPaused(info.clientSocketId, false)
}

async function setup_forward(src_port, dst_port) {
    let sock = await chromise.sockets.tcpServer.create()
    Forwards[sock.socketId] = {sock_id:sock.socketId, src_port:src_port, dst_port:dst_port}
    console.log('created forwarder sock',sock)
    var res = await chromise.sockets.tcpServer.listen(sock.socketId, '0.0.0.0', src_port)
    console.log('listen res',res)
    if (res < 0) {
        return 'error'
    }
    await chrome.sockets.tcpServer.setPaused( sock.socketId, false )
    Forwards[sock.socketId].listening = true
    await chromise.app.window.create('window.html')
}

go()
