# look for changes in app folder and send a message to listening socket
# to tell the app to reload


#osx (does not capture webpack compile if done in vm and mounted via sshfs)
#fswatch -r -o app | xargs -n1 ./scripts/reloadergo.sh # osx...
#fswatch -r -e "\.#" -x --event Updated app

# linux
inotifywait -q -r -m -e MODIFY app  |
    while read path action file; do
        echo "The file '$file' appeared in directory '$path' via '$action'"
        echo "Telling app to reload...",`date`
        sleep 1
        echo "reloadpls" | nc -w 1 192.168.64.1 9337
        echo $?



    done
