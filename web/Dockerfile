# DOCKER-VERSION 0.10.0

FROM ubuntu:13.10

# make sure apt is up to date
RUN apt-get update

# install nodejs and npm
RUN apt-get install -y nodejs npm git git-core graphicsmagick redis-server
COPY . /src
RUN chmod +x /src/start.sh
RUN cd /src; npm install
CMD cd /src; ./start.sh prod
EXPOSE 3000
