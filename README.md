## Connection Forwarder
(TCP Socket forwarder app)

Available in webstore: https://chrome.google.com/webstore/detail/connection-forwarder/ahaijnonphgkgnkbklchdhclailflinn

I made this app so that I could ssh into termux running on a chromebook without developer mode. Maybe you find it useful for something else.

# UPDATE: since Chrome 64 this extension is not even really needed for ChromeOS+Android
ChromeOS automatically forwards listening ports on the android interface to the ChromeOS interface. But I leave this project in place in case there is some use that I'm not aware of.

- Use case 1: make termux sshd available on the LAN, not just on the local chromebook.
- Use case 2: make an android-based development server (such as apache or php etc) available on the local network
- Use case 3: (??) Let me know kyle@graehlarts.com or [create an issue](https://github.com/kzahel/connection-forwarder/issues)

Background info: android runs on a chromebook on a NAT interface that is not exposed directly on the LAN. Certain services are forwarded (such as mDNS). Everything else, not. This app lets you setup simple forwarding rules to have certain ports get forwarded to the internal android interface.

## Build / development setup notes

The nice react auto reload tools don't work very well in the chrome app context (which disallow eval, inline scripts, external resources (loaded via URL). Basically all app code must be statically present in the app directory at launch time.

- `git clone (this repository)`
- `cd react-ui; npm install; ./node_modules/.bin/webpack --watch`
- Go to `chrome://extensions`, check the developer mode box, click load unpacked extension, select the `"app"` folder in this repository.
- (optional) run `sh scripts/reloader.sh` (uses linux inotifywatch, for osx you'll need to modify this script)

## Release History

- 2017-11-4 - created react based UI
- 2017-10-26 - Initial version used to get access to the SSH server running on tmux

## TODO

- UDP packet forwarding
- cleanup/close sockets ✔️
- create a UI to create/remove rules ✔️
- add options such as autostart, backgrounding, etc ✔️
- localhost listening API to list/add/remove forwards.

## LICENSE

MIT
