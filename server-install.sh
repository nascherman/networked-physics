#!/bin/bash
 sudo apt-get install -y build-essential libxi-dev libglu1-mesa-dev libglew-dev xvfb
 echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
