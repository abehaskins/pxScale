# DOCKER-VERSION 0.10.0

FROM ubuntu:13.10

# make sure apt is up to date
RUN apt-get update

# install nodejs and npm
RUN apt-get install -y redis-server
COPY . /src
RUN cd /src; chmod +x ./start.sh
CMD cd /src; ./start.sh
EXPOSE 6379