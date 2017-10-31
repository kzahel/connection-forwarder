## Socket forwarder app

Available in webstore...

Use case: make termux sshd available on the LAN, not just on the local chromebook.
Use case 2: make a development server (such as apache or php etc) available on the local network

Background info: android runs on a chromebook on a NAT interface that is not exposed directly on the LAN. Certain services are forwarded (such as mDNS). This app lets you setup simple (for now TCP-only) forwarding rules to have certain ports get forwarded to the internal android interface.

Release History:

2017-10-26 - Initial version used to get access to the SSH server running on tmux

TODO:
- cleanup/close sockets
- let app background itself when no active sockets, and resume
- create a UI to create/remove rules
- add options such as autostart, backgrounding, etc
- localhost listening API to list/add/remove forwards.
- add external messaging for okremote commands