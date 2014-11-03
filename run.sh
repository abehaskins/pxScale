#!/bin/bash

if [ "$1" == "web" ]; then
    echo "Kill off existing web..."
    docker kill web
    echo "Remove existing web..."
    docker rm web
    echo "Spin up new web..."
    docker run --name web -p 3000:3000 --link db:db -t abeisgreat/pxscale
fi

if [ "$1" == "db" ]; then
    echo "Kill off existing db..."
    docker kill db
    echo "Remove existing db..."
    docker rm db
    echo "Spin up new db..."
    docker run --name db -p 1440:1440 -t abeisgreat/pxscale-database &
fi